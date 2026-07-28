/**
 * F6-V1-001 behavioral helper: each v2 shadow failure class must not alter
 * same-run legacyV1Projection exact object reference or deep-exact bytes.
 */

import { expect, vi } from 'vitest';

import type { CanonicalLocateExecutionV2 } from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import type { LocateProjectionExecutionCapabilityV2 } from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import { createV2ShadowLocateProjectorV2 } from '../../src/evidence/canonical/v2-shadow-locate-projector.js';
import { V1LocateResultProjector } from '../../src/evidence/locate-execution/v1-locate-result-projector.js';
import * as trustedSerialized from '../../src/evidence/canonical/trusted-serialized-locate-result-v2.js';
import {
  createSyntheticLocateProjectionPreparationPortV2,
  type SyntheticLocateProjectionPreparationOptionsV2,
} from './create-synthetic-locate-projection-preparation-port-v2.js';
import {
  V1_SHADOW_FAILURE_CLASSES_V2,
  type V1ShadowFailureClassV2,
} from '../fixtures/request-outcome-v2/v1-compatibility-v2.js';

function preparationForFailure(
  failureClass: V1ShadowFailureClassV2,
): SyntheticLocateProjectionPreparationOptionsV2 {
  switch (failureClass) {
    case 'source':
      return { skipSource: true };
    case 'corpus':
    case 'materialization':
      return { skipMaterialization: true };
    case 'contribution':
    case 'aggregation':
      return { skipAggregation: true };
    case 'finalizer':
      // prerequisites missing → finalizer/missing-owner path without stage work
      return {};
    case 'serializer':
      return {};
    default: {
      const _exhaustive: never = failureClass;
      return _exhaustive;
    }
  }
}

/**
 * Assert v1 exact-ref + deep-exact survive every injected shadow failure class.
 */
export function assertV1ShadowFailClosedV2(options: {
  readonly input: CanonicalLocateExecutionV2;
  readonly capability: LocateProjectionExecutionCapabilityV2;
  /** missing-owner / finalizer path; must be a separately registered empty success. */
  readonly finalizerInput?: {
    readonly input: CanonicalLocateExecutionV2;
    readonly capability: LocateProjectionExecutionCapabilityV2;
  };
}): void {
  const projector = new V1LocateResultProjector();
  const baseline = projector.project(options.input, options.capability);
  expect(baseline).toBe(options.input.legacyV1Projection);
  const baselineBytes = JSON.stringify(baseline);

  for (const failureClass of V1_SHADOW_FAILURE_CLASSES_V2) {
    let serializeSpy: ReturnType<typeof vi.spyOn> | undefined;
    try {
      if (failureClass === 'serializer') {
        serializeSpy = vi
          .spyOn(
            trustedSerialized,
            'serializeTrustedMaterializedLocateResultV2',
          )
          .mockImplementation(() => {
            throw new Error('injected serializer failure');
          });
      }

      const shadowTarget =
        failureClass === 'finalizer' && options.finalizerInput !== undefined
          ? options.finalizerInput
          : { input: options.input, capability: options.capability };

      const shadow = createV2ShadowLocateProjectorV2().project(
        shadowTarget.input,
        shadowTarget.capability,
        createSyntheticLocateProjectionPreparationPortV2(
          preparationForFailure(failureClass),
        ),
      );
      expect(shadow.ok, `shadow should fail for ${failureClass}`).toBe(false);

      const after = projector.project(options.input, options.capability);
      expect(after, `exact ref after ${failureClass}`).toBe(
        options.input.legacyV1Projection,
      );
      expect(after, `exact ref equals baseline after ${failureClass}`).toBe(
        baseline,
      );
      expect(
        JSON.stringify(after),
        `deep-exact bytes after ${failureClass}`,
      ).toBe(baselineBytes);
    } finally {
      serializeSpy?.mockRestore();
    }
  }
}
