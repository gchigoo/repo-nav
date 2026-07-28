/**
 * Materialized locate result composer: merges finalized owner/neutral views and assigns IDs.
 */

import type { LocateResultV2 } from '../../contracts/v2/locate-result-v2.js';
import {
  requireTrustedLocateProjectionMaterializationEntryV2,
} from './locate-projection-stage-registrar-v2.js';
import {
  requireTrustedFinalizedLocateFactsV2,
  type TrustedFinalizedLocateFactsV2,
} from './required-owner-finalizer-v2.js';

declare const TRUSTED_MATERIALIZED_LOCATE_RESULT_V2: unique symbol;
export type TrustedMaterializedLocateResultV2 = Readonly<{
  readonly [TRUSTED_MATERIALIZED_LOCATE_RESULT_V2]: never;
}>;

export interface MaterializedLocateResultComposerV2 {
  compose(
    finalized: TrustedFinalizedLocateFactsV2,
  ): Readonly<
    | { ok: true; value: TrustedMaterializedLocateResultV2 }
    | { ok: false; reason: 'invalid-facts' }
  >;
}

const materializedRegistry = new WeakMap<
  TrustedMaterializedLocateResultV2,
  LocateResultV2
>();

function createOpaqueBrand(): object {
  return Object.freeze(Object.create(null) as object);
}

class MaterializedLocateResultComposerV2Impl
  implements MaterializedLocateResultComposerV2
{
  public compose(
    finalized: TrustedFinalizedLocateFactsV2,
  ): Readonly<
    | { ok: true; value: TrustedMaterializedLocateResultV2 }
    | { ok: false; reason: 'invalid-facts' }
  > {
    let entry;
    try {
      entry = requireTrustedFinalizedLocateFactsV2(finalized);
    } catch {
      return Object.freeze({ ok: false, reason: 'invalid-facts' as const });
    }
    let materializationEntry;
    try {
      materializationEntry = requireTrustedLocateProjectionMaterializationEntryV2(
        entry.materialization,
        entry.execution,
      );
    } catch {
      return Object.freeze({ ok: false, reason: 'invalid-facts' as const });
    }
    const registration = materializationEntry.registration;
    const envelope = entry.completeEnvelope;
    const confirmed = registration.confirmed.map((item, index) =>
      Object.freeze({
        ...item.value,
        id: `evidence:v2:${String(index + 1).padStart(4, '0')}`,
      }),
    );
    const candidates = registration.candidates.map((item, index) =>
      Object.freeze({
        ...item.value,
        id: `evidence:v2:${String(confirmed.length + index + 1).padStart(4, '0')}`,
      }),
    );
    const ranking = envelope.fragments.ranking.value;
    const snapshot = envelope.fragments.snapshot.value;
    const scope = envelope.fragments.scope.value;
    const capability = envelope.fragments.capability.value;
    const result: LocateResultV2 = Object.freeze({
      ok: true as const,
      evidence: Object.freeze({
        schemaVersion: '2.0' as const,
        status: entry.statusV2,
        repositoryRef: 'local-repository' as const,
        normalizedTerms: registration.normalizedTerms,
        confirmed: Object.freeze(confirmed),
        candidates: Object.freeze(candidates),
        coverage: Object.freeze({
          backends: entry.backend.outcomes,
          strategyComplete: entry.requestOutcome.strategyComplete,
          fallbackChecked: entry.requestOutcome.fallbackChecked,
          indexState: entry.backend.indexState,
          indexFreshness: entry.backend.indexFreshness,
          limitsReached: entry.requestOutcome.limitsReached,
          degradations: entry.requestOutcome.degradations,
          exclusionSummary: entry.requestOutcome.exclusionSummary,
          abortSource: entry.requestOutcome.abortSource,
          unsatisfiedAnchors: ranking.unsatisfiedAnchors,
          snapshot: snapshot.coverage,
          scope,
          capabilities: capability,
        }),
        nextActions: entry.requestOutcome.nextActions,
      }),
    });
    const token = createOpaqueBrand() as TrustedMaterializedLocateResultV2;
    materializedRegistry.set(token, result);
    return Object.freeze({ ok: true, value: token });
  }
}

/**
 * Zero-argument deep-internal factory returning a narrow composer interface.
 */
export function createMaterializedLocateResultComposerV2(): MaterializedLocateResultComposerV2 {
  return new MaterializedLocateResultComposerV2Impl();
}

/** @internal Schema/serialization accessor for composed public value. */
export function requireTrustedMaterializedLocateResultV2(
  value: TrustedMaterializedLocateResultV2,
): LocateResultV2 {
  const result = materializedRegistry.get(value);
  if (result === undefined) {
    throw new Error('Trusted materialized locate result is not bound.');
  }
  return result;
}
