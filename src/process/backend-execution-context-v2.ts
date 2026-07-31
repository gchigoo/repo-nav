import type {
  BackendHit,
  BackendSearchResult,
  SearchBackendId,
} from '../contracts/index.js';
import type { StreamingSafeProcessRunnerV2 } from '../contracts/safe-process.js';
import type { LocateExecutionTokenV2 } from '../contracts/v2/locate-fact-envelope-v2.js';
import type {
  BackendDiscoveryHandoffForF3ViewV2,
  BackendExecutionContextV2,
  BackendExecutionOutcomeV2,
  BackendExecutionOutcomeViewV2,
  BackendExecutionTelemetryViewV2,
  BackendExecutionTraceV2,
  BackendExecutionTraceViewV2,
  BackendFallbackFactsForF3V2,
  BackendNoStartDecisionV2,
  BackendNoStartObservationV2,
  CodeGraphIndexObservationV2,
  CodeGraphProbeReceiptV2,
  CompleteSafeBackendHitForF3V2,
  ExpandedBackendLogicalAttemptV2,
  ExpandedBackendLogicalAttemptViewV2,
  TrustedBackendDiscoveryHandoffV2,
  TrustedCodeGraphIndexObservationV2,
  ValidatedBackendExecutionOutcomeV2,
} from '../contracts/v2/backend-execution-outcome-v2.js';
import {
  createBackendPhysicalAttemptExecutorV2,
  requireNoStartObservationRecordV2,
  type AvailabilityProbeExecutionResultV2,
  type BackendPhysicalAttemptExecutorV2,
  type BackendPhysicalAttemptResultV2,
  type BackendPhysicalStartRegistryV2,
  type StartRecordV2,
} from './backend-physical-attempt-executor-v2.js';
import { createProcessOpaqueTokenV2 } from './opaque-token-v2.js';

function observeCodeGraphStatusStdoutV2(
  stdout: Uint8Array,
): CodeGraphIndexObservationV2 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(stdout).toString('utf8')) as unknown;
  } catch {
    return { kind: 'error' };
  }
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as { initialized?: unknown }).initialized !== 'boolean' ||
    typeof (value as { version?: unknown }).version !== 'string' ||
    (value as { version: string }).version.length === 0
  ) {
    return { kind: 'error' };
  }
  if ((value as { initialized: boolean }).initialized !== true) {
    return { kind: 'missing-index' };
  }
  const pending = (value as { pendingChanges?: unknown }).pendingChanges;
  const index = (value as { index?: unknown }).index;
  const stale =
    (typeof pending === 'object' &&
      pending !== null &&
      (((pending as { added?: number }).added ?? 0) > 0 ||
        ((pending as { modified?: number }).modified ?? 0) > 0 ||
        ((pending as { removed?: number }).removed ?? 0) > 0)) ||
    (Object.hasOwn(value, 'worktreeMismatch') &&
      (value as { worktreeMismatch: unknown }).worktreeMismatch !== null) ||
    (typeof index === 'object' &&
      index !== null &&
      (index as { reindexRecommended?: unknown }).reindexRecommended === true);
  return { kind: 'available', possiblyStale: stale };
}

declare const EXPANDED_LANE_ATTEMPT_FACTS_V2: unique symbol;
declare const EXPANDED_BACKEND_ATTEMPT_SET_SEAL_V2: unique symbol;

export type ExpandedLaneAttemptFactsV2 = Readonly<object> & {
  readonly [EXPANDED_LANE_ATTEMPT_FACTS_V2]: never;
};

export type ExpandedBackendAttemptSetSealV2 = Readonly<object> & {
  readonly [EXPANDED_BACKEND_ATTEMPT_SET_SEAL_V2]: never;
};

interface ContextRecordV2 {
  readonly execution: LocateExecutionTokenV2;
  readonly requestSignal: AbortSignal;
  readonly runner: StreamingSafeProcessRunnerV2;
  readonly starts: StartRecordV2[];
  readonly executors: Map<SearchBackendId, BackendPhysicalAttemptExecutorV2>;
  readonly laneFacts: Map<
    number,
    {
      readonly backend: SearchBackendId;
      readonly laneMask: string;
      readonly facts: unknown;
      readonly result: BackendPhysicalAttemptResultV2<unknown>;
    }
  >;
  readonly sealedBackends: Set<SearchBackendId>;
  readonly logicalAttempts: Map<
    SearchBackendId,
    {
      readonly attempt: ExpandedBackendLogicalAttemptV2;
      readonly view: ExpandedBackendLogicalAttemptViewV2;
      readonly outcomeShape: BackendExecutionOutcomeV2;
    }
  >;
  signalBound: boolean;
}

