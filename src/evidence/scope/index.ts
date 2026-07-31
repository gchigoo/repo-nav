export { asciiLowercaseCodeUnitsV1 } from './ascii-lowercase-v1.js';
export {
  LEGACY_DOCS_EXTENSIONS_V1,
  LEGACY_DOCS_SEGMENTS_V1,
  LEGACY_TEST_SEGMENTS_V1,
  LEGACY_TOP_LEVEL_LAYERS_V1,
  legacyResolveRepositoryLayerV1,
} from './legacy-resolve-repository-layer-v1.js';
export {
  DEFAULT_EFFECTIVE_SCOPE_V1,
  resolveRepositoryScopeV1,
  unmatchedLayersFromMatchedV1,
  type ResolvedRepositoryScopeV1,
} from './resolve-repository-scope-v1.js';
export {
  createRepositoryScopePolicyV1,
  decideRepositoryScopeV1,
  pathViewFromPosixPathV1,
  resolveRepositoryLayerV1,
  RepositoryScopePolicyV1Impl,
  type RepositoryScopeDecisionV1,
  type RepositoryScopePolicyV1,
  type RepositoryScopeRuleV1,
  type ScopeConfirmationModeV1,
  type VerifiedScopePolicyPathViewV2,
} from './repository-scope-policy-v1.js';
export {
  ScopeOutcomeContributionV2Schema,
  buildScopeCoverageV1,
  requireScopeCoverageFactsV1,
  requireScopeOutcomeContributionV2,
  ScopeCoverageInvariantError,
  type ScopeCoverageFactsV1,
  type ScopeCoverageFactsViewV1,
  type ScopeCoverageFragmentV1,
  type ScopeCoverageProofV1,
  type ScopeOutcomeContributionV2,
} from './scope-coverage-v1.js';
export {
  buildExecutionScopeCoverageMountV1,
  type ExecutionScopeCoverageMountV1,
} from './build-execution-scope-coverage-v1.js';
export {
  createScopeBoundProducerRegistrarV2,
  createDirectClassifierScopeProducerPortV2,
  createCandidateCollectorScopeProducerPortV2,
  issueScopeBoundProducerChildPortAdmissionV2,
  registerScopeBoundProducerChildPortV2,
  registerScopeBoundProducerSourceV2,
  sealScopeBoundProducerRecordSetV2,
  arbitrateScopeBoundEvidenceProducerV2,
  requireScopeBoundProducerArbitrationV2,
  createTrustedPreFinalScopeClassificationViewForTestV2,
  ScopeProducerSourceInvariantError,
  type ScopeBoundProducerRegistrarV2,
  type RegisteredScopeBoundProducerPortV2,
  type ScopeBoundProducerArbitrationV2,
  type ScopeBoundProducerKindV2,
  type ScopeBoundProducerOwnerV2,
  type TrustedPreFinalScopeClassificationViewV2,
} from './scope-bound-producer-registrar-v2.js';
export {
  materializeScopeBoundEvidenceV2,
  readScopeBoundDraftMapperCallCountForTestV2,
  resetScopeBoundDraftMapperCallCountForTestV2,
} from './scope-bound-evidence-materializer-v2.js';
export {
  createScopeBoundProducerCompositionRootV2,
  classifyDiscoveryRecordsThroughScopeBoundProducersV2,
  type ScopeBoundProducerCompositionRootV2,
} from './scope-bound-classification-bridge-v2.js';
export {
  requirePreFinalScopeDecisionV1,
  requireLegacyScopeDecisionV1,
  requireStableScopeDecisionV1,
  type TrustedLegacyScopeClassificationViewV2,
  type TrustedStableEligibleScopeViewV2,
} from './scope-decision-accessors-v1.js';
