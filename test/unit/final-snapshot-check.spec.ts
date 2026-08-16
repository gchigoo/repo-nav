import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  issueLocateProjectionExecutionCapabilityV2,
  requireLocateProjectionExecutionTokenV2,
} from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import type { CanonicalFileKeyV2 } from '../../src/evidence/request-snapshot/canonical-file-identity-v2.js';
import {
  runFinalSnapshotCheckV2,
  setAfterSuccessfulFinalFileCheckForTestV2,
  snapshotTrustProofOwnKeysV2,
} from '../../src/evidence/request-snapshot/final-snapshot-check-v2.js';
import { buildPreRankingStablePoolsV2 } from '../../src/evidence/request-snapshot/pre-ranking-evidence-pool-v2.js';
import { createRequestRepositorySnapshotV2 } from '../../src/evidence/request-snapshot/request-repository-snapshot-v2.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import { isSelected } from '../../testkit/testing/selection.js';

function executionToken() {
  return requireLocateProjectionExecutionTokenV2(
    issueLocateProjectionExecutionCapabilityV2(),
  );
}

const coverageSelected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'snapshot-coverage-truth-table',
});
const mutationSelected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'snapshot-mutation-purge',
});
const abortSelected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'snapshot-failure-and-abort-purge',
});

describe.runIf(coverageSelected)(
  'F3-SNAPSHOT-001 snapshot-coverage-truth-table',
  () => {
    it('maps zero-read unknown and stable/changed consistency exactly', async () => {
      const empty = await runFinalSnapshotCheckV2({
        repositoryRoot: '/tmp/unused',
        loadedFiles: [],
        evidencePool: {
          records: [],
          preRankingPoolTruncated: false,
          safeSelectionCollision: false,
        },
        eligiblePool: { records: [] },
        gitState: 'unknown',
        signal: new AbortController().signal,
        execution: executionToken(),
      });
      expect(empty.facts.coverage.consistency).toBe('unknown');
      expect(empty.facts.coverage.filesChecked).toBe(0);
      expect(empty.facts.coverage.discardedEvidenceCount).toBe(0);
      expect(snapshotTrustProofOwnKeysV2(empty.proof)).toEqual([]);

      const missingLoadedPools = buildPreRankingStablePoolsV2([
        Object.freeze({
          discoveryKey: 'd-missing-loaded',
          canonicalFileKey: 'server/missing.ts' as CanonicalFileKeyV2,
          safeKey: 'missing',
          rankingSignals: Object.freeze({
            kind: 'direct' as const,
            focusLines: Object.freeze([1, 1] as [number, number]),
            focusExcerpt: 'const missing = 1;',
          }),
          classificationDefined: false,
        }),
      ]);
      const missingLoaded = await runFinalSnapshotCheckV2({
        repositoryRoot: '/tmp/unused',
        loadedFiles: [],
        evidencePool: missingLoadedPools.evidence,
        eligiblePool: missingLoadedPools.eligible,
        gitState: 'unknown',
        signal: new AbortController().signal,
        execution: executionToken(),
      });
      expect(missingLoaded.facts.coverage.consistency).toBe('changed');
      expect(missingLoaded.changedCanonicalKeys.has('server/missing.ts')).toBe(
        true,
      );
      expect(missingLoaded.retainedEligible).toEqual([]);

      const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-final-'));
      try {
        const relative = 'server/stable.ts';
        const absolute = resolve(workspace, relative);
        mkdirSync(dirname(absolute), { recursive: true });
        writeFileSync(absolute, 'const stable = 1;\n', 'utf8');
        const root = await new NodeRepositoryReader().resolveRoot(
          workspace,
          new AbortController().signal,
        );
        const snapshot = createRequestRepositorySnapshotV2({
          repositoryRoot: root,
        });
        try {
          await snapshot.readRange(
            root,
            relative,
            [1, 1],
            {
              maxFileBytes: 4096,
              maxExcerptBytes: 256,
              maxExcerptLines: 4,
            },
            new AbortController().signal,
          );
          const pools = buildPreRankingStablePoolsV2([
            Object.freeze({
              discoveryKey: 'd-stable',
              canonicalFileKey: relative as CanonicalFileKeyV2,
              safeKey: 'k',
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
            'clean',
          );
          expect(result.facts.coverage.consistency).toBe('stable');
          expect(result.facts.coverage.filesChecked).toBe(1);
          expect(result.facts.coverage.gitState).toBe('clean');
          expect(result.facts.coverage.discardedEvidenceCount).toBe(0);
        } finally {
          snapshot.dispose();
        }
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });
  },
);

describe.runIf(mutationSelected)(
  'F3-MUTATION-001 snapshot-mutation-purge',
  () => {
    it('purges all drafts for a changed canonical file without refill', async () => {
      const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-mutate-'));
      try {
        const relative = 'server/mutate.ts';
        const absolute = resolve(workspace, relative);
        mkdirSync(dirname(absolute), { recursive: true });
        writeFileSync(absolute, 'const before = 1;\n', 'utf8');
        const root = await new NodeRepositoryReader().resolveRoot(
          workspace,
          new AbortController().signal,
        );
        const snapshot = createRequestRepositorySnapshotV2({
          repositoryRoot: root,
        });
        try {
          await snapshot.readRange(
            root,
            relative,
            [1, 1],
            {
              maxFileBytes: 4096,
              maxExcerptBytes: 256,
              maxExcerptLines: 4,
            },
            new AbortController().signal,
          );
          writeFileSync(absolute, 'const after = 2;\nline2\n', 'utf8');
          const draft = Object.freeze({
            evidenceClass: 'candidate' as const,
            role: 'related' as const,
            location: Object.freeze({
              file: relative,
              lines: Object.freeze([1, 1] as [number, number]),
              excerpt: 'const before = 1;',
            }),
            provenance: Object.freeze({
              discoveredBy: Object.freeze(['filesystem' as const]),
              verifiedBy: 'filesystem' as const,
              operations: Object.freeze(['FILESYSTEM_READ_RANGE' as const]),
            }),
            reasonCodes: Object.freeze([
              'SAME_SCOPE_SIMILAR_IDENTIFIER' as const,
            ]),
            promotionRequirements: Object.freeze([
              'USER_SEMANTIC_CONFIRMATION' as const,
            ]),
          });
          const pools = buildPreRankingStablePoolsV2([
            Object.freeze({
              discoveryKey: 'd-mutate',
              canonicalFileKey: relative as CanonicalFileKeyV2,
              safeKey: 'mk',
              draft,
              rankingSignals: Object.freeze({
                kind: 'derived' as const,
                focusLines: Object.freeze([1, 1] as [number, number]),
                focusExcerpt: 'const before = 1;',
              }),
              classificationDefined: true,
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
          expect(result.discardedEvidenceCount).toBe(1);
          expect(result.retainedEvidence).toHaveLength(0);
          expect(result.retainedEligible).toHaveLength(0);
        } finally {
          snapshot.dispose();
        }
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });
  },
);

describe.runIf(abortSelected)(
  'F3-ABORT-001 snapshot-failure-and-abort-purge',
  () => {
    it('purges unchecked files on abort and completes cleanup', async () => {
      const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-abort-'));
      try {
        const relative = 'server/abort.ts';
        const absolute = resolve(workspace, relative);
        mkdirSync(dirname(absolute), { recursive: true });
        writeFileSync(absolute, 'const abortable = 1;\n', 'utf8');
        const root = await new NodeRepositoryReader().resolveRoot(
          workspace,
          new AbortController().signal,
        );
        const snapshot = createRequestRepositorySnapshotV2({
          repositoryRoot: root,
        });
        try {
          await snapshot.readRange(
            root,
            relative,
            [1, 1],
            {
              maxFileBytes: 4096,
              maxExcerptBytes: 256,
              maxExcerptLines: 4,
            },
            new AbortController().signal,
          );
          const pools = buildPreRankingStablePoolsV2([
            Object.freeze({
              discoveryKey: 'd-abort',
              canonicalFileKey: relative as CanonicalFileKeyV2,
              safeKey: 'ak',
              rankingSignals: Object.freeze({
                kind: 'direct' as const,
                focusLines: Object.freeze([1, 1] as [number, number]),
                focusExcerpt: 'const abortable = 1;',
              }),
              classificationDefined: false,
            }),
          ]);
          const controller = new AbortController();
          controller.abort();
          const result = await snapshot.finalCheck(
            controller.signal,
            executionToken(),
            pools.evidence,
            pools.eligible,
            'unknown',
          );
          expect(result.facts.coverage.consistency).toBe('changed');
          expect(result.changedCanonicalKeys.has(relative)).toBe(true);
        } finally {
          snapshot.dispose();
        }
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });

    it('fails closed when the request snapshot is disposed before final check', async () => {
      const workspace = mkdtempSync(
        resolve(tmpdir(), 'repo-nav-disposed-final-'),
      );
      try {
        const relative = 'server/disposed.ts';
        const absolute = resolve(workspace, relative);
        mkdirSync(dirname(absolute), { recursive: true });
        writeFileSync(absolute, 'const disposed = 1;\n', 'utf8');
        const root = await new NodeRepositoryReader().resolveRoot(
          workspace,
          new AbortController().signal,
        );
        const snapshot = createRequestRepositorySnapshotV2({
          repositoryRoot: root,
        });
        await snapshot.readRange(
          root,
          relative,
          [1, 1],
          {
            maxFileBytes: 4096,
            maxExcerptBytes: 256,
            maxExcerptLines: 4,
          },
          new AbortController().signal,
        );
        const pools = buildPreRankingStablePoolsV2([
          Object.freeze({
            discoveryKey: 'd-disposed',
            canonicalFileKey: relative as CanonicalFileKeyV2,
            safeKey: 'disposed',
            rankingSignals: Object.freeze({
              kind: 'direct' as const,
              focusLines: Object.freeze([1, 1] as [number, number]),
              focusExcerpt: 'const disposed = 1;',
            }),
            classificationDefined: false,
          }),
        ]);
        snapshot.dispose();

        await expect(
          snapshot.finalCheck(
            new AbortController().signal,
            executionToken(),
            pools.evidence,
            pools.eligible,
            'unknown',
          ),
        ).rejects.toMatchObject({ code: 'FILE_UNREADABLE' });
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });

    it('rejects final check while a verified read is still unsettled', async () => {
      const workspace = mkdtempSync(
        resolve(tmpdir(), 'repo-nav-pending-final-'),
      );
      try {
        const relative = 'server/pending.ts';
        const absolute = resolve(workspace, relative);
        mkdirSync(dirname(absolute), { recursive: true });
        writeFileSync(absolute, 'const pending = 1;\n', 'utf8');
        const root = await new NodeRepositoryReader().resolveRoot(
          workspace,
          new AbortController().signal,
        );
        const snapshot = createRequestRepositorySnapshotV2({
          repositoryRoot: root,
        });
        try {
          const pendingRead = snapshot.readRange(
            root,
            relative,
            [1, 1],
            {
              maxFileBytes: 4096,
              maxExcerptBytes: 256,
              maxExcerptLines: 4,
            },
            new AbortController().signal,
          );
          await expect(
            snapshot.finalCheck(
              new AbortController().signal,
              executionToken(),
              {
                records: [],
                preRankingPoolTruncated: false,
                safeSelectionCollision: false,
              },
              { records: [] },
              'unknown',
            ),
          ).rejects.toMatchObject({ code: 'FILE_UNREADABLE' });
          await expect(pendingRead).resolves.toMatchObject({ file: relative });
        } finally {
          snapshot.dispose();
        }
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });

    it('keeps successfully rechecked files when abort happens mid final-check', async () => {
      const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-mid-abort-'));
      try {
        const first = 'server/first.ts';
        const second = 'server/second.ts';
        for (const relative of [first, second]) {
          const absolute = resolve(workspace, relative);
          mkdirSync(dirname(absolute), { recursive: true });
          writeFileSync(absolute, `const ${relative} = 1;\n`, 'utf8');
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
            first,
            [1, 1],
            limits,
            new AbortController().signal,
          );
          await snapshot.readRange(
            root,
            second,
            [1, 1],
            limits,
            new AbortController().signal,
          );
          const pools = buildPreRankingStablePoolsV2([
            Object.freeze({
              discoveryKey: 'd-first',
              canonicalFileKey: first as CanonicalFileKeyV2,
              safeKey: 'f',
              rankingSignals: Object.freeze({
                kind: 'direct' as const,
                focusLines: Object.freeze([1, 1] as [number, number]),
                focusExcerpt: 'const server/first.ts = 1;',
              }),
              classificationDefined: false,
            }),
            Object.freeze({
              discoveryKey: 'd-second',
              canonicalFileKey: second as CanonicalFileKeyV2,
              safeKey: 's',
              rankingSignals: Object.freeze({
                kind: 'direct' as const,
                focusLines: Object.freeze([1, 1] as [number, number]),
                focusExcerpt: 'const server/second.ts = 1;',
              }),
              classificationDefined: false,
            }),
          ]);
          const controller = new AbortController();
          setAfterSuccessfulFinalFileCheckForTestV2(() => {
            controller.abort();
          });
          try {
            const result = await snapshot.finalCheck(
              controller.signal,
              executionToken(),
              pools.evidence,
              pools.eligible,
              'unknown',
            );
            expect(result.facts.coverage.filesChecked).toBe(1);
            expect(result.changedCanonicalKeys.has(first)).toBe(false);
            expect(result.changedCanonicalKeys.has(second)).toBe(true);
            expect(
              result.retainedEligible.map((record) => record.discoveryKey),
            ).toEqual(['d-first']);
          } finally {
            setAfterSuccessfulFinalFileCheckForTestV2(undefined);
          }
        } finally {
          snapshot.dispose();
        }
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });
  },
);
