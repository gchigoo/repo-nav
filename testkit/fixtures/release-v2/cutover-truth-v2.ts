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

export const CUTOVER_REQUIRED_TOKEN_V2 =
  'ACCEPTED_COMPLETE_REAL_LOCATE_SHADOW_ORCHESTRATOR_V2' as const;

export const CUTOVER_DELETED_PRODUCTION_PATHS_V2 = Object.freeze([
  'src/evidence/locate-execution/v1-locate-result-projector.ts',
  'src/evidence/canonical/v2-shadow-locate-projector.ts',
  'src/evidence/public-output/synthetic-locate-projection-v2.ts',
] as const);
