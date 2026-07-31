/**
 * F1C typed locate fact envelope, owner order, four-prerequisite inspector, and builder.
 * Payload shapes follow roadmap public-contract-v2; F1C only declares slots.
 */

import type {
  LocateStatus,
  NormalizedSearchTerm,
  LocateResult,
} from '../index.js';
import type {
  CandidateEvidenceV2,
  ConfirmedEvidenceV2,
  CoverageReportV2,
  FinalizedUnsafeLocateResultV2,
  PublicSearchTermV2,
} from './locate-result-v2.js';

export const LOCATE_FACT_OWNER_ORDER_V2 = Object.freeze([
  'snapshot',
  'ranking',
  'backend',
  'request-outcome',
  'scope',
  'capability',
] as const);

export type LocateFactOwnerV2 = (typeof LOCATE_FACT_OWNER_ORDER_V2)[number];

export const LOCATE_PROJECTION_PREREQUISITE_OWNER_ORDER_V2 = Object.freeze([
  'snapshot',
  'ranking',
  'scope',
  'capability',
] as const);

export type LocateProjectionPrerequisiteOwnerV2 =
  (typeof LOCATE_PROJECTION_PREREQUISITE_OWNER_ORDER_V2)[number];

type BackendAttemptV2 = CoverageReportV2['backends'][number];
type RepositorySnapshotCoverage = CoverageReportV2['snapshot'];
type ScopeCoverage = CoverageReportV2['scope'];
type CapabilityCoverage = CoverageReportV2['capabilities'];
type UnsatisfiedAnchor = CoverageReportV2['unsatisfiedAnchors'][number];
type IndexState = CoverageReportV2['indexState'];
type IndexFreshness = CoverageReportV2['indexFreshness'];
type UnsafeEvidenceDraftV2 =
  Omit<ConfirmedEvidenceV2, 'id'> | Omit<CandidateEvidenceV2, 'id'>;

export interface RankedEvidenceFactsV2 {
  readonly confirmed: readonly UnsafeEvidenceDraftV2[];
  readonly candidates: readonly UnsafeEvidenceDraftV2[];
  readonly unsatisfiedAnchors: readonly UnsatisfiedAnchor[];
}

export interface SnapshotFactsV2 {
  readonly coverage: RepositorySnapshotCoverage;
  readonly finalStableEvidence: readonly UnsafeEvidenceDraftV2[];
}

export interface BackendFactsV2 {
  readonly outcomes: readonly BackendAttemptV2[];
  readonly indexState: IndexState;
  readonly indexFreshness: IndexFreshness;
}

type SuccessEvidenceV2 = Extract<
  FinalizedUnsafeLocateResultV2,
  Readonly<{ ok: true }>
>['evidence'];

export interface RequestOutcomeFactsV2 {
  readonly strategyComplete: boolean;
  readonly fallbackChecked: boolean;
  readonly abortSource: 'none' | 'caller' | 'deadline';
  readonly limitsReached: CoverageReportV2['limitsReached'];
  readonly degradations: CoverageReportV2['degradations'];
  readonly exclusionSummary: CoverageReportV2['exclusionSummary'];
  readonly nextActions: SuccessEvidenceV2['nextActions'];
}

export interface LocateFactPayloadsV2 {
  readonly snapshot: SnapshotFactsV2;
  readonly ranking: RankedEvidenceFactsV2;
  readonly backend: BackendFactsV2;
  readonly 'request-outcome': RequestOutcomeFactsV2;
  readonly scope: ScopeCoverage;
  readonly capability: CapabilityCoverage;
}

export type LocateFactFragmentsV2 = Readonly<{
  [K in LocateFactOwnerV2]?: Readonly<{
    owner: K;
    value: LocateFactPayloadsV2[K];
  }>;
}>;

export interface LocateFactEnvelopeV2 {
  readonly repositoryRoot: string;
  readonly normalizedTerms: readonly NormalizedSearchTerm[];
  readonly fragments: LocateFactFragmentsV2;
}

export type CompleteLocateFactFragmentsV2 = Readonly<{
  [K in LocateFactOwnerV2]-?: Readonly<{
    owner: K;
    value: LocateFactPayloadsV2[K];
  }>;
}>;

export type CompleteLocateFactEnvelopeV2 = Readonly<
  Omit<LocateFactEnvelopeV2, 'fragments'> & {
    readonly fragments: CompleteLocateFactFragmentsV2;
  }
>;

