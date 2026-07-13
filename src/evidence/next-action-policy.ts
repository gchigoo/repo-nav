import {
  LOCATE_LIMIT_MAXIMUMS,
  NEXT_ACTION_CODES,
  type LimitReasonCode,
  type LocateStatus,
  type NextActionCode,
  type ResolvedLocateLimits,
} from '../contracts/index.js';
import type { LocateAbortSource } from './abort-source.js';

export interface NextActionPolicyInput {
  readonly status: LocateStatus;
  readonly hasCandidates: boolean;
  readonly limitsReached: readonly LimitReasonCode[];
  readonly abortSource: LocateAbortSource;
  readonly limits: ResolvedLocateLimits;
  readonly initializeCodeGraph?: boolean;
}

function schemaOrder(values: readonly NextActionCode[]): readonly NextActionCode[] {
  const present = new Set(values);
  return Object.freeze(NEXT_ACTION_CODES.filter((code) => present.has(code)));
}

function hasAdjustableRetry(input: NextActionPolicyInput): boolean {
  return (
    (input.limitsReached.includes('MAX_FILES_REACHED') &&
      input.limits.maxFiles < LOCATE_LIMIT_MAXIMUMS.maxFiles) ||
    (input.limitsReached.includes('MAX_CONFIRMED_REACHED') &&
      input.limits.maxConfirmed < LOCATE_LIMIT_MAXIMUMS.maxConfirmed) ||
    (input.limitsReached.includes('MAX_CANDIDATES_REACHED') &&
      input.limits.maxCandidates < LOCATE_LIMIT_MAXIMUMS.maxCandidates)
  );
}

export function createNextActions(
  input: NextActionPolicyInput,
): readonly NextActionCode[] {
  const actions: NextActionCode[] = [];
  if (input.status === 'no_result') {
    actions.push('ADD_TERM', 'ADD_SYMBOL_ANCHOR');
  }
  if (input.hasCandidates) {
    actions.push('CONFIRM_CANDIDATE');
  }
  if (
    input.initializeCodeGraph === true &&
    (input.status === 'no_result' || input.status === 'backend_unavailable')
  ) {
    actions.push('INITIALIZE_CODEGRAPH');
  }
  if (
    (input.status === 'partial' && hasAdjustableRetry(input)) ||
    (input.status === 'timeout' &&
      input.abortSource === 'deadline' &&
      input.limits.timeoutMs < LOCATE_LIMIT_MAXIMUMS.timeoutMs)
  ) {
    actions.push('RETRY_WITH_HIGHER_LIMIT');
  }
  return schemaOrder(actions);
}
