export const LOCATE_EXECUTION_FACT_FAMILIES_V2 = Object.freeze([
  'backend',
  'snapshot',
  'ranking',
  'scope',
  'capability',
  'abort',
] as const);

export type LocateExecutionFactFamilyV2 =
  (typeof LOCATE_EXECUTION_FACT_FAMILIES_V2)[number];

type DeepReadonlyTuplePlainV2<T extends readonly unknown[]> = {
  readonly [K in keyof T]: DeepReadonlyPlainV2<T[K]>;
};

type DeepReadonlyPlainV2<T> = T extends (...args: never[]) => unknown
  ? never
  : T extends readonly [infer THead, ...infer TTail]
    ? readonly [DeepReadonlyPlainV2<THead>, ...DeepReadonlyTuplePlainV2<TTail>]
    : T extends readonly (infer TItem)[]
      ? readonly DeepReadonlyPlainV2<TItem>[]
      : T extends object
        ? { readonly [K in keyof T]: DeepReadonlyPlainV2<T[K]> }
        : T;

export type LocateExecutionSearchBackendIdV2 = 'codegraph' | 'ripgrep';
export type LocateExecutionBackendOutcomeV2 = 'used' | 'unavailable' | 'failed';
export type LocateExecutionBackendCompletionV2 = 'complete' | 'incomplete';
export type LocateExecutionBackendTerminationV2 =
  | 'none'
  | 'timeout'
  | 'output-limit'
  | 'early-stop'
  | 'aborted'
  | 'process-error';
export type LocateExecutionBackendReasonCodeV2 =
  | 'CODEGRAPH_INDEX_MISSING'
  | 'CODEGRAPH_UNAVAILABLE'
  | 'CODEGRAPH_NO_RESULT'
  | 'RIPGREP_UNAVAILABLE'
  | 'RIPGREP_NO_RESULT'
  | 'BACKEND_PROCESS_FAILED'
  | 'BACKEND_ABORTED';

export interface LocateExecutionBackendAttemptFactsV2 {
  readonly sequence: number;
  readonly backend: LocateExecutionSearchBackendIdV2;
  readonly outcome: LocateExecutionBackendOutcomeV2;
  readonly completion: LocateExecutionBackendCompletionV2;
  readonly termination: LocateExecutionBackendTerminationV2;
  readonly observedHitCount: number;
  readonly reasonCode?: LocateExecutionBackendReasonCodeV2;
}

export interface LocateExecutionIndexObservationFactsV2 {
  readonly state: 'available' | 'missing' | 'unavailable' | 'error' | 'unknown';
  readonly freshness: 'not-applicable' | 'unknown' | 'possibly-stale';
}

export interface LocateExecutionBackendFactsV2 {
  readonly attempts: readonly LocateExecutionBackendAttemptFactsV2[];
  readonly index: LocateExecutionIndexObservationFactsV2;
  readonly codegraphInitializationSuggested: boolean;
}

export interface LocateExecutionSnapshotReadFactsV2 {
  readonly maximumFilesReached: boolean;
  readonly maximumFileBytesReached: boolean;
  readonly maximumExcerptBytesReached: boolean;
}

export interface LocateExecutionSnapshotFactsV2 {
  readonly gitState: 'clean' | 'dirty' | 'not-git' | 'unknown';
  readonly consistency: 'stable' | 'changed' | 'unknown';
  readonly filesChecked: number;
  readonly discardedEvidenceCount: number;
  readonly changedEvidenceExclusions: number;
  readonly read: LocateExecutionSnapshotReadFactsV2;
  readonly snapshotRef?: string;
}

export interface LocateExecutionNormalizedTermV2 {
  readonly value: string;
  readonly caseSensitive: boolean;
}

export type LocateExecutionEvidenceRoleV2 =
  'execution-site' | 'value-mapping' | 'definition' | 'reference' | 'related';
export type LocateExecutionEvidenceSourceV2 =
  'codegraph' | 'ripgrep' | 'filesystem';
export type LocateExecutionEvidenceOperationV2 =
  | 'CODEGRAPH_QUERY'
  | 'RIPGREP_SEARCH'
  | 'FILESYSTEM_READ_RANGE'
  | 'FILESYSTEM_FIND_MATCHES';
export type LocateExecutionConfirmedReasonCodeV2 =
  'EXACT_TERM_MATCH' | 'EXACT_SYMBOL_ANCHOR' | 'DIRECT_ALIAS_MAPPING';
export type LocateExecutionCandidateReasonCodeV2 =
  | 'EXACT_TERM_WITHOUT_DIRECT_MAPPING'
  | 'SYMBOL_REFERENCE_ONLY'
  | 'SAME_SCOPE_SIMILAR_IDENTIFIER'
  | 'SAME_ENTITY_SIBLING'
  | 'ALIAS_SOURCE_NEIGHBOR'
  | 'SECONDARY_BACKEND_HIT'
  | 'UNSUPPORTED_LANGUAGE_LITERAL';
