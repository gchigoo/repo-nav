import { posix } from 'node:path';

import type {
  BackendHit,
  DiscoveryReasonCode,
  NormalizedLocateAnchor,
} from '../../contracts/index.js';
import type { RipgrepMatchEventV2 } from './ripgrep-protocol-fsm-v2.js';

function normalizeHitPathV2(path: string): string {
  return posix.normalize(path.replaceAll('\\', '/'));
}

export interface MultiViewSeedV2 {
  readonly value: string;
  readonly caseSensitive: boolean;
  readonly reasonCode: DiscoveryReasonCode;
  readonly symbol: boolean;
}

export interface MultiViewAccumulatorConfigV2 {
  readonly expandedMaxHits: number;
  readonly legacyMaxHits: number;
  readonly fileAnchors: readonly NormalizedLocateAnchor[];
}

export interface MultiViewLaneSnapshotV2 {
  readonly hits: readonly BackendHit[];
  readonly complete: boolean;
  readonly frozen: boolean;
  readonly stagingCommitCount: number;
  readonly stagingDiscardCount: number;
}

export interface MultiViewAccumulatorSnapshotV2 {
  readonly expanded: MultiViewLaneSnapshotV2;
  readonly legacy: MultiViewLaneSnapshotV2;
  readonly allLanesFrozen: boolean;
}

function compareHits(left: BackendHit, right: BackendHit): number {
  const compareText = (first: string, second: string): number =>
    first === second ? 0 : first < second ? -1 : 1;
  return (
    compareText(left.file, right.file) ||
    (left.lines?.[0] ?? 0) - (right.lines?.[0] ?? 0) ||
    compareText(left.matchedText ?? '', right.matchedText ?? '') ||
    compareText(left.symbol ?? '', right.symbol ?? '')
  );
}

function matchesSeed(text: string, seed: MultiViewSeedV2): boolean {
  return seed.caseSensitive
    ? text === seed.value
    : text.toLocaleLowerCase('und') === seed.value.toLocaleLowerCase('und');
}

function fileAnchorHits(
  anchors: readonly NormalizedLocateAnchor[],
): BackendHit[] {
  return anchors
    .filter((anchor) => anchor.kind === 'file')
    .map((anchor) => ({
      file: normalizeHitPathV2(anchor.value),
      source: 'ripgrep' as const,
      reasonCodes: ['FILE_ANCHOR_HIT' as const],
    }));
}

function expandMatchHits(
  match: RipgrepMatchEventV2,
  seeds: readonly MultiViewSeedV2[],
): BackendHit[] {
  const matchedSeedFacts = seeds.flatMap((seed) =>
    match.submatches
      .map((sub) => sub.text)
      .filter((text) => matchesSeed(text, seed))
      .map((text) => ({ seed, actualText: text })),
  );
  const reasonCodes = Array.from(
    new Set(matchedSeedFacts.map((fact) => fact.seed.reasonCode)),
  );
  if (reasonCodes.length === 0) {
    return [];
  }
  const symbols = Array.from(
    new Set(
      matchedSeedFacts
        .filter((fact) => fact.seed.symbol)
        .map((fact) => fact.actualText),
    ),
  ).sort((left, right) => (left === right ? 0 : left < right ? -1 : 1));
  const hits: BackendHit[] = [];
  for (const symbol of symbols.length === 0 ? [undefined] : symbols) {
    hits.push({
      file: normalizeHitPathV2(match.path),
      ...(symbol === undefined ? {} : { symbol }),
      lines: [match.lineNumber, match.lineNumber],
      matchedText: match.lineText,
      source: 'ripgrep',
      reasonCodes,
    });
  }
  return hits;
}

/**
 * expanded arrival-prefix + legacy transactional staging lanes。
 */
export class MultiViewAccumulatorV2 {
  private readonly expandedMaxHits: number;
  private readonly legacyMaxHits: number;
  private readonly expandedHits: BackendHit[];
  private readonly legacyCommitted: BackendHit[];
  private legacyStaging: BackendHit[] = [];
  private expandedFrozen = false;
  private legacyFrozen = false;
  private stagingCommitCount = 0;
  private stagingDiscardCount = 0;
  private expandedEarlyStop = false;