interface OutcomeRecordV2 {
  readonly shape: BackendExecutionOutcomeV2;
  readonly execution: LocateExecutionTokenV2;
  readonly context: BackendExecutionContextV2;
}

interface HandoffRecordV2 {
  readonly view: BackendDiscoveryHandoffForF3ViewV2;
  readonly execution: LocateExecutionTokenV2;
  readonly context: BackendExecutionContextV2;
  readonly requestRef: unknown;
}

interface TraceRecordV2 {
  readonly view: BackendExecutionTraceViewV2;
  readonly execution: LocateExecutionTokenV2;
  readonly context: BackendExecutionContextV2;
}

interface ProbeReceiptRecordV2 {
  readonly observation: CodeGraphIndexObservationV2;
  readonly ordinal: number;
  readonly execution: LocateExecutionTokenV2;
  readonly context: BackendExecutionContextV2;
}

const contextPrivate = new WeakMap<
  BackendExecutionContextV2,
  ContextRecordV2
>();
const signalContexts = new WeakMap<AbortSignal, BackendExecutionContextV2>();
const outcomePrivate = new WeakMap<
  ValidatedBackendExecutionOutcomeV2,
  OutcomeRecordV2
>();
const handoffPrivate = new WeakMap<
  TrustedBackendDiscoveryHandoffV2,
  HandoffRecordV2
>();
const noStartDecisionPrivate = new WeakMap<
  BackendNoStartDecisionV2,
  {
    readonly backend: SearchBackendId;
    readonly reason: 'availability-preparation-failed' | 'pre-aborted';
    readonly execution: LocateExecutionTokenV2;
    readonly context: BackendExecutionContextV2;
  }
>();
const attemptPrivate = new WeakMap<
  ExpandedBackendLogicalAttemptV2,
  {
    readonly view: ExpandedBackendLogicalAttemptViewV2;
    readonly outcomeShape: BackendExecutionOutcomeV2;
    readonly execution: LocateExecutionTokenV2;
    readonly context: BackendExecutionContextV2;
  }
>();
const sealPrivate = new WeakMap<
  ExpandedBackendAttemptSetSealV2,
  {
    readonly backend: SearchBackendId;
    readonly starts: readonly StartRecordV2[];
    readonly execution: LocateExecutionTokenV2;
    readonly context: BackendExecutionContextV2;
  }
>();
const factsPrivate = new WeakMap<
  ExpandedLaneAttemptFactsV2,
  {
    readonly ordinal: number;
    readonly backend: SearchBackendId;
    readonly laneMask: string;
    readonly facts: unknown;
    readonly result: BackendPhysicalAttemptResultV2<unknown>;
    readonly execution: LocateExecutionTokenV2;
    readonly context: BackendExecutionContextV2;
  }
>();
const tracePrivate = new WeakMap<BackendExecutionTraceV2, TraceRecordV2>();
const observationPrivate = new WeakMap<
  TrustedCodeGraphIndexObservationV2,
  {
    readonly observation: CodeGraphIndexObservationV2;
    readonly execution: LocateExecutionTokenV2;
  }
>();
const receiptPrivate = new WeakMap<
  CodeGraphProbeReceiptV2,
  ProbeReceiptRecordV2
>();

function requireContext(
  context: BackendExecutionContextV2,
  execution: LocateExecutionTokenV2,
): ContextRecordV2 {
  const record = contextPrivate.get(context);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('invalid-backend-execution-context');
  }
  return record;
}

function deepFreezeHits(hits: readonly BackendHit[]): readonly BackendHit[] {
  return Object.freeze(hits.map((hit) => Object.freeze({ ...hit })));
}

function validateOutcomeShape(shape: BackendExecutionOutcomeV2): void {
  if (shape.hitCount !== shape.retainedHits.length) {
    throw new TypeError('invalid-outcome-hitCount');
  }
  if (shape.selectionEligibility === 'complete-safe-set') {
    if (
      shape.status !== 'used' ||
      shape.completion !== 'complete' ||
      shape.termination !== 'none'
    ) {
      throw new TypeError('invalid-complete-safe-set');
    }
  } else if (shape.selectionEligibility !== 'telemetry-only') {
    throw new TypeError('invalid-eligibility');
  }
  if (shape.status === 'unavailable' && shape.hitCount !== 0) {
    throw new TypeError('invalid-unavailable');
  }
}

