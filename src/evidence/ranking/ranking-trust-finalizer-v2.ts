import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { SnapshotTrustProofV2 } from '../request-snapshot/final-snapshot-check-v2.js';
import {
  requireEvidenceRankingOutcomeV2,
  requireEvidenceRankingSourceViewV2,
  type EvidenceRankingOutcomeV2,
} from './evidence-ranking-outcome-v2.js';

/**
 * Finalizer 侧 ranking trust gate：clone/cross-execution 拒绝。
 */
export function assertRankingTrustFinalizerV2(input: {
  readonly outcome: EvidenceRankingOutcomeV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly execution: LocateExecutionTokenV2;
}): void {
  const view = requireEvidenceRankingOutcomeV2(
    input.outcome,
    input.snapshotProof,
    input.execution,
  );
  const source = requireEvidenceRankingSourceViewV2(
    input.outcome,
    input.snapshotProof,
    input.execution,
  );
  const confirmedDrafts = view.fragment.value.confirmed;
  const candidateDrafts = view.fragment.value.candidates;
  if (confirmedDrafts.length !== source.rankedConfirmed.length) {
    throw new TypeError('ranking confirmed length mismatch');
  }
  if (candidateDrafts.length !== source.rankedCandidates.length) {
    throw new TypeError('ranking candidate length mismatch');
  }
  const seen = new Set<object>();
  for (const item of [...source.rankedConfirmed, ...source.rankedCandidates]) {
    if (seen.has(item.recordRef)) {
      throw new TypeError('ranking retained record refs must be unique');
    }
    seen.add(item.recordRef);
  }
}
