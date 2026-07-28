/**
 * F2 private budget facts（供 F6 聚合，非 public coverage）。
 */
export interface EvidenceBudgetFactsV2 {
  readonly maxFilesReached: boolean;
  readonly maxConfirmedReached: boolean;
  readonly maxCandidatesReached: boolean;
  readonly preRankingPoolTruncated: boolean;
  readonly safeSelectorCollision: boolean;
  readonly safeOrderingCollision: boolean;
}
