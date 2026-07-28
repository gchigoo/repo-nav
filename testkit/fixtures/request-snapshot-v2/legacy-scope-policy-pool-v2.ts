import type { BackendHit, BackendSearchResult } from '../../../src/contracts/index.js';

/**
 * F3-LEGACY-POOL-001：single-call selector 冻结 selectedCount/proof。
 */
export function createLegacyHitV2(
  file: string,
  line: number,
): BackendHit {
  return Object.freeze({
    file,
    lines: Object.freeze([line, line] as [number, number]),
    source: 'ripgrep' as const,
    reasonCodes: Object.freeze(['LITERAL_TERM_HIT' as const]),
  });
}

export function createLegacySearchResultV2(
  hits: readonly BackendHit[],
): BackendSearchResult {
  return Object.freeze({
    health: Object.freeze({ state: 'available' as const }),
    hits: Object.freeze(hits.slice()),
    complete: true,
  });
}
