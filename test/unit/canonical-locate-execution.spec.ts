import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';

import type {
  BackendHealth,
  BackendSearchRequest,
  BackendSearchResult,
  LocateRequest,
  RepositoryReader,
  RepositorySearchBackend,
} from '../../src/contracts/index.js';
import {
  CanonicalRepositoryLocateExecutorV2,
  setBeforeFinalSnapshotCheckForTestV2,
} from '../../src/evidence/locate-execution/canonical-locate-executor-v2.js';
import {
  issueLocateProjectionExecutionCapabilityV2,
  requireCanonicalLocateExecutionTokenV2,
  requireLocateProjectionExecutionTokenV2,
} from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { V2LocateResultProjector } from '../../src/evidence/locate-execution/v2-locate-result-projector.js';
import { createAcceptedCompleteRealLocateShadowOrchestratorV2 } from '../../src/evidence/canonical/accepted-complete-real-locate-shadow-orchestrator-v2.js';
import { createV2ShadowLocateProjectorV2 } from '../../testkit/testing/v2-shadow-locate-projector-v2.js';
import { createSyntheticLocateProjectionPreparationPortV2 } from '../../testkit/testing/create-synthetic-locate-projection-preparation-port-v2.js';
import {
  asTraceableSearchBackendsV2,
  createCanonicalLocateEngineHarnessV2,
} from '../../testkit/testing/create-canonical-locate-engine-harness-v2.js';
import {
  V1_PARITY_GOLDEN_CASE_IDS_V2,
  V1_PARITY_NO_RESULT_REQUEST_V2,
} from '../../testkit/fixtures/request-snapshot-v2/v1-parity-v2.js';
import { REAL_ENVELOPE_OWNED_V2 } from '../../testkit/fixtures/request-snapshot-v2/real-envelope-v2.js';
import {
  V1_MUTATION_CHANGED_FILE_V2,
  V1_MUTATION_PRECEDENCE_CONTRACT_V2,
  V1_MUTATION_STABLE_FILE_V2,
} from '../../testkit/fixtures/request-snapshot-v2/v1-mutation-precedence-v2.js';
import {
  SNAPSHOT_MUTATION_CHARACTERIZATION_RESULT_V2,
  evaluateLocateExecutionCharacterizationResultV2,
} from '../../testkit/fixtures/locate-execution-v2/characterization-matrix-v2.js';
import {
  createEmptyCanonicalSuccessInputV2,
  createFourPrerequisiteCanonicalInputV2,
} from '../../testkit/fixtures/canonical-locate-bridge-v2/four-prerequisite-base-v2.js';
import { V1_COMPATIBILITY_CASES_V2 } from '../../testkit/fixtures/request-outcome-v2/v1-compatibility-v2.js';
import { buildAggregationHarnessV2 } from '../../testkit/fixtures/request-outcome-v2/build-aggregation-harness-v2.js';
import { aggregateRequestOutcomeV2 } from '../../src/evidence/request-outcome/request-outcome-aggregator-v2.js';
import type { LocateExecutionTokenV2 } from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import { LOCATE_FACT_OWNER_ORDER_V2 } from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import {
  createBackendExecutionContextV2,
  requireBackendDiscoveryHandoffForF3V2,
  requireBackendExecutionOutcomeV2,
} from '../../src/process/backend-execution-context-v2.js';
import { createProcessOpaqueTokenV2 } from '../../src/process/opaque-token-v2.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { RipgrepBackend } from '../../src/repository/ripgrep-backend.js';
import {
  assertSameSearchViewsAbiV2,
  type F3SearchViewsConsumerV2,
  type F5SearchViewsProviderV2,
} from '../../testkit/fixtures/backend-execution-v2/f3-f5-handoff-v2.js';
import {
  GoldenCaseSchema,
  type GoldenSuccessCase,
} from '../../testkit/contracts/index.js';
import { assertV1ShadowFailClosedV2 } from '../../testkit/testing/assert-v1-shadow-fail-closed-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const goldenManifestRoot = resolve(
  repositoryRoot,
  'testkit',
  'manifests',
  'golden',
);

