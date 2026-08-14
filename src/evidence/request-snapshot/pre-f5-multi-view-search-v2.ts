import type { BackendHit, BackendSearchResult } from '../../contracts/index.js';
import type { TraceableRepositorySearchBackendV2 } from '../../contracts/v2/traceable-repository-search-backend-v2.js';
import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type {
  BackendDiscoveryHandoffForF3ViewV2,
  BackendExecutionContextV2,
  TrustedBackendDiscoveryHandoffV2,
} from '../../contracts/v2/backend-execution-outcome-v2.js';
import {
  requireBackendDiscoveryHandoffForF3V2,
  requireBackendExecutionOutcomeV2,
} from '../../process/backend-execution-context-v2.js';
import type { MultiViewBackendSearchRequestV2 } from './discovery-reservation-v2.js';

/**
 * 单次 backend search 派生的 legacy / expanded 双视图。
 */
export interface PreF5MultiViewLaneResultsV2 {
  readonly legacy: BackendSearchResult;
  readonly expanded: BackendSearchResult;
  /** 实际传给 adapter 的 maxHits = max(legacy, expanded)。 */
  readonly sharedSearchMaxHits: number;
  readonly expandedMaxHits: number;
  readonly legacyMaxHits: number;
  readonly handoff: TrustedBackendDiscoveryHandoffV2;
}

/**
 * 共享 search 上限：消费 expandedMaxHits（800）与 legacyMaxHits。
 */
export function resolveSharedSearchMaxHitsV2(
  legacyMaxHits: number,
  expandedMaxHits: number,
): number {
  if (
    !Number.isSafeInteger(legacyMaxHits) ||
    legacyMaxHits < 1 ||
    !Number.isSafeInteger(expandedMaxHits) ||
    expandedMaxHits < 1
  ) {
    throw new TypeError('multi-view maxHits must be positive safe integers');
  }
  return Math.max(legacyMaxHits, expandedMaxHits);
}

/**
 * 从共享结果切出单 lane 视图。
 * 若共享 hits 超过 lane cap，则该 lane complete=false（被 F3 视图截断）。
 */
export function deriveLaneBackendResultV2(
  shared: BackendSearchResult,
  laneMaxHits: number,
): BackendSearchResult {
  const hits = Object.freeze(shared.hits.slice(0, laneMaxHits));
  const truncatedByView = shared.hits.length > laneMaxHits;
  return Object.freeze({
    health: shared.health,
    hits,
    complete: shared.complete && !truncatedByView,
    ...(shared.canSkipFallbackIfVerified === undefined
      ? {}
      : { canSkipFallbackIfVerified: shared.canSkipFallbackIfVerified }),
  });
}

/**
 * 从 handoff 解析 expanded 视图：complete-safe-set 或 truncated-but-valid retainedHits。
 */
export function resolveExpandedLaneFromHandoffViewV2(
  view: BackendDiscoveryHandoffForF3ViewV2,
  execution: LocateExecutionTokenV2,
): { readonly hits: readonly BackendHit[]; readonly complete: boolean } {
  if (view.kind !== 'started') {
    return Object.freeze({ hits: Object.freeze([]), complete: false });
  }
  if (view.expandedComplete) {
    return Object.freeze({
      hits: Object.freeze(view.completeSafeHits.map((entry) => entry.hit)),
      complete: true,
    });
  }
  const shape = requireBackendExecutionOutcomeV2(
    view.expandedOutcome,
    execution,
  );
  if (
    shape.status === 'used' &&
    shape.completion === 'incomplete' &&
    (shape.termination === 'early-stop' ||
      shape.termination === 'output-limit') &&
    shape.retainedHits.length > 0
  ) {
    return Object.freeze({
      hits: shape.retainedHits,
      complete: false,
    });
  }
  return Object.freeze({ hits: Object.freeze([]), complete: false });
}

/**
 * Canonical multi-view backend search（trace-mandatory）。
 *
 * 只接受 traceable backend，context/execution 必填，且只调用 `searchViews`。
 */
export async function searchBackendMultiViewV2(
  backend: TraceableRepositorySearchBackendV2,
  multiView: MultiViewBackendSearchRequestV2,
  signal: AbortSignal,
  context: BackendExecutionContextV2,
  execution: LocateExecutionTokenV2,
): Promise<PreF5MultiViewLaneResultsV2> {
  const sharedSearchMaxHits = resolveSharedSearchMaxHitsV2(
    multiView.legacyMaxHits,
    multiView.expandedMaxHits,
  );
  const handoff = await backend.searchViews(
    multiView,
    signal,
    context,
    execution,
  );
  const view = requireBackendDiscoveryHandoffForF3V2(
    handoff,
    backend.id,
    multiView,
    context,
    execution,
  );
  const expandedLane = resolveExpandedLaneFromHandoffViewV2(view, execution);
  const expanded: BackendSearchResult = Object.freeze({
    health: view.expandedHealth,
    hits: expandedLane.hits,
    complete: expandedLane.complete,
    canSkipFallbackIfVerified: view.canSkipFallbackIfVerified,
  });
  return Object.freeze({
    legacy: view.legacy,
    expanded,
    sharedSearchMaxHits,
    expandedMaxHits: multiView.expandedMaxHits,
    legacyMaxHits: multiView.legacyMaxHits,
    handoff,
  });
}
