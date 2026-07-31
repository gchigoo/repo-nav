import type { BackendExecutionOutcomeV2 } from '../../../src/contracts/v2/backend-execution-outcome-v2.js';

export const COMPLETE_RIPGREP_V2: BackendExecutionOutcomeV2 = Object.freeze({
  backend: 'ripgrep',
  status: 'used',
  completion: 'complete',
  selectionEligibility: 'complete-safe-set',
  termination: 'none',
  reasonCode: 'RIPGREP_NO_RESULT',
  hitCount: 0,
  retainedHits: Object.freeze([]),
});

export const EARLY_STOP_RIPGREP_V2: BackendExecutionOutcomeV2 = Object.freeze({
  backend: 'ripgrep',
  status: 'used',
  completion: 'incomplete',
  selectionEligibility: 'telemetry-only',
  termination: 'early-stop',
  hitCount: 2,
  retainedHits: Object.freeze([
    {
      file: 'a.ts',
      source: 'ripgrep' as const,
      reasonCodes: ['LITERAL_TERM_HIT' as const],
    },
    {
      file: 'b.ts',
      source: 'ripgrep' as const,
      reasonCodes: ['LITERAL_TERM_HIT' as const],
    },
  ]),
});

export const UNAVAILABLE_CODEGRAPH_V2: BackendExecutionOutcomeV2 = Object.freeze({
  backend: 'codegraph',
  status: 'unavailable',
  completion: 'incomplete',
  selectionEligibility: 'telemetry-only',
  termination: 'none',
  reasonCode: 'CODEGRAPH_INDEX_MISSING',
  hitCount: 0,
  retainedHits: Object.freeze([]) as readonly [],
});
