import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { LocateResultV2Schema } from '../../src/contracts/v2/locate-result-v2.js';
import {
  C1_PRODUCTION_BOUNDARY_V2,
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
          '4b7a8404aa1b63e9edb062d67f3a5f9be54021d70bf5bf30067e6d2438734179',
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
      value: '[REDACTED]=[REDACTED]',
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
      finalOwner: 'composition',
      symbol: 'MaterializedLocateResultComposerV2Impl.compose',
    });
    expect(
      LOCATE_PUBLIC_FIELD_OWNERS_V2.find((row) => row.ownerPath === 'error.ok'),
    ).toMatchObject({
      resultBranch: 'error',
      field: 'ok',
      finalOwner: 'safe-error-serialization',
      symbol: 'createTrustedSerializedPublicToolErrorV2',
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
      expect(row.legacyAuthority.length, row.decision).toBeGreaterThan(0);
      expect(row.v2Authority.length, row.decision).toBeGreaterThan(0);
      for (const authority of [...row.legacyAuthority, ...row.v2Authority]) {
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

    const safeErrorAuthority = {
      source: 'src/evidence/canonical/trusted-serialized-locate-result-v2.ts',
      symbol: 'createTrustedSerializedPublicToolErrorV2',
    };
    for (const decision of ['schema-assembly', 'serialization-transport']) {
      expect(
        LOCATE_PARALLEL_AUTHORITY_INVENTORY_V2.find(
          (row) => row.decision === decision,
        )?.v2Authority,
        decision,
      ).toContainEqual(safeErrorAuthority);
    }

    expect(LOCATE_AUTHORITY_LAYER_INVENTORY_V2.map((row) => row.layer)).toEqual(
      [
        'schema-1.0-construction',
        'fact-envelope',
        'backend-trace',
        'production-seam-registration',
        'f2-source-materialization-registration',
        'projection-registries',
        'request-outcome-aggregation',
        'accepted-aggregation-registration',
        'required-owner-finalization',
        'public-composition',
        'schema-and-serialization',
        'public-transport-registry',
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
    expect(
      LOCATE_AUTHORITY_LAYER_INVENTORY_V2.find(
        (row) => row.layer === 'schema-and-serialization',
      )?.symbols,
    ).toContain(safeErrorAuthority.symbol);
  });

  it('keeps C1 characterization-only without changing ABI or cutting production authority', () => {
    expect(C1_PRODUCTION_BOUNDARY_V2).toEqual({
      executorAbi:
        'src/contracts/v2/locate-fact-envelope-v2.ts#CanonicalLocateExecutorV2.execute',
      productionExecutor:
        'src/evidence/locate-execution/canonical-locate-executor-v2.ts#CanonicalRepositoryLocateExecutorV2',
      productionProjector:
        'src/evidence/locate-execution/v2-locate-result-projector.ts#V2LocateResultProjector',
      internalLegacySchemaVersion: '1.0',
      publicSchemaVersion: '2.0',
      c1Disposition: 'characterize-only',
      forbiddenC1Changes: [
        'LocateExecutionFactsV2',
        'executor-abi-change',
        'production-authority-cutover',
        'schema-1.0-removal',
      ],
    });
    const executorSource = readFileSync(
      resolve(
        repositoryRoot,
        'src/evidence/locate-execution/canonical-locate-executor-v2.ts',
      ),
      'utf8',
    );
    expect(executorSource).toContain("schemaVersion: '1.0'");
    expect(executorSource).toContain('LegacyCandidateReservationV1');
    expect(executorSource).toContain('evaluateLocateStatus');
    expect(executorSource).toContain('createNextActions');
    expect(executorSource).toContain(
      'registerProductionAcceptedProjectionSeamsV2',
    );
    expect(
      existsSync(
        resolve(
          repositoryRoot,
          'src/contracts/v2/locate-execution-facts-v2.ts',
        ),
      ),
    ).toBe(false);
  });
});
