import type {
  BackendHealth,
  LimitReasonCode,
  LocateStatus,
} from '../contracts/index.js';
import type { LocateAbortSource } from './abort-source.js';

export const LOCATE_TRANSITION_ROW_IDS = Object.freeze([
  'invalid-input',
  'invalid-repository',
  'path-outside-root',
  'internal-error',
  'caller-abort',
  'internal-deadline',
  'backend-unavailable',
  'coverage-gap',
  'verified-evidence',
  'verified-no-result',
] as const);

export type LocateTransitionRowId =
  (typeof LOCATE_TRANSITION_ROW_IDS)[number];

export interface LocateStatusEvaluationInput {
  readonly abortSource: LocateAbortSource;
  readonly finalBackendHealth: BackendHealth;
  readonly strategyComplete: boolean;
  readonly evidenceCount: number;
  readonly limitsReached: readonly LimitReasonCode[];
}

export interface LocateStatusEvaluation {
  readonly status: LocateStatus;
  readonly rowId: LocateTransitionRowId;
}

export function evaluateLocateStatus(
  input: LocateStatusEvaluationInput,
): LocateStatusEvaluation {
  if (input.abortSource === 'caller') {
    return Object.freeze({ status: 'timeout', rowId: 'caller-abort' });
  }
  if (input.abortSource === 'deadline') {
    return Object.freeze({ status: 'timeout', rowId: 'internal-deadline' });
  }
  if (
    input.evidenceCount === 0 &&
    input.strategyComplete === false &&
    input.finalBackendHealth.state !== 'available'
  ) {
    return Object.freeze({
      status: 'backend_unavailable',
      rowId: 'backend-unavailable',
    });
  }
  if (
    input.strategyComplete === false ||
    input.limitsReached.length > 0 ||
    input.finalBackendHealth.state !== 'available'
  ) {
    return Object.freeze({ status: 'partial', rowId: 'coverage-gap' });
  }
  return input.evidenceCount > 0
    ? Object.freeze({ status: 'ok', rowId: 'verified-evidence' })
    : Object.freeze({ status: 'no_result', rowId: 'verified-no-result' });
}
