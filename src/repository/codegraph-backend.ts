import { Injectable } from '@nestjs/common';

import type {
  BackendHealth,
  BackendHit,
  BackendSearchRequest,
  BackendSearchResult,
  SafeProcessFailure,
  SafeProcessResult,
  RepositorySearchBackend,
} from '../contracts/index.js';
import type {
  BackendExecutionContextV2,
  BackendExecutionOutcomeV2,
  BackendFallbackFactsForF3V2,
  CompleteSafeBackendHitForF3V2,
  TrustedBackendDiscoveryHandoffV2,
} from '../contracts/v2/backend-execution-outcome-v2.js';
import type { LocateExecutionTokenV2 } from '../contracts/v2/locate-fact-envelope-v2.js';
import type { TraceableRepositorySearchBackendV2 } from '../contracts/v2/traceable-repository-search-backend-v2.js';
import type { MultiViewBackendSearchRequestV2 } from '../evidence/request-snapshot/discovery-reservation-v2.js';
import {
  createBackendNoStartDecisionV2,
  createCodeGraphProbeReceiptV2,
  createExpandedLaneAttemptFactsV2,
  createTrustedBackendDiscoveryHandoffV2,
  requireBackendPhysicalAttemptExecutorV2,
  requireExpandedBackendAttemptReducerV2,
  sealExpandedBackendAttemptSetV2,
  signBackendExecutionOutcomeForFactsV2,
} from '../process/backend-execution-context-v2.js';
import type {
  AvailabilityProbeExecutionResultV2,
  BackendPhysicalAttemptLaneMaskV2,
  BackendPhysicalAttemptResultV2,
} from '../process/backend-physical-attempt-executor-v2.js';
import { runExecutableAvailabilityProbeV2 } from '../process/executable-availability-probe-v2.js';
import { NodeSafeProcessRunner } from './node-safe-process-runner.js';
import { createCodeGraphProcessInvocation } from './codegraph-command.js';
import { parseCodeGraphQuery, parseCodeGraphStatus } from './codegraph-json.js';
import { createCodeGraphQueryPlan } from './codegraph-query-planner.js';

const PROCESS_LIMITS = Object.freeze({
  timeoutMs: 10_000,
  maxStdoutBytes: 8 * 1024 * 1024,
  maxStderrBytes: 1024 * 1024,
  terminateGraceMs: 500,
});

function queryFailureHealth(result: SafeProcessFailure): BackendHealth {
  return {
    state: 'error',
    reasonCode:
      result.kind === 'aborted' || result.kind === 'timeout'
        ? 'BACKEND_ABORTED'
        : 'BACKEND_PROCESS_FAILED',
  };
}

function compareHits(left: BackendHit, right: BackendHit): number {
  const text = (first: string, second: string): number =>
    first === second ? 0 : first < second ? -1 : 1;
  return (
    (left.backendRank ?? Number.MAX_SAFE_INTEGER) -
      (right.backendRank ?? Number.MAX_SAFE_INTEGER) ||
    text(left.file, right.file) ||
    (left.lines?.[0] ?? 0) - (right.lines?.[0] ?? 0) ||
    (left.lines?.[1] ?? 0) - (right.lines?.[1] ?? 0) ||
    text(left.symbol ?? '', right.symbol ?? '') ||
    text(left.reasonCodes.join('\u0000'), right.reasonCodes.join('\u0000'))
  );
}

function failedResult(
  result: SafeProcessResult,
  canSkipFallbackIfVerified = false,
): BackendSearchResult {
  if (result.ok) {
    throw new Error('Expected a failed process result.');
  }
  return Object.freeze({
    health: queryFailureHealth(result),
    hits: Object.freeze([]),
    complete: false,
    canSkipFallbackIfVerified,
  });
}

function emptyLegacyResult(
  health: BackendSearchResult['health'],
): BackendSearchResult {
  return Object.freeze({
    health,
    hits: Object.freeze([] as const),
    complete: false,
  });
}

type CodeGraphTerminalV2 =
  | { readonly kind: 'aborted' }
  | { readonly kind: 'timeout' }
  | { readonly kind: 'process-error' };

