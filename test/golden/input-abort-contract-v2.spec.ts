import { describe, expect, it } from 'vitest';

import { V1LocateResultProjector } from '../../src/evidence/locate-execution/v1-locate-result-projector.js';
import { aggregateRequestOutcomeV2 } from '../../src/evidence/request-outcome/request-outcome-aggregator-v2.js';
import { countF2CoreAccessorProductionImportersV2 } from '../../src/evidence/public-output/f2-locate-projection-stages-v2.js';
import {
  createEmptyCanonicalSuccessInputV2,
  createFourPrerequisiteCanonicalInputV2,
} from '../../testkit/fixtures/canonical-locate-bridge-v2/four-prerequisite-base-v2.js';
import { buildAggregationHarnessV2 } from '../../testkit/fixtures/request-outcome-v2/build-aggregation-harness-v2.js';
import {
  V1_COMPATIBILITY_CASES_V2,
  V1_SHADOW_FAILURE_CLASSES_V2,
} from '../../testkit/fixtures/request-outcome-v2/v1-compatibility-v2.js';
import { assertV1ShadowFailClosedV2 } from '../../testkit/testing/assert-v1-shadow-fail-closed-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'v1-compatibility',
  }),
)('F6-V1-001 v1-compatibility', () => {
  it('proves exact legacy reference and shadow-fail-closed per failure class', async () => {
    expect(V1_COMPATIBILITY_CASES_V2).toContain('shadow-fail-closed');
    expect(V1_COMPATIBILITY_CASES_V2).toContain('exact-legacy-reference');
    expect(V1_SHADOW_FAILURE_CLASSES_V2).toHaveLength(7);

    const four = createFourPrerequisiteCanonicalInputV2();
    const empty = createEmptyCanonicalSuccessInputV2();
    const projector = new V1LocateResultProjector();
    const baseline = projector.project(four.input, four.capability);
    expect(baseline).toBe(four.input.legacyV1Projection);
    expect(baseline).toEqual(four.input.legacyV1Projection);

    assertV1ShadowFailClosedV2({
      input: four.input,
      capability: four.capability,
      finalizerInput: {
        input: empty.input,
        capability: empty.capability,
      },
    });

    const callerHarness = await buildAggregationHarnessV2({
      abortBeforeClose: 'caller',
    });
    const aggregated = aggregateRequestOutcomeV2(callerHarness.input);
    expect(aggregated.statusV2).toBe('cancelled');
    expect(aggregated.requestOutcome.value.abortSource).toBe('caller');
    expect(aggregated.requestOutcome.value.limitsReached).not.toContain(
      'TIMEOUT_REACHED',
    );

    expect(countF2CoreAccessorProductionImportersV2()).toBe(0);
  });
});
