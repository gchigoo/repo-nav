import {
  DEFAULT_MAX_FILE_BYTES,
  RepositoryAccessError,
  type EvidenceLocation,
  type NormalizedSearchTerm,
  type RepositoryReader,
  type RepositoryReadLimits,
} from '../../contracts/index.js';
import { VerifiedTextFileSourceV2 } from '../../repository/verified-text-file-source-v2.js';
import type { CanonicalFileKeyV2 } from './canonical-file-identity-v2.js';
import { RequestFileCacheV2 } from './request-file-cache-v2.js';
import {
  runFinalSnapshotCheckV2,
  type TrustedFinalSnapshotPoolsV2,
} from './final-snapshot-check-v2.js';
import type {
  PreFinalEligibleDiscoveryPoolV2,
  PreRankingEvidencePoolV2,
} from './pre-ranking-evidence-pool-v2.js';
import type { RepositoryGitStateV2 } from './repository-git-state-probe-v2.js';

export interface RequestRepositorySnapshotOptionsV2 {
  readonly repositoryRoot: string;
  readonly decodeMaxFileBytes?: number;
  readonly source?: VerifiedTextFileSourceV2;
}

/**
 * 请求级 RepositoryReader：实现单次 decode、alias 绑定与 dispose 清理。
 */
export interface RequestRepositorySnapshotV2 extends RepositoryReader {
  canonicalFileKeyFor(locator: string): CanonicalFileKeyV2 | undefined;
  getDecodeInvocationCount(): number;
  finalCheck(
    signal: AbortSignal,
    evidencePool: PreRankingEvidencePoolV2,
    eligibleDiscoveryPool: PreFinalEligibleDiscoveryPoolV2,
    gitState: RepositoryGitStateV2,
  ): Promise<TrustedFinalSnapshotPoolsV2>;
  dispose(): void;
}

class RequestRepositorySnapshotImplV2 implements RequestRepositorySnapshotV2 {
  private readonly repositoryRoot: string;
  private readonly source: VerifiedTextFileSourceV2;
  private readonly cache: RequestFileCacheV2;

  public constructor(options: RequestRepositorySnapshotOptionsV2) {
    this.repositoryRoot = options.repositoryRoot;
    this.source = options.source ?? new VerifiedTextFileSourceV2();
    this.cache = new RequestFileCacheV2({
      repositoryRoot: options.repositoryRoot,
      decodeMaxFileBytes: options.decodeMaxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
      source: this.source,
    });
  }

  public async resolveRoot(
    repoPath: string,
    signal: AbortSignal,
  ): Promise<string> {
    return this.source.resolveRoot(repoPath, signal);
  }

  public canonicalFileKeyFor(
    locator: string,
  ): CanonicalFileKeyV2 | undefined {
    return this.cache.canonicalFileKeyFor(locator);
  }

  public getDecodeInvocationCount(): number {
    return this.cache.getDecodeInvocationCount();
  }

  public async finalCheck(
    signal: AbortSignal,
    evidencePool: PreRankingEvidencePoolV2,
    eligibleDiscoveryPool: PreFinalEligibleDiscoveryPoolV2,
    gitState: RepositoryGitStateV2,
  ): Promise<TrustedFinalSnapshotPoolsV2> {
    return runFinalSnapshotCheckV2({
      repositoryRoot: this.repositoryRoot,
      loadedFiles: this.cache.listLoadedCanonicalFiles(),
      evidencePool,
      eligiblePool: eligibleDiscoveryPool,
      gitState,
      signal,
    });
  }

  public dispose(): void {
    this.cache.dispose();
  }

  public async readRange(
    repositoryRoot: string,
    relativeFile: string,
    lines: readonly [number, number],
    limits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<EvidenceLocation> {
    this.assertSameRoot(repositoryRoot);
    const { snapshot, locator } = await this.cache.getDecodedLines(
      relativeFile,
      limits,
      signal,
    );
    const [start, end] = lines;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 1 ||
      end < start ||
      end > snapshot.lines.length
    ) {
      throw new RepositoryAccessError('INVALID_LINE_RANGE', locator);
    }
    if (end - start + 1 > limits.maxExcerptLines) {
      throw new RepositoryAccessError('MAX_EXCERPT_BYTES_REACHED', locator);
    }

    const excerpt = snapshot.lines.slice(start - 1, end).join('\n');
    if (excerpt.length === 0) {
      throw new RepositoryAccessError('INVALID_LINE_RANGE', locator);
    }
    this.assertExcerptWithinLimit(excerpt, locator, limits);
    this.assertNotAborted(signal, locator);
    return {
      file: locator,
      lines: [start, end],
      excerpt,
    };
  }

