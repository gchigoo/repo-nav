/**
 * Test-only harness: one executor invocation then production v2 + preparation shadow.
 */

import type {
  CanonicalLocateExecutionV2,
  CanonicalLocateExecutorV2,
  LocateProjectionExecutionCapabilityV2,
} from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import type {
  LocateExecutionContext,
  LocateRequest,
} from '../../src/contracts/index.js';
import { createAcceptedCompleteRealLocateShadowOrchestratorV2 } from '../../src/evidence/canonical/accepted-complete-real-locate-shadow-orchestrator-v2.js';
import type { LocateProjectionPreparationPortV2 } from '../../src/evidence/canonical/locate-projection-preparation-port-v2.js';
import { issueLocateProjectionExecutionCapabilityV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import type { TrustedPublicLocateTransportBundleV2 } from '../../src/evidence/locate-execution/public-locate-transport-registry-v2.js';
import { V2LocateResultProjector } from '../../src/evidence/locate-execution/v2-locate-result-projector.js';
import {
  createV2ShadowLocateProjectorV2,
  type V2ShadowProjectionAttemptV2,
} from './v2-shadow-locate-projector-v2.js';

export interface CanonicalLocateShadowHarnessResultV2 {
  readonly capability: LocateProjectionExecutionCapabilityV2;
  readonly input: CanonicalLocateExecutionV2;
  readonly production: TrustedPublicLocateTransportBundleV2;
  readonly shadow: V2ShadowProjectionAttemptV2;
}

/**
 * Execute once, then project production v2 and preparation-port shadow.
 */
export async function runCanonicalLocateShadowHarnessV2(options: {
  readonly executor: CanonicalLocateExecutorV2;
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
  const projector = new V2LocateResultProjector(
    createAcceptedCompleteRealLocateShadowOrchestratorV2(),
  );
  const production = projector.project(input, capability);
  const shadow = createV2ShadowLocateProjectorV2().project(
    input,
    capability,
    options.preparation,
  );
  return Object.freeze({ capability, input, production, shadow });
}
