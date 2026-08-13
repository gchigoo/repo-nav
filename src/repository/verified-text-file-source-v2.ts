import {
  RepositoryAccessError,
  type RepositoryReadLimits,
} from '../contracts/index.js';
import {
  readVerifiedFileV2,
  resolveVerifiedRepositoryRootV2,
  type ReadVerifiedFileInputV2,
  type VerifiedFileReadV2,
  type VerifiedFileSnapshotV2,
} from './verified-file-snapshot-v2.js';

export interface VerifiedTextFileV2 {
  readonly snapshot: VerifiedFileSnapshotV2;
  readonly lines: readonly string[];
}

export interface VerifiedTextFileSourceOptionsV2 {
  readonly readVerifiedFile?: (
    input: ReadVerifiedFileInputV2,
  ) => Promise<VerifiedFileReadV2>;
}

export class VerifiedTextFileSourceV2 {
  private readonly readVerifiedFileImpl: (
    input: ReadVerifiedFileInputV2,
  ) => Promise<VerifiedFileReadV2>;

  public constructor(options: VerifiedTextFileSourceOptionsV2 = {}) {
    this.readVerifiedFileImpl = options.readVerifiedFile ?? readVerifiedFileV2;
  }

  public async resolveRoot(
    repoPath: string,
    signal: AbortSignal,
  ): Promise<string> {
    return resolveVerifiedRepositoryRootV2(repoPath, signal);
  }

  public async readVerifiedFile(
    repositoryRoot: string,
    locator: string,
    maxFileBytes: number,
    signal: AbortSignal,
  ): Promise<VerifiedFileReadV2> {
    return this.readVerifiedFileImpl({
      repositoryRoot,
      locator,
      maxFileBytes,
      signal,
    });
  }

  public assertValidReadLimits(
    limits: RepositoryReadLimits,
    relativeFile: string,
  ): void {
    if (
      !Number.isSafeInteger(limits.maxFileBytes) ||
      !Number.isSafeInteger(limits.maxExcerptBytes) ||
      !Number.isSafeInteger(limits.maxExcerptLines) ||
      limits.maxFileBytes < 1 ||
      limits.maxExcerptBytes < 1 ||
      limits.maxExcerptLines < 1
    ) {
      throw new RepositoryAccessError('INVALID_LINE_RANGE', relativeFile);
    }
  }

  public async readVerifiedText(
    repositoryRoot: string,
    relativeFile: string,
    limits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<VerifiedTextFileV2> {
    this.assertValidReadLimits(limits, relativeFile);
    const verified = await this.readVerifiedFile(
      repositoryRoot,
      relativeFile,
      limits.maxFileBytes,
      signal,
    );
    return this.decodeVerifiedText(verified, signal);
  }

  public decodeVerifiedText(
    verified: VerifiedFileReadV2,
    signal: AbortSignal,
  ): VerifiedTextFileV2 {
    const locator = verified.snapshot.locator;
    if (verified.bytes.includes(0)) {
      throw new RepositoryAccessError('BINARY_FILE', locator);
    }

    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(verified.bytes);
    } catch {
      throw new RepositoryAccessError('BINARY_FILE', locator);
    }
    this.assertNotAborted(signal, locator);
    return Object.freeze({
      snapshot: verified.snapshot,
      lines: Object.freeze(
        text.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n'),
      ),
    });
  }

  private assertNotAborted(signal: AbortSignal, relativeFile?: string): void {
    if (signal.aborted) {
      throw new RepositoryAccessError('ABORTED', relativeFile);
    }
  }
}
