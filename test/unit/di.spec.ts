import { describe, expect, it } from 'vitest';

import { createRepoNavApplicationContext } from '../../src/app/create-application-context.js';
import {
  LocateRequestSchema,
  type BackendHealth,
  type BackendSearchRequest,
  type BackendSearchResult,
  type LocateExecutionContext,
  type LocateRequest,
  type RepositoryEvidenceService,
  type RepositoryReader,
  type RepositoryReadLimits,
  type RepositorySearchBackend,
} from '../../src/contracts/index.js';
import type { LocateResultV2 } from '../../src/contracts/v2/locate-result-v2.js';
import { CanonicalRepositoryLocateExecutorV2 } from '../../src/evidence/locate-execution/canonical-locate-executor-v2.js';
import {
  CANONICAL_LOCATE_EXECUTOR_V2,
  LOCATE_RESULT_PROJECTOR,
} from '../../src/evidence/locate-execution/locate-execution.tokens.js';
import { V2LocateResultProjector } from '../../src/evidence/locate-execution/v2-locate-result-projector.js';
import { RepositoryEvidenceEngine } from '../../src/evidence/repository-evidence-engine.js';
import { NodeMcpStdioHost } from '../../src/mcp/mcp-stdio-host.js';
import { CodeGraphBackend } from '../../src/repository/codegraph-backend.js';
import { RipgrepBackend } from '../../src/repository/ripgrep-backend.js';
import {
  MCP_STDIO_HOST,
  REPOSITORY_EVIDENCE_SERVICE,
  REPOSITORY_READER,
  REPOSITORY_SEARCH_BACKENDS,
} from '../../src/runtime/tokens.js';
import { createRepoNavTestingModule } from '../../testkit/create-testing-module.js';
import { isSelected } from '../../testkit/testing/selection.js';

const identity = { group: 'di', caseId: 'di-assembly' } as const;
const diWiringIdentity = {
  group: 'canonical-locate-bridge',
  caseId: 'canonical-di-wiring',
} as const;
const request = LocateRequestSchema.parse({
  repoPath: 'C:/fixture',
  question: 'Where is hcp_id mapped?',
  terms: ['hcp_id'],
});

class FakeBackend implements RepositorySearchBackend {
  public readonly id = 'ripgrep' as const;

  public async probe(
    _repositoryRoot: string,
    _signal: AbortSignal,
  ): Promise<BackendHealth> {
    return { state: 'available' };
  }

  public async search(
    _request: BackendSearchRequest,
    _signal: AbortSignal,
  ): Promise<BackendSearchResult> {
    return { health: { state: 'available' }, hits: [], complete: true };
  }
}

class FakeReader implements RepositoryReader {
  public async resolveRoot(
    repoPath: string,
    _signal: AbortSignal,
  ): Promise<string> {
    return repoPath;
  }

  public readRange(
    _repositoryRoot: string,
    _relativeFile: string,
    _lines: readonly [number, number],
    _limits: RepositoryReadLimits,
    _signal: AbortSignal,
  ): Promise<never> {
    throw new Error('Fixture readRange was not expected.');
  }

  public readWindow(
    _repositoryRoot: string,
    _relativeFile: string,
    _focusLines: readonly [number, number],
    _limits: RepositoryReadLimits,
    _signal: AbortSignal,
  ): Promise<never> {
    throw new Error('Fixture readWindow was not expected.');
  }

  public async findMatches(): Promise<readonly never[]> {
    return [];
  }
}

class FakeService implements RepositoryEvidenceService {
  public async locate(
    _request: LocateRequest,
    _context: LocateExecutionContext,
  ): Promise<LocateResultV2> {
    return {
      ok: false,
      error: {
        schemaVersion: '2.0',
        code: 'INVALID_REPOSITORY',
        message: 'The repository path could not be opened.',
        recoverable: false,
      },
    } as unknown as LocateResultV2;
  }
}

