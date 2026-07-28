import {
  PLATFORM_CONTRACT_IDS_V1,
  PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1,
  SYNTHETIC_EXTENSION_PROOF_HASH_V1,
  SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
  type PlatformContractSnapshotV1,
  type SyntheticPlatformContractIdV1,
} from '../../contracts/platform-contract.js';

const SYNTHETIC_OWNER =
  'test/unit/cross-platform-ci-contract.spec.ts' as const;
const SYNTHETIC_FIXTURE =
  'testkit/fixtures/platform/registry-extension-mutations.ts' as const;

/**
 * Builds a complete synthetic snapshot that includes TEST-EXT-001.
 */
export function buildSyntheticExtensionSnapshotV1(): PlatformContractSnapshotV1<
  typeof SYNTHETIC_PLATFORM_CONTRACT_IDS_V1
> {
  return Object.freeze({
    allowedIds: SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
    bindings: Object.freeze([
      ...PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1.bindings,
      Object.freeze({
        contractId: 'TEST-EXT-001' as const,
        surface: 'unit' as const,
        group: 'cross-platform-ci-contract',
        executableCaseId: 'synthetic-extension-protocol',
        applicableOs: Object.freeze(['linux', 'win32', 'darwin'] as const),
        requiredAssertionIds: Object.freeze(['synthetic-marker']),
        requiredEvidenceHashIds: Object.freeze(['synthetic-proof']),
        fixture: SYNTHETIC_FIXTURE,
        assertionOwner: SYNTHETIC_OWNER,
      }),
    ]),
    markerOwners: Object.freeze([
      ...PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1.markerOwners,
      Object.freeze({
        contractId: 'TEST-EXT-001' as const,
        assertionId: 'synthetic-marker',
        assertionOwner: SYNTHETIC_OWNER,
      }),
    ]),
    evidenceHashOwners: Object.freeze([
      Object.freeze({
        contractId: 'TEST-EXT-001' as const,
        evidenceId: 'synthetic-proof',
        evidenceOwner: SYNTHETIC_OWNER,
      }),
    ]),
  });
}

export interface SyntheticExtensionMutationV1 {
  readonly id: string;
  readonly expectedIds: readonly string[];
  readonly snapshot: PlatformContractSnapshotV1<readonly string[]>;
}

/**
 * Hostile synthetic mutations that must fail closed-set validation.
 */
