import {
  RepositoryAccessError,
  type RepositoryReadLimits,
} from '../../contracts/index.js';
import {
  VerifiedTextFileSourceV2,
  type VerifiedTextFileV2,
} from '../../repository/verified-text-file-source-v2.js';
import {
  resolveCanonicalTargetV2,
  type CanonicalFileKeyV2,
  type FileIdentityV2,
} from './canonical-file-identity-v2.js';

export type { CanonicalFileKeyV2, FileIdentityV2 };

export interface DecodedFileSnapshotV2 {
  readonly canonicalFileKey: CanonicalFileKeyV2;
  readonly identity: FileIdentityV2;
  readonly lines: readonly string[];
}

export interface RequestFileCacheOptionsV2 {
  readonly repositoryRoot: string;
  readonly decodeMaxFileBytes: number;
  readonly source?: VerifiedTextFileSourceV2;
}

interface CachedDecodeEntryV2 {
  readonly promise: Promise<DecodedFileSnapshotV2>;
}

/**
 * 请求级 canonical promise cache：同 target 只 decode 一次，alias 共享。
 */
export class RequestFileCacheV2 {
  private readonly repositoryRoot: string;
  private readonly decodeMaxFileBytes: number;
  private readonly source: VerifiedTextFileSourceV2;
  private readonly decodeByCanonical = new Map<string, CachedDecodeEntryV2>();
  private readonly aliasToCanonical = new Map<string, CanonicalFileKeyV2>();
  private readonly identityByCanonical = new Map<string, FileIdentityV2>();
  private readonly aliasesByCanonical = new Map<string, Set<string>>();
  private disposed = false;
  private decodeInvocations = 0;

  public constructor(options: RequestFileCacheOptionsV2) {
    this.repositoryRoot = options.repositoryRoot;
    this.decodeMaxFileBytes = options.decodeMaxFileBytes;
    this.source = options.source ?? new VerifiedTextFileSourceV2();
  }

  /**
   * 测试可见：成功发起的 UTF-8 decode 次数。
   */
  public getDecodeInvocationCount(): number {
    return this.decodeInvocations;
  }

  /**
   * 已绑定 locator 的 canonical key；未读过则 undefined。
   */
  public canonicalFileKeyFor(locator: string): CanonicalFileKeyV2 | undefined {
    return this.aliasToCanonical.get(locator);
  }

  /**
   * 取得 locator 对应 decoded snapshot；并发 alias 共享同一 promise。
   */
  public async getDecodedLines(
    locator: string,
    callLimits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<{
    readonly snapshot: DecodedFileSnapshotV2;
    readonly locator: string;
  }> {
    this.assertNotDisposed();
    if (signal.aborted) {
      throw new RepositoryAccessError('ABORTED', locator);
    }

    const resolved = await resolveCanonicalTargetV2(
      this.repositoryRoot,
      locator,
      signal,
    );
    this.assertNotDisposed();
    this.aliasToCanonical.set(resolved.locator, resolved.canonicalFileKey);
    this.identityByCanonical.set(resolved.canonicalFileKey, resolved.identity);
    let aliases = this.aliasesByCanonical.get(resolved.canonicalFileKey);
    if (aliases === undefined) {
      aliases = new Set();
      this.aliasesByCanonical.set(resolved.canonicalFileKey, aliases);
    }
    aliases.add(resolved.locator);

    if (resolved.identity.size > BigInt(callLimits.maxFileBytes)) {
      throw new RepositoryAccessError(
        'MAX_FILE_BYTES_REACHED',
        resolved.locator,
      );
    }

    let entry = this.decodeByCanonical.get(resolved.canonicalFileKey);
    if (entry === undefined) {
      entry = {
        promise: this.decodeOnce(resolved.canonicalFileKey, signal),
      };
      this.decodeByCanonical.set(resolved.canonicalFileKey, entry);
    }

    const snapshot = await entry.promise;
    this.assertNotDisposed();
    if (signal.aborted) {
      throw new RepositoryAccessError('ABORTED', locator);
    }
    return Object.freeze({ snapshot, locator: resolved.locator });
  }

  /**
   * Final check 输入：已成功 decode 的 canonical files 与 aliases。
   */
  public listLoadedCanonicalFiles(): readonly {
    readonly canonicalFileKey: CanonicalFileKeyV2;
    readonly identity: FileIdentityV2;
    readonly aliases: readonly string[];
  }[] {
    const loaded = [];
    for (const [canonicalFileKey, identity] of this.identityByCanonical) {
      if (!this.decodeByCanonical.has(canonicalFileKey)) {
        continue;
      }
      const aliases = this.aliasesByCanonical.get(canonicalFileKey);
      loaded.push(
        Object.freeze({
          canonicalFileKey: canonicalFileKey as CanonicalFileKeyV2,
          identity,
          aliases: Object.freeze([...(aliases ?? [])]),
        }),
      );
    }
    return Object.freeze(loaded);
  }

  public dispose(): void {
    this.disposed = true;
    this.decodeByCanonical.clear();
    this.aliasToCanonical.clear();
    this.identityByCanonical.clear();
    this.aliasesByCanonical.clear();
  }

  public isDisposed(): boolean {
    return this.disposed;
  }

  private async decodeOnce(
    canonicalFileKey: CanonicalFileKeyV2,
    signal: AbortSignal,
  ): Promise<DecodedFileSnapshotV2> {
    this.decodeInvocations += 1;
    const decodeLimits: RepositoryReadLimits = Object.freeze({
      maxFileBytes: this.decodeMaxFileBytes,
      maxExcerptBytes: Number.MAX_SAFE_INTEGER,
      maxExcerptLines: Number.MAX_SAFE_INTEGER,
    });
    let verified: VerifiedTextFileV2;
    try {
      verified = await this.source.readVerifiedText(
        this.repositoryRoot,
        canonicalFileKey,
        decodeLimits,
        signal,
      );
    } catch (error: unknown) {
      this.decodeByCanonical.delete(canonicalFileKey);
      throw error;
    }
    this.assertNotDisposed();
    const identity = this.identityByCanonical.get(canonicalFileKey);
    if (identity === undefined) {
      throw new RepositoryAccessError('FILE_UNREADABLE', canonicalFileKey);
    }
    return Object.freeze({
      canonicalFileKey,
      identity,
      lines: verified.lines,
    });
  }

  private assertNotDisposed(): void {
    if (this.disposed) {
      throw new RepositoryAccessError('FILE_UNREADABLE');
    }
  }
}
