import type { EvidenceLocation } from '../../../src/contracts/index.js';
import type { VerifiedDiscoveryObservationV2 } from '../../../src/evidence/request-snapshot/verified-record-cache-v2.js';

/**
 * F3-VERIFY-001：preverification 与最终 merge 复用同一 observation。
 */
export const VERIFIED_CACHE_FILE_V2 = 'server/observe.ts';

export function createVerifiedObservationFixtureV2(
  file: string = VERIFIED_CACHE_FILE_V2,
): VerifiedDiscoveryObservationV2 {
  const location: EvidenceLocation = Object.freeze({
    file,
    lines: Object.freeze([1, 1] as [number, number]),
    excerpt: 'const observed = true;',
  });
  return Object.freeze({
    kind: 'verified' as const,
    focusLocations: Object.freeze([location]),
    expandedLocations: Object.freeze([location]),
    operations: Object.freeze(['FILESYSTEM_READ_RANGE' as const]),
    failures: Object.freeze([]),
  });
}
