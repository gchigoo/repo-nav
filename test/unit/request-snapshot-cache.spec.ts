import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  issueLocateProjectionExecutionCapabilityV2,
  requireLocateProjectionExecutionTokenV2,
} from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import type { CanonicalFileKeyV2 } from '../../src/evidence/request-snapshot/canonical-file-identity-v2.js';
import { buildPreRankingStablePoolsV2 } from '../../src/evidence/request-snapshot/pre-ranking-evidence-pool-v2.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import { readVerifiedFileV2 } from '../../src/repository/verified-file-snapshot-v2.js';
import { VerifiedTextFileSourceV2 } from '../../src/repository/verified-text-file-source-v2.js';
import { RequestFileCacheV2 } from '../../src/evidence/request-snapshot/request-file-cache-v2.js';
import { createRequestRepositorySnapshotV2 } from '../../src/evidence/request-snapshot/request-repository-snapshot-v2.js';
import {
  CANONICAL_ALIAS_CONTENT_V2,
  CANONICAL_ALIAS_LIMITS_V2,
} from '../../testkit/fixtures/request-snapshot-v2/canonical-alias-v2.js';
import {
  SINGLE_DECODE_CONTENT_V2,
  SINGLE_DECODE_FILE_V2,
  SINGLE_DECODE_LIMITS_V2,
} from '../../testkit/fixtures/request-snapshot-v2/single-decode-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

function executionToken() {
  return requireLocateProjectionExecutionTokenV2(
    issueLocateProjectionExecutionCapabilityV2(),
  );
}

async function withTempRepo(
  files: Readonly<Record<string, string>>,
  run: (root: string) => Promise<void>,
): Promise<void> {
  const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-snapshot-'));
  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const absolute = resolve(workspace, relativePath);
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, content, 'utf8');
    }
    const reader = new NodeRepositoryReader();
    const root = await reader.resolveRoot(
      workspace,
      new AbortController().signal,
    );
    await run(root);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

const singleDecodeSelected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'request-file-cache-single-decode',
});

const aliasSelected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'request-file-cache-canonical-alias',
});

describe.runIf(singleDecodeSelected)(
  'F3-CACHE-001 request-file-cache-single-decode',
  () => {
    it('decodes once across range window findMatches and concurrent reads', async () => {
      await withTempRepo(
        { [SINGLE_DECODE_FILE_V2]: SINGLE_DECODE_CONTENT_V2 },
        async (root) => {
          const snapshot = createRequestRepositorySnapshotV2({
            repositoryRoot: root,
          });
          try {
            const signal = new AbortController().signal;
            const [range, window, matches, concurrent] = await Promise.all([
              snapshot.readRange(
                root,
                SINGLE_DECODE_FILE_V2,
                [2, 2],
                SINGLE_DECODE_LIMITS_V2,
                signal,
              ),
              snapshot.readWindow(
                root,
                SINGLE_DECODE_FILE_V2,
                [2, 2],
                SINGLE_DECODE_LIMITS_V2,
                signal,
              ),
              snapshot.findMatches(
                root,
                SINGLE_DECODE_FILE_V2,
                [{ value: 'cacheTarget', caseSensitive: true }],
                undefined,
                4,
                SINGLE_DECODE_LIMITS_V2,
                signal,
              ),
              snapshot.readRange(
                root,
                SINGLE_DECODE_FILE_V2,
                [1, 1],
                SINGLE_DECODE_LIMITS_V2,
                signal,
              ),
            ]);

            expect(range.file).toBe(SINGLE_DECODE_FILE_V2);
            expect(range.excerpt).toContain('cacheTarget');
            expect(window.file).toBe(SINGLE_DECODE_FILE_V2);
            expect(matches.length).toBeGreaterThan(0);
            expect(concurrent.file).toBe(SINGLE_DECODE_FILE_V2);
            expect(snapshot.getDecodeInvocationCount()).toBe(1);
            await expect(
              snapshot.readRange(
                root,
                SINGLE_DECODE_FILE_V2,
                [1, 1],
                { ...SINGLE_DECODE_LIMITS_V2, maxFileBytes: 1 },
                signal,
              ),
            ).rejects.toMatchObject({ code: 'MAX_FILE_BYTES_REACHED' });
            expect(snapshot.getDecodeInvocationCount()).toBe(1);
            await expect(
              snapshot.readRange(
                root,
                SINGLE_DECODE_FILE_V2,
                [1, 1],
                {
                  ...SINGLE_DECODE_LIMITS_V2,
                  maxFileBytes: SINGLE_DECODE_LIMITS_V2.maxFileBytes + 1024,
                },
                signal,
              ),
            ).resolves.toMatchObject({ file: SINGLE_DECODE_FILE_V2 });
            expect(snapshot.getDecodeInvocationCount()).toBe(1);
            expect(snapshot.canonicalFileKeyFor(SINGLE_DECODE_FILE_V2)).toBe(
              SINGLE_DECODE_FILE_V2,
            );
          } finally {
            snapshot.dispose();
          }

          await expect(
            snapshot.readRange(
              root,
              SINGLE_DECODE_FILE_V2,
              [1, 1],
              SINGLE_DECODE_LIMITS_V2,
              new AbortController().signal,
            ),
          ).rejects.toMatchObject({ code: 'FILE_UNREADABLE' });
        },
      );
    });

    it('observes immediately rejected verified reads before the deferred batch settles', async () => {
      await withTempRepo({}, async (root) => {
        const cache = new RequestFileCacheV2({
          repositoryRoot: root,
          decodeMaxFileBytes: SINGLE_DECODE_LIMITS_V2.maxFileBytes,
          source: new VerifiedTextFileSourceV2({
            readVerifiedFile: async () => {
              throw new Error('immediate verified read failure');
            },
          }),
        });
        const unhandled: unknown[] = [];
        const onUnhandled = (reason: unknown): void => {
          unhandled.push(reason);
        };
        process.on('unhandledRejection', onUnhandled);
        try {
          await expect(
            cache.getDecodedLines(
              SINGLE_DECODE_FILE_V2,
              SINGLE_DECODE_LIMITS_V2,
              new AbortController().signal,
            ),
          ).rejects.toThrow('immediate verified read failure');
          await new Promise<void>((resolveImmediate) => {
            setImmediate(resolveImmediate);
          });
          expect(unhandled).toEqual([]);
        } finally {
          process.off('unhandledRejection', onUnhandled);
          cache.dispose();
        }
      });
    });

    it('keeps NodeRepositoryReader as one-shot without request maps', async () => {
      await withTempRepo(
        { [SINGLE_DECODE_FILE_V2]: SINGLE_DECODE_CONTENT_V2 },
        async (root) => {
          const reader = new NodeRepositoryReader();
          const signal = new AbortController().signal;
          await reader.readRange(
            root,
            SINGLE_DECODE_FILE_V2,
            [1, 1],
            SINGLE_DECODE_LIMITS_V2,
            signal,
          );
          await reader.readRange(
            root,
            SINGLE_DECODE_FILE_V2,
            [2, 2],
            SINGLE_DECODE_LIMITS_V2,
            signal,
          );
          expect(
            Object.getOwnPropertyNames(reader).filter((name) =>
              name.toLowerCase().includes('cache'),
            ),
          ).toEqual([]);
        },
      );
    });
  },
);

