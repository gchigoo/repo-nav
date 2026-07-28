/**
 * Production helper：observation → pre-budget count → retained seal → capability facts。
 */

import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { EvidenceRankingOutcomeV2 } from '../ranking/evidence-ranking-outcome-v2.js';
import { issueEvidenceRankingOutcomeV2 } from '../ranking/evidence-ranking-outcome-v2.js';
import {
  createTrustedPreFinalCapabilityViewForTestV2,
  requireStableEligibleCapabilityViewV2,
  type TrustedStableEligibleCapabilityRecordViewV2,
  type TrustedStableEligibleCapabilityViewV2,
} from '../request-snapshot/capability-classification-views-v2.js';
import type {
  SnapshotTrustProofV2,
  TrustedStableEligibleDiscoveryPoolV2,
} from '../request-snapshot/final-snapshot-check-v2.js';
import { runFinalSnapshotCheckV2 } from '../request-snapshot/final-snapshot-check-v2.js';
import type {
  EligibleDiscoveryRefV2,
  PreFinalEligibleDiscoveryPoolV2,
  PreFinalEligibleDiscoveryRecordV2,
} from '../request-snapshot/pre-ranking-evidence-pool-v2.js';
import type { ScopeFoldedSafePoolProofV2 } from '../request-snapshot/scope-folded-discovery-selector-v2.js';
import {
  createTrustedPreFinalScopeClassificationViewForTestV2,
  readStableEligibleScopeRecordsV2,
  requireStableEligibleScopeViewV2,
  type TrustedStableEligibleScopeViewV2,
} from '../request-snapshot/scope-classification-views-v2.js';
import {
  createVerifiedLanguageConsumerAdmissionV2,
  registerVerifiedLanguageConsumerV2,
} from '../request-snapshot/verified-language-consumer-v2.js';
import type { ScopeCoverageProofV1 } from '../scope/scope-coverage-v1.js';
import { createScopeBoundProducerCompositionRootV2 } from '../scope/scope-bound-classification-bridge-v2.js';
import {
  arbitrateScopeBoundEvidenceProducerV2,
  registerScopeBoundProducerSourceV2,
  sealScopeBoundProducerRecordSetV2,
} from '../scope/scope-bound-producer-registrar-v2.js';
import {
  createTrustedLanguageCapabilityObservationV2,
  type TrustedLanguageCapabilityObservationV2,
} from './language-capability-observation-v2.js';
import {
  buildCapabilityCoverageV2,
  createCapabilityPreBudgetCountV2,
  requireCapabilityCoverageFactsV2,
  sealCapabilityRetainedDecisionsV2,
  type CapabilityCoverageFactsV2,
  type CapabilityCoverageFactsViewV2,
  type CapabilityOutcomeContributionV2,
} from './capability-coverage-v2.js';
import {
  classifyLanguageCapabilityRecordV2,
  createLanguageAdapterScopeProducerResolverV2,
  issueLanguageAdapterPortAdmissionV2,
  registerLanguageAdapterProducerSourceV2,
  registerLanguageAdapterScopeProducerPortV2,
} from './language-scope-producer-v2.js';

export interface ExecutionCapabilityCoverageMountV2 {
  readonly view: CapabilityCoverageFactsViewV2;
  readonly facts: CapabilityCoverageFactsV2;
  readonly contribution: CapabilityOutcomeContributionV2;
  readonly observation: TrustedLanguageCapabilityObservationV2;
  readonly eligiblePool: TrustedStableEligibleDiscoveryPoolV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly foldProof: ScopeFoldedSafePoolProofV2;
  readonly fragmentValue: CapabilityCoverageFactsViewV2['fragment']['value'];
}

/**
 * discoveryKey → posix file；格式 `discovery:v1\\0file\\0...`。
 */
function posixFileFromDiscoveryKeyV2(discoveryKey: string): string | undefined {
  const parts = discoveryKey.split('\u0000');
  if (
    parts[0] === 'discovery:v1' &&
    parts[1] !== undefined &&
    parts[1].length > 0
  ) {
    return parts[1].replaceAll('\\', '/');
  }
  return undefined;
}

function posixFromEligibleRecordV2(
  record: PreFinalEligibleDiscoveryRecordV2,
): string {
  return (
    posixFileFromDiscoveryKeyV2(record.discoveryKey) ??
    String(record.canonicalFileKey).replaceAll('\\', '/')
  );
}

