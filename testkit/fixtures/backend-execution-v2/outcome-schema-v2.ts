import type { BackendExecutionOutcomeV2 } from '../../../src/contracts/v2/backend-execution-outcome-v2.js';

export const VALID_COMPLETE_ZERO_V2: BackendExecutionOutcomeV2 = Object.freeze({
  backend: 'ripgrep',
  status: 'used',
  completion: 'complete',
  selectionEligibility: 'complete-safe-set',
  termination: 'none',
  reasonCode: 'RIPGREP_NO_RESULT',
  hitCount: 0,
  retainedHits: Object.freeze([]),
});

export const VALID_EARLY_STOP_V2: BackendExecutionOutcomeV2 = Object.freeze({
  backend: 'ripgrep',
  status: 'used',
  completion: 'incomplete',
  selectionEligibility: 'telemetry-only',
  termination: 'early-stop',
  hitCount: 1,
  retainedHits: Object.freeze([
    {
      file: 'a.ts',
      source: 'ripgrep' as const,
      reasonCodes: ['LITERAL_TERM_HIT' as const],
    },
  ]),
});
