/**
 * F8 CapabilityCoverage owner：pre-budget count、retained seal、facts/contribution/proof。
 */

import { z } from 'zod';

import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { CoverageReportV2 } from '../../contracts/v2/locate-result-v2.js';
import type { EvidenceRankingOutcomeV2 } from '../ranking/evidence-ranking-outcome-v2.js';
import { requireEvidenceRankingRetainedDecisionViewV2 } from '../ranking/evidence-ranking-retained-decision-view-v2.js';
import type {
  SnapshotTrustProofV2,
  TrustedStableEligibleDiscoveryPoolV2,
} from '../request-snapshot/final-snapshot-check-v2.js';
import type { ScopeFoldedSafePoolProofV2 } from '../request-snapshot/scope-folded-discovery-selector-v2.js';
import type { EligibleDiscoveryRefV2 } from '../request-snapshot/pre-ranking-evidence-pool-v2.js';
import { createOpaqueTokenV2 } from '../request-snapshot/opaque-token-v2.js';
import type { TrustedStableEligibleCapabilityViewV2 } from '../request-snapshot/capability-classification-views-v2.js';
import type { TrustedStableEligibleScopeViewV2 } from '../request-snapshot/scope-classification-views-v2.js';
import type { ScopeCoverageProofV1 } from '../scope/scope-coverage-v1.js';
import { requireStableScopeDecisionV1 } from '../scope/scope-decision-accessors-v1.js';
import { SEMANTIC_CLASSIFICATION_ORDER_V2 } from './language-adapter-kinds-v2.js';
import {
  readLanguageAdapterDecisionV2,
  type TrustedLanguageCapabilityObservationV2,
} from './language-capability-observation-v2.js';

type CapabilityCoverage = CoverageReportV2['capabilities'];

export const CapabilityOutcomeContributionV2Schema = z
  .object({
    owner: z.literal('capability'),
    unsupportedLanguageHits: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER),
  })
  .strict();

type DeepReadonlyCapabilityV2<T> = T extends readonly unknown[]
  ? { readonly [K in keyof T]: DeepReadonlyCapabilityV2<T[K]> }
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonlyCapabilityV2<T[K]> }
    : T;

export type CapabilityOutcomeContributionV2 = DeepReadonlyCapabilityV2<
  z.output<typeof CapabilityOutcomeContributionV2Schema>
>;

declare const CAPABILITY_COVERAGE_FACTS_V2: unique symbol;
export type CapabilityCoverageFactsV2 = Readonly<object> & {
  readonly [CAPABILITY_COVERAGE_FACTS_V2]: never;
};

declare const CAPABILITY_PRE_BUDGET_COUNT_V2: unique symbol;
export type CapabilityPreBudgetCountV2 = Readonly<object> & {
  readonly [CAPABILITY_PRE_BUDGET_COUNT_V2]: never;
};

declare const CAPABILITY_RETAINED_DECISION_SEAL_V2: unique symbol;
export type CapabilityRetainedDecisionSealV2 = Readonly<object> & {
  readonly [CAPABILITY_RETAINED_DECISION_SEAL_V2]: never;
};

declare const CAPABILITY_COVERAGE_PROOF_V2: unique symbol;
export type CapabilityCoverageProofV2 = Readonly<object> & {
  readonly [CAPABILITY_COVERAGE_PROOF_V2]: never;
};

export interface CapabilityPreBudgetCountViewV2 {
  readonly unsupportedLanguageHits: number;
}

export interface CapabilityCoverageFactsViewV2 {
  readonly semanticClassification: typeof SEMANTIC_CLASSIFICATION_ORDER_V2;
  readonly unsupportedLanguageHits: number;
  readonly fragment: Readonly<{
    owner: 'capability';
    value: CapabilityCoverage;
  }>;
  readonly contribution: CapabilityOutcomeContributionV2;
  readonly proof: CapabilityCoverageProofV2;
}

interface PreBudgetPrivateV2 {
  readonly observation: TrustedLanguageCapabilityObservationV2;
  readonly stableCapabilityView: TrustedStableEligibleCapabilityViewV2;
  readonly stableScopeView: TrustedStableEligibleScopeViewV2;
  readonly eligiblePool: TrustedStableEligibleDiscoveryPoolV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly foldProof: ScopeFoldedSafePoolProofV2;
  readonly scopeProof: ScopeCoverageProofV1;
  readonly execution: LocateExecutionTokenV2;
  readonly unsupportedRefs: ReadonlySet<EligibleDiscoveryRefV2>;
  readonly unsupportedLanguageHits: number;
}

