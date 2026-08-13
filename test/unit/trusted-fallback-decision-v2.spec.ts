/**
 * A3 fix round 1 — Important 1: trusted fallback derivation must read the
 * ordered backend trace, not just the first outcome. A complete CodeGraph
 * outcome that was followed by an actually-run Ripgrep fallback proves the
 * fallback was required by canonical execution; complete-equivalence holds only
 * when that required Ripgrep fallback itself completed.
 */

import { describe, expect, it } from 'vitest';

import type { BackendExecutionOutcomeV2 } from '../../src/contracts/v2/backend-execution-outcome-v2.js';
import type { LocateExecutionTokenV2 } from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import { aggregateRequestOutcomeV2 } from '../../src/evidence/request-outcome/request-outcome-aggregator-v2.js';
import {
  deriveTrustedFallbackDecisionV2,
  requireTrustedFallbackDecisionV2,
} from '../../src/evidence/request-outcome/trusted-fallback-decision-v2.js';
import {
  createBackendExecutionContextV2,
  issueBackendExecutionTraceForHarnessV2,
} from '../../src/process/backend-execution-context-v2.js';
import { createProcessOpaqueTokenV2 } from '../../src/process/opaque-token-v2.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { buildAggregationHarnessV2 } from '../../testkit/fixtures/request-outcome-v2/build-aggregation-harness-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'streaming-ripgrep',
  caseId: 'trusted-fallback-derivation',
});

const CODEGRAPH_COMPLETE_NO_RESULT_V2: BackendExecutionOutcomeV2 =
  Object.freeze({
    backend: 'codegraph',
    status: 'used',
    completion: 'complete',
    selectionEligibility: 'complete-safe-set',
    termination: 'none',
    reasonCode: 'CODEGRAPH_NO_RESULT',
    hitCount: 0,
    retainedHits: Object.freeze([]),
  });

const CODEGRAPH_INCOMPLETE_V2: BackendExecutionOutcomeV2 = Object.freeze({
  backend: 'codegraph',
  status: 'used',
  completion: 'incomplete',
  selectionEligibility: 'telemetry-only',
  termination: 'early-stop',
  hitCount: 0,
  retainedHits: Object.freeze([]),
});

const RIPGREP_COMPLETE_V2: BackendExecutionOutcomeV2 = Object.freeze({
  backend: 'ripgrep',
  status: 'used',
  completion: 'complete',
  selectionEligibility: 'complete-safe-set',
  termination: 'none',
  reasonCode: 'RIPGREP_NO_RESULT',
  hitCount: 0,
  retainedHits: Object.freeze([]),
});

const RIPGREP_INCOMPLETE_V2: BackendExecutionOutcomeV2 = Object.freeze({
  backend: 'ripgrep',
  status: 'used',
  completion: 'incomplete',
  selectionEligibility: 'telemetry-only',
  termination: 'early-stop',
  hitCount: 0,
  retainedHits: Object.freeze([]),
});

const RIPGREP_UNAVAILABLE_V2: BackendExecutionOutcomeV2 = Object.freeze({
  backend: 'ripgrep',
  status: 'unavailable',
  completion: 'incomplete',
  selectionEligibility: 'telemetry-only',
  termination: 'none',
  reasonCode: 'RIPGREP_UNAVAILABLE',
  hitCount: 0,
  retainedHits: Object.freeze([]) as readonly [],
});

function deriveFor(
  outcomes: readonly BackendExecutionOutcomeV2[],
): ReturnType<typeof requireTrustedFallbackDecisionV2> {
  const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
  const context = createBackendExecutionContextV2(
    new NodeSafeProcessRunner(),
    undefined,
    new AbortController().signal,
    execution,
  );
  const trace = issueBackendExecutionTraceForHarnessV2({
    execution,
    context,
    outcomes,
    codegraphIndexObservation: { kind: 'not-observed' },
  });
  const decision = deriveTrustedFallbackDecisionV2({
    execution,
    backendTrace: trace,
  });
  return requireTrustedFallbackDecisionV2(decision, trace, execution);
}