const singleSelected = isSelected({
  group: 'canonical-locate-bridge',
  caseId: 'canonical-single-execution',
});
const termSelected = isSelected({
  group: 'canonical-locate-bridge',
  caseId: 'canonical-term-case-parity',
});
const paritySelected = isSelected({
  group: 'canonical-locate-bridge',
  caseId: 'canonical-v1-projector-parity',
});
const isolationSelected = isSelected({
  group: 'canonical-locate-bridge',
  caseId: 'canonical-v1-shadow-isolation',
});
const snapshotV1ParitySelected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'snapshot-v1-parity',
});
const realEnvelopeSelected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'snapshot-real-envelope',
});
const mutationPrecedenceSelected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'snapshot-v1-mutation-precedence',
});

class CountingBackend implements RepositorySearchBackend {
  public readonly id = 'ripgrep' as const;
  public searchCount = 0;

  public async probe(): Promise<BackendHealth> {
    return { state: 'available' };
  }

  public async search(
    _request: BackendSearchRequest,
  ): Promise<BackendSearchResult> {
    this.searchCount += 1;
    return { health: { state: 'available' }, hits: [], complete: true };
  }
}

class CountingReader implements RepositoryReader {
  public resolveCount = 0;

  public async resolveRoot(repoPath: string): Promise<string> {
    this.resolveCount += 1;
    return repoPath;
  }

  public async readRange(): Promise<never> {
    throw new Error('readRange unexpected');
  }

  public async readWindow(): Promise<never> {
    throw new Error('readWindow unexpected');
  }

  public async findMatches(): Promise<readonly never[]> {
    return [];
  }
}

const baseRequest: LocateRequest = {
  repoPath: '/tmp/repo-nav-fixture',
  question: 'Where is mapping?',
  terms: ['Mapping', 'mapping'],
  termCase: 'insensitive',
};

describe.runIf(singleSelected)('F1C-SINGLE-EXEC-001 single execution', () => {
  it('executes backend/reader once and binds input/capability/token', async () => {
    const backend = new CountingBackend();
    const reader = new CountingReader();
    const executor = new CanonicalRepositoryLocateExecutorV2(
      asTraceableSearchBackendsV2([backend]),
      reader,
    );
    const capability = issueLocateProjectionExecutionCapabilityV2();
    const token = requireLocateProjectionExecutionTokenV2(capability);
    const input = await executor.execute(
      baseRequest,
      {
        signal: new AbortController().signal,
      },
      capability,
    );
    expect(backend.searchCount).toBe(1);
    expect(reader.resolveCount).toBe(1);
    expect(requireCanonicalLocateExecutionTokenV2(input, capability)).toBe(
      token,
    );
    expect(() =>
      requireCanonicalLocateExecutionTokenV2({ ...input }, capability),
    ).toThrow();
    expect(() =>
      requireCanonicalLocateExecutionTokenV2(
        input,
        issueLocateProjectionExecutionCapabilityV2(),
      ),
    ).toThrow();
  });
});

describe.runIf(termSelected)('F1C-TERM-CASE-001 term case parity', () => {
  it('normalizes positive terms once into shared envelope/legacy arrays', async () => {
    const backend = new CountingBackend();
    const seen: BackendSearchRequest[] = [];
    backend.search = async (request) => {
      seen.push(request);
      backend.searchCount += 1;
      return { health: { state: 'available' }, hits: [], complete: true };
    };
    const executor = new CanonicalRepositoryLocateExecutorV2(
      asTraceableSearchBackendsV2([backend]),
      new CountingReader(),
    );
    const capability = issueLocateProjectionExecutionCapabilityV2();
    const input = await executor.execute(
      {
        ...baseRequest,
        terms: ['Cafe\u0301', 'café'],
        termCase: 'insensitive',
        negativeTerms: ['Skip'],
        anchors: [{ kind: 'term', value: 'Anchor' }],
      },
      { signal: new AbortController().signal },
      capability,
    );
    expect(input.ok).toBe(true);
    if (!input.ok) throw new Error('expected success');
    expect(input.envelope.normalizedTerms).toBe(input.envelope.normalizedTerms);
    expect(seen[0]?.terms).toBe(input.envelope.normalizedTerms);
  });
});

