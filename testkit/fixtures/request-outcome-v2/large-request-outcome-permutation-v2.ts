/**
 * F6-LARGE-001 bounded large aggregation permutation markers.
 */

export const LARGE_REQUEST_OUTCOME_PERMUTATION_V2 = Object.freeze({
  caseId: 'large-request-outcome-permutation',
  /** Max anchors in LocateRequest contract. */
  maxAnchors: 16,
  /** Max exclusion ledger rows exercised for canonical summary. */
  maxExclusionLedgerRows: 32,
  /** Hash-stability race repetitions required by design. */
  raceRepetitions: 5,
} as const);
