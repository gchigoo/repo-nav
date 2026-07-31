import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import { createOpaqueTokenV2 } from './opaque-token-v2.js';
import type { DiscoveryLocatorRefV2 } from './discovery-lane-universe-v2.js';
import type { TrustedScopeFoldedSelectorViewV2 } from './scope-folded-discovery-selector-v2.js';

declare const BOUND_SAFE_DISCOVERY_SELECTION_V2: unique symbol;
export type BoundSafeDiscoverySelectionV2 = Readonly<object> & {
  readonly [BOUND_SAFE_DISCOVERY_SELECTION_V2]: never;
};

declare const SAFE_DISCOVERY_SELECTION_PROOF_V2: unique symbol;
export type SafeDiscoverySelectionProofV2 = Readonly<object> & {
  readonly [SAFE_DISCOVERY_SELECTION_PROOF_V2]: never;
};

declare const DISCOVERY_TRACKING_TICKET_V2: unique symbol;
export type DiscoveryTrackingTicketV2 = Readonly<object> & {
  readonly [DISCOVERY_TRACKING_TICKET_V2]: never;
};

export interface SafeDiscoveryAnchorReservationV2 {
  readonly anchorKey: string;
  readonly state: 'reserved' | 'no-hit' | 'budget-deferred';
  readonly locatorRefs: readonly DiscoveryLocatorRefV2[];
}

export interface SafeDiscoverySelectionDraftV2 {
  readonly selectorView: TrustedScopeFoldedSelectorViewV2;
  readonly anchorKeys: readonly string[];
  readonly selectedLocatorRefs: readonly DiscoveryLocatorRefV2[];
  readonly reservations: readonly SafeDiscoveryAnchorReservationV2[];
  readonly filesTruncated: boolean;
  readonly safeSelectionCollision: boolean;
}

interface BoundSelectionRecordV2 {
  readonly draft: SafeDiscoverySelectionDraftV2;
  readonly proof: SafeDiscoverySelectionProofV2;
  readonly ticket: DiscoveryTrackingTicketV2;
  readonly execution: LocateExecutionTokenV2;
}

const boundSelectionRecords = new WeakMap<
  BoundSafeDiscoverySelectionV2,
  BoundSelectionRecordV2
>();

/**
 * 在任何 reader 调用前绑定 exact selection → ticket/proof。
 */
export function bindDiscoverySelectionV2(
  draft: SafeDiscoverySelectionDraftV2,
  execution: LocateExecutionTokenV2,
): BoundSafeDiscoverySelectionV2 {
  const proof = createOpaqueTokenV2<SafeDiscoverySelectionProofV2>();
  const ticket = createOpaqueTokenV2<DiscoveryTrackingTicketV2>();
  const bound = createOpaqueTokenV2<BoundSafeDiscoverySelectionV2>();
  boundSelectionRecords.set(
    bound,
    Object.freeze({
      draft: Object.freeze({ ...draft }),
      proof,
      ticket,
      execution,
    }),
  );
  return bound;
}

/**
 * Trust lookup：核对 bound selection 与 execution。
 */
export function requireBoundDiscoverySelectionV2(
  bound: BoundSafeDiscoverySelectionV2,
  execution: LocateExecutionTokenV2,
): BoundSelectionRecordV2 {
  const record = boundSelectionRecords.get(bound);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('discovery selection binding is not trusted');
  }
  return record;
}

export function readBoundSelectionProofV2(
  bound: BoundSafeDiscoverySelectionV2,
  execution: LocateExecutionTokenV2,
): SafeDiscoverySelectionProofV2 {
  return requireBoundDiscoverySelectionV2(bound, execution).proof;
}