function signOutcome(
  shape: BackendExecutionOutcomeV2,
  context: BackendExecutionContextV2,
  execution: LocateExecutionTokenV2,
): ValidatedBackendExecutionOutcomeV2 {
  validateOutcomeShape(shape);
  const frozen: BackendExecutionOutcomeV2 = Object.freeze({
    ...shape,
    retainedHits: deepFreezeHits(shape.retainedHits),
  }) as BackendExecutionOutcomeV2;
  const token =
    createProcessOpaqueTokenV2<ValidatedBackendExecutionOutcomeV2>();
  outcomePrivate.set(token, {
    shape: frozen,
    execution,
    context,
  });
  return token;
}

function toTelemetry(
  shape: BackendExecutionOutcomeV2,
): BackendExecutionTelemetryViewV2 {
  const {
    retainedHits: _retainedHits,
    selectionEligibility: _selectionEligibility,
    ...rest
  } = shape;
  void _retainedHits;
  void _selectionEligibility;
  return Object.freeze(rest) as BackendExecutionTelemetryViewV2;
}

/**
 * canonical 每 request 创建唯一 context，并把 exact request signal 一对一登记。
 */
export function createBackendExecutionContextV2(
  runner: StreamingSafeProcessRunnerV2,
  _preparationPort: unknown,
  requestSignal: AbortSignal,
  execution: LocateExecutionTokenV2,
): BackendExecutionContextV2 {
  if (signalContexts.has(requestSignal)) {
    throw new TypeError('request-signal-already-bound');
  }
  const token = createProcessOpaqueTokenV2<BackendExecutionContextV2>();
  const record: ContextRecordV2 = {
    execution,
    requestSignal,
    runner,
    starts: [],
    executors: new Map(),
    laneFacts: new Map(),
    sealedBackends: new Set(),
    logicalAttempts: new Map(),
    signalBound: true,
  };
  contextPrivate.set(token, record);
  signalContexts.set(requestSignal, token);
  return token;
}

export function requireBackendPhysicalAttemptExecutorV2(
  context: BackendExecutionContextV2,
  expectedBackend: SearchBackendId,
  execution: LocateExecutionTokenV2,
): BackendPhysicalAttemptExecutorV2 {
  const record = requireContext(context, execution);
  const existing = record.executors.get(expectedBackend);
  if (existing !== undefined) {
    return existing;
  }
  const executor = createBackendPhysicalAttemptExecutorV2({
    runner: record.runner,
    context,
    backend: expectedBackend,
    requestSignal: record.requestSignal,
    execution,
    starts: record.starts,
    onStart: () => {
      // starts already pushed by executor
    },
    assertNotSealed: () => {
      if (record.sealedBackends.has(expectedBackend)) {
        throw new TypeError('late-start');
      }
    },
  });
  record.executors.set(expectedBackend, executor);
  return executor;
}

export function createExpandedLaneAttemptFactsV2(
  result: BackendPhysicalAttemptResultV2<unknown>,
  laneFacts: unknown,
  context: BackendExecutionContextV2,
  execution: LocateExecutionTokenV2,
): ExpandedLaneAttemptFactsV2 {
  const record = requireContext(context, execution);
  const executor = [...record.executors.values()][0];
  if (executor === undefined) {
    throw new TypeError('missing-executor');
  }
  // 通过任一 executor.requireResult 验证 handle
  let view: {
    ordinal: number;
    binding: { backend: SearchBackendId; laneMask: string };
  };
  let matched: BackendPhysicalAttemptExecutorV2 | undefined;
  for (const candidate of record.executors.values()) {
    try {
      view = candidate.requireResult(result, execution);
      matched = candidate;
      break;
    } catch {
      // try next
    }
  }
  if (matched === undefined) {
    throw new TypeError('invalid-physical-result');
  }
  if (
    view!.binding.laneMask === 'legacy-only' ||
    record.laneFacts.has(view!.ordinal) ||
    record.sealedBackends.has(view!.binding.backend)
  ) {
    throw new TypeError('invalid-lane-facts');
  }
  const token = createProcessOpaqueTokenV2<ExpandedLaneAttemptFactsV2>();
  const entry = {
    ordinal: view!.ordinal,
    backend: view!.binding.backend,
    laneMask: view!.binding.laneMask,
    facts: laneFacts,
    result,
    execution,
    context,
  };
  factsPrivate.set(token, entry);
  record.laneFacts.set(view!.ordinal, {
    backend: entry.backend,
    laneMask: entry.laneMask,
    facts: laneFacts,
    result,
  });
  return token;
}

