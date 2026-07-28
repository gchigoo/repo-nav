import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { PublicMaterializationContributionV2 } from '../public-output/materialized-evidence-core-v2.js';
import {
  requireSnapshotOutcomeContributionV2,
  type SnapshotOutcomeContributionV2,
} from '../request-snapshot/snapshot-outcome-contribution-v2.js';
import type { SnapshotTrustProofV2 } from '../request-snapshot/final-snapshot-check-v2.js';

export type RequestOutcomeContributionTupleV2 = readonly [
  PublicMaterializationContributionV2,
  SnapshotOutcomeContributionV2,
];

/**
 * 校验当前 required tuple：materialization→snapshot，无 optional/placeholder。
 */
export function requireRequestOutcomeContributionsV2(input: {
  readonly contributions: RequestOutcomeContributionTupleV2;
  readonly materializationContribution: PublicMaterializationContributionV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly execution: LocateExecutionTokenV2;
}): RequestOutcomeContributionTupleV2 {
  if (input.contributions.length !== 2) {
    throw new TypeError('request-outcome contributions tuple arity mismatch');
  }
  const first = input.contributions[0];
  const second = input.contributions[1];
  if (first !== input.materializationContribution) {
    throw new TypeError(
      'public-materialization contribution identity mismatch',
    );
  }
  if (first.owner !== 'public-materialization') {
    throw new TypeError('public-materialization contribution owner mismatch');
  }
  // 第1项读取前必须调用 F3 accessor
  const snapshot = requireSnapshotOutcomeContributionV2(
    second,
    input.snapshotProof,
    input.execution,
  );
  if (snapshot !== second) {
    throw new TypeError('snapshot-observation contribution identity mismatch');
  }
  return Object.freeze([first, snapshot] as const);
}