function queryFailureTerminal(result: SafeProcessResult): CodeGraphTerminalV2 {
  if (result.ok) {
    throw new Error('Expected a failed process result.');
  }
  if (result.kind === 'aborted') {
    return { kind: 'aborted' };
  }
  if (result.kind === 'timeout') {
    return { kind: 'timeout' };
  }
  return { kind: 'process-error' };
}

function queryFailureHealthForTerminal(
  terminal: CodeGraphTerminalV2,
): BackendSearchResult['health'] {
  return {
    state: 'error',
    reasonCode:
      terminal.kind === 'process-error'
        ? 'BACKEND_PROCESS_FAILED'
        : 'BACKEND_ABORTED',
  };
}

function buildCodeGraphOutcomeShape(input: {
  readonly hits: readonly BackendHit[];
  readonly complete: boolean;
  readonly terminal: CodeGraphTerminalV2 | undefined;
  readonly unavailableReason:
    'CODEGRAPH_UNAVAILABLE' | 'CODEGRAPH_INDEX_MISSING' | undefined;
}): BackendExecutionOutcomeV2 {
  if (input.unavailableReason !== undefined) {
    return {
      backend: 'codegraph',
      status: 'unavailable',
      completion: 'incomplete',
      selectionEligibility: 'telemetry-only',
      termination: 'none',
      reasonCode: input.unavailableReason,
      hitCount: 0,
      retainedHits: Object.freeze([]),
    };
  }
  if (input.terminal?.kind === 'aborted') {
    return {
      backend: 'codegraph',
      status: 'used',
      completion: 'incomplete',
      selectionEligibility: 'telemetry-only',
      termination: 'aborted',
      reasonCode: 'BACKEND_ABORTED',
      hitCount: input.hits.length,
      retainedHits: input.hits,
    };
  }
  if (input.terminal?.kind === 'timeout') {
    return {
      backend: 'codegraph',
      status: 'failed',
      completion: 'incomplete',
      selectionEligibility: 'telemetry-only',
      termination: 'timeout',
      reasonCode: 'BACKEND_PROCESS_FAILED',
      hitCount: input.hits.length,
      retainedHits: input.hits,
    };
  }
  if (input.terminal?.kind === 'process-error') {
    return {
      backend: 'codegraph',
      status: 'failed',
      completion: 'incomplete',
      selectionEligibility: 'telemetry-only',
      termination: 'process-error',
      reasonCode: 'BACKEND_PROCESS_FAILED',
      hitCount: input.hits.length,
      retainedHits: input.hits,
    };
  }
  if (input.complete) {
    return {
      backend: 'codegraph',
      status: 'used',
      completion: 'complete',
      selectionEligibility: 'complete-safe-set',
      termination: 'none',
      ...(input.hits.length === 0
        ? { reasonCode: 'CODEGRAPH_NO_RESULT' as const }
        : {}),
      hitCount: input.hits.length,
      retainedHits: input.hits,
    };
  }
  return {
    backend: 'codegraph',
    status: 'used',
    completion: 'incomplete',
    selectionEligibility: 'telemetry-only',
    termination: 'early-stop',
    hitCount: input.hits.length,
    retainedHits: input.hits,
  };
}

