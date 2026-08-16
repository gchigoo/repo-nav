/**
 * F3 pre-final / legacy / post-final scope classification views。
 * F7 只经这些 accessor 读取 decision；matched 只从 stable view records 推导。
 */

import type { RepoLayer } from '../../contracts/index.js';
import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import {
  requireBoundDiscoverySelectionV2,
  type BoundSafeDiscoverySelectionV2,
} from './discovery-selection-binding-v2.js';
import {
  isRegisteredSnapshotTrustProofV2,
  type SnapshotTrustProofV2,
  type TrustedStableEligibleDiscoveryPoolV2,
} from './final-snapshot-check-v2.js';
import { createOpaqueTokenV2 } from './opaque-token-v2.js';
import type {
  EligibleDiscoveryRefV2,
  OpaqueFileBucketRefV2,
  PreFinalEligibleDiscoveryPoolV2,
  PreFinalEligibleDiscoveryRecordV2,
} from './pre-ranking-evidence-pool-v2.js';
import { readDiscoveryLocatorPosixPathV2 } from './discovery-lane-universe-v2.js';
import {
  readScopeFoldedSafePoolProofV2,
  readScopeFoldedSelectorFactsV2,
  type ScopeEligibilityDecisionV2,
  type ScopeFoldedSafePoolProofV2,
  type TrustedScopeFoldedSelectorViewV2,
} from './scope-folded-discovery-selector-v2.js';
import {
  requireTrustedScopeEligibilityObservationV2,
  type TrustedScopeEligibilityObservationV2,
} from './trusted-scope-policy-adapter-v2.js';
import {
  createRepositoryScopePolicyV1,
  pathViewFromPosixPathV1,
} from '../scope/repository-scope-policy-v1.js';
import type { ResolvedRepositoryScopeV1 } from '../scope/resolve-repository-scope-v1.js';

const EXCLUDED_DECISION_V2: ScopeEligibilityDecisionV2 = Object.freeze({
  layer: 'unknown',
  included: false,
  confirmation: 'excluded' as const,
});

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

function decisionByPosixPathFromObservationV2(
  observation: TrustedScopeEligibilityObservationV2,
  execution: LocateExecutionTokenV2,
): {
  readonly decisionByPath: ReadonlyMap<string, ScopeEligibilityDecisionV2>;
  readonly resolvedScope: ResolvedRepositoryScopeV1;
} {
  const observed = requireTrustedScopeEligibilityObservationV2(
    observation,
    execution,
  );
  const map = new Map<string, ScopeEligibilityDecisionV2>();
  for (const entry of observed.decisions) {
    const posix = readDiscoveryLocatorPosixPathV2(entry.locatorRef);
    if (!map.has(posix)) {
      map.set(posix, entry.decision);
    }
  }
  return Object.freeze({
    decisionByPath: map,
    resolvedScope: observed.resolvedScope,
  });
}

/**
 * incomplete expanded（pre-cap 空）时 observation 无 fan-out；对 verified path 用同 policy 补决策。
 */
function decidePosixPathWithResolvedScopeV2(
  posixPath: string,
  resolvedScope: ResolvedRepositoryScopeV1,
): ScopeEligibilityDecisionV2 {
  const decided = createRepositoryScopePolicyV1().decide(
    pathViewFromPosixPathV1(posixPath),
    resolvedScope,
  );
  return Object.freeze({
    layer: decided.layer,
    included: decided.included,
    confirmation: decided.confirmation,
  });
}

declare const TRUSTED_PRE_FINAL_SCOPE_CLASSIFICATION_VIEW_V2: unique symbol;
export type TrustedPreFinalScopeClassificationViewV2 = Readonly<object> & {
  readonly [TRUSTED_PRE_FINAL_SCOPE_CLASSIFICATION_VIEW_V2]: never;
};

declare const TRUSTED_STABLE_ELIGIBLE_SCOPE_VIEW_V2: unique symbol;
export type TrustedStableEligibleScopeViewV2 = Readonly<object> & {
  readonly [TRUSTED_STABLE_ELIGIBLE_SCOPE_VIEW_V2]: never;
};

