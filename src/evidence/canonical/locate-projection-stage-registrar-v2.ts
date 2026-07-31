/**
 * Deep-internal source/materialization/aggregation registrars.
 * Exact importer inventory: F2 stage, F8 aggregation wrapper, test synthetic only.
 */

import {
  createLocateFactEnvelopeBuilderV2,
  requireTrustedLocateProjectionPrerequisitesV2,
  type CanonicalLocateExecutionV2,
  type CompleteLocateFactEnvelopeV2,
  type LocateExecutionTokenV2,
  type TrustedLocateProjectionPrerequisitesV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import {
  type LocateProjectionAggregationRegistrationV2,
  type LocateProjectionMaterializationRegistrationV2,
  type LocateProjectionSourceRegistrationV2,
  type LocateProjectionStageRegistrationResultV2,
  type TrustedLocateProjectionAggregationV2,
  type TrustedLocateProjectionMaterializationV2,
  type TrustedLocateProjectionSourceV2,
} from './locate-projection-preparation-port-v2.js';

interface SourceRegistryEntryV2 {
  readonly identity: Readonly<object>;
  readonly prerequisites: TrustedLocateProjectionPrerequisitesV2;
  readonly input: Extract<CanonicalLocateExecutionV2, Readonly<{ ok: true }>>;
  readonly execution: LocateExecutionTokenV2;
}

interface MaterializationRegistryEntryV2 {
  readonly registration: LocateProjectionMaterializationRegistrationV2;
  readonly source: TrustedLocateProjectionSourceV2;
  readonly input: Extract<CanonicalLocateExecutionV2, Readonly<{ ok: true }>>;
  readonly execution: LocateExecutionTokenV2;
  readonly identity: Readonly<object>;
}

export interface AggregationRegistryEntryV2 {
  readonly completeEnvelope: CompleteLocateFactEnvelopeV2;
  readonly materialization: TrustedLocateProjectionMaterializationV2;
  readonly registration: LocateProjectionAggregationRegistrationV2;
  readonly input: Extract<CanonicalLocateExecutionV2, Readonly<{ ok: true }>>;
  readonly execution: LocateExecutionTokenV2;
}

const sourceRegistry = new WeakMap<
  TrustedLocateProjectionSourceV2,
  SourceRegistryEntryV2
>();
const materializationRegistry = new WeakMap<
  TrustedLocateProjectionMaterializationV2,
  MaterializationRegistryEntryV2
>();
const aggregationRegistry = new WeakMap<
  TrustedLocateProjectionAggregationV2,
  AggregationRegistryEntryV2
>();

function createOpaqueBrand(): object {
  return Object.freeze(Object.create(null) as object);
}

function isFrozenObject(value: unknown): value is Readonly<object> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.isFrozen(value) &&
    !Array.isArray(value)
  );
}

function failInvalid<T>(): LocateProjectionStageRegistrationResultV2<T> {
  return Object.freeze({ ok: false, reason: 'invalid-facts' as const });
}

const LOCATE_STATUSES: readonly string[] = Object.freeze([
  'ok',
  'partial',
  'no_result',
  'backend_unavailable',
  'timeout',
  'cancelled',
]);

/**
 * Register opaque source identity bound to exact prerequisites/input/execution.
 */
export function registerTrustedLocateProjectionSourceV2(
  registration: LocateProjectionSourceRegistrationV2,
  prerequisites: TrustedLocateProjectionPrerequisitesV2,
  input: Extract<CanonicalLocateExecutionV2, Readonly<{ ok: true }>>,
  execution: LocateExecutionTokenV2,
): LocateProjectionStageRegistrationResultV2<TrustedLocateProjectionSourceV2> {
  try {
    requireTrustedLocateProjectionPrerequisitesV2(
      prerequisites,
      input,
      execution,
    );
  } catch {
    return failInvalid();
  }
  if (!isFrozenObject(registration.identity)) {
    return failInvalid();
  }
  const token = createOpaqueBrand() as TrustedLocateProjectionSourceV2;
  sourceRegistry.set(
    token,
    Object.freeze({
      identity: registration.identity,
      prerequisites,
      input,
      execution,
    }),
  );
  return Object.freeze({ ok: true, value: token });
}

/**
 * Register neutral materialization view bound to same-input registered source.
 */
