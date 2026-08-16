/**
 * A3 production-wiring regression: real CodeGraphBackend + RipgrepBackend run
 * through the canonical executor WITHOUT fixture wrapping. CodeGraph ENOENT is
 * injected only by the process runner (the optional `codegraph` binary is
 * absent in hermetic environments), and ripgrep runs as the real fallback.
 *
 * Expected production result (post-A3): `no_result`, codegraph `unavailable`
 * with `CODEGRAPH_UNAVAILABLE`, ripgrep `used/complete` with `RIPGREP_NO_RESULT`,
 * fallback checked, strategy complete, and index state `unavailable`.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import type {
  BackendHealth,
  BackendSearchRequest,
  BackendSearchResult,
  RepositorySearchBackend,
} from '../../src/contracts/index.js';
import { CanonicalRepositoryLocateExecutorV2 } from '../../src/evidence/locate-execution/canonical-locate-executor-v2.js';
import { PublicLocateExecutionApplicationServiceV2 } from '../../src/evidence/locate-execution/public-locate-execution-application-v2.js';
import { V2LocateResultProjector } from '../../src/evidence/locate-execution/v2-locate-result-projector.js';
import { RepositoryEvidenceEngine } from '../../src/evidence/repository-evidence-engine.js';
import { CodeGraphBackend } from '../../src/repository/codegraph-backend.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { RipgrepBackend } from '../../src/repository/ripgrep-backend.js';
import { asTraceableSearchBackendsV2 } from '../../testkit/testing/create-canonical-locate-engine-harness-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'streaming-ripgrep',
  caseId: 'canonical-backend-trace-wiring',
});

const repositoryRoot = resolve(import.meta.dirname, '../..');

function sourceText(program: ts.Program, relativePath: string): string {
  const sourceFile = program.getSourceFile(
    resolve(repositoryRoot, relativePath),
  );
  if (sourceFile === undefined) {
    throw new Error(`TypeScript program omitted ${relativePath}`);
  }
  return sourceFile.getFullText();
}

function findFunction(
  program: ts.Program,
  relativePath: string,
  name: string,
): ts.FunctionDeclaration | ts.MethodDeclaration | undefined {
  const sourceFile = program.getSourceFile(
    resolve(repositoryRoot, relativePath),
  );
  if (sourceFile === undefined) {
    throw new Error(`TypeScript program omitted ${relativePath}`);
  }
  let found: ts.FunctionDeclaration | ts.MethodDeclaration | undefined;
  const visit = (node: ts.Node): void => {
    if (
      (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
      node.name !== undefined &&
      node.name.getText(sourceFile) === name
    ) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

describe.runIf(selected)('A3 canonical backend trace wiring', () => {
  it('wires real backends into the canonical path without fixture wrapping', async () => {
    const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-a3-wiring-'));
    try {
      writeFileSync(resolve(repository, 'a.ts'), 'const Foo = 1;\n', 'utf8');
      const executor = new CanonicalRepositoryLocateExecutorV2(
        [
          new CodeGraphBackend(new NodeSafeProcessRunner()),
          new RipgrepBackend(new NodeSafeProcessRunner()),
        ],
        new NodeRepositoryReader(),
      );
      const projector = new V2LocateResultProjector();
      const application = new PublicLocateExecutionApplicationServiceV2(
        executor,
        projector,
      );
      const service = new RepositoryEvidenceEngine(application);
      const result = await service.locate(
        {
          repoPath: repository,
          question: 'Where is the missing symbol?',
          terms: ['ZzzMissingZzz'],
          termCase: 'sensitive',
        },
        { signal: new AbortController().signal },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      expect(result.evidence.status).toBe('no_result');
      expect(result.evidence.coverage.backends).toEqual([
        expect.objectContaining({
          backend: 'codegraph',
          status: 'unavailable',
          reasonCode: 'CODEGRAPH_UNAVAILABLE',
        }),
        expect.objectContaining({
          backend: 'ripgrep',
          status: 'used',
          completion: 'complete',
          reasonCode: 'RIPGREP_NO_RESULT',
          hitCount: 0,
        }),
      ]);
      expect(result.evidence.coverage.fallbackChecked).toBe(true);
      expect(result.evidence.coverage.strategyComplete).toBe(true);
      expect(result.evidence.coverage.indexState).toBe('unavailable');
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  }, 30_000);

  it('completes a non-identifier-only request via the ripgrep fallback without an internal invariant failure', async () => {
    const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-a3-wiring-'));
    try {
      writeFileSync(
        resolve(repository, 'a.ts'),
        'const changedId = row-changed-id;\n',
        'utf8',
      );
      // 模拟 CodeGraph available/indexed 但对非 identifier 请求无可执行 query：
      // 真实 CodeGraphBackend 对此产生零 query-plan 条目并绑定 complete-no-result
      // outcome（见 F5-CODEGRAPH-002 zero-entry searchViews 测试）；这里通过
      // fixture 在 canonical 路径验证整体不再触发 INTERNAL_ERROR，并允许 Ripgrep
      // fallback 完成。
      class AvailableCodeGraphFixture implements RepositorySearchBackend {
        public readonly id = 'codegraph' as const;

        public async probe(): Promise<BackendHealth> {
          return { state: 'available', version: '1.1.6' };
        }

        public async search(
          _request: BackendSearchRequest,
        ): Promise<BackendSearchResult> {
          return {
            health: {
              state: 'available',
              version: '1.1.6',
              reasonCode: 'CODEGRAPH_NO_RESULT',
            },
            hits: [],
            complete: true,
          };
        }
      }
      const executor = new CanonicalRepositoryLocateExecutorV2(
        asTraceableSearchBackendsV2([
          new AvailableCodeGraphFixture(),
          new RipgrepBackend(new NodeSafeProcessRunner()),
        ]),
        new NodeRepositoryReader(),
      );
      const projector = new V2LocateResultProjector();
      const application = new PublicLocateExecutionApplicationServiceV2(
        executor,
        projector,
      );
      const service = new RepositoryEvidenceEngine(application);
      const result = await service.locate(
        {
          repoPath: repository,
          question: 'Where is the changed row column?',
          terms: ['row-changed-id'],
          termCase: 'sensitive',
        },
        { signal: new AbortController().signal },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      expect(
        result.evidence.coverage.backends.map((attempt) => attempt.backend),
      ).toEqual(['codegraph', 'ripgrep']);
      expect(result.evidence.coverage.backends[0]).toMatchObject({
        backend: 'codegraph',
        status: 'used',
        completion: 'complete',
        reasonCode: 'CODEGRAPH_NO_RESULT',
      });
      expect(result.evidence.coverage.backends[1]).toMatchObject({
        backend: 'ripgrep',
        status: 'used',
        completion: 'complete',
      });
      expect(result.evidence.coverage.fallbackChecked).toBe(true);
      expect(result.evidence.coverage.strategyComplete).toBe(true);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  }, 30_000);

  it('source inventory forbids duck-typed searchViews and optional trace parameters', () => {
    const configPath = resolve(repositoryRoot, 'tsconfig.json');
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    if (config.error !== undefined) {
      throw new Error('Failed to read tsconfig.json.');
    }
    const parsed = ts.parseJsonConfigFileContent(
      config.config,
      ts.sys,
      repositoryRoot,
    );
    const program = ts.createProgram(parsed.fileNames, parsed.options);

    const canonicalSource = sourceText(
      program,
      'src/evidence/locate-execution/canonical-locate-executor-v2.ts',
    );
    expect(canonicalSource).not.toContain('hasSearchViews');
    expect(canonicalSource).not.toMatch(/'searchViews'\s+in\s+\w/u);

    const preF5Source = sourceText(
      program,
      'src/evidence/request-snapshot/pre-f5-multi-view-search-v2.ts',
    );
    expect(preF5Source).not.toContain('hasSearchViews');
    expect(preF5Source).not.toMatch(/'searchViews'\s+in\s+\w/u);

    const searchFunction = findFunction(
      program,
      'src/evidence/request-snapshot/pre-f5-multi-view-search-v2.ts',
      'searchBackendMultiViewV2',
    );
    expect(searchFunction).not.toBeUndefined();
    if (searchFunction !== undefined) {
      expect(searchFunction.parameters).toHaveLength(5);
      for (const parameter of searchFunction.parameters) {
        expect(parameter.questionToken).toBeUndefined();
      }
    }
    expect(preF5Source).toMatch(
      /\bbackend:\s*TraceableRepositorySearchBackendV2\b/u,
    );
  }, 60_000);

  it('backend sources expose traceable searchViews without hasSearchViews guards', () => {
    const configPath = resolve(repositoryRoot, 'tsconfig.json');
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(
      config.config,
      ts.sys,
      repositoryRoot,
    );
    const program = ts.createProgram(parsed.fileNames, parsed.options);
    for (const relativePath of [
      'src/repository/codegraph-backend.ts',
      'src/repository/ripgrep-backend.ts',
    ]) {
      const source = sourceText(program, relativePath);
      expect(source).not.toContain('hasSearchViews');
      expect(source).not.toMatch(/'searchViews'\s+in\s+\w/u);
      const searchViews = findFunction(program, relativePath, 'searchViews');
      expect(searchViews).not.toBeUndefined();
      if (searchViews === undefined) {
        continue;
      }
      expect(searchViews.parameters).toHaveLength(4);
      for (const parameter of searchViews.parameters) {
        expect(parameter.questionToken).toBeUndefined();
      }
    }
  }, 60_000);

  it('finalizeBackendExecutionTraceV2 accepts only context and execution', () => {
    const source = readFileSync(
      resolve(repositoryRoot, 'src/process/backend-execution-context-v2.ts'),
      'utf8',
    );
    expect(source).not.toMatch(
      /finalizeBackendExecutionTraceV2\(\s*context:\s*BackendExecutionContextV2,\s*[^)]*codegraph[^)]*execution/u,
    );
    expect(source).not.toContain(
      'finalizeBackendExecutionTraceV2(context, observation, execution)',
    );
  });
});