export interface TrustedPreFinalScopeRecordViewV2 {
  readonly eligibleRef: EligibleDiscoveryRefV2;
  readonly fileBucketRef: OpaqueFileBucketRefV2;
  readonly decision: ScopeEligibilityDecisionV2;
}

export interface TrustedStableScopeRecordViewV2 {
  readonly eligibleRef: EligibleDiscoveryRefV2;
  readonly fileBucketRef: OpaqueFileBucketRefV2;
  readonly decision: ScopeEligibilityDecisionV2;
}

interface PreFinalPrivateV2 {
  readonly execution: LocateExecutionTokenV2;
  readonly observation?: TrustedScopeEligibilityObservationV2;
  readonly foldedView?: TrustedScopeFoldedSelectorViewV2;
  readonly boundSelection?: BoundSafeDiscoverySelectionV2;
  readonly pool: PreFinalEligibleDiscoveryPoolV2;
  readonly records: readonly TrustedPreFinalScopeRecordViewV2[];
  readonly decisionsByEligibleRef: ReadonlyMap<
    EligibleDiscoveryRefV2,
    ScopeEligibilityDecisionV2
  >;
}

interface StablePrivateV2 {
  readonly execution: LocateExecutionTokenV2;
  readonly pool: TrustedStableEligibleDiscoveryPoolV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly foldProof: ScopeFoldedSafePoolProofV2;
  readonly records: readonly TrustedStableScopeRecordViewV2[];
  readonly decisionsByEligibleRef: ReadonlyMap<
    EligibleDiscoveryRefV2,
    ScopeEligibilityDecisionV2
  >;
  readonly matchedLayers: ReadonlySet<RepoLayer>;
}

const preFinalPrivate = new WeakMap<
  TrustedPreFinalScopeClassificationViewV2,
  PreFinalPrivateV2
>();
const stablePrivate = new WeakMap<
  TrustedStableEligibleScopeViewV2,
  StablePrivateV2
>();

/** 测试/composition：在 requireStable 前绑定 eligible→decision。 */
const stableDecisionBindings = new WeakMap<
  TrustedStableEligibleDiscoveryPoolV2,
  {
    readonly foldProof: ScopeFoldedSafePoolProofV2;
    readonly snapshotProof: SnapshotTrustProofV2;
    readonly execution: LocateExecutionTokenV2;
    readonly records: readonly TrustedStableScopeRecordViewV2[];
  }
>();

/**
 * 绑定 post-final eligible records 的 scope decision（same pool/proof/fold/execution）。
 */
export function bindStableEligibleScopeDecisionsV2(input: {
  readonly pool: TrustedStableEligibleDiscoveryPoolV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly foldProof: ScopeFoldedSafePoolProofV2;
  readonly execution: LocateExecutionTokenV2;
  readonly records: readonly TrustedStableScopeRecordViewV2[];
}): void {
  if (!isRegisteredSnapshotTrustProofV2(input.snapshotProof)) {
    throw new TypeError('snapshot trust proof is not registered');
  }
  stableDecisionBindings.set(
    input.pool,
    Object.freeze({
      foldProof: input.foldProof,
      snapshotProof: input.snapshotProof,
      execution: input.execution,
      records: Object.freeze([...input.records]),
    }),
  );
}

/**
 * 空 stable pool 的便利绑定（matched=[]）。
 */
export function bindEmptyStableEligibleScopeDecisionsV2(input: {
  readonly pool: TrustedStableEligibleDiscoveryPoolV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly foldProof: ScopeFoldedSafePoolProofV2;
  readonly execution: LocateExecutionTokenV2;
}): void {
  bindStableEligibleScopeDecisionsV2({
    ...input,
    records: Object.freeze([]),
  });
}

/**
 * Pre-final classifier/candidate seam：验证 fold/selection/observation/execution，
 * 再按 posix path 把 observation decision join 到 verified pool records。
 * 不在 fold eligible subset 或 exact selection 内的 record → excluded。
 */
