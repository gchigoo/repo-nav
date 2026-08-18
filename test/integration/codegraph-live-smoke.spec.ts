import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { LocateExecutionTokenV2 } from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import { createMultiViewBackendSearchRequestV2 } from '../../src/evidence/request-snapshot/discovery-reservation-v2.js';
import {
  createBackendExecutionContextV2,
  finalizeBackendExecutionTraceV2,
  requireBackendDiscoveryHandoffForF3V2,
  requireBackendExecutionOutcomeV2,
  requireBackendExecutionTraceV2,
} from '../../src/process/backend-execution-context-v2.js';
import { createProcessOpaqueTokenV2 } from '../../src/process/opaque-token-v2.js';
import { CodeGraphBackend } from '../../src/repository/codegraph-backend.js';
import { createCodeGraphProcessInvocation } from '../../src/repository/codegraph-command.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';

function filesBelow(root: string): readonly string[] {
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        visit(path);
      } else {
        files.push(path.slice(root.length + 1).replaceAll('\\', '/'));
      }
    }
  };
  visit(root);
  return files.sort();
}

describe('CodeGraph real indexed temp repository', () => {
  it('indexes, probes, queries, and removes only the temporary repository', async () => {
    const workspaceIndex = resolve(process.cwd(), '.codegraph');
    const workspaceIndexExisted = existsSync(workspaceIndex);
    const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-codegraph-'));
    const runner = new NodeSafeProcessRunner();
    const normalizedRepository = resolve(repository);
    const normalizedTemp = resolve(tmpdir());
    if (!normalizedRepository.startsWith(normalizedTemp)) {
      throw new Error('Refusing to clean a non-temporary CodeGraph fixture.');
    }
    try {
      writeFileSync(
        resolve(repository, 'sample.ts'),
        [
          'export function AlphaMapping(sourceId: string): string {',
          '  return sourceId;',
          '}',
          '',
        ].join('\n'),
        'utf8',
      );
      const init = await runner.run(
        {
          ...createCodeGraphProcessInvocation(['init', repository]),
          cwd: repository,
          timeoutMs: 30_000,
          maxStdoutBytes: 4 * 1024 * 1024,
          maxStderrBytes: 1024 * 1024,
          terminateGraceMs: 500,
        },
        new AbortController().signal,
      );
      expect(init.ok).toBe(true);
      expect(existsSync(resolve(repository, '.codegraph'))).toBe(true);

      const backend = new CodeGraphBackend(runner);
      const health = await backend.probe(
        repository,
        new AbortController().signal,
      );
      expect(health).toMatchObject({
        state: 'available',
        indexFound: true,
        possibleStaleIndex: false,
      });
      expect(health.version).toMatch(/^1\.5\.0$/u);

      const signal = new AbortController().signal;
      const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
      const context = createBackendExecutionContextV2(
        runner,
        undefined,
        signal,
        execution,
      );
      const request = createMultiViewBackendSearchRequestV2(
        {
          repositoryRoot: repository,
          terms: [{ value: 'AlphaMapping', caseSensitive: true }],
          anchors: [
            {
              kind: 'symbol',
              value: 'AlphaMapping',
              caseSensitive: true,
            },
          ],
          negativeTerms: [],
          layers: [],
        },
        5,
      );
      const handoff = await backend.searchViews(
        request,
        signal,
        context,
        execution,
      );
      const search = requireBackendDiscoveryHandoffForF3V2(
        handoff,
        'codegraph',
        request,
        context,
        execution,
      );
      expect(search.kind).toBe('started');
      if (search.kind !== 'started') {
        return;
      }
      expect(
        requireBackendExecutionOutcomeV2(search.expandedOutcome, execution),
      ).toMatchObject({
        backend: 'codegraph',
        status: 'used',
        completion: 'complete',
        selectionEligibility: 'complete-safe-set',
        hitCount: 1,
      });
      expect(search.completeSafeHits).toEqual([
        {
          hit: {
            file: 'sample.ts',
            symbol: 'AlphaMapping',
            lines: [1, 1],
            backendRank: 0,
            source: 'codegraph',
            reasonCodes: ['SYMBOL_SEARCH_HIT'],
          },
          matchedAnchorKeys: [],
          querySeedKeys: [],
        },
      ]);
      const trace = requireBackendExecutionTraceV2(
        finalizeBackendExecutionTraceV2(context, execution),
        execution,
      );
      expect(trace.codegraphIndexObservation).toEqual({
        kind: 'available',
        possiblyStale: false,
      });
      expect(trace.outcomes[0]).toMatchObject({
        backend: 'codegraph',
        status: 'used',
        completion: 'complete',
        hitCount: 1,
      });
      expect(
        filesBelow(resolve(repository, '.codegraph')).some((file) =>
          /(?:daemon|watcher).*\.(?:pid|lock)$/iu.test(file),
        ),
      ).toBe(false);
      expect(existsSync(workspaceIndex)).toBe(workspaceIndexExisted);
    } finally {
      rmSync(normalizedRepository, { recursive: true, force: true });
    }
    expect(existsSync(repository)).toBe(false);
    expect(existsSync(workspaceIndex)).toBe(workspaceIndexExisted);
  }, 60_000);
});
