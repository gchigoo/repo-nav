export type LocatePublicResultBranchV2 = 'success' | 'error';

export interface LocatePublicFieldOwnerV2 {
  readonly ownerPath: `${LocatePublicResultBranchV2}.${string}`;
  readonly resultBranch: LocatePublicResultBranchV2;
  readonly field: string;
  readonly finalOwner: 'pure-finalizer';
  readonly source: string;
  readonly symbol: string;
  readonly decisionOrigin:
    | 'finalizer'
    | 'ranking'
    | 'backend-trace'
    | 'snapshot'
    | 'scope'
    | 'capability';
  readonly note: string;
}

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

function originForFieldV2(
  field: string,
): LocatePublicFieldOwnerV2['decisionOrigin'] {
  if (field.includes('coverage.backends')) return 'backend-trace';
  if (field.includes('coverage.snapshot')) return 'snapshot';
  if (field.includes('coverage.scope')) return 'scope';
  if (field.includes('coverage.capabilities')) return 'capability';
  if (
    field.includes('confirmed') ||
    field.includes('candidates') ||
    field.includes('unsatisfiedAnchors')
  ) {
    return 'ranking';
  }
  return 'finalizer';
}

export const LOCATE_PUBLIC_FIELD_OWNERS_V2 = Object.freeze(
  LOCATE_PUBLIC_FIELD_PATHS_V2.map((ownerPath): LocatePublicFieldOwnerV2 => {
    const resultBranch = ownerPath.startsWith('success.')
      ? ('success' as const)
      : ('error' as const);
    const field = ownerPath.slice(ownerPath.indexOf('.') + 1);
    return Object.freeze({
      ownerPath,
      resultBranch,
      field,
      finalOwner: 'pure-finalizer' as const,
      source: 'src/evidence/locate-execution/finalize-locate-result-v2.ts',
      symbol: 'finalizeLocateResultV2',
      decisionOrigin: originForFieldV2(field),
      note: 'The pure finalizer is the only production owner that assembles, canonicalizes, validates, serializes, or returns this public field.',
    });
  }),
);

export const LOCATE_UNMATERIALIZED_PUBLIC_SCHEMA_FIELDS_V2 = Object.freeze(
  [
    'evidence.normalizedTerms[].redaction',
    'evidence.normalizedTerms[].redaction.applied',
    'evidence.normalizedTerms[].redaction.reasonCodes',
  ].map((field) =>
    Object.freeze({
      field,
      schemaSource: 'src/contracts/v2/locate-result-v2.ts',
      schemaSymbol: 'PublicSearchTermV2Schema',
      productionSource:
        'src/evidence/locate-execution/finalize-locate-result-v2.ts',
      productionSymbol: 'publicTermsV2',
      currentBehavior:
        'production computes the replacement value but drops normalized-term redaction metadata',
    }),
  ),
);

interface LocateAuthoritySourceV2 {
  readonly source: string;
  readonly symbol: string;
}

export interface LocateParallelAuthorityRowV2 {
  readonly decision: string;
  readonly legacyAuthority: readonly LocateAuthoritySourceV2[];
  readonly v2Authority: readonly LocateAuthoritySourceV2[];
}

const FINALIZER_AUTHORITY_V2 = Object.freeze({
  source: 'src/evidence/locate-execution/finalize-locate-result-v2.ts',
  symbol: 'finalizeLocateResultV2',
});

export const LOCATE_PARALLEL_AUTHORITY_INVENTORY_V2 = Object.freeze(
  [
    'status',
    'next-actions',
    'candidate-selection',
    'snapshot-mutation',
    'evidence-materialization',
    'schema-assembly',
    'serialization-transport',
  ].map((decision) =>
    Object.freeze({
      decision,
      legacyAuthority: Object.freeze([]),
      v2Authority: Object.freeze([FINALIZER_AUTHORITY_V2]),
    }),
  ),
);

export const LOCATE_AUTHORITY_LAYER_INVENTORY_V2 = Object.freeze([
  Object.freeze({
    layer: 'canonical-executor-abi',
    source: 'src/contracts/v2/canonical-locate-execution-v2.ts',
    symbols: Object.freeze(['CanonicalLocateExecutionV2']),
  }),
  Object.freeze({
    layer: 'plain-facts-contract',
    source: 'src/contracts/v2/locate-execution-facts-v2.ts',
    symbols: Object.freeze(['LocateExecutionFactsV2']),
  }),
  Object.freeze({
    layer: 'canonical-facts-builder',
    source: 'src/evidence/locate-execution/locate-execution-draft-v2.ts',
    symbols: Object.freeze(['createLocateExecutionFactsFromDraftV2']),
  }),
  Object.freeze({
    layer: 'pure-finalizer',
    source: 'src/evidence/locate-execution/finalize-locate-result-v2.ts',
    symbols: Object.freeze(['finalizeLocateResultV2']),
  }),
  Object.freeze({
    layer: 'canonical-projector',
    source: 'src/evidence/locate-execution/v2-locate-result-projector.ts',
    symbols: Object.freeze(['V2LocateResultProjector']),
  }),
  Object.freeze({
    layer: 'flat-application-transport',
    source:
      'src/evidence/locate-execution/public-locate-execution-application-v2.ts',
    symbols: Object.freeze(['PublicLocateExecutionApplicationServiceV2']),
  }),
  Object.freeze({
    layer: 'runtime-capability-binding',
    source:
      'src/evidence/locate-execution/locate-projection-execution-capability-v2.ts',
    symbols: Object.freeze([
      'createCanonicalLocateExecutionReceiptV2',
      'requireCanonicalLocateExecutionInputV2',
    ]),
  }),
] as const);

export const C3_C4_CUTOVER_BOUNDARY_V2 = Object.freeze({
  executorAbi:
    'src/contracts/v2/canonical-locate-execution-v2.ts#CanonicalLocateExecutorV2.execute',
  productionExecutor:
    'src/evidence/locate-execution/canonical-locate-executor-v2.ts#CanonicalRepositoryLocateExecutorV2',
  productionProjector:
    'src/evidence/locate-execution/v2-locate-result-projector.ts#V2LocateResultProjector',
  factsContract:
    'src/contracts/v2/locate-execution-facts-v2.ts#LocateExecutionFactsV2',
  pureFinalizer:
    'src/evidence/locate-execution/finalize-locate-result-v2.ts#finalizeLocateResultV2',
  publicSchemaVersion: '2.0',
  disposition: 'production-authority',
  transportShape: Object.freeze(['value', 'compactJson', 'utf8Bytes']),
});
