import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  aggregateRequestOutcomeV2,
  describeFutureF8AggregationMountAbiV2,
  requireRequestOutcomeAggregationProofV2,
} from '../../src/evidence/request-outcome/request-outcome-aggregator-v2.js';
import { countF2CoreAccessorProductionImportersV2 } from '../../src/evidence/public-output/f2-locate-projection-stages-v2.js';
import { AGGREGATOR_OWNER_DIRECT_INTEGRATION_V2 } from '../../testkit/fixtures/request-outcome-v2/aggregator-owner-direct-integration-v2.js';
import {
  COMPLETE_RIPGREP_V2,
  EARLY_STOP_RIPGREP_V2,
  UNAVAILABLE_CODEGRAPH_V2,
} from '../../testkit/fixtures/request-outcome-v2/backend-outcomes-v2.js';
import { buildAggregationHarnessV2 } from '../../testkit/fixtures/request-outcome-v2/build-aggregation-harness-v2.js';
import { CONTRIBUTION_MUTATIONS_V2 } from '../../testkit/fixtures/request-outcome-v2/contribution-mutations-v2.js';
import { INDEX_OBSERVATION_MATRIX_V2 } from '../../testkit/fixtures/request-outcome-v2/index-observations-v2.js';
import { MATERIALIZATION_CASES_V2 } from '../../testkit/fixtures/request-outcome-v2/materialization-v2.js';
import { NEXT_ACTION_POLICY_CASES_V2 } from '../../testkit/fixtures/request-outcome-v2/next-action-policy-v2.js';
import { STATUS_PRIORITY_CASES_V2 } from '../../testkit/fixtures/request-outcome-v2/status-priority-v2.js';
import { STRATEGY_COMPLETENESS_CASES_V2 } from '../../testkit/fixtures/request-outcome-v2/strategy-completeness-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'backend-attempt-aggregation',
  }),
)('F6-ATTEMPT-001 backend-attempt-aggregation', () => {
  it('maps F5 telemetry attempts in start order without retainedHits', async () => {
    const harness = await buildAggregationHarnessV2({
      outcomes: [UNAVAILABLE_CODEGRAPH_V2, COMPLETE_RIPGREP_V2],
      fallback: {
        checked: true,
        required: true,
        completeEquivalentFallback: true,
      },
    });
    const aggregated = aggregateRequestOutcomeV2(harness.input);
    expect(aggregated.backend.value.outcomes).toHaveLength(2);
    expect(aggregated.backend.value.outcomes[0]?.backend).toBe('codegraph');
    expect(aggregated.backend.value.outcomes[1]?.backend).toBe('ripgrep');
    expect(aggregated.backend.value.outcomes[0]).not.toHaveProperty(
      'retainedHits',
    );
    expect(aggregated.backend.value.outcomes[0]).not.toHaveProperty(
      'selectionEligibility',
    );
  });
});

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'index-observation-matrix',
  }),
)('F6-INDEX-001 index-observation-matrix', () => {
  it('maps all six CodeGraph observations to fixed index matrix', async () => {
    for (const row of INDEX_OBSERVATION_MATRIX_V2) {
      const harness = await buildAggregationHarnessV2({
        observation: row.observation,
      });
      const aggregated = aggregateRequestOutcomeV2(harness.input);
      expect(aggregated.backend.value.indexState).toBe(row.indexState);
      expect(aggregated.backend.value.indexFreshness).toBe(row.indexFreshness);
    }
  });
});

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'strategy-completeness',
  }),
)('F6-STRATEGY-001 strategy-completeness', () => {
  it('derives strategyComplete from primary/fallback truth table', async () => {
    expect(STRATEGY_COMPLETENESS_CASES_V2.length).toBe(3);
    const complete = await buildAggregationHarnessV2({
      outcomes: [COMPLETE_RIPGREP_V2],
      fallback: {
        checked: false,
        required: false,
        completeEquivalentFallback: false,
      },
    });
    expect(
      aggregateRequestOutcomeV2(complete.input).requestOutcome.value
        .strategyComplete,
    ).toBe(true);

    const equivalent = await buildAggregationHarnessV2({
      outcomes: [EARLY_STOP_RIPGREP_V2],
      fallback: {
        checked: true,
        required: true,
        completeEquivalentFallback: true,
      },
    });
    expect(
      aggregateRequestOutcomeV2(equivalent.input).requestOutcome.value
        .strategyComplete,
    ).toBe(true);

    const incomplete = await buildAggregationHarnessV2({
      outcomes: [EARLY_STOP_RIPGREP_V2],
      fallback: {
        checked: true,
        required: true,
        completeEquivalentFallback: false,
      },
    });
    expect(
      aggregateRequestOutcomeV2(incomplete.input).requestOutcome.value
        .strategyComplete,
    ).toBe(false);
  });
});

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'contribution-trust',
  }),
)('F6-CONTRIB-001 contribution-trust', () => {
  it('rejects contribution identity/order mutations before reading values', async () => {
    expect(CONTRIBUTION_MUTATIONS_V2).toContain('clone');
    const harness = await buildAggregationHarnessV2({});
    const cloned = Object.freeze({
      ...harness.input.contributions[0],
    });
    expect(() =>
      aggregateRequestOutcomeV2({
        ...harness.input,
        contributions: [
          cloned as typeof harness.input.contributions[0],
          harness.input.contributions[1],
          harness.input.contributions[2],
        ],
      }),
    ).toThrow(/identity mismatch|arity mismatch|SCOPE_COVERAGE_INVARIANT/);
  });
});

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'public-materialization-order',
  }),
)('F6-MATERIALIZE-001 public-materialization-order', () => {
  it('consumes F1 locationRedacted without importing F2 core accessor', async () => {
    expect(MATERIALIZATION_CASES_V2).toContain('core-contribution-identity');
    const harness = await buildAggregationHarnessV2({});
    const aggregated = aggregateRequestOutcomeV2(harness.input);
    expect(
      aggregated.requestOutcome.value.degradations.includes('LOCATION_REDACTED'),
    ).toBe(harness.input.contributions[0].locationRedacted);
    expect(countF2CoreAccessorProductionImportersV2()).toBe(0);
  });
});

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'status-priority',
  }),
)('F6-STATUS-001 status-priority', () => {
  it('derives cancelled/timeout/no_result with unique priority', async () => {
    expect(STATUS_PRIORITY_CASES_V2).toContain('caller-cancelled');
    const cancelled = await buildAggregationHarnessV2({
      abortBeforeClose: 'caller',
      outcomes: [COMPLETE_RIPGREP_V2],
    });
    expect(aggregateRequestOutcomeV2(cancelled.input).statusV2).toBe(
      'cancelled',
    );
    expect(
      aggregateRequestOutcomeV2(cancelled.input).requestOutcome.value
        .limitsReached,
    ).not.toContain('TIMEOUT_REACHED');

    const deadline = await buildAggregationHarnessV2({
      abortBeforeClose: 'deadline',
    });
    expect(aggregateRequestOutcomeV2(deadline.input).statusV2).toBe('timeout');
    expect(
      aggregateRequestOutcomeV2(deadline.input).requestOutcome.value
        .limitsReached,
    ).toContain('TIMEOUT_REACHED');

    const noResult = await buildAggregationHarnessV2({
      outcomes: [COMPLETE_RIPGREP_V2],
      fallback: {
        checked: false,
        required: false,
        completeEquivalentFallback: false,
      },
    });
    expect(aggregateRequestOutcomeV2(noResult.input).statusV2).toBe(
      'no_result',
    );
  });
});

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'next-action-policy',
  }),
)('F6-NEXT-001 next-action-policy', () => {
  it('limits cancelled actions and deadline retry policy', async () => {
    expect(NEXT_ACTION_POLICY_CASES_V2).toContain('cancelled-candidate-only');
    const cancelled = await buildAggregationHarnessV2({
      abortBeforeClose: 'caller',
    });
    expect(
      aggregateRequestOutcomeV2(cancelled.input).requestOutcome.value
        .nextActions,
    ).not.toContain('RETRY_WITH_HIGHER_LIMIT');

    const deadline = await buildAggregationHarnessV2({
      abortBeforeClose: 'deadline',
      limits: {
        maxFiles: 10,
        maxConfirmed: 10,
        maxCandidates: 10,
        timeoutMs: 5_000,
      },
    });
    expect(
      aggregateRequestOutcomeV2(deadline.input).requestOutcome.value
        .nextActions,
    ).toContain('RETRY_WITH_HIGHER_LIMIT');
  });
});

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'aggregator-owner-direct-integration',
  }),
)('F6-ENVELOPE-001 aggregator-owner-direct-integration', () => {
  it('produces backend/request-outcome/status/proof once with importer=0', async () => {
    expect(AGGREGATOR_OWNER_DIRECT_INTEGRATION_V2).toContain('status-proof');
    const harness = await buildAggregationHarnessV2({
      outcomes: [COMPLETE_RIPGREP_V2],
    });
    const aggregated = aggregateRequestOutcomeV2(harness.input);
    const proof = requireRequestOutcomeAggregationProofV2(
      aggregated.proof,
      harness.execution,
    );
    expect(proof.backend).toBe(aggregated.backend.value);
    expect(proof.requestOutcome).toBe(aggregated.requestOutcome.value);
    expect(proof.statusV2).toBe(aggregated.statusV2);
    expect(countF2CoreAccessorProductionImportersV2()).toBe(0);
    const registrarHits = [
      'src/evidence/repository-evidence-engine.ts',
      'src/mcp/repo-nav-mcp-server.ts',
      'tools/cli/execute.ts',
    ].filter((relative) => {
      const source = readFileSync(resolve(process.cwd(), relative), 'utf8');
      return source.includes('registerCompleteLocateFactEnvelopeV2');
    });
    expect(registrarHits).toEqual([]);
    expect(describeFutureF8AggregationMountAbiV2().productionCoreAccessorOwner).toBe(
      'F8',
    );
  });
});
