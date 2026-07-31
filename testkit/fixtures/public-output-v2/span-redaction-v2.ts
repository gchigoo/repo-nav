/** F1A-SPAN-001 / F1A-REASON-001 Unicode and merge fixtures. */
export const SPAN_UNICODE_FIXTURES_V2 = Object.freeze({
  emoji: 'before🙂after',
  combining: 'cafe\u0301-end',
  isolatedHigh: `before${String.fromCharCode(0xd800)}after`,
  isolatedLow: `before${String.fromCharCode(0xdc00)}after`,
  lf: 'line\nbreak',
  crlf: 'line\r\nbreak',
} as const);

export const SPAN_OVERLAP_FIXTURES_V2 = Object.freeze({
  original: 'password=LongSecret-42; token=LongSecret-42',
  adjacentReasons: ['SECRET_LIKE_VALUE', 'PERSONAL_DATA'] as const,
} as const);