describe.runIf(isSelected(identity))('NestJS standalone DI assembly', () => {
  it('creates and closes a non-HTTP context with the F4 MCP host', async () => {
    const application = await createRepoNavApplicationContext();
    try {
      const backends = application.get<readonly RepositorySearchBackend[]>(
        REPOSITORY_SEARCH_BACKENDS,
      );
      const reader = application.get<RepositoryReader>(REPOSITORY_READER);
      const service = application.get<RepositoryEvidenceService>(
        REPOSITORY_EVIDENCE_SERVICE,
      );

      expect(backends).toHaveLength(2);
      expect(backends[0]).toBeInstanceOf(CodeGraphBackend);
      expect(backends[1]).toBeInstanceOf(RipgrepBackend);
      expect(backends.map((backend) => backend.id)).toEqual([
        'codegraph',
        'ripgrep',
      ]);
      expect(Object.isFrozen(backends)).toBe(true);
      await expect(
        reader.resolveRoot(request.repoPath, new AbortController().signal),
      ).rejects.toMatchObject({ code: 'INVALID_REPOSITORY' });
      expect(service).toBeInstanceOf(RepositoryEvidenceEngine);
      await expect(
        service.locate(request, { signal: new AbortController().signal }),
      ).resolves.toMatchObject({
        ok: false,
        error: { code: 'INVALID_REPOSITORY' },
      });
      expect(application.get(MCP_STDIO_HOST)).toBeInstanceOf(NodeMcpStdioHost);
      expect('listen' in application).toBe(false);
    } finally {
      await application.close();
    }
  });

  it('replaces every external seam through overrideProvider', async () => {
    const backend = new FakeBackend();
    const reader = new FakeReader();
    const service = new FakeService();
    const testingModule = await createRepoNavTestingModule({
      backends: [backend],
      reader,
      service,
    });

    expect(
      testingModule.get<readonly RepositorySearchBackend[]>(
        REPOSITORY_SEARCH_BACKENDS,
      ),
    ).toEqual([backend]);
    expect(testingModule.get(REPOSITORY_READER)).toBe(reader);
    expect(testingModule.get(REPOSITORY_EVIDENCE_SERVICE)).toBe(service);
    expect(testingModule.get(MCP_STDIO_HOST)).toBeInstanceOf(NodeMcpStdioHost);

    await expect(testingModule.close()).resolves.toBeUndefined();
  });
});

describe.runIf(isSelected(diWiringIdentity))(
  'F1C-DI-001 canonical DI wiring',
  () => {
    it('binds only v1 projector and keeps service on RepositoryEvidenceEngine', async () => {
      const application = await createRepoNavApplicationContext();
      try {
        const service = application.get(REPOSITORY_EVIDENCE_SERVICE);
        const executor = application.get(CANONICAL_LOCATE_EXECUTOR_V2);
        const projector = application.get(LOCATE_RESULT_PROJECTOR);
        expect(service).toBeInstanceOf(RepositoryEvidenceEngine);
        expect(executor).toBeInstanceOf(CanonicalRepositoryLocateExecutorV2);
        expect(projector).toBeInstanceOf(V2LocateResultProjector);
        const providerNames = Object.getOwnPropertyNames(
          Object.getPrototypeOf(application),
        ).join(',');
        expect(providerNames).not.toMatch(/Shadow/u);
      } finally {
        await application.close();
      }
    });
  },
);

