import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { DiscoveryLocatorRefV2 } from '../request-snapshot/discovery-lane-universe-v2.js';
import type { EligibleDiscoveryRefV2 } from '../request-snapshot/pre-ranking-evidence-pool-v2.js';
import type { ScopeEligibilityDecisionV2 } from '../request-snapshot/scope-folded-discovery-selector-v2.js';
import type { SnapshotTrustProofV2 } from '../request-snapshot/final-snapshot-check-v2.js';
import {
  readLegacyScopeDecisionForLocatorV2,
  readPreFinalScopeDecisionForEligibleRefV2,
  readStableScopeDecisionForEligibleRefV2,
  type TrustedLegacyScopeClassificationViewV2,
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
  return readPreFinalScopeDecisionForEligibleRefV2(scopeView, record, execution);
}

/**
 * Legacy lane：同一 locator policy decision。
 */
export function requireLegacyScopeDecisionV1(
  scopeView: TrustedLegacyScopeClassificationViewV2,
  locatorRef: DiscoveryLocatorRefV2,
  execution: LocateExecutionTokenV2,
): ScopeEligibilityDecisionV2 {
  return readLegacyScopeDecisionForLocatorV2(scopeView, locatorRef, execution);
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
  TrustedLegacyScopeClassificationViewV2,
  TrustedPreFinalScopeClassificationViewV2,
  TrustedStableEligibleScopeViewV2,
};
