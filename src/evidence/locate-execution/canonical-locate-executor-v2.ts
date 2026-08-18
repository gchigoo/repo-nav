import { Inject, Injectable } from '@nestjs/common';

import {
  createDiscoveryKey,
  DEFAULT_MAX_FILE_BYTES,
  LIMIT_REASON_CODES,
  normalizeLocateAnchors,
  normalizeSearchTerms,
  RepositoryAccessError,
  resolveLocateLimits,
  type BackendHealth,
  type BackendSearchResult,
  type CandidateEvidence,
  type ConfirmedEvidence,
  type ExclusionReasonCode,
  type LimitReasonCode,
  type LocateExecutionContext,
  type LocateRequest,
  type NormalizedLocateAnchor,
  type NormalizedSearchTerm,
  type RepoLayer,
  type RepositoryReader,
  type ResolvedLocateLimits,
  type SearchBackendId,
  requireCallerSignal,
} from '../../contracts/index.js';
import type {
  CanonicalLocateExecutionReceiptV2,
  CanonicalLocateExecutionV2,
  CanonicalLocateExecutorV2,
  LocateProjectionExecutionCapabilityV2,
} from '../../contracts/v2/canonical-locate-execution-v2.js';
import type { BackendExecutionContextV2 } from '../../contracts/v2/backend-execution-outcome-v2.js';
import type {
  LocateExecutionBackendAttemptFactsV2,
  LocateExecutionErrorFactsV2,
} from '../../contracts/v2/locate-execution-facts-v2.js';
import type {
  RankedEvidenceFactsV2,
  SnapshotFactsV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { TraceableRepositorySearchBackendV2 } from '../../contracts/v2/traceable-repository-search-backend-v2.js';
import type { LocateAnchor, TermCaseMode } from '../../contracts/request.js';
import { createBackendExecutionContextV2 } from '../../process/backend-execution-context-v2.js';
import { NodeRepositoryReader } from '../../repository/node-repository-reader.js';
import { NodeSafeProcessRunner } from '../../repository/node-safe-process-runner.js';
import {
  REPOSITORY_READER,
  REPOSITORY_SEARCH_BACKENDS,
} from '../../runtime/tokens.js';
import {
  LocateAbortCoordinatorV2,
  requireFinalizedAbortDecisionV2,
  type LocateAbortSource,
} from '../abort-source.js';
import {
  applyCandidatePolicy,
  createVerifiedCandidateContext,
  materializeCandidateDraft,
} from '../candidate-policy.js';
import { classifyDiscoveryRecords } from '../direct-mapping-classifier.js';
import { verifyAndMergeBackendHits } from '../discovery-record.js';
import { buildExecutionCapabilityCoverageMountV2 } from '../language/build-execution-capability-coverage-v2.js';
import { normalizeAnchorIntentsV2 } from '../ranking/anchor-intent-normalizer-v2.js';
import { EvidenceRankerV2 } from '../ranking/evidence-ranker-v2.js';
import {
  requireEvidenceRankingOutcomeV2,
  type EvidenceRankingOutcomeV2,
} from '../ranking/evidence-ranking-outcome-v2.js';
import {
  selectCandidateBudget,
  selectConfirmedBudget,
} from '../result-budget-selector.js';
import {
  bindSelectedVerificationOutcomeToSnapshotV2,
  buildPreRankingStablePoolsV2,
  buildStableEligibleScopeRecordsFromObservationV2,
  CandidateTokenProposalEnumeratorV2,
  createMultiViewBackendSearchRequestV2,
  createRequestRepositorySnapshotV2,
  createZeroReadSnapshotFactsV2,
  evaluateExpandedCandidateProposalsV2,
  legacyMaxHitsFromPublicLimitsV2,
  probeRepositoryGitStateDetailedV2,
  registerDualLaneExecutionReceiptV2,
  searchBackendMultiViewV2,
  VerifiedDiscoveryObservationCacheV2,
  type BoundSafeDiscoverySelectionV2,
  type RequestRepositorySnapshotV2,
  type SelectedVerificationOutcomeV2,
  type TrustedScopeEligibilityObservationV2,
  type TrustedScopeFoldedSelectorViewV2,
} from '../request-snapshot/index.js';
import {
  buildPreRankingPoolInputsV2,
  purgeEvidenceByChangedKeysV2,
} from '../request-snapshot/execution-evidence-bridge-v2.js';
import {
  buildExecutionScopeCoverageMountV1,
  classifyDiscoveryRecordsThroughScopeBoundProducersV2,
} from '../scope/index.js';
import { runAuthoritativeExpandedSelectionPhaseV2 } from './authoritative-expanded-selection-phase-v2.js';
import { closeAndFinalizeLocateSynchronouslyV2 } from './canonical-locate-finalization-v2.js';
import {
  createLocateExecutionFactsFromDraftV2,
  createPassthroughRankedEvidenceFactsV2,
  type LocateExecutionDraftV2,
} from './locate-execution-draft-v2.js';
import {
  createCanonicalLocateExecutionReceiptV2,
  requireLocateProjectionExecutionTokenV2,
} from './locate-projection-execution-capability-v2.js';
import {
  resolveVerificationHitsV2,
  selectLegacyVerificationHitsV2,
} from './resolve-verification-hits-v2.js';

/**
 * Production Nest 注入的是精确 NodeRepositoryReader；测试 double / 子类仍走注入 reader，
 * 避免 request snapshot 的 VerifiedTextFileSource 绕过 readRange/readWindow 覆写。
 */
function shouldUseRequestSnapshotReader(
  reader: RepositoryReader,
): reader is NodeRepositoryReader {
  return reader.constructor === NodeRepositoryReader;
}

/** 测试 seam：final check 前触发（mutation precedence fixture）。 */
let beforeFinalSnapshotCheckForTestV2: (() => void | Promise<void>) | undefined;

/**
 * 仅测试：在 executor final check 前注入副作用。
 */
export function setBeforeFinalSnapshotCheckForTestV2(
  hook: (() => void | Promise<void>) | undefined,
): void {
  beforeFinalSnapshotCheckForTestV2 = hook;
}

const CLASSIFICATION_MAX_LINES = 12;
const CLASSIFICATION_MAX_BYTES = 4 * 1024;

interface TimeoutResultOptions {
  readonly attempts?: readonly LocateExecutionBackendAttemptFactsV2[];
  readonly codeGraphHealth?: BackendHealth;
  readonly confirmed?: readonly ConfirmedEvidence[];
  readonly candidates?: readonly CandidateEvidence[];
  readonly limitsReached?: readonly LimitReasonCode[];
  readonly exclusionSummary?: Readonly<
    Partial<Record<ExclusionReasonCode, number>>
  >;
}

function verificationTerms(
  terms: readonly NormalizedSearchTerm[],
  anchors: readonly NormalizedLocateAnchor[],
): readonly NormalizedSearchTerm[] {
  const values: NormalizedSearchTerm[] = [...terms];
  for (const anchor of anchors) {
    if (
      anchor.kind === 'term' ||
      anchor.kind === 'table' ||
      anchor.kind === 'route'
    ) {
      values.push({ value: anchor.value, caseSensitive: anchor.caseSensitive });
    }
  }
  const seen = new Set<string>();
  return Object.freeze(
    values.filter((term) => {
      const key = `${term.caseSensitive ? '1' : '0'}\u0000${
        term.caseSensitive ? term.value : term.value.toLocaleLowerCase('und')
      }`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    }),
  );
}

function uniqueSchemaOrder<T extends string>(
  values: readonly T[],
  schemaOrder: readonly T[],
): readonly T[] {
  const priorities = new Map(schemaOrder.map((value, index) => [value, index]));
  return Object.freeze(
    Array.from(new Set(values)).sort(
      (left, right) =>
        (priorities.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (priorities.get(right) ?? Number.MAX_SAFE_INTEGER),
    ),
  );
}

function attemptFor(
  backend: SearchBackendId,
  health: BackendHealth,
  hitCount: number,
  sequence = 0,
): LocateExecutionBackendAttemptFactsV2 {
  const aborted = health.reasonCode === 'BACKEND_ABORTED';
  const outcome: LocateExecutionBackendAttemptFactsV2['outcome'] =
    health.state === 'available' || aborted
      ? 'used'
      : health.state === 'missing' || health.state === 'unavailable'
        ? 'unavailable'
        : 'failed';
  const reasonCode = health.reasonCode;
  return Object.freeze({
    sequence,
    backend,
    outcome,
    completion: 'incomplete' as const,
    termination: aborted
      ? ('aborted' as const)
      : outcome === 'failed'
        ? ('process-error' as const)
        : ('none' as const),
    observedHitCount: hitCount,
    ...(reasonCode === undefined ? {} : { reasonCode }),
  });
}

function indexStateFor(
  health: BackendHealth | undefined,
): 'available' | 'missing' | 'unavailable' | 'error' | 'unknown' {
  return health?.state ?? 'unknown';
}

function indexFreshnessFor(
  health: BackendHealth | undefined,
): 'not-applicable' | 'unknown' | 'possibly-stale' {
  if (health === undefined) {
    return 'unknown';
  }
  if (health.state === 'missing' || health.state === 'unavailable') {
    return 'not-applicable';
  }
  return health.possibleStaleIndex === true ? 'possibly-stale' : 'unknown';
}

function decideToolError(error: unknown): LocateExecutionErrorFactsV2 {
  if (error instanceof RepositoryAccessError) {
    if (error.code === 'INVALID_REPOSITORY') {
      return Object.freeze({ code: 'INVALID_REPOSITORY' as const });
    }
    if (
      error.code === 'PATH_OUTSIDE_ROOT' ||
      error.code === 'INVALID_RELATIVE_PATH'
    ) {
      return Object.freeze({ code: 'PATH_OUTSIDE_ROOT' as const });
    }
  }
  return Object.freeze({ code: 'INTERNAL_ERROR' as const });
}

@Injectable()
export class CanonicalRepositoryLocateExecutorV2 implements CanonicalLocateExecutorV2 {
  public constructor(
    @Inject(REPOSITORY_SEARCH_BACKENDS)
    private readonly backends: readonly TraceableRepositorySearchBackendV2[],
    @Inject(REPOSITORY_READER)
    private readonly reader: RepositoryReader,
  ) {}

  private terminalSuccess(
    draft: LocateExecutionDraftV2,
    resolvedLimits: ResolvedLocateLimits,
    facts: import('../../contracts/v2/locate-execution-facts-v2.js').LocateExecutionFactsV2,
    projectionExecution: LocateProjectionExecutionCapabilityV2,
  ): CanonicalLocateExecutionReceiptV2 {
    const execution =
      requireLocateProjectionExecutionTokenV2(projectionExecution);
    const input: CanonicalLocateExecutionV2 = Object.freeze({
      ok: true as const,
      repositoryRoot: draft.repositoryRoot,
      normalizedTerms: Object.freeze(
        draft.normalizedTerms.map((term) => Object.freeze({ ...term })),
      ),
      resolvedLimits: Object.freeze({ ...resolvedLimits }),
      facts,
    });
    return createCanonicalLocateExecutionReceiptV2(
      input,
      projectionExecution,
      execution,
    );
  }

  /**
   * 有成功 decode 时跑 git probe + pre-ranking pool + final check/purge，
   * 并把真实 SnapshotFacts 传入 terminalSuccess；零 decode 才走 zero-read。
   */
  private async terminalSuccessWithSnapshot(
    draft: LocateExecutionDraftV2,
    projectionExecution: LocateProjectionExecutionCapabilityV2,
    options: {
      readonly requestSnapshot: RequestRepositorySnapshotV2 | undefined;
      readonly signal: AbortSignal;
      readonly discoveryRecords?: Parameters<
        typeof buildPreRankingPoolInputsV2
      >[0]['discoveryRecords'];
      readonly confirmed?: readonly ConfirmedEvidence[];
      readonly candidates?: readonly CandidateEvidence[];
      readonly expandedPoolCandidates?: readonly CandidateEvidence[];
      readonly limits: ResolvedLocateLimits;
      readonly abortSource?: LocateAbortSource;
      readonly abortCoordinator?: ReturnType<
        typeof LocateAbortCoordinatorV2.create
      >;
      readonly rawAnchors?: readonly LocateAnchor[];
      readonly termCase?: TermCaseMode;
      readonly discoverySelection?: BoundSafeDiscoverySelectionV2;
      readonly selectedVerificationOutcome?: SelectedVerificationOutcomeV2;
      readonly foldedView?: TrustedScopeFoldedSelectorViewV2;
      readonly scopeObservation?: TrustedScopeEligibilityObservationV2;
      readonly requestedLayers?: readonly RepoLayer[];
      readonly backendExecutionContext?: BackendExecutionContextV2;
    },
  ): Promise<CanonicalLocateExecutionReceiptV2> {
    const execution =
      requireLocateProjectionExecutionTokenV2(projectionExecution);
    const snapshot = options.requestSnapshot;
    const confirmed = options.confirmed ?? draft.confirmed;
    const candidates = options.candidates ?? draft.candidates;
    const abortCoordinator =
      options.abortCoordinator ??
      LocateAbortCoordinatorV2.create(
        new AbortController().signal,
        options.limits.timeoutMs,
      );

    if (snapshot === undefined || snapshot.getDecodeInvocationCount() === 0) {
      const scopeMount = await buildExecutionScopeCoverageMountV1({
        execution,
        requestedLayers: options.requestedLayers,
        ...(options.foldedView === undefined
          ? {}
          : { foldedView: options.foldedView }),
      });
      const capabilityMount = await buildExecutionCapabilityCoverageMountV2({
        execution,
        foldProof: scopeMount.foldProof,
        scopeProof: scopeMount.view.proof,
        eligiblePool: scopeMount.eligiblePool,
        snapshotProof: scopeMount.snapshotProof,
        retainedEligible: Object.freeze([]),
      });
      const abortDecision = abortCoordinator.closeFinalization();
      const abortSource = requireFinalizedAbortDecisionV2(
        abortDecision,
        abortCoordinator,
      );
      const retainedFiles = new Set(
        [...confirmed, ...candidates].map((item) => item.location.file),
      ).size;
      const snapshotFacts: SnapshotFactsV2 =
        retainedFiles > 0
          ? Object.freeze({
              coverage: Object.freeze({
                gitState: 'unknown' as const,
                consistency: 'stable' as const,
                filesChecked: retainedFiles,
                discardedEvidenceCount: 0,
              }),
              finalStableEvidence: Object.freeze([]),
            })
          : createZeroReadSnapshotFactsV2();
      const rankingFacts = createPassthroughRankedEvidenceFactsV2({
        confirmed,
        candidates,
      });
      const finalizedDraft: LocateExecutionDraftV2 = Object.freeze({
        ...draft,
        confirmed,
        candidates,
        abortSource,
      });
      const facts = createLocateExecutionFactsFromDraftV2({
        draft: finalizedDraft,
        snapshotFacts,
        rankingFacts,
        rankingOutcome: undefined,
        scopeMount,
        capabilityMount,
        backendExecutionContext: options.backendExecutionContext,
        execution,
      });
      return this.terminalSuccess(
        finalizedDraft,
        options.limits,
        facts,
        projectionExecution,
      );
    }

    await beforeFinalSnapshotCheckForTestV2?.();

    const gitProbe = await probeRepositoryGitStateDetailedV2(
      draft.repositoryRoot,
      new NodeSafeProcessRunner(),
      options.signal,
    );
    const discoveryRecords = options.discoveryRecords ?? [];
    const legacyKeys = new Set(
      [...confirmed, ...candidates].map((item) =>
        createDiscoveryKey(item.location),
      ),
    );
    const expandedOnlyForPool = (options.expandedPoolCandidates ?? []).filter(
      (item) => !legacyKeys.has(createDiscoveryKey(item.location)),
    );
    const poolInputs = buildPreRankingPoolInputsV2({
      discoveryRecords,
      confirmed,
      candidates: Object.freeze([...candidates, ...expandedOnlyForPool]),
      canonicalFileKeyFor: (locator) => snapshot.canonicalFileKeyFor(locator),
    });
    const pools = buildPreRankingStablePoolsV2(poolInputs);
    const finalPools = await snapshot.finalCheck(
      options.signal,
      execution,
      pools.evidence,
      pools.eligible,
      gitProbe.gitState,
      gitProbe.snapshotRef,
      options.selectedVerificationOutcome === undefined ||
        options.discoverySelection === undefined
        ? undefined
        : Object.freeze({
            boundSelection: options.discoverySelection,
            selectedVerificationOutcome: options.selectedVerificationOutcome,
          }),
    );
    const snapshotBoundSelectedVerificationOutcome =
      options.selectedVerificationOutcome === undefined ||
      options.discoverySelection === undefined
        ? undefined
        : bindSelectedVerificationOutcomeToSnapshotV2({
            outcome: options.selectedVerificationOutcome,
            boundSelection: options.discoverySelection,
            snapshotProof: finalPools.proof,
            execution,
          });

    const finalizeSync = (abortSource: LocateAbortSource) =>
      Object.freeze({
        confirmed: purgeEvidenceByChangedKeysV2(
          confirmed,
          finalPools.changedCanonicalKeys,
          (locator) => snapshot.canonicalFileKeyFor(locator),
        ),
        candidates: purgeEvidenceByChangedKeysV2(
          candidates,
          finalPools.changedCanonicalKeys,
          (locator) => snapshot.canonicalFileKeyFor(locator),
        ),
        abortSource,
      });

    const adjusted =
      options.abortCoordinator === undefined
        ? (() => {
            const decision = abortCoordinator.closeFinalization();
            return finalizeSync(
              requireFinalizedAbortDecisionV2(decision, abortCoordinator),
            );
          })()
        : closeAndFinalizeLocateSynchronouslyV2(
            abortCoordinator,
            ({ abortSource }) => finalizeSync(abortSource),
          );

    let rankingOutcome: EvidenceRankingOutcomeV2 | undefined;
    let rankingFacts: RankedEvidenceFactsV2;
    if (options.discoverySelection !== undefined) {
      const intents = normalizeAnchorIntentsV2(
        options.rawAnchors ?? [],
        options.termCase ?? 'smart',
      );
      rankingOutcome = new EvidenceRankerV2().rank({
        finalPools,
        pool: finalPools.evidence,
        snapshotFacts: finalPools.facts,
        snapshotProof: finalPools.proof,
        normalizedTerms: draft.normalizedTerms,
        anchorIntents: intents,
        limits: {
          maxFiles: options.limits.maxFiles,
          maxConfirmed: options.limits.maxConfirmed,
          maxCandidates: options.limits.maxCandidates,
        },
        discoverySelection: options.discoverySelection,
        execution,
        preRankingPoolTruncated: pools.evidence.preRankingPoolTruncated,
      });
      rankingFacts = requireEvidenceRankingOutcomeV2(
        rankingOutcome,
        finalPools.proof,
        execution,
      ).fragment.value;
    } else {
      rankingFacts = createPassthroughRankedEvidenceFactsV2(adjusted);
    }

    const stableScopeRecords =
      options.scopeObservation === undefined
        ? Object.freeze([])
        : buildStableEligibleScopeRecordsFromObservationV2({
            retainedEligible: finalPools.retainedEligible,
            observation: options.scopeObservation,
            execution,
          });
    const scopeMount = await buildExecutionScopeCoverageMountV1({
      execution,
      requestedLayers: options.requestedLayers,
      ...(options.foldedView === undefined
        ? {}
        : { foldedView: options.foldedView }),
      eligiblePool: finalPools.eligibleDiscovery,
      snapshotProof: finalPools.proof,
      stableScopeRecords,
    });
    const capabilityMount = await buildExecutionCapabilityCoverageMountV2({
      execution,
      foldProof: scopeMount.foldProof,
      scopeProof: scopeMount.view.proof,
      eligiblePool: finalPools.eligibleDiscovery,
      snapshotProof: finalPools.proof,
      retainedEligible: finalPools.retainedEligible,
      ...(rankingOutcome === undefined ? {} : { rankingOutcome }),
      ...(options.scopeObservation === undefined ||
      options.foldedView === undefined ||
      options.discoverySelection === undefined
        ? {}
        : {
            scopeAuthority: Object.freeze({
              observation: options.scopeObservation,
              foldedView: options.foldedView,
              boundSelection: options.discoverySelection,
            }),
          }),
    });
    const finalizedDraft: LocateExecutionDraftV2 = Object.freeze({
      ...draft,
      confirmed: adjusted.confirmed,
      candidates: adjusted.candidates,
      abortSource: adjusted.abortSource,
    });
    const facts = createLocateExecutionFactsFromDraftV2({
      draft: finalizedDraft,
      snapshotFacts: finalPools.facts,
      rankingFacts,
      rankingOutcome,
      scopeMount,
      capabilityMount,
      backendExecutionContext: options.backendExecutionContext,
      execution,
      ...(snapshotBoundSelectedVerificationOutcome === undefined ||
      options.discoverySelection === undefined
        ? {}
        : {
            selectedVerificationOutcome:
              snapshotBoundSelectedVerificationOutcome,
            boundSelection: options.discoverySelection,
          }),
    });
    return this.terminalSuccess(
      finalizedDraft,
      options.limits,
      facts,
      projectionExecution,
    );
  }

  private terminalFailure(
    error: LocateExecutionErrorFactsV2,
    projectionExecution: LocateProjectionExecutionCapabilityV2,
  ): CanonicalLocateExecutionReceiptV2 {
    const execution =
      requireLocateProjectionExecutionTokenV2(projectionExecution);
    const input: CanonicalLocateExecutionV2 = Object.freeze({
      ok: false as const,
      error,
    });
    return createCanonicalLocateExecutionReceiptV2(
      input,
      projectionExecution,
      execution,
    );
  }

  public async execute(
    request: LocateRequest,
    context: LocateExecutionContext,
    projectionExecution: LocateProjectionExecutionCapabilityV2,
  ): Promise<CanonicalLocateExecutionReceiptV2> {
    const executionToken =
      requireLocateProjectionExecutionTokenV2(projectionExecution);
    const limits = resolveLocateLimits(request.limits);
    const mode = request.termCase ?? 'smart';
    const normalizedTerms = normalizeSearchTerms(request.terms, mode);
    const anchors = normalizeLocateAnchors(request.anchors ?? [], mode);
    const termsForVerification = verificationTerms(normalizedTerms, anchors);
    const negativeTerms = normalizeSearchTerms(
      request.negativeTerms ?? [],
      mode,
    );
    const callerSignal = requireCallerSignal(context);
    const abortCoordinator = LocateAbortCoordinatorV2.create(
      callerSignal,
      limits.timeoutMs,
    );

    let repositoryRoot = request.repoPath;
    let requestSnapshot: RequestRepositorySnapshotV2 | undefined;
    let observationCache: VerifiedDiscoveryObservationCacheV2 | undefined;
    let backendExecutionContext: BackendExecutionContextV2 | undefined;
    const verificationLimits = Object.freeze({
      maxFileBytes: DEFAULT_MAX_FILE_BYTES,
      maxExcerptBytes: CLASSIFICATION_MAX_BYTES,
      maxExcerptLines: CLASSIFICATION_MAX_LINES,
    });
    const maxMatchesPerHit = Math.max(
      1,
      limits.maxConfirmed + limits.maxCandidates,
    );
    try {
      repositoryRoot = await this.reader.resolveRoot(
        request.repoPath,
        abortCoordinator.signal,
      );
      // 请求级 snapshot：仅精确 NodeRepositoryReader 启用；finally dispose，不进 Nest singleton
      let requestReader: RepositoryReader = this.reader;
      if (shouldUseRequestSnapshotReader(this.reader)) {
        requestSnapshot = createRequestRepositorySnapshotV2({
          repositoryRoot,
          decodeMaxFileBytes: DEFAULT_MAX_FILE_BYTES,
        });
        requestReader = requestSnapshot;
        observationCache = new VerifiedDiscoveryObservationCacheV2({
          repositoryRoot,
          terms: termsForVerification,
          limits: verificationLimits,
          maxMatches: maxMatchesPerHit,
          signal: abortCoordinator.signal,
        });
      }
      if (abortCoordinator.signal.aborted) {
        return await this.terminalSuccessWithSnapshot(
          this.timeoutResult(
            repositoryRoot,
            normalizedTerms,
            abortCoordinator.peekSource(),
            limits,
          ),
          projectionExecution,
          {
            requestSnapshot,
            signal: abortCoordinator.signal,
            limits,
            abortSource: abortCoordinator.peekSource(),
            abortCoordinator,
            ...(request.layers === undefined
              ? {}
              : { requestedLayers: request.layers }),
          },
        );
      }

      const codegraph = this.backends.find(
        (backend) => backend.id === 'codegraph',
      );
      const ripgrep = this.backends.find((backend) => backend.id === 'ripgrep');
      if (codegraph === undefined && ripgrep === undefined) {
        return await this.terminalSuccessWithSnapshot(
          this.backendUnavailableResult(repositoryRoot, normalizedTerms),
          projectionExecution,
          {
            requestSnapshot,
            signal: abortCoordinator.signal,
            limits,
            abortSource: abortCoordinator.peekSource(),
            abortCoordinator,
            ...(request.layers === undefined
              ? {}
              : { requestedLayers: request.layers }),
          },
        );
      }

      // multi-view：expandedMaxHits=800 与 legacyMaxHits 均被 searchBackendMultiViewV2 消费
      const multiView = createMultiViewBackendSearchRequestV2(
        {
          repositoryRoot,
          terms: normalizedTerms,
          anchors,
          negativeTerms,
          layers: request.layers ?? [],
        },
        legacyMaxHitsFromPublicLimitsV2(limits),
      );
      backendExecutionContext = createBackendExecutionContextV2(
        new NodeSafeProcessRunner(),
        undefined,
        abortCoordinator.signal,
        executionToken,
      );
      let codegraphResult: BackendSearchResult | undefined;
      let ripgrepResult: BackendSearchResult | undefined;
      const expandedBackendResults: BackendSearchResult[] = [];
      let lastSharedSearchMaxHits = multiView.expandedMaxHits as number;
      let skipFallback = false;

      if (codegraph !== undefined) {
        const codegraphLanes = await searchBackendMultiViewV2(
          codegraph,
          multiView,
          abortCoordinator.signal,
          backendExecutionContext,
          executionToken,
        );
        codegraphResult = codegraphLanes.legacy;
        expandedBackendResults.push(codegraphLanes.expanded);
        lastSharedSearchMaxHits = codegraphLanes.sharedSearchMaxHits as number;
        if (abortCoordinator.signal.aborted) {
          return await this.terminalSuccessWithSnapshot(
            this.timeoutResult(
              repositoryRoot,
              normalizedTerms,
              abortCoordinator.peekSource(),
              limits,
              {
                attempts: [
                  attemptFor(
                    'codegraph',
                    codegraphResult.health,
                    codegraphResult.hits.length,
                  ),
                ],
                codeGraphHealth: codegraphResult.health,
              },
            ),
            projectionExecution,
            {
              requestSnapshot,
              signal: abortCoordinator.signal,
              limits,
              abortSource: abortCoordinator.peekSource(),
              abortCoordinator,
              backendExecutionContext,
              ...(request.layers === undefined
                ? {}
                : { requestedLayers: request.layers }),
            },
          );
        }
        if (
          codegraphResult.health.state === 'available' &&
          codegraphResult.canSkipFallbackIfVerified === true &&
          codegraphResult.hits.length > 0
        ) {
          const primarySelection = runAuthoritativeExpandedSelectionPhaseV2({
            expandedResults: expandedBackendResults,
            anchors: request.anchors ?? [],
            termCase: mode,
            maxFiles: limits.maxFiles,
            layers: request.layers,
            execution: executionToken,
          });
          const primaryMerged = await verifyAndMergeBackendHits({
            repositoryRoot,
            hits: primarySelection.hits,
            terms: termsForVerification,
            reader: requestReader,
            limits: verificationLimits,
            maxMatchesPerHit,
            signal: abortCoordinator.signal,
            ...(observationCache === undefined ? {} : { observationCache }),
          });
          const primaryClassified = classifyDiscoveryRecords(
            primaryMerged.records,
            {
              anchors,
              layers: request.layers ?? [],
              negativeTerms,
              primaryAttempted: true,
            },
            {
              ...(primaryMerged.duplicateLocations > 0
                ? { DUPLICATE_LOCATION: primaryMerged.duplicateLocations }
                : {}),
              ...(primaryMerged.unverifiedLocations > 0
                ? { UNVERIFIED_FILE_CONTENT: primaryMerged.unverifiedLocations }
                : {}),
            },
          );
          if (abortCoordinator.signal.aborted) {
            const primaryConfirmed = selectConfirmedBudget(
              primaryClassified.confirmed,
              limits.maxConfirmed,
            );
            const primaryCandidates = selectCandidateBudget(
              primaryClassified.candidates,
              limits.maxCandidates,
            );
            const timeoutLimits: LimitReasonCode[] = ['TIMEOUT_REACHED'];
            if (primarySelection.filesTruncated) {
              timeoutLimits.push('MAX_FILES_REACHED');
            }
            for (const failure of primaryMerged.failures) {
              if (failure.code === 'MAX_FILE_BYTES_REACHED') {
                timeoutLimits.push('MAX_FILE_BYTES_REACHED');
              }
              if (failure.code === 'MAX_EXCERPT_BYTES_REACHED') {
                timeoutLimits.push('MAX_EXCERPT_BYTES_REACHED');
              }
            }
            if (primaryConfirmed.truncated) {
              timeoutLimits.push('MAX_CONFIRMED_REACHED');
            }
            if (primaryCandidates.truncated) {
              timeoutLimits.push('MAX_CANDIDATES_REACHED');
            }
            return await this.terminalSuccessWithSnapshot(
              this.timeoutResult(
                repositoryRoot,
                normalizedTerms,
                abortCoordinator.peekSource(),
                limits,
                {
                  attempts: [
                    attemptFor(
                      'codegraph',
                      codegraphResult.health,
                      codegraphResult.hits.length,
                    ),
                  ],
                  codeGraphHealth: codegraphResult.health,
                  confirmed: primaryConfirmed.selected,
                  candidates: primaryCandidates.selected,
                  limitsReached: uniqueSchemaOrder(
                    timeoutLimits,
                    LIMIT_REASON_CODES,
                  ),
                  exclusionSummary: primaryClassified.exclusionSummary,
                },
              ),
              projectionExecution,
              {
                requestSnapshot,
                signal: abortCoordinator.signal,
                discoveryRecords: primaryMerged.records,
                confirmed: primaryConfirmed.selected,
                candidates: primaryCandidates.selected,
                limits,
                abortSource: abortCoordinator.peekSource(),
                abortCoordinator,
                backendExecutionContext,
              },
            );
          }
          skipFallback =
            !primarySelection.filesTruncated &&
            !primaryMerged.aborted &&
            primaryMerged.unverifiedLocations === 0 &&
            primaryMerged.failures.length === 0 &&
            primaryClassified.confirmed.some(
              (evidence) =>
                (evidence.reasonCodes.includes('EXACT_SYMBOL_ANCHOR') ||
                  (evidence.reasonCodes.includes('EXACT_TERM_MATCH') &&
                    evidence.provenance.discoveredBy.includes('codegraph'))) &&
                (evidence.role === 'definition' ||
                  evidence.role === 'execution-site'),
            );
        }
        if (abortCoordinator.signal.aborted) {
          return await this.terminalSuccessWithSnapshot(
            this.timeoutResult(
              repositoryRoot,
              normalizedTerms,
              abortCoordinator.peekSource(),
              limits,
              {
                attempts: [
                  attemptFor(
                    'codegraph',
                    codegraphResult.health,
                    codegraphResult.hits.length,
                  ),
                ],
                codeGraphHealth: codegraphResult.health,
              },
            ),
            projectionExecution,
            {
              requestSnapshot,
              signal: abortCoordinator.signal,
              limits,
              abortSource: abortCoordinator.peekSource(),
              abortCoordinator,
              backendExecutionContext,
              ...(request.layers === undefined
                ? {}
                : { requestedLayers: request.layers }),
            },
          );
        }
      }

      if (!skipFallback && ripgrep !== undefined) {
        const ripgrepLanes = await searchBackendMultiViewV2(
          ripgrep,
          multiView,
          abortCoordinator.signal,
          backendExecutionContext,
          executionToken,
        );
        ripgrepResult = ripgrepLanes.legacy;
        expandedBackendResults.push(ripgrepLanes.expanded);
        lastSharedSearchMaxHits = ripgrepLanes.sharedSearchMaxHits as number;
      }

      const backendResults = [codegraphResult, ripgrepResult].filter(
        (result): result is BackendSearchResult => result !== undefined,
      );
      // Compatibility verification input is plain readonly data, not a second authority.
      const legacySelection = selectLegacyVerificationHitsV2(
        backendResults,
        limits.maxFiles,
      );

      const authoritativeSelection = runAuthoritativeExpandedSelectionPhaseV2({
        expandedResults: expandedBackendResults,
        anchors: request.anchors ?? [],
        termCase: mode,
        maxFiles: limits.maxFiles,
        layers: request.layers,
        execution: executionToken,
      });
      const scopeObservation: TrustedScopeEligibilityObservationV2 =
        authoritativeSelection.observation;
      const discoverySelection = authoritativeSelection.boundSelection;
      // truncated-but-valid expanded 仍走 authoritative；仅空选择才 legacy bridge
      const verificationResolution = resolveVerificationHitsV2({
        authoritativeHits: authoritativeSelection.hits,
        authoritativeFilesTruncated: authoritativeSelection.filesTruncated,
        expandedResults: expandedBackendResults,
        legacyHits: legacySelection.hits,
        legacyFilesTruncated: legacySelection.filesTruncated,
      });
      const verifyHits = verificationResolution.hits;
      const filesTruncated = verificationResolution.filesTruncated;

      const merged = await verifyAndMergeBackendHits({
        repositoryRoot,
        hits: verifyHits,
        terms: termsForVerification,
        reader: requestReader,
        limits: verificationLimits,
        maxMatchesPerHit,
        signal: abortCoordinator.signal,
        ...(observationCache === undefined ? {} : { observationCache }),
        ...(verificationResolution.usedAuthoritative
          ? {
              selectedDiscoveryAuthority: Object.freeze({
                boundSelection: discoverySelection,
                execution: executionToken,
              }),
            }
          : {}),
      });
      const initialExclusions: Partial<Record<ExclusionReasonCode, number>> =
        {};
      if (merged.duplicateLocations > 0) {
        initialExclusions.DUPLICATE_LOCATION = merged.duplicateLocations;
      }
      if (merged.unverifiedLocations > 0) {
        initialExclusions.UNVERIFIED_FILE_CONTENT = merged.unverifiedLocations;
      }
      const classified = classifyDiscoveryRecordsThroughScopeBoundProducersV2({
        records: merged.records,
        context: {
          anchors,
          layers: request.layers ?? [],
          negativeTerms,
          primaryAttempted: codegraphResult !== undefined,
        },
        execution: executionToken,
        observation: scopeObservation,
        foldedView: authoritativeSelection.foldedView,
        boundSelection: discoverySelection,
        initialExclusions,
      });
      const confirmedSelection = selectConfirmedBudget(
        classified.confirmed,
        limits.maxConfirmed,
      );
      const confirmed = confirmedSelection.selected;
      const existingCandidateSelection = selectCandidateBudget(
        classified.candidates,
        limits.maxCandidates,
      );
      const existingCandidates = existingCandidateSelection.selected;
      const retainedSeedKeys = new Set(
        [...confirmed, ...existingCandidates].map((evidence) =>
          createDiscoveryKey(evidence.location),
        ),
      );
      let candidateContextFileLimit = false;
      let candidateContextExcerptLimit = false;
      const candidateContexts: ReturnType<
        typeof createVerifiedCandidateContext
      >[] = [];
      for (const record of merged.records.filter((candidate) =>
        retainedSeedKeys.has(candidate.discoveryKey),
      )) {
        try {
          const window = await requestReader.readWindow(
            repositoryRoot,
            record.location.file,
            record.focusLines,
            {
              maxFileBytes: DEFAULT_MAX_FILE_BYTES,
              maxExcerptBytes: CLASSIFICATION_MAX_BYTES,
              maxExcerptLines: CLASSIFICATION_MAX_LINES,
            },
            abortCoordinator.signal,
          );
          candidateContexts.push(
            createVerifiedCandidateContext(record, window),
          );
        } catch (error: unknown) {
          if (!(error instanceof RepositoryAccessError)) {
            throw error;
          }
          if (error.code === 'ABORTED') {
            break;
          }
          if (error.code === 'MAX_FILE_BYTES_REACHED') {
            candidateContextFileLimit = true;
            continue;
          }
          if (error.code === 'MAX_EXCERPT_BYTES_REACHED') {
            candidateContextExcerptLimit = true;
            continue;
          }
          throw error;
        }
      }
      const candidatePolicy = applyCandidatePolicy({
        records: merged.records,
        contexts: candidateContexts,
        maxCandidates: Math.max(
          0,
          limits.maxCandidates - existingCandidates.length,
        ),
        signal: abortCoordinator.signal,
      });

      // Expanded candidate：同一 enumerator 一次枚举；expanded universe 评估，不抑制 legacy
      const tokenEnumerator = new CandidateTokenProposalEnumeratorV2();
      const expandedProposals = Object.freeze(
        candidateContexts.flatMap((context) => [
          ...tokenEnumerator.enumerate(context),
        ]),
      );
      const expandedCandidateDrafts = evaluateExpandedCandidateProposalsV2({
        proposals: expandedProposals,
        expandedRecords: merged.records,
        reasonFor: () =>
          Object.freeze(['SAME_SCOPE_SIMILAR_IDENTIFIER' as const]),
      });
      const expandedPoolCandidates = expandedCandidateDrafts.map(
        materializeCandidateDraft,
      );

      registerDualLaneExecutionReceiptV2(executionToken, {
        sharedSearchMaxHits: lastSharedSearchMaxHits,
        expandedMaxHits: multiView.expandedMaxHits,
        legacyMaxHits: multiView.legacyMaxHits,
        scopeFoldInvoked: authoritativeSelection.scopeFoldInvoked,
        scopeFoldCandidateCount: authoritativeSelection.scopeFoldCandidateCount,
        scopeFoldFilesTruncated: authoritativeSelection.scopeFoldFilesTruncated,
        usedCandidatePolicyReservation: true,
        expandedProposalCount: expandedProposals.length,
        expandedEvaluatedDraftCount: expandedCandidateDrafts.length,
        verificationSelectionMode: verificationResolution.mode,
      });

      const candidateSelection = selectCandidateBudget(
        [
          ...existingCandidates,
          ...candidatePolicy.candidates.map(materializeCandidateDraft),
        ],
        limits.maxCandidates,
      );
      const candidates = candidateSelection.selected;
      const confirmedKeys = new Set(
        confirmed.map((evidence) => createDiscoveryKey(evidence.location)),
      );
      if (
        candidates.some((evidence) =>
          confirmedKeys.has(createDiscoveryKey(evidence.location)),
        )
      ) {
        throw new Error(
          'Candidate policy violated discovery-key mutual exclusion.',
        );
      }
      const confirmedTruncated = confirmedSelection.truncated;
      const candidatesTruncated =
        existingCandidateSelection.truncated ||
        candidatePolicy.truncated ||
        candidateSelection.truncated;

      // Only selected candidate-context reads contribute public read limits.
      const maximumFileBytesReached = candidateContextFileLimit;
      const maximumExcerptBytesReached = candidateContextExcerptLimit;
      const fallbackAttempts = Object.freeze([
        ...(codegraphResult === undefined
          ? []
          : [
              attemptFor(
                'codegraph',
                codegraphResult.health,
                codegraphResult.hits.length,
                0,
              ),
            ]),
        ...(ripgrepResult === undefined
          ? []
          : [
              attemptFor(
                'ripgrep',
                ripgrepResult.health,
                ripgrepResult.hits.length,
                codegraphResult === undefined ? 0 : 1,
              ),
            ]),
      ]);
      const draft: LocateExecutionDraftV2 = Object.freeze({
        repositoryRoot,
        normalizedTerms,
        confirmed,
        candidates,
        backend: Object.freeze({
          fallbackAttempts,
          index: Object.freeze({
            state: indexStateFor(codegraphResult?.health),
            freshness: indexFreshnessFor(codegraphResult?.health),
          }),
          codegraphInitializationSuggested:
            codegraphResult?.health.state === 'missing',
        }),
        snapshotRead: Object.freeze({
          maximumFilesReached: filesTruncated,
          maximumFileBytesReached,
          maximumExcerptBytesReached,
        }),
        rankingBudget: Object.freeze({
          maximumConfirmedReached: confirmedTruncated,
          maximumCandidatesReached: candidatesTruncated,
        }),
        exclusions: classified.exclusionSummary,
        abortSource: abortCoordinator.peekSource(),
      });
      return await this.terminalSuccessWithSnapshot(
        draft,
        projectionExecution,
        {
          requestSnapshot,
          signal: abortCoordinator.signal,
          discoveryRecords: merged.records,
          confirmed,
          candidates,
          expandedPoolCandidates,
          limits,
          abortSource: abortCoordinator.peekSource(),
          abortCoordinator,
          rawAnchors: request.anchors ?? [],
          termCase: mode,
          discoverySelection,
          ...(merged.selectedVerificationOutcome === undefined
            ? {}
            : {
                selectedVerificationOutcome: merged.selectedVerificationOutcome,
              }),
          foldedView: authoritativeSelection.foldedView,
          scopeObservation,
          backendExecutionContext,
          ...(request.layers === undefined
            ? {}
            : { requestedLayers: request.layers }),
        },
      );
    } catch (error: unknown) {
      if (
        (error instanceof RepositoryAccessError && error.code === 'ABORTED') ||
        abortCoordinator.signal.aborted
      ) {
        let abortSource: LocateAbortSource;
        try {
          abortSource = abortCoordinator.peekSource();
        } catch {
          abortSource = abortCoordinator.recordedSource();
        }
        return await this.terminalSuccessWithSnapshot(
          this.timeoutResult(
            repositoryRoot,
            normalizedTerms,
            abortSource,
            limits,
          ),
          projectionExecution,
          {
            requestSnapshot,
            signal: abortCoordinator.signal,
            limits,
            abortSource,
            abortCoordinator,
            ...(backendExecutionContext === undefined
              ? {}
              : { backendExecutionContext }),
            ...(request.layers === undefined
              ? {}
              : { requestedLayers: request.layers }),
          },
        );
      }
      return this.terminalFailure(decideToolError(error), projectionExecution);
    } finally {
      observationCache?.dispose();
      requestSnapshot?.dispose();
      abortCoordinator.dispose();
    }
  }

  private timeoutResult(
    repositoryRoot: string,
    normalizedTerms: ReturnType<typeof normalizeSearchTerms>,
    abortSource: LocateAbortSource,
    _limits: ResolvedLocateLimits,
    options: TimeoutResultOptions = {},
  ): LocateExecutionDraftV2 {
    const attempts =
      options.attempts ??
      Object.freeze([
        Object.freeze({
          sequence: 0,
          backend: 'ripgrep' as const,
          outcome: 'used' as const,
          completion: 'incomplete' as const,
          termination: 'aborted' as const,
          reasonCode: 'BACKEND_ABORTED' as const,
          observedHitCount: 0,
        }),
      ]);
    const confirmed = options.confirmed ?? [];
    const candidates = options.candidates ?? [];
    const limitsReached = options.limitsReached ?? ['TIMEOUT_REACHED'];
    return Object.freeze({
      repositoryRoot,
      normalizedTerms,
      confirmed,
      candidates,
      backend: Object.freeze({
        fallbackAttempts: attempts,
        index: Object.freeze({
          state: indexStateFor(options.codeGraphHealth),
          freshness: indexFreshnessFor(options.codeGraphHealth),
        }),
        codegraphInitializationSuggested:
          options.codeGraphHealth?.state === 'missing',
      }),
      snapshotRead: Object.freeze({
        maximumFilesReached: limitsReached.includes('MAX_FILES_REACHED'),
        maximumFileBytesReached: limitsReached.includes(
          'MAX_FILE_BYTES_REACHED',
        ),
        maximumExcerptBytesReached: limitsReached.includes(
          'MAX_EXCERPT_BYTES_REACHED',
        ),
      }),
      rankingBudget: Object.freeze({
        maximumConfirmedReached: limitsReached.includes(
          'MAX_CONFIRMED_REACHED',
        ),
        maximumCandidatesReached: limitsReached.includes(
          'MAX_CANDIDATES_REACHED',
        ),
      }),
      exclusions: options.exclusionSummary ?? Object.freeze({}),
      abortSource,
    });
  }

  private backendUnavailableResult(
    repositoryRoot: string,
    normalizedTerms: ReturnType<typeof normalizeSearchTerms>,
  ): LocateExecutionDraftV2 {
    return Object.freeze({
      repositoryRoot,
      normalizedTerms,
      confirmed: Object.freeze([]),
      candidates: Object.freeze([]),
      backend: Object.freeze({
        fallbackAttempts: Object.freeze([
          Object.freeze({
            sequence: 0,
            backend: 'ripgrep' as const,
            outcome: 'unavailable' as const,
            completion: 'incomplete' as const,
            termination: 'none' as const,
            reasonCode: 'RIPGREP_UNAVAILABLE' as const,
            observedHitCount: 0,
          }),
        ]),
        index: Object.freeze({
          state: 'unknown' as const,
          freshness: 'unknown' as const,
        }),
        codegraphInitializationSuggested: false,
      }),
      snapshotRead: Object.freeze({
        maximumFilesReached: false,
        maximumFileBytesReached: false,
        maximumExcerptBytesReached: false,
      }),
      rankingBudget: Object.freeze({
        maximumConfirmedReached: false,
        maximumCandidatesReached: false,
      }),
      exclusions: Object.freeze({}),
      abortSource: 'none' as const,
    });
  }
}
