import type {
  BackendSearchResult,
  RepositorySearchBackend,
} from '../../contracts/index.js';
import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type {
  BackendExecutionContextV2,
  TrustedBackendDiscoveryHandoffV2,
} from '../../contracts/v2/backend-execution-outcome-v2.js';
import { requireBackendDiscoveryHandoffForF3V2 } from '../../process/backend-execution-context-v2.js';
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
  readonly handoff?: TrustedBackendDiscoveryHandoffV2;
}

interface F5SearchViewsBackend {
  readonly id: RepositorySearchBackend['id'];
  searchViews(
    request: MultiViewBackendSearchRequestV2,
    signal: AbortSignal,
    backendExecutionContext: BackendExecutionContextV2,
    execution: LocateExecutionTokenV2,
  ): Promise<TrustedBackendDiscoveryHandoffV2>;
}

function hasSearchViews(
  backend: RepositorySearchBackend,
): backend is RepositorySearchBackend & F5SearchViewsBackend {
  return (
    'searchViews' in backend &&
    typeof (backend as F5SearchViewsBackend).searchViews === 'function'
  );
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
  const shared = Math.max(legacyMaxHits, expandedMaxHits);
  return shared;
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
 * Pre-F5 multi-view backend search（F3-owned，不 import F5）。
 *
 * 规则：当 legacyMaxHits ≤ expandedMaxHits（生产常态：legacy ≪ 800）时，
 * 只发起一次 `backend.search(maxHits = max(legacy, expanded))`，再切片为两视图。
 * 依赖 adapter 对 hits 前缀确定性：前 N 条与单独 `maxHits=N` 搜索一致，从而保持 v1 deep-exact。
 * 禁止对同一 backend/同一 cap 重复 process；完整 F5 双 process 编排不在本 helper 范围。
 */
export async function searchBackendMultiViewV2(
  backend: RepositorySearchBackend,
  multiView: MultiViewBackendSearchRequestV2,
  signal: AbortSignal,
  backendExecutionContext?: BackendExecutionContextV2,
  execution?: LocateExecutionTokenV2,
): Promise<PreF5MultiViewLaneResultsV2> {
  const sharedSearchMaxHits = resolveSharedSearchMaxHitsV2(
    multiView.legacyMaxHits,
    multiView.expandedMaxHits,
  );

  if (
    backendExecutionContext !== undefined &&
    execution !== undefined &&
    hasSearchViews(backend)
  ) {
    const handoff = await backend.searchViews(
      multiView,
      signal,
      backendExecutionContext,
      execution,
    );
    const view = requireBackendDiscoveryHandoffForF3V2(
      handoff,
      backend.id,
      multiView,
      backendExecutionContext,
      execution,
    );
    const expanded: BackendSearchResult = Object.freeze({
      health: view.expandedHealth,
      hits: Object.freeze(
        view.kind === 'started'
          ? view.completeSafeHits.map((entry) => entry.hit)
          : [],
      ),
      complete: view.expandedComplete,
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

  const shared = await backend.search(
    Object.freeze({
      ...multiView.base,
      maxHits: sharedSearchMaxHits,
    }),
    signal,
  );
  return Object.freeze({
    legacy: deriveLaneBackendResultV2(shared, multiView.legacyMaxHits),
    expanded: deriveLaneBackendResultV2(shared, multiView.expandedMaxHits),
    sharedSearchMaxHits,
    expandedMaxHits: multiView.expandedMaxHits,
    legacyMaxHits: multiView.legacyMaxHits,
  });
}