export function sealExpandedBackendAttemptSetV2(
  context: BackendExecutionContextV2,
  backend: SearchBackendId,
  execution: LocateExecutionTokenV2,
): ExpandedBackendAttemptSetSealV2 {
  const record = requireContext(context, execution);
  if (record.sealedBackends.has(backend)) {
    throw new TypeError('backend-already-sealed');
  }
  const related = record.starts.filter(
    (start) =>
      start.binding.backend === backend &&
      start.binding.laneMask !== 'legacy-only',
  );
  for (const start of related) {
    if (!start.settled) {
      throw new TypeError('unsettled-start');
    }
    if (!record.laneFacts.has(start.ordinal)) {
      throw new TypeError('missing-lane-facts');
    }
  }
  record.sealedBackends.add(backend);
  const token = createProcessOpaqueTokenV2<ExpandedBackendAttemptSetSealV2>();
  sealPrivate.set(token, {
    backend,
    starts: related,
    execution,
    context,
  });
  return token;
}

export interface ExpandedBackendAttemptReducerV2 {
  reduce(
    seal: ExpandedBackendAttemptSetSealV2,
    execution: LocateExecutionTokenV2,
  ): ExpandedBackendLogicalAttemptV2 | undefined;
}

export function requireExpandedBackendAttemptReducerV2(
  context: BackendExecutionContextV2,
  execution: LocateExecutionTokenV2,
): ExpandedBackendAttemptReducerV2 {
  requireContext(context, execution);
  return {
    reduce(seal, reduceExecution) {
      const sealRecord = sealPrivate.get(seal);
      if (
        sealRecord === undefined ||
        sealRecord.execution !== reduceExecution ||
        sealRecord.context !== context
      ) {
        throw new TypeError('invalid-seal');
      }
      const ctx = requireContext(context, reduceExecution);
      if (ctx.logicalAttempts.has(sealRecord.backend)) {
        throw new TypeError('duplicate-logical-attempt');
      }
      if (sealRecord.starts.length === 0) {
        return undefined;
      }
      const ordered = [...sealRecord.starts].sort(
        (left, right) => left.ordinal - right.ordinal,
      );
      const first = ordered[0]!;
      // 搜索 outcome 必须绑 ripgrep-group / codegraph query|fallback，禁止 version/status probe 误绑 hits
      const outcomeSourceKinds = new Set([
        'ripgrep-group',
        'codegraph-query',
        'codegraph-fallback',
      ]);
      const outcomeStart =
        ordered.find((start) => outcomeSourceKinds.has(start.binding.kind)) ??
        first;
      const factsEntry = ctx.laneFacts.get(outcomeStart.ordinal);
      if (factsEntry === undefined) {
        throw new TypeError('missing-facts');
      }
      const shape = factsEntry.facts as BackendExecutionOutcomeV2;
      const outcome = signOutcome(shape, context, reduceExecution);
      const attempt =
        createProcessOpaqueTokenV2<ExpandedBackendLogicalAttemptV2>();
      const view: ExpandedBackendLogicalAttemptViewV2 = Object.freeze({
        backend: sealRecord.backend,
        firstExpandedStartOrdinal: first.ordinal,
        outcome,
      });
      attemptPrivate.set(attempt, {
        view,
        outcomeShape: shape,
        execution: reduceExecution,
        context,
      });
      ctx.logicalAttempts.set(sealRecord.backend, {
        attempt,
        view,
        outcomeShape: shape,
      });
      return attempt;
    },
  };
}

export function requireExpandedBackendLogicalAttemptV2(
  attempt: ExpandedBackendLogicalAttemptV2,
  expectedContext: BackendExecutionContextV2,
  expectedExecution: LocateExecutionTokenV2,
): ExpandedBackendLogicalAttemptViewV2 {
  const record = attemptPrivate.get(attempt);
  if (
    record === undefined ||
    record.context !== expectedContext ||
    record.execution !== expectedExecution
  ) {
    throw new TypeError('invalid-logical-attempt');
  }
  return record.view;
}