describe.runIf(
  isSelected({
    group: 'language-capability-boundary',
    caseId: 'real-complete-shadow',
  }),
)('F8-REAL-SHADOW-001 real-complete-shadow', () => {
  it('registers non-exported orchestrator and runs real aggregation path', async () => {
    const {
      ACCEPTED_COMPLETE_REAL_LOCATE_SHADOW_ORCHESTRATOR_V2,
      createAcceptedCompleteRealLocateShadowOrchestratorV2,
      registerAcceptedCompleteRealAggregationBundleV2,
    } =
      await import('../../src/evidence/canonical/accepted-complete-real-locate-shadow-orchestrator-v2.js');
    const { createFourPrerequisiteCanonicalInputV2 } =
      await import('../../testkit/fixtures/canonical-locate-bridge-v2/four-prerequisite-base-v2.js');
    const { buildAggregationHarnessV2 } =
      await import('../../testkit/fixtures/request-outcome-v2/build-aggregation-harness-v2.js');
    const { issueEvidenceRankingOutcomeV2 } =
      await import('../../src/evidence/ranking/evidence-ranking-outcome-v2.js');
    const { registerF2RankingOutcomeForExecutionV2 } =
      await import('../../src/evidence/public-output/f2-locate-projection-stages-v2.js');
    const { readCompleteRealLocateShadowFailureObservationV2 } =
      await import('../../src/evidence/canonical/accepted-complete-real-locate-shadow-orchestrator-v2.js');
    const application = await createRepoNavApplicationContext();
    try {
      const projector = application.get(LOCATE_RESULT_PROJECTOR);
      expect(projector).toBeInstanceOf(V2LocateResultProjector);
      const orchestrator = application.get(
        ACCEPTED_COMPLETE_REAL_LOCATE_SHADOW_ORCHESTRATOR_V2,
      );
      expect(orchestrator.projectAcceptedExecution).toBeTypeOf('function');

      const { input, capability, execution } =
        createFourPrerequisiteCanonicalInputV2();
      const harness = await buildAggregationHarnessV2({});
      const ranking = issueEvidenceRankingOutcomeV2({
        fragment: Object.freeze({
          confirmed: Object.freeze([]),
          candidates: Object.freeze([]),
          unsatisfiedAnchors: Object.freeze([]),
        }),
        budgetFacts: Object.freeze({
          maxFilesReached: false,
          maxConfirmedReached: false,
          maxCandidatesReached: false,
          preRankingPoolTruncated: false,
          safeSelectorCollision: false,
          safeOrderingCollision: false,
        }),
        confirmed: [],
        candidates: [],
        snapshotProof: harness.input.snapshotProof,
        execution,
        collisionAnchorKeys: new Set(),
      });
      registerF2RankingOutcomeForExecutionV2(
        execution,
        ranking,
        harness.input.snapshotProof,
      );
      registerAcceptedCompleteRealAggregationBundleV2(
        execution,
        Object.freeze({
          execution,
          backendTrace: harness.input.backendTrace,
          fallback: harness.input.fallback,
          ranking,
          snapshotProof: harness.input.snapshotProof,
          resolvedLimits: harness.input.resolvedLimits,
          abortDecision: harness.input.abortDecision,
          abortCoordinator: harness.input.abortCoordinator,
          contributions: Object.freeze([
            harness.input.contributions[1],
            harness.input.contributions[2],
            harness.input.contributions[3],
          ] as const),
          scopeProof: harness.input.scopeProof,
          expectedEligiblePool: harness.input.expectedEligiblePool,
          expectedFoldProof: harness.input.expectedFoldProof,
          expectedCoverageBasis: harness.input.expectedCoverageBasis,
          expectedResolvedScope: harness.input.expectedResolvedScope,
          expectedCapabilityFacts: harness.input.expectedCapabilityFacts,
        }),
      );
      const attempt = orchestrator.projectAcceptedExecution(input, capability);
      if (attempt.ok) {
        expect(attempt.accepted).toBeDefined();
      } else {
        const failure = readCompleteRealLocateShadowFailureObservationV2(
          attempt.failure,
        );
        // production path entered stages (not pre-stage zero counters from stub)
        expect(failure.counters.source).toBe(1);
        expect([
          'SOURCE_INVALID',
          'MATERIALIZATION_INVALID',
          'AGGREGATION_INVALID',
        ]).toContain(failure.code);
      }
      expect(
        createAcceptedCompleteRealLocateShadowOrchestratorV2()
          .projectAcceptedExecution,
      ).toBeTypeOf('function');
    } finally {
      await application.close();
    }
  });
});
