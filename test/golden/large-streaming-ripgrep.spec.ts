import { describe, expect, it } from 'vitest';

import { RipgrepJsonLineConsumerV2 } from '../../src/repository/ripgrep-stream/index.js';
import { buildLargeSyntheticMatchCountV2 } from '../../testkit/fixtures/ripgrep/large-stream-v2.js';
import { buildMatchStreamV2 } from '../../testkit/fixtures/ripgrep/stream-partitions-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'large-streaming-ripgrep',
  }),
)('F5-LARGE-001 large streaming ripgrep', () => {
  it('keeps bounded counters stable across five runs', () => {
    const expected = buildLargeSyntheticMatchCountV2(1);
    const hashes: string[] = [];
    for (let index = 0; index < 5; index += 1) {
      const consumer = new RipgrepJsonLineConsumerV2({ allowContext: false });
      const bytes = buildMatchStreamV2();
      expect(consumer.push(bytes).action).toBe('continue');
      const finished = consumer.finish();
      expect(finished.ok).toBe(true);
      if (finished.ok) {
        expect(finished.value.matchCount).toBe(expected);
        hashes.push(
          `${finished.value.matchCount}:${finished.value.submatchCount}:${finished.value.scopeCount}`,
        );
      }
    }
    expect(new Set(hashes).size).toBe(1);
  });
});