export type LocateExecutionPromotionRequirementV2 =
  | 'USER_SEMANTIC_CONFIRMATION'
  | 'DIRECT_REFERENCE_REQUIRED'
  | 'CALL_PATH_REQUIRED'
  | 'SUPPORTED_LANGUAGE_ADAPTER_REQUIRED';

export interface LocateExecutionRawEvidenceLocationV2 {
  readonly file: string;
  readonly lines: readonly [number, number];
  readonly excerpt: string;
  readonly symbol?: string;
}

export interface LocateExecutionRawEvidenceProvenanceV2 {
  readonly discoveredBy: readonly LocateExecutionEvidenceSourceV2[];
  readonly operations: readonly LocateExecutionEvidenceOperationV2[];
}

export interface LocateExecutionRawConfirmedEvidenceV2 {
  readonly evidenceClass: 'confirmed';
  readonly role: LocateExecutionEvidenceRoleV2;
  readonly location: LocateExecutionRawEvidenceLocationV2;
  readonly provenance: LocateExecutionRawEvidenceProvenanceV2;
  readonly reasonCodes: readonly LocateExecutionConfirmedReasonCodeV2[];
}

export interface LocateExecutionRawCandidateEvidenceV2 {
  readonly evidenceClass: 'candidate';
  readonly role: LocateExecutionEvidenceRoleV2;
  readonly location: LocateExecutionRawEvidenceLocationV2;
  readonly provenance: LocateExecutionRawEvidenceProvenanceV2;
  readonly reasonCodes: readonly LocateExecutionCandidateReasonCodeV2[];
  readonly promotionRequirements: readonly LocateExecutionPromotionRequirementV2[];
}

export type LocateExecutionAnchorKindV2 =
  'symbol' | 'file' | 'table' | 'route' | 'term';

export interface LocateExecutionUnsatisfiedAnchorV2 {
  readonly requestIndex: number;
  readonly kind: LocateExecutionAnchorKindV2;
  readonly satisfaction: 'candidate' | 'none';
  readonly reason: 'BUDGET_EXCEEDED' | 'NOT_FOUND' | 'UNVERIFIED';
}

export interface LocateExecutionRankingBudgetFactsV2 {
  readonly maximumConfirmedReached: boolean;
  readonly maximumCandidatesReached: boolean;
}

export interface LocateExecutionRankingExclusionFactsV2 {
  readonly negativeTermMatches: number;
  readonly duplicateLocations: number;
  readonly unverifiedFileContent: number;
}

export interface LocateExecutionRankingFactsV2 {
  readonly confirmed: readonly LocateExecutionRawConfirmedEvidenceV2[];
  readonly candidates: readonly LocateExecutionRawCandidateEvidenceV2[];
  readonly unsatisfiedAnchors: readonly LocateExecutionUnsatisfiedAnchorV2[];
  readonly budget: LocateExecutionRankingBudgetFactsV2;
  readonly exclusions: LocateExecutionRankingExclusionFactsV2;
}

export type LocateExecutionRepoLayerV2 =
  'client' | 'server' | 'db' | 'test' | 'docs' | 'config' | 'unknown';

export interface LocateExecutionScopeFactsV2 {
  readonly requested: readonly LocateExecutionRepoLayerV2[];
  readonly effective: readonly LocateExecutionRepoLayerV2[];
  readonly unmatchedLayers: readonly LocateExecutionRepoLayerV2[];
  readonly policy: 'repo-scope-v1';
  readonly outsideLayerHintExclusions: number;
}

export interface LocateExecutionCapabilityFactsV2 {
  readonly semanticLanguages: readonly ['typescript', 'javascript', 'sql'];
  readonly unsupportedLanguageHits: number;
}

export interface LocateExecutionAbortFactsV2 {
  readonly source: 'none' | 'caller' | 'deadline';
}

export interface LocateExecutionFactsInitV2 {
  readonly backend: LocateExecutionBackendFactsV2;
  readonly snapshot: LocateExecutionSnapshotFactsV2;
  readonly ranking: LocateExecutionRankingFactsV2;
  readonly scope: LocateExecutionScopeFactsV2;
  readonly capability: LocateExecutionCapabilityFactsV2;
  readonly abort: LocateExecutionAbortFactsV2;
}

export type LocateExecutionFactsV2 =
  DeepReadonlyPlainV2<LocateExecutionFactsInitV2>;

export interface LocateExecutionResolvedLimitsV2 {
  readonly maxFiles: number;
  readonly maxConfirmed: number;
  readonly maxCandidates: number;
  readonly timeoutMs: number;
}

