import type { BackendHit, BackendSearchResult } from '../../contracts/index.js';
import type { VerificationSelectionModeV2 } from '../request-snapshot/dual-lane-execution-receipt-v2.js';

export type { VerificationSelectionModeV2 };

export interface VerificationHitResolutionV2 {
  readonly mode: VerificationSelectionModeV2;
  readonly hits: readonly BackendHit[];
  readonly filesTruncated: boolean;
  /** expanded available 且 complete=false（截断但仍可信）。 */
  readonly expandedIncomplete: boolean;
  readonly usedAuthoritative: boolean;
}

/**
 * 判断 expanded lane 是否在 available 状态下报告不完整（结果上限截断）。
 */
export function isExpandedAvailableIncompleteV2(
  expandedResults: readonly BackendSearchResult[],
): boolean {
  return expandedResults.some(
    (result) =>
      result.health.state === 'available' && result.complete === false,
  );
}

/**
 * 解析 verification 输入：有安全 authoritative hits 时不因 complete=false 回退 legacy。
 */
export function resolveVerificationHitsV2(input: {
  readonly authoritativeHits: readonly BackendHit[];
  readonly authoritativeFilesTruncated: boolean;
  readonly expandedResults: readonly BackendSearchResult[];
  readonly legacyHits: readonly BackendHit[];
  readonly legacyFilesTruncated: boolean;
}): VerificationHitResolutionV2 {
  const expandedIncomplete = isExpandedAvailableIncompleteV2(
    input.expandedResults,
  );
  const hasSafeAuthoritativeHits = input.authoritativeHits.length > 0;
  if (hasSafeAuthoritativeHits) {
    return Object.freeze({
      mode: expandedIncomplete
        ? ('authoritative-partial' as const)
        : ('authoritative-complete' as const),
      hits: input.authoritativeHits,
      filesTruncated: input.authoritativeFilesTruncated,
      expandedIncomplete,
      usedAuthoritative: true,
    });
  }
  return Object.freeze({
    mode: 'legacy-bridge' as const,
    hits: input.legacyHits,
    filesTruncated: input.legacyFilesTruncated,
    expandedIncomplete,
    usedAuthoritative: false,
  });
}
