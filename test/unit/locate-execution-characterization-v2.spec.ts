import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  LOCATE_EXECUTION_FACT_FAMILIES_V2,
  assertLocateExecutionFactFamilySetV2,
  createLocateExecutionFactsV2,
  type FinalizeLocateResultInputV2,
  type LocateExecutionErrorFactsV2,
  type LocateExecutionFactsV2,
  type LocateExecutionResolvedLimitsV2,
} from '../../src/contracts/v2/locate-execution-facts-v2.js';
import { LocateResultV2Schema } from '../../src/contracts/v2/locate-result-v2.js';
import { finalizeLocateResultV2 } from '../../src/evidence/locate-execution/finalize-locate-result-v2.js';
import {
  C3_C4_CUTOVER_BOUNDARY_V2,
  LOCATE_AUTHORITY_LAYER_INVENTORY_V2,
  LOCATE_PARALLEL_AUTHORITY_INVENTORY_V2,
  LOCATE_PUBLIC_FIELD_OWNER_DEFINITION_V2,
  LOCATE_PUBLIC_FIELD_OWNERS_V2,
  LOCATE_PUBLIC_FIELD_PATHS_V2,
  LOCATE_UNMATERIALIZED_PUBLIC_SCHEMA_FIELDS_V2,
} from '../../testkit/fixtures/locate-execution-v2/authority-inventory-v2.js';
import {
  LOCATE_EXECUTION_CHARACTERIZATION_FAMILIES_V2,
  LOCATE_EXECUTION_COMPANION_SEMANTIC_SHA256_V2,
  LOCATE_EXECUTION_GOLDEN_CHARACTERIZATION_ROWS_V2,
  DEADLINE_CHARACTERIZATION_RESULT_V2,
  LOCATION_REDACTION_CHARACTERIZATION_RESULT_V2,
  LOCATE_EXECUTION_INLINE_SEMANTIC_SHA256_V2,
  OUTPUT_LIMIT_CHARACTERIZATION_RESULT_V2,
  SAFE_ERROR_CHARACTERIZATION_ROWS_V2,
  SNAPSHOT_MUTATION_CHARACTERIZATION_RESULT_V2,
  UPSTREAM_EXPANDED_HIT_CHARACTERIZATION_RESULT_V2,
  compareGoldenCompanionCharacterizationV2,
  evaluateLocateExecutionCharacterizationResultV2,
  expectedSemanticSha256IsValidV2,
  locateExecutionSemanticSha256V2,
  readGoldenCompanionResultV2,
} from '../../testkit/fixtures/locate-execution-v2/characterization-matrix-v2.js';
import {
  LOCATE_EXECUTION_DEFAULT_RESOLVED_LIMITS_V2,
  LOCATION_REDACTION_FINALIZE_INPUT_V2,
  LOCATION_REDACTION_LOCATE_EXECUTION_FACTS_V2,
  locateExecutionErrorFactsFromPublicResultV2,
  locateExecutionFinalizerInputFromCharacterizedSubsystemsV2,
} from '../../testkit/fixtures/locate-execution-v2/finalizer-facts-v2.js';
import {
  observeProductionDeadlineV2,
  observeProductionLocationRedactionV2,
  observeProductionOutputLimitV2,
  observeProductionSafeErrorsV2,
  observeProductionUpstreamExpandedHitV2,
  observeRipgrepOutputLimitMappingV2,
} from '../../testkit/fixtures/locate-execution-v2/production-characterization-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'input-abort-contract-v2',
  caseId: 'locate-execution-characterization',
});
const repositoryRoot = resolve(import.meta.dirname, '../..');

function sourceContainsSymbol(source: string, symbol: string): boolean {
  const text = readFileSync(resolve(repositoryRoot, source), 'utf8');
  if (text.includes(symbol)) {
    return true;
  }
  const memberSeparator = symbol.lastIndexOf('.');
  return (
    memberSeparator > 0 &&
    text.includes(symbol.slice(0, memberSeparator)) &&
    text.includes(symbol.slice(memberSeparator + 1))
  );
}

function requireSuccess(result: unknown) {
  const parsed = LocateResultV2Schema.parse(result);
  if (!parsed.ok) {
    throw new TypeError('characterization fixture must be a success');
  }
  return parsed;
}

function expectTransportEqualsV2(
  actual: ReturnType<typeof finalizeLocateResultV2>,
  expected: unknown,
): void {
  const parsed = LocateResultV2Schema.parse(expected);
  const compactJson = JSON.stringify(parsed);
  expect(actual.value).toEqual(parsed);
  expect(actual.compactJson).toBe(compactJson);
  expect(actual.utf8Bytes).toBe(Buffer.byteLength(compactJson, 'utf8'));
  expect(Object.isFrozen(actual)).toBe(true);
}