export type LocateExecutionErrorCodeV2 =
  | 'INVALID_INPUT'
  | 'INVALID_REPOSITORY'
  | 'PATH_OUTSIDE_ROOT'
  | 'INTERNAL_ERROR';

export interface LocateExecutionErrorFactsV2 {
  readonly code: LocateExecutionErrorCodeV2;
  readonly suggestedAction?: 'ADD_TERM';
}

export type FinalizeLocateResultInputV2 =
  | Readonly<{
      ok: true;
      repositoryRoot: string;
      normalizedTerms: readonly LocateExecutionNormalizedTermV2[];
      resolvedLimits: LocateExecutionResolvedLimitsV2;
      facts: LocateExecutionFactsV2;
    }>
  | Readonly<{
      ok: false;
      error: LocateExecutionErrorFactsV2;
    }>;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function ownStringKeys(value: object): string[] {
  const keys: string[] = [];
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === 'symbol') {
      throw new TypeError('LocateExecutionFactsV2 must not contain symbols.');
    }
    keys.push(key);
  }
  return keys;
}

function assertKeys(
  value: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[],
  label: string,
): asserts value is Record<string, unknown> {
  if (!isPlainRecord(value)) {
    throw new TypeError(`${label} must be plain data.`);
  }
  const keys = ownStringKeys(value);
  const allowed = new Set([...requiredKeys, ...optionalKeys]);
  for (const key of requiredKeys) {
    if (!Object.hasOwn(value, key)) {
      throw new TypeError(`${label} must contain every required field.`);
    }
  }
  if (keys.some((key) => !allowed.has(key))) {
    throw new TypeError(`${label} contains an unsupported field.`);
  }
}

function assertExactKeys(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): asserts value is Record<string, unknown> {
  assertKeys(value, expectedKeys, [], label);
  if (ownStringKeys(value).length !== expectedKeys.length) {
    throw new TypeError(`${label} must contain exactly the required fields.`);
  }
}

