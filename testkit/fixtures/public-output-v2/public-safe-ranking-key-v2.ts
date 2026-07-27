import { bytesOfLengthV2 } from './corpus-policy-v2.js';

/** F1A-RANKKEY-001 conservative superset fixtures. */
export const RANKING_KEY_BYTE_CASES_V2 = Object.freeze([
  { bytes: 7, retainable: true },
  { bytes: 8, retainable: false },
  { bytes: 512, retainable: false },
  { bytes: 513, retainable: false },
] as const);

export function rankingSymbolOfBytesV2(bytes: number): string {
  return bytesOfLengthV2(bytes, 's');
}

export function rankingFileWithSegmentBytesV2(bytes: number): string {
  return `src/${bytesOfLengthV2(bytes, 'f')}/a.ts`;
}