interface SealPrivateV2 {
  readonly preBudgetCount: CapabilityPreBudgetCountV2;
  readonly rankingOutcome: EvidenceRankingOutcomeV2 | undefined;
  readonly observation: TrustedLanguageCapabilityObservationV2;
  readonly eligiblePool: TrustedStableEligibleDiscoveryPoolV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly foldProof: ScopeFoldedSafePoolProofV2;
  readonly scopeProof: ScopeCoverageProofV1;
  readonly execution: LocateExecutionTokenV2;
}

interface FactsPrivateV2 {
  readonly preBudgetCount: CapabilityPreBudgetCountV2;
  readonly retainedDecisionSeal: CapabilityRetainedDecisionSealV2;
  readonly observation: TrustedLanguageCapabilityObservationV2;
  readonly eligiblePool: TrustedStableEligibleDiscoveryPoolV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly foldProof: ScopeFoldedSafePoolProofV2;
  readonly scopeProof: ScopeCoverageProofV1;
  readonly execution: LocateExecutionTokenV2;
  readonly fragment: CapabilityCoverage;
  readonly contribution: CapabilityOutcomeContributionV2;
  readonly proof: CapabilityCoverageProofV2;
}

const preBudgetPrivate = new WeakMap<
  CapabilityPreBudgetCountV2,
  PreBudgetPrivateV2
>();
const sealPrivate = new WeakMap<
  CapabilityRetainedDecisionSealV2,
  SealPrivateV2
>();
const factsPrivate = new WeakMap<CapabilityCoverageFactsV2, FactsPrivateV2>();

export function createCapabilityPreBudgetCountV2(
  observation: TrustedLanguageCapabilityObservationV2,
  stableCapabilityView: TrustedStableEligibleCapabilityViewV2,
  stableScopeView: TrustedStableEligibleScopeViewV2,
  eligiblePool: TrustedStableEligibleDiscoveryPoolV2,
  snapshotProof: SnapshotTrustProofV2,
  foldProof: ScopeFoldedSafePoolProofV2,
  scopeProof: ScopeCoverageProofV1,
  execution: LocateExecutionTokenV2,
): CapabilityPreBudgetCountV2 {
  if (
    stableCapabilityView.pool !== eligiblePool ||
    stableCapabilityView.proof !== snapshotProof
  ) {
    throw new TypeError('stable capability pool proof mismatch');
  }
  void stableScopeView;
  const unsupported = new Set<EligibleDiscoveryRefV2>();
  for (const record of stableCapabilityView.records()) {
    const scopeDecision = requireStableScopeDecisionV1(
      stableScopeView,
      record.eligibleRef,
      snapshotProof,
      execution,
    );
    if (!scopeDecision.included) {
      continue;
    }
    const decision = readLanguageAdapterDecisionV2(
      observation,
      record.eligibleRef,
      execution,
    );
    if (decision.adapter === 'fallback') {
      unsupported.add(record.eligibleRef);
    }
  }
  const token = createOpaqueTokenV2<CapabilityPreBudgetCountV2>();
  preBudgetPrivate.set(
    token,
    Object.freeze({
      observation,
      stableCapabilityView,
      stableScopeView,
      eligiblePool,
      snapshotProof,
      foldProof,
      scopeProof,
      execution,
      unsupportedRefs: unsupported,
      unsupportedLanguageHits: unsupported.size,
    }),
  );
  return token;
}

export function requireCapabilityPreBudgetCountV2(
  count: CapabilityPreBudgetCountV2,
  expectedObservation: TrustedLanguageCapabilityObservationV2,
  expectedStableCapabilityView: TrustedStableEligibleCapabilityViewV2,
  expectedStableScopeView: TrustedStableEligibleScopeViewV2,
  expectedEligiblePool: TrustedStableEligibleDiscoveryPoolV2,
  expectedSnapshotProof: SnapshotTrustProofV2,
  expectedFoldProof: ScopeFoldedSafePoolProofV2,
  expectedScopeProof: ScopeCoverageProofV1,
  expectedExecution: LocateExecutionTokenV2,
): CapabilityPreBudgetCountViewV2 {
  const record = preBudgetPrivate.get(count);
  if (
    record === undefined ||
    record.observation !== expectedObservation ||
    record.stableCapabilityView !== expectedStableCapabilityView ||
    record.stableScopeView !== expectedStableScopeView ||
    record.eligiblePool !== expectedEligiblePool ||
    record.snapshotProof !== expectedSnapshotProof ||
    record.foldProof !== expectedFoldProof ||
    record.scopeProof !== expectedScopeProof ||
    record.execution !== expectedExecution
  ) {
    throw new TypeError('capability pre-budget count untrusted');
  }
  return Object.freeze({
    unsupportedLanguageHits: record.unsupportedLanguageHits,
  });
}