function expectDeepFrozenV2(value: unknown, seen = new Set<object>()): void {
  if (typeof value !== 'object' || value === null || seen.has(value)) {
    return;
  }
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) {
    expectDeepFrozenV2(child, seen);
  }
}

type FinalizeSuccessInputV2 = Extract<
  FinalizeLocateResultInputV2,
  Readonly<{ ok: true }>
>;

function mutableFactsV2(facts: LocateExecutionFactsV2): any {
  return structuredClone(facts);
}

function resolvedLimitsV2(
  overrides: Partial<LocateExecutionResolvedLimitsV2>,
): LocateExecutionResolvedLimitsV2 {
  return Object.freeze({
    ...LOCATE_EXECUTION_DEFAULT_RESOLVED_LIMITS_V2,
    ...overrides,
  });
}

function finalizerLimitsForCaseV2(
  caseId: string,
): LocateExecutionResolvedLimitsV2 {
  switch (caseId) {
    case 'deadline-abort':
      return resolvedLimitsV2({ timeoutMs: 1_000 });
    case 'upstream-expanded-hit':
      return resolvedLimitsV2({ maxFiles: 1 });
    default:
      return LOCATE_EXECUTION_DEFAULT_RESOLVED_LIMITS_V2;
  }
}

function finalizerInputForCharacterizedV2(
  caseId: string,
  expected: unknown,
): FinalizeSuccessInputV2 {
  if (caseId === 'location-redaction') {
    return LOCATION_REDACTION_FINALIZE_INPUT_V2;
  }
  return locateExecutionFinalizerInputFromCharacterizedSubsystemsV2(
    LocateResultV2Schema.parse(expected),
    finalizerLimitsForCaseV2(caseId),
  ) as FinalizeSuccessInputV2;
}

function finalizeMutatedFactsV2(input: FinalizeSuccessInputV2, facts: unknown) {
  return finalizeLocateResultV2({
    ...input,
    facts: facts as LocateExecutionFactsV2,
  });
}

function expectMutatedFactsRejectedV2(
  caseId: string,
  expected: unknown,
  mutate: (facts: any) => void,
): void {
  const parsed = LocateResultV2Schema.parse(expected);
  const input = finalizerInputForCharacterizedV2(caseId, parsed);
  const facts = mutableFactsV2(input.facts);
  mutate(facts);
  const view = finalizeMutatedFactsV2(input, facts);
  expect(
    evaluateLocateExecutionCharacterizationResultV2(parsed, view.value),
  ).toBe(false);
}

function mutateBackendOrderV2(): unknown {
  const fixture = structuredClone(
    readGoldenCompanionResultV2('codegraph-incomplete'),
  );
  if (!fixture.ok) {
    throw new TypeError('backend-order fixture must be a success');
  }
  const coverage = fixture.evidence.coverage as unknown as {
    backends: unknown[];
  };
  coverage.backends.reverse();
  return fixture;
}

function mutateStrategyCompleteV2(): unknown {
  const fixture = structuredClone(
    readGoldenCompanionResultV2('codegraph-incomplete'),
  );
  if (!fixture.ok) {
    throw new TypeError('strategy fixture must be a success');
  }
  const coverage = fixture.evidence.coverage as unknown as {
    strategyComplete: boolean;
  };
  coverage.strategyComplete = false;
  return fixture;
}

function mutateCallerAbortTimeoutV2(): unknown {
  const fixture = structuredClone(
    readGoldenCompanionResultV2('codegraph-global-abort-no-fallback'),
  );
  if (!fixture.ok) {
    throw new TypeError('caller-abort fixture must be a success');
  }
  const coverage = fixture.evidence.coverage as unknown as {
    limitsReached: string[];
  };
  coverage.limitsReached = ['TIMEOUT_REACHED'];
  return fixture;
}

function mutateRetainedChangedEvidenceV2(): unknown {
  const fixture = structuredClone(SNAPSHOT_MUTATION_CHARACTERIZATION_RESULT_V2);
  const mutable = fixture as unknown as {
    evidence: {
      confirmed: Array<{
        id: string;
        location: { file: string; excerpt: string };
      }>;
      coverage: { snapshot: { filesChecked: number } };
    };
  };
  const stable = mutable.evidence.confirmed[0];
  if (stable === undefined) {
    throw new TypeError('snapshot fixture must retain stable evidence');
  }
  mutable.evidence.confirmed.push({
    ...stable,
    id: 'evidence:v2:0002',
    location: {
      ...stable.location,
      file: 'server/changed.ts',
      excerpt: 'const changedId = row.changed_id;',
    },
  });
  mutable.evidence.coverage.snapshot.filesChecked = 2;
  return fixture;
}

