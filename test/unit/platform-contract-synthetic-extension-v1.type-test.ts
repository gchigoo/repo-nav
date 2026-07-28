import {
  SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
  type PlatformContractSnapshotV1,
  type SyntheticPlatformContractIdV1,
} from '../../testkit/contracts/platform-contract.js';
import { buildSyntheticExtensionSnapshotV1 } from '../../testkit/fixtures/platform/registry-extension-mutations.js';

/**
 * Compile fixture: complete synthetic snapshot assigns to synthetic closed union.
 */
export const completeSyntheticSnapshot: PlatformContractSnapshotV1<
  typeof SYNTHETIC_PLATFORM_CONTRACT_IDS_V1
> = buildSyntheticExtensionSnapshotV1();

export function assertSyntheticIdAccepted(): void {
  const accepted: SyntheticPlatformContractIdV1 = 'TEST-EXT-001';
  void accepted;
}

export function assertUnknownIdRejected(): void {
  // @ts-expect-error unknown contract id is outside synthetic closed union
  const rejected: SyntheticPlatformContractIdV1 = 'UNKNOWN-EXT-001';
  void rejected;
}
