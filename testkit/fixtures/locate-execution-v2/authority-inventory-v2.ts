export type LocatePublicFieldFinalOwnerV2 =
  'composition' | 'safe-error-serialization' | 'public-materialization';

export type LocatePublicResultBranchV2 = 'success' | 'error';

export interface LocatePublicFieldOwnerV2 {
  readonly ownerPath: `${LocatePublicResultBranchV2}.${string}`;
  readonly resultBranch: LocatePublicResultBranchV2;
  readonly field: string;
  readonly finalOwner: LocatePublicFieldFinalOwnerV2;
  readonly source: string;
  readonly symbol: string;
  readonly decisionOrigin:
    | 'composition'
    | 'safe-error-serialization'
    | 'public-materialization'
    | 'ranking'
    | 'backend-trace'
    | 'request-outcome'
    | 'snapshot'
    | 'scope'
    | 'capability';
  readonly note: string;
}

function defineFieldOwnersV2(
  fields: readonly string[],
  finalOwner: LocatePublicFieldFinalOwnerV2,
  source: string,
  symbol: string,
  decisionOrigin: LocatePublicFieldOwnerV2['decisionOrigin'],
  note: string,
  resultBranch: LocatePublicResultBranchV2 = 'success',
): readonly LocatePublicFieldOwnerV2[] {
  return Object.freeze(
    fields.map((field) =>
      Object.freeze({
        ownerPath: `${resultBranch}.${field}` as const,
        resultBranch,
        field,
        finalOwner,
        source,
        symbol,
        decisionOrigin,
        note,
      }),
    ),
  );
}

/**
 * Final owner means the last production symbol allowed to change a public
 * field's exact value, membership, or canonical order before strict schema validation.
 */
export const LOCATE_PUBLIC_FIELD_OWNER_DEFINITION_V2 =
  'final production symbol allowed to change exact public field value, membership, or canonical order before strict schema validation';

const LOCATE_PUBLIC_UNBRANCHED_FIELD_PATHS_V2 = Object.freeze([
  'evidence',
  'evidence.schemaVersion',
  'evidence.status',
  'evidence.repositoryRef',
  'evidence.normalizedTerms',
  'evidence.normalizedTerms[].value',
  'evidence.normalizedTerms[].caseSensitive',
  'evidence.confirmed',
  'evidence.candidates',
  'evidence.*[].evidenceClass',
  'evidence.*[].id',
  'evidence.*[].role',
  'evidence.*[].location',
  'evidence.*[].location.file',
  'evidence.*[].location.resolvable',
  'evidence.*[].location.symbol',
  'evidence.*[].location.lines',
  'evidence.*[].location.excerpt',
  'evidence.*[].location.redaction',
  'evidence.*[].location.redaction.applied',
  'evidence.*[].location.redaction.fields',
  'evidence.*[].location.redaction.fields[].field',
  'evidence.*[].location.redaction.fields[].reasonCodes',
  'evidence.*[].provenance',
  'evidence.*[].provenance.discoveredBy',
  'evidence.*[].provenance.verifiedBy',
  'evidence.*[].provenance.operations',
  'evidence.*[].reasonCodes',
  'evidence.candidates[].promotionRequirements',
  'evidence.coverage',
  'evidence.coverage.backends',
  'evidence.coverage.backends[].backend',
  'evidence.coverage.backends[].status',
  'evidence.coverage.backends[].completion',
  'evidence.coverage.backends[].termination',
  'evidence.coverage.backends[].reasonCode',
  'evidence.coverage.backends[].hitCount',
  'evidence.coverage.strategyComplete',
  'evidence.coverage.fallbackChecked',
  'evidence.coverage.indexState',
  'evidence.coverage.indexFreshness',
  'evidence.coverage.limitsReached',
  'evidence.coverage.degradations',
  'evidence.coverage.exclusionSummary',
  'evidence.coverage.abortSource',
  'evidence.coverage.unsatisfiedAnchors',
  'evidence.coverage.unsatisfiedAnchors[].requestIndex',
  'evidence.coverage.unsatisfiedAnchors[].kind',
  'evidence.coverage.unsatisfiedAnchors[].satisfaction',
  'evidence.coverage.unsatisfiedAnchors[].reason',
  'evidence.coverage.snapshot',
  'evidence.coverage.snapshot.gitState',
  'evidence.coverage.snapshot.consistency',
  'evidence.coverage.snapshot.filesChecked',
  'evidence.coverage.snapshot.discardedEvidenceCount',
  'evidence.coverage.snapshot.snapshotRef',
  'evidence.coverage.scope',
  'evidence.coverage.scope.requested',
  'evidence.coverage.scope.effective',
  'evidence.coverage.scope.policyVersion',
  'evidence.coverage.scope.unmatchedLayers',
  'evidence.coverage.capabilities',
  'evidence.coverage.capabilities.textSearch',
  'evidence.coverage.capabilities.semanticClassification',
  'evidence.coverage.capabilities.unsupportedLanguageHits',
  'evidence.nextActions',
  'error',
  'error.code',
  'error.message',
  'error.recoverable',
  'error.suggestedAction',
] as const);

