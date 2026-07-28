import type { BackendExecutionTraceV2 } from '../../contracts/v2/backend-execution-outcome-v2.js';
import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
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
 * 签发 fallback decision；绑定 same F5 trace / execution。
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