/**
 * 为 canonical success envelope 构建并校验 capability owner facts。
 * 同 execution 用 retained eligible ∩ stable scope included 建 observation，
 * 并对每条 ref 走 classify→language port→three-port seal。
 */
export async function buildExecutionCapabilityCoverageMountV2(input: {
  readonly execution: LocateExecutionTokenV2;
  readonly foldProof: ScopeFoldedSafePoolProofV2;
  readonly scopeProof: ScopeCoverageProofV1;
  readonly eligiblePool?: TrustedStableEligibleDiscoveryPoolV2;
  readonly snapshotProof?: SnapshotTrustProofV2;
  readonly rankingOutcome?: EvidenceRankingOutcomeV2;
  readonly retainedEligible?: readonly PreFinalEligibleDiscoveryRecordV2[];
  readonly matchedTermsByRef?: ReadonlyMap<
    EligibleDiscoveryRefV2,
    readonly string[]
  >;
  readonly sourceTextByRef?: ReadonlyMap<EligibleDiscoveryRefV2, string>;
}): Promise<ExecutionCapabilityCoverageMountV2> {
  let eligiblePool = input.eligiblePool;
  let snapshotProof = input.snapshotProof;
  if (eligiblePool === undefined || snapshotProof === undefined) {
    const registered = await runFinalSnapshotCheckV2({
      repositoryRoot: '/tmp/capability-execution-mount',
      loadedFiles: [],
      evidencePool: {
        records: [],
        preRankingPoolTruncated: false,
        safeSelectionCollision: false,
      },
      eligiblePool: { records: [] },
      gitState: 'unknown',
      signal: new AbortController().signal,
    });
    eligiblePool = registered.eligibleDiscovery;
    snapshotProof = registered.proof;
  }

  const stableScopeView: TrustedStableEligibleScopeViewV2 =
    requireStableEligibleScopeViewV2(
      eligiblePool,
      snapshotProof,
      input.foldProof,
      input.execution,
    );
  const stableScopeRecords = readStableEligibleScopeRecordsV2(
    stableScopeView,
    input.execution,
  );
  const retainedByRef = new Map<
    EligibleDiscoveryRefV2,
    PreFinalEligibleDiscoveryRecordV2
  >();
  for (const record of input.retainedEligible ?? []) {
    retainedByRef.set(record.eligibleRef, record);
  }

  // 仅 stable-included ∩ retained：observation 拒绝 excluded；count 需同 ref scope decision
  const includedRecords: PreFinalEligibleDiscoveryRecordV2[] = [];
  const scopeDecisions = new Map<
    EligibleDiscoveryRefV2,
    (typeof stableScopeRecords)[number]['decision']
  >();
  for (const scopeRecord of stableScopeRecords) {
    if (
      !scopeRecord.decision.included ||
      scopeRecord.decision.confirmation === 'excluded'
    ) {
      continue;
    }
    const retained = retainedByRef.get(scopeRecord.eligibleRef);
    if (retained === undefined) {
      continue;
    }
    includedRecords.push(retained);
    scopeDecisions.set(scopeRecord.eligibleRef, scopeRecord.decision);
  }

  const preFinalPool: PreFinalEligibleDiscoveryPoolV2 = Object.freeze({
    records: Object.freeze([...includedRecords]),
  });
  const capabilityEntries = includedRecords.map((record) =>
    Object.freeze({
      eligibleRef: record.eligibleRef,
      fileBucketRef: record.fileBucketRef,
      posixPath: posixFromEligibleRecordV2(record),
      sourceText: input.sourceTextByRef?.get(record.eligibleRef) ?? '',
    }),
  );
  const capabilityView = createTrustedPreFinalCapabilityViewForTestV2({
    pool: preFinalPool,
    execution: input.execution,
    entries: capabilityEntries,
  });
  const scopeView = createTrustedPreFinalScopeClassificationViewForTestV2(
    input.execution,
    scopeDecisions,
  );
  const admission = createVerifiedLanguageConsumerAdmissionV2(
    'language-capability',
    input.execution,
  );
  const registeredConsumer = registerVerifiedLanguageConsumerV2(
    admission,
    { async consumeVerifiedContext() {} },
    input.execution,
  );
  const observation = createTrustedLanguageCapabilityObservationV2(
    capabilityView,
    scopeView,
    registeredConsumer,
    input.execution,
    {
      ...(input.matchedTermsByRef === undefined
        ? {}
        : { matchedTermsByRef: input.matchedTermsByRef }),
    },
  );

  // Language port：同 execution composition root；逐 ref classify→三 port seal
  const root = createScopeBoundProducerCompositionRootV2(input.execution);
  const languageAdmission = issueLanguageAdapterPortAdmissionV2(
    root.registrar,
    input.execution,
  );
  const resolver = createLanguageAdapterScopeProducerResolverV2(
    observation,
    input.execution,
  );
  const languagePort = registerLanguageAdapterScopeProducerPortV2(
    root.registrar,
    languageAdmission,
    resolver,
    input.execution,
  );
  for (const record of includedRecords) {
    registerScopeBoundProducerSourceV2(
      root.registrar,
      { kind: 'none' },
      root.directPort,
      scopeView,
      record.eligibleRef,
      input.execution,
    );
    registerScopeBoundProducerSourceV2(
      root.registrar,
      { kind: 'none' },
      root.candidatePort,
      scopeView,
      record.eligibleRef,
      input.execution,
    );
    const classifyResult = await classifyLanguageCapabilityRecordV2(
      observation,
      record.eligibleRef,
      input.execution,
    );
    registerLanguageAdapterProducerSourceV2(
      classifyResult,
      root.registrar,
      languagePort,
      scopeView,
      record.eligibleRef,
      input.execution,
    );
    const seal = sealScopeBoundProducerRecordSetV2(
      root.registrar,
      scopeView,
      record.eligibleRef,
      input.execution,
    );
    arbitrateScopeBoundEvidenceProducerV2(
      seal,
      scopeView,
      record.eligibleRef,
      input.execution,
    );
  }

  const stableCapabilityRecords: readonly TrustedStableEligibleCapabilityRecordViewV2[] =
    Object.freeze(
      includedRecords.map((record) =>
        Object.freeze({
          eligibleRef: record.eligibleRef,
          fileBucketRef: record.fileBucketRef,
        }),
      ),
    );
  const stableCapabilityView: TrustedStableEligibleCapabilityViewV2 =
    requireStableEligibleCapabilityViewV2(
      eligiblePool,
      snapshotProof,
      input.foldProof,
      input.execution,
      stableCapabilityRecords,
    );

  const preBudgetCount = createCapabilityPreBudgetCountV2(
    observation,
    stableCapabilityView,
    stableScopeView,
    eligiblePool,
    snapshotProof,
    input.foldProof,
    input.scopeProof,
    input.execution,
  );

  // Retained seal 需要 ledger 与 ranking 对齐；language→ranking ledger 未灌入前
  // 用同 proof 的 empty ranking 封存（unsupported count 仍来自 pre-budget）。
  void input.rankingOutcome;
  const rankingForSeal = issueEvidenceRankingOutcomeV2({
    fragment: Object.freeze({
      confirmed: Object.freeze([]),
      candidates: Object.freeze([]),
      unsatisfiedAnchors: Object.freeze([]),
    }),
    budgetFacts: Object.freeze({
      maxFilesReached: false,
      maxConfirmedReached: false,
      maxCandidatesReached: false,
      preRankingPoolTruncated: false,
      safeSelectorCollision: false,
      safeOrderingCollision: false,
    }),
    confirmed: [],
    candidates: [],
    snapshotProof,
    execution: input.execution,
    collisionAnchorKeys: new Set(),
  });

  const retainedSeal = sealCapabilityRetainedDecisionsV2(
    preBudgetCount,
    rankingForSeal,
    observation,
    eligiblePool,
    snapshotProof,
    input.foldProof,
    input.scopeProof,
    input.execution,
  );
  const facts = buildCapabilityCoverageV2(
    preBudgetCount,
    retainedSeal,
    observation,
    eligiblePool,
    snapshotProof,
    input.foldProof,
    input.scopeProof,
    input.execution,
  );
  const view = requireCapabilityCoverageFactsV2(
    facts,
    preBudgetCount,
    retainedSeal,
    observation,
    eligiblePool,
    snapshotProof,
    input.foldProof,
    input.scopeProof,
    input.execution,
  );
  return Object.freeze({
    view,
    facts,
    contribution: view.contribution,
    observation,
    eligiblePool,
    snapshotProof,
    foldProof: input.foldProof,
    fragmentValue: view.fragment.value,
  });
}
