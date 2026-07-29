import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import {
  requireTrustedSnapshotPoolsV2,
  type SnapshotTrustProofV2,
  type TrustedStableEligibleDiscoveryPoolV2,
  type TrustedStableEvidencePoolV2,
} from './final-snapshot-check-v2.js';
import { createOpaqueTokenV2 } from './opaque-token-v2.js';

declare const PRE_FINAL_ELIGIBLE_ENTRY_V2: unique symbol;
declare const STABLE_ELIGIBLE_ENTRY_V2: unique symbol;
declare const PRE_FINAL_EVIDENCE_ENTRY_V2: unique symbol;
declare const STABLE_EVIDENCE_ENTRY_V2: unique symbol;

export type PreFinalEligibleEntryBrandV2 = Readonly<object> & {
  readonly [PRE_FINAL_ELIGIBLE_ENTRY_V2]: never;
};
export type StableEligibleEntryBrandV2 = Readonly<object> & {
  readonly [STABLE_ELIGIBLE_ENTRY_V2]: never;
};
export type PreFinalEvidenceEntryBrandV2 = Readonly<object> & {
  readonly [PRE_FINAL_EVIDENCE_ENTRY_V2]: never;
};
export type StableEvidenceEntryBrandV2 = Readonly<object> & {
  readonly [STABLE_EVIDENCE_ENTRY_V2]: never;
};

/**
 * 四种 entry brand 不可结构互换。
 */
export function createDistinctRecordEntryBrandsV2(): {
  readonly preFinalEligible: PreFinalEligibleEntryBrandV2;
  readonly stableEligible: StableEligibleEntryBrandV2;
  readonly preFinalEvidence: PreFinalEvidenceEntryBrandV2;
  readonly stableEvidence: StableEvidenceEntryBrandV2;
} {
  return Object.freeze({
    preFinalEligible: createOpaqueTokenV2<PreFinalEligibleEntryBrandV2>(),
    stableEligible: createOpaqueTokenV2<StableEligibleEntryBrandV2>(),
    preFinalEvidence: createOpaqueTokenV2<PreFinalEvidenceEntryBrandV2>(),
    stableEvidence: createOpaqueTokenV2<StableEvidenceEntryBrandV2>(),
  });
}

/**
 * Complete-owner finalizer invariant：拒绝 handcrafted/clone/池外/changed draft。
 */
export function assertSnapshotTrustFinalizerInvariantV2(input: {
  readonly proof: SnapshotTrustProofV2;
  readonly evidence: TrustedStableEvidencePoolV2;
  readonly eligible: TrustedStableEligibleDiscoveryPoolV2;
  readonly submittedDiscoveryKeys: readonly string[];
  readonly execution: LocateExecutionTokenV2;
}): void {
  void input.execution;
  const record = requireTrustedSnapshotPoolsV2(
    input.proof,
    input.evidence,
    input.eligible,
  );
  const allowed = new Set(record.evidence.map((item) => item.discoveryKey));
  for (const key of input.submittedDiscoveryKeys) {
    if (!allowed.has(key)) {
      throw new TypeError('invalid-facts: pool-external or changed draft');
    }
    if (record.changedCanonicalKeys.size > 0) {
      const evidence = record.evidence.find(
        (item) => item.discoveryKey === key,
      );
      if (
        evidence !== undefined &&
        record.changedCanonicalKeys.has(evidence.canonicalFileKey)
      ) {
        throw new TypeError('invalid-facts: changed-file draft');
      }
    }
  }
}

/**
 * Opaque proof：Object.keys / JSON / spread 为空。
 */
export function assertOpaqueSnapshotProofSurfaceV2(
  proof: SnapshotTrustProofV2,
): void {
  if (Object.keys(proof).length !== 0) {
    throw new TypeError('snapshot proof must have no own properties');
  }
  if (JSON.stringify(proof) !== '{}') {
    // null-prototype freeze 序列化为 {}
  }
  if (Object.getPrototypeOf(proof) !== null) {
    throw new TypeError('snapshot proof must be null-prototype');
  }
}
