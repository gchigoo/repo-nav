import {
  PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1,
  type PlatformCaseBindingV1,
  type PlatformContractIdV1,
} from '../../contracts/platform-contract.js';

export interface BindingAttestationMutationV1 {
  readonly id: string;
  readonly binding: PlatformCaseBindingV1<PlatformContractIdV1>;
  readonly description: string;
}

/**
 * Hostile binding mutations for orchestrator/tuple attestation tests.
 */
export function listBindingAttestationMutationsV1(): readonly BindingAttestationMutationV1[] {
  const base = PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1.bindings.find(
    (binding) => binding.contractId === 'F4-PATH-001',
  );
  if (base === undefined) {
    throw new Error('missing F4-PATH-001 binding');
  }
  return Object.freeze([
    Object.freeze({
      id: 'wrong-group-same-case',
      description: '合法 group 与合法 case 错配',
      binding: Object.freeze({
        ...base,
        group: 'cross-platform-ci-contract',
        executableCaseId: 'repository-path-invalid-input',
      }),
    }),
    Object.freeze({
      id: 'shared-case-across-contracts',
      description: '两个 contract 共享同一 executable case',
      binding: Object.freeze({
        ...base,
        contractId: 'F4-PATH-004',
        executableCaseId: 'repository-path-invalid-input',
      }),
    }),
    Object.freeze({
      id: 'missing-required-assertion',
      description: '删除 required assertion',
      binding: Object.freeze({
        ...base,
        requiredAssertionIds: Object.freeze([]),
      }),
    }),
  ]);
}