function mutateExtraSchemaFieldV2(): unknown {
  const fixture = structuredClone(
    readGoldenCompanionResultV2('codegraph-symbol-complete-no-fallback'),
  ) as unknown as { evidence: Record<string, unknown> };
  fixture.evidence.extra = true;
  return fixture;
}

function mutateOutputLimitTerminationV2(): unknown {
  const fixture = structuredClone(OUTPUT_LIMIT_CHARACTERIZATION_RESULT_V2);
  const mutable = fixture as unknown as {
    evidence: { coverage: { backends: Array<{ termination: string }> } };
  };
  mutable.evidence.coverage.backends[0]!.termination = 'early-stop';
  return fixture;
}

function mutateDeadlineAbortSourceV2(): unknown {
  const fixture = structuredClone(DEADLINE_CHARACTERIZATION_RESULT_V2);
  const mutable = fixture as unknown as {
    evidence: { coverage: { abortSource: string } };
  };
  mutable.evidence.coverage.abortSource = 'caller';
  return fixture;
}

function mutateRedactionTermMetadataV2(): unknown {
  const fixture = structuredClone(
    LOCATION_REDACTION_CHARACTERIZATION_RESULT_V2,
  );
  const mutable = fixture as unknown as {
    evidence: {
      normalizedTerms: Array<{
        redaction?: { applied: true; reasonCodes: string[] };
      }>;
    };
  };
  mutable.evidence.normalizedTerms[0]!.redaction = {
    applied: true,
    reasonCodes: ['SECRET_LIKE_VALUE'],
  };
  return fixture;
}

function mutateUpstreamEvidenceIdV2(): unknown {
  const fixture = structuredClone(
    UPSTREAM_EXPANDED_HIT_CHARACTERIZATION_RESULT_V2,
  );
  const mutable = fixture as unknown as {
    evidence: { confirmed: Array<{ id: string }> };
  };
  mutable.evidence.confirmed[0]!.id = 'evidence:v2:0002';
  return fixture;
}

function mutateSafeErrorMessageV2(): unknown {
  const fixture = structuredClone(
    SAFE_ERROR_CHARACTERIZATION_ROWS_V2[3]!.expected,
  );
  if (fixture.ok) {
    throw new TypeError('safe-error fixture must be an error');
  }
  const mutable = fixture as unknown as { error: { message: string } };
  mutable.error.message = 'unsafe internal detail';
  return fixture;
}

