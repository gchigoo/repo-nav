import { describe, expect, it } from 'vitest';

import { MultiViewAccumulatorV2 } from '../../src/repository/ripgrep-stream/multi-view-accumulator-v2.js';
import type { RipgrepMatchEventV2 } from '../../src/repository/ripgrep-stream/ripgrep-protocol-fsm-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

function matchEvent(
  path: string,
  lineNumber: number,
  text: string,
): RipgrepMatchEventV2 {
  return Object.freeze({
    type: 'match' as const,
    path,
    lineNumber,
    lineText: text,
    absoluteOffset: 0,
    submatches: Object.freeze([{ text, start: 0, end: text.length }]),
  });
}

const seed = Object.freeze({
  value: 'Target',
  caseSensitive: true,
  reasonCode: 'LITERAL_TERM_HIT' as const,
  symbol: true,
});

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'exit-outcome-table',
  }),
)('legacy completeness latch', () => {
  it('marks complete at maxHits and truncated at maxHits+1 / maxHits+N', () => {
    const maxHits = 3;
    const exact = new MultiViewAccumulatorV2({
      expandedMaxHits: 800,
      legacyMaxHits: maxHits,
      fileAnchors: [],
    });
    exact.beginGroup();
    for (let index = 0; index < maxHits; index += 1) {
      exact.observeMatch(matchEvent(`f${index}.ts`, 1, 'Target'), [seed]);
    }
    exact.commitGroup();
    exact.finishNaturalLegacy();
    expect(exact.snapshot().legacy.hits).toHaveLength(maxHits);
    expect(exact.snapshot().legacy.complete).toBe(true);

    const plusOne = new MultiViewAccumulatorV2({
      expandedMaxHits: 800,
      legacyMaxHits: maxHits,
      fileAnchors: [],
    });
    plusOne.beginGroup();
    for (let index = 0; index < maxHits + 1; index += 1) {
      plusOne.observeMatch(matchEvent(`p${index}.ts`, 1, 'Target'), [seed]);
    }
    plusOne.commitGroup();
    plusOne.finishNaturalLegacy();
    expect(plusOne.snapshot().legacy.hits).toHaveLength(maxHits);
    expect(plusOne.snapshot().legacy.complete).toBe(false);

    const plusN = new MultiViewAccumulatorV2({
      expandedMaxHits: 800,
      legacyMaxHits: maxHits,
      fileAnchors: [],
    });
    plusN.beginGroup();
    for (let index = 0; index < maxHits + 5; index += 1) {
      plusN.observeMatch(matchEvent(`n${index}.ts`, 1, 'Target'), [seed]);
    }
    plusN.commitGroup();
    plusN.finishNaturalLegacy();
    expect(plusN.snapshot().legacy.hits).toHaveLength(maxHits);
    expect(plusN.snapshot().legacy.complete).toBe(false);
  });

  it('marks truncated when first group exactly hits maxHits then second group begins', () => {
    const maxHits = 3;
    const acc = new MultiViewAccumulatorV2({
      expandedMaxHits: 800,
      legacyMaxHits: maxHits,
      fileAnchors: [],
    });
    acc.beginGroup();
    for (let index = 0; index < maxHits; index += 1) {
      acc.observeMatch(matchEvent(`g1-${index}.ts`, 1, 'Target'), [seed]);
    }
    acc.commitGroup();
    // 恰好满额后开始下一组：后续内容已知存在，不得标 complete
    expect(acc.beginGroup()).toBe('legacy-complete');
    expect(acc.snapshot().legacy.hits).toHaveLength(maxHits);
    expect(acc.snapshot().legacy.complete).toBe(false);
  });
});
