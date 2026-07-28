import { it } from 'vitest';

import {
  platformAssertionMarkerKey,
  platformEvidenceHashKey,
} from '../contracts/platform-contract.js';

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
    it(title, run, timeout);
  }
}

/**
 * Reporter binds pending markers/hashes to the actual task file owner.
 */
export function bindPendingPlatformAttestations(
  actualOwner: string,
): void {
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