export type UnsafeToolErrorFactsV2 = Extract<
  FinalizedUnsafeLocateResultV2,
  Readonly<{ ok: false }>
>['error'];

export type LegacyV1LocateSuccess = Extract<
  LocateResult,
  Readonly<{ ok: true }>
>;
export type LegacyV1LocateFailure = Extract<
  LocateResult,
  Readonly<{ ok: false }>
>;

declare const LOCATE_PROJECTION_EXECUTION_CAPABILITY_V2: unique symbol;
export type LocateProjectionExecutionCapabilityV2 = Readonly<{
  readonly [LOCATE_PROJECTION_EXECUTION_CAPABILITY_V2]: never;
}>;

declare const LOCATE_EXECUTION_TOKEN_V2: unique symbol;
export type LocateExecutionTokenV2 = Readonly<{
  readonly [LOCATE_EXECUTION_TOKEN_V2]: never;
}>;

export type CanonicalLocateExecutionV2 =
  | Readonly<{
      ok: true;
      envelope: LocateFactEnvelopeV2;
    }>
  | Readonly<{
      ok: false;
      error: UnsafeToolErrorFactsV2;
    }>;

export interface CanonicalLocateExecutorV2 {
  execute(
    request: import('../index.js').LocateRequest,
    context: import('../index.js').LocateExecutionContext,
    projectionExecution: LocateProjectionExecutionCapabilityV2,
  ): Promise<CanonicalLocateExecutionV2>;
}

export interface LocateResultProjector<TOutput> {
  project(
    input: CanonicalLocateExecutionV2,
    execution: LocateProjectionExecutionCapabilityV2,
  ): TOutput;
}

declare const TRUSTED_LOCATE_PROJECTION_PREREQUISITES_V2: unique symbol;
export type TrustedLocateProjectionPrerequisitesV2 = Readonly<{
  readonly [TRUSTED_LOCATE_PROJECTION_PREREQUISITES_V2]: never;
}>;

export type LocateProjectionPrerequisitePresenceV2 =
  | Readonly<{
      ok: true;
      prerequisites: TrustedLocateProjectionPrerequisitesV2;
    }>
  | Readonly<{
      ok: false;
      missingOwners: readonly LocateProjectionPrerequisiteOwnerV2[];
      reason: 'missing-prerequisite-owner' | 'invalid-prerequisite-envelope';
    }>;

interface PrerequisiteRegistryEntryV2 {
  readonly envelope: LocateFactEnvelopeV2;
  readonly input: Extract<CanonicalLocateExecutionV2, Readonly<{ ok: true }>>;
  readonly execution: LocateExecutionTokenV2;
}

const prerequisiteRegistry = new WeakMap<
  TrustedLocateProjectionPrerequisitesV2,
  PrerequisiteRegistryEntryV2
>();

function createOpaqueBrand(): object {
  return Object.freeze(Object.create(null) as object);
}

function isOwnerKey(value: PropertyKey): value is LocateFactOwnerV2 {
  return (
    typeof value === 'string' &&
    (LOCATE_FACT_OWNER_ORDER_V2 as readonly string[]).includes(value)
  );
}

function fragmentEntryValid<K extends LocateFactOwnerV2>(
  owner: K,
  entry: unknown,
): entry is Readonly<{ owner: K; value: LocateFactPayloadsV2[K] }> {
  if (entry === null || typeof entry !== 'object') {
    return false;
  }
  const record = entry as { owner?: unknown; value?: unknown };
  return record.owner === owner && record.value !== undefined;
}

/**
 * Inspect four pre-stage prerequisite owners with Object.hasOwn; reject preseeded generated owners.
 */