  public async readWindow(
    repositoryRoot: string,
    relativeFile: string,
    focusLines: readonly [number, number],
    limits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<EvidenceLocation> {
    this.assertSameRoot(repositoryRoot);
    const { snapshot, locator } = await this.cache.getDecodedLines(
      relativeFile,
      limits,
      signal,
    );
    const [focusStart, focusEnd] = focusLines;
    const focusLength = focusEnd - focusStart + 1;
    if (
      !Number.isSafeInteger(focusStart) ||
      !Number.isSafeInteger(focusEnd) ||
      focusStart < 1 ||
      focusEnd < focusStart ||
      focusEnd > snapshot.lines.length ||
      focusLength > limits.maxExcerptLines
    ) {
      throw new RepositoryAccessError('INVALID_LINE_RANGE', locator);
    }

    const available = limits.maxExcerptLines - focusLength;
    let start = Math.max(1, focusStart - Math.ceil(available / 2));
    let end = Math.min(snapshot.lines.length, start + limits.maxExcerptLines - 1);
    start = Math.max(1, end - limits.maxExcerptLines + 1);

    let excerpt = snapshot.lines.slice(start - 1, end).join('\n');
    while (
      Buffer.byteLength(excerpt, 'utf8') > limits.maxExcerptBytes &&
      (start < focusStart || end > focusEnd)
    ) {
      const before = focusStart - start;
      const after = end - focusEnd;
      if (before >= after && start < focusStart) {
        start += 1;
      } else if (end > focusEnd) {
        end -= 1;
      }
      excerpt = snapshot.lines.slice(start - 1, end).join('\n');
    }

    if (excerpt.length === 0) {
      throw new RepositoryAccessError('INVALID_LINE_RANGE', locator);
    }
    this.assertExcerptWithinLimit(excerpt, locator, limits);
    this.assertNotAborted(signal, locator);
    return {
      file: locator,
      lines: [start, end],
      excerpt,
    };
  }

  public async findMatches(
    repositoryRoot: string,
    relativeFile: string,
    terms: readonly NormalizedSearchTerm[],
    symbol: string | undefined,
    maxMatches: number,
    limits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<readonly EvidenceLocation[]> {
    this.assertSameRoot(repositoryRoot);
    if (!Number.isSafeInteger(maxMatches) || maxMatches < 1) {
      throw new RepositoryAccessError('INVALID_LINE_RANGE', relativeFile);
    }
    const { snapshot, locator } = await this.cache.getDecodedLines(
      relativeFile,
      limits,
      signal,
    );
    const matches: EvidenceLocation[] = [];

    for (let index = 0; index < snapshot.lines.length; index += 1) {
      this.assertNotAborted(signal, locator);
      const excerpt = snapshot.lines[index] ?? '';
      const symbolMatches = symbol !== undefined && excerpt.includes(symbol);
      const termMatches = terms.some((term) =>
        term.caseSensitive
          ? excerpt.includes(term.value)
          : excerpt
              .toLocaleLowerCase('und')
              .includes(term.value.toLocaleLowerCase('und')),
      );
      if (!symbolMatches && !termMatches) {
        continue;
      }

      this.assertExcerptWithinLimit(excerpt, locator, limits);
      matches.push({
        file: locator,
        symbol,
        lines: [index + 1, index + 1],
        excerpt,
      });
      if (matches.length >= maxMatches) {
        break;
      }
    }

    this.assertNotAborted(signal, locator);
    return Object.freeze(matches);
  }

  private assertSameRoot(repositoryRoot: string): void {
    if (repositoryRoot !== this.repositoryRoot) {
      throw new RepositoryAccessError('INVALID_REPOSITORY');
    }
  }

  private assertExcerptWithinLimit(
    excerpt: string,
    relativeFile: string,
    limits: RepositoryReadLimits,
  ): void {
    if (Buffer.byteLength(excerpt, 'utf8') > limits.maxExcerptBytes) {
      throw new RepositoryAccessError(
        'MAX_EXCERPT_BYTES_REACHED',
        relativeFile,
      );
    }
  }

  private assertNotAborted(
    signal: AbortSignal,
    relativeFile?: string,
  ): void {
    if (signal.aborted) {
      throw new RepositoryAccessError('ABORTED', relativeFile);
    }
  }
}

/**
 * 在 root resolve 成功后创建请求级 snapshot；Nest singleton 不得持有其 maps。
 */
export function createRequestRepositorySnapshotV2(
  options: RequestRepositorySnapshotOptionsV2,
): RequestRepositorySnapshotV2 {
  return new RequestRepositorySnapshotImplV2(options);
}
