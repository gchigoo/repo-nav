import type {
  LocateExecutionTokenV2,
  SnapshotFactsV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import { createOpaqueTokenV2 } from './opaque-token-v2.js';
import type {
  SnapshotTrustProofV2,
  TrustedFinalSnapshotPoolsV2,
  TrustedStableEvidencePoolV2,
} from './final-snapshot-check-v2.js';
import { requireTrustedSnapshotPoolsV2 } from './final-snapshot-check-v2.js';
import type {
  InternalPreRankingEvidenceRecordV2,
  TrustedStableRecordViewV2,
} from './pre-ranking-evidence-pool-v2.js';
import type {
  BoundSafeDiscoverySelectionV2,
  SafeDiscoverySelectionProofV2,
} from './discovery-selection-binding-v2.js';
import { requireBoundDiscoverySelectionV2 } from './discovery-selection-binding-v2.js';

declare const TRUSTED_SNAPSHOT_RANKING_VIEW_V2: unique symbol;
export type TrustedSnapshotRankingViewV2 = Readonly<object> & {
  readonly [TRUSTED_SNAPSHOT_RANKING_VIEW_V2]: never;
};

export type TrackedDiscoveryFileOutcomeV2 = 'stable' | 'purged' | 'unobserved';

interface RankingViewRecordV2 {
  readonly records: readonly TrustedStableRecordViewV2[];
  readonly facts: SnapshotFactsV2;
  readonly pool: TrustedStableEvidencePoolV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly selection: BoundSafeDiscoverySelectionV2;
  readonly selectionProof: SafeDiscoverySelectionProofV2;
  readonly execution: LocateExecutionTokenV2;
  readonly locatorOutcomes: ReadonlyMap<object, TrackedDiscoveryFileOutcomeV2>;
  readonly completeness: ReadonlyMap<string, 'complete' | 'incomplete'>;
}

const rankingViews = new WeakMap<
  TrustedSnapshotRankingViewV2,
  RankingViewRecordV2
>();

function toViews(
  retained: readonly InternalPreRankingEvidenceRecordV2[],
): readonly TrustedStableRecordViewV2[] {
  return Object.freeze(
    retained
      .filter((record) => record.draft !== undefined)
      .map((record) => {
        const brand = createOpaqueTokenV2<TrustedStableRecordViewV2>();
        return Object.freeze({
          ...brand,
          recordRef: record.recordRef,
          fileBucketRef: record.fileBucketRef,
          draft: record.draft!,
          rankingSignals: record.rankingSignals,
        }) as TrustedStableRecordViewV2;
      }),
  );
}

/**
 * Trust gate：核对 final pools / selection 后签发 ranking view。
 */
export function lookupTrustedSnapshotRankingViewV2(input: {
  readonly finalPools: TrustedFinalSnapshotPoolsV2;
  readonly discoverySelection: BoundSafeDiscoverySelectionV2;
  readonly execution: LocateExecutionTokenV2;
  readonly locatorOutcomes?: ReadonlyMap<object, TrackedDiscoveryFileOutcomeV2>;
}): TrustedSnapshotRankingViewV2 {
  const bound = requireBoundDiscoverySelectionV2(
    input.discoverySelection,
    input.execution,
  );
  requireTrustedSnapshotPoolsV2(
    input.finalPools.proof,
    input.finalPools.evidence,
    input.finalPools.eligibleDiscovery,
  );
  const view = createOpaqueTokenV2<TrustedSnapshotRankingViewV2>();
  const records = toViews(input.finalPools.retainedEvidence);
  const completeness = new Map<string, 'complete' | 'incomplete'>();
  for (const reservation of bound.draft.reservations) {
    const outcomes = reservation.locatorRefs.map(
      (ref) => input.locatorOutcomes?.get(ref) ?? 'stable',
    );
    const incomplete =
      reservation.state === 'budget-deferred' ||
      outcomes.some((outcome) => outcome === 'unobserved');
    completeness.set(
      reservation.anchorKey,
      incomplete ? 'incomplete' : 'complete',
    );
  }
  rankingViews.set(
    view,
    Object.freeze({
      records,
      facts: input.finalPools.facts,
      pool: input.finalPools.evidence,
      snapshotProof: input.finalPools.proof,
      selection: input.discoverySelection,
      selectionProof: bound.proof,
      execution: input.execution,
      locatorOutcomes: input.locatorOutcomes ?? new Map(),
      completeness,
    }),
  );
  return view;
}

export function requireTrustedSnapshotRankingViewV2(
  view: TrustedSnapshotRankingViewV2,
  expectedProof: SnapshotTrustProofV2,
  expectedExecution: LocateExecutionTokenV2,
): RankingViewRecordV2 {
  const record = rankingViews.get(view);
  if (
    record === undefined ||
    record.snapshotProof !== expectedProof ||
    record.execution !== expectedExecution
  ) {
    throw new TypeError('trusted snapshot ranking view mismatch');
  }
  return record;
}

/**
 * proof-bound anchor completeness；unobserved → incomplete。
 */
export function anchorCompletenessV2(
  view: TrustedSnapshotRankingViewV2,
  anchorKey: string,
  selectionProof: SafeDiscoverySelectionProofV2,
): Readonly<{ state: 'complete' | 'incomplete' }> {
  const record = rankingViews.get(view);
  if (record === undefined || record.selectionProof !== selectionProof) {
    throw new TypeError('anchor completeness proof mismatch');
  }
  return Object.freeze({
    state: record.completeness.get(anchorKey) ?? 'incomplete',
  });
}
