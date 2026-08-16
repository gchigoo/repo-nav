import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { EligibleDiscoveryRefV2 } from '../request-snapshot/pre-ranking-evidence-pool-v2.js';
import type { ScopeEligibilityDecisionV2 } from '../request-snapshot/scope-folded-discovery-selector-v2.js';
import type { SnapshotTrustProofV2 } from '../request-snapshot/final-snapshot-check-v2.js';
import {
  readPreFinalScopeDecisionForEligibleRefV2,
  readStableScopeDecisionForEligibleRefV2,
  type TrustedPreFinalScopeClassificationViewV2,
  type TrustedStableEligibleScopeViewV2,
} from '../request-snapshot/scope-classification-views-v2.js';

/**
 * Pre-final classifier/candidate/F8 adapter seam。
 */
export function requirePreFinalScopeDecisionV1(
  scopeView: TrustedPreFinalScopeClassificationViewV2,
  record: EligibleDiscoveryRefV2,
  execution: LocateExecutionTokenV2,
): ScopeEligibilityDecisionV2 {
  return readPreFinalScopeDecisionForEligibleRefV2(
    scopeView,
    record,
    execution,
  );
}

/**
 * Post-final matched/count seam：验证 snapshot 绑定后读 bound decision。
 */
export function requireStableScopeDecisionV1(
  scopeView: TrustedStableEligibleScopeViewV2,
  record: EligibleDiscoveryRefV2,
  snapshotProof: SnapshotTrustProofV2,
  execution: LocateExecutionTokenV2,
): ScopeEligibilityDecisionV2 {
  return readStableScopeDecisionForEligibleRefV2(
    scopeView,
    record,
    snapshotProof,
    execution,
  );
}

export type {
  TrustedPreFinalScopeClassificationViewV2,
  TrustedStableEligibleScopeViewV2,
};
