import { existsSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';

import {
  PLATFORM_CASE_OWNER_REGISTRATION,
  RUNNER_SELECTIONS,
} from '../runners/runner-registry.js';

/** Platform matrix cell identifier in canonical report order. */
export type PlatformCellId =
  | 'linux-node22'
  | 'linux-node24'
  | 'windows-node22'
  | 'windows-node24'
  | 'macos-intel-node22'
  | 'macos-intel-node24';

export type PlatformOs = 'linux' | 'win32' | 'darwin';
export type PlatformArch = 'x64';
export type PlatformRunnerLabel =
  | 'ubuntu-24.04'
  | 'windows-2025'
  | 'macos-15-intel';

export interface PlatformCellContract {
  readonly id: PlatformCellId;
  readonly runner: PlatformRunnerLabel;
  readonly os: PlatformOs;
  readonly arch: PlatformArch;
  readonly nodeMajor: 22 | 24;
}

export interface PlatformCommandContract {
  readonly id:
    | 'install'
    | 'runtime'
    | 'build'
    | 'typecheck'
    | 'unit'
    | 'golden'
    | 'mcp'
    | 'docs'
    | 'platform';
  readonly blocking: true;
}

export interface PlatformActionPin {
  readonly id: 'checkout' | 'setup-node' | 'upload-artifact';
  readonly owner: 'actions';
  readonly repository: string;
  readonly sha: string;
  readonly tag: string;
}

export const PLATFORM_CONTRACT_IDS_V1 = [
  'F4-PATH-001',
  'F4-PATH-002',
  'F4-PATH-003',
  'F4-PATH-004',
  'F4-PROC-001',
  'F4-PROC-002',
  'F4-PROC-003',
  'F4-PROC-004',
  'F4-PROC-005',
  'F4-MCP-001',
  'F4-MCP-002',
] as const;

export type PlatformContractIdV1 =
  (typeof PLATFORM_CONTRACT_IDS_V1)[number];

export type SyntheticPlatformContractIdV1 =
  | PlatformContractIdV1
  | 'TEST-EXT-001';

export const SYNTHETIC_PLATFORM_CONTRACT_IDS_V1 = [
  ...PLATFORM_CONTRACT_IDS_V1,
  'TEST-EXT-001',
] as const;

export interface PlatformCaseBindingV1<TContractId extends string> {
  readonly contractId: TContractId;
  readonly surface: 'unit' | 'mcp';
  readonly group: string;
  readonly executableCaseId: string;
  readonly applicableOs: readonly PlatformOs[];
  readonly requiredAssertionIds: readonly string[];
  readonly requiredEvidenceHashIds: readonly string[];
  readonly fixture: string;
  readonly assertionOwner: string;
}

export interface PlatformAssertionMarkerOwnerV1<TContractId extends string> {
  readonly contractId: TContractId;
  readonly assertionId: string;
  readonly assertionOwner: string;
}

export interface PlatformEvidenceHashOwnerV1<TContractId extends string> {
  readonly contractId: TContractId;
  readonly evidenceId: string;
  readonly evidenceOwner: string;
}

export interface PlatformContractSnapshotV1<
  TExpectedIds extends readonly string[],
> {
  readonly allowedIds: TExpectedIds;
  readonly bindings: readonly PlatformCaseBindingV1<TExpectedIds[number]>[];
  readonly markerOwners: readonly PlatformAssertionMarkerOwnerV1<
    TExpectedIds[number]
  >[];
  readonly evidenceHashOwners: readonly PlatformEvidenceHashOwnerV1<
    TExpectedIds[number]
  >[];
}

export interface ValidatedPlatformContractSnapshotV1<
  TExpectedIds extends readonly string[],
> {
  readonly __brand: 'ValidatedPlatformContractSnapshotV1';
  readonly expectedIdSample: TExpectedIds[number] | undefined;
  readonly snapshot: PlatformContractSnapshotV1<TExpectedIds>;
}

export interface PlatformContractRepositoryPortV1 {
  exists(repositoryRelativePath: string): boolean;
  isIncludedTestOwner(
    surface: 'unit' | 'mcp',
    repositoryRelativePath: string,
  ): boolean;
  registeredCaseOwners(
    surface: 'unit' | 'mcp',
    group: string,
    executableCaseId: string,
  ): readonly string[];
}

export const PLATFORM_CELLS_V1: readonly PlatformCellContract[] =
  Object.freeze([
    Object.freeze({
      id: 'linux-node22',
      runner: 'ubuntu-24.04',
      os: 'linux',
      arch: 'x64',
      nodeMajor: 22,
    }),
    Object.freeze({
      id: 'linux-node24',
      runner: 'ubuntu-24.04',
      os: 'linux',
      arch: 'x64',
      nodeMajor: 24,
    }),
    Object.freeze({
      id: 'windows-node22',
      runner: 'windows-2025',
      os: 'win32',
      arch: 'x64',
      nodeMajor: 22,
    }),
    Object.freeze({
      id: 'windows-node24',
      runner: 'windows-2025',
      os: 'win32',
      arch: 'x64',
      nodeMajor: 24,
    }),
    Object.freeze({
      id: 'macos-intel-node22',
      runner: 'macos-15-intel',
      os: 'darwin',
      arch: 'x64',
      nodeMajor: 22,
    }),
    Object.freeze({
      id: 'macos-intel-node24',
      runner: 'macos-15-intel',
      os: 'darwin',
      arch: 'x64',
      nodeMajor: 24,
    }),
  ]);

export const PLATFORM_COMMANDS_V1: readonly PlatformCommandContract[] =
  Object.freeze([
    Object.freeze({ id: 'install', blocking: true }),
    Object.freeze({ id: 'runtime', blocking: true }),
    Object.freeze({ id: 'build', blocking: true }),
    Object.freeze({ id: 'typecheck', blocking: true }),
    Object.freeze({ id: 'unit', blocking: true }),
    Object.freeze({ id: 'golden', blocking: true }),
    Object.freeze({ id: 'mcp', blocking: true }),
    Object.freeze({ id: 'docs', blocking: true }),
    Object.freeze({ id: 'platform', blocking: true }),
  ]);

export const PLATFORM_ACTION_PINS_V1: readonly PlatformActionPin[] =
  Object.freeze([
    Object.freeze({
      id: 'checkout',
      owner: 'actions',
      repository: 'actions/checkout',
      sha: '9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0',
      tag: 'v7.0.0',
    }),
    Object.freeze({
      id: 'setup-node',
      owner: 'actions',
      repository: 'actions/setup-node',
      sha: '820762786026740c76f36085b0efc47a31fe5020',
      tag: 'v7.0.0',
    }),
    Object.freeze({
      id: 'upload-artifact',
      owner: 'actions',
      repository: 'actions/upload-artifact',
      sha: '330a01c490aca151604b8cf639adc76d48f6c5d4',
      tag: 'v5.0.0',
    }),
  ]);

export const PLATFORM_WORKFLOW_PATH_V1 =
  '.github/workflows/cross-platform-ci.yml' as const;
export const PLATFORM_AGGREGATE_JOB_ID_V1 =
  'cross-platform-required' as const;
export const PLATFORM_MATRIX_JOB_ID_V1 = 'platform-matrix' as const;
export const PLATFORM_AGGREGATE_RUNNER_V1 = 'ubuntu-24.04' as const;

const ALL_OS = ['linux', 'win32', 'darwin'] as const;
const POSIX_OS = ['linux', 'darwin'] as const;
const WINDOWS_OS = ['win32'] as const;

const UNIT_PLATFORM_OWNER =
  'test/unit/cross-platform-platform.spec.ts' as const;
const PATH_FIXTURE =
  'testkit/fixtures/platform/repository-path-tree.ts' as const;
const PROCESS_FIXTURE =
  'testkit/fixtures/process/process-helper.ts' as const;
const MCP_CANCEL_OWNER =
  'test/mcp/request-cancellation.spec.ts' as const;
const MCP_LIFECYCLE_OWNER =
  'test/mcp/lifecycle-contract.spec.ts' as const;

function markerOwnersFor(
  contractId: PlatformContractIdV1,
  assertionIds: readonly string[],
  owner: string,
): readonly PlatformAssertionMarkerOwnerV1<PlatformContractIdV1>[] {
  return assertionIds.map((assertionId) =>
    Object.freeze({ contractId, assertionId, assertionOwner: owner }),
  );
}

const BASE_BINDINGS: readonly PlatformCaseBindingV1<PlatformContractIdV1>[] =
  Object.freeze([
    Object.freeze({
      contractId: 'F4-PATH-001',
      surface: 'unit',
      group: 'cross-platform-baseline',
      executableCaseId: 'repository-path-invalid-input',
      applicableOs: ALL_OS,
      requiredAssertionIds: Object.freeze([
        'absolute-parent-nonnormalized-rejected',
      ]),
      requiredEvidenceHashIds: Object.freeze([]),
      fixture: PATH_FIXTURE,
      assertionOwner: UNIT_PLATFORM_OWNER,
    }),
    Object.freeze({
      contractId: 'F4-PATH-002',
      surface: 'unit',
      group: 'cross-platform-baseline',
      executableCaseId: 'repository-path-posix-symlink-escape',
      applicableOs: POSIX_OS,
      requiredAssertionIds: Object.freeze([
        'posix-symlink-escape-rejected',
      ]),
      requiredEvidenceHashIds: Object.freeze([]),
      fixture: PATH_FIXTURE,
      assertionOwner: UNIT_PLATFORM_OWNER,
    }),
    Object.freeze({
      contractId: 'F4-PATH-003',
      surface: 'unit',
      group: 'cross-platform-baseline',
      executableCaseId: 'repository-path-windows-reparse-escape',
      applicableOs: WINDOWS_OS,
      requiredAssertionIds: Object.freeze([
        'windows-reparse-escape-rejected',
      ]),
      requiredEvidenceHashIds: Object.freeze([]),
      fixture: PATH_FIXTURE,
      assertionOwner: UNIT_PLATFORM_OWNER,
    }),
    Object.freeze({
      contractId: 'F4-PATH-004',
      surface: 'unit',
      group: 'cross-platform-baseline',
      executableCaseId: 'repository-path-error-redaction',
      applicableOs: ALL_OS,
      requiredAssertionIds: Object.freeze([
        'absolute-root-not-serialized',
      ]),
      requiredEvidenceHashIds: Object.freeze([]),
      fixture: PATH_FIXTURE,
      assertionOwner: UNIT_PLATFORM_OWNER,
    }),
    Object.freeze({
      contractId: 'F4-PROC-001',
      surface: 'unit',
      group: 'cross-platform-baseline',
      executableCaseId: 'process-caller-abort-tree-cleanup',
      applicableOs: ALL_OS,
      requiredAssertionIds: Object.freeze([
        'aborted-result',
        'settled-once',
        'owned-tree-dead',
      ]),
      requiredEvidenceHashIds: Object.freeze([]),
      fixture: PROCESS_FIXTURE,
      assertionOwner: UNIT_PLATFORM_OWNER,
    }),
    Object.freeze({
      contractId: 'F4-PROC-002',
      surface: 'unit',
      group: 'cross-platform-baseline',
      executableCaseId: 'process-timeout-tree-cleanup',
      applicableOs: ALL_OS,
      requiredAssertionIds: Object.freeze([
        'timeout-result',
        'settled-once',
        'owned-tree-dead',
      ]),
      requiredEvidenceHashIds: Object.freeze([]),
      fixture: PROCESS_FIXTURE,
      assertionOwner: UNIT_PLATFORM_OWNER,
    }),
    Object.freeze({
      contractId: 'F4-PROC-003',
      surface: 'unit',
      group: 'cross-platform-baseline',
      executableCaseId: 'process-stdout-current-boundary',
      applicableOs: ALL_OS,
      requiredAssertionIds: Object.freeze([
        'n-minus-one-success',
        'exact-n-limit',
        'owned-tree-dead',
      ]),
      requiredEvidenceHashIds: Object.freeze([]),
      fixture: PROCESS_FIXTURE,
      assertionOwner: UNIT_PLATFORM_OWNER,
    }),
    Object.freeze({
      contractId: 'F4-PROC-004',
      surface: 'unit',
      group: 'cross-platform-baseline',
      executableCaseId: 'process-stderr-current-boundary',
      applicableOs: ALL_OS,
      requiredAssertionIds: Object.freeze([
        'n-minus-one-success',
        'exact-n-limit',
        'owned-tree-dead',
      ]),
      requiredEvidenceHashIds: Object.freeze([]),
      fixture: PROCESS_FIXTURE,
      assertionOwner: UNIT_PLATFORM_OWNER,
    }),
    Object.freeze({
      contractId: 'F4-PROC-005',
      surface: 'unit',
      group: 'cross-platform-baseline',
      executableCaseId: 'process-cleanup-invariant-fault',
      applicableOs: ALL_OS,
      requiredAssertionIds: Object.freeze([
        'fixed-invariant',
        'direct-child-dead',
        'descendant-observed-before-harness-cleanup',
      ]),
      requiredEvidenceHashIds: Object.freeze([]),
      fixture: PROCESS_FIXTURE,
      assertionOwner: UNIT_PLATFORM_OWNER,
    }),
    Object.freeze({
      contractId: 'F4-MCP-001',
      surface: 'mcp',
      group: 'mcp-surface',
      executableCaseId: 'request-cancellation-cleanup',
      applicableOs: ALL_OS,
      requiredAssertionIds: Object.freeze([
        'pre-handler-cancel',
        'inflight-signal',
        'eof-abort',
      ]),
      requiredEvidenceHashIds: Object.freeze([]),
      fixture:
        'testkit/manifests/mcp/request-cancellation-platform.yaml',
      assertionOwner: MCP_CANCEL_OWNER,
    }),
    Object.freeze({
      contractId: 'F4-MCP-002',
      surface: 'mcp',
      group: 'lifecycle',
      executableCaseId: 'shutdown-cleanup-probe',
      applicableOs: ALL_OS,
      requiredAssertionIds: Object.freeze([
        'real-close-and-tree-cleanup',
        'missing-close-negative',
        'live-descendant-negative',
        'timeout-cleanup',
        'nonzero-cleanup',
      ]),
      requiredEvidenceHashIds: Object.freeze([]),
      fixture:
        'testkit/manifests/mcp/shutdown-cleanup-platform.yaml',
      assertionOwner: MCP_LIFECYCLE_OWNER,
    }),
  ]);

const BASE_MARKER_OWNERS: readonly PlatformAssertionMarkerOwnerV1<PlatformContractIdV1>[] =
  Object.freeze(
    BASE_BINDINGS.flatMap((binding) =>
      markerOwnersFor(
        binding.contractId,
        binding.requiredAssertionIds,
        binding.assertionOwner,
      ),
    ),
  );

export const PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1: PlatformContractSnapshotV1<
  typeof PLATFORM_CONTRACT_IDS_V1
> = Object.freeze({
  allowedIds: PLATFORM_CONTRACT_IDS_V1,
  bindings: BASE_BINDINGS,
  markerOwners: BASE_MARKER_OWNERS,
  evidenceHashOwners: Object.freeze([]),
});

/** Cross-design ledger only; F4 base does not load these rows. */
export const CHILD_PLATFORM_EXTENSION_LEDGER_V1 = Object.freeze([
  Object.freeze({
    contractId: 'F5-PROC-001',
    group: 'streaming-ripgrep',
    executableCaseId: 'stream-consumer-progress-and-boundary',
    requiredAssertionIds: Object.freeze([
      'continue-full-prefix',
      'partial-stop-before-n-plus-one',
      'invalid-decision-fixed',
      'cleanup-invariant-overrides-trigger',
    ]),
    requiredEvidenceHashIds: Object.freeze([] as const),
  }),
  Object.freeze({
    contractId: 'F5-PROC-003',
    group: 'streaming-ripgrep',
    executableCaseId: 'stream-consumer-finalizer-and-process-exit',
    requiredAssertionIds: Object.freeze([
      'partial-valid-invalid-union',
      'top-level-async-finalizer-rejected',
      'null-exit-or-signal-process-exit',
    ]),
    requiredEvidenceHashIds: Object.freeze([] as const),
  }),
  Object.freeze({
    contractId: 'F5-RG-001',
    group: 'streaming-ripgrep',
    executableCaseId: 'ripgrep-json-stream-protocol',
    requiredAssertionIds: Object.freeze([
      'crlf-partition-stable',
      'summary-fsm-complete',
      'offset-slice-valid',
      'exit-summary-joint-valid',
    ]),
    requiredEvidenceHashIds: Object.freeze([] as const),
  }),
  Object.freeze({
    contractId: 'F5-CLEANUP-001',
    group: 'streaming-ripgrep',
    executableCaseId: 'ripgrep-early-stop-tree-cleanup',
    requiredAssertionIds: Object.freeze([
      'telemetry-only',
      'owned-tree-dead',
      'settled-once',
    ]),
    requiredEvidenceHashIds: Object.freeze([] as const),
  }),
  Object.freeze({
    contractId: 'F6-INPUT-001',
    group: 'input-abort-contract-v2',
    executableCaseId: 'platform-input-boundary',
    requiredAssertionIds: Object.freeze([
      'repo-path-code-units',
      'file-anchor-backslash-rejected',
      'raw-budget-boundary',
    ]),
    requiredEvidenceHashIds: Object.freeze([] as const),
  }),
  Object.freeze({
    contractId: 'F6-ABORT-001',
    group: 'input-abort-contract-v2',
    executableCaseId: 'platform-abort-first-writer',
    requiredAssertionIds: Object.freeze([
      'caller-first-writer',
      'deadline-first-writer',
      'local-timeout-not-abort-source',
    ]),
    requiredEvidenceHashIds: Object.freeze([] as const),
  }),
  Object.freeze({
    contractId: 'F6-LATCH-001',
    group: 'input-abort-contract-v2',
    executableCaseId: 'platform-finalization-latch',
    requiredAssertionIds: Object.freeze([
      'before-close-observed',
      'after-close-ignored',
      'no-timer-listener-leak',
    ]),
    requiredEvidenceHashIds: Object.freeze([] as const),
  }),
  Object.freeze({
    contractId: 'F7-SCOPE-001',
    group: 'repository-scope-policy',
    executableCaseId: 'platform-path-flavor-and-priority',
    requiredAssertionIds: Object.freeze([
      'backend-native-path-flavor',
      'scope-priority',
      'caller-backslash-rejected',
      'drive-relative-rejected',
    ]),
    requiredEvidenceHashIds: Object.freeze([] as const),
  }),
  Object.freeze({
    contractId: 'F8-LANG-001',
    group: 'language-capability-boundary',
    executableCaseId: 'language-extension-and-fallback',
    requiredAssertionIds: Object.freeze([
      'typescript-extension',
      'javascript-extension',
      'sql-extension',
      'fallback-candidate-only',
      'unsupported-count-before-budget',
    ]),
    requiredEvidenceHashIds: Object.freeze([] as const),
  }),
  Object.freeze({
    contractId: 'F9-PACK-001',
    group: 'public-beta-release',
    executableCaseId: 'package-install-and-bin-smoke',
    requiredAssertionIds: Object.freeze([
      'tarball-allowlist-exact',
      'package-bins-executable',
      'node-engine-range-declared',
      'mcp-v2-installed-parity',
      'package-runtime-closure',
    ]),
    requiredEvidenceHashIds: Object.freeze([
      'candidate-id',
      'semantic-manifest',
      'production-closure',
    ]),
  }),
] as const);

export const SYNTHETIC_EXTENSION_PROOF_HASH_V1 =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' as const;

export function platformAssertionMarkerKey(
  contractId: string,
  assertionId: string,
): string {
  return `platform::${contractId}::${assertionId}`;
}

export function platformEvidenceHashKey(
  contractId: string,
  evidenceId: string,
): string {
  return `platform-evidence::${contractId}::${evidenceId}`;
}

function isPosixRepositoryRelativePath(value: string): boolean {
  if (value.length === 0) return false;
  if (value.includes('\\')) return false;
  if (value.startsWith('/') || /^[A-Za-z]:/u.test(value)) return false;
  if (value.startsWith('//') || value.startsWith('\\\\')) return false;
  const segments = value.split('/');
  return segments.every(
    (segment) =>
      segment.length > 0 && segment !== '.' && segment !== '..',
  );
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right),
  );
}