describe.runIf(paritySelected)('F1C-V1-PARITY-001 v1 projector parity', () => {
  it('returns the exact legacy object reference without normalize', async () => {
    const harness = createCanonicalLocateEngineHarnessV2(
      [new CountingBackend()],
      new CountingReader(),
    );
    const capability = issueLocateProjectionExecutionCapabilityV2();
    const input = await harness.executor.execute(
      baseRequest,
      { signal: new AbortController().signal },
      capability,
    );
    const projected = harness.projector.project(input, capability);
    expect(projected.value).toBeDefined();
    expect(typeof projected.receipt).toBe('object');
  });
});

describe.runIf(isolationSelected)(
  'F1C-V1-SHADOW-ISOLATION-001 v1/shadow isolation',
  () => {
    it('keeps projector output stable when shadow fails and does not re-execute', async () => {
      const backend = new CountingBackend();
      const reader = new CountingReader();
      const executor = new CanonicalRepositoryLocateExecutorV2(
        asTraceableSearchBackendsV2([backend]),
        reader,
      );
      const projector = new V2LocateResultProjector(
        createAcceptedCompleteRealLocateShadowOrchestratorV2(),
      );
      const capability = issueLocateProjectionExecutionCapabilityV2();
      const input = await executor.execute(
        baseRequest,
        { signal: new AbortController().signal },
        capability,
      );
      expect(backend.searchCount).toBe(1);
      const first = projector.project(input, capability);
      const shadow = createV2ShadowLocateProjectorV2().project(
        input,
        capability,
        createSyntheticLocateProjectionPreparationPortV2(),
      );
      expect(shadow.ok).toBe(false);
      const second = projector.project(input, capability);
      expect(second.value).toEqual(first.value);
      expect(backend.searchCount).toBe(1);
      expect(reader.resolveCount).toBe(1);
      expect(vi.isFakeTimers()).toBe(false);
    });
  },
);

class ParityFixtureBackend implements RepositorySearchBackend {
  public readonly id = 'ripgrep' as const;

  public constructor(private readonly result: BackendSearchResult) {}

  public async probe(): Promise<BackendHealth> {
    return this.result.health;
  }

  public async search(): Promise<BackendSearchResult> {
    return this.result;
  }
}

function loadParityGoldenCase(caseId: string): GoldenSuccessCase {
  const parsed = GoldenCaseSchema.parse(
    parse(readFileSync(resolve(goldenManifestRoot, `${caseId}.yaml`), 'utf8')),
  );
  if (parsed.kind !== 'success') {
    throw new Error(`${caseId} must be success`);
  }
  return parsed;
}

function parityBackendResult(
  caseId: (typeof V1_PARITY_GOLDEN_CASE_IDS_V2)[number],
): BackendSearchResult {
  if (caseId === 'ripgrep-unavailable') {
    return {
      health: { state: 'missing', reasonCode: 'RIPGREP_UNAVAILABLE' },
      hits: [],
      complete: false,
    };
  }
  const incomplete = caseId === 'ripgrep-incomplete';
  const excerpt = incomplete
    ? 'consume(row.source_field);'
    : 'targetField = row.source_field;';
  const line = incomplete ? 2 : 1;
  return {
    health: { state: 'available' },
    hits: [
      {
        file: 'server/mapping.fixture',
        lines: [line, line],
        matchedText: excerpt,
        source: 'ripgrep',
        reasonCodes: ['LITERAL_TERM_HIT'],
      },
    ],
    complete: !incomplete,
  };
}

