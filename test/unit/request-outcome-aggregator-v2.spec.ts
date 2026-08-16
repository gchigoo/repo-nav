import { describe, expect, it } from 'vitest';

import { createLocateExecutionFactsV2 } from '../../src/contracts/v2/locate-execution-facts-v2.js';
import { finalizeLocateResultV2 } from '../../src/evidence/locate-execution/finalize-locate-result-v2.js';
import { locateExecutionFinalizerInputFromUnsafePublicSourceV2 } from '../../testkit/fixtures/locate-execution-v2/finalizer-facts-v2.js';
import { createUnsafeLocateSuccessV2 } from '../../testkit/fixtures/public-output-v2/synthetic-locate-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

function selected(caseId: string): boolean {
  return isSelected({ group: 'input-abort-contract-v2', caseId });
}

function finalizeRawV2(raw: ReturnType<typeof createUnsafeLocateSuccessV2>) {
  return finalizeLocateResultV2(
    locateExecutionFinalizerInputFromUnsafePublicSourceV2(raw),
  ).value;
}

describe.runIf(selected('aggregator-owner-direct-integration'))(
  'pure finalizer integration',
  () => {
    it('derives the complete public result from the six canonical fact families', () => {
      const input = locateExecutionFinalizerInputFromUnsafePublicSourceV2(
        createUnsafeLocateSuccessV2(),
      );
      if (!input.ok) throw new Error('Expected success facts.');
      expect(Object.keys(input.facts).sort()).toEqual(
        [
          'abort',
          'backend',
          'capability',
          'ranking',
          'scope',
          'snapshot',
        ].sort(),
      );
      expect(finalizeLocateResultV2(input).value).toMatchObject({
        ok: true,
        evidence: { schemaVersion: '2.0', status: 'ok' },
      });
    });
  },
);

describe.runIf(selected('backend-attempt-aggregation'))(
  'backend attempt derivation',
  () => {
    it('sorts attempts and derives fallback and strategy completeness', () => {
      const raw = structuredClone(createUnsafeLocateSuccessV2());
      if (!raw.ok) throw new Error('Expected success fixture.');
      Object.assign(raw.evidence.coverage, {
        backends: [
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
      });
      const result = finalizeRawV2(raw);
      if (!result.ok) throw new Error('Expected success.');
      expect(
        result.evidence.coverage.backends.map((row) => row.backend),
      ).toEqual(['codegraph', 'ripgrep']);
      expect(result.evidence.coverage.fallbackChecked).toBe(true);
      expect(result.evidence.coverage.strategyComplete).toBe(true);
    });
  },
);

describe.runIf(selected('contribution-trust'))('fact-family trust', () => {
  it('rejects facts containing a second decision authority', () => {
    const input = locateExecutionFinalizerInputFromUnsafePublicSourceV2(
      createUnsafeLocateSuccessV2(),
    );
    if (!input.ok) throw new Error('Expected success facts.');
    expect(() =>
      createLocateExecutionFactsV2({
        ...input.facts,
        nextActions: ['ADD_TERM'],
      } as never),
    ).toThrow(/unsupported field/u);
  });
});

describe.runIf(selected('index-observation-matrix'))(
  'index observation derivation',
  () => {
    it('preserves each canonical index state and freshness pair', () => {
      for (const [state, freshness] of [
        ['available', 'not-applicable'],
        ['missing', 'unknown'],
        ['unavailable', 'unknown'],
        ['error', 'possibly-stale'],
        ['unknown', 'unknown'],
      ] as const) {
        const raw = structuredClone(createUnsafeLocateSuccessV2());
        if (!raw.ok) throw new Error('Expected success fixture.');
        Object.assign(raw.evidence.coverage, {
          indexState: state,
          indexFreshness: freshness,
        });
        const result = finalizeRawV2(raw);
        if (!result.ok) throw new Error('Expected success.');
        expect(result.evidence.coverage).toMatchObject({
          indexState: state,
          indexFreshness: freshness,
        });
      }
    });
  },
);

describe.runIf(selected('next-action-policy'))('next action derivation', () => {
  it('derives no-result and initialization actions canonically', () => {
    const raw = structuredClone(createUnsafeLocateSuccessV2());
    if (!raw.ok) throw new Error('Expected success fixture.');
    Object.assign(raw.evidence, { confirmed: [], candidates: [] });
    Object.assign(raw.evidence, {
      nextActions: ['ADD_TERM', 'ADD_SYMBOL_ANCHOR', 'INITIALIZE_CODEGRAPH'],
    });
    Object.assign(raw.evidence.coverage, {
      backends: [
        {
          backend: 'codegraph',
          status: 'used',
          completion: 'complete',
          termination: 'none',
          hitCount: 0,
        },
      ],
    });
    const result = finalizeRawV2(raw);
    if (!result.ok) throw new Error('Expected success.');
    expect(result.evidence.status).toBe('no_result');
    expect(result.evidence.nextActions).toEqual([
      'ADD_TERM',
      'ADD_SYMBOL_ANCHOR',
      'INITIALIZE_CODEGRAPH',
    ]);
  });
});

describe.runIf(selected('public-materialization-order'))(
  'public materialization order',
  () => {
    it('materializes confirmed before candidates with continuous IDs', () => {
      const raw = structuredClone(createUnsafeLocateSuccessV2());
      if (!raw.ok) throw new Error('Expected success fixture.');
      Object.assign(raw.evidence, {
        candidates: [
          {
            evidenceClass: 'candidate',
            role: 'reference',
            location: {
              file: 'src/candidate.ts',
              lines: [1, 1],
              excerpt: 'candidate',
            },
            provenance: {
              discoveredBy: ['ripgrep'],
              verifiedBy: 'filesystem',
              operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
            },
            reasonCodes: ['SECONDARY_BACKEND_HIT'],
            promotionRequirements: ['DIRECT_REFERENCE_REQUIRED'],
          },
        ],
      });
      Object.assign(raw.evidence.coverage.snapshot, { filesChecked: 2 });
      const result = finalizeRawV2(raw);
      if (!result.ok) throw new Error('Expected success.');
      expect(result.evidence.confirmed[0]?.id).toBe('evidence:v2:0001');
      expect(result.evidence.candidates[0]?.id).toBe('evidence:v2:0002');
    });
  },
);

describe.runIf(selected('status-priority'))('status priority', () => {
  it('keeps caller cancellation and deadline timeout above other states', () => {
    for (const [abortSource, expected] of [
      ['caller', 'cancelled'],
      ['deadline', 'timeout'],
    ] as const) {
      const raw = structuredClone(createUnsafeLocateSuccessV2());
      if (!raw.ok) throw new Error('Expected success fixture.');
      Object.assign(raw.evidence.coverage, { abortSource });
      const result = finalizeRawV2(raw);
      if (!result.ok) throw new Error('Expected success.');
      expect(result.evidence.status).toBe(expected);
    }
  });
});

describe.runIf(selected('strategy-completeness'))(
  'strategy completeness',
  () => {
    it('uses the completed ripgrep fallback as the final strategy authority', () => {
      const raw = structuredClone(createUnsafeLocateSuccessV2());
      if (!raw.ok) throw new Error('Expected success fixture.');
      Object.assign(raw.evidence.coverage, {
        backends: [
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
      });
      const result = finalizeRawV2(raw);
      if (!result.ok) throw new Error('Expected success.');
      expect(result.evidence.coverage).toMatchObject({
        fallbackChecked: true,
        strategyComplete: true,
      });
    });
  },
);
