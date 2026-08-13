import {
  RepositoryAccessError,
  type RepositoryReadLimits,
} from '../../contracts/index.js';
import {
  verifiedFileSnapshotsEqualV2,
  type CanonicalFileKeyV2,
  type FileIdentityV2,
  type VerifiedFileReadV2,
  type VerifiedFileSnapshotV2,
} from '../../repository/verified-file-snapshot-v2.js';
import {
  VerifiedTextFileSourceV2,
  type VerifiedTextFileV2,
} from '../../repository/verified-text-file-source-v2.js';

export type { CanonicalFileKeyV2, FileIdentityV2 };

export interface DecodedFileSnapshotV2 extends VerifiedFileSnapshotV2 {
  readonly lines: readonly string[];
}

export interface RequestFileCacheOptionsV2 {
  readonly repositoryRoot: string;
  readonly decodeMaxFileBytes: number;
  readonly source?: VerifiedTextFileSourceV2;
}

interface CachedDecodeEntryV2 {
  readonly snapshot: DecodedFileSnapshotV2;
}

interface DecodedLinesResultV2 {
  readonly snapshot: DecodedFileSnapshotV2;
  readonly locator: string;
}

interface PendingUnknownReadV2 {
  readonly locator: string;
  readonly callLimits: RepositoryReadLimits;
  readonly signal: AbortSignal;
  readonly verified: Promise<VerifiedFileReadV2>;
  readonly resolve: (result: DecodedLinesResultV2) => void;
  readonly reject: (error: unknown) => void;
}

interface PendingUnknownReadBatchV2 {
  readonly entries: PendingUnknownReadV2[];
}

interface VerifiedUnknownReadV2 {
  readonly pending: PendingUnknownReadV2;
  readonly verified: VerifiedFileReadV2;
}

export class RequestFileCacheV2 {
  private readonly repositoryRoot: string;
  private readonly decodeMaxFileBytes: number;
  private readonly source: VerifiedTextFileSourceV2;
  private readonly decodeByCanonical = new Map<string, CachedDecodeEntryV2>();
  private readonly aliasToCanonical = new Map<string, CanonicalFileKeyV2>();
  private readonly snapshotByCanonical = new Map<
    string,
    VerifiedFileSnapshotV2
  >();
  private readonly aliasesByCanonical = new Map<string, Set<string>>();
  private readonly invalidatedCanonicalKeys = new Set<CanonicalFileKeyV2>();
  private readonly invalidatedAliasToCanonical = new Map<
    string,
    CanonicalFileKeyV2
  >();
  private readonly canonicalSettlement = new Map<string, Promise<void>>();
  private unknownReadBatch: PendingUnknownReadBatchV2 | undefined;
  private disposed = false;
  private sealedForFinalCheck = false;
  private pendingReadCount = 0;
  private lifecycleRevision = 0;
  private decodeInvocations = 0;

  public constructor(options: RequestFileCacheOptionsV2) {
    this.repositoryRoot = options.repositoryRoot;
    this.decodeMaxFileBytes = options.decodeMaxFileBytes;
    this.source = options.source ?? new VerifiedTextFileSourceV2();
  }

  public getDecodeInvocationCount(): number {
    return this.decodeInvocations;
  }

  public canonicalFileKeyFor(locator: string): CanonicalFileKeyV2 | undefined {
    return (
      this.aliasToCanonical.get(locator) ??
      this.invalidatedAliasToCanonical.get(locator)
    );
  }

