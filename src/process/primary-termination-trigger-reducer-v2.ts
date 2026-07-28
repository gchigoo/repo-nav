/**
 * 纯 reducer：只接受带单调 sequence 的原始停止原因，冻结首个 primary trigger。
 * process close 的 exit/signal 不是 primary trigger。
 */

export type PrimaryTerminationTriggerKindV2 =
  | 'aborted'
  | 'timeout'
  | 'stdout-limit'
  | 'stderr-limit'
  | 'consumer-stop'
  | 'consumer-invalid';

export interface PrimaryTerminationTriggerEventV2 {
  readonly sequence: number;
  readonly kind: PrimaryTerminationTriggerKindV2;
}

export interface PrimaryTerminationTriggerStateV2 {
  readonly frozen: PrimaryTerminationTriggerKindV2 | undefined;
  readonly lastSequence: number;
}

export function createPrimaryTerminationTriggerStateV2(): PrimaryTerminationTriggerStateV2 {
  return Object.freeze({ frozen: undefined, lastSequence: -1 });
}

/**
 * 接受下一事件；sequence 必须严格递增，否则忽略。
 * 已冻结后不再改写。
 */
export function reducePrimaryTerminationTriggerV2(
  state: PrimaryTerminationTriggerStateV2,
  event: PrimaryTerminationTriggerEventV2,
): PrimaryTerminationTriggerStateV2 {
  if (
    !Number.isSafeInteger(event.sequence) ||
    event.sequence <= state.lastSequence
  ) {
    return state;
  }
  if (state.frozen !== undefined) {
    return Object.freeze({
      frozen: state.frozen,
      lastSequence: event.sequence,
    });
  }
  return Object.freeze({
    frozen: event.kind,
    lastSequence: event.sequence,
  });
}