export function requireBackendExecutionOutcomeV2(
  outcome: ValidatedBackendExecutionOutcomeV2,
  expectedExecution: LocateExecutionTokenV2,
): BackendExecutionOutcomeViewV2 {
  const record = outcomePrivate.get(outcome);
  if (record === undefined || record.execution !== expectedExecution) {
    throw new TypeError('invalid-outcome');
  }
  return record.shape;
}

export function completeSafeHitsV2(
  outcome: ValidatedBackendExecutionOutcomeV2,
  expectedExecution: LocateExecutionTokenV2,
): readonly BackendHit[] {
  const shape = requireBackendExecutionOutcomeV2(outcome, expectedExecution);
  if (shape.selectionEligibility !== 'complete-safe-set') {
    throw new TypeError('not-complete-safe-set');
  }
  return shape.retainedHits;
}

export function createBackendNoStartDecisionV2(
  observation: BackendNoStartObservationV2,
  context: BackendExecutionContextV2,
  execution: LocateExecutionTokenV2,
): BackendNoStartDecisionV2 {
  const obs = requireNoStartObservationRecordV2(
    observation,
    context,
    execution,
  );
  const token = createProcessOpaqueTokenV2<BackendNoStartDecisionV2>();
  noStartDecisionPrivate.set(token, {
    backend: obs.backend,
    reason: obs.reason,
    execution,
    context,
  });
  return token;
}

export function createTrustedBackendDiscoveryHandoffV2(
  input:
    | Readonly<{
        kind: 'started';
        request: {
          readonly legacyMaxHits: number;
          readonly expandedMaxHits: number;
        };
        attempt: ExpandedBackendLogicalAttemptV2;
        legacy: BackendSearchResult;
        fallback: BackendFallbackFactsForF3V2;
        expandedHealth: BackendSearchResult['health'];
        completeSafeHits: readonly CompleteSafeBackendHitForF3V2[];
        canSkipFallbackIfVerified: boolean;
      }>
    | Readonly<{
        kind: 'no-start';
        request: {
          readonly legacyMaxHits: number;
          readonly expandedMaxHits: number;
        };
        decision: BackendNoStartDecisionV2;
        legacy: BackendSearchResult;
        fallback: BackendFallbackFactsForF3V2;
        expandedHealth: BackendSearchResult['health'];
      }>,
  context: BackendExecutionContextV2,
  execution: LocateExecutionTokenV2,
): TrustedBackendDiscoveryHandoffV2 {
  requireContext(context, execution);
  let view: BackendDiscoveryHandoffForF3ViewV2;
  if (input.kind === 'started') {
    const attempt = requireExpandedBackendLogicalAttemptV2(
      input.attempt,
      context,
      execution,
    );
    const outcomeShape = requireBackendExecutionOutcomeV2(
      attempt.outcome,
      execution,
    );
    const complete = outcomeShape.selectionEligibility === 'complete-safe-set';
    view = Object.freeze({
      kind: 'started',
      backend: attempt.backend,
      legacy: input.legacy,
      legacyCap: input.request.legacyMaxHits,
      fallback: input.fallback,
      expandedOutcome: attempt.outcome,
      expandedHealth: input.expandedHealth,
      expandedComplete: complete,
      completeSafeHits: complete ? input.completeSafeHits : Object.freeze([]),
      canSkipFallbackIfVerified: input.canSkipFallbackIfVerified,
    });
  } else {
    const decision = noStartDecisionPrivate.get(input.decision);
    if (
      decision === undefined ||
      decision.context !== context ||
      decision.execution !== execution
    ) {
      throw new TypeError('invalid-no-start-decision');
    }
    view = Object.freeze({
      kind: 'no-start' as const,
      reason: decision.reason,
      backend: decision.backend,
      legacy: input.legacy,
      legacyCap: input.request.legacyMaxHits,
      fallback: input.fallback,
      expandedHealth: input.expandedHealth,
      expandedComplete: false as const,
      completeSafeHits: Object.freeze([]) as readonly [],
      canSkipFallbackIfVerified: false as const,
    });
  }
  const token = createProcessOpaqueTokenV2<TrustedBackendDiscoveryHandoffV2>();
  handoffPrivate.set(token, {
    view,
    execution,
    context,
    requestRef: input.request,
  });
  return token;
}

