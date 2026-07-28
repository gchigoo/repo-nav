import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { SnapshotTrustProofV2 } from '../request-snapshot/final-snapshot-check-v2.js';
import {
  requireEvidenceRankingSourceViewV2,
  type EvidenceRankingOutcomeV2,
  type EvidenceRankingRetainedDecisionViewV2,
} from './evidence-ranking-outcome-v2.js';

/**
 * F8 least-privilege accessor：仅两组 StableRecordRef。
 */
export function requireEvidenceRankingRetainedDecisionViewV2(
  outcome: EvidenceRankingOutcomeV2,
  expectedSnapshotProof: SnapshotTrustProofV2,
  expectedExecution: LocateExecutionTokenV2,
): EvidenceRankingRetainedDecisionViewV2 {
  const source = requireEvidenceRankingSourceViewV2(
    outcome,
    expectedSnapshotProof,
    expectedExecution,
  );
  return Object.freeze({
    confirmedRecordRefs: Object.freeze(
      source.rankedConfirmed.map((item) => item.recordRef),
    ),
    candidateRecordRefs: Object.freeze(
      source.rankedCandidates.map((item) => item.recordRef),
    ),
  });
}
