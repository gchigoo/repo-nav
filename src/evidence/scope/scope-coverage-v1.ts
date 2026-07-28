import { z } from 'zod';

import type { RepoLayer } from '../../contracts/index.js';
import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import { createOpaqueTokenV2 } from '../request-snapshot/opaque-token-v2.js';
import type { ScopeFoldedSafePoolProofV2 } from '../request-snapshot/scope-folded-discovery-selector-v2.js';
import {
  requireScopeCoverageBasisV2,
  type ScopeCoverageBasisV2,
} from '../request-snapshot/scope-coverage-basis-v2.js';
import type {
  SnapshotTrustProofV2,
  TrustedStableEligibleDiscoveryPoolV2,
} from '../request-snapshot/final-snapshot-check-v2.js';
import {
  readStableEligibleMatchedLayersV2,
  requireStableEligibleScopeViewV2,
} from '../request-snapshot/scope-classification-views-v2.js';
import {
  unmatchedLayersFromMatchedV1,
  type ResolvedRepositoryScopeV1,
} from './resolve-repository-scope-v1.js';

type DeepReadonlyScopeV1<T> =
  T extends readonly unknown[]
    ? { readonly [K in keyof T]: DeepReadonlyScopeV1<T[K]> }
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonlyScopeV1<T[K]> }
      : T;

export const ScopeOutcomeContributionV2Schema = z
  .object({
    owner: z.literal('scope'),
    outsideLayerHintCount: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER),
  })
  .strict();

export type ScopeOutcomeContributionV2 = DeepReadonlyScopeV1<
  z.output<typeof ScopeOutcomeContributionV2Schema>
>;

export interface ScopeCoverageFragmentV1 {
  readonly owner: 'scope';
  readonly value: {
    readonly requested: readonly RepoLayer[];
    readonly effective: readonly RepoLayer[];
    readonly policyVersion: 'repo-scope-v1';
    readonly unmatchedLayers: readonly RepoLayer[];
  };
}

declare const SCOPE_COVERAGE_PROOF_V1: unique symbol;
export type ScopeCoverageProofV1 = Readonly<object> & {
  readonly [SCOPE_COVERAGE_PROOF_V1]: never;
};

declare const SCOPE_COVERAGE_FACTS_V1: unique symbol;
export type ScopeCoverageFactsV1 = Readonly<object> & {
  readonly [SCOPE_COVERAGE_FACTS_V1]: never;
};

export interface ScopeCoverageFactsViewV1 {
  readonly fragment: ScopeCoverageFragmentV1;
  readonly contribution: ScopeOutcomeContributionV2;
  readonly proof: ScopeCoverageProofV1;
}

interface CoverageFactsPrivateV1 {
  readonly fragment: ScopeCoverageFragmentV1;
  readonly contribution: ScopeOutcomeContributionV2;
  readonly proof: ScopeCoverageProofV1;
  readonly eligiblePool: TrustedStableEligibleDiscoveryPoolV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly foldProof: ScopeFoldedSafePoolProofV2;
  readonly coverageBasis: ScopeCoverageBasisV2;
  readonly resolvedScope: ResolvedRepositoryScopeV1;
  readonly execution: LocateExecutionTokenV2;
  readonly matchedLayers: ReadonlySet<RepoLayer>;
}

const factsPrivate = new WeakMap<ScopeCoverageFactsV1, CoverageFactsPrivateV1>();
const contributionPrivate = new WeakMap<
  ScopeOutcomeContributionV2,
  CoverageFactsPrivateV1
>();

export class ScopeCoverageInvariantError extends Error {
  public readonly code = 'SCOPE_COVERAGE_INVARIANT' as const;
  public constructor() {
    super('SCOPE_COVERAGE_INVARIANT');
    this.name = 'ScopeCoverageInvariantError';
  }
}

function failClosed(): never {
  throw new ScopeCoverageInvariantError();
}

/**
 * 从 post-final stable eligible view + F3 coverage basis 签 opaque scope facts。
 * matched 只从 same-proof stable view 推导，不接受 caller matchedLayers。
 */
