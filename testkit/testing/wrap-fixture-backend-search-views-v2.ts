/**
 * Wrap legacy fixture backends with F5 searchViews so golden/harness runs
 * register backend telemetry on the production v2 projection path.
 */

import type {
  BackendHit,
  BackendSearchRequest,
  BackendSearchResult,
  RepositorySearchBackend,
  SearchBackendId,
} from '../../src/contracts/index.js';
import type { LocateExecutionTokenV2 } from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import type {
  BackendExecutionContextV2,
  BackendExecutionOutcomeV2,
  BackendFallbackFactsForF3V2,
  CompleteSafeBackendHitForF3V2,
  TrustedBackendDiscoveryHandoffV2,
} from '../../src/contracts/v2/backend-execution-outcome-v2.js';
import type { MultiViewBackendSearchRequestV2 } from '../../src/evidence/request-snapshot/discovery-reservation-v2.js';
import {
  deriveLaneBackendResultV2,
  resolveSharedSearchMaxHitsV2,
} from '../../src/evidence/request-snapshot/pre-f5-multi-view-search-v2.js';
import {
  createTrustedBackendDiscoveryHandoffV2,
  issueExpandedBackendLogicalAttemptForHarnessV2,
} from '../../src/process/backend-execution-context-v2.js';

const EMPTY_FALLBACK: BackendFallbackFactsForF3V2 = Object.freeze({
  primaryNeededFallback: false,
  fallbackInvoked: false,
  fallbackAcceptedForExpanded: false,
  fallbackAcceptedForLegacy: false,
});

function freezeHits(hits: readonly BackendHit[]): readonly BackendHit[] {
  return Object.freeze(hits.map((hit) => Object.freeze({ ...hit })));
}

/**
 * Map a legacy BackendSearchResult into a strict v2 execution outcome.
 */
export function mapFixtureSearchResultToOutcomeV2(
  backend: SearchBackendId,
  result: BackendSearchResult,
  signal?: AbortSignal,
): BackendExecutionOutcomeV2 {
  const hits = freezeHits(result.hits);
  const reason = result.health.reasonCode;
  if (result.health.state === 'missing') {
    const unavailableReason =
      reason === 'CODEGRAPH_INDEX_MISSING'
        ? ('CODEGRAPH_INDEX_MISSING' as const)
        : reason === 'CODEGRAPH_UNAVAILABLE'
          ? ('CODEGRAPH_UNAVAILABLE' as const)
          : ('RIPGREP_UNAVAILABLE' as const);
    return Object.freeze({
      backend,
      status: 'unavailable' as const,
      completion: 'incomplete' as const,
      selectionEligibility: 'telemetry-only' as const,
      termination: 'none' as const,
      reasonCode: unavailableReason,
      hitCount: 0 as const,
      retainedHits: Object.freeze([]) as readonly [],
    });
  }
  if (reason === 'BACKEND_ABORTED') {
    // Coverage schema: termination=aborted requires caller/deadline abortSource.
    if (signal?.aborted === true) {
      return Object.freeze({
        backend,
        status: 'used' as const,
        completion: 'incomplete' as const,
        selectionEligibility: 'telemetry-only' as const,
        termination: 'aborted' as const,
        reasonCode: 'BACKEND_ABORTED' as const,
        hitCount: hits.length,
        retainedHits: hits,
      });
    }
    return Object.freeze({
      backend,
      status: 'failed' as const,
      completion: 'incomplete' as const,
      selectionEligibility: 'telemetry-only' as const,
      termination: 'timeout' as const,
      reasonCode: 'BACKEND_PROCESS_FAILED' as const,
      hitCount: hits.length,
      retainedHits: hits,
    });
  }
  if (result.health.state === 'unavailable') {
    const unavailableReason =
      reason === 'CODEGRAPH_UNAVAILABLE'
        ? ('CODEGRAPH_UNAVAILABLE' as const)
        : reason === 'CODEGRAPH_INDEX_MISSING'
          ? ('CODEGRAPH_INDEX_MISSING' as const)
          : ('RIPGREP_UNAVAILABLE' as const);
    return Object.freeze({
      backend,
      status: 'unavailable' as const,
      completion: 'incomplete' as const,
      selectionEligibility: 'telemetry-only' as const,
      termination: 'none' as const,
      reasonCode: unavailableReason,
      hitCount: 0 as const,
      retainedHits: Object.freeze([]) as readonly [],
    });
  }
  if (result.health.state === 'error') {
    return Object.freeze({
      backend,
      status: 'failed' as const,
      completion: 'incomplete' as const,
      selectionEligibility: 'telemetry-only' as const,
      termination: 'process-error' as const,
      reasonCode: 'BACKEND_PROCESS_FAILED' as const,
      hitCount: hits.length,
      retainedHits: hits,
    });
  }
  if (result.complete) {
    const noResultReason =
      reason === 'CODEGRAPH_NO_RESULT' || reason === 'RIPGREP_NO_RESULT'
        ? reason
        : hits.length === 0
          ? backend === 'codegraph'
            ? ('CODEGRAPH_NO_RESULT' as const)
            : ('RIPGREP_NO_RESULT' as const)
          : undefined;
    return Object.freeze({
      backend,
      status: 'used' as const,
      completion: 'complete' as const,
      selectionEligibility: 'complete-safe-set' as const,
      termination: 'none' as const,
      ...(noResultReason === undefined ? {} : { reasonCode: noResultReason }),
      hitCount: hits.length,
      retainedHits: hits,
    });
  }
  return Object.freeze({
    backend,
    status: 'used' as const,
    completion: 'incomplete' as const,
    selectionEligibility: 'telemetry-only' as const,
    termination: 'early-stop' as const,
    hitCount: hits.length,
    retainedHits: hits,
  });
}

