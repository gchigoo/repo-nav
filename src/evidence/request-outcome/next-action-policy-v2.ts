import {
  LOCATE_LIMIT_MAXIMUMS,
  type ResolvedLocateLimits,
} from '../../contracts/index.js';
import { NEXT_ACTION_CODES_V2 } from '../../contracts/v2/locate-result-v2.js';
import type { LocateAbortSource } from '../abort-source.js';
import type { LocateStatusV2 } from './locate-status-v2.js';

export type NextActionCodeV2 = (typeof NEXT_ACTION_CODES_V2)[number];

export interface NextActionPolicyInputV2 {
  readonly status: LocateStatusV2;
  readonly hasCandidates: boolean;
  readonly limitsReached: readonly string[];
  readonly abortSource: LocateAbortSource;
  readonly limits: ResolvedLocateLimits;
  readonly initializeCodeGraph?: boolean;
}

function schemaOrder(
  values: readonly NextActionCodeV2[],
): readonly NextActionCodeV2[] {
  const present = new Set(values);
  return Object.freeze(NEXT_ACTION_CODES_V2.filter((code) => present.has(code)));
}

function hasAdjustableRequestBudgetRetry(
  input: NextActionPolicyInputV2,
): boolean {
  return (
    (input.limitsReached.includes('MAX_FILES_REACHED') &&
      input.limits.maxFiles < LOCATE_LIMIT_MAXIMUMS.maxFiles) ||
    (input.limitsReached.includes('MAX_CONFIRMED_REACHED') &&
      input.limits.maxConfirmed < LOCATE_LIMIT_MAXIMUMS.maxConfirmed) ||
    (input.limitsReached.includes('MAX_CANDIDATES_REACHED') &&
      input.limits.maxCandidates < LOCATE_LIMIT_MAXIMUMS.maxCandidates)
  );
}

/**
 * F6 next-actions：cancelled 仅 candidate；deadline timeout 可调才 retry。
 */
export function createNextActionsV2(
  input: NextActionPolicyInputV2,
): readonly NextActionCodeV2[] {
  const actions: NextActionCodeV2[] = [];
  if (input.status === 'cancelled') {
    if (input.hasCandidates) {
      actions.push('CONFIRM_CANDIDATE');
    }
    return schemaOrder(actions);
  }
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
    (input.status === 'partial' && hasAdjustableRequestBudgetRetry(input)) ||
    (input.status === 'timeout' &&
      input.abortSource === 'deadline' &&
      input.limits.timeoutMs < LOCATE_LIMIT_MAXIMUMS.timeoutMs)
  ) {
    actions.push('RETRY_WITH_HIGHER_LIMIT');
  }
  return schemaOrder(actions);
}
