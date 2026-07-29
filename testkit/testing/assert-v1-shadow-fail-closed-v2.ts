/**
 * Post-F9 helper: shadow/stage failures must not mutate canonical execution input identity.
 * Legacy v1 projection lane was deleted; this only proves input object stability.
 */

import { expect, vi } from 'vitest';

import type {
  CanonicalLocateExecutionV2,
  LocateProjectionExecutionCapabilityV2,
} from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import * as trustedSerialized from '../../src/evidence/canonical/trusted-serialized-locate-result-v2.js';
import { createV2ShadowLocateProjectorV2 } from './v2-shadow-locate-projector-v2.js';
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
 * Assert canonical input object identity survives every injected shadow failure class.
 */
export function assertV1ShadowFailClosedV2(options: {
  readonly input: CanonicalLocateExecutionV2;
  readonly capability: LocateProjectionExecutionCapabilityV2;
  readonly finalizerInput?: {
    readonly input: CanonicalLocateExecutionV2;
    readonly capability: LocateProjectionExecutionCapabilityV2;
  };
}): void {
  const baselineBytes = JSON.stringify(options.input);

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
      expect(options.input, `input identity after ${failureClass}`).toBe(
        options.input,
      );
      expect(
        JSON.stringify(options.input),
        `input bytes after ${failureClass}`,
      ).toBe(baselineBytes);
    } finally {
      serializeSpy?.mockRestore();
    }
  }
}
