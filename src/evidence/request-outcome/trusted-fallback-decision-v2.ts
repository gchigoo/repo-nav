import type { BackendExecutionTraceV2 } from '../../contracts/v2/backend-execution-outcome-v2.js';
import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import { requireBackendExecutionTraceV2 } from '../../process/backend-execution-context-v2.js';
import { createOpaqueTokenV2 } from '../request-snapshot/opaque-token-v2.js';

declare const TRUSTED_FALLBACK_DECISION_V2: unique symbol;
export type TrustedFallbackDecisionV2 = Readonly<object> & {
  readonly [TRUSTED_FALLBACK_DECISION_V2]: never;
};

export interface TrustedFallbackDecisionViewV2 {
  readonly checked: boolean;
  readonly required: boolean;
  readonly completeEquivalentFallback: boolean;
}

interface FallbackRecordV2 extends TrustedFallbackDecisionViewV2 {
  readonly execution: LocateExecutionTokenV2;
  readonly backendTrace: BackendExecutionTraceV2;
}

const fallbackPrivate = new WeakMap<
  TrustedFallbackDecisionV2,
  FallbackRecordV2
>();

/**
 * 测试签发 seam；production 使用 ordered trace derivation。
 */
export function issueTrustedFallbackDecisionV2(input: {
  readonly execution: LocateExecutionTokenV2;
  readonly backendTrace: BackendExecutionTraceV2;
  readonly checked: boolean;
  readonly required: boolean;
  readonly completeEquivalentFallback: boolean;
}): TrustedFallbackDecisionV2 {
  const token = createOpaqueTokenV2<TrustedFallbackDecisionV2>();
  fallbackPrivate.set(
    token,
    Object.freeze({
      checked: input.checked,
      required: input.required,
      completeEquivalentFallback: input.completeEquivalentFallback,
      execution: input.execution,
      backendTrace: input.backendTrace,
    }),
  );
  return token;
}

/**
 * 从 ordered backend trace 推导 fallback 事实。
 */
export function deriveTrustedFallbackDecisionV2(input: {
  readonly execution: LocateExecutionTokenV2;
  readonly backendTrace: BackendExecutionTraceV2;
}): TrustedFallbackDecisionV2 {
  const traceView = requireBackendExecutionTraceV2(
    input.backendTrace,
    input.execution,
  );
  const outcomes = traceView.outcomes;
  const primary = outcomes[0];
  const fallback = outcomes[1];

  const primaryIsCodeGraph =
    primary !== undefined && primary.backend === 'codegraph';
  const primaryCompleteSafe =
    primaryIsCodeGraph &&
    primary.status === 'used' &&
    primary.completion === 'complete';
  const fallbackRan = fallback !== undefined && fallback.backend === 'ripgrep';
  const required = primaryIsCodeGraph && (!primaryCompleteSafe || fallbackRan);
  const completeEquivalentFallback =
    required &&
    fallbackRan &&
    fallback.status === 'used' &&
    fallback.completion === 'complete';

  return issueTrustedFallbackDecisionV2({
    execution: input.execution,
    backendTrace: input.backendTrace,
    checked: fallbackRan,
    required,
    completeEquivalentFallback,
  });
}

/**
 * 读取前核对 trace/execution；clone 或跨 execution 拒绝。
 */
export function requireTrustedFallbackDecisionV2(
  decision: TrustedFallbackDecisionV2,
  expectedTrace: BackendExecutionTraceV2,
  expectedExecution: LocateExecutionTokenV2,
): TrustedFallbackDecisionViewV2 {
  const record = fallbackPrivate.get(decision);
  if (
    record === undefined ||
    record.backendTrace !== expectedTrace ||
    record.execution !== expectedExecution
  ) {
    throw new TypeError('trusted fallback decision is not trusted');
  }
  return Object.freeze({
    checked: record.checked,
    required: record.required,
    completeEquivalentFallback: record.completeEquivalentFallback,
  });
}
