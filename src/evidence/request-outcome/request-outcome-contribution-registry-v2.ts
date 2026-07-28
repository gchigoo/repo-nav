import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { PublicMaterializationContributionV2 } from '../public-output/materialized-evidence-core-v2.js';
import {
  requireSnapshotOutcomeContributionV2,
  type SnapshotOutcomeContributionV2,
} from '../request-snapshot/snapshot-outcome-contribution-v2.js';
import type { SnapshotTrustProofV2 } from '../request-snapshot/final-snapshot-check-v2.js';
import type { ScopeFoldedSafePoolProofV2 } from '../request-snapshot/scope-folded-discovery-selector-v2.js';
import type { ScopeCoverageBasisV2 } from '../request-snapshot/scope-coverage-basis-v2.js';
import type { TrustedStableEligibleDiscoveryPoolV2 } from '../request-snapshot/final-snapshot-check-v2.js';
import type { ResolvedRepositoryScopeV1 } from '../scope/resolve-repository-scope-v1.js';
import {
  requireScopeOutcomeContributionV2,
  type ScopeCoverageProofV1,
  type ScopeOutcomeContributionV2,
} from '../scope/scope-coverage-v1.js';

export const REQUEST_OUTCOME_CONTRIBUTION_OWNER_ORDER_V2 = Object.freeze([
  'public-materialization',
  'snapshot-observation',
  'scope',
] as const);

export type RequestOutcomeAggregationContributionTupleV2 = readonly [
  PublicMaterializationContributionV2,
  SnapshotOutcomeContributionV2,
  ScopeOutcomeContributionV2,
];

/** @deprecated use RequestOutcomeAggregationContributionTupleV2 */
export type RequestOutcomeContributionTupleV2 =
  RequestOutcomeAggregationContributionTupleV2;

export interface RequireRequestOutcomeContributionsInputV2 {
  readonly contributions: RequestOutcomeAggregationContributionTupleV2;
  readonly materializationContribution: PublicMaterializationContributionV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly execution: LocateExecutionTokenV2;
  readonly scopeProof: ScopeCoverageProofV1;
  readonly expectedEligiblePool: TrustedStableEligibleDiscoveryPoolV2;
  readonly expectedFoldProof: ScopeFoldedSafePoolProofV2;
  readonly expectedCoverageBasis: ScopeCoverageBasisV2;
  readonly expectedResolvedScope: ResolvedRepositoryScopeV1;
}

/**
 * 校验 exact 三元组：materialization→snapshot→scope；无 future index 3。
 */
export function requireRequestOutcomeContributionsV2(
  input: RequireRequestOutcomeContributionsInputV2,
): RequestOutcomeAggregationContributionTupleV2 {
  if (input.contributions.length !== 3) {
    throw new TypeError('request-outcome contributions tuple arity mismatch');
  }
  const first = input.contributions[0];
  const second = input.contributions[1];
  const third = input.contributions[2];
  if (first !== input.materializationContribution) {
    throw new TypeError(
      'public-materialization contribution identity mismatch',
    );
  }
  if (first.owner !== 'public-materialization') {
    throw new TypeError('public-materialization contribution owner mismatch');
  }
  const snapshot = requireSnapshotOutcomeContributionV2(
    second,
    input.snapshotProof,
    input.execution,
  );
  if (snapshot !== second) {
    throw new TypeError('snapshot-observation contribution identity mismatch');
  }
  const scope = requireScopeOutcomeContributionV2(
    third,
    input.scopeProof,
    input.expectedEligiblePool,
    input.snapshotProof,
    input.expectedFoldProof,
    input.expectedCoverageBasis,
    input.expectedResolvedScope,
    input.execution,
  );
  if (scope !== third) {
    throw new TypeError('scope contribution identity mismatch');
  }
  return Object.freeze([first, snapshot, scope] as const);
}
