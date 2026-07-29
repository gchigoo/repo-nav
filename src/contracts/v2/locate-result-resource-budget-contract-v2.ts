/**
 * LocateResultResourceBudgetsV2 — frozen public-boundary UTF-8 budgets.
 * Leaf module: constants and UTF-8 primitives only; no Zod schemas or guards.
 */

export interface LocateResultResourceBudgetsV2 {
  readonly normalizedTerms: Readonly<{
    maxItems: 16;
    maxItemUtf8Bytes: 128;
    maxTotalUtf8Bytes: 1024;
  }>;
  readonly evidence: Readonly<{
    maxConfirmed: 20;
    maxCandidates: 20;
    maxTotal: 40;
  }>;
  readonly raw: Readonly<{
    maxFileUtf8Bytes: 4096;
    maxPathSegments: 128;
    maxSymbolUtf8Bytes: 2048;
    maxExcerptUtf8Bytes: 16384;
    maxJsonUtf8Bytes: 4194304;
  }>;
  readonly corpus: Readonly<{
    maxEntries: 128;
    minEntryUtf8Bytes: 8;
    maxEntryUtf8Bytes: 512;
    maxTotalUtf8Bytes: 32768;
  }>;
  readonly public: Readonly<{
    maxTermUtf8Bytes: 128;
    maxFileUtf8Bytes: 2048;
    maxSymbolUtf8Bytes: 2048;
    maxExcerptUtf8Bytes: 2048;
    maxJsonUtf8Bytes: 1048576;
  }>;
  readonly coverage: Readonly<{
    maxBackends: 2;
    maxUnsatisfiedAnchors: 16;
    maxUnsatisfiedAnchorRequestIndex: 15;
  }>;
  readonly request: Readonly<{
    maxRawJsonUtf8Bytes: 16384;
  }>;
}

export const LOCATE_RESULT_RESOURCE_BUDGETS_V2 = Object.freeze({
  normalizedTerms: Object.freeze({
    maxItems: 16,
    maxItemUtf8Bytes: 128,
    maxTotalUtf8Bytes: 1024,
  }),
  evidence: Object.freeze({
    maxConfirmed: 20,
    maxCandidates: 20,
    maxTotal: 40,
  }),
  raw: Object.freeze({
    maxFileUtf8Bytes: 4096,
    maxPathSegments: 128,
    maxSymbolUtf8Bytes: 2048,
    maxExcerptUtf8Bytes: 16384,
    maxJsonUtf8Bytes: 4 * 1024 * 1024,
  }),
  corpus: Object.freeze({
    maxEntries: 128,
    minEntryUtf8Bytes: 8,
    maxEntryUtf8Bytes: 512,
    maxTotalUtf8Bytes: 32 * 1024,
  }),
  public: Object.freeze({
    maxTermUtf8Bytes: 128,
    maxFileUtf8Bytes: 2048,
    maxSymbolUtf8Bytes: 2048,
    maxExcerptUtf8Bytes: 2048,
    maxJsonUtf8Bytes: 1024 * 1024,
  }),
  coverage: Object.freeze({
    maxBackends: 2,
    maxUnsatisfiedAnchors: 16,
    maxUnsatisfiedAnchorRequestIndex: 15,
  }),
  request: Object.freeze({
    maxRawJsonUtf8Bytes: 16 * 1024,
  }),
}) as LocateResultResourceBudgetsV2;

/** UTF-8 byte length of a string (not UTF-16 code units). */
export function utf8ByteLengthV2(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

/** True when UTF-8 byte length is at most `maxUtf8Bytes`. */
export function isUtf8ByteLengthAtMostV2(
  value: string,
  maxUtf8Bytes: number,
): boolean {
  return utf8ByteLengthV2(value) <= maxUtf8Bytes;
}

/** True when UTF-8 byte length is within an inclusive [min, max] range. */
export function isUtf8ByteLengthInRangeV2(
  value: string,
  minUtf8Bytes: number,
  maxUtf8Bytes: number,
): boolean {
  const bytes = utf8ByteLengthV2(value);
  return bytes >= minUtf8Bytes && bytes <= maxUtf8Bytes;
}