export function listSyntheticExtensionMutationsV1(): readonly SyntheticExtensionMutationV1[] {
  const complete = buildSyntheticExtensionSnapshotV1();
  const unextendedIds = PLATFORM_CONTRACT_IDS_V1;

  return Object.freeze([
    Object.freeze({
      id: 'unextended-expected-ids',
      expectedIds: unextendedIds,
      snapshot: {
        allowedIds: unextendedIds,
        bindings: complete.bindings,
        markerOwners: complete.markerOwners,
        evidenceHashOwners: complete.evidenceHashOwners,
      },
    }),
    Object.freeze({
      id: 'missing-binding',
      expectedIds: SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
      snapshot: {
        allowedIds: SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
        bindings: complete.bindings.filter(
          (binding) => binding.contractId !== 'TEST-EXT-001',
        ),
        markerOwners: complete.markerOwners,
        evidenceHashOwners: complete.evidenceHashOwners,
      },
    }),
    Object.freeze({
      id: 'missing-fixture',
      expectedIds: SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
      snapshot: {
        allowedIds: SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
        bindings: complete.bindings.map((binding) =>
          binding.contractId === 'TEST-EXT-001'
            ? {
                ...binding,
                fixture: 'testkit/fixtures/platform/does-not-exist.ts',
              }
            : binding,
        ),
        markerOwners: complete.markerOwners,
        evidenceHashOwners: complete.evidenceHashOwners,
      },
    }),
    Object.freeze({
      id: 'wrong-owner-path',
      expectedIds: SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
      snapshot: {
        allowedIds: SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
        bindings: complete.bindings.map((binding) =>
          binding.contractId === 'TEST-EXT-001'
            ? {
                ...binding,
                assertionOwner: 'test/unit/does-not-exist.spec.ts',
              }
            : binding,
        ),
        markerOwners: complete.markerOwners.map((owner) =>
          owner.contractId === 'TEST-EXT-001'
            ? {
                ...owner,
                assertionOwner: 'test/unit/does-not-exist.spec.ts',
              }
            : owner,
        ),
        evidenceHashOwners: complete.evidenceHashOwners,
      },
    }),
    Object.freeze({
      id: 'zero-marker',
      expectedIds: SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
      snapshot: {
        allowedIds: SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
        bindings: complete.bindings.map((binding) =>
          binding.contractId === 'TEST-EXT-001'
            ? { ...binding, requiredAssertionIds: [] }
            : binding,
        ),
        markerOwners: complete.markerOwners,
        evidenceHashOwners: complete.evidenceHashOwners,
      },
    }),
    Object.freeze({
      id: 'unknown-evidence-owner',
      expectedIds: SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
      snapshot: {
        allowedIds: SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
        bindings: complete.bindings,
        markerOwners: complete.markerOwners,
        evidenceHashOwners: [
          ...complete.evidenceHashOwners,
          {
            contractId: 'TEST-EXT-001',
            evidenceId: 'unknown-extra',
            evidenceOwner: SYNTHETIC_OWNER,
          },
        ],
      },
    }),
    Object.freeze({
      id: 'duplicate-case-tuple',
      expectedIds: SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
      snapshot: {
        allowedIds: SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
        bindings: [
          ...complete.bindings,
          {
            contractId: 'TEST-EXT-001',
            surface: 'unit' as const,
            group: 'cross-platform-ci-contract',
            executableCaseId: 'workflow-matrix-contract',
            applicableOs: ['linux', 'win32', 'darwin'] as const,
            requiredAssertionIds: ['synthetic-marker'],
            requiredEvidenceHashIds: ['synthetic-proof'],
            fixture: SYNTHETIC_FIXTURE,
            assertionOwner: SYNTHETIC_OWNER,
          },
        ],
        markerOwners: complete.markerOwners,
        evidenceHashOwners: complete.evidenceHashOwners,
      },
    }),
    Object.freeze({
      id: 'reduced-os',
      expectedIds: SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
      snapshot: {
        allowedIds: SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
        bindings: complete.bindings.map((binding) =>
          binding.contractId === 'TEST-EXT-001'
            ? { ...binding, applicableOs: [] }
            : binding,
        ),
        markerOwners: complete.markerOwners,
        evidenceHashOwners: complete.evidenceHashOwners,
      },
    }),
    Object.freeze({
      id: 'unknown-id',
      expectedIds: SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
      snapshot: {
        allowedIds: [
          ...SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
          'UNKNOWN-EXT-001',
        ],
        bindings: [
          ...complete.bindings,
          {
            contractId: 'UNKNOWN-EXT-001',
            surface: 'unit' as const,
            group: 'cross-platform-ci-contract',
            executableCaseId: 'synthetic-extension-protocol',
            applicableOs: ['linux', 'win32', 'darwin'] as const,
            requiredAssertionIds: ['synthetic-marker'],
            requiredEvidenceHashIds: [] as const,
            fixture: SYNTHETIC_FIXTURE,
            assertionOwner: SYNTHETIC_OWNER,
          },
        ],
        markerOwners: [
          ...complete.markerOwners,
          {
            contractId: 'UNKNOWN-EXT-001',
            assertionId: 'synthetic-marker',
            assertionOwner: SYNTHETIC_OWNER,
          },
        ],
        evidenceHashOwners: [...complete.evidenceHashOwners],
      },
    }),
  ]);
}

export function syntheticProofHash(): string {
  return SYNTHETIC_EXTENSION_PROOF_HASH_V1;
}

export type { SyntheticPlatformContractIdV1 };