export function requireBackendDiscoveryHandoffForF3V2(
  handoff: TrustedBackendDiscoveryHandoffV2,
  expectedBackend: SearchBackendId,
  expectedRequest: { readonly legacyMaxHits: number },
  context: BackendExecutionContextV2,
  execution: LocateExecutionTokenV2,
): BackendDiscoveryHandoffForF3ViewV2 {
  const record = handoffPrivate.get(handoff);
  if (
    record === undefined ||
    record.context !== context ||
    record.execution !== execution ||
    record.view.backend !== expectedBackend ||
    record.view.legacyCap !== expectedRequest.legacyMaxHits
  ) {
    throw new TypeError('invalid-handoff');
  }
  return record.view;
}

export function createCodeGraphProbeReceiptV2(
  result: BackendPhysicalAttemptResultV2<AvailabilityProbeExecutionResultV2>,
  context: BackendExecutionContextV2,
  execution: LocateExecutionTokenV2,
): CodeGraphProbeReceiptV2 {
  const record = requireContext(context, execution);
  let view:
    | {
        ordinal: number;
        result: AvailabilityProbeExecutionResultV2;
      }
    | undefined;
  for (const executor of record.executors.values()) {
    try {
      view = executor.requireResult(result, execution);
      break;
    } catch {
      // continue
    }
  }
  if (view === undefined) {
    throw new TypeError('invalid-probe-result');
  }
  let observation: CodeGraphIndexObservationV2;
  const probe = view.result;
  if (!probe.ok) {
    if (probe.kind === 'executable-not-found') {
      observation = { kind: 'tool-unavailable' };
    } else {
      observation = { kind: 'error' };
    }
  } else {
    observation = observeCodeGraphStatusStdoutV2(probe.stdout);
  }
  const token = createProcessOpaqueTokenV2<CodeGraphProbeReceiptV2>();
  receiptPrivate.set(token, {
    observation,
    ordinal: view.ordinal,
    execution,
    context,
  });
  return token;
}

export function createObservedCodeGraphIndexObservationV2(
  probeReceipt: CodeGraphProbeReceiptV2,
  execution: LocateExecutionTokenV2,
): TrustedCodeGraphIndexObservationV2 {
  const receipt = receiptPrivate.get(probeReceipt);
  if (receipt === undefined || receipt.execution !== execution) {
    throw new TypeError('invalid-probe-receipt');
  }
  const token =
    createProcessOpaqueTokenV2<TrustedCodeGraphIndexObservationV2>();
  observationPrivate.set(token, {
    observation: receipt.observation,
    execution,
  });
  return token;
}

export function createNotObservedCodeGraphIndexObservationV2(
  _startRegistry: BackendPhysicalStartRegistryV2,
  execution: LocateExecutionTokenV2,
  context: BackendExecutionContextV2,
): TrustedCodeGraphIndexObservationV2 {
  const record = requireContext(context, execution);
  const expandedCodegraphStarts = record.starts.filter(
    (start) =>
      start.binding.backend === 'codegraph' &&
      start.binding.laneMask !== 'legacy-only' &&
      (start.binding.kind === 'codegraph-status' ||
        start.binding.kind === 'codegraph-query' ||
        start.binding.kind === 'codegraph-fallback'),
  );
  if (expandedCodegraphStarts.length !== 0) {
    throw new TypeError('codegraph-already-started');
  }
  const token =
    createProcessOpaqueTokenV2<TrustedCodeGraphIndexObservationV2>();
  observationPrivate.set(token, {
    observation: { kind: 'not-observed' },
    execution,
  });
  return token;
}

export function finalizeBackendExecutionTraceV2(
  context: BackendExecutionContextV2,
  codegraphObservation: TrustedCodeGraphIndexObservationV2,
  execution: LocateExecutionTokenV2,
): BackendExecutionTraceV2 {
  const record = requireContext(context, execution);
  const obs = observationPrivate.get(codegraphObservation);
  if (obs === undefined || obs.execution !== execution) {
    throw new TypeError('invalid-codegraph-observation');
  }
  const attempts = [...record.logicalAttempts.values()].sort(
    (left, right) =>
      left.view.firstExpandedStartOrdinal -
      right.view.firstExpandedStartOrdinal,
  );
  const view: BackendExecutionTraceViewV2 = Object.freeze({
    outcomes: Object.freeze(
      attempts.map((entry) => toTelemetry(entry.outcomeShape)),
    ),
    firstExpandedStartOrdinals: Object.freeze(
      attempts.map((entry) => entry.view.firstExpandedStartOrdinal),
    ),
    codegraphIndexObservation: obs.observation,
  });
  const token = createProcessOpaqueTokenV2<BackendExecutionTraceV2>();
  tracePrivate.set(token, { view, execution, context });
  return token;
}

