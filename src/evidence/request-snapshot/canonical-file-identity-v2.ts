import { open, realpath, type FileHandle } from 'node:fs/promises';
import { isAbsolute, posix, relative, resolve, sep } from 'node:path';

import { RepositoryAccessError } from '../../contracts/index.js';

/**
 * F3 private：root 内真实 target 的 canonical 相对路径键。
 */
export type CanonicalFileKeyV2 = string & {
  readonly __brand: 'CanonicalFileKeyV2';
};

/**
 * Node bigint 归一后的文件 identity；不得进入 fact/log/Golden。
 */
export interface FileIdentityV2 {
  readonly dev: bigint;
  readonly ino: bigint;
  readonly size: bigint;
  readonly mtimeMs: bigint;
}

export interface ResolvedCanonicalTargetV2 {
  readonly locator: string;
  readonly canonicalFileKey: CanonicalFileKeyV2;
  readonly resolvedRoot: string;
  readonly resolvedTarget: string;
  readonly identity: FileIdentityV2;
}

function validateRelativeLocator(relativeFile: string): string {
  const absoluteInput =
    posix.isAbsolute(relativeFile) || isAbsolute(relativeFile);
  if (
    relativeFile.length === 0 ||
    relativeFile.includes('\\') ||
    absoluteInput ||
    posix.normalize(relativeFile) !== relativeFile ||
    relativeFile === '..' ||
    relativeFile.startsWith('../')
  ) {
    throw new RepositoryAccessError(
      'INVALID_RELATIVE_PATH',
      absoluteInput || relativeFile.length === 0 ? undefined : relativeFile,
    );
  }
  return relativeFile;
}

function assertInsideRoot(
  repositoryRoot: string,
  targetPath: string,
  relativeFile: string,
): void {
  const pathFromRoot = relative(repositoryRoot, targetPath);
  if (
    pathFromRoot === '..' ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot)
  ) {
    throw new RepositoryAccessError('PATH_OUTSIDE_ROOT', relativeFile);
  }
}

function toPosixRelative(
  repositoryRoot: string,
  resolvedTarget: string,
): CanonicalFileKeyV2 {
  const pathFromRoot = relative(repositoryRoot, resolvedTarget);
  const posixPath = pathFromRoot.split(sep).join('/');
  return posixPath as CanonicalFileKeyV2;
}

function identityFromStat(stat: {
  readonly dev: number | bigint;
  readonly ino: number | bigint;
  readonly size: number | bigint;
  readonly mtimeMs: number;
}): FileIdentityV2 {
  return Object.freeze({
    dev: BigInt(stat.dev),
    ino: BigInt(stat.ino),
    size: BigInt(stat.size),
    mtimeMs: BigInt(Math.trunc(stat.mtimeMs)),
  });
}

/**
 * 比较两次 identity 是否完全一致。
 */
export function fileIdentitiesEqualV2(
  left: FileIdentityV2,
  right: FileIdentityV2,
): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs
  );
}

/**
 * 解析 locator 到 root 内 canonical target，并做 pre/post open identity hardening。
 */
export async function resolveCanonicalTargetV2(
  repositoryRoot: string,
  relativeFile: string,
  signal: AbortSignal,
): Promise<ResolvedCanonicalTargetV2> {
  const locator = validateRelativeLocator(relativeFile);
  if (signal.aborted) {
    throw new RepositoryAccessError('ABORTED', locator);
  }

  let resolvedRoot: string;
  try {
    resolvedRoot = await realpath(repositoryRoot);
  } catch {
    throw new RepositoryAccessError('INVALID_REPOSITORY');
  }
  if (signal.aborted) {
    throw new RepositoryAccessError('ABORTED', locator);
  }

  const targetPath = resolve(resolvedRoot, ...locator.split('/'));
  let resolvedTargetBefore: string;
  try {
    resolvedTargetBefore = await realpath(targetPath);
  } catch {
    throw new RepositoryAccessError('FILE_UNREADABLE', locator);
  }
  assertInsideRoot(resolvedRoot, resolvedTargetBefore, locator);
  if (signal.aborted) {
    throw new RepositoryAccessError('ABORTED', locator);
  }

  let handle: FileHandle | undefined;
  try {
    handle = await open(resolvedTargetBefore, 'r');
    if (signal.aborted) {
      throw new RepositoryAccessError('ABORTED', locator);
    }
    const handleStat = await handle.stat();
    if (signal.aborted) {
      throw new RepositoryAccessError('ABORTED', locator);
    }
    if (!handleStat.isFile()) {
      throw new RepositoryAccessError('NOT_REGULAR_FILE', locator);
    }

    const resolvedTargetAfter = await realpath(targetPath);
    assertInsideRoot(resolvedRoot, resolvedTargetAfter, locator);
    if (resolvedTargetAfter !== resolvedTargetBefore) {
      throw new RepositoryAccessError('FILE_UNREADABLE', locator);
    }
    if (signal.aborted) {
      throw new RepositoryAccessError('ABORTED', locator);
    }

    const identity = identityFromStat(handleStat);
    const canonicalFileKey = toPosixRelative(resolvedRoot, resolvedTargetAfter);
    return Object.freeze({
      locator,
      canonicalFileKey,
      resolvedRoot,
      resolvedTarget: resolvedTargetAfter,
      identity,
    });
  } catch (error: unknown) {
    if (error instanceof RepositoryAccessError) {
      throw error;
    }
    if (signal.aborted) {
      throw new RepositoryAccessError('ABORTED', locator);
    }
    throw new RepositoryAccessError('FILE_UNREADABLE', locator);
  } finally {
    await handle?.close();
  }
}
