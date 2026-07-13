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

function probeFailureHealth(result: SafeProcessFailure): BackendHealth {
  if (result.kind === 'spawn-error') {
    return { state: 'unavailable', reasonCode: 'CODEGRAPH_UNAVAILABLE' };
  }
  if (result.kind === 'aborted' || result.kind === 'timeout') {
    return { state: 'unavailable', reasonCode: 'BACKEND_ABORTED' };
  }
  return { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' };
}

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

@Injectable()
export class CodeGraphBackend implements RepositorySearchBackend {
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
    const result = await this.processRunner.run(
      {
        ...invocation,
        cwd: repositoryRoot,
        ...PROCESS_LIMITS,
      },
      signal,
    );
    if (!result.ok) {
      return probeFailureHealth(result);
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
        const failure = failedResult(
          result,
          plan.canSkipFallbackIfVerified,
        );
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
      hits.push(...parsed.hits.slice(0, invocationLimit));
      remainingBudget -= Math.min(parsed.rawResultCount, invocationLimit);
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
}