function deepExactStringArray(
  actual: readonly string[],
  expected: readonly string[],
  label: string,
): void {
  if (
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    throw new Error(
      `${label} mismatch: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`,
    );
  }
}

/**
 * Generic closed-set snapshot validator; callers must pass the exact expected ID tuple.
 */
export function validatePlatformContractSnapshotV1<
  const TExpectedIds extends readonly string[],
>(
  expectedIds: TExpectedIds,
  snapshot: PlatformContractSnapshotV1<NoInfer<TExpectedIds>>,
  repository: PlatformContractRepositoryPortV1,
): ValidatedPlatformContractSnapshotV1<TExpectedIds> {
  deepExactStringArray(
    [...snapshot.allowedIds],
    [...expectedIds],
    'snapshot.allowedIds',
  );

  const bindingById = new Map<
    string,
    PlatformCaseBindingV1<TExpectedIds[number]>
  >();
  const caseTuples = new Set<string>();
  const markerKeys = new Set<string>();
  const evidenceKeys = new Set<string>();

  for (const expectedId of expectedIds) {
    const matches = snapshot.bindings.filter(
      (binding) => binding.contractId === expectedId,
    );
    if (matches.length !== 1) {
      throw new Error(
        `expected exactly one binding for ${expectedId}, got ${matches.length}`,
      );
    }
    const binding = matches[0];
    if (binding === undefined) {
      throw new Error(`missing binding for ${expectedId}`);
    }
    bindingById.set(expectedId, binding);

    if (binding.surface !== 'unit' && binding.surface !== 'mcp') {
      throw new Error(`invalid surface for ${expectedId}`);
    }
    if (binding.group.length === 0 || binding.executableCaseId.length === 0) {
      throw new Error(`empty group/case for ${expectedId}`);
    }
    if (binding.applicableOs.length === 0) {
      throw new Error(`empty applicableOs for ${expectedId}`);
    }
    for (const os of binding.applicableOs) {
      if (os !== 'linux' && os !== 'win32' && os !== 'darwin') {
        throw new Error(`invalid OS ${os} for ${expectedId}`);
      }
    }
    if (binding.requiredAssertionIds.length === 0) {
      throw new Error(`empty requiredAssertionIds for ${expectedId}`);
    }
    if (
      !isPosixRepositoryRelativePath(binding.fixture) ||
      !isPosixRepositoryRelativePath(binding.assertionOwner)
    ) {
      throw new Error(`invalid fixture/owner path for ${expectedId}`);
    }
    if (!repository.exists(binding.fixture)) {
      throw new Error(`missing fixture ${binding.fixture}`);
    }
    if (!repository.exists(binding.assertionOwner)) {
      throw new Error(`missing assertionOwner ${binding.assertionOwner}`);
    }
    if (
      !repository.isIncludedTestOwner(
        binding.surface,
        binding.assertionOwner,
      )
    ) {
      throw new Error(
        `assertionOwner not included for ${binding.surface}: ${binding.assertionOwner}`,
      );
    }

    const tuple = `${binding.surface}/${binding.group}/${binding.executableCaseId}`;
    if (caseTuples.has(tuple)) {
      throw new Error(`duplicate executable tuple ${tuple}`);
    }
    caseTuples.add(tuple);

    const expectedOwners = sortedUnique([
      binding.assertionOwner,
      ...snapshot.markerOwners
        .filter((owner) => owner.contractId === expectedId)
        .map((owner) => owner.assertionOwner),
      ...snapshot.evidenceHashOwners
        .filter((owner) => owner.contractId === expectedId)
        .map((owner) => owner.evidenceOwner),
    ]);
    const registered = sortedUnique([
      ...repository.registeredCaseOwners(
        binding.surface,
        binding.group,
        binding.executableCaseId,
      ),
    ]);
    deepExactStringArray(
      registered,
      expectedOwners,
      `registeredCaseOwners(${tuple})`,
    );

    for (const assertionId of binding.requiredAssertionIds) {
      const owners = snapshot.markerOwners.filter(
        (owner) =>
          owner.contractId === expectedId &&
          owner.assertionId === assertionId,
      );
      if (owners.length !== 1) {
        throw new Error(
          `expected one marker owner for ${expectedId}/${assertionId}`,
        );
      }
      const owner = owners[0];
      if (owner === undefined) {
        throw new Error(`missing marker owner ${expectedId}/${assertionId}`);
      }
      if (!isPosixRepositoryRelativePath(owner.assertionOwner)) {
        throw new Error(
          `invalid marker owner path for ${expectedId}/${assertionId}`,
        );
      }
      if (!repository.exists(owner.assertionOwner)) {
        throw new Error(`missing marker owner ${owner.assertionOwner}`);
      }
      if (
        !repository.isIncludedTestOwner(
          binding.surface,
          owner.assertionOwner,
        )
      ) {
        throw new Error(
          `marker owner not included: ${owner.assertionOwner}`,
        );
      }
      const key = platformAssertionMarkerKey(expectedId, assertionId);
      if (markerKeys.has(key)) {
        throw new Error(`duplicate marker ${key}`);
      }
      markerKeys.add(key);
    }

    for (const evidenceId of binding.requiredEvidenceHashIds) {
      const owners = snapshot.evidenceHashOwners.filter(
        (owner) =>
          owner.contractId === expectedId &&
          owner.evidenceId === evidenceId,
      );
      if (owners.length !== 1) {
        throw new Error(
          `expected one evidence owner for ${expectedId}/${evidenceId}`,
        );
      }
      const owner = owners[0];
      if (owner === undefined) {
        throw new Error(
          `missing evidence owner ${expectedId}/${evidenceId}`,
        );
      }
      if (!isPosixRepositoryRelativePath(owner.evidenceOwner)) {
        throw new Error(
          `invalid evidence owner path for ${expectedId}/${evidenceId}`,
        );
      }
      if (!repository.exists(owner.evidenceOwner)) {
        throw new Error(`missing evidence owner ${owner.evidenceOwner}`);
      }
      if (
        !repository.isIncludedTestOwner(
          binding.surface,
          owner.evidenceOwner,
        )
      ) {
        throw new Error(
          `evidence owner not included: ${owner.evidenceOwner}`,
        );
      }
      const key = platformEvidenceHashKey(expectedId, evidenceId);
      if (evidenceKeys.has(key)) {
        throw new Error(`duplicate evidence ${key}`);
      }
      evidenceKeys.add(key);
    }
  }

  for (const binding of snapshot.bindings) {
    if (!expectedIds.includes(binding.contractId)) {
      throw new Error(`unknown binding contractId ${binding.contractId}`);
    }
  }
  for (const owner of snapshot.markerOwners) {
    const binding = bindingById.get(owner.contractId);
    if (binding === undefined) {
      throw new Error(`marker owner for unknown contract ${owner.contractId}`);
    }
    if (!binding.requiredAssertionIds.includes(owner.assertionId)) {
      throw new Error(
        `unexpected marker owner ${owner.contractId}/${owner.assertionId}`,
      );
    }
  }
  for (const owner of snapshot.evidenceHashOwners) {
    const binding = bindingById.get(owner.contractId);
    if (binding === undefined) {
      throw new Error(
        `evidence owner for unknown contract ${owner.contractId}`,
      );
    }
    if (!binding.requiredEvidenceHashIds.includes(owner.evidenceId)) {
      throw new Error(
        `unexpected evidence owner ${owner.contractId}/${owner.evidenceId}`,
      );
    }
  }

  return Object.freeze({
    __brand: 'ValidatedPlatformContractSnapshotV1' as const,
    expectedIdSample: expectedIds[0],
    snapshot,
  });
}

