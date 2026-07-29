/**
 * Testkit harness: assemble executor → v2 projector → application façade without Nest DI.
 */

import type {
  RepositoryReader,
  RepositorySearchBackend,
  RepositoryEvidenceService,
} from '../../src/contracts/index.js';
import { createAcceptedCompleteRealLocateShadowOrchestratorV2 } from '../../src/evidence/canonical/accepted-complete-real-locate-shadow-orchestrator-v2.js';
import { CanonicalRepositoryLocateExecutorV2 } from '../../src/evidence/locate-execution/canonical-locate-executor-v2.js';
import { PublicLocateExecutionApplicationServiceV2 } from '../../src/evidence/locate-execution/public-locate-execution-application-v2.js';
import { V2LocateResultProjector } from '../../src/evidence/locate-execution/v2-locate-result-projector.js';
import { RepositoryEvidenceEngine } from '../../src/evidence/repository-evidence-engine.js';

export interface CanonicalLocateEngineHarnessV2 {
  readonly executor: CanonicalRepositoryLocateExecutorV2;
  readonly projector: V2LocateResultProjector;
  readonly service: RepositoryEvidenceService;
  readonly application: PublicLocateExecutionApplicationServiceV2;
}

/**
 * Create the production wiring shape used by migrated constructor tests.
 */
export function createCanonicalLocateEngineHarnessV2(
  backends: readonly RepositorySearchBackend[],
  reader: RepositoryReader,
): CanonicalLocateEngineHarnessV2 {
  const executor = new CanonicalRepositoryLocateExecutorV2(backends, reader);
  const orchestrator = createAcceptedCompleteRealLocateShadowOrchestratorV2();
  const projector = new V2LocateResultProjector(orchestrator);
  const application = new PublicLocateExecutionApplicationServiceV2(
    executor,
    projector,
  );
  const service = new RepositoryEvidenceEngine(application);
  return Object.freeze({ executor, projector, service, application });
}
