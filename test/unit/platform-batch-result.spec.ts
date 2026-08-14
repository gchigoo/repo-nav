import { describe, expect, it } from 'vitest';

import type {
  PlatformAssertionMarkerOwnerV1,
  PlatformCaseBindingV1,
  PlatformEvidenceHashOwnerV1,
} from '../../testkit/contracts/platform-contract.js';
import {
  type PrivatePlatformRunnerResultV1,
  validatePlatformBatchResult,
} from '../../testkit/testing/platform-contract.js';
import { isSelected } from '../../testkit/testing/selection.js';

const OWNER_ALPHA = 'test/unit/platform-batch-result.spec.ts';
const OWNER_BETA = 'test/unit/cross-platform-ci-contract.spec.ts';
const OWNER_EVIDENCE = 'test/unit/platform-evidence-report.spec.ts';
const HASH_ALPHA = 'a'.repeat(64);
const HASH_BETA = 'b'.repeat(64);
const HASH_EXTRA = 'c'.repeat(64);

interface BatchValidationInput {
  readonly bindings: readonly PlatformCaseBindingV1<string>[];
  readonly privateResult: PrivatePlatformRunnerResultV1;
  readonly markerOwners: readonly PlatformAssertionMarkerOwnerV1<string>[];
  readonly evidenceOwners: readonly PlatformEvidenceHashOwnerV1<string>[];
}

function buildBatchInput(): BatchValidationInput {
  const bindings: readonly PlatformCaseBindingV1<string>[] = [
    {
      contractId: 'BATCH-B',
      surface: 'unit',
      group: 'cross-platform-ci-contract',
      executableCaseId: 'platform-batch-result',
      applicableOs: ['linux', 'win32', 'darwin'],
      requiredAssertionIds: ['beta-marker'],
      requiredEvidenceHashIds: ['beta-proof'],
      fixture: 'test/unit/platform-batch-result.spec.ts',
      assertionOwner: OWNER_BETA,
    },
    {
      contractId: 'BATCH-A',
      surface: 'unit',
      group: 'cross-platform-ci-contract',
      executableCaseId: 'platform-batch-result',
      applicableOs: ['linux', 'win32', 'darwin'],
      requiredAssertionIds: ['alpha-marker'],
      requiredEvidenceHashIds: ['alpha-proof'],
      fixture: 'test/unit/platform-batch-result.spec.ts',
      assertionOwner: OWNER_ALPHA,
    },
  ];
  const markerOwners: readonly PlatformAssertionMarkerOwnerV1<string>[] = [
    {
      contractId: 'BATCH-A',
      assertionId: 'alpha-marker',
      assertionOwner: OWNER_ALPHA,
    },
    {
      contractId: 'BATCH-B',
      assertionId: 'beta-marker',
      assertionOwner: OWNER_BETA,
    },
  ];
  const evidenceOwners: readonly PlatformEvidenceHashOwnerV1<string>[] = [
    {
      contractId: 'BATCH-A',
      evidenceId: 'alpha-proof',
      evidenceOwner: OWNER_EVIDENCE,
    },
    {
      contractId: 'BATCH-B',
      evidenceId: 'beta-proof',
      evidenceOwner: OWNER_BETA,
    },
  ];
  return {
    bindings,
    privateResult: {
      registeredOwners: [OWNER_ALPHA, OWNER_BETA, OWNER_EVIDENCE],
      assertions: [
        {
          contractId: 'BATCH-B',
          assertionId: 'beta-marker',
          status: 'passed',
          actualOwner: OWNER_BETA,
        },
        {
          contractId: 'BATCH-A',
          assertionId: 'alpha-marker',
          status: 'passed',
          actualOwner: OWNER_ALPHA,
        },
      ],
      evidence: [
        {
          contractId: 'BATCH-B',
          evidenceId: 'beta-proof',
          sha256: HASH_BETA,
          actualOwner: OWNER_BETA,
        },
        {
          contractId: 'BATCH-A',
          evidenceId: 'alpha-proof',
          sha256: HASH_ALPHA,
          actualOwner: OWNER_EVIDENCE,
        },
      ],
    },
    markerOwners,
    evidenceOwners,
  };
}

function firstAssertion(
  input: BatchValidationInput,
): PrivatePlatformRunnerResultV1['assertions'][number] {
  const entry = input.privateResult.assertions[0];
  if (entry === undefined) {
    throw new Error('fixture missing first assertion');
  }
  return entry;
}

function firstEvidence(
  input: BatchValidationInput,
): PrivatePlatformRunnerResultV1['evidence'][number] {
  const entry = input.privateResult.evidence[0];
  if (entry === undefined) {
    throw new Error('fixture missing first evidence');
  }
  return entry;
}