/**
 * Production orchestrator entry; closed over PLATFORM_CONTRACT_IDS_V1.
 */
export function validateProductionPlatformContractSnapshotV1(
  snapshot: PlatformContractSnapshotV1<typeof PLATFORM_CONTRACT_IDS_V1>,
  repository: PlatformContractRepositoryPortV1,
): ValidatedPlatformContractSnapshotV1<typeof PLATFORM_CONTRACT_IDS_V1> {
  return validatePlatformContractSnapshotV1(
    PLATFORM_CONTRACT_IDS_V1,
    snapshot,
    repository,
  );
}

export function createFilesystemPlatformContractRepository(
  repositoryRoot: string,
): PlatformContractRepositoryPortV1 {
  return {
    exists(repositoryRelativePath: string): boolean {
      if (!isPosixRepositoryRelativePath(repositoryRelativePath)) {
        return false;
      }
      const absolute = resolve(
        repositoryRoot,
        ...repositoryRelativePath.split('/'),
      );
      return existsSync(absolute) && statSync(absolute).isFile();
    },
    isIncludedTestOwner(
      surface: 'unit' | 'mcp',
      repositoryRelativePath: string,
    ): boolean {
      if (!isPosixRepositoryRelativePath(repositoryRelativePath)) {
        return false;
      }
      if (surface === 'unit') {
        return (
          repositoryRelativePath.startsWith('test/unit/') &&
          repositoryRelativePath.endsWith('.spec.ts')
        );
      }
      return (
        repositoryRelativePath.startsWith('test/mcp/') &&
        repositoryRelativePath.endsWith('.spec.ts')
      );
    },
    registeredCaseOwners(
      surface: 'unit' | 'mcp',
      group: string,
      executableCaseId: string,
    ): readonly string[] {
      const key = `${surface}/${group}/${executableCaseId}`;
      const owners = PLATFORM_CASE_OWNER_REGISTRATION[key];
      return owners === undefined ? [] : owners;
    },
  };
}

