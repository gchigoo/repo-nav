import { Inject, Injectable } from '@nestjs/common';

import {
  createPublicErrorResult,
  createDiscoveryKey,
  DEFAULT_MAX_FILE_BYTES,
  LIMIT_REASON_CODES,
  normalizeLocateAnchors,
  normalizeSearchTerms,
  RepositoryAccessError,
  resolveLocateLimits,
  type BackendAttempt,
  type BackendHealth,
  type BackendSearchResult,
  type ExclusionReasonCode,
  type LimitReasonCode,
  type LocateExecutionContext,
  type LocateRequest,
  type LocateResult,
  type NormalizedLocateAnchor,
  type NormalizedSearchTerm,
  type RepositoryReader,
  type RepositorySearchBackend,
  type ResolvedLocateLimits,
  type SearchBackendId,
} from '../../contracts/index.js';
import {
  createLocateFactEnvelopeBuilderV2,
  type CanonicalLocateExecutionV2,
  type CanonicalLocateExecutorV2,
  type LocateProjectionExecutionCapabilityV2,
  type SnapshotFactsV2,
  type UnsafeToolErrorFactsV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import {
  REPOSITORY_READER,
  REPOSITORY_SEARCH_BACKENDS,
} from '../../runtime/tokens.js';
import {
  LocateAbortCoordinator,
  type LocateAbortSource,
} from '../abort-source.js';
import {
  createVerifiedCandidateContext,
  materializeCandidateDraft,
} from '../candidate-policy.js';
import { classifyDiscoveryRecords } from '../direct-mapping-classifier.js';
import { verifyAndMergeBackendHits } from '../discovery-record.js';
import { redactLocateResult } from '../evidence-redactor.js';
import { evaluateLocateStatus } from '../locate-status-evaluator.js';
import { createNextActions } from '../next-action-policy.js';
import {
  selectCandidateBudget,
  selectConfirmedBudget,
} from '../result-budget-selector.js';
import {
  buildPreRankingStablePoolsV2,
  CandidateTokenProposalEnumeratorV2,
  createMultiViewBackendSearchRequestV2,
  createRequestRepositorySnapshotV2,
  createZeroReadSnapshotFactsV2,
  evaluateExpandedCandidateProposalsV2,
  LegacyCandidateReservationV1,
  legacyMaxHitsFromPublicLimitsV2,
  probeRepositoryGitStateV2,
  projectAndScopeFoldExpandedHitsV2,
  registerDualLaneExecutionReceiptV2,
  searchBackendMultiViewV2,
  selectAndFreezeLegacyBackendHitsV1,
  VerifiedDiscoveryObservationCacheV2,
  type RequestRepositorySnapshotV2,
} from '../request-snapshot/index.js';
import {
  applyMutationStatusPrecedenceV2,
  buildPreRankingPoolInputsFromLegacyEvidenceV2,
  purgeLegacyEvidenceByChangedKeysV2,
} from '../request-snapshot/executor-snapshot-bridge-v2.js';
import { NodeRepositoryReader } from '../../repository/node-repository-reader.js';
import { NodeSafeProcessRunner } from '../../repository/node-safe-process-runner.js';
import {
  registerCanonicalLocateExecutionInputV2,
  requireLocateProjectionExecutionTokenV2,
} from './locate-projection-execution-capability-v2.js';

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
let beforeFinalSnapshotCheckForTestV2:
  | (() => void | Promise<void>)
  | undefined;

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

type LocateSuccessEvidence = Extract<LocateResult, { readonly ok: true }>['evidence'];

interface TimeoutResultOptions {
  readonly attempts?: readonly BackendAttempt[];
  readonly codeGraphHealth?: BackendHealth;
  readonly confirmed?: LocateSuccessEvidence['confirmed'];
  readonly candidates?: LocateSuccessEvidence['candidates'];
  readonly limitsReached?: readonly LimitReasonCode[];
  readonly exclusionSummary?: LocateSuccessEvidence['coverage']['exclusionSummary'];
  readonly fallbackChecked?: boolean;
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
        term.caseSensitive
          ? term.value
          : term.value.toLocaleLowerCase('und')
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
): BackendAttempt {
  const status: BackendAttempt['status'] =
    health.state === 'available'
      ? 'used'
      : health.state === 'missing' || health.state === 'unavailable'
        ? 'unavailable'
        : 'failed';
  return Object.freeze({
    backend,
    status,
    hitCount,
    ...(health.reasonCode === undefined ? {} : { reasonCode: health.reasonCode }),
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
  if (health === undefined || health.state === 'missing' || health.state === 'unavailable') {
    return 'not-applicable';
  }
  return health.possibleStaleIndex === true ? 'possibly-stale' : 'unknown';
}

function decideToolError(error: unknown): UnsafeToolErrorFactsV2 {
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
export class CanonicalRepositoryLocateExecutorV2
  implements CanonicalLocateExecutorV2
{
  public constructor(
    @Inject(REPOSITORY_SEARCH_BACKENDS)
    private readonly backends: readonly RepositorySearchBackend[],
    @Inject(REPOSITORY_READER)
    private readonly reader: RepositoryReader,
  ) {}

  private terminalSuccess(
    legacy: LocateResult,
    projectionExecution: LocateProjectionExecutionCapabilityV2,
    snapshotFacts: SnapshotFactsV2 = createZeroReadSnapshotFactsV2(),
  ): CanonicalLocateExecutionV2 {
    if (!legacy.ok) {
      return this.terminalFailure(
        Object.freeze({ code: 'INTERNAL_ERROR' as const }),
        projectionExecution,
      );
    }
    const execution = requireLocateProjectionExecutionTokenV2(projectionExecution);
    const builder = createLocateFactEnvelopeBuilderV2(
      legacy.evidence.repositoryRoot,
      legacy.evidence.normalizedTerms,
    );
    // F3：real success 恰好增加 snapshot owner，仍缺 ranking/backend/request-outcome/scope/capability
    builder.add('snapshot', snapshotFacts);
    const input: CanonicalLocateExecutionV2 = Object.freeze({
      ok: true as const,
      envelope: builder.freeze(),
      legacyV1Projection: legacy,
    });
    registerCanonicalLocateExecutionInputV2(
      input,
      projectionExecution,
      execution,
    );
    return input;
  }

  /**
   * 有成功 decode 时跑 git probe + pre-ranking pool + final check/purge，
   * 并把真实 SnapshotFacts 传入 terminalSuccess；零 decode 才走 zero-read。
   */
  private async terminalSuccessWithSnapshot(
    legacy: LocateResult,
    projectionExecution: LocateProjectionExecutionCapabilityV2,
    options: {
      readonly requestSnapshot: RequestRepositorySnapshotV2 | undefined;
      readonly signal: AbortSignal;
      readonly discoveryRecords?: Parameters<
        typeof buildPreRankingPoolInputsFromLegacyEvidenceV2
      >[0]['discoveryRecords'];
      readonly confirmed?: LocateSuccessEvidence['confirmed'];
      readonly candidates?: LocateSuccessEvidence['candidates'];
      /** Expanded-only drafts：仅进 pre-ranking pool，不改 v1 candidates。 */
      readonly expandedPoolCandidates?: LocateSuccessEvidence['candidates'];
      readonly limits?: ResolvedLocateLimits;
      readonly abortSource?: LocateAbortSource;
    },
  ): Promise<CanonicalLocateExecutionV2> {
    const snapshot = options.requestSnapshot;
    if (
      snapshot === undefined ||
      snapshot.getDecodeInvocationCount() === 0 ||
      !legacy.ok
    ) {
      return this.terminalSuccess(
        legacy,
        projectionExecution,
        createZeroReadSnapshotFactsV2(),
      );
    }

    await beforeFinalSnapshotCheckForTestV2?.();

    const gitState = await probeRepositoryGitStateV2(
      legacy.evidence.repositoryRoot,
      new NodeSafeProcessRunner(),
      options.signal,
    );

    const confirmed = options.confirmed ?? legacy.evidence.confirmed;
    const candidates = options.candidates ?? legacy.evidence.candidates;
    const discoveryRecords = options.discoveryRecords ?? [];
    const legacyKeys = new Set(
      [...confirmed, ...candidates].map((item) =>
        createDiscoveryKey(item.location),
      ),
    );
    const expandedOnlyForPool = (options.expandedPoolCandidates ?? []).filter(
      (item) => !legacyKeys.has(createDiscoveryKey(item.location)),
    );
    const poolInputs = buildPreRankingPoolInputsFromLegacyEvidenceV2({
      discoveryRecords,
      confirmed,
      candidates: Object.freeze([...candidates, ...expandedOnlyForPool]),
      canonicalFileKeyFor: (locator) => snapshot.canonicalFileKeyFor(locator),
    });
    const pools = buildPreRankingStablePoolsV2(poolInputs);
    const finalPools = await snapshot.finalCheck(
      options.signal,
      pools.evidence,
      pools.eligible,
      gitState,
    );

    const purgedConfirmed = purgeLegacyEvidenceByChangedKeysV2(
      confirmed,
      finalPools.changedCanonicalKeys,
      (locator) => snapshot.canonicalFileKeyFor(locator),
    );
    const purgedCandidates = purgeLegacyEvidenceByChangedKeysV2(
      candidates,
      finalPools.changedCanonicalKeys,
      (locator) => snapshot.canonicalFileKeyFor(locator),
    );

    const status = applyMutationStatusPrecedenceV2(
      legacy.evidence.status,
      finalPools.facts.coverage.consistency,
    );
    const limits = options.limits;
    const nextActions =
      status === legacy.evidence.status || limits === undefined
        ? legacy.evidence.nextActions
        : createNextActions({
            status,
            hasCandidates: purgedCandidates.length > 0,
            limitsReached: legacy.evidence.coverage.limitsReached,
            abortSource: options.abortSource ?? 'none',
            limits,
          });

    const adjusted: LocateResult = redactLocateResult({
      ok: true,
      evidence: {
        ...legacy.evidence,
        status,
        confirmed: [...purgedConfirmed],
        candidates: [...purgedCandidates],
        nextActions,
      },
    });

    return this.terminalSuccess(
      adjusted,
      projectionExecution,
      finalPools.facts,
    );
  }

  private terminalFailure(
    error: UnsafeToolErrorFactsV2,
    projectionExecution: LocateProjectionExecutionCapabilityV2,
  ): CanonicalLocateExecutionV2 {
    const execution = requireLocateProjectionExecutionTokenV2(projectionExecution);
    const legacy = createPublicErrorResult(
      error.code,
      error.suggestedAction,
    ) as Extract<LocateResult, { readonly ok: false }>;
    const input: CanonicalLocateExecutionV2 = Object.freeze({
      ok: false as const,
      error,
      legacyV1Projection: legacy,
    });
    registerCanonicalLocateExecutionInputV2(
      input,
      projectionExecution,
      execution,
    );
    return input;
  }

  public async execute(
    request: LocateRequest,
    context: LocateExecutionContext,
    projectionExecution: LocateProjectionExecutionCapabilityV2,
  ): Promise<CanonicalLocateExecutionV2> {
    const executionToken =
      requireLocateProjectionExecutionTokenV2(projectionExecution);
    const limits = resolveLocateLimits(request.limits);
    const mode = request.termCase ?? 'smart';
    const normalizedTerms = normalizeSearchTerms(request.terms, mode);
    const anchors = normalizeLocateAnchors(request.anchors ?? [], mode);
    const termsForVerification = verificationTerms(normalizedTerms, anchors);
    const negativeTerms = normalizeSearchTerms(request.negativeTerms ?? [], mode);
    const abortCoordinator = new LocateAbortCoordinator();
    const abortFromCaller = (): void => {
      abortCoordinator.abort('caller', context.signal.reason);
    };
    if (context.signal.aborted) {
      abortFromCaller();
    } else {
      context.signal.addEventListener('abort', abortFromCaller, { once: true });
    }
    const deadline = setTimeout(() => {
      abortCoordinator.abort(
        'deadline',
        new Error('Repository evidence deadline reached.'),
      );
    }, limits.timeoutMs);
    deadline.unref();

    let repositoryRoot = request.repoPath;
    let requestSnapshot: RequestRepositorySnapshotV2 | undefined;
    let observationCache: VerifiedDiscoveryObservationCacheV2 | undefined;
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
            abortCoordinator.source,
            limits,
          ),
          projectionExecution,
          {
            requestSnapshot,
            signal: abortCoordinator.signal,
            limits,
            abortSource: abortCoordinator.source,
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
            abortSource: abortCoordinator.source,
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
      let codegraphResult: BackendSearchResult | undefined;
      let ripgrepResult: BackendSearchResult | undefined;
      const expandedBackendResults: BackendSearchResult[] = [];
      let lastSharedSearchMaxHits = multiView.expandedMaxHits as number;
      let skipFallback = false;
      let fallbackChecked = false;

      if (codegraph !== undefined) {
        const codegraphLanes = await searchBackendMultiViewV2(
          codegraph,
          multiView,
          abortCoordinator.signal,
        );
        codegraphResult = codegraphLanes.legacy;
        expandedBackendResults.push(codegraphLanes.expanded);
        lastSharedSearchMaxHits = codegraphLanes.sharedSearchMaxHits as number;
        if (abortCoordinator.signal.aborted) {
          return await this.terminalSuccessWithSnapshot(
          this.timeoutResult(
            repositoryRoot,
            normalizedTerms,
            abortCoordinator.source,
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
            abortSource: abortCoordinator.source,
          },
        );
        }
        if (
          codegraphResult.health.state === 'available' &&
          codegraphResult.complete &&
          codegraphResult.canSkipFallbackIfVerified === true &&
          codegraphResult.hits.length > 0
        ) {
          const primarySelection = selectAndFreezeLegacyBackendHitsV1(
            [codegraphResult],
            limits.maxFiles,
            executionToken,
          ).result;
          const primaryMerged = await verifyAndMergeBackendHits({
            repositoryRoot,
            hits: primarySelection.hits,
            terms: termsForVerification,
            reader: requestReader,
            limits: verificationLimits,
            maxMatchesPerHit,
            signal: abortCoordinator.signal,
            ...(observationCache === undefined
              ? {}
              : { observationCache }),
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
              abortCoordinator.source,
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
                limitsReached: uniqueSchemaOrder(timeoutLimits, LIMIT_REASON_CODES),
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
            abortSource: abortCoordinator.source,
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
                evidence.reasonCodes.includes('EXACT_SYMBOL_ANCHOR') &&
                (evidence.role === 'definition' ||
                  evidence.role === 'execution-site'),
            );
        }
        if (abortCoordinator.signal.aborted) {
          return await this.terminalSuccessWithSnapshot(
          this.timeoutResult(
            repositoryRoot,
            normalizedTerms,
            abortCoordinator.source,
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
            abortSource: abortCoordinator.source,
          },
        );
        }
      }

      if (!skipFallback && ripgrep !== undefined) {
        fallbackChecked = codegraphResult !== undefined;
        const ripgrepLanes = await searchBackendMultiViewV2(
          ripgrep,
          multiView,
          abortCoordinator.signal,
        );
        ripgrepResult = ripgrepLanes.legacy;
        expandedBackendResults.push(ripgrepLanes.expanded);
        lastSharedSearchMaxHits = ripgrepLanes.sharedSearchMaxHits as number;
      }

      const backendResults = [codegraphResult, ripgrepResult].filter(
        (result): result is BackendSearchResult => result !== undefined,
      );
      const selected = selectAndFreezeLegacyBackendHitsV1(
        backendResults,
        limits.maxFiles,
        executionToken,
      ).result;
      const filesTruncated = selected.filesTruncated;

      // Expanded lane：raw → safe pre-cap → temporary allow-all scope fold（不影响 legacy）
      const expandedFold = projectAndScopeFoldExpandedHitsV2({
        expandedResults: expandedBackendResults,
        execution: executionToken,
        layerHint: request.layers?.[0] ?? 'server',
      });

      const merged = await verifyAndMergeBackendHits({
        repositoryRoot,
        hits: selected.hits,
        terms: termsForVerification,
        reader: requestReader,
        limits: verificationLimits,
        maxMatchesPerHit,
        signal: abortCoordinator.signal,
        ...(observationCache === undefined ? {} : { observationCache }),
      });
      const initialExclusions: Partial<Record<ExclusionReasonCode, number>> = {};
      if (merged.duplicateLocations > 0) {
        initialExclusions.DUPLICATE_LOCATION = merged.duplicateLocations;
      }
      if (merged.unverifiedLocations > 0) {
        initialExclusions.UNVERIFIED_FILE_CONTENT = merged.unverifiedLocations;
      }
      const classified = classifyDiscoveryRecords(
        merged.records,
        {
          anchors,
          layers: request.layers ?? [],
          negativeTerms,
          primaryAttempted: codegraphResult !== undefined,
        },
        initialExclusions,
      );
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
          candidateContexts.push(createVerifiedCandidateContext(record, window));
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
      // Legacy candidate：LegacyCandidateReservationV1 严格复现 v1 applyCandidatePolicy
      const legacyReservation = new LegacyCandidateReservationV1();
      const candidatePolicy = legacyReservation.reserve({
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
        scopeFoldInvoked: expandedFold.scopeFoldInvoked,
        scopeFoldCandidateCount: expandedFold.facts.candidates.length,
        scopeFoldFilesTruncated: expandedFold.facts.filesTruncated,
        usedLegacyCandidateReservation: true,
        expandedProposalCount: expandedProposals.length,
        expandedEvaluatedDraftCount: expandedCandidateDrafts.length,
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

      const strategyComplete = skipFallback
        ? codegraphResult?.health.state === 'available' &&
          codegraphResult.complete
        : ripgrepResult?.health.state === 'available' && ripgrepResult.complete;
      const finalBackendResult = ripgrepResult ?? codegraphResult;
      const limitReasons: LimitReasonCode[] = [];
      if (filesTruncated) {
        limitReasons.push('MAX_FILES_REACHED');
      }
      for (const failure of merged.failures) {
        if (failure.code === 'MAX_FILE_BYTES_REACHED') {
          limitReasons.push('MAX_FILE_BYTES_REACHED');
        }
        if (failure.code === 'MAX_EXCERPT_BYTES_REACHED') {
          limitReasons.push('MAX_EXCERPT_BYTES_REACHED');
        }
      }
      if (candidateContextFileLimit) {
        limitReasons.push('MAX_FILE_BYTES_REACHED');
      }
      if (candidateContextExcerptLimit) {
        limitReasons.push('MAX_EXCERPT_BYTES_REACHED');
      }
      if (confirmedTruncated) {
        limitReasons.push('MAX_CONFIRMED_REACHED');
      }
      if (candidatesTruncated) {
        limitReasons.push('MAX_CANDIDATES_REACHED');
      }
      if (
        abortCoordinator.source !== 'none' ||
        merged.aborted ||
        abortCoordinator.signal.aborted
      ) {
        limitReasons.push('TIMEOUT_REACHED');
      }
      const limitsReached = uniqueSchemaOrder(limitReasons, LIMIT_REASON_CODES);
      const finalHealth = finalBackendResult?.health ?? {
        state: 'unavailable' as const,
        reasonCode: 'RIPGREP_UNAVAILABLE' as const,
      };
      const status = evaluateLocateStatus({
        abortSource: abortCoordinator.source,
        finalBackendHealth: finalHealth,
        strategyComplete: strategyComplete === true,
        evidenceCount: confirmed.length + candidates.length,
        limitsReached,
      }).status;
      const nextActions = createNextActions({
        status,
        hasCandidates: candidates.length > 0,
        limitsReached,
        abortSource: abortCoordinator.source,
        limits,
        initializeCodeGraph: codegraphResult?.health.state === 'missing',
      });
      const attempts = Object.freeze([
        ...(codegraphResult === undefined
          ? []
          : [
              attemptFor(
                'codegraph',
                codegraphResult.health,
                codegraphResult.hits.length,
              ),
            ]),
        ...(ripgrepResult === undefined
          ? []
          : [
              attemptFor(
                'ripgrep',
                ripgrepResult.health,
                ripgrepResult.hits.length,
              ),
            ]),
      ]);
      return await this.terminalSuccessWithSnapshot(
          redactLocateResult({
        ok: true,
        evidence: {
          schemaVersion: '1.0',
          status,
          repositoryRoot,
          normalizedTerms,
          confirmed,
          candidates,
          coverage: {
            backends: attempts,
            fallbackChecked,
            indexState: indexStateFor(codegraphResult?.health),
            indexFreshness: indexFreshnessFor(codegraphResult?.health),
            limitsReached,
            exclusionSummary: classified.exclusionSummary,
          },
          nextActions,
        },
      }),
          projectionExecution,
          {
            requestSnapshot,
            signal: abortCoordinator.signal,
            discoveryRecords: merged.records,
            confirmed,
            candidates,
            expandedPoolCandidates,
            limits,
            abortSource: abortCoordinator.source,
          },
        );
    } catch (error: unknown) {
      if (
        (error instanceof RepositoryAccessError && error.code === 'ABORTED') ||
        abortCoordinator.signal.aborted
      ) {
        return await this.terminalSuccessWithSnapshot(
          this.timeoutResult(
          repositoryRoot,
          normalizedTerms,
          abortCoordinator.source,
          limits,
        ),
          projectionExecution,
          {
            requestSnapshot,
            signal: abortCoordinator.signal,
            limits,
            abortSource: abortCoordinator.source,
          },
        );
      }
      return this.terminalFailure(decideToolError(error), projectionExecution);
    } finally {
      observationCache?.dispose();
      requestSnapshot?.dispose();
      clearTimeout(deadline);
      context.signal.removeEventListener('abort', abortFromCaller);
    }
  }

  private timeoutResult(
    repositoryRoot: string,
    normalizedTerms: ReturnType<typeof normalizeSearchTerms>,
    abortSource: LocateAbortSource,
    limits: ResolvedLocateLimits,
    options: TimeoutResultOptions = {},
  ): LocateResult {
    const attempts = options.attempts ?? [
      {
        backend: 'ripgrep' as const,
        status: 'skipped' as const,
        reasonCode: 'BACKEND_ABORTED' as const,
        hitCount: 0,
      },
    ];
    const confirmed = options.confirmed ?? [];
    const candidates = options.candidates ?? [];
    const limitsReached = options.limitsReached ?? ['TIMEOUT_REACHED'];
    return redactLocateResult({
      ok: true,
      evidence: {
        schemaVersion: '1.0',
        status: 'timeout',
        repositoryRoot,
        normalizedTerms,
        confirmed,
        candidates,
        coverage: {
          backends: attempts,
          fallbackChecked: options.fallbackChecked ?? false,
          indexState: indexStateFor(options.codeGraphHealth),
          indexFreshness: indexFreshnessFor(options.codeGraphHealth),
          limitsReached,
          exclusionSummary: options.exclusionSummary ?? {},
        },
        nextActions: createNextActions({
          status: 'timeout',
          hasCandidates: candidates.length > 0,
          limitsReached,
          abortSource,
          limits,
        }),
      },
    });
  }

  private backendUnavailableResult(
    repositoryRoot: string,
    normalizedTerms: ReturnType<typeof normalizeSearchTerms>,
  ): LocateResult {
    return {
      ok: true,
      evidence: {
        schemaVersion: '1.0',
        status: 'backend_unavailable',
        repositoryRoot,
        normalizedTerms,
        confirmed: [],
        candidates: [],
        coverage: {
          backends: [
            {
              backend: 'ripgrep',
              status: 'unavailable',
              reasonCode: 'RIPGREP_UNAVAILABLE',
              hitCount: 0,
            },
          ],
          fallbackChecked: false,
          indexState: 'unknown',
          indexFreshness: 'not-applicable',
          limitsReached: [],
          exclusionSummary: {},
        },
        nextActions: [],
      },
    };
  }
}
