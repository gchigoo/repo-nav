import type { PlatformContractIdV1 } from '../../testkit/contracts/platform-contract.js';

/**
 * Compile fixture: TEST-EXT-001 must not assign to production PlatformContractIdV1.
 */
export function assertProductionIdRejectsSynthetic(): void {
  // @ts-expect-error TEST-EXT-001 is not part of PlatformContractIdV1
  const rejected: PlatformContractIdV1 = 'TEST-EXT-001';
  void rejected;
}
