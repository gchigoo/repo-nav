import { describe, expect, it } from 'vitest';

import type {
  BackendHit,
  BackendSearchResult,
} from '../../src/contracts/index.js';
import {
  resolveVerificationHitsV2,
  selectLegacyVerificationHitsV2,
} from '../../src/evidence/locate-execution/resolve-verification-hits-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'candidate-permutation',
  caseId: 'candidate-permutation',
});

const authoritativeHit = Object.freeze({
  file: 'server/target.ts',
  lines: Object.freeze([1, 1] as [number, number]),
  symbol: 'anchor',
  matchedText: 'anchor',
  source: 'ripgrep' as const,
  reasonCodes: Object.freeze(['SYMBOL_SEARCH_HIT' as const]),
}) satisfies BackendHit;

const legacyHit = Object.freeze({
  file: 'server/noise.ts',
  lines: Object.freeze([1, 1] as [number, number]),
  matchedText: 'noise',
  source: 'ripgrep' as const,
  reasonCodes: Object.freeze(['LITERAL_TERM_HIT' as const]),
}) satisfies BackendHit;

function availableResult(
  hits: readonly BackendHit[],
  complete: boolean,
): BackendSearchResult {
  return Object.freeze({
    health: Object.freeze({ state: 'available' as const }),
    hits,
    complete,
  });
}

describe.runIf(selected)('resolveVerificationHitsV2', () => {
  it('uses authoritative hits when expanded is truncated-but-valid', () => {
    const resolved = resolveVerificationHitsV2({
      authoritativeHits: [authoritativeHit],
      authoritativeFilesTruncated: true,
      expandedResults: [availableResult([authoritativeHit, legacyHit], false)],
      legacyHits: [legacyHit],
      legacyFilesTruncated: true,
    });
    expect(resolved.mode).toBe('authoritative-partial');
    expect(resolved.usedAuthoritative).toBe(true);
    expect(resolved.hits).toEqual([authoritativeHit]);
    expect(resolved.filesTruncated).toBe(true);
  });

  it('uses authoritative-complete when expanded is complete', () => {
    const resolved = resolveVerificationHitsV2({
      authoritativeHits: [authoritativeHit],
      authoritativeFilesTruncated: false,
      expandedResults: [availableResult([authoritativeHit], true)],
      legacyHits: [legacyHit],
      legacyFilesTruncated: false,
    });
    expect(resolved.mode).toBe('authoritative-complete');
    expect(resolved.hits).toEqual([authoritativeHit]);
  });

  it('falls back to legacy bridge only when authoritative hits are empty', () => {
    const resolved = resolveVerificationHitsV2({
      authoritativeHits: [],
      authoritativeFilesTruncated: false,
      expandedResults: [availableResult([], false)],
      legacyHits: [legacyHit],
      legacyFilesTruncated: true,
    });
    expect(resolved.mode).toBe('legacy-bridge');
    expect(resolved.usedAuthoritative).toBe(false);
    expect(resolved.hits).toEqual([legacyHit]);
  });

  it('derives the compatibility selection as immutable plain data', () => {
    const secondFile = Object.freeze({
      ...legacyHit,
      file: 'server/second.ts',
      lines: Object.freeze([2, 2] as [number, number]),
    });
    const thirdFile = Object.freeze({
      ...legacyHit,
      file: 'server/third.ts',
      lines: Object.freeze([3, 3] as [number, number]),
    });
    const selected = selectLegacyVerificationHitsV2(
      [availableResult([thirdFile, legacyHit, secondFile], true)],
      2,
    );
    expect(selected).toEqual({
      hits: [legacyHit, secondFile],
      filesTruncated: true,
    });
    expect(Object.isFrozen(selected)).toBe(true);
    expect(Object.isFrozen(selected.hits)).toBe(true);
  });
});
