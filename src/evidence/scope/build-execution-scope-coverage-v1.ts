/**
 * Production helper：同一 execution 绑定 fold proof / coverage basis / scope facts。
 */

import type { RepoLayer } from '../../contracts/index.js';
import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import { projectExpandedSafePreCapPoolV2 } from '../request-snapshot/discovery-lane-universe-v2.js';
import { runFinalSnapshotCheckV2 } from '../request-snapshot/final-snapshot-check-v2.js';
import type {
  SnapshotTrustProofV2,
  TrustedStableEligibleDiscoveryPoolV2,
} from '../request-snapshot/final-snapshot-check-v2.js';
import { createScopeCoverageBasisV2 } from '../request-snapshot/scope-coverage-basis-v2.js';
import {
  bindEmptyStableEligibleScopeDecisionsV2,
  bindStableEligibleScopeDecisionsV2,
  type TrustedStableScopeRecordViewV2,
} from '../request-snapshot/scope-classification-views-v2.js';
import {
  readScopeFoldedSafePoolProofV2,
  readScopeFoldedSelectorFactsV2,
  scopeFoldSafeCandidatePoolV2,
  type ScopeFoldedSafePoolProofV2,
  type TrustedScopeFoldedSelectorViewV2,
} from '../request-snapshot/scope-folded-discovery-selector-v2.js';
import {
  buildScopeCoverageV1,
  requireScopeCoverageFactsV1,
  type ScopeCoverageFactsViewV1,
} from './scope-coverage-v1.js';
import { resolveRepositoryScopeV1 } from './resolve-repository-scope-v1.js';

export interface ExecutionScopeCoverageMountV1 {
  readonly view: ScopeCoverageFactsViewV1;
  readonly eligiblePool: TrustedStableEligibleDiscoveryPoolV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly foldProof: ScopeFoldedSafePoolProofV2;
  readonly coverageBasis: ReturnType<typeof createScopeCoverageBasisV2>;
  readonly resolvedScope: ReturnType<typeof resolveRepositoryScopeV1>;
  readonly fragmentValue: ScopeCoverageFactsViewV1['fragment']['value'];
}

/**
 * 为 canonical success envelope 构建并校验 scope owner facts。
 */
export async function buildExecutionScopeCoverageMountV1(input: {
  readonly execution: LocateExecutionTokenV2;
  readonly requestedLayers: readonly RepoLayer[] | undefined;
  readonly foldedView?: TrustedScopeFoldedSelectorViewV2;
  readonly eligiblePool?: TrustedStableEligibleDiscoveryPoolV2;
  readonly snapshotProof?: SnapshotTrustProofV2;
  readonly stableScopeRecords?: readonly TrustedStableScopeRecordViewV2[];
}): Promise<ExecutionScopeCoverageMountV1> {
  const resolvedScope = resolveRepositoryScopeV1(input.requestedLayers);
  let foldProof: ScopeFoldedSafePoolProofV2;
  let excludedRefs: ReturnType<
    typeof readScopeFoldedSelectorFactsV2
  >['excludedLedger'];

  if (input.foldedView !== undefined) {
    foldProof = readScopeFoldedSafePoolProofV2(
      input.foldedView,
      input.execution,
    );
    excludedRefs = readScopeFoldedSelectorFactsV2(
      input.foldedView,
      input.execution,
    ).excludedLedger;
  } else {
    const preCap = projectExpandedSafePreCapPoolV2([], true, input.execution);
    const folded = scopeFoldSafeCandidatePoolV2(preCap, [], input.execution);
    foldProof = readScopeFoldedSafePoolProofV2(folded, input.execution);
    excludedRefs = Object.freeze([]);
  }

  let eligiblePool = input.eligiblePool;
  let snapshotProof = input.snapshotProof;
  if (eligiblePool === undefined || snapshotProof === undefined) {
    const registered = await runFinalSnapshotCheckV2({
      repositoryRoot: '/tmp/scope-execution-mount',
      loadedFiles: [],
      evidencePool: {
        records: [],
        preRankingPoolTruncated: false,
        safeSelectionCollision: false,
      },
      eligiblePool: { records: [] },
      gitState: 'unknown',
      signal: new AbortController().signal,
      execution: input.execution,
    });
    eligiblePool = registered.eligibleDiscovery;
    snapshotProof = registered.proof;
  }

  if (input.stableScopeRecords !== undefined) {
    // 显式 bind（可为空）：禁止生产用空 bind 覆盖已有 eligible 权威集
    bindStableEligibleScopeDecisionsV2({
      pool: eligiblePool,
      snapshotProof,
      foldProof,
      execution: input.execution,
      records: input.stableScopeRecords,
    });
  } else {
    bindEmptyStableEligibleScopeDecisionsV2({
      pool: eligiblePool,
      snapshotProof,
      foldProof,
      execution: input.execution,
    });
  }

  const coverageBasis = createScopeCoverageBasisV2({
    excludedLocatorRefs: excludedRefs.map((entry) => entry.locatorRef),
    mixedIncludedLocatorRefs: [],
    stableEligiblePool: eligiblePool,
    snapshotProof,
    foldProof,
    execution: input.execution,
  });
  const facts = buildScopeCoverageV1(
    eligiblePool,
    snapshotProof,
    foldProof,
    coverageBasis,
    resolvedScope,
    input.execution,
  );
  const view = requireScopeCoverageFactsV1(
    facts,
    eligiblePool,
    snapshotProof,
    foldProof,
    coverageBasis,
    resolvedScope,
    input.execution,
  );
  return Object.freeze({
    view,
    eligiblePool,
    snapshotProof,
    foldProof,
    coverageBasis,
    resolvedScope,
    fragmentValue: view.fragment.value,
  });
}
