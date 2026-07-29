/**
 * F9 trusted public locate transport receipt registry.
 * Binds exact LocateResultV2 + compact JSON + capability to an opaque receipt.
 */

import type { LocateProjectionExecutionCapabilityV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { LocateResultV2 } from '../../contracts/v2/locate-result-v2.js';
import type { TrustedSerializedLocateResultV2 } from '../canonical/trusted-serialized-locate-result-v2.js';
import { requireTrustedSerializedLocateResultV2 } from '../canonical/trusted-serialized-locate-result-v2.js';
import type { AcceptedCompleteRealLocateShadowViewV2 } from '../canonical/accepted-complete-real-locate-shadow-orchestrator-v2.js';
import { createOpaqueTokenV2 } from '../request-snapshot/opaque-token-v2.js';
import type { CanonicalLocateExecutionV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';

declare const PUBLIC_LOCATE_TRANSPORT_RECEIPT_V2: unique symbol;
export type PublicLocateTransportReceiptV2 = Readonly<{
  readonly [PUBLIC_LOCATE_TRANSPORT_RECEIPT_V2]: never;
}>;

export interface TrustedPublicLocateTransportBundleV2 {
  readonly value: LocateResultV2;
  readonly receipt: PublicLocateTransportReceiptV2;
}

export interface PublicLocateTransportViewV2 {
  readonly value: LocateResultV2;
  readonly compactJson: string;
  readonly utf8Bytes: number;
}

interface TransportRegistryEntryV2 {
  readonly value: LocateResultV2;
  readonly compactJson: string;
  readonly utf8Bytes: number;
  readonly capability: LocateProjectionExecutionCapabilityV2;
}

const receiptRegistry = new WeakMap<
  PublicLocateTransportReceiptV2,
  TransportRegistryEntryV2
>();
const valueToReceipt = new WeakMap<
  LocateResultV2,
  PublicLocateTransportReceiptV2
>();

const TRANSPORT_INVARIANT = 'PUBLIC_LOCATE_TRANSPORT_INVARIANT';

function registerBundle(
  value: LocateResultV2,
  compactJson: string,
  utf8Bytes: number,
  execution: LocateProjectionExecutionCapabilityV2,
): TrustedPublicLocateTransportBundleV2 {
  const receipt = createOpaqueTokenV2<PublicLocateTransportReceiptV2>();
  receiptRegistry.set(
    receipt,
    Object.freeze({
      value,
      compactJson,
      utf8Bytes,
      capability: execution,
    }),
  );
  valueToReceipt.set(value, receipt);
  return Object.freeze({ value, receipt });
}

/**
 * Promote F8 accepted complete-shadow view into a transport receipt bundle.
 */
export function promoteAcceptedCompleteRealLocateShadowV2(
  accepted: AcceptedCompleteRealLocateShadowViewV2,
  _input: Extract<CanonicalLocateExecutionV2, Readonly<{ ok: true }>>,
  execution: LocateProjectionExecutionCapabilityV2,
): TrustedPublicLocateTransportBundleV2 {
  return registerBundle(
    accepted.value,
    accepted.compactJson,
    accepted.utf8Bytes,
    execution,
  );
}

/**
 * Promote F1C trusted serialized tool error into a transport receipt bundle.
 */
export function promoteTrustedSerializedPublicToolErrorV2(
  serialized: TrustedSerializedLocateResultV2,
  execution: LocateProjectionExecutionCapabilityV2,
): TrustedPublicLocateTransportBundleV2 {
  const view = requireTrustedSerializedLocateResultV2(serialized, execution);
  return registerBundle(
    view.value,
    view.compactJson,
    view.utf8Bytes,
    execution,
  );
}

/**
 * Expose registered transport value/JSON only when value+receipt+capability match.
 */
export function requirePublicLocateTransportValueV2(
  value: LocateResultV2,
  receipt: PublicLocateTransportReceiptV2,
  expectedExecution: LocateProjectionExecutionCapabilityV2,
): PublicLocateTransportViewV2 {
  const entry = receiptRegistry.get(receipt);
  const expectedReceipt = valueToReceipt.get(value);
  if (
    entry === undefined ||
    expectedReceipt === undefined ||
    expectedReceipt !== receipt ||
    entry.value !== value ||
    entry.capability !== expectedExecution
  ) {
    throw new Error(TRANSPORT_INVARIANT);
  }
  return Object.freeze({
    value: entry.value,
    compactJson: entry.compactJson,
    utf8Bytes: entry.utf8Bytes,
  });
}
