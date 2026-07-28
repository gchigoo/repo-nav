import type {
  BackendExecutionOutcomeV2,
  BackendExecutionTelemetryViewV2,
  DistributiveOmitV2,
} from '../../src/contracts/v2/backend-execution-outcome-v2.js';

type Stripped = DistributiveOmitV2<
  BackendExecutionOutcomeV2,
  'retainedHits' | 'selectionEligibility'
>;

type AssertExact<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;

const _exact: AssertExact<Stripped, BackendExecutionTelemetryViewV2> = true;
void _exact;

type UsedComplete = Extract<
  BackendExecutionTelemetryViewV2,
  { status: 'used'; completion: 'complete' }
>;
type Aborted = Extract<
  BackendExecutionTelemetryViewV2,
  { termination: 'aborted' }
>;
type Failed = Extract<BackendExecutionTelemetryViewV2, { status: 'failed' }>;
type Unavailable = Extract<
  BackendExecutionTelemetryViewV2,
  { status: 'unavailable' }
>;

const usedComplete: UsedComplete = {
  backend: 'ripgrep',
  status: 'used',
  completion: 'complete',
  termination: 'none',
  reasonCode: 'RIPGREP_NO_RESULT',
  hitCount: 0,
};
const aborted: Aborted = {
  backend: 'ripgrep',
  status: 'used',
  completion: 'incomplete',
  termination: 'aborted',
  reasonCode: 'BACKEND_ABORTED',
  hitCount: 0,
};
const failed: Failed = {
  backend: 'ripgrep',
  status: 'failed',
  completion: 'incomplete',
  termination: 'process-error',
  reasonCode: 'BACKEND_PROCESS_FAILED',
  hitCount: 0,
};
const unavailable: Unavailable = {
  backend: 'ripgrep',
  status: 'unavailable',
  completion: 'incomplete',
  termination: 'none',
  reasonCode: 'RIPGREP_UNAVAILABLE',
  hitCount: 0,
};

void usedComplete;
void aborted;
void failed;
void unavailable;

export {};
