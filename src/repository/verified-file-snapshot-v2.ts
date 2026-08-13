import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import {
  access,
  open,
  realpath,
  stat,
  type FileHandle,
} from 'node:fs/promises';
import { isAbsolute, posix, relative, resolve, sep } from 'node:path';

import { RepositoryAccessError } from '../contracts/index.js';

export type CanonicalFileKeyV2 = string & {
  readonly __brand: 'CanonicalFileKeyV2';
};

export interface FileIdentityV2 {
  readonly dev: bigint;
  readonly ino: bigint;
  readonly size: bigint;
  readonly mtimeNs: bigint;
  readonly ctimeNs: bigint;
}

export interface VerifiedFileSnapshotV2 {
  readonly locator: string;
  readonly canonicalFileKey: CanonicalFileKeyV2;
  readonly identity: FileIdentityV2;
  readonly contentSha256: string;
}

export interface VerifiedFileReadV2 {
  readonly snapshot: VerifiedFileSnapshotV2;
  readonly bytes: Uint8Array;
}

export interface ReadVerifiedFileInputV2 {
  readonly repositoryRoot: string;
  readonly locator: string;
  readonly maxFileBytes: number;
  readonly signal: AbortSignal;
}

const READ_CHUNK_BYTES = 64 * 1024;

let afterInitialTargetResolveForTestV2: (() => void) | undefined;

export function setAfterInitialTargetResolveForTestV2(
  hook: (() => void) | undefined,
): void {
  afterInitialTargetResolveForTestV2 = hook;
}

export function identityFromStatV2(statValue: {
  readonly dev: bigint;
  readonly ino: bigint;
  readonly size: bigint;
  readonly mtimeNs: bigint;
  readonly ctimeNs: bigint;
}): FileIdentityV2 {
  return Object.freeze({
    dev: statValue.dev,
    ino: statValue.ino,
    size: statValue.size,
    mtimeNs: statValue.mtimeNs,
    ctimeNs: statValue.ctimeNs,
  });
}

export function fileIdentitiesEqualV2(
  left: FileIdentityV2,
  right: FileIdentityV2,
): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

export function verifiedFileSnapshotsEqualV2(
  left: VerifiedFileSnapshotV2,
  right: VerifiedFileSnapshotV2,
): boolean {
  return (
    left.canonicalFileKey === right.canonicalFileKey &&
    fileIdentitiesEqualV2(left.identity, right.identity) &&
    left.contentSha256 === right.contentSha256
  );
}

export async function resolveVerifiedRepositoryRootV2(
  repoPath: string,
  signal: AbortSignal,
): Promise<string> {
  assertNotAborted(signal);
  try {
    const absoluteRepoPath = resolve(process.cwd(), repoPath);
    const repositoryRoot = await realpath(absoluteRepoPath);
    assertNotAborted(signal);
    const rootStat = await stat(repositoryRoot);
    assertNotAborted(signal);
    if (!rootStat.isDirectory()) {
      throw new RepositoryAccessError('INVALID_REPOSITORY');
    }
    await access(repositoryRoot, constants.R_OK);
    assertNotAborted(signal);
    return repositoryRoot;
  } catch (error: unknown) {
    if (error instanceof RepositoryAccessError) {
      throw error;
    }
    if (signal.aborted) {
      throw new RepositoryAccessError('ABORTED');
    }
    throw new RepositoryAccessError('INVALID_REPOSITORY');
  }
}

