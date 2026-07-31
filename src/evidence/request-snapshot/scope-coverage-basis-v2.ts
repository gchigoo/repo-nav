import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { ScopeFoldedSafePoolProofV2 } from './scope-folded-discovery-selector-v2.js';
import type { SnapshotTrustProofV2 } from './final-snapshot-check-v2.js';
import type { TrustedStableEligibleDiscoveryPoolV2 } from './final-snapshot-check-v2.js';
import type { DiscoveryLocatorRefV2 } from './discovery-lane-universe-v2.js';
import { createOpaqueTokenV2 } from './opaque-token-v2.js';

declare const SCOPE_COVERAGE_BASIS_V2: unique symbol;
export type ScopeCoverageBasisV2 = Readonly<object> & {
  readonly [SCOPE_COVERAGE_BASIS_V2]: never;
};

export interface ScopeCoverageBasisViewV2 {
  readonly outsideLayerHintCount: number;
}

interface CoveragePrivateV2 {
  readonly outsideLayerHintCount: number;
  readonly eligiblePool: TrustedStableEligibleDiscoveryPoolV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly foldProof: ScopeFoldedSafePoolProofV2;
  readonly execution: LocateExecutionTokenV2;
  readonly excludedRefs: readonly DiscoveryLocatorRefV2[];
}

const coveragePrivate = new WeakMap<ScopeCoverageBasisV2, CoveragePrivateV2>();

/**
 * 只暴露 globally unique excluded identity count；mixed included 不计 outside。
 */
export function createScopeCoverageBasisV2(input: {
  readonly excludedLocatorRefs: readonly DiscoveryLocatorRefV2[];
  readonly mixedIncludedLocatorRefs: readonly DiscoveryLocatorRefV2[];
  readonly stableEligiblePool: TrustedStableEligibleDiscoveryPoolV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly foldProof: ScopeFoldedSafePoolProofV2;
  readonly execution: LocateExecutionTokenV2;
}): ScopeCoverageBasisV2 {
  void input.mixedIncludedLocatorRefs;
  const unique = new Set(input.excludedLocatorRefs);
  const basis = createOpaqueTokenV2<ScopeCoverageBasisV2>();
  coveragePrivate.set(
    basis,
    Object.freeze({
      outsideLayerHintCount: unique.size,
      eligiblePool: input.stableEligiblePool,
      snapshotProof: input.snapshotProof,
      foldProof: input.foldProof,
      execution: input.execution,
      excludedRefs: Object.freeze([...unique]),
    }),
  );
  return basis;
}

export function requireScopeCoverageBasisV2(
  basis: ScopeCoverageBasisV2,
  expectedEligiblePool: TrustedStableEligibleDiscoveryPoolV2,
  expectedSnapshotProof: SnapshotTrustProofV2,
  expectedFoldProof: ScopeFoldedSafePoolProofV2,
  expectedExecution: LocateExecutionTokenV2,
): ScopeCoverageBasisViewV2 {
  const record = coveragePrivate.get(basis);
  if (
    record === undefined ||
    record.eligiblePool !== expectedEligiblePool ||
    record.snapshotProof !== expectedSnapshotProof ||
    record.foldProof !== expectedFoldProof ||
    record.execution !== expectedExecution
  ) {
    throw new TypeError('scope coverage basis proof mismatch');
  }
  return Object.freeze({
    outsideLayerHintCount: record.outsideLayerHintCount,
  });
}
