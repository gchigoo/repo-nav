import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MAX_EXCERPT_BYTES,
  DEFAULT_MAX_EXCERPT_LINES,
  DEFAULT_MAX_FILE_BYTES,
  RepositoryAccessError,
} from '../../src/contracts/index.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import { isSelected } from '../../testkit/testing/selection.js';

const identity = {
  group: 'repository-safety',
  caseId: 'windows-reparse-policy',
} as const;
const limits = {
  maxFileBytes: DEFAULT_MAX_FILE_BYTES,
  maxExcerptBytes: DEFAULT_MAX_EXCERPT_BYTES,
  maxExcerptLines: DEFAULT_MAX_EXCERPT_LINES,
} as const;

function expectCode(
  promise: Promise<unknown>,
  code: RepositoryAccessError['code'],
): Promise<void> {
  return expect(promise).rejects.toMatchObject({ code });
}

describe.runIf(isSelected(identity))('repository root and path safety', () => {
  it('rejects missing and non-directory repository roots', async () => {
    const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-reader-root-'));
    try {
      const file = resolve(workspace, 'not-a-directory.txt');
      writeFileSync(file, 'content', 'utf8');
      const reader = new NodeRepositoryReader();
      const signal = new AbortController().signal;

      await expectCode(
        reader.resolveRoot(resolve(workspace, 'missing'), signal),
        'INVALID_REPOSITORY',
      );
      await expectCode(reader.resolveRoot(file, signal), 'INVALID_REPOSITORY');
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('rejects absolute, parent, and non-normalized relative paths', async () => {
    const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-reader-path-'));
    try {
      writeFileSync(resolve(repository, 'inside.txt'), 'inside', 'utf8');
      const reader = new NodeRepositoryReader();
      const root = await reader.resolveRoot(
        repository,
        new AbortController().signal,
      );
      const invalidPaths = [
        resolve(repository, 'inside.txt'),
        '../outside.txt',
        './inside.txt',
        'folder/../inside.txt',
        'folder\\inside.txt',
      ];

      expect(isAbsolute(invalidPaths[0] ?? '')).toBe(true);
      for (const relativeFile of invalidPaths) {
        await expectCode(
          reader.readRange(
            root,
            relativeFile,
            [1, 1],
            limits,
            new AbortController().signal,
          ),
          'INVALID_RELATIVE_PATH',
        );
      }
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it('accepts dot-prefixed names that do not contain a parent segment', async () => {
    const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-reader-dot-'));
    try {
      writeFileSync(resolve(repository, '..notes.md'), 'notes', 'utf8');
      mkdirSync(resolve(repository, '..cache'));
      writeFileSync(
        resolve(repository, '..cache', 'entry.ts'),
        'entry',
        'utf8',
      );
      const reader = new NodeRepositoryReader();
      const root = await reader.resolveRoot(
        repository,
        new AbortController().signal,
      );

      await expect(
        reader.readRange(
          root,
          '..notes.md',
          [1, 1],
          limits,
          new AbortController().signal,
        ),
      ).resolves.toMatchObject({ file: '..notes.md', excerpt: 'notes' });
      await expect(
        reader.readRange(
          root,
          '..cache/entry.ts',
          [1, 1],
          limits,
          new AbortController().signal,
        ),
      ).resolves.toMatchObject({
        file: '..cache/entry.ts',
        excerpt: 'entry',
      });
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it('rejects directory targets and symlink or junction escapes', async () => {
    const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-reader-link-'));
    const repository = resolve(workspace, 'repository');
    const outside = resolve(workspace, 'outside');
    mkdirSync(repository);
    mkdirSync(outside);
    mkdirSync(resolve(repository, 'directory'));
    writeFileSync(resolve(outside, 'secret.txt'), 'outside secret', 'utf8');
    symlinkSync(
      outside,
      resolve(repository, 'escape'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );

    try {
      const reader = new NodeRepositoryReader();
      const root = await reader.resolveRoot(
        repository,
        new AbortController().signal,
      );

      await expectCode(
        reader.readRange(
          root,
          'directory',
          [1, 1],
          limits,
          new AbortController().signal,
        ),
        'NOT_REGULAR_FILE',
      );
      await expectCode(
        reader.readRange(
          root,
          'escape/secret.txt',
          [1, 1],
          limits,
          new AbortController().signal,
        ),
        'PATH_OUTSIDE_ROOT',
      );
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('does not expose absolute paths through typed error messages', () => {
    const error = new RepositoryAccessError(
      'FILE_UNREADABLE',
      'src/missing.ts',
    );
    expect(error.message).not.toMatch(/[A-Za-z]:[\\/]|\/home\//u);
    expect(error.message).not.toContain('src/missing.ts');
    expect(error.relativeFile).toBe('src/missing.ts');
  });
});
