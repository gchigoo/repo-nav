/**
 * Test-only shadow harness: one executor invocation then v1/shadow projection.
 */

import type {
  CanonicalLocateExecutionV2,
  CanonicalLocateExecutorV2,
  LocateProjectionExecutionCapabilityV2,
  LocateResultProjector,
  LegacyV1LocateFailure,
  LegacyV1LocateSuccess,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import type {
  LocateExecutionContext,
  LocateRequest,
  LocateResult,
} from '../../contracts/index.js';
import { issueLocateProjectionExecutionCapabilityV2 } from '../locate-execution/locate-projection-execution-capability-v2.js';
import type { LocateProjectionPreparationPortV2 } from './locate-projection-preparation-port-v2.js';
import {
  createV2ShadowLocateProjectorV2,
  type V2ShadowProjectionAttemptV2,
} from './v2-shadow-locate-projector.js';

export interface CanonicalLocateShadowHarnessResultV2 {
  readonly capability: LocateProjectionExecutionCapabilityV2;
  readonly input: CanonicalLocateExecutionV2;
  readonly v1: LocateResult;
  readonly shadow: V2ShadowProjectionAttemptV2;
}

/**
 * Execute once, then project v1 and shadow against the same capability/input.
 */
export async function runCanonicalLocateShadowHarnessV2(options: {
  readonly executor: CanonicalLocateExecutorV2;
  readonly v1Projector: LocateResultProjector<
    LegacyV1LocateSuccess | LegacyV1LocateFailure
  >;
  readonly preparation: LocateProjectionPreparationPortV2;
  readonly request: LocateRequest;
  readonly context: LocateExecutionContext;
  readonly capability?: LocateProjectionExecutionCapabilityV2;
}): Promise<CanonicalLocateShadowHarnessResultV2> {
  const capability =
    options.capability ?? issueLocateProjectionExecutionCapabilityV2();
  const input = await options.executor.execute(
    options.request,
    options.context,
    capability,
  );
  const v1 = options.v1Projector.project(input, capability);
  const shadow = createV2ShadowLocateProjectorV2().project(
    input,
    capability,
    options.preparation,
  );
  return Object.freeze({ capability, input, v1, shadow });
}