export async function readVerifiedFileV2(
  input: ReadVerifiedFileInputV2,
): Promise<VerifiedFileReadV2> {
  const locator = validateRelativeLocator(input.locator);
  assertMaxFileBytes(input.maxFileBytes, locator);
  assertNotAborted(input.signal, locator);

  let resolvedRoot: string;
  try {
    resolvedRoot = await realpath(input.repositoryRoot);
  } catch {
    throw new RepositoryAccessError('INVALID_REPOSITORY');
  }
  assertNotAborted(input.signal, locator);

  const targetPath = resolve(resolvedRoot, ...locator.split('/'));
  let resolvedTargetBefore: string;
  try {
    resolvedTargetBefore = await realpath(targetPath);
  } catch {
    throw new RepositoryAccessError('FILE_UNREADABLE', locator);
  }
  assertInsideRoot(resolvedRoot, resolvedTargetBefore, locator);
  assertNotAborted(input.signal, locator);

  let handle: FileHandle | undefined;
  let completed: VerifiedFileReadV2 | undefined;
  let normalizedError: RepositoryAccessError | undefined;
  try {
    const targetStatBeforeOpen = await stat(resolvedTargetBefore, {
      bigint: true,
    });
    const targetIdentityBeforeOpen = identityFromStatV2(targetStatBeforeOpen);
    afterInitialTargetResolveForTestV2?.();
    assertNotAborted(input.signal, locator);

    handle = await open(resolvedTargetBefore, 'r');
    assertNotAborted(input.signal, locator);

    const handleStat = await handle.stat({ bigint: true });
    assertNotAborted(input.signal, locator);
    if (!handleStat.isFile()) {
      throw new RepositoryAccessError('NOT_REGULAR_FILE', locator);
    }
    const initialIdentity = identityFromStatV2(handleStat);
    if (!fileIdentitiesEqualV2(targetIdentityBeforeOpen, initialIdentity)) {
      throw new RepositoryAccessError('FILE_UNREADABLE', locator);
    }
    if (handleStat.size > BigInt(input.maxFileBytes)) {
      throw new RepositoryAccessError('MAX_FILE_BYTES_REACHED', locator);
    }

    const resolvedTargetAfter = await realpath(targetPath);
    assertInsideRoot(resolvedRoot, resolvedTargetAfter, locator);
    if (resolvedTargetAfter !== resolvedTargetBefore) {
      throw new RepositoryAccessError('FILE_UNREADABLE', locator);
    }
    await assertPathBindsHandleV2(
      resolvedTargetAfter,
      initialIdentity,
      locator,
    );
    assertNotAborted(input.signal, locator);

    const bytes = await readBoundedV2(
      handle,
      locator,
      input.maxFileBytes,
      input.signal,
    );
    const contentSha256 = createHash('sha256').update(bytes).digest('hex');
    const handleStatAfterRead = await handle.stat({ bigint: true });
    if (!handleStatAfterRead.isFile()) {
      throw new RepositoryAccessError('NOT_REGULAR_FILE', locator);
    }
    const identity = identityFromStatV2(handleStatAfterRead);
    if (!fileIdentitiesEqualV2(initialIdentity, identity)) {
      throw new RepositoryAccessError('FILE_UNREADABLE', locator);
    }
    const resolvedTargetFinal = await realpath(targetPath);
    assertInsideRoot(resolvedRoot, resolvedTargetFinal, locator);
    if (resolvedTargetFinal !== resolvedTargetAfter) {
      throw new RepositoryAccessError('FILE_UNREADABLE', locator);
    }
    await assertPathBindsHandleV2(resolvedTargetFinal, identity, locator);
    assertNotAborted(input.signal, locator);

    const snapshot = Object.freeze({
      locator,
      canonicalFileKey: canonicalKeyFromResolvedTargetV2(
        resolvedRoot,
        resolvedTargetFinal,
      ),
      identity,
      contentSha256,
    });
    completed = Object.freeze({ snapshot, bytes });
  } catch (error: unknown) {
    normalizedError =
      error instanceof RepositoryAccessError
        ? error
        : input.signal.aborted
          ? new RepositoryAccessError('ABORTED', locator)
          : new RepositoryAccessError('FILE_UNREADABLE', locator);
  } finally {
    try {
      await handle?.close();
    } catch {
      normalizedError = new RepositoryAccessError('FILE_UNREADABLE', locator);
    }
  }
  if (normalizedError !== undefined) {
    throw normalizedError;
  }
  if (completed !== undefined) {
    return completed;
  }
  throw new RepositoryAccessError('FILE_UNREADABLE', locator);
}

function validateRelativeLocator(locator: string): string {
  const absoluteInput = posix.isAbsolute(locator) || isAbsolute(locator);
  if (
    locator.length === 0 ||
    locator.includes('\\') ||
    absoluteInput ||
    posix.normalize(locator) !== locator ||
    locator === '..' ||
    locator.startsWith('../')
  ) {
    throw new RepositoryAccessError(
      'INVALID_RELATIVE_PATH',
      absoluteInput || locator.length === 0 ? undefined : locator,
    );
  }
  return locator;
}

function assertMaxFileBytes(maxFileBytes: number, locator: string): void {
  if (!Number.isSafeInteger(maxFileBytes) || maxFileBytes < 1) {
    throw new RepositoryAccessError('INVALID_LINE_RANGE', locator);
  }
}

function assertInsideRoot(
  repositoryRoot: string,
  targetPath: string,
  locator: string,
): void {
  const pathFromRoot = relative(repositoryRoot, targetPath);
  if (
    pathFromRoot === '..' ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot)
  ) {
    throw new RepositoryAccessError('PATH_OUTSIDE_ROOT', locator);
  }
}

async function assertPathBindsHandleV2(
  resolvedTarget: string,
  handleIdentity: FileIdentityV2,
  locator: string,
): Promise<void> {
  const pathStat = await stat(resolvedTarget, { bigint: true });
  if (
    !pathStat.isFile() ||
    pathStat.dev !== handleIdentity.dev ||
    pathStat.ino !== handleIdentity.ino
  ) {
    throw new RepositoryAccessError('FILE_UNREADABLE', locator);
  }
}

function canonicalKeyFromResolvedTargetV2(
  repositoryRoot: string,
  resolvedTarget: string,
): CanonicalFileKeyV2 {
  return relative(repositoryRoot, resolvedTarget)
    .split(sep)
    .join('/') as CanonicalFileKeyV2;
}

async function readBoundedV2(
  handle: FileHandle,
  locator: string,
  maxFileBytes: number,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  while (totalBytes <= maxFileBytes) {
    assertNotAborted(signal, locator);
    const remaining = maxFileBytes + 1 - totalBytes;
    const chunk = Buffer.allocUnsafe(Math.min(READ_CHUNK_BYTES, remaining));
    const { bytesRead } = await handle.read(
      chunk,
      0,
      chunk.byteLength,
      totalBytes,
    );
    assertNotAborted(signal, locator);
    if (bytesRead === 0) {
      break;
    }
    chunks.push(chunk.subarray(0, bytesRead));
    totalBytes += bytesRead;
  }

  if (totalBytes > maxFileBytes) {
    throw new RepositoryAccessError('MAX_FILE_BYTES_REACHED', locator);
  }
  return Buffer.concat(chunks, totalBytes);
}

function assertNotAborted(signal: AbortSignal, locator?: string): void {
  if (signal.aborted) {
    throw new RepositoryAccessError('ABORTED', locator);
  }
}