@Injectable()
export class CodeGraphBackend
  implements RepositorySearchBackend, TraceableRepositorySearchBackendV2
{
  public readonly id = 'codegraph' as const;

  public constructor(private readonly processRunner: NodeSafeProcessRunner) {}

  public async probe(
    repositoryRoot: string,
    signal: AbortSignal,
  ): Promise<BackendHealth> {
    const invocation = createCodeGraphProcessInvocation([
      'status',
      '--json',
      repositoryRoot,
    ]);
    const result = await runExecutableAvailabilityProbeV2(
      this.processRunner,
      {
        ...invocation,
        cwd: repositoryRoot,
        ...PROCESS_LIMITS,
      },
      signal,
    );
    if (!result.ok) {
      if (result.kind === 'not-found') {
        return { state: 'unavailable', reasonCode: 'CODEGRAPH_UNAVAILABLE' };
      }
      if (result.kind === 'aborted') {
        return { state: 'unavailable', reasonCode: 'BACKEND_ABORTED' };
      }
      return { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' };
    }
    return (
      parseCodeGraphStatus(result.stdout) ?? {
        state: 'error',
        reasonCode: 'BACKEND_PROCESS_FAILED',
      }
    );
  }

  public async search(
    request: BackendSearchRequest,
    signal: AbortSignal,
  ): Promise<BackendSearchResult> {
    const health = await this.probe(request.repositoryRoot, signal);
    if (health.state !== 'available') {
      return Object.freeze({
        health,
        hits: Object.freeze([]),
        complete: false,
        canSkipFallbackIfVerified: false,
      });
    }

    const plan = createCodeGraphQueryPlan(request);
    const hits: BackendHit[] = [];
    let complete = plan.unsupportedDimensions.length === 0;
    let executedEntries = 0;
    let remainingBudget = request.maxHits;
    let nextBackendRank = 0;

    for (const entry of plan.entries) {
      if (remainingBudget <= 0) {
        complete = false;
        break;
      }
      const result = await this.processRunner.run(
        {
          ...createCodeGraphProcessInvocation([
            'query',
            '--json',
            '--path',
            request.repositoryRoot,
            '--limit',
            String(remainingBudget),
            entry.value,
          ]),
          cwd: request.repositoryRoot,
          ...PROCESS_LIMITS,
        },
        signal,
      );
      if (!result.ok) {
        const failure = failedResult(result, plan.canSkipFallbackIfVerified);
        return Object.freeze({
          ...failure,
          hits: Object.freeze(hits.sort(compareHits)),
        });
      }
      const parsed = parseCodeGraphQuery(result.stdout, entry);
      if (parsed === undefined) {
        return Object.freeze({
          health: {
            state: 'error' as const,
            reasonCode: 'BACKEND_PROCESS_FAILED' as const,
          },
          hits: Object.freeze(hits.sort(compareHits)),
          complete: false,
          canSkipFallbackIfVerified: plan.canSkipFallbackIfVerified,
        });
      }
      executedEntries += 1;
      const invocationLimit = remainingBudget;
      const retained = parsed.hits
        .slice(0, invocationLimit)
        .map((hit) =>
          Object.freeze({ ...hit, backendRank: nextBackendRank++ }),
        );
      hits.push(...retained);
      // CodeGraph query output is fuzzy; only exact retained hits consume the
      // cross-entry budget so a broad early term cannot starve later terms.
      remainingBudget -= retained.length;
      if (parsed.rawResultCount >= invocationLimit) {
        complete = false;
      }
    }

    if (executedEntries < plan.entries.length) {
      complete = false;
    }
    return Object.freeze({
      health: Object.freeze({
        ...health,
        ...(hits.length === 0
          ? { reasonCode: 'CODEGRAPH_NO_RESULT' as const }
          : {}),
      }),
      hits: Object.freeze(hits.sort(compareHits).slice(0, request.maxHits)),
      complete,
      canSkipFallbackIfVerified: plan.canSkipFallbackIfVerified,
    });
  }

  /**
   * Trace-mandatory multi-view handoff（F5）：status probe → unique receipt →
   * query plan entries → seal/reducer → trusted handoff。
   * context 在 status receipt 创建时记录 CodeGraph observation；finalization
   * 不再接受 caller-supplied observation。
   */
  public async searchViews(
    request: MultiViewBackendSearchRequestV2,
    signal: AbortSignal,
    context: BackendExecutionContextV2,
    execution: LocateExecutionTokenV2,
  ): Promise<TrustedBackendDiscoveryHandoffV2> {
    const executor = requireBackendPhysicalAttemptExecutorV2(
      context,
      'codegraph',
      execution,
    );
    const fallback: BackendFallbackFactsForF3V2 = Object.freeze({
      primaryNeededFallback: false,
      fallbackInvoked: false,
      fallbackAcceptedForExpanded: false,
      fallbackAcceptedForLegacy: false,
    });

    if (signal.aborted) {
      try {
        const observation = executor.observePreAbortedNoStart(
          signal,
          execution,
        );
        const decision = createBackendNoStartDecisionV2(
          observation,
          context,
          execution,
        );
        const empty = emptyLegacyResult({
          state: 'unavailable',
          reasonCode: 'BACKEND_ABORTED',
        });
        return createTrustedBackendDiscoveryHandoffV2(
          {
            kind: 'no-start',
            request,
            decision,
            legacy: empty,
            fallback,
            expandedHealth: empty.health,
          },
          context,
          execution,
        );
      } catch {
        // not the exact request signal — continue
      }
    }

    const sharedMaxHits = Math.max(
      request.expandedMaxHits,
      request.legacyMaxHits,
    );
    const legacyMaxHits = request.legacyMaxHits;
    const statusRequest = {
      ...createCodeGraphProcessInvocation([
        'status',
        '--json',
        request.base.repositoryRoot,
      ]),
      cwd: request.base.repositoryRoot,
      ...PROCESS_LIMITS,
    };
    const prepared = await executor.prepareAvailabilityProbe(
      {
        backend: 'codegraph',
        argvClass: 'codegraph-status',
        request: statusRequest,
      },
      execution,
    );
    if (!prepared.ok) {
      const observation = executor.observeAvailabilityPreparationFailureNoStart(
        prepared,
        execution,
      );
      const decision = createBackendNoStartDecisionV2(
        observation,
        context,
        execution,
      );
      const empty = emptyLegacyResult({
        state: 'error',
        reasonCode: 'BACKEND_PROCESS_FAILED',
      });
      return createTrustedBackendDiscoveryHandoffV2(
        {
          kind: 'no-start',
          request,
          decision,
          legacy: empty,
          fallback,
          expandedHealth: empty.health,
        },
        context,
        execution,
      );
    }
    const statusStart = executor.startAvailabilityProbe(
      {
        backend: 'codegraph',
        laneMask: 'expanded-and-legacy',
        kind: 'codegraph-status',
        request: statusRequest,
      },
      prepared.prepared,
      signal,
      execution,
    );
    const statusSettled = await executor.settlePhysicalAttempt(
      statusStart,
      execution,
    );
    const statusView = executor.requireResult(statusSettled, execution);
    const statusResult =
      statusView.result as AvailabilityProbeExecutionResultV2;

    // 唯一 status receipt：context 在此记录 CodeGraph index observation。
    createCodeGraphProbeReceiptV2(statusSettled, context, execution);

    const finishHandoff = (
      outcomeShape: BackendExecutionOutcomeV2,
      legacy: BackendSearchResult,
      expandedHealth: BackendSearchResult['health'],
      completeSafeHits: readonly CompleteSafeBackendHitForF3V2[],
      querySettled: readonly {
        readonly settled: BackendPhysicalAttemptResultV2<SafeProcessResult>;
        readonly laneMask: BackendPhysicalAttemptLaneMaskV2;
      }[],
      bindStatusToOutcome: boolean,
    ): TrustedBackendDiscoveryHandoffV2 => {
      const signed = signBackendExecutionOutcomeForFactsV2(
        outcomeShape,
        context,
        execution,
      );
      if (bindStatusToOutcome) {
        // 无 query 运行：status probe 承载 outcome（hits 为空）。
        createExpandedLaneAttemptFactsV2(
          statusSettled,
          signed,
          context,
          execution,
        );
      } else {
        // status probe 只登记可用性占位，禁止承载 hits
        createExpandedLaneAttemptFactsV2(
          statusSettled,
          Object.freeze({ kind: 'codegraph-status-availability' }),
          context,
          execution,
        );
        for (const entry of querySettled) {
          if (entry.laneMask === 'legacy-only') {
            continue;
          }
          createExpandedLaneAttemptFactsV2(
            entry.settled,
            signed,
            context,
            execution,
          );
        }
      }
      const seal = sealExpandedBackendAttemptSetV2(
        context,
        'codegraph',
        execution,
      );
      const attempt = requireExpandedBackendAttemptReducerV2(
        context,
        execution,
      ).reduce(seal, execution);
      if (attempt === undefined) {
        throw new TypeError('missing-logical-attempt');
      }
      return createTrustedBackendDiscoveryHandoffV2(
        {
          kind: 'started',
          request,
          attempt,
          legacy,
          fallback,
          expandedHealth,
          completeSafeHits,
          canSkipFallbackIfVerified: legacy.canSkipFallbackIfVerified === true,
        },
        context,
        execution,
      );
    };

    if (!statusResult.ok) {
      // 只把 executable-not-found 映射为 unavailable；其余视为 failed/process-error
      const unavailable = statusResult.kind === 'executable-not-found';
      const outcomeShape = buildCodeGraphOutcomeShape({
        hits: Object.freeze([]),
        complete: false,
        terminal: unavailable ? undefined : { kind: 'process-error' },
        unavailableReason: unavailable ? 'CODEGRAPH_UNAVAILABLE' : undefined,
      });
      const health: BackendSearchResult['health'] = unavailable
        ? {
            state: 'unavailable',
            reasonCode: 'CODEGRAPH_UNAVAILABLE',
          }
        : { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' };
      return finishHandoff(
        outcomeShape,
        emptyLegacyResult(health),
        health,
        Object.freeze([]),
        [],
        true,
      );
    }

    const statusHealth = parseCodeGraphStatus(statusResult.stdout);
    if (statusHealth === undefined || statusHealth.state === 'error') {
      const health: BackendSearchResult['health'] = {
        state: 'error',
        reasonCode: 'BACKEND_PROCESS_FAILED',
      };
      const outcomeShape = buildCodeGraphOutcomeShape({
        hits: Object.freeze([]),
        complete: false,
        terminal: { kind: 'process-error' },
        unavailableReason: undefined,
      });
      return finishHandoff(
        outcomeShape,
        emptyLegacyResult(health),
        health,
        Object.freeze([]),
        [],
        true,
      );
    }
    if (statusHealth.state === 'missing') {
      const outcomeShape = buildCodeGraphOutcomeShape({
        hits: Object.freeze([]),
        complete: false,
        terminal: undefined,
        unavailableReason: 'CODEGRAPH_INDEX_MISSING',
      });
      const health: BackendSearchResult['health'] = {
        state: 'missing',
        reasonCode: 'CODEGRAPH_INDEX_MISSING',
      };
      return finishHandoff(
        outcomeShape,
        emptyLegacyResult(health),
        health,
        Object.freeze([]),
        [],
        true,
      );
    }

    const plan = createCodeGraphQueryPlan({
      ...request.base,
      maxHits: sharedMaxHits,
    });
    const hits: BackendHit[] = [];
    let complete = plan.unsupportedDimensions.length === 0;
    let executedEntries = 0;
    let remainingBudget = sharedMaxHits;
    let nextBackendRank = 0;
    const querySettled: {
      settled: BackendPhysicalAttemptResultV2<SafeProcessResult>;
      laneMask: BackendPhysicalAttemptLaneMaskV2;
    }[] = [];

    for (const entry of plan.entries) {
      if (remainingBudget <= 0) {
        complete = false;
        break;
      }
      const queryStart = executor.startBuffered(
        {
          backend: 'codegraph',
          laneMask: 'expanded-and-legacy',
          kind: 'codegraph-query',
          request: {
            ...createCodeGraphProcessInvocation([
              'query',
              '--json',
              '--path',
              request.base.repositoryRoot,
              '--limit',
              String(remainingBudget),
              entry.value,
            ]),
            cwd: request.base.repositoryRoot,
            ...PROCESS_LIMITS,
          },
        },
        signal,
        execution,
      );
      const settled = await executor.settlePhysicalAttempt(
        queryStart,
        execution,
      );
      querySettled.push({ settled, laneMask: 'expanded-and-legacy' });
      const queryView = executor.requireResult(settled, execution);
      const result = queryView.result as SafeProcessResult;
      if (!result.ok) {
        const terminal = queryFailureTerminal(result);
        const sortedHits = Object.freeze(hits.sort(compareHits));
        const outcomeShape = buildCodeGraphOutcomeShape({
          hits: sortedHits,
          complete: false,
          terminal,
          unavailableReason: undefined,
        });
        const health = queryFailureHealthForTerminal(terminal);
        const legacy: BackendSearchResult = Object.freeze({
          health,
          hits: Object.freeze(sortedHits.slice(0, legacyMaxHits)),
          complete: false,
          canSkipFallbackIfVerified: plan.canSkipFallbackIfVerified,
        });
        return finishHandoff(
          outcomeShape,
          legacy,
          health,
          Object.freeze([]),
          querySettled,
          false,
        );
      }
      const parsed = parseCodeGraphQuery(result.stdout, entry);
      if (parsed === undefined) {
        const sortedHits = Object.freeze(hits.sort(compareHits));
        const outcomeShape = buildCodeGraphOutcomeShape({
          hits: sortedHits,
          complete: false,
          terminal: { kind: 'process-error' },
          unavailableReason: undefined,
        });
        const health: BackendSearchResult['health'] = {
          state: 'error',
          reasonCode: 'BACKEND_PROCESS_FAILED',
        };
        const legacy: BackendSearchResult = Object.freeze({
          health,
          hits: Object.freeze(sortedHits.slice(0, legacyMaxHits)),
          complete: false,
          canSkipFallbackIfVerified: plan.canSkipFallbackIfVerified,
        });
        return finishHandoff(
          outcomeShape,
          legacy,
          health,
          Object.freeze([]),
          querySettled,
          false,
        );
      }
      executedEntries += 1;
      const invocationLimit = remainingBudget;
      const retained = parsed.hits
        .slice(0, invocationLimit)
        .map((hit) =>
          Object.freeze({ ...hit, backendRank: nextBackendRank++ }),
        );
      hits.push(...retained);
      // Keep the multi-view path identical to legacy search(): fuzzy decoys
      // affect completeness, not the retained-hit budget.
      remainingBudget -= retained.length;
      if (parsed.rawResultCount >= invocationLimit) {
        complete = false;
      }
    }
    if (executedEntries < plan.entries.length) {
      complete = false;
    }

    const sortedHits = Object.freeze(
      hits.sort(compareHits).slice(0, sharedMaxHits),
    );
    // 零 query plan（无 query 可执行）：status probe 必须承载合法 signed
    // outcome，否则 reducer 会把可用性占位当作 outcome 校验而触发内部不变式
    // 失败。available 且无 query 可执行视为 complete-no-result（与 legacy
    // search() 对空 plan 的 complete 语义一致），并保持 Ripgrep fallback 可运行
    // （canonical 仅当 hits>0 且 canSkipFallbackIfVerified 时才跳过 fallback）。
    const noQueryAttempt = querySettled.length === 0;
    const finalComplete = noQueryAttempt || complete;
    const outcomeShape = buildCodeGraphOutcomeShape({
      hits: sortedHits,
      complete: finalComplete,
      terminal: undefined,
      unavailableReason: undefined,
    });
    const legacyHealth: BackendSearchResult['health'] = Object.freeze({
      ...statusHealth,
      ...(finalComplete && sortedHits.length === 0
        ? { reasonCode: 'CODEGRAPH_NO_RESULT' as const }
        : {}),
    });
    const legacy: BackendSearchResult = Object.freeze({
      health: legacyHealth,
      hits: Object.freeze(sortedHits.slice(0, legacyMaxHits)),
      complete: finalComplete && sortedHits.length <= legacyMaxHits,
      canSkipFallbackIfVerified: plan.canSkipFallbackIfVerified,
    });
    const completeSafeHits = Object.freeze(
      finalComplete
        ? sortedHits.map((hit) =>
            Object.freeze({
              hit: Object.freeze({ ...hit }),
              querySeedKeys: Object.freeze([]),
              matchedAnchorKeys: Object.freeze([]),
            }),
          )
        : [],
    );
    return finishHandoff(
      outcomeShape,
      legacy,
      legacyHealth,
      completeSafeHits,
      querySettled,
      noQueryAttempt,
    );
  }
}
