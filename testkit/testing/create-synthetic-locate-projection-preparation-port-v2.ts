/**
 * Test-only synthetic four-prerequisite → three-stage preparation port.
 * Reuses production registrars; not real F2/F6/F8 integration evidence.
 */

import {
  inspectLocateProjectionPrerequisiteOwnersV2,
  type CanonicalLocateExecutionV2,
  type LocateExecutionTokenV2,
  type LocateFactPayloadsV2,
  type LocateStatus,
  type PublicSearchTermV2,
} from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import type {
  LocateProjectionAggregationRegistrationV2,
  LocateProjectionMaterializationRegistrationV2,
  LocateProjectionPreparationPortV2,
  LocateProjectionSourceRegistrationV2,
} from '../../src/evidence/canonical/locate-projection-preparation-port-v2.js';
import {
  registerTrustedLocateProjectionAggregationV2,
  registerTrustedLocateProjectionMaterializationV2,
  registerTrustedLocateProjectionSourceV2,
} from '../../src/evidence/canonical/locate-projection-stage-registrar-v2.js';

export interface SyntheticLocateProjectionPreparationOptionsV2 {
  readonly sourceRegistration?: LocateProjectionSourceRegistrationV2;
  readonly materializationRegistration?: LocateProjectionMaterializationRegistrationV2;
  readonly aggregationRegistration?: LocateProjectionAggregationRegistrationV2;
  readonly skipSource?: boolean;
  readonly skipMaterialization?: boolean;
  readonly skipAggregation?: boolean;
  readonly onCreateSource?: () => void;
  readonly onMaterialize?: () => void;
  readonly onAggregate?: () => void;
}

export function defaultIdentity(): Readonly<object> {
  return Object.freeze(Object.create(null) as object);
}

export function defaultMaterialization(
  identity: Readonly<object>,
  terms: readonly PublicSearchTermV2[],
): LocateProjectionMaterializationRegistrationV2 {
  return Object.freeze({
    normalizedTerms: Object.freeze([...terms]),
    confirmed: Object.freeze([
      Object.freeze({
        identity,
        value: Object.freeze({
          evidenceClass: 'confirmed' as const,
          role: 'value-mapping' as const,
          location: Object.freeze({
            file: 'src/server/mapping.ts',
            symbol: 'resolveMapping',
            lines: Object.freeze([1, 3] as const),
            excerpt: 'export const resolveMapping = true;',
            resolvable: true as const,
          }),
          provenance: Object.freeze({
            discoveredBy: Object.freeze(['codegraph', 'filesystem'] as const),
            verifiedBy: 'filesystem' as const,
            operations: Object.freeze([
              'CODEGRAPH_QUERY',
              'FILESYSTEM_READ_RANGE',
            ] as const),
          }),
          reasonCodes: Object.freeze(['DIRECT_ALIAS_MAPPING'] as const),
        }),
      }),
    ]),
    candidates: Object.freeze([]),
  });
}

export function defaultBackend(): LocateFactPayloadsV2['backend'] {
  return Object.freeze({
    outcomes: Object.freeze([
      Object.freeze({
        backend: 'codegraph' as const,
        status: 'used' as const,
        completion: 'complete' as const,
        termination: 'none' as const,
        hitCount: 1,
      }),
    ]),
    indexState: 'available' as const,
    indexFreshness: 'not-applicable' as const,
  });
}

export function defaultRequestOutcome(): LocateFactPayloadsV2['request-outcome'] {
  return Object.freeze({
    strategyComplete: true,
    fallbackChecked: true,
    abortSource: 'none' as const,
    limitsReached: Object.freeze([]),
    degradations: Object.freeze([]),
    exclusionSummary: Object.freeze({}),
    nextActions: Object.freeze([]),
  });
}

/**
 * Create a test-only preparation port that drives production registrars.
 */
export function createSyntheticLocateProjectionPreparationPortV2(
  options: SyntheticLocateProjectionPreparationOptionsV2 = {},
): LocateProjectionPreparationPortV2 {
  let pairedIdentity: Readonly<object> | undefined;
  return {
    createSource(prerequisites, input, execution) {
      options.onCreateSource?.();
      if (options.skipSource === true) {
        return Object.freeze({ ok: false, reason: 'invalid-facts' as const });
      }
      pairedIdentity =
        options.sourceRegistration?.identity ?? defaultIdentity();
      return registerTrustedLocateProjectionSourceV2(
        Object.freeze({ identity: pairedIdentity }),
        prerequisites,
        input,
        execution,
      );
    },
    materialize(source, input, execution) {
      options.onMaterialize?.();
      if (options.skipMaterialization === true) {
        return Object.freeze({ ok: false, reason: 'invalid-facts' as const });
      }
      if (pairedIdentity === undefined) {
        return Object.freeze({ ok: false, reason: 'invalid-facts' as const });
      }
      const terms: readonly PublicSearchTermV2[] = Object.freeze(
        input.envelope.normalizedTerms.map((term) =>
          Object.freeze({
            value: term.value,
            caseSensitive: term.caseSensitive,
          }),
        ),
      );
      const registration =
        options.materializationRegistration ??
        defaultMaterialization(pairedIdentity, terms);
      return registerTrustedLocateProjectionMaterializationV2(
        registration,
        source,
        input,
        execution,
      );
    },
    aggregate(materialization, input, execution) {
      options.onAggregate?.();
      if (options.skipAggregation === true) {
        return Object.freeze({ ok: false, reason: 'invalid-facts' as const });
      }
      if (pairedIdentity === undefined) {
        return Object.freeze({ ok: false, reason: 'invalid-facts' as const });
      }
      const registration =
        options.aggregationRegistration ??
        Object.freeze({
          identity: pairedIdentity,
          statusV2: 'ok' as LocateStatus,
          backend: defaultBackend(),
          requestOutcome: defaultRequestOutcome(),
        });
      return registerTrustedLocateProjectionAggregationV2(
        registration,
        materialization,
        input,
        execution,
      );
    },
  };
}

/**
 * Run prerequisite inspection for a four-owner base envelope (test helper).
 */
export function inspectSyntheticPrerequisitesV2(
  input: Extract<CanonicalLocateExecutionV2, Readonly<{ ok: true }>>,
  execution: LocateExecutionTokenV2,
) {
  return inspectLocateProjectionPrerequisiteOwnersV2(
    input.envelope,
    input,
    execution,
  );
}
