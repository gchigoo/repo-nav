import {
  LOCATE_LIMIT_MAXIMUMS,
  type BackendSearchRequest,
} from '../../contracts/index.js';

/**
 * expanded backend hard ceiling 与 fold 后 reservation 的唯一 authority。
 * = maxFiles × (maxConfirmed + maxCandidates) = 20 × 40 = 800
 */
export const DISCOVERY_RESERVATION_CAP_V2 = 800 as const;

/**
 * scope-included derived safe groups 上限。
 * = DISCOVERY_RESERVATION_CAP_V2 × maxCandidates = 16000
 */
export const PRE_RANKING_CANDIDATE_CAP_V2 = 16_000 as const;

/** 公式权威：与 LOCATE_LIMIT_MAXIMUMS 派生值必须恒等。 */
export const DISCOVERY_RESERVATION_CAP_FORMULA_V2 =
  LOCATE_LIMIT_MAXIMUMS.maxFiles *
  (LOCATE_LIMIT_MAXIMUMS.maxConfirmed + LOCATE_LIMIT_MAXIMUMS.maxCandidates);

export const PRE_RANKING_CANDIDATE_CAP_FORMULA_V2 =
  DISCOVERY_RESERVATION_CAP_V2 * LOCATE_LIMIT_MAXIMUMS.maxCandidates;

export interface MultiViewBackendSearchRequestV2 {
  readonly base: Omit<BackendSearchRequest, 'maxHits'>;
  readonly expandedMaxHits: typeof DISCOVERY_RESERVATION_CAP_V2;
  readonly legacyMaxHits: number;
}

/**
 * 构造 multi-view 请求：expandedMaxHits 恒为 800，与本次 request budget 无关。
 */
export function createMultiViewBackendSearchRequestV2(
  base: Omit<BackendSearchRequest, 'maxHits'>,
  legacyMaxHits: number,
): MultiViewBackendSearchRequestV2 {
  if (!Number.isSafeInteger(legacyMaxHits) || legacyMaxHits < 0) {
    throw new TypeError('legacyMaxHits must be a non-negative safe integer');
  }
  return Object.freeze({
    base: Object.freeze({ ...base }),
    expandedMaxHits: DISCOVERY_RESERVATION_CAP_V2,
    legacyMaxHits,
  });
}

/**
 * 从公开 limits 计算 legacy maxHits（旧公式）；不改变 expanded 输入。
 */
export function legacyMaxHitsFromPublicLimitsV2(limits: {
  readonly maxFiles: number;
  readonly maxConfirmed: number;
  readonly maxCandidates: number;
}): number {
  return (
    limits.maxFiles * Math.max(1, limits.maxConfirmed + limits.maxCandidates)
  );
}
