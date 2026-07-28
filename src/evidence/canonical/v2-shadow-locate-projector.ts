/**
 * Test-only v2 shadow locate projector. Not registered in production DI.
 */

import type {
  CanonicalLocateExecutionV2,
  LocateFactOwnerV2,
  LocateProjectionExecutionCapabilityV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import { inspectLocateProjectionPrerequisiteOwnersV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import { requireCanonicalLocateExecutionTokenV2 } from '../locate-execution/locate-projection-execution-capability-v2.js';
import type { LocateProjectionPreparationPortV2 } from './locate-projection-preparation-port-v2.js';
import { createMaterializedLocateResultComposerV2 } from './materialized-locate-result-composer-v2.js';
import { createRequiredOwnerFinalizerV2 } from './required-owner-finalizer-v2.js';
import {
  serializeTrustedMaterializedLocateResultV2,
  validateComposedLocateResultV2ForSerialization,
  type TrustedSerializedLocateResultV2,
} from './trusted-serialized-locate-result-v2.js';

export type V2ShadowProjectionAttemptV2 =
  | Readonly<{
      ok: true;
      serialized: TrustedSerializedLocateResultV2;
    }>
  | Readonly<{
      ok: false;
      reason: 'execution-error' | 'missing-owner' | 'invalid-facts';
      missingOwners: readonly LocateFactOwnerV2[];
    }>;

export interface V2ShadowLocateProjectorV2 {
  project(
    input: CanonicalLocateExecutionV2,
    execution: LocateProjectionExecutionCapabilityV2,
    preparation: LocateProjectionPreparationPortV2,
  ): V2ShadowProjectionAttemptV2;
}

/**
 * Create a test-only shadow projector over the neutral preparation port.
 */
export function createV2ShadowLocateProjectorV2(): V2ShadowLocateProjectorV2 {
  const finalizer = createRequiredOwnerFinalizerV2();
  const composer = createMaterializedLocateResultComposerV2();
  return {
    project(input, capability, preparation) {
      let token;
      try {
        token = requireCanonicalLocateExecutionTokenV2(input, capability);
      } catch {
        return Object.freeze({
          ok: false,
          reason: 'invalid-facts' as const,
          missingOwners: Object.freeze([] as const),
        });
      }
      if (!input.ok) {
        return Object.freeze({
          ok: false,
          reason: 'execution-error' as const,
          missingOwners: Object.freeze([] as const),
        });
      }
      const prerequisites = inspectLocateProjectionPrerequisiteOwnersV2(
        input.envelope,
        input,
        token,
      );
      if (!prerequisites.ok) {
        if (prerequisites.reason === 'missing-prerequisite-owner') {
          return Object.freeze({
            ok: false,
            reason: 'missing-owner' as const,
            missingOwners: prerequisites.missingOwners,
          });
        }
        return Object.freeze({
          ok: false,
          reason: 'invalid-facts' as const,
          missingOwners: Object.freeze([] as const),
        });
      }
      const source = preparation.createSource(
        prerequisites.prerequisites,
        input,
        token,
      );
      if (!source.ok) {
        return Object.freeze({
          ok: false,
          reason: 'invalid-facts' as const,
          missingOwners: Object.freeze([] as const),
        });
      }
      const materialization = preparation.materialize(
        source.value,
        input,
        token,
      );
      if (!materialization.ok) {
        return Object.freeze({
          ok: false,
          reason: 'invalid-facts' as const,
          missingOwners: Object.freeze([] as const),
        });
      }
      const aggregation = preparation.aggregate(
        materialization.value,
        input,
        token,
      );
      if (!aggregation.ok) {
        return Object.freeze({
          ok: false,
          reason: 'invalid-facts' as const,
          missingOwners: Object.freeze([] as const),
        });
      }
      const finalized = finalizer.finalize(aggregation.value, token);
      if (!finalized.ok) {
        return Object.freeze({
          ok: false,
          reason: finalized.reason,
          missingOwners: finalized.missingOwners,
        });
      }
      const composed = composer.compose(finalized.value);
      if (!composed.ok) {
        return Object.freeze({
          ok: false,
          reason: 'invalid-facts' as const,
          missingOwners: Object.freeze([] as const),
        });
      }
      try {
        const schemaValidated = validateComposedLocateResultV2ForSerialization(
          composed.value,
        );
        const serialized = serializeTrustedMaterializedLocateResultV2(
          schemaValidated,
          capability,
        );
        return Object.freeze({ ok: true, serialized });
      } catch {
        return Object.freeze({
          ok: false,
          reason: 'invalid-facts' as const,
          missingOwners: Object.freeze([] as const),
        });
      }
    },
  };
}
