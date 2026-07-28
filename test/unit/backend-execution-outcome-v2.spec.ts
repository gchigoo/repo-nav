import { describe, expect, it } from 'vitest';

import type { LocateExecutionTokenV2 } from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import {
  createBackendExecutionContextV2,
  requireBackendExecutionOutcomeV2,
  signBackendExecutionOutcomeForFactsV2,
} from '../../src/process/backend-execution-context-v2.js';
import { createProcessOpaqueTokenV2 } from '../../src/process/opaque-token-v2.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import {
  VALID_COMPLETE_ZERO_V2,
  VALID_EARLY_STOP_V2,
} from '../../testkit/fixtures/backend-execution-v2/outcome-schema-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({ group: 'streaming-ripgrep', caseId: 'outcome-schema' }),
)('F5-OUTCOME-001 outcome schema', () => {
  it('signs strict outcomes and rejects hitCount mismatch', () => {
    const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
    const context = createBackendExecutionContextV2(
      new NodeSafeProcessRunner(),
      undefined,
      new AbortController().signal,
      execution,
    );
    const complete = signBackendExecutionOutcomeForFactsV2(
      VALID_COMPLETE_ZERO_V2,
      context,
      execution,
    );
    expect(complete.hitCount).toBe(0);
    const early = signBackendExecutionOutcomeForFactsV2(
      VALID_EARLY_STOP_V2,
      context,
      execution,
    );
    expect(early.selectionEligibility).toBe('telemetry-only');
    expect(() =>
      signBackendExecutionOutcomeForFactsV2(
        {
          backend: 'ripgrep',
          status: 'used',
          completion: 'incomplete',
          selectionEligibility: 'telemetry-only',
          termination: 'early-stop',
          hitCount: 99,
          retainedHits: VALID_EARLY_STOP_V2.retainedHits,
        },
        context,
        execution,
      ),
    ).toThrow(/hitCount/u);
    void requireBackendExecutionOutcomeV2;
  });
});