export const LOCATE_PUBLIC_FIELD_PATHS_V2 = Object.freeze([
  'success.ok',
  ...LOCATE_PUBLIC_UNBRANCHED_FIELD_PATHS_V2.filter((field) =>
    field.startsWith('evidence'),
  ).map((field) => `success.${field}` as const),
  'error.ok',
  ...LOCATE_PUBLIC_UNBRANCHED_FIELD_PATHS_V2.filter((field) =>
    field.startsWith('error'),
  ).map((field) => `error.${field}` as const),
] as const);

export const LOCATE_PUBLIC_FIELD_OWNERS_V2 = Object.freeze([
  ...defineFieldOwnersV2(
    [
      'ok',
      'evidence',
      'evidence.schemaVersion',
      'evidence.status',
      'evidence.repositoryRef',
      'evidence.*[].id',
      'evidence.coverage',
    ],
    'composition',
    'src/evidence/canonical/materialized-locate-result-composer-v2.ts',
    'MaterializedLocateResultComposerV2Impl.compose',
    'composition',
    'Composer creates the public success envelope, re-derives status, and assigns IDs.',
  ),
  ...defineFieldOwnersV2(
    [
      'ok',
      'error',
      'error.code',
      'error.message',
      'error.recoverable',
      'error.suggestedAction',
    ],
    'safe-error-serialization',
    'src/evidence/canonical/trusted-serialized-locate-result-v2.ts',
    'createTrustedSerializedPublicToolErrorV2',
    'safe-error-serialization',
    'Trusted safe-error serialization creates the fixed public error object.',
    'error',
  ),
  ...defineFieldOwnersV2(
    [
      'evidence.normalizedTerms',
      'evidence.normalizedTerms[].value',
      'evidence.normalizedTerms[].caseSensitive',
      'evidence.*[].evidenceClass',
      'evidence.*[].role',
      'evidence.*[].location',
      'evidence.*[].location.file',
      'evidence.*[].location.resolvable',
      'evidence.*[].location.symbol',
      'evidence.*[].location.lines',
      'evidence.*[].location.excerpt',
      'evidence.*[].location.redaction',
      'evidence.*[].location.redaction.applied',
      'evidence.*[].location.redaction.fields',
      'evidence.*[].location.redaction.fields[].field',
      'evidence.*[].location.redaction.fields[].reasonCodes',
      'evidence.*[].provenance',
      'evidence.*[].provenance.discoveredBy',
      'evidence.*[].provenance.verifiedBy',
      'evidence.*[].provenance.operations',
    ],
    'public-materialization',
    'src/evidence/public-output/materialized-evidence-core-v2.ts',
    'materializePublicEvidenceV2',
    'public-materialization',
    'Materializer creates display-safe terms, locations, and evidence wrappers before registration.',
  ),
  ...defineFieldOwnersV2(
    ['evidence.confirmed', 'evidence.candidates'],
    'composition',
    'src/evidence/canonical/materialized-locate-result-composer-v2.ts',
    'MaterializedLocateResultComposerV2Impl.compose',
    'ranking',
    'Ranking selects membership and order; composer is the last stage that maps both arrays and assigns IDs.',
  ),
  ...defineFieldOwnersV2(
    ['evidence.*[].reasonCodes', 'evidence.candidates[].promotionRequirements'],
    'composition',
    'src/evidence/canonical/materialized-locate-result-composer-v2.ts',
    'MaterializedLocateResultComposerV2Impl.compose',
    'ranking',
    'Ranking supplies semantic codes; composer canonicalizes final public arrays.',
  ),
  ...defineFieldOwnersV2(
    [
      'evidence.coverage.backends',
      'evidence.coverage.backends[].backend',
      'evidence.coverage.backends[].status',
      'evidence.coverage.backends[].completion',
      'evidence.coverage.backends[].termination',
      'evidence.coverage.backends[].reasonCode',
      'evidence.coverage.backends[].hitCount',
      'evidence.coverage.strategyComplete',
      'evidence.coverage.fallbackChecked',
      'evidence.coverage.indexState',
      'evidence.coverage.indexFreshness',
      'evidence.coverage.limitsReached',
      'evidence.coverage.degradations',
      'evidence.coverage.exclusionSummary',
      'evidence.coverage.abortSource',
      'evidence.coverage.unsatisfiedAnchors',
      'evidence.coverage.unsatisfiedAnchors[].requestIndex',
      'evidence.coverage.unsatisfiedAnchors[].kind',
      'evidence.coverage.unsatisfiedAnchors[].satisfaction',
      'evidence.coverage.unsatisfiedAnchors[].reason',
    ],
    'composition',
    'src/evidence/canonical/materialized-locate-result-composer-v2.ts',
    'MaterializedLocateResultComposerV2Impl.compose',
    'request-outcome',
    'Backend trace, ranking, and request-outcome aggregation originate values; composer assembles coverage and canonicalizes limits, degradations, and exclusions.',
  ),
  ...defineFieldOwnersV2(
    [
      'evidence.coverage.snapshot',
      'evidence.coverage.snapshot.gitState',
      'evidence.coverage.snapshot.consistency',
      'evidence.coverage.snapshot.filesChecked',
      'evidence.coverage.snapshot.discardedEvidenceCount',
      'evidence.coverage.snapshot.snapshotRef',
    ],
    'composition',
    'src/evidence/canonical/materialized-locate-result-composer-v2.ts',
    'MaterializedLocateResultComposerV2Impl.compose',
    'snapshot',
    'Final snapshot check originates the snapshot object; composer installs it into public coverage.',
  ),
  ...defineFieldOwnersV2(
    [
      'evidence.coverage.scope',
      'evidence.coverage.scope.requested',
      'evidence.coverage.scope.effective',
      'evidence.coverage.scope.policyVersion',
      'evidence.coverage.scope.unmatchedLayers',
    ],
    'composition',
    'src/evidence/canonical/materialized-locate-result-composer-v2.ts',
    'MaterializedLocateResultComposerV2Impl.compose',
    'scope',
    'Scope coverage originates values; composer canonicalizes requested, effective, and unmatched layer order.',
  ),
  ...defineFieldOwnersV2(
    [
      'evidence.coverage.capabilities',
      'evidence.coverage.capabilities.textSearch',
      'evidence.coverage.capabilities.semanticClassification',
      'evidence.coverage.capabilities.unsupportedLanguageHits',
    ],
    'composition',
    'src/evidence/canonical/materialized-locate-result-composer-v2.ts',
    'MaterializedLocateResultComposerV2Impl.compose',
    'capability',
    'Capability coverage originates semantic facts; composer fixes the public text-search value and assembles the object.',
  ),
  ...defineFieldOwnersV2(
    ['evidence.nextActions'],
    'composition',
    'src/evidence/canonical/materialized-locate-result-composer-v2.ts',
    'MaterializedLocateResultComposerV2Impl.compose',
    'request-outcome',
    'Request-outcome policy creates actions; composer canonicalizes final public order.',
  ),
] as const satisfies readonly LocatePublicFieldOwnerV2[]);

