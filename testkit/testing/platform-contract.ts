import { it } from 'vitest';

import {
  platformAssertionMarkerKey,
  platformEvidenceHashKey,
  type PlatformAssertionMarkerOwnerV1,
  type PlatformCaseBindingV1,
  type PlatformEvidenceHashOwnerV1,
} from '../contracts/platform-contract.js';
import type {
  PlatformContractEvidenceHashV1,
  PlatformPassedAssertionMarkerV1,
} from '../contracts/platform-evidence-report.js';

export type PlatformAssertionStatus = 'passed' | 'failed' | 'skipped';

export interface PrivatePlatformAssertionExecutionV1 {
  readonly contractId: string;
  readonly assertionId: string;
  readonly status: PlatformAssertionStatus;
  readonly actualOwner: string;
}

export interface PrivatePlatformEvidenceExecutionV1 {
  readonly contractId: string;
  readonly evidenceId: string;
  readonly sha256: string;
  readonly actualOwner: string;
}

export interface PrivatePlatformRunnerResultV1 {
  readonly registeredOwners: readonly string[];
  readonly assertions: readonly PrivatePlatformAssertionExecutionV1[];
  readonly evidence: readonly PrivatePlatformEvidenceExecutionV1[];
}

export interface PlatformContractSummaryV1 {
  readonly contractId: string;
  readonly passedAssertionMarkers: readonly PlatformPassedAssertionMarkerV1[];
  readonly contractEvidenceHashes: readonly PlatformContractEvidenceHashV1[];
}

interface PendingAssertion {
  readonly contractId: string;
  readonly assertionId: string;
  readonly status: PlatformAssertionStatus;
}

interface PendingEvidence {
  readonly contractId: string;
  readonly evidenceId: string;
  readonly sha256: string;
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const ENTRY_KEY_SEPARATOR = '\u0000';

interface ExpectedBatchContract {
  readonly binding: PlatformCaseBindingV1<string>;
  readonly requiredAssertionIds: readonly string[];
  readonly requiredEvidenceIds: readonly string[];
  readonly assertionOwnerById: ReadonlyMap<string, string>;
  readonly evidenceOwnerById: ReadonlyMap<string, string>;
  readonly passedAssertionMarkers: PlatformPassedAssertionMarkerV1[];
  readonly contractEvidenceHashes: PlatformContractEvidenceHashV1[];
}

function sortStrings(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function sortedUnique(values: readonly string[]): string[] {
  return sortStrings([...new Set(values)]);
}

function sortedUniqueStrict(
  values: readonly string[],
  label: string,
): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(`${label} entries must be non-empty strings`);
    }
    if (seen.has(value)) {
      throw new Error(`duplicate ${label} entry ${value}`);
    }
    seen.add(value);
  }
  return sortStrings([...seen]);
}