describe.runIf(
  isSelected({
    group: 'cross-platform-ci-contract',
    caseId: 'platform-batch-result',
  }),
)('B1.3 platform batch result validator', () => {
  it('returns one summary per binding sorted by contract ID', () => {
    const input = buildBatchInput();

    expect(validatePlatformBatchResult(input)).toEqual([
      {
        contractId: 'BATCH-A',
        passedAssertionMarkers: [
          { contractId: 'BATCH-A', assertionId: 'alpha-marker' },
        ],
        contractEvidenceHashes: [
          {
            contractId: 'BATCH-A',
            evidenceId: 'alpha-proof',
            sha256: HASH_ALPHA,
          },
        ],
      },
      {
        contractId: 'BATCH-B',
        passedAssertionMarkers: [
          { contractId: 'BATCH-B', assertionId: 'beta-marker' },
        ],
        contractEvidenceHashes: [
          {
            contractId: 'BATCH-B',
            evidenceId: 'beta-proof',
            sha256: HASH_BETA,
          },
        ],
      },
    ]);
  });

  it('rejects duplicate markers fail closed', () => {
    const input = buildBatchInput();
    expect(() =>
      validatePlatformBatchResult({
        ...input,
        privateResult: {
          ...input.privateResult,
          assertions: [
            ...input.privateResult.assertions,
            firstAssertion(input),
          ],
        },
      }),
    ).toThrow();
  });

  it('rejects duplicate evidence fail closed', () => {
    const input = buildBatchInput();
    expect(() =>
      validatePlatformBatchResult({
        ...input,
        privateResult: {
          ...input.privateResult,
          evidence: [...input.privateResult.evidence, firstEvidence(input)],
        },
      }),
    ).toThrow();
  });

  it('rejects missing markers fail closed', () => {
    const input = buildBatchInput();
    expect(() =>
      validatePlatformBatchResult({
        ...input,
        privateResult: {
          ...input.privateResult,
          assertions: input.privateResult.assertions.filter(
            (entry) => entry.contractId !== 'BATCH-A',
          ),
        },
      }),
    ).toThrow();
  });

  it('rejects missing evidence fail closed', () => {
    const input = buildBatchInput();
    expect(() =>
      validatePlatformBatchResult({
        ...input,
        privateResult: {
          ...input.privateResult,
          evidence: input.privateResult.evidence.filter(
            (entry) => entry.contractId !== 'BATCH-A',
          ),
        },
      }),
    ).toThrow();
  });

  it('rejects wrong actualOwner fail closed', () => {
    const input = buildBatchInput();
    expect(() =>
      validatePlatformBatchResult({
        ...input,
        privateResult: {
          ...input.privateResult,
          assertions: input.privateResult.assertions.map((entry) =>
            entry.contractId === 'BATCH-B'
              ? { ...entry, actualOwner: OWNER_ALPHA }
              : entry,
          ),
        },
      }),
    ).toThrow();
  });

  it('rejects undeclared contracts fail closed', () => {
    const input = buildBatchInput();
    expect(() =>
      validatePlatformBatchResult({
        ...input,
        privateResult: {
          ...input.privateResult,
          assertions: [
            ...input.privateResult.assertions,
            {
              contractId: 'BATCH-C',
              assertionId: 'gamma-marker',
              status: 'passed',
              actualOwner: OWNER_ALPHA,
            },
          ],
        },
      }),
    ).toThrow();
  });

  it('rejects extra markers fail closed', () => {
    const input = buildBatchInput();
    expect(() =>
      validatePlatformBatchResult({
        ...input,
        privateResult: {
          ...input.privateResult,
          assertions: [
            ...input.privateResult.assertions,
            {
              contractId: 'BATCH-A',
              assertionId: 'alpha-extra',
              status: 'passed',
              actualOwner: OWNER_ALPHA,
            },
          ],
        },
      }),
    ).toThrow();
  });

  it('rejects extra evidence fail closed', () => {
    const input = buildBatchInput();
    expect(() =>
      validatePlatformBatchResult({
        ...input,
        privateResult: {
          ...input.privateResult,
          evidence: [
            ...input.privateResult.evidence,
            {
              contractId: 'BATCH-A',
              evidenceId: 'alpha-extra',
              sha256: HASH_EXTRA,
              actualOwner: OWNER_ALPHA,
            },
          ],
        },
      }),
    ).toThrow();
  });

  it('rejects registeredOwners mismatch fail closed', () => {
    const input = buildBatchInput();
    expect(() =>
      validatePlatformBatchResult({
        ...input,
        privateResult: {
          ...input.privateResult,
          registeredOwners: [OWNER_ALPHA, OWNER_BETA],
        },
      }),
    ).toThrow();
  });
});
