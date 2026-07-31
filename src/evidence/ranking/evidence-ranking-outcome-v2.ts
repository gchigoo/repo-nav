import type {
  LocateExecutionTokenV2,
  RankedEvidenceFactsV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { SnapshotTrustProofV2 } from '../request-snapshot/final-snapshot-check-v2.js';
import type {
  StableRecordRefV2,
  TrustedStableRecordViewV2,
} from '../request-snapshot/pre-ranking-evidence-pool-v2.js';
import { createOpaqueTokenV2 } from '../request-snapshot/opaque-token-v2.js';
import type { EvidenceBudgetFactsV2 } from './evidence-budget-facts-v2.js';
import type { UnsafeEvidenceDraftV2 } from '../request-snapshot/classified-evidence-record-v2.js';

declare const EVIDENCE_RANKING_OUTCOME_V2: unique symbol;
export type EvidenceRankingOutcomeV2 = Readonly<object> & {
  readonly [EVIDENCE_RANKING_OUTCOME_V2]: never;
};

export interface RankedUnsafeEvidenceRefV2 {
  readonly recordRef: StableRecordRefV2;
  readonly draft: UnsafeEvidenceDraftV2;
}

export interface EvidenceRankingOutcomeViewV2 {
  readonly fragment: Readonly<{
    owner: 'ranking';
    value: RankedEvidenceFactsV2;
  }>;
  readonly budgetFacts: EvidenceBudgetFactsV2;
}

export interface EvidenceRankingSourceViewV2 extends EvidenceRankingOutcomeViewV2 {
  readonly rankedConfirmed: readonly RankedUnsafeEvidenceRefV2[];
  readonly rankedCandidates: readonly RankedUnsafeEvidenceRefV2[];
}

export interface EvidenceRankingRetainedDecisionViewV2 {
  readonly confirmedRecordRefs: readonly StableRecordRefV2[];
  readonly candidateRecordRefs: readonly StableRecordRefV2[];
}

interface OutcomeRecordV2 {
  readonly fragment: RankedEvidenceFactsV2;
  readonly budgetFacts: EvidenceBudgetFactsV2;
  readonly confirmed: readonly TrustedStableRecordViewV2[];
  readonly candidates: readonly TrustedStableRecordViewV2[];
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly execution: LocateExecutionTokenV2;
  readonly collisionAnchorKeys: ReadonlySet<string>;
}

const outcomeRecords = new WeakMap<EvidenceRankingOutcomeV2, OutcomeRecordV2>();

function toRefs(
  records: readonly TrustedStableRecordViewV2[],
): readonly RankedUnsafeEvidenceRefV2[] {
  return Object.freeze(
    records.map((record) =>
      Object.freeze({
        recordRef: record.recordRef,
        draft: record.draft,
      }),
    ),
  );
}

/**
 * 签发无 own-property ranking outcome token。
 */
export function issueEvidenceRankingOutcomeV2(input: {
  readonly fragment: RankedEvidenceFactsV2;
  readonly budgetFacts: EvidenceBudgetFactsV2;
  readonly confirmed: readonly TrustedStableRecordViewV2[];
  readonly candidates: readonly TrustedStableRecordViewV2[];
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly execution: LocateExecutionTokenV2;
  readonly collisionAnchorKeys: ReadonlySet<string>;
}): EvidenceRankingOutcomeV2 {
  const outcome = createOpaqueTokenV2<EvidenceRankingOutcomeV2>();
  outcomeRecords.set(
    outcome,
    Object.freeze({
      fragment: input.fragment,
      budgetFacts: input.budgetFacts,
      confirmed: Object.freeze([...input.confirmed]),
      candidates: Object.freeze([...input.candidates]),
      snapshotProof: input.snapshotProof,
      execution: input.execution,
      collisionAnchorKeys: input.collisionAnchorKeys,
    }),
  );
  return outcome;
}

/**
 * F6 窄 accessor：核对 proof/execution 后返回 fragment/budget。
 */
export function requireEvidenceRankingOutcomeV2(
  outcome: EvidenceRankingOutcomeV2,
  expectedSnapshotProof: SnapshotTrustProofV2,
  expectedExecution: LocateExecutionTokenV2,
): EvidenceRankingOutcomeViewV2 {
  const record = outcomeRecords.get(outcome);
  if (
    record === undefined ||
    record.snapshotProof !== expectedSnapshotProof ||
    record.execution !== expectedExecution
  ) {
    throw new TypeError('evidence ranking outcome is not trusted');
  }
  return Object.freeze({
    fragment: Object.freeze({
      owner: 'ranking' as const,
      value: record.fragment,
    }),
    budgetFacts: record.budgetFacts,
  });
}

/**
 * F2 owner-private source view。
 */
export function requireEvidenceRankingSourceViewV2(
  outcome: EvidenceRankingOutcomeV2,
  expectedSnapshotProof: SnapshotTrustProofV2,
  expectedExecution: LocateExecutionTokenV2,
): EvidenceRankingSourceViewV2 {
  const base = requireEvidenceRankingOutcomeV2(
    outcome,
    expectedSnapshotProof,
    expectedExecution,
  );
  const record = outcomeRecords.get(outcome)!;
  return Object.freeze({
    ...base,
    rankedConfirmed: toRefs(record.confirmed),
    rankedCandidates: toRefs(record.candidates),
  });
}

export function readOutcomeCollisionAnchorKeysV2(
  outcome: EvidenceRankingOutcomeV2,
): ReadonlySet<string> {
  const record = outcomeRecords.get(outcome);
  if (record === undefined) {
    throw new TypeError('evidence ranking outcome missing');
  }
  return record.collisionAnchorKeys;
}