export function inspectLocateProjectionPrerequisiteOwnersV2(
  envelope: LocateFactEnvelopeV2,
  input: Extract<CanonicalLocateExecutionV2, Readonly<{ ok: true }>>,
  execution: LocateExecutionTokenV2,
): LocateProjectionPrerequisitePresenceV2 {
  if (input.envelope !== envelope) {
    return Object.freeze({
      ok: false,
      missingOwners: Object.freeze([] as const),
      reason: 'invalid-prerequisite-envelope' as const,
    });
  }
  const fragments = envelope.fragments;
  const missing: LocateProjectionPrerequisiteOwnerV2[] = [];
  for (const owner of LOCATE_PROJECTION_PREREQUISITE_OWNER_ORDER_V2) {
    if (!Object.hasOwn(fragments, owner)) {
      missing.push(owner);
    }
  }
  if (missing.length > 0) {
    return Object.freeze({
      ok: false,
      missingOwners: Object.freeze(missing),
      reason: 'missing-prerequisite-owner' as const,
    });
  }
  if (
    Object.hasOwn(fragments, 'backend') ||
    Object.hasOwn(fragments, 'request-outcome')
  ) {
    return Object.freeze({
      ok: false,
      missingOwners: Object.freeze([] as const),
      reason: 'invalid-prerequisite-envelope' as const,
    });
  }
  for (const key of Reflect.ownKeys(fragments)) {
    if (typeof key === 'symbol' || !isOwnerKey(key)) {
      return Object.freeze({
        ok: false,
        missingOwners: Object.freeze([] as const),
        reason: 'invalid-prerequisite-envelope' as const,
      });
    }
    if (
      !(
        LOCATE_PROJECTION_PREREQUISITE_OWNER_ORDER_V2 as readonly string[]
      ).includes(key)
    ) {
      return Object.freeze({
        ok: false,
        missingOwners: Object.freeze([] as const),
        reason: 'invalid-prerequisite-envelope' as const,
      });
    }
    const entry = fragments[key as LocateProjectionPrerequisiteOwnerV2];
    if (
      !fragmentEntryValid(key as LocateProjectionPrerequisiteOwnerV2, entry)
    ) {
      return Object.freeze({
        ok: false,
        missingOwners: Object.freeze([] as const),
        reason: 'invalid-prerequisite-envelope' as const,
      });
    }
  }
  const prerequisites =
    createOpaqueBrand() as TrustedLocateProjectionPrerequisitesV2;
  prerequisiteRegistry.set(
    prerequisites,
    Object.freeze({ envelope, input, execution }),
  );
  return Object.freeze({ ok: true, prerequisites });
}

/** @internal Restore prerequisite-bound base envelope for aggregation registrar. */
export function requireTrustedLocateProjectionPrerequisitesV2(
  prerequisites: TrustedLocateProjectionPrerequisitesV2,
  input: Extract<CanonicalLocateExecutionV2, Readonly<{ ok: true }>>,
  execution: LocateExecutionTokenV2,
): LocateFactEnvelopeV2 {
  const entry = prerequisiteRegistry.get(prerequisites);
  if (
    entry === undefined ||
    entry.input !== input ||
    entry.execution !== execution
  ) {
    throw new Error('Trusted locate projection prerequisites are not bound.');
  }
  return entry.envelope;
}

export interface LocateFactEnvelopeBuilderV2 {
  add<K extends LocateFactOwnerV2>(
    owner: K,
    value: LocateFactPayloadsV2[K],
  ): void;
  readonly failed: boolean;
  freeze(): LocateFactEnvelopeV2;
}

/**
 * Create a request-local owner builder that rejects duplicate and tag mismatch.
 */
export function createLocateFactEnvelopeBuilderV2(
  repositoryRoot: string,
  normalizedTerms: readonly NormalizedSearchTerm[],
): LocateFactEnvelopeBuilderV2 {
  const fragments: {
    -readonly [K in LocateFactOwnerV2]?: {
      owner: K;
      value: LocateFactPayloadsV2[K];
    };
  } = Object.create(null) as {
    -readonly [K in LocateFactOwnerV2]?: {
      owner: K;
      value: LocateFactPayloadsV2[K];
    };
  };
  let failed = false;
  return {
    get failed(): boolean {
      return failed;
    },
    add<K extends LocateFactOwnerV2>(
      owner: K,
      value: LocateFactPayloadsV2[K],
    ): void {
      if (failed) {
        return;
      }
      if (!isOwnerKey(owner)) {
        failed = true;
        return;
      }
      if (Object.hasOwn(fragments, owner)) {
        failed = true;
        return;
      }
      if (value === undefined) {
        failed = true;
        return;
      }
      (fragments as Record<string, unknown>)[owner] = Object.freeze({
        owner,
        value,
      });
    },
    freeze(): LocateFactEnvelopeV2 {
      if (failed) {
        throw new Error('Locate fact envelope builder failed closed.');
      }
      return Object.freeze({
        repositoryRoot,
        normalizedTerms,
        fragments: Object.freeze({ ...fragments }) as LocateFactFragmentsV2,
      });
    },
  };
}

export type {
  PublicSearchTermV2,
  ConfirmedEvidenceV2,
  CandidateEvidenceV2,
  LocateStatus,
};