function assertDeepExactStrings(
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

function resultEntryKey(contractId: string, entryId: string): string {
  return `${contractId}${ENTRY_KEY_SEPARATOR}${entryId}`;
}

function singleMarkerOwner(
  markerOwners: readonly PlatformAssertionMarkerOwnerV1<string>[],
  contractId: string,
  assertionId: string,
): PlatformAssertionMarkerOwnerV1<string> {
  const owners = markerOwners.filter(
    (owner) =>
      owner.contractId === contractId && owner.assertionId === assertionId,
  );
  if (owners.length !== 1) {
    throw new Error(
      `expected one marker owner for ${contractId}/${assertionId}, got ${owners.length}`,
    );
  }
  const owner = owners[0];
  if (owner === undefined) {
    throw new Error(`missing marker owner for ${contractId}/${assertionId}`);
  }
  return owner;
}

function singleEvidenceOwner(
  evidenceOwners: readonly PlatformEvidenceHashOwnerV1<string>[],
  contractId: string,
  evidenceId: string,
): PlatformEvidenceHashOwnerV1<string> {
  const owners = evidenceOwners.filter(
    (owner) =>
      owner.contractId === contractId && owner.evidenceId === evidenceId,
  );
  if (owners.length !== 1) {
    throw new Error(
      `expected one evidence owner for ${contractId}/${evidenceId}, got ${owners.length}`,
    );
  }
  const owner = owners[0];
  if (owner === undefined) {
    throw new Error(`missing evidence owner for ${contractId}/${evidenceId}`);
  }
  return owner;
}

function buildExpectedBatchContracts(input: {
  readonly bindings: readonly PlatformCaseBindingV1<string>[];
  readonly markerOwners: readonly PlatformAssertionMarkerOwnerV1<string>[];
  readonly evidenceOwners: readonly PlatformEvidenceHashOwnerV1<string>[];
}): {
  readonly contracts: ReadonlyMap<string, ExpectedBatchContract>;
  readonly expectedOwners: readonly string[];
} {
  const contracts = new Map<string, ExpectedBatchContract>();
  const expectedOwnerUnion: string[] = [];

  for (const binding of input.bindings) {
    if (contracts.has(binding.contractId)) {
      throw new Error(`duplicate binding contractId ${binding.contractId}`);
    }
    const requiredAssertionIds = sortedUniqueStrict(
      binding.requiredAssertionIds,
      `requiredAssertionIds(${binding.contractId})`,
    );
    const requiredEvidenceIds = sortedUniqueStrict(
      binding.requiredEvidenceHashIds,
      `requiredEvidenceHashIds(${binding.contractId})`,
    );
    const assertionOwnerById = new Map<string, string>();
    const evidenceOwnerById = new Map<string, string>();
    expectedOwnerUnion.push(binding.assertionOwner);

    for (const assertionId of requiredAssertionIds) {
      const owner = singleMarkerOwner(
        input.markerOwners,
        binding.contractId,
        assertionId,
      );
      assertionOwnerById.set(assertionId, owner.assertionOwner);
      expectedOwnerUnion.push(owner.assertionOwner);
    }

    for (const evidenceId of requiredEvidenceIds) {
      const owner = singleEvidenceOwner(
        input.evidenceOwners,
        binding.contractId,
        evidenceId,
      );
      evidenceOwnerById.set(evidenceId, owner.evidenceOwner);
      expectedOwnerUnion.push(owner.evidenceOwner);
    }

    contracts.set(binding.contractId, {
      binding,
      requiredAssertionIds,
      requiredEvidenceIds,
      assertionOwnerById,
      evidenceOwnerById,
      passedAssertionMarkers: [],
      contractEvidenceHashes: [],
    });
  }

  for (const owner of input.markerOwners) {
    const contract = contracts.get(owner.contractId);
    if (
      contract !== undefined &&
      !contract.requiredAssertionIds.includes(owner.assertionId)
    ) {
      throw new Error(
        `unexpected marker owner ${owner.contractId}/${owner.assertionId}`,
      );
    }
  }
  for (const owner of input.evidenceOwners) {
    const contract = contracts.get(owner.contractId);
    if (
      contract !== undefined &&
      !contract.requiredEvidenceIds.includes(owner.evidenceId)
    ) {
      throw new Error(
        `unexpected evidence owner ${owner.contractId}/${owner.evidenceId}`,
      );
    }
  }

  return {
    contracts,
    expectedOwners: sortedUnique(expectedOwnerUnion),
  };
}

const pendingAssertions: PendingAssertion[] = [];
const pendingEvidence: PendingEvidence[] = [];
const seenAssertionKeys = new Set<string>();
const seenEvidenceKeys = new Set<string>();
const boundAssertions: PrivatePlatformAssertionExecutionV1[] = [];
const boundEvidence: PrivatePlatformEvidenceExecutionV1[] = [];

/**
 * Clears in-memory platform attestation state for a runner process.
 */
export function resetPlatformContractAttestationState(): void {
  pendingAssertions.length = 0;
  pendingEvidence.length = 0;
  seenAssertionKeys.clear();
  seenEvidenceKeys.clear();
  boundAssertions.length = 0;
  boundEvidence.length = 0;
}

/**
 * Records a namespaced assertion marker. Does not accept an owner path.
 */
export function recordPlatformAssertionMarker(
  contractId: string,
  assertionId: string,
  status: PlatformAssertionStatus = 'passed',
): void {
  const key = platformAssertionMarkerKey(contractId, assertionId);
  if (seenAssertionKeys.has(key)) {
    throw new Error(`duplicate platform assertion marker ${key}`);
  }
  seenAssertionKeys.add(key);
  pendingAssertions.push({ contractId, assertionId, status });
}

/**
 * Records a namespaced evidence hash. Does not accept an owner path.
 */
export function recordPlatformContractEvidenceHash(
  contractId: string,
  evidenceId: string,
  sha256: string,
): void {
  if (!SHA256_PATTERN.test(sha256)) {
    throw new Error(
      `evidence hash must be 64 lowercase hex for ${contractId}/${evidenceId}`,
    );
  }
  const key = platformEvidenceHashKey(contractId, evidenceId);
  if (seenEvidenceKeys.has(key)) {
    throw new Error(`duplicate platform evidence ${key}`);
  }
  seenEvidenceKeys.add(key);
  pendingEvidence.push({ contractId, evidenceId, sha256 });
}

/**
 * Vitest `it` wrapper that emits a passed marker after the body succeeds.
 */
export function platformContractIt(
  contractId: string,
  assertionId: string,
  title: string,
  test: () => void | Promise<void>,
  timeout?: number,
): void {
  const run = async (): Promise<void> => {
    await test();
    recordPlatformAssertionMarker(contractId, assertionId, 'passed');
  };
  if (timeout === undefined) {
    it(title, run);
  } else {
    it(title, { timeout }, run);
  }
}

/**
 * Reporter binds pending markers/hashes to the actual task file owner.
 */
export function bindPendingPlatformAttestations(actualOwner: string): void {
  if (actualOwner.length === 0) {
    throw new Error('actualOwner must be non-empty');
  }
  while (pendingAssertions.length > 0) {
    const entry = pendingAssertions.shift();
    if (entry === undefined) break;
    boundAssertions.push({
      contractId: entry.contractId,
      assertionId: entry.assertionId,
      status: entry.status,
      actualOwner,
    });
  }
  while (pendingEvidence.length > 0) {
    const entry = pendingEvidence.shift();
    if (entry === undefined) break;
    boundEvidence.push({
      contractId: entry.contractId,
      evidenceId: entry.evidenceId,
      sha256: entry.sha256,
      actualOwner,
    });
  }
}

/**
 * Builds the private runner result after reporter owner binding.
 */
export function buildPrivatePlatformRunnerResult(
  registeredOwners: readonly string[],
): PrivatePlatformRunnerResultV1 {
  if (pendingAssertions.length > 0 || pendingEvidence.length > 0) {
    throw new Error(
      'unbound platform attestations remain; reporter must bind owners',
    );
  }
  return {
    registeredOwners: [...registeredOwners],
    assertions: [...boundAssertions],
    evidence: [...boundEvidence],
  };
}

export function validatePlatformBatchResult(input: {
  readonly bindings: readonly PlatformCaseBindingV1<string>[];
  readonly privateResult: PrivatePlatformRunnerResultV1;
  readonly markerOwners: readonly PlatformAssertionMarkerOwnerV1<string>[];
  readonly evidenceOwners: readonly PlatformEvidenceHashOwnerV1<string>[];
}): readonly PlatformContractSummaryV1[] {
  const expected = buildExpectedBatchContracts(input);
  assertDeepExactStrings(
    sortedUniqueStrict(
      input.privateResult.registeredOwners,
      'registeredOwners',
    ),
    expected.expectedOwners,
    'registeredOwners',
  );

  const seenMarkers = new Set<string>();
  for (const entry of input.privateResult.assertions) {
    if (entry.status !== 'passed') {
      throw new Error(
        `non-passed marker ${entry.contractId}/${entry.assertionId} status=${entry.status}`,
      );
    }
    const contract = expected.contracts.get(entry.contractId);
    if (contract === undefined) {
      throw new Error(`undeclared marker contract ${entry.contractId}`);
    }
    const declaredOwner = contract.assertionOwnerById.get(entry.assertionId);
    if (declaredOwner === undefined) {
      throw new Error(
        `undeclared marker ${entry.contractId}/${entry.assertionId}`,
      );
    }
    if (entry.actualOwner !== declaredOwner) {
      throw new Error(
        `actualOwner mismatch for ${entry.contractId}/${entry.assertionId}: declared ${declaredOwner} actual ${entry.actualOwner}`,
      );
    }
    const key = resultEntryKey(entry.contractId, entry.assertionId);
    if (seenMarkers.has(key)) {
      throw new Error(`duplicate platform assertion marker ${key}`);
    }
    seenMarkers.add(key);
    contract.passedAssertionMarkers.push({
      contractId: entry.contractId,
      assertionId: entry.assertionId,
    });
  }

  const seenEvidence = new Set<string>();
  for (const entry of input.privateResult.evidence) {
    const contract = expected.contracts.get(entry.contractId);
    if (contract === undefined) {
      throw new Error(`undeclared evidence contract ${entry.contractId}`);
    }
    const declaredOwner = contract.evidenceOwnerById.get(entry.evidenceId);
    if (declaredOwner === undefined) {
      throw new Error(
        `undeclared evidence ${entry.contractId}/${entry.evidenceId}`,
      );
    }
    if (entry.actualOwner !== declaredOwner) {
      throw new Error(
        `evidence actualOwner mismatch for ${entry.contractId}/${entry.evidenceId}: declared ${declaredOwner} actual ${entry.actualOwner}`,
      );
    }
    if (!SHA256_PATTERN.test(entry.sha256)) {
      throw new Error(
        `invalid evidence hash for ${entry.contractId}/${entry.evidenceId}`,
      );
    }
    const key = resultEntryKey(entry.contractId, entry.evidenceId);
    if (seenEvidence.has(key)) {
      throw new Error(`duplicate platform evidence ${key}`);
    }
    seenEvidence.add(key);
    contract.contractEvidenceHashes.push({
      contractId: entry.contractId,
      evidenceId: entry.evidenceId,
      sha256: entry.sha256,
    });
  }

  return [...expected.contracts.values()]
    .sort((left, right) =>
      left.binding.contractId.localeCompare(right.binding.contractId),
    )
    .map((contract) => {
      assertDeepExactStrings(
        sortStrings(
          contract.passedAssertionMarkers.map((entry) => entry.assertionId),
        ),
        contract.requiredAssertionIds,
        `passedAssertionIds(${contract.binding.contractId})`,
      );
      assertDeepExactStrings(
        sortStrings(
          contract.contractEvidenceHashes.map((entry) => entry.evidenceId),
        ),
        contract.requiredEvidenceIds,
        `evidenceIds(${contract.binding.contractId})`,
      );
      return {
        contractId: contract.binding.contractId,
        passedAssertionMarkers: [...contract.passedAssertionMarkers].sort(
          (left, right) => left.assertionId.localeCompare(right.assertionId),
        ),
        contractEvidenceHashes: [...contract.contractEvidenceHashes].sort(
          (left, right) => left.evidenceId.localeCompare(right.evidenceId),
        ),
      };
    });
}
