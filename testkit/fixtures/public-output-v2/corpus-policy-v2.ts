import { LOW_INFORMATION_LITERALS_V2 } from '../../../src/evidence/public-output/sensitive-value-contract-v2.js';

/** F1A-LOCAL-001 / ELIGIBILITY-001 / TEXT-BOUNDARY-001 / PATH-SEGMENT-001 */
export const LOCAL_ONLY_ASSIGNMENTS_V2 = Object.freeze([
  'password=a',
  'token=1',
  'password=true',
  'password=R',
  'password=[',
] as const);

export const ELIGIBLE_LONG_SECRET_V2 = 'LongSecret-42';

export const TEXT_BOUNDARY_HAYSTACK_V2 = 'cat catalog scat cat-1';

export const PATH_SEGMENT_CASES_V2 = Object.freeze([
  { path: 'src/cat/file.ts', shouldRedact: true },
  { path: 'src/catalog.ts', shouldRedact: false },
  { path: 'src/mycat/file.ts', shouldRedact: false },
] as const);

export const LOW_INFORMATION_SENTINELS_V2 = Object.freeze(
  Array.from(LOW_INFORMATION_LITERALS_V2),
);

export function bytesOfLengthV2(length: number, fill = 'x'): string {
  if (fill.length !== 1) {
    throw new Error('fill must be one ASCII code unit');
  }
  return fill.repeat(length);
}