describe.runIf(aliasSelected)(
  'F3-CACHE-001 request-file-cache-canonical-alias',
  () => {
    it('fails closed when concurrent aliases observe different snapshots', async () => {
      const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-alias-race-'));
      try {
        const realDir = resolve(workspace, 'real');
        mkdirSync(realDir, { recursive: true });
        writeFileSync(
          resolve(realDir, 'target.ts'),
          'const before = 1;\n',
          'utf8',
        );
        for (const alias of ['path-a', 'path-b']) {
          symlinkSync(
            realDir,
            resolve(workspace, alias),
            process.platform === 'win32' ? 'junction' : 'dir',
          );
        }

        const root = await new NodeRepositoryReader().resolveRoot(
          workspace,
          new AbortController().signal,
        );
        let readCount = 0;
        let releaseMutation: (() => void) | undefined;
        const mutationReady = new Promise<void>((resolveReady) => {
          releaseMutation = resolveReady;
        });
        const source = new VerifiedTextFileSourceV2({
          readVerifiedFile: async (input) => {
            readCount += 1;
            const ordinal = readCount;
            if (ordinal > 1) {
              await mutationReady;
            }
            const verified = await readVerifiedFileV2(input);
            if (ordinal === 1) {
              writeFileSync(
                resolve(realDir, 'target.ts'),
                'const after = 22;\n',
                'utf8',
              );
              releaseMutation?.();
            }
            return verified;
          },
        });
        const cache = new RequestFileCacheV2({
          repositoryRoot: root,
          decodeMaxFileBytes: 4096,
          source,
        });
        try {
          const results = await Promise.allSettled([
            cache.getDecodedLines(
              'path-a/target.ts',
              CANONICAL_ALIAS_LIMITS_V2,
              new AbortController().signal,
            ),
            cache.getDecodedLines(
              'path-b/target.ts',
              CANONICAL_ALIAS_LIMITS_V2,
              new AbortController().signal,
            ),
          ]);
          expect(results.every((result) => result.status === 'rejected')).toBe(
            true,
          );
          expect(cache.listLoadedCanonicalFiles()).toEqual([]);
          expect(cache.canonicalFileKeyFor('path-a/target.ts')).toBe(
            'real/target.ts',
          );
          expect(cache.canonicalFileKeyFor('path-b/target.ts')).toBe(
            'real/target.ts',
          );
        } finally {
          cache.dispose();
        }
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });

    it('tombstones a late alias mismatch so stale evidence cannot pass final check', async () => {
      const workspace = mkdtempSync(
        resolve(tmpdir(), 'repo-nav-late-alias-race-'),
      );
      try {
        const realDir = resolve(workspace, 'real');
        mkdirSync(realDir, { recursive: true });
        const target = resolve(realDir, 'target.ts');
        writeFileSync(target, 'const before = 1;\n', 'utf8');
        for (const alias of ['path-a', 'path-b']) {
          symlinkSync(
            realDir,
            resolve(workspace, alias),
            process.platform === 'win32' ? 'junction' : 'dir',
          );
        }

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
            'path-a/target.ts',
            [1, 1],
            CANONICAL_ALIAS_LIMITS_V2,
            new AbortController().signal,
          );
          const canonicalFileKey =
            snapshot.canonicalFileKeyFor('path-a/target.ts');
          expect(canonicalFileKey).toBe('real/target.ts');

          writeFileSync(target, 'const after = 22;\n', 'utf8');
          await expect(
            snapshot.readRange(
              root,
              'path-b/target.ts',
              [1, 1],
              CANONICAL_ALIAS_LIMITS_V2,
              new AbortController().signal,
            ),
          ).rejects.toMatchObject({ code: 'FILE_UNREADABLE' });
          expect(snapshot.canonicalFileKeyFor('path-a/target.ts')).toBe(
            canonicalFileKey,
          );
          expect(snapshot.canonicalFileKeyFor('path-b/target.ts')).toBe(
            canonicalFileKey,
          );

          const pools = buildPreRankingStablePoolsV2([
            Object.freeze({
              discoveryKey: 'd-stale-alias',
              canonicalFileKey: canonicalFileKey as CanonicalFileKeyV2,
              safeKey: 'k-stale-alias',
              rankingSignals: Object.freeze({
                kind: 'direct' as const,
                focusLines: Object.freeze([1, 1] as [number, number]),
                focusExcerpt: 'const before = 1;',
              }),
              classificationDefined: false,
            }),
          ]);
          const checked = await snapshot.finalCheck(
            new AbortController().signal,
            executionToken(),
            pools.evidence,
            pools.eligible,
            'dirty',
          );
          expect(checked.facts.coverage.consistency).toBe('changed');
          expect(checked.changedCanonicalKeys.has(canonicalFileKey!)).toBe(
            true,
          );
          expect(checked.retainedEligible).toEqual([]);
        } finally {
          snapshot.dispose();
        }
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });

    it('shares one decode across directory-reparse alias locators', async () => {
      const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-alias-'));
      try {
        // 目录 junction/symlink：两路径 realpath 到同一文件，Windows 无需 file symlink 权限
        const realDir = resolve(workspace, 'real');
        mkdirSync(realDir, { recursive: true });
        writeFileSync(
          resolve(realDir, 'alias-target.ts'),
          CANONICAL_ALIAS_CONTENT_V2,
          'utf8',
        );
        const aliasA = resolve(workspace, 'path-a');
        const aliasB = resolve(workspace, 'path-b');
        symlinkSync(
          realDir,
          aliasA,
          process.platform === 'win32' ? 'junction' : 'dir',
        );
        symlinkSync(
          realDir,
          aliasB,
          process.platform === 'win32' ? 'junction' : 'dir',
        );

        const locatorA = 'path-a/alias-target.ts';
        const locatorB = 'path-b/alias-target.ts';
        const nestReader = new NodeRepositoryReader();
        const root = await nestReader.resolveRoot(
          workspace,
          new AbortController().signal,
        );
        const snapshot = createRequestRepositorySnapshotV2({
          repositoryRoot: root,
        });
        try {
          const signal = new AbortController().signal;
          const [viaA, viaB] = await Promise.all([
            snapshot.readRange(
              root,
              locatorA,
              [1, 1],
              CANONICAL_ALIAS_LIMITS_V2,
              signal,
            ),
            snapshot.readRange(
              root,
              locatorB,
              [2, 2],
              CANONICAL_ALIAS_LIMITS_V2,
              signal,
            ),
          ]);
          expect(viaA.file).toBe(locatorA);
          expect(viaB.file).toBe(locatorB);
          expect(viaB.excerpt).toContain('aliasMarker');
          expect(snapshot.getDecodeInvocationCount()).toBe(1);
          expect(snapshot.canonicalFileKeyFor(locatorA)).toBe(
            snapshot.canonicalFileKeyFor(locatorB),
          );
          expect(snapshot.canonicalFileKeyFor(locatorA)).toBe(
            'real/alias-target.ts',
          );
        } finally {
          snapshot.dispose();
        }
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });
  },
);