  public async getDecodedLines(
    locator: string,
    callLimits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<DecodedLinesResultV2> {
    this.assertReadableLifecycle();
    this.source.assertValidReadLimits(callLimits, locator);
    if (signal.aborted) {
      throw new RepositoryAccessError('ABORTED', locator);
    }

    const knownCanonical = this.canonicalFileKeyFor(locator);
    if (knownCanonical === undefined) {
      return this.enqueueUnknownRead(locator, callLimits, signal);
    }
    if (this.invalidatedCanonicalKeys.has(knownCanonical)) {
      throw new RepositoryAccessError('FILE_UNREADABLE', locator);
    }

    const knownEntry = this.decodeByCanonical.get(knownCanonical);
    if (knownEntry === undefined) {
      this.invalidateCanonical(knownCanonical);
      throw new RepositoryAccessError('FILE_UNREADABLE', locator);
    }

    this.assertWithinCallLimit(knownEntry.snapshot, callLimits, locator);
    this.assertReadableAfterWait(signal, locator);
    if (
      this.decodeByCanonical.get(knownCanonical) !== knownEntry ||
      this.snapshotByCanonical.get(knownCanonical) === undefined
    ) {
      throw new RepositoryAccessError('FILE_UNREADABLE', locator);
    }
    return this.resultForLocator(knownEntry.snapshot, locator);
  }

  public listLoadedCanonicalFiles(): readonly {
    readonly canonicalFileKey: CanonicalFileKeyV2;
    readonly snapshot: VerifiedFileSnapshotV2;
    readonly aliases: readonly string[];
  }[] {
    const loaded = [];
    for (const [canonicalFileKey, snapshot] of this.snapshotByCanonical) {
      const aliases = this.aliasesByCanonical.get(canonicalFileKey);
      loaded.push(
        Object.freeze({
          canonicalFileKey: canonicalFileKey as CanonicalFileKeyV2,
          snapshot,
          aliases: Object.freeze([...(aliases ?? [])]),
        }),
      );
    }
    return Object.freeze(loaded);
  }

  public listInvalidatedCanonicalKeys(): ReadonlySet<CanonicalFileKeyV2> {
    return new Set(this.invalidatedCanonicalKeys);
  }

  public getLifecycleRevision(): number {
    return this.lifecycleRevision;
  }

  public sealForFinalCheck(): void {
    this.assertNotDisposed();
    if (this.sealedForFinalCheck || this.pendingReadCount > 0) {
      throw new RepositoryAccessError('FILE_UNREADABLE');
    }
    this.sealedForFinalCheck = true;
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.lifecycleRevision += 1;
    this.decodeByCanonical.clear();
    this.aliasToCanonical.clear();
    this.snapshotByCanonical.clear();
    this.aliasesByCanonical.clear();
    this.invalidatedCanonicalKeys.clear();
    this.invalidatedAliasToCanonical.clear();
    this.canonicalSettlement.clear();
  }

  public isDisposed(): boolean {
    return this.disposed;
  }

  private enqueueUnknownRead(
    locator: string,
    callLimits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<DecodedLinesResultV2> {
    this.pendingReadCount += 1;
    return new Promise<DecodedLinesResultV2>((resolveResult, rejectResult) => {
      const resolveTracked = (result: DecodedLinesResultV2): void => {
        this.pendingReadCount -= 1;
        resolveResult(result);
      };
      const rejectTracked = (error: unknown): void => {
        this.pendingReadCount -= 1;
        rejectResult(error);
      };
      let batch = this.unknownReadBatch;
      if (batch === undefined) {
        batch = { entries: [] };
        this.unknownReadBatch = batch;
        const scheduledBatch = batch;
        setImmediate(() => {
          if (this.unknownReadBatch === scheduledBatch) {
            this.unknownReadBatch = undefined;
          }
          void this.settleUnknownReadBatch(scheduledBatch).catch(
            () => undefined,
          );
        });
      }
      const verified = this.source.readVerifiedFile(
        this.repositoryRoot,
        locator,
        Math.min(this.decodeMaxFileBytes, callLimits.maxFileBytes),
        signal,
      );
      void verified.catch(() => undefined);
      batch.entries.push(
        Object.freeze({
          locator,
          callLimits,
          signal,
          verified,
          resolve: resolveTracked,
          reject: rejectTracked,
        }),
      );
    });
  }

  private async settleUnknownReadBatch(
    batch: PendingUnknownReadBatchV2,
  ): Promise<void> {
    const settled = await Promise.allSettled(
      batch.entries.map((entry) => entry.verified),
    );
    const byCanonical = new Map<string, VerifiedUnknownReadV2[]>();

    for (let index = 0; index < batch.entries.length; index += 1) {
      const pending = batch.entries[index];
      const result = settled[index];
      if (pending === undefined || result === undefined) {
        continue;
      }
      if (result.status === 'rejected') {
        pending.reject(result.reason);
        continue;
      }
      if (this.disposed) {
        pending.reject(new RepositoryAccessError('FILE_UNREADABLE'));
        continue;
      }
      if (pending.signal.aborted) {
        pending.reject(new RepositoryAccessError('ABORTED', pending.locator));
        continue;
      }
      if (
        result.value.snapshot.identity.size >
        BigInt(pending.callLimits.maxFileBytes)
      ) {
        pending.reject(
          new RepositoryAccessError('MAX_FILE_BYTES_REACHED', pending.locator),
        );
        continue;
      }
      const canonicalFileKey = result.value.snapshot.canonicalFileKey;
      let group = byCanonical.get(canonicalFileKey);
      if (group === undefined) {
        group = [];
        byCanonical.set(canonicalFileKey, group);
      }
      group.push(Object.freeze({ pending, verified: result.value }));
    }

    for (const [canonicalFileKey, group] of byCanonical) {
      this.scheduleCanonicalSettlement(
        canonicalFileKey as CanonicalFileKeyV2,
        group,
      );
    }
  }

  private scheduleCanonicalSettlement(
    canonicalFileKey: CanonicalFileKeyV2,
    group: readonly VerifiedUnknownReadV2[],
  ): void {
    const previous =
      this.canonicalSettlement.get(canonicalFileKey) ?? Promise.resolve();
    const current = previous.then(() =>
      this.settleCanonicalGroup(canonicalFileKey, group),
    );
    this.canonicalSettlement.set(canonicalFileKey, current);
    void current
      .catch(() => undefined)
      .finally(() => {
        if (this.canonicalSettlement.get(canonicalFileKey) === current) {
          this.canonicalSettlement.delete(canonicalFileKey);
        }
      });
  }

  private async settleCanonicalGroup(
    canonicalFileKey: CanonicalFileKeyV2,
    group: readonly VerifiedUnknownReadV2[],
  ): Promise<void> {
    const first = group[0];
    if (first === undefined) {
      return;
    }
    if (
      group.some(
        ({ verified }) =>
          !verifiedFileSnapshotsEqualV2(
            first.verified.snapshot,
            verified.snapshot,
          ),
      )
    ) {
      this.rejectCanonicalGroup(canonicalFileKey, group);
      return;
    }

    try {
      this.assertNotDisposed();
      if (this.invalidatedCanonicalKeys.has(canonicalFileKey)) {
        throw new RepositoryAccessError(
          'FILE_UNREADABLE',
          first.pending.locator,
        );
      }
      let entry = this.decodeByCanonical.get(canonicalFileKey);
      if (entry === undefined) {
        entry = Object.freeze({
          snapshot: this.decodeOnce(first.verified, first.pending.signal),
        });
        this.decodeByCanonical.set(canonicalFileKey, entry);
      } else if (
        !verifiedFileSnapshotsEqualV2(entry.snapshot, first.verified.snapshot)
      ) {
        this.rejectCanonicalGroup(canonicalFileKey, group);
        return;
      }

      const snapshot = entry.snapshot;
      if (
        this.decodeByCanonical.get(canonicalFileKey) !== entry ||
        this.snapshotByCanonical.get(canonicalFileKey) === undefined
      ) {
        throw new RepositoryAccessError(
          'FILE_UNREADABLE',
          first.pending.locator,
        );
      }
      for (const { pending } of group) {
        if (pending.signal.aborted) {
          pending.reject(new RepositoryAccessError('ABORTED', pending.locator));
          continue;
        }
        this.bindAlias(pending.locator, canonicalFileKey);
        pending.resolve(this.resultForLocator(snapshot, pending.locator));
      }
    } catch (error: unknown) {
      this.invalidateCanonical(canonicalFileKey, group);
      for (const { pending } of group) {
        pending.reject(error);
      }
    }
  }

  private decodeOnce(
    verified: VerifiedFileReadV2,
    signal: AbortSignal,
  ): DecodedFileSnapshotV2 {
    const canonicalFileKey = verified.snapshot.canonicalFileKey;
    this.decodeInvocations += 1;
    let textFile: VerifiedTextFileV2;
    try {
      textFile = this.source.decodeVerifiedText(verified, signal);
    } catch (error: unknown) {
      this.invalidateCanonical(canonicalFileKey);
      throw error;
    }
    this.assertNotDisposed();
    const snapshot = Object.freeze({
      ...textFile.snapshot,
      lines: textFile.lines,
    });
    this.snapshotByCanonical.set(canonicalFileKey, textFile.snapshot);
    return snapshot;
  }

  private rejectCanonicalGroup(
    canonicalFileKey: CanonicalFileKeyV2,
    group: readonly VerifiedUnknownReadV2[],
  ): void {
    this.invalidateCanonical(canonicalFileKey, group);
    for (const { pending } of group) {
      pending.reject(
        new RepositoryAccessError('FILE_UNREADABLE', pending.locator),
      );
    }
  }

  private resultForLocator(
    snapshot: DecodedFileSnapshotV2,
    locator: string,
  ): DecodedLinesResultV2 {
    return Object.freeze({
      snapshot:
        snapshot.locator === locator
          ? snapshot
          : Object.freeze({ ...snapshot, locator }),
      locator,
    });
  }

  private bindAlias(
    locator: string,
    canonicalFileKey: CanonicalFileKeyV2,
  ): void {
    this.aliasToCanonical.set(locator, canonicalFileKey);
    let aliases = this.aliasesByCanonical.get(canonicalFileKey);
    if (aliases === undefined) {
      aliases = new Set();
      this.aliasesByCanonical.set(canonicalFileKey, aliases);
    }
    aliases.add(locator);
  }

  private invalidateCanonical(
    canonicalFileKey: CanonicalFileKeyV2,
    group: readonly VerifiedUnknownReadV2[] = [],
  ): void {
    const aliases = new Set(this.aliasesByCanonical.get(canonicalFileKey));
    for (const { pending } of group) {
      aliases.add(pending.locator);
    }
    for (const alias of aliases) {
      this.invalidatedAliasToCanonical.set(alias, canonicalFileKey);
    }
    this.invalidatedCanonicalKeys.add(canonicalFileKey);
    this.lifecycleRevision += 1;
    this.purgeCanonical(canonicalFileKey);
  }

  private purgeCanonical(canonicalFileKey: CanonicalFileKeyV2): void {
    this.decodeByCanonical.delete(canonicalFileKey);
    this.snapshotByCanonical.delete(canonicalFileKey);
    const aliases = this.aliasesByCanonical.get(canonicalFileKey);
    for (const alias of aliases ?? []) {
      this.aliasToCanonical.delete(alias);
    }
    this.aliasesByCanonical.delete(canonicalFileKey);
  }

  private assertWithinCallLimit(
    snapshot: Pick<VerifiedFileSnapshotV2, 'identity'>,
    limits: RepositoryReadLimits,
    locator: string,
  ): void {
    if (snapshot.identity.size > BigInt(limits.maxFileBytes)) {
      throw new RepositoryAccessError('MAX_FILE_BYTES_REACHED', locator);
    }
  }

  private assertReadableAfterWait(signal: AbortSignal, locator: string): void {
    this.assertReadableLifecycle();
    if (signal.aborted) {
      throw new RepositoryAccessError('ABORTED', locator);
    }
  }

  private assertReadableLifecycle(): void {
    this.assertNotDisposed();
    if (this.sealedForFinalCheck) {
      throw new RepositoryAccessError('FILE_UNREADABLE');
    }
  }

  private assertNotDisposed(): void {
    if (this.disposed) {
      throw new RepositoryAccessError('FILE_UNREADABLE');
    }
  }
}
