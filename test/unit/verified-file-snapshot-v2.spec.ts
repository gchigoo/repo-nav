import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  readVerifiedFileV2,
  setAfterInitialTargetResolveForTestV2,
  verifiedFileSnapshotsEqualV2,
} from '../../src/repository/verified-file-snapshot-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'verified-file-snapshot',
});

function createFile(root: string, relativeFile: string, content: string): void {
  const absolute = resolve(root, relativeFile);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, 'utf8');
}

function readFile(
  repositoryRoot: string,
  locator: string,
  maxFileBytes: number,
) {
  return readVerifiedFileV2({
    repositoryRoot,
    locator,
    maxFileBytes,
    signal: new AbortController().signal,
  });
}

describe.runIf(selected)('H4 verified-file-snapshot', () => {
  it('binds alias and real locators to the same canonical identity, digest, and bytes', async () => {
    const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-verified-file-'));
    try {
      const content = 'export const verified = 1;\n';
      createFile(workspace, 'real/target.ts', content);
      symlinkSync(
        resolve(workspace, 'real'),
        resolve(workspace, 'alias'),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      const root = realpathSync(workspace);

      const [realRead, aliasRead] = await Promise.all([
        readFile(root, 'real/target.ts', 4096),
        readFile(root, 'alias/target.ts', 4096),
      ]);

      expect(Buffer.from(realRead.bytes).toString('utf8')).toBe(content);
      expect(aliasRead.bytes).toEqual(realRead.bytes);
      expect(realRead.snapshot.locator).toBe('real/target.ts');
      expect(aliasRead.snapshot.locator).toBe('alias/target.ts');
      expect(aliasRead.snapshot.canonicalFileKey).toBe('real/target.ts');
      expect(
        verifiedFileSnapshotsEqualV2(realRead.snapshot, aliasRead.snapshot),
      ).toBe(true);

      const expectedStat = statSync(resolve(workspace, 'real/target.ts'), {
        bigint: true,
      });
      expect(aliasRead.snapshot.identity).toEqual({
        dev: expectedStat.dev,
        ino: expectedStat.ino,
        size: expectedStat.size,
        mtimeNs: expectedStat.mtimeNs,
        ctimeNs: expectedStat.ctimeNs,
      });
      expect(Object.keys(aliasRead)).toEqual(['snapshot', 'bytes']);
      expect(Object.keys(aliasRead.snapshot)).toEqual([
        'locator',
        'canonicalFileKey',
        'identity',
        'contentSha256',
      ]);
      expect(Object.values(aliasRead.snapshot)).not.toContain(root);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('accepts exactly N bytes and rejects the N+1 sentinel byte', async () => {
    const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-file-limit-'));
    try {
      const relative = 'boundary.txt';
      const root = realpathSync(workspace);
      writeFileSync(resolve(workspace, relative), '12345678', 'utf8');

      await expect(readFile(root, relative, 8)).resolves.toMatchObject({
        bytes: Buffer.from('12345678'),
      });

      writeFileSync(resolve(workspace, relative), '123456789', 'utf8');
      await expect(readFile(root, relative, 8)).rejects.toMatchObject({
        code: 'MAX_FILE_BYTES_REACHED',
        relativeFile: relative,
      });
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('fails closed when an alias target changes after initial resolution', async () => {
    const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-target-race-'));
    try {
      createFile(workspace, 'first/target.ts', 'const first = 1;\n');
      createFile(workspace, 'second/target.ts', 'const second = 2;\n');
      const alias = resolve(workspace, 'alias');
      symlinkSync(
        resolve(workspace, 'first'),
        alias,
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      const root = realpathSync(workspace);

      setAfterInitialTargetResolveForTestV2(() => {
        rmSync(alias, { recursive: true, force: true });
        symlinkSync(
          resolve(workspace, 'second'),
          alias,
          process.platform === 'win32' ? 'junction' : 'dir',
        );
      });
      try {
        await expect(
          readFile(root, 'alias/target.ts', 4096),
        ).rejects.toMatchObject({
          code: 'FILE_UNREADABLE',
          relativeFile: 'alias/target.ts',
        });
      } finally {
        setAfterInitialTargetResolveForTestV2(undefined);
      }
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('fails closed when a regular file is replaced at the same path before open', async () => {
    const workspace = mkdtempSync(
      resolve(tmpdir(), 'repo-nav-direct-target-race-'),
    );
    try {
      const target = resolve(workspace, 'target.ts');
      createFile(workspace, 'target.ts', 'const before = 1;\n');
      const root = realpathSync(workspace);

      setAfterInitialTargetResolveForTestV2(() => {
        renameSync(target, resolve(workspace, 'original.ts'));
        writeFileSync(target, 'const after = 222;\n', 'utf8');
      });
      try {
        await expect(readFile(root, 'target.ts', 4096)).rejects.toMatchObject({
          code: 'FILE_UNREADABLE',
          relativeFile: 'target.ts',
        });
      } finally {
        setAfterInitialTargetResolveForTestV2(undefined);
      }
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('normalizes pre-open filesystem failures to typed unreadable errors', async () => {
    const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-pre-open-'));
    try {
      createFile(workspace, 'target.ts', 'content');
      const root = realpathSync(workspace);
      setAfterInitialTargetResolveForTestV2(() => {
        rmSync(resolve(workspace, 'target.ts'), { force: true });
      });
      let observed: unknown;
      try {
        await readFile(root, 'target.ts', 4096);
      } catch (error: unknown) {
        observed = error;
      } finally {
        setAfterInitialTargetResolveForTestV2(undefined);
      }
      expect(observed).toMatchObject({
        code: 'FILE_UNREADABLE',
        relativeFile: 'target.ts',
      });
      expect(observed).toBeInstanceOf(Error);
      expect((observed as Error).message).not.toContain(workspace);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('rejects containment escapes without exposing an absolute path', async () => {
    const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-file-escape-'));
    try {
      const repository = resolve(workspace, 'repository');
      const outside = resolve(workspace, 'outside');
      mkdirSync(repository);
      mkdirSync(outside);
      writeFileSync(resolve(outside, 'secret.txt'), 'secret', 'utf8');
      symlinkSync(
        outside,
        resolve(repository, 'escape'),
        process.platform === 'win32' ? 'junction' : 'dir',
      );

      let observed: unknown;
      try {
        await readFile(realpathSync(repository), 'escape/secret.txt', 4096);
      } catch (error: unknown) {
        observed = error;
      }
      expect(observed).toMatchObject({
        code: 'PATH_OUTSIDE_ROOT',
        relativeFile: 'escape/secret.txt',
      });
      expect(observed).toBeInstanceOf(Error);
      expect((observed as Error).message).not.toContain(workspace);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('keeps all verified file I/O in the single primitive implementation', () => {
    const repositoryRoot =
      process.env['REPO_NAV_REPOSITORY_ROOT'] ?? process.cwd();
    const canonicalIdentitySource = readFileSync(
      resolve(
        repositoryRoot,
        'src/evidence/request-snapshot/canonical-file-identity-v2.ts',
      ),
      'utf8',
    );
    const cacheSource = readFileSync(
      resolve(
        repositoryRoot,
        'src/evidence/request-snapshot/request-file-cache-v2.ts',
      ),
      'utf8',
    );
    const textSource = readFileSync(
      resolve(repositoryRoot, 'src/repository/verified-text-file-source-v2.ts'),
      'utf8',
    );
    const finalCheckSource = readFileSync(
      resolve(
        repositoryRoot,
        'src/evidence/request-snapshot/final-snapshot-check-v2.ts',
      ),
      'utf8',
    );

    expect(canonicalIdentitySource).not.toContain("from 'node:fs");
    expect(canonicalIdentitySource).not.toContain('resolveCanonicalTargetV2');
    expect(cacheSource).not.toContain('resolveCanonicalTargetV2');
    expect(cacheSource).toContain('.readVerifiedFile(');
    expect(textSource).not.toContain("from 'node:fs/promises'");
    expect(textSource).toContain('readVerifiedFileV2');
    expect(finalCheckSource).not.toContain("from 'node:fs");
    expect(finalCheckSource).toContain('readVerifiedFileV2');
  });
});
