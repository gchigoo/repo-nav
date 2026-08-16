import { describe, expect, it } from 'vitest';

import { finalizeLocateResultV2 } from '../../src/evidence/locate-execution/finalize-locate-result-v2.js';
import { locateExecutionFinalizerInputFromUnsafePublicSourceV2 } from '../../testkit/fixtures/locate-execution-v2/finalizer-facts-v2.js';
import { createUnsafeLocateSuccessV2 } from '../../testkit/fixtures/public-output-v2/synthetic-locate-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'trusted-fallback-derivation',
  }),
)('fallback derivation from canonical backend facts', () => {
  it('derives fallbackChecked and strategyComplete without a decision registry', () => {
    for (const [backends, expected] of [
      [
        [
          {
            backend: 'codegraph',
            status: 'used',
            completion: 'complete',
            termination: 'none',
            hitCount: 1,
          },
        ],
        { fallbackChecked: false, strategyComplete: true },
      ],
      [
        [
          {
            backend: 'codegraph',
            status: 'used',
            completion: 'incomplete',
            termination: 'none',
            hitCount: 1,
          },
          {
            backend: 'ripgrep',
            status: 'used',
            completion: 'complete',
            termination: 'none',
            hitCount: 1,
          },
        ],
        { fallbackChecked: true, strategyComplete: true },
      ],
      [
        [
          {
            backend: 'codegraph',
            status: 'used',
            completion: 'incomplete',
            termination: 'none',
            hitCount: 1,
          },
          {
            backend: 'ripgrep',
            status: 'used',
            completion: 'incomplete',
            termination: 'output-limit',
            hitCount: 1,
          },
        ],
        { fallbackChecked: true, strategyComplete: false },
      ],
    ] as const) {
      const raw = structuredClone(createUnsafeLocateSuccessV2());
      if (!raw.ok) throw new Error('Expected success fixture.');
      Object.assign(raw.evidence.coverage, { backends });
      const result = finalizeLocateResultV2(
        locateExecutionFinalizerInputFromUnsafePublicSourceV2(raw),
      ).value;
      if (!result.ok) throw new Error('Expected success result.');
      expect(result.evidence.coverage).toMatchObject(expected);
    }
  });
});
