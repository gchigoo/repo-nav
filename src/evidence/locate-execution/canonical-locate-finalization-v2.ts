import {
  type FinalizedAbortDecisionV2,
  type LocateAbortCoordinatorV2,
  type LocateAbortSource,
  requireFinalizedAbortDecisionV2,
} from '../abort-source.js';

/**
 * 同步 finalize 入口类型：不得返回 Promise。
 */
export type SynchronousLocateFinalizeV2<T> = (input: {
  readonly abortDecision: FinalizedAbortDecisionV2;
  readonly abortSource: LocateAbortSource;
}) => T;

/**
 * 在最后一次 await（F3 finalCheck）之后关闭 latch，再跑纯同步 finalize。
 */
export function closeAndFinalizeLocateSynchronouslyV2<T>(
  coordinator: LocateAbortCoordinatorV2,
  finalize: SynchronousLocateFinalizeV2<T>,
): T {
  const abortDecision = coordinator.closeFinalization();
  const abortSource = requireFinalizedAbortDecisionV2(
    abortDecision,
    coordinator,
  );
  const result = finalize({ abortDecision, abortSource });
  if (
    result !== null &&
    typeof result === 'object' &&
    typeof (result as { then?: unknown }).then === 'function'
  ) {
    throw new TypeError('synchronous finalize must not return a Promise');
  }
  return result;
}