describe.runIf(selected)(
  'A3-FALLBACK-001 trusted fallback derivation from ordered trace',
  () => {
    it('treats a complete no-result codegraph followed by a complete ripgrep as required and complete-equivalent', () => {
      const view = deriveFor([
        CODEGRAPH_COMPLETE_NO_RESULT_V2,
        RIPGREP_COMPLETE_V2,
      ]);
      expect(view.checked).toBe(true);
      expect(view.required).toBe(true);
      expect(view.completeEquivalentFallback).toBe(true);
    });

    it('does not become complete-equivalent when the ripgrep fallback after a complete codegraph is incomplete', () => {
      const view = deriveFor([
        CODEGRAPH_COMPLETE_NO_RESULT_V2,
        RIPGREP_INCOMPLETE_V2,
      ]);
      expect(view.checked).toBe(true);
      expect(view.required).toBe(true);
      expect(view.completeEquivalentFallback).toBe(false);
    });

    it('does not become complete-equivalent when the ripgrep fallback after a complete codegraph is unavailable', () => {
      const view = deriveFor([
        CODEGRAPH_COMPLETE_NO_RESULT_V2,
        RIPGREP_UNAVAILABLE_V2,
      ]);
      expect(view.checked).toBe(true);
      expect(view.required).toBe(true);
      expect(view.completeEquivalentFallback).toBe(false);
    });

    it('keeps a complete codegraph with no fallback run not-required', () => {
      const view = deriveFor([CODEGRAPH_COMPLETE_NO_RESULT_V2]);
      expect(view.checked).toBe(false);
      expect(view.required).toBe(false);
      expect(view.completeEquivalentFallback).toBe(false);
    });

    it('keeps an incomplete codegraph followed by a complete ripgrep complete-equivalent', () => {
      const view = deriveFor([CODEGRAPH_INCOMPLETE_V2, RIPGREP_COMPLETE_V2]);
      expect(view.checked).toBe(true);
      expect(view.required).toBe(true);
      expect(view.completeEquivalentFallback).toBe(true);
    });

    it('keeps an incomplete codegraph with no fallback run required but not checked', () => {
      const view = deriveFor([CODEGRAPH_INCOMPLETE_V2]);
      expect(view.checked).toBe(false);
      expect(view.required).toBe(true);
      expect(view.completeEquivalentFallback).toBe(false);
    });
  },
);

describe.runIf(selected)(
  'A3-FALLBACK-002 aggregator strategy from derived fallback facts',
  () => {
    it('remains strategy-incomplete when the required ripgrep fallback after a complete codegraph is incomplete', async () => {
      const harness = await buildAggregationHarnessV2({
        outcomes: [CODEGRAPH_COMPLETE_NO_RESULT_V2, RIPGREP_INCOMPLETE_V2],
      });
      const derived = deriveTrustedFallbackDecisionV2({
        execution: harness.execution,
        backendTrace: harness.input.backendTrace,
      });
      const aggregated = aggregateRequestOutcomeV2({
        ...harness.input,
        fallback: derived,
      });
      expect(aggregated.requestOutcome.value.fallbackChecked).toBe(true);
      expect(aggregated.requestOutcome.value.strategyComplete).toBe(false);
    });

    it('is strategy-complete when the required ripgrep fallback after a complete codegraph completed', async () => {
      const harness = await buildAggregationHarnessV2({
        outcomes: [CODEGRAPH_COMPLETE_NO_RESULT_V2, RIPGREP_COMPLETE_V2],
      });
      const derived = deriveTrustedFallbackDecisionV2({
        execution: harness.execution,
        backendTrace: harness.input.backendTrace,
      });
      const aggregated = aggregateRequestOutcomeV2({
        ...harness.input,
        fallback: derived,
      });
      expect(aggregated.requestOutcome.value.fallbackChecked).toBe(true);
      expect(aggregated.requestOutcome.value.strategyComplete).toBe(true);
    });

    it('keeps a complete codegraph with no fallback run strategy-complete through the primary branch', async () => {
      const harness = await buildAggregationHarnessV2({
        outcomes: [CODEGRAPH_COMPLETE_NO_RESULT_V2],
      });
      const derived = deriveTrustedFallbackDecisionV2({
        execution: harness.execution,
        backendTrace: harness.input.backendTrace,
      });
      const aggregated = aggregateRequestOutcomeV2({
        ...harness.input,
        fallback: derived,
      });
      expect(aggregated.requestOutcome.value.fallbackChecked).toBe(false);
      expect(aggregated.requestOutcome.value.strategyComplete).toBe(true);
    });
  },
);