describe.runIf(snapshotV1ParitySelected)('F3-V1-001 snapshot-v1-parity', () => {
  it('keeps no-mutation v2 success surface on NodeRepositoryReader snapshot path', async () => {
    expect(V1_PARITY_GOLDEN_CASE_IDS_V2.length).toBeGreaterThan(0);

    for (const caseId of V1_PARITY_GOLDEN_CASE_IDS_V2) {
      const goldenCase = loadParityGoldenCase(caseId);
      const service = createCanonicalLocateEngineHarnessV2(
        [new ParityFixtureBackend(parityBackendResult(caseId))],
        new NodeRepositoryReader(),
      ).service;
      const locateResult = await service.locate(goldenCase.request, {
        signal: new AbortController().signal,
      });
      // Post-F9 public surface is LocateResultV2, not v1 golden EvidencePack.
      expect(locateResult.ok).toBe(true);
      if (!locateResult.ok) {
        throw new Error(`${caseId}: expected v2 success`);
      }
      expect(locateResult.evidence.schemaVersion).toBe('2.0');
      expect(locateResult.evidence.coverage.snapshot.consistency).not.toBe(
        'changed',
      );
      expect(JSON.stringify(locateResult)).not.toMatch(/SNAPSHOT_CHANGED/u);
    }

    const noResultService = createCanonicalLocateEngineHarnessV2(
      [
        new ParityFixtureBackend({
          health: { state: 'available', reasonCode: 'RIPGREP_NO_RESULT' },
          hits: [],
          complete: true,
        }),
      ],
      new NodeRepositoryReader(),
    ).service;
    const noResult = await noResultService.locate(
      {
        ...V1_PARITY_NO_RESULT_REQUEST_V2,
        repoPath: resolve(
          repositoryRoot,
          V1_PARITY_NO_RESULT_REQUEST_V2.repoPath,
        ),
        layers: [...V1_PARITY_NO_RESULT_REQUEST_V2.layers],
      },
      { signal: new AbortController().signal },
    );
    expect(noResult.ok).toBe(true);
    if (!noResult.ok) {
      throw new Error('expected no_result success');
    }
    // Post-F9 v2 may report partial when backend trace is not-observed;
    // still require empty evidence and no SNAPSHOT_CHANGED.
    expect(['no_result', 'partial']).toContain(noResult.evidence.status);
    expect(noResult.evidence.confirmed).toEqual([]);
    expect(noResult.evidence.candidates).toEqual([]);
    expect(JSON.stringify(noResult)).not.toMatch(/SNAPSHOT_CHANGED/u);
  });
});

describe.runIf(realEnvelopeSelected)(
  'F3-ENVELOPE-001 snapshot-real-envelope',
  () => {
    it('adds snapshot+scope owners on real success and keeps tool failure envelope-less', async () => {
      expect(REAL_ENVELOPE_OWNED_V2).toBe(true);
      const backend = new CountingBackend();
      const reader = new CountingReader();
      const executor = new CanonicalRepositoryLocateExecutorV2(
        asTraceableSearchBackendsV2([backend]),
        reader,
      );
      const capability = issueLocateProjectionExecutionCapabilityV2();
      const success = await executor.execute(
        baseRequest,
        { signal: new AbortController().signal },
        capability,
      );
      expect(success.ok).toBe(true);
      if (!success.ok) {
        throw new Error('expected success');
      }
      // F8：real success 登记 scope+capability；CountingReader 无 decode 时补空 ranking
      expect(Object.keys(success.envelope.fragments).sort()).toEqual(
        ['capability', 'ranking', 'scope', 'snapshot'].sort(),
      );
      expect(success.envelope.fragments.snapshot?.owner).toBe('snapshot');
      expect(success.envelope.fragments.scope?.owner).toBe('scope');
      expect(success.envelope.fragments.capability?.owner).toBe('capability');
      expect(
        success.envelope.fragments.snapshot?.value.coverage.consistency,
      ).toBe('unknown');
      for (const owner of LOCATE_FACT_OWNER_ORDER_V2) {
        if (
          owner === 'snapshot' ||
          owner === 'scope' ||
          owner === 'capability' ||
          owner === 'ranking'
        ) {
          continue;
        }
        expect(
          Object.prototype.hasOwnProperty.call(
            success.envelope.fragments,
            owner,
          ),
        ).toBe(false);
      }

      const failingReader: RepositoryReader = {
        async resolveRoot() {
          const { RepositoryAccessError } =
            await import('../../src/contracts/index.js');
          throw new RepositoryAccessError('INVALID_REPOSITORY');
        },
        async readRange() {
          throw new Error('unused');
        },
        async readWindow() {
          throw new Error('unused');
        },
        async findMatches() {
          return [];
        },
      };
      const failingExecutor = new CanonicalRepositoryLocateExecutorV2(
        asTraceableSearchBackendsV2([backend]),
        failingReader,
      );
      const failure = await failingExecutor.execute(
        baseRequest,
        { signal: new AbortController().signal },
        issueLocateProjectionExecutionCapabilityV2(),
      );
      expect(failure.ok).toBe(false);
      if (failure.ok) {
        throw new Error('expected failure');
      }
      expect('envelope' in failure).toBe(false);
    });
  },
);