export function requireBackendExecutionTraceV2(
  trace: BackendExecutionTraceV2,
  expectedExecution: LocateExecutionTokenV2,
): BackendExecutionTraceViewV2 {
  const record = tracePrivate.get(trace);
  if (record === undefined || record.execution !== expectedExecution) {
    throw new TypeError('invalid-trace');
  }
  return record.view;
}

/** 测试/backend helper：签发 outcome shape 为 validated（需已有 seal/context）。 */
export function signBackendExecutionOutcomeForFactsV2(
  shape: BackendExecutionOutcomeV2,
  context: BackendExecutionContextV2,
  execution: LocateExecutionTokenV2,
): BackendExecutionOutcomeV2 {
  requireContext(context, execution);
  validateOutcomeShape(shape);
  return Object.freeze({
    ...shape,
    retainedHits: deepFreezeHits(shape.retainedHits),
  }) as BackendExecutionOutcomeV2;
}

/**
 * F6/testkit harness：直接签发 public-neutral telemetry trace（不经 physical start）。
 * production path 不得调用。
 */
export function issueBackendExecutionTraceForHarnessV2(input: {
  readonly execution: LocateExecutionTokenV2;
  readonly context: BackendExecutionContextV2;
  readonly outcomes: readonly BackendExecutionOutcomeV2[];
  readonly codegraphIndexObservation: CodeGraphIndexObservationV2;
}): BackendExecutionTraceV2 {
  requireContext(input.context, input.execution);
  const seen = new Set<string>();
  for (const outcome of input.outcomes) {
    validateOutcomeShape(outcome);
    if (seen.has(outcome.backend)) {
      throw new TypeError('duplicate-backend-outcome');
    }
    seen.add(outcome.backend);
  }
  const view: BackendExecutionTraceViewV2 = Object.freeze({
    outcomes: Object.freeze(
      input.outcomes.map((outcome) => toTelemetry(outcome)),
    ),
    firstExpandedStartOrdinals: Object.freeze(
      input.outcomes.map((_, index) => index + 1),
    ),
    codegraphIndexObservation: input.codegraphIndexObservation,
  });
  const token = createProcessOpaqueTokenV2<BackendExecutionTraceV2>();
  tracePrivate.set(token, {
    view,
    execution: input.execution,
    context: input.context,
  });
  return token;
}

/**
 * F6/testkit harness：fixture backend 无 physical start 时直接登记 logical attempt。
 * production path 不得调用。
 */
export function issueExpandedBackendLogicalAttemptForHarnessV2(input: {
  readonly execution: LocateExecutionTokenV2;
  readonly context: BackendExecutionContextV2;
  readonly outcome: BackendExecutionOutcomeV2;
}): ExpandedBackendLogicalAttemptV2 {
  const record = requireContext(input.context, input.execution);
  validateOutcomeShape(input.outcome);
  if (record.logicalAttempts.has(input.outcome.backend)) {
    throw new TypeError('duplicate-logical-attempt');
  }
  if (record.sealedBackends.has(input.outcome.backend)) {
    throw new TypeError('backend-already-sealed');
  }
  const outcome = signOutcome(input.outcome, input.context, input.execution);
  const attempt = createProcessOpaqueTokenV2<ExpandedBackendLogicalAttemptV2>();
  const firstExpandedStartOrdinal = record.logicalAttempts.size + 1;
  const view: ExpandedBackendLogicalAttemptViewV2 = Object.freeze({
    backend: input.outcome.backend,
    firstExpandedStartOrdinal,
    outcome,
  });
  attemptPrivate.set(attempt, {
    view,
    outcomeShape: Object.freeze({
      ...input.outcome,
      retainedHits: deepFreezeHits(input.outcome.retainedHits),
    }) as BackendExecutionOutcomeV2,
    execution: input.execution,
    context: input.context,
  });
  record.logicalAttempts.set(input.outcome.backend, {
    attempt,
    view,
    outcomeShape: input.outcome,
  });
  record.sealedBackends.add(input.outcome.backend);
  return attempt;
}