export function registerTrustedLocateProjectionMaterializationV2(
  registration: LocateProjectionMaterializationRegistrationV2,
  source: TrustedLocateProjectionSourceV2,
  input: Extract<CanonicalLocateExecutionV2, Readonly<{ ok: true }>>,
  execution: LocateExecutionTokenV2,
): LocateProjectionStageRegistrationResultV2<TrustedLocateProjectionMaterializationV2> {
  const sourceEntry = sourceRegistry.get(source);
  if (
    sourceEntry === undefined ||
    sourceEntry.input !== input ||
    sourceEntry.execution !== execution
  ) {
    return failInvalid();
  }
  if (
    !Object.isFrozen(registration) ||
    !Object.isFrozen(registration.normalizedTerms) ||
    !Object.isFrozen(registration.confirmed) ||
    !Object.isFrozen(registration.candidates)
  ) {
    return failInvalid();
  }
  for (const term of registration.normalizedTerms) {
    if (!Object.isFrozen(term) || typeof term.value !== 'string') {
      return failInvalid();
    }
  }
  for (const item of registration.confirmed) {
    if (
      !isFrozenObject(item.identity) ||
      !Object.isFrozen(item.value) ||
      item.value.evidenceClass !== 'confirmed' ||
      'id' in item.value
    ) {
      return failInvalid();
    }
  }
  for (const item of registration.candidates) {
    if (
      !isFrozenObject(item.identity) ||
      !Object.isFrozen(item.value) ||
      item.value.evidenceClass !== 'candidate' ||
      'id' in item.value
    ) {
      return failInvalid();
    }
  }
  const token = createOpaqueBrand() as TrustedLocateProjectionMaterializationV2;
  materializationRegistry.set(
    token,
    Object.freeze({
      registration,
      source,
      input,
      execution,
      identity: sourceEntry.identity,
    }),
  );
  return Object.freeze({ ok: true, value: token });
}

/**
 * Exact-add backend/request-outcome onto a fresh complete envelope bound to aggregation token.
 */
export function registerTrustedLocateProjectionAggregationV2(
  registration: LocateProjectionAggregationRegistrationV2,
  materialization: TrustedLocateProjectionMaterializationV2,
  input: Extract<CanonicalLocateExecutionV2, Readonly<{ ok: true }>>,
  execution: LocateExecutionTokenV2,
): LocateProjectionStageRegistrationResultV2<TrustedLocateProjectionAggregationV2> {
  const materializationEntry = materializationRegistry.get(materialization);
  if (
    materializationEntry === undefined ||
    materializationEntry.input !== input ||
    materializationEntry.execution !== execution
  ) {
    return failInvalid();
  }
  const sourceEntry = sourceRegistry.get(materializationEntry.source);
  if (sourceEntry === undefined) {
    return failInvalid();
  }
  if (
    !isFrozenObject(registration.identity) ||
    registration.identity !== materializationEntry.identity ||
    !LOCATE_STATUSES.includes(registration.statusV2) ||
    !Object.isFrozen(registration.backend) ||
    !Object.isFrozen(registration.requestOutcome) ||
    !Object.isFrozen(registration.backend.outcomes)
  ) {
    return failInvalid();
  }
  let baseEnvelope;
  try {
    baseEnvelope = requireTrustedLocateProjectionPrerequisitesV2(
      sourceEntry.prerequisites,
      input,
      execution,
    );
  } catch {
    return failInvalid();
  }
  if (
    Object.hasOwn(baseEnvelope.fragments, 'backend') ||
    Object.hasOwn(baseEnvelope.fragments, 'request-outcome')
  ) {
    return failInvalid();
  }
  const builder = createLocateFactEnvelopeBuilderV2(
    baseEnvelope.repositoryRoot,
    baseEnvelope.normalizedTerms,
  );
  for (const owner of ['snapshot', 'ranking', 'scope', 'capability'] as const) {
    const entry = baseEnvelope.fragments[owner];
    if (entry === undefined) {
      return failInvalid();
    }
    builder.add(owner, entry.value);
  }
  builder.add('backend', registration.backend);
  builder.add('request-outcome', registration.requestOutcome);
  if (builder.failed) {
    return failInvalid();
  }
  let frozen;
  try {
    frozen = builder.freeze();
  } catch {
    return failInvalid();
  }
  const completeEnvelope = Object.freeze({
    repositoryRoot: frozen.repositoryRoot,
    normalizedTerms: frozen.normalizedTerms,
    fragments: Object.freeze({
      snapshot: frozen.fragments.snapshot!,
      ranking: frozen.fragments.ranking!,
      backend: frozen.fragments.backend!,
      'request-outcome': frozen.fragments['request-outcome']!,
      scope: frozen.fragments.scope!,
      capability: frozen.fragments.capability!,
    }),
  }) as CompleteLocateFactEnvelopeV2;
  const token = createOpaqueBrand() as TrustedLocateProjectionAggregationV2;
  aggregationRegistry.set(
    token,
    Object.freeze({
      completeEnvelope,
      materialization,
      registration: Object.freeze({ ...registration }),
      input,
      execution,
    }),
  );
  return Object.freeze({ ok: true, value: token });
}

/** @internal Restore completion-bearing aggregation registry entry for finalizer. */
export function requireTrustedLocateProjectionAggregationEntryV2(
  aggregation: TrustedLocateProjectionAggregationV2,
  execution: LocateExecutionTokenV2,
): AggregationRegistryEntryV2 {
  const entry = aggregationRegistry.get(aggregation);
  if (entry === undefined || entry.execution !== execution) {
    throw new Error('Trusted locate projection aggregation is not bound.');
  }
  return entry;
}

/** @internal Restore materialization registration for composer. */
export function requireTrustedLocateProjectionMaterializationEntryV2(
  materialization: TrustedLocateProjectionMaterializationV2,
  execution: LocateExecutionTokenV2,
): MaterializationRegistryEntryV2 {
  const entry = materializationRegistry.get(materialization);
  if (entry === undefined || entry.execution !== execution) {
    throw new Error('Trusted locate projection materialization is not bound.');
  }
  return entry;
}