export function sealCapabilityRetainedDecisionsV2(
  preBudgetCount: CapabilityPreBudgetCountV2,
  rankingOutcome: EvidenceRankingOutcomeV2 | undefined,
  observation: TrustedLanguageCapabilityObservationV2,
  eligiblePool: TrustedStableEligibleDiscoveryPoolV2,
  snapshotProof: SnapshotTrustProofV2,
  foldProof: ScopeFoldedSafePoolProofV2,
  scopeProof: ScopeCoverageProofV1,
  execution: LocateExecutionTokenV2,
): CapabilityRetainedDecisionSealV2 {
  const countPrivate = preBudgetPrivate.get(preBudgetCount);
  if (
    countPrivate === undefined ||
    countPrivate.observation !== observation ||
    countPrivate.eligiblePool !== eligiblePool ||
    countPrivate.execution !== execution
  ) {
    throw new TypeError('pre-budget count mismatch for retained seal');
  }
  if (rankingOutcome === undefined) {
    if (countPrivate.stableCapabilityView.records().length !== 0) {
      throw new TypeError('nonempty capability decisions require ranking');
    }
  } else {
    requireEvidenceRankingRetainedDecisionViewV2(
      rankingOutcome,
      snapshotProof,
      execution,
    );
  }
  const seal = createOpaqueTokenV2<CapabilityRetainedDecisionSealV2>();
  sealPrivate.set(
    seal,
    Object.freeze({
      preBudgetCount,
      rankingOutcome,
      observation,
      eligiblePool,
      snapshotProof,
      foldProof,
      scopeProof,
      execution,
    }),
  );
  return seal;
}

export function buildCapabilityCoverageV2(
  preBudgetCount: CapabilityPreBudgetCountV2,
  retainedDecisionSeal: CapabilityRetainedDecisionSealV2,
  observation: TrustedLanguageCapabilityObservationV2,
  eligiblePool: TrustedStableEligibleDiscoveryPoolV2,
  snapshotProof: SnapshotTrustProofV2,
  foldProof: ScopeFoldedSafePoolProofV2,
  scopeProof: ScopeCoverageProofV1,
  execution: LocateExecutionTokenV2,
): CapabilityCoverageFactsV2 {
  const countPrivate = preBudgetPrivate.get(preBudgetCount);
  const seal = sealPrivate.get(retainedDecisionSeal);
  if (
    countPrivate === undefined ||
    seal === undefined ||
    seal.preBudgetCount !== preBudgetCount ||
    seal.observation !== observation ||
    seal.eligiblePool !== eligiblePool ||
    seal.execution !== execution
  ) {
    throw new TypeError('capability coverage build inputs untrusted');
  }
  const unsupportedLanguageHits = countPrivate.unsupportedLanguageHits;
  const fragment = Object.freeze({
    semanticClassification: SEMANTIC_CLASSIFICATION_ORDER_V2,
    unsupportedLanguageHits,
  }) as CapabilityCoverage;
  const contribution = CapabilityOutcomeContributionV2Schema.parse({
    owner: 'capability',
    unsupportedLanguageHits,
  }) as CapabilityOutcomeContributionV2;
  const proof = createOpaqueTokenV2<CapabilityCoverageProofV2>();
  const facts = createOpaqueTokenV2<CapabilityCoverageFactsV2>();
  factsPrivate.set(
    facts,
    Object.freeze({
      preBudgetCount,
      retainedDecisionSeal,
      observation,
      eligiblePool,
      snapshotProof,
      foldProof,
      scopeProof,
      execution,
      fragment,
      contribution,
      proof,
    }),
  );
  return facts;
}