  public constructor(config: MultiViewAccumulatorConfigV2) {
    this.expandedMaxHits = config.expandedMaxHits;
    this.legacyMaxHits = config.legacyMaxHits;
    const anchors = fileAnchorHits(config.fileAnchors);
    this.expandedHits = [...anchors];
    this.legacyCommitted = [...anchors];
    if (this.expandedHits.length >= this.expandedMaxHits) {
      this.expandedFrozen = true;
      this.expandedEarlyStop = true;
      this.expandedHits.length = this.expandedMaxHits;
    }
  }

  /** group 开始前：legacy 已满则 slice+sort 并冻结。 */
  public beginGroup(): 'continue' | 'legacy-complete' {
    if (this.legacyFrozen) {
      return 'legacy-complete';
    }
    if (this.legacyCommitted.length >= this.legacyMaxHits) {
      const capped = this.legacyCommitted
        .slice(0, this.legacyMaxHits)
        .sort(compareHits);
      this.legacyCommitted.length = 0;
      this.legacyCommitted.push(...capped);
      this.legacyFrozen = true;
      return 'legacy-complete';
    }
    this.legacyStaging = [];
    return 'continue';
  }

  public observeMatch(
    match: RipgrepMatchEventV2,
    seeds: readonly MultiViewSeedV2[],
  ): 'continue' | 'all-frozen' {
    const logical = expandMatchHits(match, seeds);
    for (const hit of logical) {
      if (!this.expandedFrozen) {
        if (this.expandedHits.length < this.expandedMaxHits) {
          this.expandedHits.push(hit);
        }
        if (this.expandedHits.length >= this.expandedMaxHits) {
          this.expandedFrozen = true;
          this.expandedEarlyStop = true;
        }
      }
      if (!this.legacyFrozen) {
        this.legacyStaging.push(hit);
      }
    }
    return this.allLanesFrozen() ? 'all-frozen' : 'continue';
  }

  /** summary+exit 合法后原子 commit staging。 */
  public commitGroup(): void {
    if (this.legacyFrozen) {
      return;
    }
    this.legacyCommitted.push(...this.legacyStaging);
    this.legacyStaging = [];
    this.stagingCommitCount += 1;
  }

  /** parser/process/summary/exit 失败：discard 当前 staging。 */
  public discardGroup(): void {
    this.legacyStaging = [];
    this.stagingDiscardCount += 1;
  }

  /** 全部 groups 自然完成后的 legacy 收尾：complete 判定再 sort+slice。 */
  public finishNaturalLegacy(): void {
    if (this.legacyFrozen) {
      return;
    }
    const complete = this.legacyCommitted.length <= this.legacyMaxHits;
    const finalized = [...this.legacyCommitted]
      .sort(compareHits)
      .slice(0, this.legacyMaxHits);
    this.legacyCommitted.length = 0;
    this.legacyCommitted.push(...finalized);
    this.legacyFrozen = true;
    void complete;
  }

  public markExpandedComplete(): void {
    if (!this.expandedEarlyStop) {
      this.expandedFrozen = true;
    }
  }

  public snapshot(): MultiViewAccumulatorSnapshotV2 {
    const expandedComplete =
      this.expandedFrozen &&
      !this.expandedEarlyStop &&
      this.expandedHits.length <= this.expandedMaxHits;
    const legacyComplete =
      this.legacyFrozen && this.legacyCommitted.length <= this.legacyMaxHits;
    return Object.freeze({
      expanded: Object.freeze({
        hits: Object.freeze([...this.expandedHits]),
        complete: expandedComplete,
        frozen: this.expandedFrozen,
        stagingCommitCount: 0,
        stagingDiscardCount: 0,
      }),
      legacy: Object.freeze({
        hits: Object.freeze(
          this.legacyFrozen
            ? [...this.legacyCommitted]
            : [...this.legacyCommitted].sort(compareHits),
        ),
        complete: legacyComplete,
        frozen: this.legacyFrozen,
        stagingCommitCount: this.stagingCommitCount,
        stagingDiscardCount: this.stagingDiscardCount,
      }),
      allLanesFrozen: this.allLanesFrozen(),
    });
  }

  public expandedIsEarlyStop(): boolean {
    return this.expandedEarlyStop;
  }

  private allLanesFrozen(): boolean {
    return this.expandedFrozen && this.legacyFrozen;
  }
}

export { compareHits as compareBackendHitsV2 };
