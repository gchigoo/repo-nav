/**
 * F8-REAL-SHADOW stage counter probe（非 production export）。
 */

import {
  createAcceptedCompleteRealLocateShadowOrchestratorV2,
  readCompleteRealLocateShadowFailureObservationV2,
  registerAcceptedCompleteRealAggregationBundleV2,
  requireAcceptedCompleteRealLocateShadowV2,
  type AcceptedCompleteRealAggregationBundleV2,
  type AcceptedCompleteRealLocateShadowOrchestratorV2,
} from '../../src/evidence/canonical/accepted-complete-real-locate-shadow-orchestrator-v2.js';
import type {
  CanonicalLocateExecutionV2,
  LocateProjectionExecutionCapabilityV2,
} from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import { registerF2RankingOutcomeForExecutionV2 } from '../../src/evidence/public-output/f2-locate-projection-stages-v2.js';
import type { EvidenceRankingOutcomeV2 } from '../../src/evidence/ranking/evidence-ranking-outcome-v2.js';
import type { SnapshotTrustProofV2 } from '../../src/evidence/request-snapshot/final-snapshot-check-v2.js';
import { requireCanonicalLocateExecutionTokenV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';

export interface CompleteRealLocateShadowStageProbeResultV2 {
  readonly ok: boolean;
  readonly counters: Readonly<
    Record<
      | 'source'
      | 'materialization'
      | 'aggregation'
      | 'owner-finalization'
      | 'composition'
      | 'schema'
      | 'serialization-budget',
      0 | 1
    >
  >;
  readonly terminalStage?: string;
  readonly code?: string;
}

/**
 * 跑 accepted orchestrator 并观察七 stage counters。
 */
export function probeCompleteRealLocateShadowStagesV2(input: {
  readonly orchestrator?: AcceptedCompleteRealLocateShadowOrchestratorV2;
  readonly canonical: Extract<CanonicalLocateExecutionV2, { ok: true }>;
  readonly projectionCapability: LocateProjectionExecutionCapabilityV2;
  readonly rankingOutcome: EvidenceRankingOutcomeV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly aggregationBundle: AcceptedCompleteRealAggregationBundleV2;
}): CompleteRealLocateShadowStageProbeResultV2 {
  const execution = requireCanonicalLocateExecutionTokenV2(
    input.canonical,
    input.projectionCapability,
  );
  registerF2RankingOutcomeForExecutionV2(
    execution,
    input.rankingOutcome,
    input.snapshotProof,
  );
  registerAcceptedCompleteRealAggregationBundleV2(
    execution,
    input.aggregationBundle,
  );
  const orchestrator =
    input.orchestrator ?? createAcceptedCompleteRealLocateShadowOrchestratorV2();
  const attempt = orchestrator.projectAcceptedExecution(
    input.canonical,
    input.projectionCapability,
  );
  if (attempt.ok) {
    requireAcceptedCompleteRealLocateShadowV2(
      attempt.accepted,
      input.canonical,
      input.projectionCapability,
    );
    return Object.freeze({
      ok: true,
      counters: Object.freeze({
        source: 1,
        materialization: 1,
        aggregation: 1,
        'owner-finalization': 1,
        composition: 1,
        schema: 1,
        'serialization-budget': 1,
      }),
    });
  }
  const failure = readCompleteRealLocateShadowFailureObservationV2(
    attempt.failure,
  );
  return Object.freeze({
    ok: false,
    counters: failure.counters,
    terminalStage: failure.terminalStage,
    code: failure.code,
  });
}