export function cellForRuntime(
  platform: NodeJS.Platform,
  arch: string,
  nodeMajor: number,
): PlatformCellContract | undefined {
  return PLATFORM_CELLS_V1.find(
    (cell) =>
      cell.os === platform &&
      cell.arch === arch &&
      cell.nodeMajor === nodeMajor,
  );
}

export function probeRuntimeIdentity(): {
  readonly platform: NodeJS.Platform;
  readonly arch: string;
  readonly nodeMajor: number;
} {
  const major = Number(process.versions.node.split('.')[0]);
  if (!Number.isInteger(major)) {
    throw new Error('unable to parse Node major version');
  }
  return {
    platform: process.platform,
    arch: process.arch,
    nodeMajor: major,
  };
}

export function assertRuntimeMatchesCell(
  cellId: PlatformCellId,
): PlatformCellContract {
  const expected = PLATFORM_CELLS_V1.find((cell) => cell.id === cellId);
  if (expected === undefined) {
    throw new Error(`unknown cell ${cellId}`);
  }
  const actual = probeRuntimeIdentity();
  if (
    actual.platform !== expected.os ||
    actual.arch !== expected.arch ||
    actual.nodeMajor !== expected.nodeMajor
  ) {
    throw new Error(
      `runtime mismatch for ${cellId}: expected ${expected.os}/${expected.arch}/node${expected.nodeMajor} got ${actual.platform}/${actual.arch}/node${actual.nodeMajor}`,
    );
  }
  return expected;
}

