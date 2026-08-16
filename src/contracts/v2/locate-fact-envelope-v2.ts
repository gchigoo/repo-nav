import type {
  CandidateEvidenceV2,
  ConfirmedEvidenceV2,
  CoverageReportV2,
} from './locate-result-v2.js';

type RepositorySnapshotCoverageV2 = CoverageReportV2['snapshot'];
type UnsatisfiedAnchorV2 = CoverageReportV2['unsatisfiedAnchors'][number];
type UnsafeEvidenceDraftV2 =
  Omit<ConfirmedEvidenceV2, 'id'> | Omit<CandidateEvidenceV2, 'id'>;

export interface RankedEvidenceFactsV2 {
  readonly confirmed: readonly UnsafeEvidenceDraftV2[];
  readonly candidates: readonly UnsafeEvidenceDraftV2[];
  readonly unsatisfiedAnchors: readonly UnsatisfiedAnchorV2[];
}

export interface SnapshotFactsV2 {
  readonly coverage: RepositorySnapshotCoverageV2;
  readonly finalStableEvidence: readonly UnsafeEvidenceDraftV2[];
}

declare const LOCATE_PROJECTION_EXECUTION_CAPABILITY_V2: unique symbol;
export type LocateProjectionExecutionCapabilityV2 = Readonly<{
  readonly [LOCATE_PROJECTION_EXECUTION_CAPABILITY_V2]: never;
}>;

declare const LOCATE_EXECUTION_TOKEN_V2: unique symbol;
export type LocateExecutionTokenV2 = Readonly<{
  readonly [LOCATE_EXECUTION_TOKEN_V2]: never;
}>;

declare const CANONICAL_LOCATE_EXECUTION_AUTHORITY_V2: unique symbol;
export type CanonicalLocateExecutionAuthorityV2 = Readonly<{
  readonly [CANONICAL_LOCATE_EXECUTION_AUTHORITY_V2]: never;
}>;