export function requirePreFinalScopeClassificationViewV2(
  pool: PreFinalEligibleDiscoveryPoolV2,
  observation: TrustedScopeEligibilityObservationV2,
  foldedView: TrustedScopeFoldedSelectorViewV2,
  boundSelection: BoundSafeDiscoverySelectionV2,
  expectedExecution: LocateExecutionTokenV2,
): TrustedPreFinalScopeClassificationViewV2 {
  const { decisionByPath, resolvedScope } =
    decisionByPosixPathFromObservationV2(observation, expectedExecution);
  readScopeFoldedSafePoolProofV2(foldedView, expectedExecution);
  const foldFacts = readScopeFoldedSelectorFactsV2(
    foldedView,
    expectedExecution,
  );
  const bound = requireBoundDiscoverySelectionV2(
    boundSelection,
    expectedExecution,
  );
  if (bound.draft.selectorView !== foldedView) {
    throw new TypeError('bound selection is not tied to folded selector view');
  }

  // fold eligible subset：阻止 mixed-group 仅凭 observation 重新进入
  const foldedPaths = new Set<string>();
  for (const candidate of foldFacts.candidates) {
    foldedPaths.add(readDiscoveryLocatorPosixPathV2(candidate.locatorRef));
  }
  // selection 已 requireBound；incomplete expanded 时 fold 为空，允许 verified path 补决策
  void bound.draft.selectedLocatorRefs;
  const foldEmpty = foldedPaths.size === 0;

  const decisionsByEligibleRef = new Map<
    EligibleDiscoveryRefV2,
    ScopeEligibilityDecisionV2
  >();
  const records: TrustedPreFinalScopeRecordViewV2[] = [];
  for (const record of pool.records) {
    const posix =
      posixFileFromDiscoveryKeyV2(record.discoveryKey) ??
      String(record.canonicalFileKey).replaceAll('\\', '/');
    const observed =
      decisionByPath.get(posix) ??
      (foldEmpty
        ? decidePosixPathWithResolvedScopeV2(posix, resolvedScope)
        : undefined);
    const inFold = foldedPaths.has(posix);
    const decision: ScopeEligibilityDecisionV2 =
      observed !== undefined && (foldEmpty || inFold)
        ? observed
        : Object.freeze({
            layer: observed?.layer ?? EXCLUDED_DECISION_V2.layer,
            included: false,
            confirmation: 'excluded' as const,
          });
    decisionsByEligibleRef.set(record.eligibleRef, decision);
    records.push(
      Object.freeze({
        eligibleRef: record.eligibleRef,
        fileBucketRef: record.fileBucketRef,
        decision,
      }),
    );
  }
  const view = createOpaqueTokenV2<TrustedPreFinalScopeClassificationViewV2>();
  preFinalPrivate.set(
    view,
    Object.freeze({
      execution: expectedExecution,
      observation,
      foldedView,
      boundSelection,
      pool,
      records: Object.freeze(records),
      decisionsByEligibleRef,
    }),
  );
  return view;
}

/**
 * Post-final：用 same-execution observation 把 retained eligible → stable scope records。
 * unmatched/matched 只消费这些 records 的 layer。
 */
export function buildStableEligibleScopeRecordsFromObservationV2(input: {
  readonly retainedEligible: readonly PreFinalEligibleDiscoveryRecordV2[];
  readonly observation: TrustedScopeEligibilityObservationV2;
  readonly execution: LocateExecutionTokenV2;
}): readonly TrustedStableScopeRecordViewV2[] {
  const { decisionByPath, resolvedScope } =
    decisionByPosixPathFromObservationV2(input.observation, input.execution);
  const records: TrustedStableScopeRecordViewV2[] = [];
  for (const record of input.retainedEligible) {
    const posix =
      posixFileFromDiscoveryKeyV2(record.discoveryKey) ??
      String(record.canonicalFileKey).replaceAll('\\', '/');
    const observed =
      decisionByPath.get(posix) ??
      decidePosixPathWithResolvedScopeV2(posix, resolvedScope);
    // classification undefined 仍计 matched（design 15）；excluded 不进 matched 权威集
    if (!observed.included || observed.confirmation === 'excluded') {
      continue;
    }
    records.push(
      Object.freeze({
        eligibleRef: record.eligibleRef,
        fileBucketRef: record.fileBucketRef,
        decision: observed,
      }),
    );
  }
  return Object.freeze(records);
}

/**
 * 用显式 decisions 签发 pre-final view（composition root / tests）。
 */
