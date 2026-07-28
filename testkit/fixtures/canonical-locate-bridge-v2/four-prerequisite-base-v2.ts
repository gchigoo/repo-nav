/** Shared four-prerequisite synthetic base envelope for F1C finalizer/shadow cases. */

import {
  createLocateFactEnvelopeBuilderV2,
  type CanonicalLocateExecutionV2,
  type LocateFactPayloadsV2,
} from '../../../src/contracts/v2/locate-fact-envelope-v2.js';
import {
  issueLocateProjectionExecutionCapabilityV2,
  registerCanonicalLocateExecutionInputV2,
  requireLocateProjectionExecutionTokenV2,
} from '../../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';

function snapshot(): LocateFactPayloadsV2['snapshot'] {
  return Object.freeze({
    coverage: Object.freeze({
      gitState: 'clean' as const,
      consistency: 'stable' as const,
      filesChecked: 1,
      discardedEvidenceCount: 0,
    }),
    finalStableEvidence: Object.freeze([]),
  });
}

function ranking(): LocateFactPayloadsV2['ranking'] {
  return Object.freeze({
    confirmed: Object.freeze([]),
    candidates: Object.freeze([]),
    unsatisfiedAnchors: Object.freeze([]),
  });
}

function scope(): LocateFactPayloadsV2['scope'] {
  return Object.freeze({
    requested: Object.freeze([]),
    effective: Object.freeze([
      'client',
      'server',
      'db',
      'config',
      'unknown',
    ] as const),
    policyVersion: 'repo-scope-v1' as const,
    unmatchedLayers: Object.freeze([]),
  });
}

function capability(): LocateFactPayloadsV2['capability'] {
  return Object.freeze({
    textSearch: 'supported-text-files' as const,
    semanticClassification: Object.freeze([
      'typescript',
      'javascript',
      'sql',
    ] as const),
    unsupportedLanguageHits: 0,
  });
}

/**
 * Build a registered success input with four pre-stage prerequisite owners only.
 */
export function createFourPrerequisiteCanonicalInputV2(): {
  readonly capability: ReturnType<
    typeof issueLocateProjectionExecutionCapabilityV2
  >;
  readonly execution: ReturnType<typeof requireLocateProjectionExecutionTokenV2>;
  readonly input: Extract<CanonicalLocateExecutionV2, { ok: true }>;
} {
  const terms = Object.freeze([
    Object.freeze({ value: 'mapping', caseSensitive: false }),
  ]);
  const builder = createLocateFactEnvelopeBuilderV2(
    '/tmp/repo-nav-fixture',
    terms,
  );
  builder.add('snapshot', snapshot());
  builder.add('ranking', ranking());
  builder.add('scope', scope());
  builder.add('capability', capability());
  const envelope = builder.freeze();
  const capabilityToken = issueLocateProjectionExecutionCapabilityV2();
  const execution = requireLocateProjectionExecutionTokenV2(capabilityToken);
  const input = Object.freeze({
    ok: true as const,
    envelope,
    legacyV1Projection: Object.freeze({
      ok: true as const,
      evidence: Object.freeze({
        schemaVersion: '1.0' as const,
        status: 'ok' as const,
        repositoryRoot: envelope.repositoryRoot,
        normalizedTerms: terms,
        confirmed: Object.freeze([]),
        candidates: Object.freeze([]),
        coverage: Object.freeze({
          backends: Object.freeze([]),
          fallbackChecked: true,
          indexState: 'available' as const,
          indexFreshness: 'not-applicable' as const,
          limitsReached: Object.freeze([]),
          exclusionSummary: Object.freeze({}),
        }),
        nextActions: Object.freeze([]),
      }),
    }),
  });
  registerCanonicalLocateExecutionInputV2(input, capabilityToken, execution);
  return Object.freeze({
    capability: capabilityToken,
    execution,
    input,
  });
}

export function createEmptyCanonicalSuccessInputV2(): {
  readonly capability: ReturnType<
    typeof issueLocateProjectionExecutionCapabilityV2
  >;
  readonly execution: ReturnType<typeof requireLocateProjectionExecutionTokenV2>;
  readonly input: Extract<CanonicalLocateExecutionV2, { ok: true }>;
} {
  const terms = Object.freeze([
    Object.freeze({ value: 'mapping', caseSensitive: false }),
  ]);
  const envelope = Object.freeze({
    repositoryRoot: '/tmp/repo-nav-fixture',
    normalizedTerms: terms,
    fragments: Object.freeze({}),
  });
  const capabilityToken = issueLocateProjectionExecutionCapabilityV2();
  const execution = requireLocateProjectionExecutionTokenV2(capabilityToken);
  const input = Object.freeze({
    ok: true as const,
    envelope,
    legacyV1Projection: Object.freeze({
      ok: true as const,
      evidence: Object.freeze({
        schemaVersion: '1.0' as const,
        status: 'no_result' as const,
        repositoryRoot: envelope.repositoryRoot,
        normalizedTerms: terms,
        confirmed: Object.freeze([]),
        candidates: Object.freeze([]),
        coverage: Object.freeze({
          backends: Object.freeze([]),
          fallbackChecked: false,
          indexState: 'unknown' as const,
          indexFreshness: 'not-applicable' as const,
          limitsReached: Object.freeze([]),
          exclusionSummary: Object.freeze({}),
        }),
        nextActions: Object.freeze([]),
      }),
    }),
  });
  registerCanonicalLocateExecutionInputV2(input, capabilityToken, execution);
  return Object.freeze({
    capability: capabilityToken,
    execution,
    input,
  });
}
