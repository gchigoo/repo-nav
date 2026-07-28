/**
 * Required-owner finalizer: completion-token-only admission and six-owner completeness.
 */

import {
  LOCATE_FACT_OWNER_ORDER_V2,
  type LocateExecutionTokenV2,
  type LocateFactOwnerV2,
  type CompleteLocateFactEnvelopeV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { TrustedLocateProjectionAggregationV2 } from './locate-projection-preparation-port-v2.js';
import type { TrustedLocateProjectionMaterializationV2 } from './locate-projection-preparation-port-v2.js';
import {
  requireTrustedLocateProjectionAggregationEntryV2,
  requireTrustedLocateProjectionMaterializationEntryV2,
} from './locate-projection-stage-registrar-v2.js';

declare const TRUSTED_FINALIZED_LOCATE_FACTS_V2: unique symbol;
export type TrustedFinalizedLocateFactsV2 = Readonly<{
  readonly [TRUSTED_FINALIZED_LOCATE_FACTS_V2]: never;
}>;

export type FinalizeLocateFactsV2Result =
  | Readonly<{ ok: true; value: TrustedFinalizedLocateFactsV2 }>
  | Readonly<{
      ok: false;
      reason: 'missing-owner';
      missingOwners: readonly LocateFactOwnerV2[];
    }>
  | Readonly<{
      ok: false;
      reason: 'invalid-facts';
      missingOwners: readonly [];
    }>;

export interface RequiredOwnerFinalizerV2 {
  finalize(
    aggregation: TrustedLocateProjectionAggregationV2,
    execution: LocateExecutionTokenV2,
  ): FinalizeLocateFactsV2Result;
}

export interface FinalizedLocateFactsRegistryEntryV2 {
  readonly completeEnvelope: CompleteLocateFactEnvelopeV2;
  readonly materialization: TrustedLocateProjectionMaterializationV2;
  readonly aggregation: TrustedLocateProjectionAggregationV2;
  readonly execution: LocateExecutionTokenV2;
  readonly statusV2: CompleteLocateFactEnvelopeV2 extends never
    ? never
    : import('./locate-projection-preparation-port-v2.js').LocateProjectionAggregationRegistrationV2['statusV2'];
  readonly backend: CompleteLocateFactEnvelopeV2['fragments']['backend']['value'];
  readonly requestOutcome: CompleteLocateFactEnvelopeV2['fragments']['request-outcome']['value'];
}

const finalizedRegistry = new WeakMap<
  TrustedFinalizedLocateFactsV2,
  FinalizedLocateFactsRegistryEntryV2
>();

function createOpaqueBrand(): object {
  return Object.freeze(Object.create(null) as object);
}

class RequiredOwnerFinalizerV2Impl implements RequiredOwnerFinalizerV2 {
  public finalize(
    aggregation: TrustedLocateProjectionAggregationV2,
    execution: LocateExecutionTokenV2,
  ): FinalizeLocateFactsV2Result {
    let aggregationEntry;
    try {
      aggregationEntry = requireTrustedLocateProjectionAggregationEntryV2(
        aggregation,
        execution,
      );
    } catch {
      return Object.freeze({
        ok: false,
        reason: 'invalid-facts' as const,
        missingOwners: Object.freeze([] as const),
      });
    }
    try {
      requireTrustedLocateProjectionMaterializationEntryV2(
        aggregationEntry.materialization,
        execution,
      );
    } catch {
      return Object.freeze({
        ok: false,
        reason: 'invalid-facts' as const,
        missingOwners: Object.freeze([] as const),
      });
    }
    const fragments = aggregationEntry.completeEnvelope.fragments;
    const missing: LocateFactOwnerV2[] = [];
    for (const owner of LOCATE_FACT_OWNER_ORDER_V2) {
      if (!Object.hasOwn(fragments, owner)) {
        missing.push(owner);
      }
    }
    if (missing.length > 0) {
      return Object.freeze({
        ok: false,
        reason: 'missing-owner' as const,
        missingOwners: Object.freeze(missing),
      });
    }
    for (const owner of LOCATE_FACT_OWNER_ORDER_V2) {
      const entry = fragments[owner];
      if (
        entry === undefined ||
        entry.owner !== owner ||
        entry.value === undefined
      ) {
        return Object.freeze({
          ok: false,
          reason: 'invalid-facts' as const,
          missingOwners: Object.freeze([] as const),
        });
      }
    }
    const ownKeys = Reflect.ownKeys(fragments);
    if (ownKeys.length !== LOCATE_FACT_OWNER_ORDER_V2.length) {
      return Object.freeze({
        ok: false,
        reason: 'invalid-facts' as const,
        missingOwners: Object.freeze([] as const),
      });
    }
    const token = createOpaqueBrand() as TrustedFinalizedLocateFactsV2;
    finalizedRegistry.set(
      token,
      Object.freeze({
        completeEnvelope: aggregationEntry.completeEnvelope,
        materialization: aggregationEntry.materialization,
        aggregation,
        execution,
        statusV2: aggregationEntry.registration.statusV2,
        backend: aggregationEntry.completeEnvelope.fragments.backend.value,
        requestOutcome:
          aggregationEntry.completeEnvelope.fragments['request-outcome'].value,
      }),
    );
    return Object.freeze({ ok: true, value: token });
  }
}

/**
 * Zero-argument deep-internal factory returning a narrow finalizer interface.
 */
export function createRequiredOwnerFinalizerV2(): RequiredOwnerFinalizerV2 {
  return new RequiredOwnerFinalizerV2Impl();
}

/** @internal Composer accessor for finalized registry. */
export function requireTrustedFinalizedLocateFactsV2(
  finalized: TrustedFinalizedLocateFactsV2,
): FinalizedLocateFactsRegistryEntryV2 {
  const entry = finalizedRegistry.get(finalized);
  if (entry === undefined) {
    throw new Error('Trusted finalized locate facts are not bound.');
  }
  return entry;
}