export const LOCATE_UNMATERIALIZED_PUBLIC_SCHEMA_FIELDS_V2 = Object.freeze([
  Object.freeze({
    field: 'evidence.normalizedTerms[].redaction',
    schemaSource: 'src/contracts/v2/locate-result-v2.ts',
    schemaSymbol: 'PublicSearchTermV2Schema',
    productionSource:
      'src/evidence/public-output/materialized-evidence-core-v2.ts',
    productionSymbol: 'materializePublicEvidenceV2',
    currentBehavior:
      'production computes the replacement value but drops normalized-term redaction metadata',
  }),
  Object.freeze({
    field: 'evidence.normalizedTerms[].redaction.applied',
    schemaSource: 'src/contracts/v2/locate-result-v2.ts',
    schemaSymbol: 'PublicSearchTermV2Schema',
    productionSource:
      'src/evidence/public-output/materialized-evidence-core-v2.ts',
    productionSymbol: 'materializePublicEvidenceV2',
    currentBehavior:
      'production computes the replacement value but drops normalized-term redaction metadata',
  }),
  Object.freeze({
    field: 'evidence.normalizedTerms[].redaction.reasonCodes',
    schemaSource: 'src/contracts/v2/locate-result-v2.ts',
    schemaSymbol: 'PublicSearchTermV2Schema',
    productionSource:
      'src/evidence/public-output/materialized-evidence-core-v2.ts',
    productionSymbol: 'materializePublicEvidenceV2',
    currentBehavior:
      'production computes the replacement value but drops normalized-term redaction metadata',
  }),
] as const);