function toCompleteSafeHits(
  hits: readonly BackendHit[],
): readonly CompleteSafeBackendHitForF3V2[] {
  return Object.freeze(
    hits.map((hit) =>
      Object.freeze({
        hit: Object.freeze({ ...hit }),
        querySeedKeys: Object.freeze([]),
        matchedAnchorKeys: Object.freeze([]),
      }),
    ),
  );
}

/**
 * Add searchViews to a fixture RepositorySearchBackend that only implements search().
 */
export function wrapFixtureBackendSearchViewsV2<
  TBackend extends RepositorySearchBackend,
>(backend: TBackend): TBackend {
  if (
    'searchViews' in backend &&
    typeof (backend as { searchViews?: unknown }).searchViews === 'function'
  ) {
    return backend;
  }
  const wrapped = Object.create(backend) as TBackend & {
    searchViews(
      request: MultiViewBackendSearchRequestV2,
      signal: AbortSignal,
      backendExecutionContext: BackendExecutionContextV2,
      execution: LocateExecutionTokenV2,
    ): Promise<TrustedBackendDiscoveryHandoffV2>;
  };
  wrapped.searchViews = async (
    request,
    signal,
    backendExecutionContext,
    execution,
  ) => {
    const sharedMaxHits = resolveSharedSearchMaxHitsV2(
      request.legacyMaxHits,
      request.expandedMaxHits,
    );
    const shared = await backend.search(
      Object.freeze({
        ...request.base,
        maxHits: sharedMaxHits,
      }) as BackendSearchRequest,
      signal,
    );
    const legacy = deriveLaneBackendResultV2(shared, request.legacyMaxHits);
    const expanded = deriveLaneBackendResultV2(shared, request.expandedMaxHits);
    const outcome = mapFixtureSearchResultToOutcomeV2(
      backend.id,
      expanded,
      signal,
    );
    const attempt = issueExpandedBackendLogicalAttemptForHarnessV2({
      execution,
      context: backendExecutionContext,
      outcome,
    });
    const completeSafeHits =
      outcome.selectionEligibility === 'complete-safe-set'
        ? toCompleteSafeHits(outcome.retainedHits)
        : Object.freeze([]);
    return createTrustedBackendDiscoveryHandoffV2(
      {
        kind: 'started',
        request,
        attempt,
        legacy,
        fallback: EMPTY_FALLBACK,
        expandedHealth: expanded.health,
        completeSafeHits,
        canSkipFallbackIfVerified: expanded.canSkipFallbackIfVerified === true,
      },
      backendExecutionContext,
      execution,
    );
  };
  return wrapped;
}

/**
 * Wrap every fixture backend in a locate harness backend list.
 */
export function wrapFixtureBackendsSearchViewsV2(
  backends: readonly RepositorySearchBackend[],
): readonly RepositorySearchBackend[] {
  return Object.freeze(backends.map((backend) => wrapFixtureBackendSearchViewsV2(backend)));
}