export function applicableBindingsForOs(
  snapshot: PlatformContractSnapshotV1<readonly string[]>,
  os: PlatformOs,
): readonly PlatformCaseBindingV1<string>[] {
  return snapshot.bindings.filter((binding) =>
    binding.applicableOs.includes(os),
  );
}

export function actionPinById(
  id: PlatformActionPin['id'],
): PlatformActionPin {
  const pin = PLATFORM_ACTION_PINS_V1.find((entry) => entry.id === id);
  if (pin === undefined) {
    throw new Error(`missing action pin ${id}`);
  }
  return pin;
}

export function ensureRunnerSelectionsCoverPlatformCases(): void {
  for (const binding of BASE_BINDINGS) {
    const registry = RUNNER_SELECTIONS[binding.surface];
    if (!registry.groups.has(binding.group)) {
      throw new Error(
        `runner registry missing group ${binding.group} on ${binding.surface}`,
      );
    }
    if (!registry.cases.has(binding.executableCaseId)) {
      throw new Error(
        `runner registry missing case ${binding.executableCaseId} on ${binding.surface}`,
      );
    }
  }
}

export function toPosixRelative(
  repositoryRoot: string,
  absolutePath: string,
): string {
  const normalizedRoot = resolve(repositoryRoot);
  const normalizedPath = resolve(absolutePath);
  if (
    normalizedPath !== normalizedRoot &&
    !normalizedPath.startsWith(normalizedRoot + sep)
  ) {
    throw new Error('path escapes repository root');
  }
  return normalizedPath
    .slice(normalizedRoot.length)
    .split(sep)
    .filter((segment) => segment.length > 0)
    .join('/');
}
