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

export interface LegacyVerificationHitSelectionV2 {
  readonly hits: readonly BackendHit[];
  readonly filesTruncated: boolean;
}

function compareText(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function compareBackendHit(left: BackendHit, right: BackendHit): number {
  return (
    compareText(left.file, right.file) ||
    (left.lines?.[0] ?? Number.MAX_SAFE_INTEGER) -
      (right.lines?.[0] ?? Number.MAX_SAFE_INTEGER) ||
    (left.lines?.[1] ?? Number.MAX_SAFE_INTEGER) -
      (right.lines?.[1] ?? Number.MAX_SAFE_INTEGER) ||
    compareText(left.symbol ?? '', right.symbol ?? '') ||
    compareText(left.matchedText ?? '', right.matchedText ?? '') ||
    compareText(left.source, right.source) ||
    compareText(
      left.reasonCodes.join('\u0000'),
      right.reasonCodes.join('\u0000'),
    )
  );
}

/**
 * Derive the compatibility verification input without creating a second
 * selection authority or transporting it through an identity registry.
 */
export function selectLegacyVerificationHitsV2(
  results: readonly BackendSearchResult[],
  maxFiles: number,
): LegacyVerificationHitSelectionV2 {
  if (!Number.isSafeInteger(maxFiles) || maxFiles < 0) {
    throw new TypeError('maxFiles must be a non-negative safe integer');
  }
  const hits: BackendHit[] = [];
  const files = new Set<string>();
  let filesTruncated = false;
  for (const hit of results
    .flatMap((result) => result.hits)
    .sort(compareBackendHit)) {
    if (!files.has(hit.file) && files.size >= maxFiles) {
      filesTruncated = true;
      continue;
    }
    files.add(hit.file);
    hits.push(hit);
  }
  return Object.freeze({
    hits: Object.freeze(hits),
    filesTruncated,
  });
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
