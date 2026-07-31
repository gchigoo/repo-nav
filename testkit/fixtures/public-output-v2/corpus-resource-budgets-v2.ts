/**
 * F1B-CORPUS-001 fixtures: expanded dual-mode corpus N/N+1 and derived totals.
 */

import type { SensitiveCorpusV2 } from '../../../src/evidence/public-output/sensitive-value-contract-v2.js';
import { utf8Repeat } from './resource-budgets-v2.js';

export function makeCorpusEntry(
  value: string,
  propagation: 'exact-text' | 'path-segment' = 'exact-text',
): SensitiveCorpusV2['entries'][number] {
  return Object.freeze({
    value,
    reasonCodes: Object.freeze(['SECRET_LIKE_VALUE'] as const),
    propagation,
  });
}

/** Dual-mode expansion: one value yields two entries (exact-text + path-segment). */
export function makeDualModeCorpus(
  values: readonly string[],
  totalUtf8Bytes?: number,
): SensitiveCorpusV2 {
  const entries = values.flatMap((value) => [
    makeCorpusEntry(value, 'exact-text'),
    makeCorpusEntry(value, 'path-segment'),
  ]);
  const recomputed = entries.reduce(
    (sum, entry) => sum + Buffer.byteLength(entry.value, 'utf8'),
    0,
  );
  return Object.freeze({
    entries: Object.freeze(entries),
    totalUtf8Bytes: totalUtf8Bytes ?? recomputed,
  });
}

export function makeSizedCorpusEntries(
  count: number,
  entryBytes: number,
): SensitiveCorpusV2 {
  const exactValues = Array.from({ length: Math.ceil(count / 2) }, () =>
    utf8Repeat('c', entryBytes),
  );
  const entries = exactValues
    .flatMap((value) => [
      makeCorpusEntry(value, 'exact-text'),
      makeCorpusEntry(value, 'path-segment'),
    ])
    .slice(0, count);
  const recomputed = entries.reduce(
    (sum, entry) => sum + Buffer.byteLength(entry.value, 'utf8'),
    0,
  );
  return Object.freeze({
    entries: Object.freeze(entries),
    totalUtf8Bytes: recomputed,
  });
}

export function corpusWithDerivedTotal(
  corpus: SensitiveCorpusV2,
  totalUtf8Bytes: number,
): SensitiveCorpusV2 {
  return Object.freeze({
    entries: corpus.entries,
    totalUtf8Bytes,
  });
}