export function buildScopeCoverageV1(
  eligiblePool: TrustedStableEligibleDiscoveryPoolV2,
  snapshotProof: SnapshotTrustProofV2,
  foldProof: ScopeFoldedSafePoolProofV2,
  coverageBasis: ScopeCoverageBasisV2,
  resolvedScope: ResolvedRepositoryScopeV1,
  execution: LocateExecutionTokenV2,
): ScopeCoverageFactsV1 {
  const stableView = requireStableEligibleScopeViewV2(
    eligiblePool,
    snapshotProof,
    foldProof,
    execution,
  );
  const matched = readStableEligibleMatchedLayersV2(stableView, execution);
  const basisView = requireScopeCoverageBasisV2(
    coverageBasis,
    eligiblePool,
    snapshotProof,
    foldProof,
    execution,
  );
  const unmatchedLayers = unmatchedLayersFromMatchedV1(
    resolvedScope.effective,
    matched,
  );
  const fragment: ScopeCoverageFragmentV1 = Object.freeze({
    owner: 'scope' as const,
    value: Object.freeze({
      requested: resolvedScope.requested,
      effective: resolvedScope.effective,
      policyVersion: 'repo-scope-v1' as const,
      unmatchedLayers,
    }),
  });
  const contribution = Object.freeze(
    ScopeOutcomeContributionV2Schema.parse({
      owner: 'scope',
      outsideLayerHintCount: basisView.outsideLayerHintCount,
    }),
  ) as ScopeOutcomeContributionV2;
  const proof = createOpaqueTokenV2<ScopeCoverageProofV1>();
  const facts = createOpaqueTokenV2<ScopeCoverageFactsV1>();
  const privateRecord: CoverageFactsPrivateV1 = Object.freeze({
    fragment,
    contribution,
    proof,
    eligiblePool,
    snapshotProof,
    foldProof,
    coverageBasis,
    resolvedScope,
    execution,
    matchedLayers: matched,
  });
  factsPrivate.set(facts, privateRecord);
  contributionPrivate.set(contribution, privateRecord);
  return facts;
}

function validateCoverageBindingV1(
  privateRecord: CoverageFactsPrivateV1 | undefined,
  expectedEligiblePool: TrustedStableEligibleDiscoveryPoolV2,
  expectedSnapshotProof: SnapshotTrustProofV2,
  expectedFoldProof: ScopeFoldedSafePoolProofV2,
  expectedCoverageBasis: ScopeCoverageBasisV2,
  expectedResolvedScope: ResolvedRepositoryScopeV1,
  expectedExecution: LocateExecutionTokenV2,
): CoverageFactsPrivateV1 {
  if (
    privateRecord === undefined ||
    privateRecord.execution !== expectedExecution ||
    privateRecord.eligiblePool !== expectedEligiblePool ||
    privateRecord.snapshotProof !== expectedSnapshotProof ||
    privateRecord.foldProof !== expectedFoldProof ||
    privateRecord.coverageBasis !== expectedCoverageBasis ||
    privateRecord.resolvedScope !== expectedResolvedScope
  ) {
    return failClosed();
  }
  requireScopeCoverageBasisV2(
    privateRecord.coverageBasis,
    expectedEligiblePool,
    expectedSnapshotProof,
    expectedFoldProof,
    expectedExecution,
  );
  ScopeOutcomeContributionV2Schema.parse(privateRecord.contribution);
  return privateRecord;
}

export function requireScopeCoverageFactsV1(
  facts: ScopeCoverageFactsV1,
  expectedEligiblePool: TrustedStableEligibleDiscoveryPoolV2,
  expectedSnapshotProof: SnapshotTrustProofV2,
  expectedFoldProof: ScopeFoldedSafePoolProofV2,
  expectedCoverageBasis: ScopeCoverageBasisV2,
  expectedResolvedScope: ResolvedRepositoryScopeV1,
  expectedExecution: LocateExecutionTokenV2,
): ScopeCoverageFactsViewV1 {
  const privateRecord = validateCoverageBindingV1(
    factsPrivate.get(facts),
    expectedEligiblePool,
    expectedSnapshotProof,
    expectedFoldProof,
    expectedCoverageBasis,
    expectedResolvedScope,
    expectedExecution,
  );
  return Object.freeze({
    fragment: privateRecord.fragment,
    contribution: privateRecord.contribution,
    proof: privateRecord.proof,
  });
}

export function requireScopeOutcomeContributionV2(
  contribution: ScopeOutcomeContributionV2,
  proof: ScopeCoverageProofV1,
  expectedEligiblePool: TrustedStableEligibleDiscoveryPoolV2,
  expectedSnapshotProof: SnapshotTrustProofV2,
  expectedFoldProof: ScopeFoldedSafePoolProofV2,
  expectedCoverageBasis: ScopeCoverageBasisV2,
  expectedResolvedScope: ResolvedRepositoryScopeV1,
  expectedExecution: LocateExecutionTokenV2,
): ScopeOutcomeContributionV2 {
  const privateRecord = validateCoverageBindingV1(
    contributionPrivate.get(contribution),
    expectedEligiblePool,
    expectedSnapshotProof,
    expectedFoldProof,
    expectedCoverageBasis,
    expectedResolvedScope,
    expectedExecution,
  );
  if (privateRecord.proof !== proof) {
    return failClosed();
  }
  return privateRecord.contribution;
}