describe.runIf(selected)('C1 locate execution characterization', () => {
  it('covers every required decision family with production-bound deep-exact evidence', async () => {
    const inlineFamilies = [
      'output-limit',
      'deadline-abort',
      'snapshot-mutation',
      'location-redaction',
      'safe-errors',
      'upstream-1.1.0-expanded-hit',
    ] as const;
    const covered = new Set<string>([
      ...LOCATE_EXECUTION_GOLDEN_CHARACTERIZATION_ROWS_V2.map(
        (row) => row.family,
      ),
      ...inlineFamilies,
    ]);
    expect([...covered].sort()).toEqual(
      [...LOCATE_EXECUTION_CHARACTERIZATION_FAMILIES_V2].sort(),
    );

    for (const row of LOCATE_EXECUTION_GOLDEN_CHARACTERIZATION_ROWS_V2) {
      expect(expectedSemanticSha256IsValidV2(row.semanticSha256)).toBe(true);
      expect(compareGoldenCompanionCharacterizationV2(row), row.caseId).toBe(
        true,
      );
      expect(existsSync(resolve(repositoryRoot, row.ownerFile))).toBe(true);
    }
    expect(LOCATE_EXECUTION_COMPANION_SEMANTIC_SHA256_V2).toEqual(
      expect.objectContaining({
        'codegraph-incomplete':
          '0220c3de1d1abab8609538657784d08e46e3dcc1e2d1a7c1597e2319127ddf30',
      }),
    );

    const outputLimit = await observeProductionOutputLimitV2();
    expect(
      evaluateLocateExecutionCharacterizationResultV2(
        OUTPUT_LIMIT_CHARACTERIZATION_RESULT_V2,
        outputLimit,
      ),
    ).toBe(true);
    expect(locateExecutionSemanticSha256V2(outputLimit)).toBe(
      LOCATE_EXECUTION_INLINE_SEMANTIC_SHA256_V2.outputLimit,
    );
    expect(await observeRipgrepOutputLimitMappingV2()).toMatchObject({
      backend: 'ripgrep',
      status: 'used',
      completion: 'incomplete',
      termination: 'output-limit',
      hitCount: 0,
      retainedHits: [],
    });

    const deadline = await observeProductionDeadlineV2();
    expect(
      evaluateLocateExecutionCharacterizationResultV2(
        DEADLINE_CHARACTERIZATION_RESULT_V2,
        deadline,
      ),
    ).toBe(true);
    expect(locateExecutionSemanticSha256V2(deadline)).toBe(
      LOCATE_EXECUTION_INLINE_SEMANTIC_SHA256_V2.deadlineAbort,
    );

    expect(
      locateExecutionSemanticSha256V2(
        SNAPSHOT_MUTATION_CHARACTERIZATION_RESULT_V2,
      ),
    ).toBe(LOCATE_EXECUTION_INLINE_SEMANTIC_SHA256_V2.snapshotMutation);
    const snapshot = requireSuccess(
      SNAPSHOT_MUTATION_CHARACTERIZATION_RESULT_V2,
    );
    expect(
      snapshot.evidence.confirmed.map((item) => item.location.file),
    ).toEqual(['server/stable.ts']);
    expect(snapshot.evidence.coverage).toMatchObject({
      degradations: ['SNAPSHOT_CHANGED'],
      exclusionSummary: { SNAPSHOT_CHANGED: 3 },
      snapshot: {
        consistency: 'changed',
        discardedEvidenceCount: 3,
      },
    });

    const redaction = await observeProductionLocationRedactionV2();
    expect(
      evaluateLocateExecutionCharacterizationResultV2(
        LOCATION_REDACTION_CHARACTERIZATION_RESULT_V2,
        redaction,
      ),
    ).toBe(true);
    expect(locateExecutionSemanticSha256V2(redaction)).toBe(
      LOCATE_EXECUTION_INLINE_SEMANTIC_SHA256_V2.locationRedaction,
    );
    const redactedSuccess = requireSuccess(redaction);
    expect(redactedSuccess.evidence.normalizedTerms[0]).toEqual({
      value: 'password=[REDACTED]',
      caseSensitive: true,
    });
    expect(redactedSuccess.evidence.candidates[0]?.location).toMatchObject({
      file: '[REDACTED_PATH]',
      resolvable: false,
      excerpt: 'password=[REDACTED]',
    });

    const safeErrors = await observeProductionSafeErrorsV2();
    expect(safeErrors.map((row) => row.caseId)).toEqual(
      SAFE_ERROR_CHARACTERIZATION_ROWS_V2.map((row) => row.caseId),
    );
    for (const row of SAFE_ERROR_CHARACTERIZATION_ROWS_V2) {
      const observation = safeErrors.find(
        (candidate) => candidate.caseId === row.caseId,
      );
      expect(observation, row.caseId).toBeDefined();
      expect(observation?.view.value, row.caseId).toEqual(row.expected);
      expect(observation?.view.compactJson, row.caseId).toBe(
        JSON.stringify(row.expected),
      );
      expect(observation?.view.utf8Bytes, row.caseId).toBe(
        Buffer.byteLength(JSON.stringify(row.expected), 'utf8'),
      );
      expect(locateExecutionSemanticSha256V2(row.expected), row.caseId).toBe(
        LOCATE_EXECUTION_INLINE_SEMANTIC_SHA256_V2.safeErrors[row.caseId],
      );
    }

    const upstreamExpandedHit = await observeProductionUpstreamExpandedHitV2();
    expect(
      evaluateLocateExecutionCharacterizationResultV2(
        UPSTREAM_EXPANDED_HIT_CHARACTERIZATION_RESULT_V2,
        upstreamExpandedHit,
      ),
    ).toBe(true);
    expect(
      locateExecutionSemanticSha256V2(
        UPSTREAM_EXPANDED_HIT_CHARACTERIZATION_RESULT_V2,
      ),
    ).toBe(LOCATE_EXECUTION_INLINE_SEMANTIC_SHA256_V2.upstreamExpandedHit);
  });

  it('rejects every required characterization mutation', () => {
    const backendExpected = readGoldenCompanionResultV2('codegraph-incomplete');
    expect(
      evaluateLocateExecutionCharacterizationResultV2(
        backendExpected,
        mutateBackendOrderV2(),
      ),
    ).toBe(false);
    expect(
      evaluateLocateExecutionCharacterizationResultV2(
        backendExpected,
        mutateStrategyCompleteV2(),
      ),
    ).toBe(false);

    const callerExpected = readGoldenCompanionResultV2(
      'codegraph-global-abort-no-fallback',
    );
    expect(
      evaluateLocateExecutionCharacterizationResultV2(
        callerExpected,
        mutateCallerAbortTimeoutV2(),
      ),
    ).toBe(false);
    expect(
      LocateResultV2Schema.safeParse(mutateCallerAbortTimeoutV2()).success,
    ).toBe(false);

    expect(
      evaluateLocateExecutionCharacterizationResultV2(
        SNAPSHOT_MUTATION_CHARACTERIZATION_RESULT_V2,
        mutateRetainedChangedEvidenceV2(),
      ),
    ).toBe(false);
    expect(
      evaluateLocateExecutionCharacterizationResultV2(
        readGoldenCompanionResultV2('codegraph-symbol-complete-no-fallback'),
        mutateExtraSchemaFieldV2(),
      ),
    ).toBe(false);
    expect(
      LocateResultV2Schema.safeParse(mutateExtraSchemaFieldV2()).success,
    ).toBe(false);

    expect(
      evaluateLocateExecutionCharacterizationResultV2(
        OUTPUT_LIMIT_CHARACTERIZATION_RESULT_V2,
        mutateOutputLimitTerminationV2(),
      ),
    ).toBe(false);
    expect(
      evaluateLocateExecutionCharacterizationResultV2(
        DEADLINE_CHARACTERIZATION_RESULT_V2,
        mutateDeadlineAbortSourceV2(),
      ),
    ).toBe(false);
    expect(
      LocateResultV2Schema.safeParse(mutateDeadlineAbortSourceV2()).success,
    ).toBe(false);
    expect(
      evaluateLocateExecutionCharacterizationResultV2(
        LOCATION_REDACTION_CHARACTERIZATION_RESULT_V2,
        mutateRedactionTermMetadataV2(),
      ),
    ).toBe(false);
    expect(
      evaluateLocateExecutionCharacterizationResultV2(
        UPSTREAM_EXPANDED_HIT_CHARACTERIZATION_RESULT_V2,
        mutateUpstreamEvidenceIdV2(),
      ),
    ).toBe(false);
    expect(
      evaluateLocateExecutionCharacterizationResultV2(
        SAFE_ERROR_CHARACTERIZATION_ROWS_V2[3]!.expected,
        mutateSafeErrorMessageV2(),
      ),
    ).toBe(false);
  });

  it('finalizes immutable C2 facts to exact C1 public transport views', () => {
    const successRows = [
      ...LOCATE_EXECUTION_GOLDEN_CHARACTERIZATION_ROWS_V2.map((row) => ({
        caseId: row.caseId,
        expected: readGoldenCompanionResultV2(row.caseId),
      })),
      {
        caseId: 'output-limit',
        expected: OUTPUT_LIMIT_CHARACTERIZATION_RESULT_V2,
      },
      {
        caseId: 'deadline-abort',
        expected: DEADLINE_CHARACTERIZATION_RESULT_V2,
      },
      {
        caseId: 'snapshot-mutation',
        expected: SNAPSHOT_MUTATION_CHARACTERIZATION_RESULT_V2,
      },
      {
        caseId: 'location-redaction',
        expected: LOCATION_REDACTION_CHARACTERIZATION_RESULT_V2,
      },
      {
        caseId: 'upstream-expanded-hit',
        expected: UPSTREAM_EXPANDED_HIT_CHARACTERIZATION_RESULT_V2,
      },
    ] as const;

    for (const row of successRows) {
      const input = finalizerInputForCharacterizedV2(row.caseId, row.expected);
      const before = structuredClone(input);
      expectDeepFrozenV2(input.facts);
      const first = finalizeLocateResultV2(input);
      const second = finalizeLocateResultV2(input);
      expect(second).toEqual(first);
      expect(input).toEqual(before);
      expectTransportEqualsV2(first, row.expected);
      expect(locateExecutionSemanticSha256V2(first.value), row.caseId).toBe(
        locateExecutionSemanticSha256V2(row.expected),
      );
    }

    for (const row of SAFE_ERROR_CHARACTERIZATION_ROWS_V2) {
      const error = locateExecutionErrorFactsFromPublicResultV2(row.expected);
      expectDeepFrozenV2(error);
      const view = finalizeLocateResultV2({ ok: false, error });
      expectTransportEqualsV2(view, row.expected);
      expect(locateExecutionSemanticSha256V2(view.value), row.caseId).toBe(
        LOCATE_EXECUTION_INLINE_SEMANTIC_SHA256_V2.safeErrors[row.caseId],
      );
    }
  });

  it('freezes C2 facts and rejects finalizer mutation attempts', () => {
    const characterizedInput = finalizerInputForCharacterizedV2(
      'codegraph-incomplete',
      readGoldenCompanionResultV2('codegraph-incomplete'),
    );
    const facts = characterizedInput.facts;
    expect(LOCATE_EXECUTION_FACT_FAMILIES_V2).toEqual([
      'backend',
      'snapshot',
      'ranking',
      'scope',
      'capability',
      'abort',
    ]);
    expect(() =>
      assertLocateExecutionFactFamilySetV2(LOCATE_EXECUTION_FACT_FAMILIES_V2),
    ).not.toThrow();
    expect(() =>
      assertLocateExecutionFactFamilySetV2([
        ...LOCATE_EXECUTION_FACT_FAMILIES_V2,
        'backend',
      ]),
    ).toThrow(TypeError);
    expect(() =>
      assertLocateExecutionFactFamilySetV2(
        LOCATE_EXECUTION_FACT_FAMILIES_V2.slice(1),
      ),
    ).toThrow(TypeError);
    expectDeepFrozenV2(facts);
    expect(JSON.stringify(facts)).not.toContain('evidence:v2:');
    expect(() =>
      (facts.backend.attempts as unknown as unknown[]).reverse(),
    ).toThrow(TypeError);

    const extraFamily = structuredClone(facts) as Record<string, unknown>;
    extraFamily.extra = {};
    expect(() => createLocateExecutionFactsV2(extraFamily as any)).toThrow(
      TypeError,
    );
    const missingFamily = structuredClone(facts) as Record<string, unknown>;
    delete missingFamily.abort;
    expect(() => createLocateExecutionFactsV2(missingFamily as any)).toThrow(
      TypeError,
    );

    expectMutatedFactsRejectedV2(
      'codegraph-incomplete',
      readGoldenCompanionResultV2('codegraph-incomplete'),
      (mutable) => {
        mutable.backend.attempts[0]!.sequence = 1;
        mutable.backend.attempts[1]!.sequence = 0;
      },
    );
    expectMutatedFactsRejectedV2(
      'codegraph-incomplete',
      readGoldenCompanionResultV2('codegraph-incomplete'),
      (mutable) => {
        mutable.backend.attempts[1]!.completion = 'incomplete';
        mutable.backend.attempts[1]!.termination = 'early-stop';
      },
    );
    expectMutatedFactsRejectedV2(
      'deadline-abort',
      DEADLINE_CHARACTERIZATION_RESULT_V2,
      (mutable) => {
        mutable.abort.source = 'caller';
      },
    );
    expectMutatedFactsRejectedV2(
      'output-limit',
      OUTPUT_LIMIT_CHARACTERIZATION_RESULT_V2,
      (mutable) => {
        mutable.backend.attempts[0]!.termination = 'early-stop';
        mutable.backend.attempts[0]!.observedHitCount = 1;
      },
    );
    expectMutatedFactsRejectedV2(
      'snapshot-mutation',
      SNAPSHOT_MUTATION_CHARACTERIZATION_RESULT_V2,
      (mutable) => {
        const stable = mutable.ranking.confirmed[0]!;
        mutable.ranking.confirmed.push({
          ...stable,
          location: {
            ...stable.location,
            file: 'server/changed.ts',
            excerpt: 'const changedId = row.changed_id;',
          },
        });
      },
    );

    const redactionFacts = mutableFactsV2(
      LOCATION_REDACTION_FINALIZE_INPUT_V2.facts,
    );
    redactionFacts.ranking.candidates[0]!.location.file = '[REDACTED_PATH]';
    redactionFacts.ranking.candidates[0]!.location.excerpt =
      'password=[REDACTED]';
    expect(
      evaluateLocateExecutionCharacterizationResultV2(
        LOCATION_REDACTION_CHARACTERIZATION_RESULT_V2,
        finalizeMutatedFactsV2(
          LOCATION_REDACTION_FINALIZE_INPUT_V2,
          redactionFacts,
        ).value,
      ),
    ).toBe(false);
    expect(LOCATION_REDACTION_FINALIZE_INPUT_V2.facts).toBe(
      LOCATION_REDACTION_LOCATE_EXECUTION_FACTS_V2,
    );

    const forgedSafeError = finalizeLocateResultV2({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'unsafe internal detail',
      } as unknown as LocateExecutionErrorFactsV2,
    });
    expect(forgedSafeError.value).toEqual(
      SAFE_ERROR_CHARACTERIZATION_ROWS_V2[3]!.expected,
    );
    expect(forgedSafeError.compactJson).not.toContain('unsafe internal detail');
  });

  it('assigns every materialized public field to one final owner and inventories all authority layers', async () => {
    expect(LOCATE_PUBLIC_FIELD_OWNER_DEFINITION_V2).toContain(
      'final production symbol',
    );
    expect(LOCATE_PUBLIC_FIELD_OWNERS_V2).toHaveLength(73);
    expect(LOCATE_PUBLIC_FIELD_PATHS_V2).toHaveLength(73);
    const publicFields = LOCATE_PUBLIC_FIELD_OWNERS_V2.map(
      (row) => row.ownerPath,
    );
    expect([...publicFields].sort()).toEqual(
      [...LOCATE_PUBLIC_FIELD_PATHS_V2].sort(),
    );
    expect(new Set(publicFields).size).toBe(publicFields.length);

    const successObservation = await observeProductionOutputLimitV2();
    const errorObservation = (await observeProductionSafeErrorsV2())[0]?.view
      .value;
    expect(successObservation.ok).toBe(true);
    expect(errorObservation?.ok).toBe(false);
    expect(Object.hasOwn(successObservation, 'ok')).toBe(true);
    expect(Object.hasOwn(errorObservation ?? {}, 'ok')).toBe(true);
    expect(
      LOCATE_PUBLIC_FIELD_OWNERS_V2.find(
        (row) => row.ownerPath === 'success.ok',
      ),
    ).toMatchObject({
      resultBranch: 'success',
      field: 'ok',
      finalOwner: 'pure-finalizer',
      symbol: 'finalizeLocateResultV2',
    });
    expect(
      LOCATE_PUBLIC_FIELD_OWNERS_V2.find((row) => row.ownerPath === 'error.ok'),
    ).toMatchObject({
      resultBranch: 'error',
      field: 'ok',
      finalOwner: 'pure-finalizer',
      symbol: 'finalizeLocateResultV2',
    });

    for (const row of LOCATE_PUBLIC_FIELD_OWNERS_V2) {
      expect(existsSync(resolve(repositoryRoot, row.source)), row.source).toBe(
        true,
      );
      expect(sourceContainsSymbol(row.source, row.symbol), row.symbol).toBe(
        true,
      );
      expect(row.note.length).toBeGreaterThan(0);
    }

    expect(
      LOCATE_UNMATERIALIZED_PUBLIC_SCHEMA_FIELDS_V2.map((row) => row.field),
    ).toEqual([
      'evidence.normalizedTerms[].redaction',
      'evidence.normalizedTerms[].redaction.applied',
      'evidence.normalizedTerms[].redaction.reasonCodes',
    ]);
    for (const row of LOCATE_UNMATERIALIZED_PUBLIC_SCHEMA_FIELDS_V2) {
      expect(publicFields).not.toContain(`success.${row.field}`);
      expect(
        sourceContainsSymbol(row.schemaSource, row.schemaSymbol),
        row.schemaSymbol,
      ).toBe(true);
      expect(
        sourceContainsSymbol(row.productionSource, row.productionSymbol),
        row.productionSymbol,
      ).toBe(true);
      expect(row.currentBehavior).toContain('drops');
    }

    expect(
      LOCATE_PARALLEL_AUTHORITY_INVENTORY_V2.map((row) => row.decision),
    ).toEqual([
      'status',
      'next-actions',
      'candidate-selection',
      'snapshot-mutation',
      'evidence-materialization',
      'schema-assembly',
      'serialization-transport',
    ]);
    for (const row of LOCATE_PARALLEL_AUTHORITY_INVENTORY_V2) {
      expect(row.legacyAuthority, row.decision).toEqual([]);
      expect(row.v2Authority, row.decision).toEqual([
        {
          source: 'src/evidence/locate-execution/finalize-locate-result-v2.ts',
          symbol: 'finalizeLocateResultV2',
        },
      ]);
      for (const authority of row.v2Authority) {
        expect(
          existsSync(resolve(repositoryRoot, authority.source)),
          authority.source,
        ).toBe(true);
        expect(
          sourceContainsSymbol(authority.source, authority.symbol),
          authority.symbol,
        ).toBe(true);
      }
    }

    expect(LOCATE_AUTHORITY_LAYER_INVENTORY_V2.map((row) => row.layer)).toEqual(
      [
        'canonical-executor-abi',
        'plain-facts-contract',
        'canonical-facts-builder',
        'pure-finalizer',
        'canonical-projector',
        'flat-application-transport',
        'runtime-capability-binding',
      ],
    );
    for (const layer of LOCATE_AUTHORITY_LAYER_INVENTORY_V2) {
      expect(
        existsSync(resolve(repositoryRoot, layer.source)),
        layer.source,
      ).toBe(true);
      expect(layer.symbols.length, layer.layer).toBeGreaterThan(0);
      for (const symbol of layer.symbols) {
        expect(sourceContainsSymbol(layer.source, symbol), symbol).toBe(true);
      }
    }
  });

  it('cuts production authority over to canonical facts and flat transport', () => {
    expect(C3_C4_CUTOVER_BOUNDARY_V2).toEqual({
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
      transportShape: ['value', 'compactJson', 'utf8Bytes'],
    });
    const executorSource = readFileSync(
      resolve(
        repositoryRoot,
        'src/evidence/locate-execution/canonical-locate-executor-v2.ts',
      ),
      'utf8',
    );
    const projectorSource = readFileSync(
      resolve(
        repositoryRoot,
        'src/evidence/locate-execution/v2-locate-result-projector.ts',
      ),
      'utf8',
    );
    const finalizerSource = readFileSync(
      resolve(
        repositoryRoot,
        'src/evidence/locate-execution/finalize-locate-result-v2.ts',
      ),
      'utf8',
    );
    const factsSource = readFileSync(
      resolve(repositoryRoot, 'src/contracts/v2/locate-execution-facts-v2.ts'),
      'utf8',
    );
    const transportContractSource = readFileSync(
      resolve(
        repositoryRoot,
        'src/contracts/v2/canonical-locate-execution-v2.ts',
      ),
      'utf8',
    );
    const applicationSource = readFileSync(
      resolve(
        repositoryRoot,
        'src/evidence/locate-execution/public-locate-execution-application-v2.ts',
      ),
      'utf8',
    );
    for (const removedAuthority of [
      "schemaVersion: '1.0'",
      'LegacyCandidateReservationV1',
      'evaluateLocateStatus',
      'createNextActions',
      'registerProductionAcceptedProjectionSeamsV2',
      'selectAndFreezeLegacyBackendHitsV1',
      'LocateResult',
    ]) {
      expect(executorSource).not.toContain(removedAuthority);
    }
    expect(executorSource).toContain('createLocateExecutionFactsFromDraftV2');
    expect(projectorSource).toContain('finalizeLocateResultV2');
    expect(projectorSource).toContain('requireCanonicalLocateExecutionInputV2');
    expect(projectorSource).not.toContain('ORCHESTRATOR');
    expect(applicationSource).toContain('SerializedLocateResultV2');
    expect(applicationSource).not.toContain('Receipt');
    expect(transportContractSource).toContain(
      'export interface SerializedLocateResultV2',
    );
    for (const field of ['value', 'compactJson', 'utf8Bytes']) {
      expect(transportContractSource).toContain(`readonly ${field}`);
    }
    for (const forbidden of [
      'WeakMap',
      'WeakSet',
      'requireTrusted',
      'Registry',
      'node:fs',
      'node:path',
      'node:child_process',
      'child_process',
      'readFileSync',
      'assemblePublicLocateResultV2',
      'createPublicLocateTransportViewV2',
      "schemaVersion: '1.0'",
    ]) {
      expect(finalizerSource).not.toContain(forbidden);
    }
    expect(finalizerSource).not.toMatch(/from ['"].*contracts\/index/u);
    expect(finalizerSource).not.toMatch(/from ['"].*contracts\/constants/u);
    expect(finalizerSource).not.toMatch(/async |Promise</u);
    for (const forbidden of [
      'requestOutcome',
      'request-outcome',
      'status',
      'strategyComplete',
      'fallbackChecked',
      'nextActions',
      'schemaVersion',
      'FinalizedUnsafeLocateResultV2',
      'LocateResultV2',
    ]) {
      expect(factsSource).not.toContain(forbidden);
    }
    for (const removedPath of [
      'src/evidence/canonical/accepted-complete-real-locate-shadow-orchestrator-v2.ts',
      'src/evidence/canonical/locate-projection-stage-registrar-v2.ts',
      'src/evidence/canonical/materialized-locate-result-composer-v2.ts',
      'src/evidence/canonical/required-owner-finalizer-v2.ts',
      'src/evidence/canonical/trusted-serialized-locate-result-v2.ts',
      'src/evidence/public-output/f2-locate-projection-stages-v2.ts',
      'src/evidence/public-output/materialized-evidence-core-v2.ts',
      'src/evidence/locate-execution/public-locate-transport-registry-v2.ts',
      'src/evidence/locate-execution/register-production-accepted-projection-seams-v2.ts',
      'src/evidence/request-snapshot/legacy-candidate-reservation-v1.ts',
      'src/evidence/request-snapshot/executor-snapshot-bridge-v2.ts',
    ]) {
      expect(
        existsSync(resolve(repositoryRoot, removedPath)),
        removedPath,
      ).toBe(false);
    }
  });
});
