import {
  LOCATE_STATUSES_V2,
  deriveLocateStatusV2 as deriveFromCoverage,
  type CoverageReportV2,
  type FinalizedUnsafeCoverageReportV2,
} from '../../contracts/v2/locate-result-v2.js';
import type { LocateAbortSource } from '../abort-source.js';

export const LOCATE_STATUSES_WITH_CANCELLED_V2 = LOCATE_STATUSES_V2;
export type LocateStatusV2 = (typeof LOCATE_STATUSES_V2)[number];

export interface LocateStatusDerivationInputV2 {
  readonly abortSource: LocateAbortSource;
  readonly strategyComplete: boolean;
  readonly degradations: readonly string[];
  readonly unsatisfiedAnchors: readonly Readonly<{
    reason: string;
  }>[];
  readonly backends: readonly Readonly<{
    status: 'used' | 'unavailable' | 'failed';
    completion: 'complete' | 'incomplete';
  }>[];
  readonly retainedEvidenceCount: number;
}

/**
 * F6 唯一 status 派生（facts 形态）。
 */
export function deriveLocateStatusFromFactsV2(
  input: LocateStatusDerivationInputV2,
): LocateStatusV2 {
  if (input.abortSource === 'caller') {
    return 'cancelled';
  }
  if (input.abortSource === 'deadline') {
    return 'timeout';
  }
  if (
    input.retainedEvidenceCount === 0 &&
    !input.strategyComplete &&
    input.backends.length > 0 &&
    input.backends.every(
      (attempt) =>
        attempt.status === 'unavailable' || attempt.status === 'failed',
    )
  ) {
    return 'backend_unavailable';
  }
  if (
    !input.strategyComplete ||
    input.degradations.length > 0 ||
    input.backends.some(
      (attempt) =>
        attempt.status === 'used' && attempt.completion === 'incomplete',
    ) ||
    input.unsatisfiedAnchors.some(
      (anchor) =>
        anchor.reason === 'BUDGET_EXCEEDED' ||
        anchor.reason === 'UNVERIFIED',
    )
  ) {
    return 'partial';
  }
  return input.retainedEvidenceCount > 0 ? 'ok' : 'no_result';
}

export function deriveLocateStatusV2(
  coverage: CoverageReportV2 | FinalizedUnsafeCoverageReportV2,
  retainedEvidenceCount: number,
): LocateStatusV2 {
  return deriveFromCoverage(coverage, retainedEvidenceCount);
}
