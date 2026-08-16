import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  issueLocateProjectionExecutionCapabilityV2,
  requireLocateProjectionExecutionTokenV2,
} from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import type { CanonicalFileKeyV2 } from '../../src/evidence/request-snapshot/canonical-file-identity-v2.js';
import { buildPreRankingStablePoolsV2 } from '../../src/evidence/request-snapshot/pre-ranking-evidence-pool-v2.js';
import { createRequestRepositorySnapshotV2 } from '../../src/evidence/request-snapshot/request-repository-snapshot-v2.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import {
  LARGE_REPOSITORY_REQUEST_CACHE_CASE_ID,
  SNAPSHOT_MUTATION_GOLDEN_CASE_ID,
} from '../../testkit/fixtures/request-snapshot-v2/mutation-golden-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

function executionToken() {
  return requireLocateProjectionExecutionTokenV2(
    issueLocateProjectionExecutionCapabilityV2(),
  );
}

const mutationSelected = isSelected({
  group: 'request-snapshot-cache',
  caseId: SNAPSHOT_MUTATION_GOLDEN_CASE_ID,
});
const largeSelected = isSelected({
  group: 'request-snapshot-cache',
  caseId: LARGE_REPOSITORY_REQUEST_CACHE_CASE_ID,
});

describe.runIf(mutationSelected)(
  'F3-V1-MUTATION-001 snapshot-mutation-golden',
  () => {
    it('purges only affected evidence after real filesystem mutation', async () => {
      const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-mut-golden-'));
      try {
        const changed = 'server/changed.ts';
        const stable = 'server/stable.ts';
        for (const [relative, content] of [
          [changed, 'const changed = 1;\n'] as const,
          [stable, 'const stable = 1;\n'] as const,
        ]) {
          const absolute = resolve(workspace, relative);
          mkdirSync(dirname(absolute), { recursive: true });
          writeFileSync(absolute, content, 'utf8');
        }
        const root = await new NodeRepositoryReader().resolveRoot(
          workspace,
          new AbortController().signal,
        );
        const snapshot = createRequestRepositorySnapshotV2({
          repositoryRoot: root,
        });
        try {
          const limits = {
            maxFileBytes: 4096,
            maxExcerptBytes: 256,
            maxExcerptLines: 4,
          };
          await snapshot.readRange(
            root,
            changed,
            [1, 1],
            limits,
            new AbortController().signal,
          );
          await snapshot.readRange(
            root,
            stable,
            [1, 1],
            limits,
            new AbortController().signal,
          );
          writeFileSync(
            resolve(workspace, changed),
            'const changed = 2;\nextra\n',
            'utf8',
          );

          const pools = buildPreRankingStablePoolsV2([
            Object.freeze({
              discoveryKey: 'd-changed',
              canonicalFileKey: changed as CanonicalFileKeyV2,
              safeKey: 'c',
              rankingSignals: Object.freeze({
                kind: 'direct' as const,
                focusLines: Object.freeze([1, 1] as [number, number]),
                focusExcerpt: 'const changed = 1;',
              }),
              classificationDefined: false,
            }),
            Object.freeze({
              discoveryKey: 'd-stable',
              canonicalFileKey: stable as CanonicalFileKeyV2,
              safeKey: 's',
              rankingSignals: Object.freeze({
                kind: 'direct' as const,
                focusLines: Object.freeze([1, 1] as [number, number]),
                focusExcerpt: 'const stable = 1;',
              }),
              classificationDefined: false,
            }),
          ]);
          const result = await snapshot.finalCheck(
            new AbortController().signal,
            executionToken(),
            pools.evidence,
            pools.eligible,
            'dirty',
          );
          expect(result.facts.coverage.consistency).toBe('changed');
          expect(result.changedCanonicalKeys.has(changed)).toBe(true);
          expect(result.changedCanonicalKeys.has(stable)).toBe(false);
          expect(
            result.retainedEligible.map((record) => record.discoveryKey),
          ).toEqual(['d-stable']);
          expect(result.discardedEvidenceCount).toBe(0);
        } finally {
          snapshot.dispose();
        }
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });
  },
);

describe.runIf(largeSelected)(
  'F3-LARGE-001 large-repository-request-cache',
  () => {
    it('decodes each unique canonical file once across multi-view reads', async () => {
      const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-large-cache-'));
      try {
        const files = Array.from({ length: 12 }, (_, index) => {
          const relative = `server/file-${index}.ts`;
          const absolute = resolve(workspace, relative);
          mkdirSync(dirname(absolute), { recursive: true });
          writeFileSync(
            absolute,
            `export const value${index} = ${index};\n`,
            'utf8',
          );
          return relative;
        });
        const root = await new NodeRepositoryReader().resolveRoot(
          workspace,
          new AbortController().signal,
        );
        const snapshot = createRequestRepositorySnapshotV2({
          repositoryRoot: root,
        });
        try {
          const limits = {
            maxFileBytes: 4096,
            maxExcerptBytes: 256,
            maxExcerptLines: 4,
          };
          const signal = new AbortController().signal;
          for (const relative of files) {
            await snapshot.readRange(root, relative, [1, 1], limits, signal);
            await snapshot.findMatches(
              root,
              relative,
              [{ value: 'value', caseSensitive: false }],
              undefined,
              2,
              limits,
              signal,
            );
            await snapshot.readWindow(root, relative, [1, 1], limits, signal);
          }
          expect(snapshot.getDecodeInvocationCount()).toBe(files.length);
        } finally {
          snapshot.dispose();
        }
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });
  },
);