interface LocateAuthoritySourceV2 {
  readonly source: string;
  readonly symbol: string;
}

export interface LocateParallelAuthorityRowV2 {
  readonly decision: string;
  readonly legacyAuthority: readonly LocateAuthoritySourceV2[];
  readonly v2Authority: readonly LocateAuthoritySourceV2[];
}

export const LOCATE_PARALLEL_AUTHORITY_INVENTORY_V2 = Object.freeze([
  Object.freeze({
    decision: 'status',
    legacyAuthority: Object.freeze([
      Object.freeze({
        source: 'src/evidence/locate-status-evaluator.ts',
        symbol: 'evaluateLocateStatus',
      }),
      Object.freeze({
        source: 'src/evidence/request-snapshot/executor-snapshot-bridge-v2.ts',
        symbol: 'applyMutationStatusPrecedenceV2',
      }),
    ]),
    v2Authority: Object.freeze([
      Object.freeze({
        source: 'src/evidence/request-outcome/locate-status-v2.ts',
        symbol: 'deriveLocateStatusFromFactsV2',
      }),
      Object.freeze({
        source:
          'src/evidence/canonical/materialized-locate-result-composer-v2.ts',
        symbol: 'deriveLocateStatusV2',
      }),
    ]),
  }),
  Object.freeze({
    decision: 'next-actions',
    legacyAuthority: Object.freeze([
      Object.freeze({
        source: 'src/evidence/next-action-policy.ts',
        symbol: 'createNextActions',
      }),
    ]),
    v2Authority: Object.freeze([
      Object.freeze({
        source: 'src/evidence/request-outcome/next-action-policy-v2.ts',
        symbol: 'createNextActionsV2',
      }),
      Object.freeze({
        source:
          'src/evidence/canonical/materialized-locate-result-composer-v2.ts',
        symbol: 'canonicalizeCodes',
      }),
    ]),
  }),
  Object.freeze({
    decision: 'candidate-selection',
    legacyAuthority: Object.freeze([
      Object.freeze({
        source:
          'src/evidence/request-snapshot/legacy-candidate-reservation-v1.ts',
        symbol: 'LegacyCandidateReservationV1.reserve',
      }),
      Object.freeze({
        source: 'src/evidence/result-budget-selector.ts',
        symbol: 'selectCandidateBudget',
      }),
    ]),
    v2Authority: Object.freeze([
      Object.freeze({
        source: 'src/evidence/ranking/evidence-ranker-v2.ts',
        symbol: 'EvidenceRankerV2.rank',
      }),
      Object.freeze({
        source: 'src/evidence/locate-execution/resolve-verification-hits-v2.ts',
        symbol: 'resolveVerificationHitsV2',
      }),
    ]),
  }),
  Object.freeze({
    decision: 'snapshot-mutation',
    legacyAuthority: Object.freeze([
      Object.freeze({
        source: 'src/evidence/request-snapshot/executor-snapshot-bridge-v2.ts',
        symbol: 'purgeLegacyEvidenceByChangedKeysV2',
      }),
      Object.freeze({
        source: 'src/evidence/request-snapshot/executor-snapshot-bridge-v2.ts',
        symbol: 'applyMutationStatusPrecedenceV2',
      }),
    ]),
    v2Authority: Object.freeze([
      Object.freeze({
        source: 'src/evidence/request-snapshot/final-snapshot-check-v2.ts',
        symbol: 'runFinalSnapshotCheckV2',
      }),
    ]),
  }),
  Object.freeze({
    decision: 'evidence-materialization',
    legacyAuthority: Object.freeze([
      Object.freeze({
        source: 'src/evidence/candidate-policy/apply-candidate-policy.ts',
        symbol: 'materializeCandidateDraft',
      }),
    ]),
    v2Authority: Object.freeze([
      Object.freeze({
        source: 'src/evidence/public-output/materialized-evidence-core-v2.ts',
        symbol: 'materializePublicEvidenceV2',
      }),
      Object.freeze({
        source:
          'src/evidence/canonical/materialized-locate-result-composer-v2.ts',
        symbol: 'MaterializedLocateResultComposerV2Impl.compose',
      }),
    ]),
  }),
  Object.freeze({
    decision: 'schema-assembly',
    legacyAuthority: Object.freeze([
      Object.freeze({
        source: 'src/evidence/locate-execution/canonical-locate-executor-v2.ts',
        symbol: "schemaVersion: '1.0'",
      }),
    ]),
    v2Authority: Object.freeze([
      Object.freeze({
        source:
          'src/evidence/canonical/materialized-locate-result-composer-v2.ts',
        symbol: 'MaterializedLocateResultComposerV2Impl.compose',
      }),
      Object.freeze({
        source: 'src/contracts/v2/locate-result-v2.ts',
        symbol: 'LocateResultV2Schema',
      }),
      Object.freeze({
        source: 'src/evidence/canonical/trusted-serialized-locate-result-v2.ts',
        symbol: 'createTrustedSerializedPublicToolErrorV2',
      }),
    ]),
  }),
  Object.freeze({
    decision: 'serialization-transport',
    legacyAuthority: Object.freeze([
      Object.freeze({
        source: 'src/evidence/locate-execution/canonical-locate-executor-v2.ts',
        symbol: 'LocateResult',
      }),
    ]),
    v2Authority: Object.freeze([
      Object.freeze({
        source: 'src/evidence/canonical/trusted-serialized-locate-result-v2.ts',
        symbol: 'serializeTrustedMaterializedLocateResultV2',
      }),
      Object.freeze({
        source: 'src/evidence/canonical/trusted-serialized-locate-result-v2.ts',
        symbol: 'createTrustedSerializedPublicToolErrorV2',
      }),
      Object.freeze({
        source:
          'src/evidence/locate-execution/public-locate-transport-registry-v2.ts',
        symbol: 'requirePublicLocateTransportValueV2',
      }),
    ]),
  }),
] as const satisfies readonly LocateParallelAuthorityRowV2[]);