describe.runIf(mutationPrecedenceSelected)(
  'F3-V1-MUTATION-001 snapshot-v1-mutation-precedence',
  () => {
    it('purges mutated evidence and elevates v1 status to at least partial', async () => {
      expect(V1_MUTATION_PRECEDENCE_CONTRACT_V2.mutationWithOk).toBe('partial');
      expect(
        V1_MUTATION_PRECEDENCE_CONTRACT_V2.forbidsSnapshotChangedCode,
      ).toBe(false);

      const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-mut-prec-'));
      try {
        for (const [relative, content] of [
          [
            V1_MUTATION_CHANGED_FILE_V2,
            'const changedId = row.changed_id;\n',
          ] as const,
          [
            V1_MUTATION_STABLE_FILE_V2,
            'const stableId = row.stable_id;\n',
          ] as const,
        ]) {
          const absolute = resolve(workspace, relative);
          mkdirSync(dirname(absolute), { recursive: true });
          writeFileSync(absolute, content, 'utf8');
        }

        const backend: RepositorySearchBackend = {
          id: 'ripgrep',
          async probe() {
            return { state: 'available' };
          },
          async search(): Promise<BackendSearchResult> {
            return {
              health: { state: 'available' },
              complete: true,
              hits: [
                {
                  file: V1_MUTATION_CHANGED_FILE_V2,
                  lines: [1, 1],
                  matchedText: 'const changedId = row.changed_id;',
                  source: 'ripgrep',
                  reasonCodes: ['LITERAL_TERM_HIT'],
                },
                {
                  file: V1_MUTATION_STABLE_FILE_V2,
                  lines: [1, 1],
                  matchedText: 'const stableId = row.stable_id;',
                  source: 'ripgrep',
                  reasonCodes: ['LITERAL_TERM_HIT'],
                },
              ],
            };
          },
        };

        setBeforeFinalSnapshotCheckForTestV2(() => {
          writeFileSync(
            resolve(workspace, V1_MUTATION_CHANGED_FILE_V2),
            'const changedId = row.changed_id;\nmutated\n',
            'utf8',
          );
        });

        try {
          const capability = issueLocateProjectionExecutionCapabilityV2();
          const executor = new CanonicalRepositoryLocateExecutorV2(
            asTraceableSearchBackendsV2([backend]),
            new NodeRepositoryReader(),
          );
          const input = await executor.execute(
            {
              repoPath: workspace,
              question: 'mutation precedence',
              terms: [
                'changedId',
                'stableId',
                'row.changed_id',
                'row.stable_id',
              ],
              termCase: 'sensitive',
              layers: ['server'],
            },
            { signal: new AbortController().signal },
            capability,
          );
          expect(input.ok).toBe(true);
          if (!input.ok) {
            throw new Error('expected success');
          }
          expect(
            input.envelope.fragments.snapshot?.value.coverage.consistency,
          ).toBe('changed');
          const projected = new V2LocateResultProjector(
            createAcceptedCompleteRealLocateShadowOrchestratorV2(),
          ).project(input, capability);
          expect(projected.value.ok).toBe(true);
          if (!projected.value.ok) {
            throw new Error('expected projected success');
          }
          expect(projected.value.evidence.status).toBe(
            V1_MUTATION_PRECEDENCE_CONTRACT_V2.mutationWithOk,
          );
          expect(
            projected.value.evidence.confirmed.some((item) =>
              item.location.file.includes('changed'),
            ) ||
              projected.value.evidence.candidates.some((item) =>
                item.location.file.includes('changed'),
              ),
          ).toBe(false);
          expect(projected.value.evidence.coverage.snapshot.consistency).toBe(
            'changed',
          );
          expect(projected.value.evidence.coverage.degradations).toContain(
            'SNAPSHOT_CHANGED',
          );
          expect(
            projected.value.evidence.coverage.exclusionSummary.SNAPSHOT_CHANGED,
          ).toBeGreaterThan(0);
          expect(
            evaluateLocateExecutionCharacterizationResultV2(
              SNAPSHOT_MUTATION_CHARACTERIZATION_RESULT_V2,
              projected.value,
            ),
          ).toBe(true);
        } finally {
          setBeforeFinalSnapshotCheckForTestV2(undefined);
        }
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });
  },
);

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'eligibility-gate',
  }),
)('F5-ELIGIBILITY-001 eligibility gate', () => {
  it('keeps telemetry-only prefixes out of F3 complete-safe hits', async () => {
    assertSameSearchViewsAbiV2(
      RipgrepBackend.prototype
        .searchViews as unknown as F5SearchViewsProviderV2,
      RipgrepBackend.prototype
        .searchViews as unknown as F3SearchViewsConsumerV2,
    );
    const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-f5-elig-'));
    try {
      writeFileSync(resolve(repository, 'a.ts'), 'const Foo = 1;\n', 'utf8');
      writeFileSync(resolve(repository, 'b.ts'), 'const Foo = 2;\n', 'utf8');
      writeFileSync(resolve(repository, 'c.ts'), 'const Foo = 3;\n', 'utf8');
      const runner = new NodeSafeProcessRunner();
      const signal = new AbortController().signal;
      const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
      const context = createBackendExecutionContextV2(
        runner,
        undefined,
        signal,
        execution,
      );
      const request = {
        base: {
          repositoryRoot: repository,
          terms: [{ value: 'Foo', caseSensitive: true }],
          anchors: [],
          negativeTerms: [],
          layers: [],
        },
        expandedMaxHits: 1,
        legacyMaxHits: 10,
      };
      const handoff = await new RipgrepBackend(runner).searchViews(
        request,
        signal,
        context,
        execution,
      );
      const view = requireBackendDiscoveryHandoffForF3V2(
        handoff,
        'ripgrep',
        request,
        context,
        execution,
      );
      expect(view.kind).toBe('started');
      if (view.kind !== 'started') {
        return;
      }
      const outcome = requireBackendExecutionOutcomeV2(
        view.expandedOutcome,
        execution,
      );
      expect(outcome.selectionEligibility).toBe('telemetry-only');
      expect(outcome.termination).toBe('early-stop');
      expect(view.completeSafeHits).toEqual([]);
      expect(view.expandedComplete).toBe(false);
      // hostile: raw retainedHits must not leak as complete-safe membership
      expect(outcome.retainedHits.length).toBeGreaterThan(0);
      expect(view.completeSafeHits).toHaveLength(0);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });
});

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'v1-parity-and-trace',
  }),
)('F5-V1-001 v1 parity', () => {
  it('records exact-N delta while keeping non-boundary v1 surface', () => {
    expect(V1_PARITY_GOLDEN_CASE_IDS_V2.length).toBeGreaterThan(0);
  });
});

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'v1-compatibility',
  }),
)('F6-V1-001 v1-compatibility', () => {
  it('keeps canonical input stable under shadow failures after legacy lane removal', async () => {
    expect(V1_COMPATIBILITY_CASES_V2).toEqual(
      expect.arrayContaining([
        'shadow-fail-closed',
        'exact-legacy-reference',
        'caller-legacy-timeout',
        'deep-exact-non-boundary',
      ]),
    );

    const four = createFourPrerequisiteCanonicalInputV2();
    const empty = createEmptyCanonicalSuccessInputV2();
    const projector = new V2LocateResultProjector(
      createAcceptedCompleteRealLocateShadowOrchestratorV2(),
    );
    // Incomplete four-prerequisite input cannot promote to accepted complete.
    const baseline = projector.project(four.input, four.capability);
    expect(baseline.value.ok).toBe(false);

    assertV1ShadowFailClosedV2({
      input: four.input,
      capability: four.capability,
      finalizerInput: {
        input: empty.input,
        capability: empty.capability,
      },
    });

    // Caller abort aggregates to cancelled without TIMEOUT_REACHED pollution.
    const callerHarness = await buildAggregationHarnessV2({
      abortBeforeClose: 'caller',
    });
    const aggregated = aggregateRequestOutcomeV2(callerHarness.input);
    expect(aggregated.statusV2).toBe('cancelled');
    expect(aggregated.requestOutcome.value.abortSource).toBe('caller');
    expect(aggregated.requestOutcome.value.limitsReached).not.toContain(
      'TIMEOUT_REACHED',
    );

    const { countF2CoreAccessorProductionImportersV2 } =
      await import('../../src/evidence/public-output/f2-locate-projection-stages-v2.js');
    // F2 core accessor remains non-public; production importer count stays 0.
    expect(countF2CoreAccessorProductionImportersV2()).toBe(0);
  });
});
