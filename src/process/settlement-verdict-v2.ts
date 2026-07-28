import type { PrimaryTerminationTriggerKindV2 } from './primary-termination-trigger-reducer-v2.js';

/**
 * Settlement 优先级：
 * cleanup-invariant > consumer-invalid(finalizer) > frozen primary > process-exit > completed
 */

export type SettlementVerdictKindV2 =
  | 'cleanup-invariant'
  | 'consumer-invalid'
  | PrimaryTerminationTriggerKindV2
  | 'process-exit'
  | 'completed';

export interface ProcessCloseCandidateV2 {
  readonly exitCode: number | null;
  readonly signal: string | null;
}

export interface SettlementInputsV2 {
  readonly cleanupFailed: boolean;
  readonly finalizerInvalid: boolean;
  readonly primary: PrimaryTerminationTriggerKindV2 | undefined;
  readonly close: ProcessCloseCandidateV2 | undefined;
}

export function isLegalCompletedExitPairV2(
  close: ProcessCloseCandidateV2,
): close is Readonly<{ exitCode: number; signal: null }> {
  return (
    close.signal === null &&
    typeof close.exitCode === 'number' &&
    Number.isSafeInteger(close.exitCode) &&
    close.exitCode >= 0
  );
}

/**
 * 归约最终 settlement kind（不含 stdout payload 选择）。
 */
export function reduceSettlementVerdictV2(
  inputs: SettlementInputsV2,
): SettlementVerdictKindV2 {
  if (inputs.cleanupFailed) {
    return 'cleanup-invariant';
  }
  if (inputs.finalizerInvalid) {
    return 'consumer-invalid';
  }
  if (inputs.primary !== undefined) {
    return inputs.primary;
  }
  if (inputs.close === undefined) {
    return 'process-exit';
  }
  if (!isLegalCompletedExitPairV2(inputs.close)) {
    return 'process-exit';
  }
  return 'completed';
}
