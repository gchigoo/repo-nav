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

import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
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
            expect(
              snapshot.canonicalFileKeyFor(SINGLE_DECODE_FILE_V2),
            ).toBe(SINGLE_DECODE_FILE_V2);
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
          const viaA = await snapshot.readRange(
            root,
            locatorA,
            [1, 1],
            CANONICAL_ALIAS_LIMITS_V2,
            signal,
          );
          const viaB = await snapshot.readRange(
            root,
            locatorB,
            [2, 2],
            CANONICAL_ALIAS_LIMITS_V2,
            signal,
          );
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
