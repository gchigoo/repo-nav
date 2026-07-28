/**
 * Testkit harness: assemble executor → v1 projector → façade without Nest DI.
 */

import type {
  RepositoryReader,
  RepositorySearchBackend,
  RepositoryEvidenceService,
} from '../../src/contracts/index.js';
import { CanonicalRepositoryLocateExecutorV2 } from '../../src/evidence/locate-execution/canonical-locate-executor-v2.js';
import { V1LocateResultProjector } from '../../src/evidence/locate-execution/v1-locate-result-projector.js';
import { RepositoryEvidenceEngine } from '../../src/evidence/repository-evidence-engine.js';

export interface CanonicalLocateEngineHarnessV2 {
  readonly executor: CanonicalRepositoryLocateExecutorV2;
  readonly projector: V1LocateResultProjector;
  readonly service: RepositoryEvidenceService;
}

/**
 * Create the production wiring shape used by migrated constructor tests.
 */
export function createCanonicalLocateEngineHarnessV2(
  backends: readonly RepositorySearchBackend[],
  reader: RepositoryReader,
): CanonicalLocateEngineHarnessV2 {
  const executor = new CanonicalRepositoryLocateExecutorV2(backends, reader);
  const projector = new V1LocateResultProjector();
  const service = new RepositoryEvidenceEngine(executor, projector);
  return Object.freeze({ executor, projector, service });
}
