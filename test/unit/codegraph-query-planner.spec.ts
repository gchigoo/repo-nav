import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type {
  BackendSearchRequest,
  SafeProcessRequest,
  SafeProcessResult,
} from '../../src/contracts/index.js';
import type {
  SafeProcessStreamingResultV2,
  SafeStdoutConsumerV2,
} from '../../src/contracts/safe-process.js';
import { CodeGraphBackend } from '../../src/repository/codegraph-backend.js';
import { createCodeGraphQueryPlan } from '../../src/repository/codegraph-query-planner.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { CodeGraphTransitionBackend } from '../../testkit/fixtures/codegraph/codegraph-transition-backend.js';
import { createCanonicalLocateEngineHarnessV2 } from '../../testkit/testing/create-canonical-locate-engine-harness-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

function bytes(value: string): Uint8Array {
  return Buffer.from(value, 'utf8');
}

function status(): SafeProcessResult {
  return {
    ok: true,
    exitCode: 0,
    stdout: bytes(
      JSON.stringify({
        initialized: true,
        version: '1.1.6',
        pendingChanges: { added: 0, modified: 0, removed: 0 },
        worktreeMismatch: null,
        index: { reindexRecommended: false },
      }),
    ),
    stderr: bytes(''),
  };
}

function query(name: string, line: number): SafeProcessResult {
  return {
    ok: true,
    exitCode: 0,
    stdout: bytes(
      JSON.stringify([
        {
          node: {
            name,
            qualifiedName: name,
            filePath: `src/${name}.ts`,
            startLine: line,
            endLine: line,
          },
        },
      ]),
    ),
    stderr: bytes(''),
  };
}

class RecordingRunner extends NodeSafeProcessRunner {
  public readonly requests: SafeProcessRequest[] = [];

  public constructor(private readonly results: readonly SafeProcessResult[]) {
    super();
  }

  public override async run(
    request: SafeProcessRequest,
    _signal: AbortSignal,
  ): Promise<SafeProcessResult> {
    this.requests.push(request);
    const result = this.results[this.requests.length - 1];
    if (result === undefined) {
      throw new Error('Unexpected CodeGraph invocation.');
    }
    return result;
  }

  public override runStreaming<TPartial, TComplete>(
    request: SafeProcessRequest,
    _signal: AbortSignal,
    _consumer: SafeStdoutConsumerV2<TPartial, TComplete>,
  ): Promise<SafeProcessStreamingResultV2<TPartial, TComplete>> {
    this.requests.push(request);
    const result = this.results[this.requests.length - 1];
    if (result === undefined) {
      throw new Error('Unexpected CodeGraph invocation.');
    }
    if (!result.ok) {
      throw new Error('Expected successful CodeGraph status fixture.');
    }
    return Promise.resolve({
      ok: true,
      kind: 'completed',
      startState: 'started',
      exitCode: 0,
      terminationSignal: null,
      stdout: { kind: 'complete', value: result.stdout as TComplete },
      stderr: result.stderr,
    });
  }
}

function baseRequest(
  overrides: Partial<BackendSearchRequest> = {},
): BackendSearchRequest {
  return {
    repositoryRoot: 'C:/repository',
    terms: [{ value: 'Alpha', caseSensitive: true }],
    anchors: [{ kind: 'symbol', value: 'Alpha', caseSensitive: true }],
    negativeTerms: [],
    layers: [],
    maxHits: 4,
    ...overrides,
  };
}

