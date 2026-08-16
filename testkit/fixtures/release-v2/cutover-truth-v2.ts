/**
 * F9-CUTOVER-001 fixture: production projector cutover invariants.
 */
export const CUTOVER_FORBIDDEN_IMPORTS_V2 = Object.freeze([
  'createAcceptedCompleteRealLocateShadowOrchestratorV2',
  'createRequiredOwnerFinalizerV2',
  'createMaterializedLocateResultComposerV2',
  'V1LocateResultProjector',
  'legacyV1Projection',
] as const);

export const CUTOVER_REQUIRED_SYMBOLS_V2 = Object.freeze([
  'finalizeLocateResultV2',
  'requireCanonicalLocateExecutionInputV2',
] as const);

export const CUTOVER_DELETED_PRODUCTION_PATHS_V2 = Object.freeze([
  'src/evidence/canonical/accepted-complete-real-locate-shadow-orchestrator-v2.ts',
  'src/evidence/canonical/locate-projection-preparation-port-v2.ts',
  'src/evidence/canonical/locate-projection-stage-registrar-v2.ts',
  'src/evidence/canonical/materialized-locate-result-composer-v2.ts',
  'src/evidence/canonical/required-owner-finalizer-v2.ts',
  'src/evidence/canonical/trusted-serialized-locate-result-v2.ts',
  'src/evidence/locate-execution/public-locate-transport-registry-v2.ts',
  'src/evidence/locate-execution/register-production-accepted-projection-seams-v2.ts',
  'src/evidence/public-output/f2-locate-projection-stages-v2.ts',
  'src/evidence/public-output/materialized-evidence-core-v2.ts',
  'src/evidence/public-output/public-result-assembler-v2.ts',
] as const);