function assertArray(
  value: unknown,
  label: string,
): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array.`);
  }
}

function forEachArrayItem(
  value: unknown,
  label: string,
  visitor: (item: unknown, itemLabel: string) => void,
): void {
  assertArray(value, label);
  for (let index = 0; index < value.length; index += 1) {
    visitor(value[index], `${label}[${String(index)}]`);
  }
}

function readPlainDataDescriptor(
  value: object,
  key: string,
): PropertyDescriptor & { readonly value: unknown } {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (
    descriptor === undefined ||
    !descriptor.enumerable ||
    !('value' in descriptor) ||
    ('get' in descriptor && descriptor.get !== undefined) ||
    ('set' in descriptor && descriptor.set !== undefined) ||
    descriptor.value === undefined
  ) {
    throw new TypeError('LocateExecutionFactsV2 must contain data fields.');
  }
  return descriptor as PropertyDescriptor & { readonly value: unknown };
}

function clonePlainReadonlyV2<T>(value: T): DeepReadonlyPlainV2<T> {
  if (
    typeof value === 'undefined' ||
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    typeof value === 'bigint'
  ) {
    throw new TypeError('LocateExecutionFactsV2 must be JSON-like data.');
  }
  if (typeof value !== 'object' || value === null) {
    return value as DeepReadonlyPlainV2<T>;
  }
  if (Array.isArray(value)) {
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === 'symbol') {
        throw new TypeError('LocateExecutionFactsV2 arrays must be plain.');
      }
      if (key === 'length') {
        continue;
      }
      const index = Number(key);
      if (
        !Number.isInteger(index) ||
        String(index) !== key ||
        index < 0 ||
        index >= value.length
      ) {
        throw new TypeError('LocateExecutionFactsV2 arrays must be dense.');
      }
    }
    const output: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) {
        throw new TypeError('LocateExecutionFactsV2 arrays must be dense.');
      }
      output.push(
        clonePlainReadonlyV2(
          readPlainDataDescriptor(value, String(index)).value,
        ),
      );
    }
    return Object.freeze(output) as DeepReadonlyPlainV2<T>;
  }
  if (!isPlainRecord(value)) {
    throw new TypeError('LocateExecutionFactsV2 must be plain data.');
  }
  const output: Record<string, unknown> = {};
  for (const key of ownStringKeys(value)) {
    output[key] = clonePlainReadonlyV2(
      readPlainDataDescriptor(value, key).value,
    );
  }
  return Object.freeze(output) as DeepReadonlyPlainV2<T>;
}

export function assertLocateExecutionFactFamilySetV2(
  families: readonly string[],
): void {
  const expected = LOCATE_EXECUTION_FACT_FAMILIES_V2;
  if (families.length !== expected.length) {
    throw new TypeError('LocateExecutionFactsV2 family set is incomplete.');
  }
  const seen = new Set<string>();
  for (const family of families) {
    if (!(expected as readonly string[]).includes(family) || seen.has(family)) {
      throw new TypeError('LocateExecutionFactsV2 family set is invalid.');
    }
    seen.add(family);
  }
}

function assertAttemptShape(value: unknown, label: string): void {
  assertKeys(
    value,
    [
      'sequence',
      'backend',
      'outcome',
      'completion',
      'termination',
      'observedHitCount',
    ],
    ['reasonCode'],
    label,
  );
}

function assertRawLocationShape(value: unknown, label: string): void {
  assertKeys(value, ['file', 'lines', 'excerpt'], ['symbol'], label);
}

function assertRawProvenanceShape(value: unknown, label: string): void {
  assertExactKeys(value, ['discoveredBy', 'operations'], label);
}

function assertConfirmedShape(value: unknown, label: string): void {
  assertExactKeys(
    value,
    ['evidenceClass', 'role', 'location', 'provenance', 'reasonCodes'],
    label,
  );
  assertRawLocationShape(value.location, `${label}.location`);
  assertRawProvenanceShape(value.provenance, `${label}.provenance`);
}

function assertCandidateShape(value: unknown, label: string): void {
  assertExactKeys(
    value,
    [
      'evidenceClass',
      'role',
      'location',
      'provenance',
      'reasonCodes',
      'promotionRequirements',
    ],
    label,
  );
  assertRawLocationShape(value.location, `${label}.location`);
  assertRawProvenanceShape(value.provenance, `${label}.provenance`);
}

function assertFactsShape(input: LocateExecutionFactsInitV2): void {
  assertExactKeys(
    input,
    ['backend', 'snapshot', 'ranking', 'scope', 'capability', 'abort'],
    'LocateExecutionFactsV2',
  );
  assertExactKeys(
    input.backend,
    ['attempts', 'index', 'codegraphInitializationSuggested'],
    'backend',
  );
  forEachArrayItem(
    input.backend.attempts,
    'backend.attempts',
    assertAttemptShape,
  );
  assertExactKeys(input.backend.index, ['state', 'freshness'], 'backend.index');
  assertKeys(
    input.snapshot,
    [
      'gitState',
      'consistency',
      'filesChecked',
      'discardedEvidenceCount',
      'changedEvidenceExclusions',
      'read',
    ],
    ['snapshotRef'],
    'snapshot',
  );
  assertExactKeys(
    input.snapshot.read,
    [
      'maximumFilesReached',
      'maximumFileBytesReached',
      'maximumExcerptBytesReached',
    ],
    'snapshot.read',
  );
  assertExactKeys(
    input.ranking,
    ['confirmed', 'candidates', 'unsatisfiedAnchors', 'budget', 'exclusions'],
    'ranking',
  );
  forEachArrayItem(
    input.ranking.confirmed,
    'ranking.confirmed',
    assertConfirmedShape,
  );
  forEachArrayItem(
    input.ranking.candidates,
    'ranking.candidates',
    assertCandidateShape,
  );
  forEachArrayItem(
    input.ranking.unsatisfiedAnchors,
    'ranking.unsatisfiedAnchors',
    (value, label) => {
      assertExactKeys(
        value,
        ['requestIndex', 'kind', 'satisfaction', 'reason'],
        label,
      );
    },
  );
  assertExactKeys(
    input.ranking.budget,
    ['maximumConfirmedReached', 'maximumCandidatesReached'],
    'ranking.budget',
  );
  assertExactKeys(
    input.ranking.exclusions,
    ['negativeTermMatches', 'duplicateLocations', 'unverifiedFileContent'],
    'ranking.exclusions',
  );
  assertExactKeys(
    input.scope,
    [
      'requested',
      'effective',
      'unmatchedLayers',
      'policy',
      'outsideLayerHintExclusions',
    ],
    'scope',
  );
  assertExactKeys(
    input.capability,
    ['semanticLanguages', 'unsupportedLanguageHits'],
    'capability',
  );
  assertExactKeys(input.abort, ['source'], 'abort');
}

export function createLocateExecutionFactsV2(
  input: LocateExecutionFactsInitV2,
): LocateExecutionFactsV2 {
  assertFactsShape(input);
  return Object.freeze({
    backend: clonePlainReadonlyV2(input.backend),
    snapshot: clonePlainReadonlyV2(input.snapshot),
    ranking: clonePlainReadonlyV2(input.ranking),
    scope: clonePlainReadonlyV2(input.scope),
    capability: clonePlainReadonlyV2(input.capability),
    abort: clonePlainReadonlyV2(input.abort),
  });
}

export function createLocateExecutionErrorFactsV2(
  input: LocateExecutionErrorFactsV2,
): LocateExecutionErrorFactsV2 {
  assertKeys(
    input,
    ['code'],
    ['suggestedAction'],
    'LocateExecutionErrorFactsV2',
  );
  return clonePlainReadonlyV2(input);
}