describe.runIf(
  isSelected({ group: 'codegraph-query-plan', caseId: 'codegraph-query-plan' }),
)('CodeGraph query planner', () => {
  it('orders symbol anchors before Unicode identifier terms and deduplicates', () => {
    const plan = createCodeGraphQueryPlan(
      baseRequest({
        anchors: [
          { kind: 'symbol', value: 'Beta', caseSensitive: true },
          { kind: 'symbol', value: 'Alpha', caseSensitive: true },
        ],
        terms: [
          { value: 'Alpha', caseSensitive: true },
          { value: 'Δelta', caseSensitive: true },
          { value: 'Beta', caseSensitive: true },
        ],
      }),
    );
    expect(plan.entries).toEqual([
      { value: 'Beta', caseSensitive: true, source: 'symbol-anchor' },
      { value: 'Alpha', caseSensitive: true, source: 'symbol-anchor' },
      { value: 'Δelta', caseSensitive: true, source: 'term' },
    ]);
    expect(plan.unsupportedDimensions).toEqual([]);
    expect(plan.canSkipFallbackIfVerified).toBe(false);
  });

  it('marks every unsupported or incomplete input dimension explicitly', () => {
    const plan = createCodeGraphQueryPlan(
      baseRequest({
        anchors: [
          { kind: 'symbol', value: 'alpha', caseSensitive: false },
          { kind: 'file', value: 'src/alpha.ts', caseSensitive: true },
          { kind: 'table', value: 'alpha_table', caseSensitive: true },
        ],
        terms: [
          { value: 'alpha', caseSensitive: false },
          { value: 'alpha-value', caseSensitive: true },
        ],
        negativeTerms: [{ value: 'legacy', caseSensitive: false }],
        layers: ['server'],
      }),
    );
    expect(plan.entries).toEqual([
      { value: 'alpha', caseSensitive: false, source: 'symbol-anchor' },
    ]);
    expect(plan.unsupportedDimensions).toEqual([
      'case-insensitive-search',
      'anchor:file',
      'anchor:table',
      'negative-terms',
      'layer-filter',
      'non-identifier-term',
    ]);
    expect(plan.canSkipFallbackIfVerified).toBe(false);
  });

  it('requires all terms to exactly match a sensitive explicit symbol anchor', () => {
    expect(
      createCodeGraphQueryPlan(baseRequest()).canSkipFallbackIfVerified,
    ).toBe(true);
    expect(
      createCodeGraphQueryPlan(
        baseRequest({
          anchors: [
            { kind: 'symbol', value: 'Alpha', caseSensitive: true },
            { kind: 'symbol', value: 'Beta', caseSensitive: true },
          ],
          terms: [
            { value: 'Alpha', caseSensitive: true },
            { value: 'Beta', caseSensitive: true },
          ],
        }),
      ).canSkipFallbackIfVerified,
    ).toBe(false);
    expect(
      createCodeGraphQueryPlan(
        baseRequest({
          terms: [
            { value: 'Alpha', caseSensitive: true },
            { value: 'Other', caseSensitive: true },
          ],
        }),
      ).canSkipFallbackIfVerified,
    ).toBe(false);
  });

  it('allows a single exact identifier term to stop after a verified CodeGraph definition', async () => {
    const termOnlyPlan = createCodeGraphQueryPlan(
      baseRequest({
        terms: [{ value: 'NarrowTarget', caseSensitive: true }],
        anchors: [],
      }),
    );
    expect(termOnlyPlan.canSkipFallbackIfVerified).toBe(true);
    expect(
      createCodeGraphQueryPlan(
        baseRequest({
          terms: [{ value: 'narrow-target', caseSensitive: true }],
          anchors: [],
        }),
      ).canSkipFallbackIfVerified,
    ).toBe(false);

    const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-cg-term-'));
    const sourceDirectory = resolve(repository, 'src');
    mkdirSync(sourceDirectory);
    writeFileSync(
      resolve(sourceDirectory, 'narrow.ts'),
      [
        'export function NarrowTarget(',
        '  value: string,',
        '): string {',
        '  return value;',
        '}',
        '',
      ].join('\n'),
      'utf8',
    );
    try {
      const codegraph = new CodeGraphTransitionBackend('codegraph', {
        health: { state: 'available', version: '1.5.0' },
        hits: [
          {
            file: 'src/narrow.ts',
            symbol: 'NarrowTarget',
            lines: [1, 1],
            source: 'codegraph',
            reasonCodes: ['LITERAL_TERM_HIT'],
          },
        ],
        // A saturated fuzzy result set is incomplete, but the retained exact
        // definition is still sufficient for this single exact intent.
        complete: false,
        canSkipFallbackIfVerified: true,
      });
      const ripgrep = new CodeGraphTransitionBackend('ripgrep', {
        health: { state: 'available' },
        hits: [
          {
            file: 'src/narrow.ts',
            lines: [4, 4],
            source: 'ripgrep',
            reasonCodes: ['LITERAL_TERM_HIT'],
          },
        ],
        complete: true,
      });
      const located = await createCanonicalLocateEngineHarnessV2(
        [codegraph, ripgrep],
        new NodeRepositoryReader(),
      ).service.locate(
        {
          repoPath: repository,
          terms: ['NarrowTarget'],
          limits: {
            timeoutMs: 10_000,
            maxFiles: 5,
            maxConfirmed: 5,
            maxCandidates: 5,
          },
        },
        { signal: new AbortController().signal },
      );

      expect(codegraph.calls).toBe(1);
      expect(ripgrep.calls).toBe(0);
      expect(located).toMatchObject({
        ok: true,
        evidence: {
          confirmed: [
            {
              role: 'execution-site',
              location: {
                file: 'src/narrow.ts',
                symbol: 'NarrowTarget',
              },
              provenance: { discoveredBy: ['codegraph'] },
              reasonCodes: ['EXACT_TERM_MATCH'],
            },
          ],
          candidates: [],
          coverage: {
            fallbackChecked: false,
            backends: [{ backend: 'codegraph' }],
          },
        },
      });
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it('shares total maxHits, passes only positive remaining, and stops at zero', async () => {
    const runner = new RecordingRunner([status(), query('Alpha', 1)]);
    const result = await new CodeGraphBackend(runner).search(
      baseRequest({
        terms: [
          { value: 'Alpha', caseSensitive: true },
          { value: 'Beta', caseSensitive: true },
        ],
        anchors: [],
        maxHits: 1,
      }),
      new AbortController().signal,
    );
    expect(runner.requests).toHaveLength(2);
    expect(runner.requests[1]?.argv.slice(-7)).toEqual([
      'query',
      '--json',
      '--path',
      'C:/repository',
      '--limit',
      '1',
      'Alpha',
    ]);
    expect(result).toMatchObject({ complete: false });
    expect(result.hits).toHaveLength(1);
  });

  it('does not let fuzzy raw results starve later exact term queries', async () => {
    const runner = new RecordingRunner([
      status(),
      query('AlphaHelper', 1),
      query('Beta', 2),
    ]);
    const result = await new CodeGraphBackend(runner).search(
      baseRequest({
        terms: [
          { value: 'Alpha', caseSensitive: true },
          { value: 'Beta', caseSensitive: true },
        ],
        anchors: [],
        maxHits: 1,
      }),
      new AbortController().signal,
    );
    expect(runner.requests).toHaveLength(3);
    expect(runner.requests[1]?.argv.at(-2)).toBe('1');
    expect(runner.requests[2]?.argv.at(-2)).toBe('1');
    expect(result.hits.map((hit) => hit.symbol)).toEqual(['Beta']);
    expect(result.complete).toBe(false);
  });

  it('reduces remaining budget for each stable single-search invocation', async () => {
    const runner = new RecordingRunner([
      status(),
      query('Alpha', 1),
      query('Beta', 2),
    ]);
    const result = await new CodeGraphBackend(runner).search(
      baseRequest({
        terms: [
          { value: 'Alpha', caseSensitive: true },
          { value: 'Beta', caseSensitive: true },
        ],
        anchors: [],
        maxHits: 3,
      }),
      new AbortController().signal,
    );
    expect(runner.requests[1]?.argv.at(-2)).toBe('3');
    expect(runner.requests[2]?.argv.at(-2)).toBe('2');
    expect(result.complete).toBe(true);
    expect(result.hits.map((hit) => hit.symbol)).toEqual(['Alpha', 'Beta']);
  });
});