export const LOCATE_AUTHORITY_LAYER_INVENTORY_V2 = Object.freeze([
  Object.freeze({
    layer: 'schema-1.0-construction',
    source: 'src/evidence/locate-execution/canonical-locate-executor-v2.ts',
    symbols: Object.freeze([
      "schemaVersion: '1.0'",
      'evaluateLocateStatus',
      'createNextActions',
      'LegacyCandidateReservationV1',
    ]),
  }),
  Object.freeze({
    layer: 'fact-envelope',
    source: 'src/contracts/v2/locate-fact-envelope-v2.ts',
    symbols: Object.freeze([
      'createLocateFactEnvelopeBuilderV2',
      'inspectLocateProjectionPrerequisiteOwnersV2',
    ]),
  }),
  Object.freeze({
    layer: 'backend-trace',
    source: 'src/process/backend-execution-context-v2.ts',
    symbols: Object.freeze([
      'createBackendExecutionContextV2',
      'finalizeBackendExecutionTraceV2',
      'requireBackendExecutionTraceV2',
    ]),
  }),
  Object.freeze({
    layer: 'production-seam-registration',
    source:
      'src/evidence/locate-execution/register-production-accepted-projection-seams-v2.ts',
    symbols: Object.freeze(['registerProductionAcceptedProjectionSeamsV2']),
  }),
  Object.freeze({
    layer: 'f2-source-materialization-registration',
    source: 'src/evidence/public-output/f2-locate-projection-stages-v2.ts',
    symbols: Object.freeze([
      'createF2LocateProjectionStagesV2',
      'registerF2RankingOutcomeForExecutionV2',
    ]),
  }),
  Object.freeze({
    layer: 'projection-registries',
    source: 'src/evidence/canonical/locate-projection-stage-registrar-v2.ts',
    symbols: Object.freeze([
      'registerTrustedLocateProjectionSourceV2',
      'registerTrustedLocateProjectionMaterializationV2',
      'registerTrustedLocateProjectionAggregationV2',
    ]),
  }),
  Object.freeze({
    layer: 'request-outcome-aggregation',
    source: 'src/evidence/request-outcome/request-outcome-aggregator-v2.ts',
    symbols: Object.freeze(['aggregateRequestOutcomeV2']),
  }),
  Object.freeze({
    layer: 'accepted-aggregation-registration',
    source:
      'src/evidence/canonical/accepted-complete-real-locate-shadow-orchestrator-v2.ts',
    symbols: Object.freeze([
      'registerAcceptedCompleteRealAggregationBundleV2',
      'createAcceptedCompleteRealLocateShadowOrchestratorV2',
    ]),
  }),
  Object.freeze({
    layer: 'required-owner-finalization',
    source: 'src/evidence/canonical/required-owner-finalizer-v2.ts',
    symbols: Object.freeze(['createRequiredOwnerFinalizerV2']),
  }),
  Object.freeze({
    layer: 'public-composition',
    source: 'src/evidence/canonical/materialized-locate-result-composer-v2.ts',
    symbols: Object.freeze([
      'createMaterializedLocateResultComposerV2',
      'MaterializedLocateResultComposerV2Impl.compose',
    ]),
  }),
  Object.freeze({
    layer: 'schema-and-serialization',
    source: 'src/evidence/canonical/trusted-serialized-locate-result-v2.ts',
    symbols: Object.freeze([
      'validateComposedLocateResultV2ForSerialization',
      'serializeTrustedMaterializedLocateResultV2',
      'createTrustedSerializedPublicToolErrorV2',
    ]),
  }),
  Object.freeze({
    layer: 'public-transport-registry',
    source:
      'src/evidence/locate-execution/public-locate-transport-registry-v2.ts',
    symbols: Object.freeze([
      'promoteAcceptedCompleteRealLocateShadowV2',
      'promoteTrustedSerializedPublicToolErrorV2',
      'requirePublicLocateTransportValueV2',
    ]),
  }),
] as const);

export const C1_PRODUCTION_BOUNDARY_V2 = Object.freeze({
  executorAbi:
    'src/contracts/v2/locate-fact-envelope-v2.ts#CanonicalLocateExecutorV2.execute',
  productionExecutor:
    'src/evidence/locate-execution/canonical-locate-executor-v2.ts#CanonicalRepositoryLocateExecutorV2',
  productionProjector:
    'src/evidence/locate-execution/v2-locate-result-projector.ts#V2LocateResultProjector',
  internalLegacySchemaVersion: '1.0',
  publicSchemaVersion: '2.0',
  c1Disposition: 'characterize-only',
  forbiddenC1Changes: Object.freeze([
    'LocateExecutionFactsV2',
    'executor-abi-change',
    'production-authority-cutover',
    'schema-1.0-removal',
  ] as const),
} as const);