export function requireCapabilityCoverageFactsV2(
  facts: CapabilityCoverageFactsV2,
  expectedPreBudgetCount: CapabilityPreBudgetCountV2,
  expectedRetainedDecisionSeal: CapabilityRetainedDecisionSealV2,
  expectedObservation: TrustedLanguageCapabilityObservationV2,
  expectedEligiblePool: TrustedStableEligibleDiscoveryPoolV2,
  expectedSnapshotProof: SnapshotTrustProofV2,
  expectedFoldProof: ScopeFoldedSafePoolProofV2,
  expectedScopeProof: ScopeCoverageProofV1,
  expectedExecution: LocateExecutionTokenV2,
): CapabilityCoverageFactsViewV2 {
  const record = factsPrivate.get(facts);
  if (
    record === undefined ||
    record.preBudgetCount !== expectedPreBudgetCount ||
    record.retainedDecisionSeal !== expectedRetainedDecisionSeal ||
    record.observation !== expectedObservation ||
    record.eligiblePool !== expectedEligiblePool ||
    record.snapshotProof !== expectedSnapshotProof ||
    record.foldProof !== expectedFoldProof ||
    record.scopeProof !== expectedScopeProof ||
    record.execution !== expectedExecution
  ) {
    throw new TypeError('invalid-facts');
  }
  const seal = sealPrivate.get(expectedRetainedDecisionSeal);
  if (seal === undefined || seal.execution !== expectedExecution) {
    throw new TypeError('invalid-facts');
  }
  if (
    record.fragment.semanticClassification.length !==
      SEMANTIC_CLASSIFICATION_ORDER_V2.length ||
    SEMANTIC_CLASSIFICATION_ORDER_V2.some(
      (language, index) =>
        record.fragment.semanticClassification[index] !== language,
    )
  ) {
    throw new TypeError('invalid-facts');
  }
  return Object.freeze({
    semanticClassification: SEMANTIC_CLASSIFICATION_ORDER_V2,
    unsupportedLanguageHits: record.fragment.unsupportedLanguageHits,
    fragment: Object.freeze({
      owner: 'capability' as const,
      value: record.fragment,
    }),
    contribution: record.contribution,
    proof: record.proof,
  });
}

export function requireCapabilityOutcomeContributionV2(
  facts: CapabilityCoverageFactsV2,
  expectedExecution: LocateExecutionTokenV2,
): CapabilityOutcomeContributionV2 {
  const record = factsPrivate.get(facts);
  if (record === undefined || record.execution !== expectedExecution) {
    throw new TypeError('capability contribution untrusted');
  }
  CapabilityOutcomeContributionV2Schema.parse(record.contribution);
  return record.contribution;
}

/**
 * Harness/F6 兼容：零 unsupported 的 capability contribution（无真实 observation）。
 */
export function createZeroCapabilityContributionForHarnessV2(
  execution: LocateExecutionTokenV2,
): Readonly<{
  contribution: CapabilityOutcomeContributionV2;
  facts: CapabilityCoverageFactsV2;
}> {
  const contribution = CapabilityOutcomeContributionV2Schema.parse({
    owner: 'capability',
    unsupportedLanguageHits: 0,
  }) as CapabilityOutcomeContributionV2;
  const facts = createOpaqueTokenV2<CapabilityCoverageFactsV2>();
  const proof = createOpaqueTokenV2<CapabilityCoverageProofV2>();
  factsPrivate.set(
    facts,
    Object.freeze({
      preBudgetCount: createOpaqueTokenV2<CapabilityPreBudgetCountV2>(),
      retainedDecisionSeal:
        createOpaqueTokenV2<CapabilityRetainedDecisionSealV2>(),
      observation:
        createOpaqueTokenV2<TrustedLanguageCapabilityObservationV2>(),
      eligiblePool: createOpaqueTokenV2<TrustedStableEligibleDiscoveryPoolV2>(),
      snapshotProof: createOpaqueTokenV2<SnapshotTrustProofV2>(),
      foldProof: createOpaqueTokenV2<ScopeFoldedSafePoolProofV2>(),
      scopeProof: createOpaqueTokenV2<ScopeCoverageProofV1>(),
      execution,
      fragment: Object.freeze({
        semanticClassification: SEMANTIC_CLASSIFICATION_ORDER_V2,
        unsupportedLanguageHits: 0,
      }) as CapabilityCoverage,
      contribution,
      proof,
    }),
  );
  return Object.freeze({ contribution, facts });
}
