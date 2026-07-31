import {
  createPrimaryTerminationTriggerStateV2,
  reducePrimaryTerminationTriggerV2,
  type PrimaryTerminationTriggerKindV2,
} from '../../../src/process/primary-termination-trigger-reducer-v2.js';
import { reduceSettlementVerdictV2 } from '../../../src/process/settlement-verdict-v2.js';

/**
 * 注入式 terminal race：按给定顺序归约 primary + settlement。
 */
export function schedulePrimaryTriggersV2(
  kinds: readonly PrimaryTerminationTriggerKindV2[],
): PrimaryTerminationTriggerKindV2 | undefined {
  let state = createPrimaryTerminationTriggerStateV2();
  let sequence = 0;
  for (const kind of kinds) {
    sequence += 1;
    state = reducePrimaryTerminationTriggerV2(state, { sequence, kind });
  }
  return state.frozen;
}

export function settlementForRaceV2(input: {
  readonly cleanupFailed: boolean;
  readonly finalizerInvalid: boolean;
  readonly primary: PrimaryTerminationTriggerKindV2 | undefined;
  readonly exitCode: number | null;
  readonly signal: string | null;
}): string {
  return reduceSettlementVerdictV2({
    cleanupFailed: input.cleanupFailed,
    finalizerInvalid: input.finalizerInvalid,
    primary: input.primary,
    close: { exitCode: input.exitCode, signal: input.signal },
  });
}