export function createTrustedPreFinalScopeClassificationViewV2(input: {
  readonly execution: LocateExecutionTokenV2;
  readonly observation: TrustedScopeEligibilityObservationV2;
  readonly foldedView: TrustedScopeFoldedSelectorViewV2;
  readonly boundSelection: BoundSafeDiscoverySelectionV2;
  readonly pool: PreFinalEligibleDiscoveryPoolV2;
  readonly records: readonly TrustedPreFinalScopeRecordViewV2[];
}): TrustedPreFinalScopeClassificationViewV2 {
  requireTrustedScopeEligibilityObservationV2(
    input.observation,
    input.execution,
  );
  readScopeFoldedSafePoolProofV2(input.foldedView, input.execution);
  const decisionsByEligibleRef = new Map<
    EligibleDiscoveryRefV2,
    ScopeEligibilityDecisionV2
  >();
  for (const record of input.records) {
    decisionsByEligibleRef.set(record.eligibleRef, record.decision);
  }
  const view = createOpaqueTokenV2<TrustedPreFinalScopeClassificationViewV2>();
  preFinalPrivate.set(
    view,
    Object.freeze({
      execution: input.execution,
      observation: input.observation,
      foldedView: input.foldedView,
      boundSelection: input.boundSelection,
      pool: input.pool,
      records: Object.freeze([...input.records]),
      decisionsByEligibleRef,
    }),
  );
  return view;
}

/**
 * Post-final matched/count seam。
 */
export function requireStableEligibleScopeViewV2(
  pool: TrustedStableEligibleDiscoveryPoolV2,
  proof: SnapshotTrustProofV2,
  foldProof: ScopeFoldedSafePoolProofV2,
  expectedExecution: LocateExecutionTokenV2,
): TrustedStableEligibleScopeViewV2 {
  if (!isRegisteredSnapshotTrustProofV2(proof)) {
    throw new TypeError('stable eligible scope view is not trusted');
  }
  const binding = stableDecisionBindings.get(pool);
  if (binding === undefined) {
    // 未显式 bind 时仅允许空 matched（拒绝 caller 伪造 matched）
    bindEmptyStableEligibleScopeDecisionsV2({
      pool,
      snapshotProof: proof,
      foldProof,
      execution: expectedExecution,
    });
  }
  const resolved = stableDecisionBindings.get(pool);
  if (
    resolved === undefined ||
    resolved.execution !== expectedExecution ||
    resolved.snapshotProof !== proof ||
    resolved.foldProof !== foldProof
  ) {
    throw new TypeError('stable eligible scope binding mismatch');
  }
  const records = resolved.records;
  const decisionsByEligibleRef = new Map<
    EligibleDiscoveryRefV2,
    ScopeEligibilityDecisionV2
  >();
  const matched = new Set<RepoLayer>();
  for (const record of records) {
    decisionsByEligibleRef.set(record.eligibleRef, record.decision);
    // classification undefined 仍算 matched（design 15）
    matched.add(record.decision.layer as RepoLayer);
  }
  const view = createOpaqueTokenV2<TrustedStableEligibleScopeViewV2>();
  stablePrivate.set(
    view,
    Object.freeze({
      execution: expectedExecution,
      pool,
      snapshotProof: proof,
      foldProof,
      records,
      decisionsByEligibleRef,
      matchedLayers: matched,
    }),
  );
  return view;
}

export function readPreFinalScopeClassificationRecordsV2(
  view: TrustedPreFinalScopeClassificationViewV2,
  execution: LocateExecutionTokenV2,
): readonly TrustedPreFinalScopeRecordViewV2[] {
  const record = preFinalPrivate.get(view);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('pre-final scope classification view is not trusted');
  }
  return record.records;
}

export function readPreFinalScopeDecisionForEligibleRefV2(
  view: TrustedPreFinalScopeClassificationViewV2,
  eligibleRef: EligibleDiscoveryRefV2,
  execution: LocateExecutionTokenV2,
): ScopeEligibilityDecisionV2 {
  const record = preFinalPrivate.get(view);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('pre-final scope classification view is not trusted');
  }
  const decision = record.decisionsByEligibleRef.get(eligibleRef);
  if (decision === undefined) {
    throw new TypeError('eligible ref not bound in pre-final scope view');
  }
  return decision;
}

