import { describe, expect, it } from 'vitest';

import {
  MATCH_PRIORITY_V2,
  comparePublicSafeOrderingKeyV2,
  buildPublicSafeOrderingKeyV2,
  ordinaryRoundRobinSelectV2,
  normalizeAnchorIntentsV2,
  classifyRecordPriorityV2,
} from '../../src/evidence/ranking/index.js';
import { createOpaqueTokenV2 } from '../../src/evidence/request-snapshot/opaque-token-v2.js';
import type { TrustedStableRecordViewV2 } from '../../src/evidence/request-snapshot/pre-ranking-evidence-pool-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

function record(
  file: string,
  lines: readonly [number, number] = [1, 1],
  bucket = createOpaqueTokenV2(),
): TrustedStableRecordViewV2 {
  const brand = createOpaqueTokenV2<TrustedStableRecordViewV2>();
  return Object.freeze({
    ...brand,
    recordRef: createOpaqueTokenV2(),
    fileBucketRef: bucket,
    draft: Object.freeze({
      evidenceClass: 'confirmed' as const,
      role: 'definition' as const,
      location: Object.freeze({
        file,
        lines: Object.freeze(lines),
        excerpt: file,
      }),
      provenance: Object.freeze({
        discoveredBy: Object.freeze(['filesystem' as const]),
        verifiedBy: 'filesystem' as const,
        operations: Object.freeze(['FILESYSTEM_READ_RANGE' as const]),
      }),
      reasonCodes: Object.freeze(['EXACT_TERM_MATCH'] as const),
    }),
    rankingSignals: Object.freeze({
      kind: 'direct' as const,
      focusLines: Object.freeze(lines),
      focusExcerpt: file,
    }),
  }) as TrustedStableRecordViewV2;
}

describe.runIf(
  isSelected({
    group: 'relevance-ranking-budget',
    caseId: 'z-target-small-budget',
  }),
)('F2-GOLDEN-SMALL-001 z-target-small-budget', () => {
  it('keeps file-anchor priority ahead of z-file secondary under small budget', () => {
    const zLow = record('z-target.ts');
    const aHigh = record('a.ts');
    const intents = normalizeAnchorIntentsV2([{ kind: 'file', value: 'a.ts' }]);
    expect(
      classifyRecordPriorityV2({
        record: aHigh,
        anchorIntents: intents,
        regularTerms: [],
      }).priority,
    ).toBe(MATCH_PRIORITY_V2.FILE_ANCHOR);
    const cmp = comparePublicSafeOrderingKeyV2(
      buildPublicSafeOrderingKeyV2(aHigh, MATCH_PRIORITY_V2.FILE_ANCHOR)
        .orderingKey,
      buildPublicSafeOrderingKeyV2(zLow, MATCH_PRIORITY_V2.SECONDARY_BACKEND)
        .orderingKey,
    );
    expect(cmp).toBeLessThan(0);
  });
});

describe.runIf(
  isSelected({
    group: 'relevance-ranking-budget',
    caseId: 'multi-anchor-round-robin',
  }),
)('F2-GOLDEN-MULTI-001 multi-anchor-round-robin', () => {
  it('round-robins distinct opaque buckets under budget=2', () => {
    const bucketA = createOpaqueTokenV2();
    const bucketB = createOpaqueTokenV2();
    const a1 = record('one.ts', [1, 1], bucketA);
    const a2 = record('one.ts', [2, 2], bucketA);
    const b1 = record('two.ts', [1, 1], bucketB);
    const selected = ordinaryRoundRobinSelectV2(
      [
        {
          record: a1,
          orderingKey: buildPublicSafeOrderingKeyV2(a1, 96).orderingKey,
        },
        {
          record: a2,
          orderingKey: buildPublicSafeOrderingKeyV2(a2, 96).orderingKey,
        },
        {
          record: b1,
          orderingKey: buildPublicSafeOrderingKeyV2(b1, 96).orderingKey,
        },
      ],
      2,
    );
    expect(selected).toHaveLength(2);
    expect(new Set(selected.map((item) => item.fileBucketRef)).size).toBe(2);
  });
});

describe.runIf(
  isSelected({
    group: 'relevance-ranking-budget',
    caseId: 'large-ranking-permutation',
  }),
)('F2-LARGE-001 large-ranking-permutation', () => {
  it('keeps comparator stable across five reshuffles of equal-priority inputs', () => {
    const files = Array.from({ length: 12 }, (_, index) => `f${index}.ts`);
    const keys = files.map((file) =>
      buildPublicSafeOrderingKeyV2(record(file), 60).orderingKey,
    );
    const baseline = [...keys]
      .sort(comparePublicSafeOrderingKeyV2)
      .map((key) => key.file);
    for (let round = 0; round < 5; round += 1) {
      const reshuffled = [...keys]
        .sort(() => (round % 2 === 0 ? 1 : -1))
        .sort(comparePublicSafeOrderingKeyV2)
        .map((key) => key.file);
      expect(reshuffled).toEqual(baseline);
    }
  });
});
