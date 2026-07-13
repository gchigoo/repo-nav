import {
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { RepositoryAccessError } from '../../src/contracts/index.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import { isSelected } from '../../testkit/testing/selection.js';

const defaultLimits = {
  maxFileBytes: 1024,
  maxExcerptBytes: 128,
  maxExcerptLines: 8,
} as const;

function expectCode(
  promise: Promise<unknown>,
  code: RepositoryAccessError['code'],
): Promise<void> {
  return expect(promise).rejects.toMatchObject({ code }) as Promise<void>;
}

async function withRepository(
  files: Readonly<Record<string, string | Uint8Array>>,
  run: (root: string, reader: NodeRepositoryReader) => Promise<void>,
): Promise<void> {
  const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-reader-'));
  try {
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(resolve(repository, name), content);
    }
    const reader = new NodeRepositoryReader();
    const root = await reader.resolveRoot(
      repository,
      new AbortController().signal,
    );
    await run(root, reader);
  } finally {
    rmSync(repository, { recursive: true, force: true });
  }
}

const limitsIdentity = {
  group: 'reader-limits',
  caseId: 'reader-limits',
} as const;

describe.runIf(isSelected(limitsIdentity))('repository reader limits', () => {
  it('reads inclusive normalized lines and locates literal matches', async () => {
    await withRepository(
      { 'source.ts': 'first\r\nconst hcp_id = row.HCP_ID;\r\nlast' },
      async (root, reader) => {
        await expect(
          reader.readRange(
            root,
            'source.ts',
            [2, 3],
            defaultLimits,
            new AbortController().signal,
          ),
        ).resolves.toEqual({
          file: 'source.ts',
          lines: [2, 3],
          excerpt: 'const hcp_id = row.HCP_ID;\nlast',
        });

        await expect(
          reader.findMatches(
            root,
            'source.ts',
            [{ value: 'hcp_id', caseSensitive: false }],
            undefined,
            4,
            defaultLimits,
            new AbortController().signal,
          ),
        ).resolves.toEqual([
          {
            file: 'source.ts',
            symbol: undefined,
            lines: [2, 2],
            excerpt: 'const hcp_id = row.HCP_ID;',
          },
        ]);
      },
    );
  });

  it('reads a centered bounded window and clamps it at repository file edges', async () => {
    await withRepository(
      { 'window.ts': Array.from({ length: 10 }, (_, index) => `line-${index + 1}`).join('\n') },
      async (root, reader) => {
        await expect(
          reader.readWindow(
            root,
            'window.ts',
            [7, 7],
            defaultLimits,
            new AbortController().signal,
          ),
        ).resolves.toEqual({
          file: 'window.ts',
          lines: [3, 10],
          excerpt: Array.from({ length: 8 }, (_, index) => `line-${index + 3}`).join('\n'),
        });
        await expect(
          reader.readWindow(
            root,
            'window.ts',
            [1, 1],
            { ...defaultLimits, maxExcerptLines: 3 },
            new AbortController().signal,
          ),
        ).resolves.toMatchObject({ lines: [1, 3] });
      },
    );
  });

  it('shrinks a window by bytes without dropping the verified focus', async () => {
    await withRepository(
      { 'window.ts': `${'a'.repeat(40)}\nfocus\n${'b'.repeat(40)}` },
      async (root, reader) => {
        await expect(
          reader.readWindow(
            root,
            'window.ts',
            [2, 2],
            {
              ...defaultLimits,
              maxExcerptBytes: 10,
              maxExcerptLines: 3,
            },
            new AbortController().signal,
          ),
        ).resolves.toEqual({
          file: 'window.ts',
          lines: [2, 2],
          excerpt: 'focus',
        });
        await expectCode(
          reader.readWindow(
            root,
            'window.ts',
            [1, 1],
            { ...defaultLimits, maxExcerptBytes: 10 },
            new AbortController().signal,
          ),
          'MAX_EXCERPT_BYTES_REACHED',
        );
      },
    );
  });

  it('distinguishes file, excerpt-byte, and excerpt-line limits', async () => {
    await withRepository(
      { 'large.txt': '0123456789', 'lines.txt': 'one\ntwo\nthree' },
      async (root, reader) => {
        await expectCode(
          reader.readRange(
            root,
            'large.txt',
            [1, 1],
            { ...defaultLimits, maxFileBytes: 4 },
            new AbortController().signal,
          ),
          'MAX_FILE_BYTES_REACHED',
        );
        await expectCode(
          reader.readRange(
            root,
            'large.txt',
            [1, 1],
            { ...defaultLimits, maxExcerptBytes: 4 },
            new AbortController().signal,
          ),
          'MAX_EXCERPT_BYTES_REACHED',
        );
        await expectCode(
          reader.readRange(
            root,
            'lines.txt',
            [1, 2],
            { ...defaultLimits, maxExcerptLines: 1 },
            new AbortController().signal,
          ),
          'MAX_EXCERPT_BYTES_REACHED',
        );
      },
    );
  });
});

const failuresIdentity = {
  group: 'reader-failures',
  caseId: 'reader-failures',
} as const;

describe.runIf(isSelected(failuresIdentity))('repository reader failures', () => {
  it('distinguishes binary, malformed UTF-8, missing, and invalid ranges', async () => {
    await withRepository(
      {
        'binary.dat': Uint8Array.from([65, 0, 66]),
        'malformed.txt': Uint8Array.from([0xc3, 0x28]),
        'lines.txt': 'one\ntwo',
      },
      async (root, reader) => {
        for (const file of ['binary.dat', 'malformed.txt']) {
          await expectCode(
            reader.readRange(
              root,
              file,
              [1, 1],
              defaultLimits,
              new AbortController().signal,
            ),
            'BINARY_FILE',
          );
        }
        await expectCode(
          reader.readRange(
            root,
            'missing.txt',
            [1, 1],
            defaultLimits,
            new AbortController().signal,
          ),
          'FILE_UNREADABLE',
        );
        for (const lines of [
          [0, 1],
          [2, 1],
          [1, 3],
        ] as const) {
          await expectCode(
            reader.readRange(
              root,
              'lines.txt',
              lines,
              defaultLimits,
              new AbortController().signal,
            ),
            'INVALID_LINE_RANGE',
          );
        }
      },
    );
  });

  it('returns ABORTED and closes handles before settling', async () => {
    await withRepository({ 'source.txt': 'content' }, async (root, reader) => {
      const controller = new AbortController();
      controller.abort();
      await expectCode(
        reader.readRange(
          root,
          'source.txt',
          [1, 1],
          defaultLimits,
          controller.signal,
        ),
        'ABORTED',
      );
      await expectCode(
        reader.readWindow(
          root,
          'source.txt',
          [1, 1],
          defaultLimits,
          controller.signal,
        ),
        'ABORTED',
      );

      await reader.readRange(
        root,
        'source.txt',
        [1, 1],
        defaultLimits,
        new AbortController().signal,
      );
      renameSync(resolve(root, 'source.txt'), resolve(root, 'renamed.txt'));
      expect(resolve(root, 'renamed.txt')).toContain('renamed.txt');
    });
  });
});