export function readStableEligibleScopeRecordsV2(
  view: TrustedStableEligibleScopeViewV2,
  execution: LocateExecutionTokenV2,
): readonly TrustedStableScopeRecordViewV2[] {
  const record = stablePrivate.get(view);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('stable eligible scope view is not trusted');
  }
  return record.records;
}

export function readStableEligibleMatchedLayersV2(
  view: TrustedStableEligibleScopeViewV2,
  execution: LocateExecutionTokenV2,
): ReadonlySet<RepoLayer> {
  const record = stablePrivate.get(view);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('stable eligible scope view is not trusted');
  }
  return record.matchedLayers;
}

export function readStableScopeDecisionForEligibleRefV2(
  view: TrustedStableEligibleScopeViewV2,
  eligibleRef: EligibleDiscoveryRefV2,
  snapshotProof: SnapshotTrustProofV2,
  execution: LocateExecutionTokenV2,
): ScopeEligibilityDecisionV2 {
  const record = stablePrivate.get(view);
  if (
    record === undefined ||
    record.execution !== execution ||
    record.snapshotProof !== snapshotProof
  ) {
    throw new TypeError('stable scope view is not trusted');
  }
  const decision = record.decisionsByEligibleRef.get(eligibleRef);
  if (decision === undefined) {
    throw new TypeError('eligible ref not bound in stable scope view');
  }
  return decision;
}

export function createEmptyTrustedPreFinalScopeClassificationViewV2(
  pool: PreFinalEligibleDiscoveryPoolV2,
  execution: LocateExecutionTokenV2,
): TrustedPreFinalScopeClassificationViewV2 {
  if (pool.records.length !== 0) {
    throw new TypeError('empty scope view requires an empty pool');
  }
  const view = createOpaqueTokenV2<TrustedPreFinalScopeClassificationViewV2>();
  preFinalPrivate.set(
    view,
    Object.freeze({
      execution,
      pool,
      records: Object.freeze([]),
      decisionsByEligibleRef: new Map(),
    }),
  );
  return view;
}

/**
 * 测试/composition 辅助：直接签发带 decision map 的 pre-final view。
 */
export function createTrustedPreFinalScopeClassificationViewForTestV2(
  execution: LocateExecutionTokenV2,
  decisionsByEligibleRef:
    | ReadonlyMap<EligibleDiscoveryRefV2, ScopeEligibilityDecisionV2>
    | Iterable<
        readonly [EligibleDiscoveryRefV2, ScopeEligibilityDecisionV2]
      > = [],
): TrustedPreFinalScopeClassificationViewV2 {
  const map =
    decisionsByEligibleRef instanceof Map
      ? decisionsByEligibleRef
      : new Map(decisionsByEligibleRef);
  const records = Object.freeze(
    [...map.entries()].map(([eligibleRef, decision]) =>
      Object.freeze({
        eligibleRef,
        fileBucketRef: createOpaqueTokenV2<OpaqueFileBucketRefV2>(),
        decision,
      }),
    ),
  );
  const view = createOpaqueTokenV2<TrustedPreFinalScopeClassificationViewV2>();
  // observation/fold/selection 在 test helper 中用 opaque 占位；生产路径必须走 require*
  const observation =
    createOpaqueTokenV2<TrustedScopeEligibilityObservationV2>();
  const foldedView = createOpaqueTokenV2<TrustedScopeFoldedSelectorViewV2>();
  const boundSelection = createOpaqueTokenV2<BoundSafeDiscoverySelectionV2>();
  const pool: PreFinalEligibleDiscoveryPoolV2 = Object.freeze({
    records: Object.freeze(
      records.map((entry) =>
        Object.freeze({
          eligibleRef: entry.eligibleRef,
          discoveryKey: '',
          canonicalFileKey: '' as never,
          fileBucketRef: entry.fileBucketRef,
          classificationDefined: true,
        }),
      ),
    ),
  });
  preFinalPrivate.set(
    view,
    Object.freeze({
      execution,
      observation,
      foldedView,
      boundSelection,
      pool,
      records,
      decisionsByEligibleRef: map,
    }),
  );
  return view;
}
