import { describe, expect, it } from 'vitest';

import { finalizeLocateResultV2 } from '../../src/evidence/locate-execution/finalize-locate-result-v2.js';
import {
  LOCATE_EXECUTION_FACT_FAMILIES_V2,
  createLocateExecutionFactsV2,
} from '../../src/contracts/v2/locate-execution-facts-v2.js';
import { locateExecutionFinalizerInputFromUnsafePublicSourceV2 } from '../../testkit/fixtures/locate-execution-v2/finalizer-facts-v2.js';
import { createUnsafeLocateSuccessV2 } from '../../testkit/fixtures/public-output-v2/synthetic-locate-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'v1-compatibility',
  }),
)('canonical v2 authority compatibility', () => {
  it('keeps public behavior stable while rejecting schema-1 decision fields', () => {
    const input = locateExecutionFinalizerInputFromUnsafePublicSourceV2(
      createUnsafeLocateSuccessV2(),
    );
    if (!input.ok) throw new Error('Expected success facts.');
    expect(Object.keys(input.facts).sort()).toEqual(
      [...LOCATE_EXECUTION_FACT_FAMILIES_V2].sort(),
    );
    expect(() =>
      createLocateExecutionFactsV2({
        ...input.facts,
        strategyComplete: true,
      } as never),
    ).toThrow(/unsupported field/u);

    const transport = finalizeLocateResultV2(input);
    expect(transport.value).toMatchObject({
      ok: true,
      evidence: { schemaVersion: '2.0', status: 'ok' },
    });
    expect(transport.compactJson).toBe(JSON.stringify(transport.value));
  });
});
