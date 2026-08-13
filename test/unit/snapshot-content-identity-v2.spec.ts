import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { CanonicalFileKeyV2 } from '../../src/evidence/request-snapshot/canonical-file-identity-v2.js';
import { runFinalSnapshotCheckV2 } from '../../src/evidence/request-snapshot/final-snapshot-check-v2.js';
import { buildPreRankingStablePoolsV2 } from '../../src/evidence/request-snapshot/pre-ranking-evidence-pool-v2.js';
import { createRequestRepositorySnapshotV2 } from '../../src/evidence/request-snapshot/request-repository-snapshot-v2.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import {
  verifiedFileSnapshotsEqualV2,
  type VerifiedFileSnapshotV2,
} from '../../src/repository/verified-file-snapshot-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'snapshot-content-identity',
});

const limits = Object.freeze({
  maxFileBytes: 4096,
  maxExcerptBytes: 256,
  maxExcerptLines: 4,
});

function sharedDraft(relative: string, excerpt: string) {
  return Object.freeze({
    evidenceClass: 'candidate' as const,
    role: 'related' as const,
    location: Object.freeze({
      file: relative,
      lines: Object.freeze([1, 1] as [number, number]),
      excerpt,
    }),
    provenance: Object.freeze({
      discoveredBy: Object.freeze(['filesystem' as const]),
      verifiedBy: 'filesystem' as const,
      operations: Object.freeze(['FILESYSTEM_READ_RANGE' as const]),
    }),
    reasonCodes: Object.freeze(['SAME_SCOPE_SIMILAR_IDENTIFIER' as const]),
    promotionRequirements: Object.freeze([
      'USER_SEMANTIC_CONFIRMATION' as const,
    ]),
  });
}

function stablePools(relative: string, excerpt: string) {
  return buildPreRankingStablePoolsV2([
    Object.freeze({
      discoveryKey: `d-${relative}`,
      canonicalFileKey: relative as CanonicalFileKeyV2,
      safeKey: `k-${relative}`,
      draft: sharedDraft(relative, excerpt),
      rankingSignals: Object.freeze({
        kind: 'derived' as const,
        focusLines: Object.freeze([1, 1] as [number, number]),
        focusExcerpt: excerpt,
      }),
      classificationDefined: true,
    }),
  ]);
}

describe.runIf(selected)('H4 snapshot-content-identity', () => {
  it('detects same-size content mutation when mtime is restored', async () => {
    const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-content-id-'));
    try {
      const relative = 'server/identity.ts';
      const absolute = resolve(workspace, relative);
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, 'const value = 1;\n', 'utf8');
      const before = statSync(absolute);
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
          limits,
          new AbortController().signal,
        );
        writeFileSync(absolute, 'const value = 2;\n', 'utf8');
        utimesSync(absolute, before.atime, before.mtime);
        expect(statSync(absolute).size).toBe(before.size);

        const pools = stablePools(relative, 'const value = 1;');
        const checked = await snapshot.finalCheck(
          new AbortController().signal,
          pools.evidence,
          pools.eligible,
          'dirty',
        );
        expect(checked.facts.coverage.consistency).toBe('changed');
        expect(checked.retainedEvidence).toEqual([]);
        expect(checked.discardedEvidenceCount).toBe(1);
      } finally {
        snapshot.dispose();
      }
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('treats digest-only changes as a whole-file mutation', async () => {
    const relative = 'server/digest.ts';
    const identity = Object.freeze({
      dev: 10n,
      ino: 20n,
      size: 17n,
      mtimeNs: 30n,
      ctimeNs: 40n,
    });
    const before: VerifiedFileSnapshotV2 = Object.freeze({
      locator: relative,
      canonicalFileKey: relative as CanonicalFileKeyV2,
      identity,
      contentSha256: 'a'.repeat(64),
    });
    const after: VerifiedFileSnapshotV2 = Object.freeze({
      locator: relative,
      canonicalFileKey: relative as CanonicalFileKeyV2,
      identity,
      contentSha256: 'b'.repeat(64),
    });

    expect(verifiedFileSnapshotsEqualV2(before, after)).toBe(false);
    expect(verifiedFileSnapshotsEqualV2(before, before)).toBe(true);

    const pools = stablePools(relative, 'const digest = 1;');
    const result = await runFinalSnapshotCheckV2({
      repositoryRoot: '/unused',
      loadedFiles: Object.freeze([
        Object.freeze({
          canonicalFileKey: relative as CanonicalFileKeyV2,
          snapshot: before,
          aliases: Object.freeze([relative]),
        }),
      ]),
      evidencePool: pools.evidence,
      eligiblePool: pools.eligible,
      gitState: 'dirty',
      signal: new AbortController().signal,
      readVerifiedFile: async (input) =>
        Object.freeze({
          snapshot: Object.freeze({ ...after, locator: input.locator }),
          bytes: new Uint8Array(),
        }),
    });
    expect(result.facts.coverage.consistency).toBe('changed');
    expect(result.retainedEvidence).toEqual([]);
    expect(result.discardedEvidenceCount).toBe(1);
  });

  it('purges the whole canonical file when final revalidation is unreadable', async () => {
    const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-unreadable-'));
    try {
      const relative = 'server/deleted.ts';
      const absolute = resolve(workspace, relative);
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, 'const deleted = 1;\n', 'utf8');
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
          limits,
          new AbortController().signal,
        );
        rmSync(absolute, { force: true });

        const pools = stablePools(relative, 'const deleted = 1;');
        const checked = await snapshot.finalCheck(
          new AbortController().signal,
          pools.evidence,
          pools.eligible,
          'dirty',
        );
        expect(checked.changedCanonicalKeys).toEqual(new Set([relative]));
        expect(checked.retainedEvidence).toEqual([]);
        expect(checked.retainedEligible).toEqual([]);
      } finally {
        snapshot.dispose();
      }
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('keeps caller locator public while canonical identity remains private', async () => {
    const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-public-path-'));
    try {
      const realDir = resolve(workspace, 'real');
      mkdirSync(realDir);
      writeFileSync(
        resolve(realDir, 'target.ts'),
        'const publicLocator = 1;\n',
        'utf8',
      );
      symlinkSync(
        realDir,
        resolve(workspace, 'alias'),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      const reader = new NodeRepositoryReader();
      const root = await reader.resolveRoot(
        workspace,
        new AbortController().signal,
      );
      const location = await reader.readRange(
        root,
        'alias/target.ts',
        [1, 1],
        limits,
        new AbortController().signal,
      );

      expect(location.file).toBe('alias/target.ts');
      const serialized = JSON.stringify(location);
      expect(serialized).not.toContain('real/target.ts');
      expect(serialized).not.toContain('contentSha256');
      expect(serialized).not.toContain('canonicalFileKey');
      expect(serialized).not.toContain(workspace);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
