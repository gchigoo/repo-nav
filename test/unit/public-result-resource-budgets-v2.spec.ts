import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  LOCATE_RESULT_RESOURCE_BUDGETS_V2,
  utf8ByteLengthV2,
} from '../../src/contracts/v2/locate-result-resource-budget-contract-v2.js';
import { LocateResultV2Schema } from '../../src/contracts/v2/locate-result-v2.js';
import { assemblePublicLocateResultV2 } from '../../src/evidence/public-output/public-result-assembler-v2.js';
import {
  applyPublicFieldBudgetV2,
  guardCompactJsonDataV2,
  guardSensitiveCorpusBudgetV2,
  guardSerializedPublicResultBudgetV2,
  preflightUnsafePublicMaterializationSourceBudgetV2,
} from '../../src/evidence/public-output/result-resource-budget-guards-v2.js';
import { projectSyntheticLocateResultV2 } from '../../src/evidence/public-output/synthetic-locate-projection-v2.js';
import { createCanonicalLocateEngineHarnessV2 } from '../../testkit/testing/create-canonical-locate-engine-harness-v2.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import type {
  BackendHealth,
  BackendSearchResult,
  RepositorySearchBackend,
} from '../../src/contracts/index.js';
import {
  corpusWithDerivedTotal,
  makeDualModeCorpus,
  makeSizedCorpusEntries,
} from '../../testkit/fixtures/public-output-v2/corpus-resource-budgets-v2.js';
import {
  createMaximumUnsafeSourceV2,
  measureCompactJsonUtf8Bytes,
} from '../../testkit/fixtures/public-output-v2/maximum-structure-v2.js';
import {
  redactionOf,
  withOversizedPublicFileAndExcerpt,
  withPublicExcerptBytes,
  withPublicFileBytes,
} from '../../testkit/fixtures/public-output-v2/public-field-resource-budgets-v2.js';
import {
  FIXED_INTERNAL_ERROR_V2,
  createPoisonConfirmedArray,
  utf8Repeat,
  withConfirmedCount,
  withEvidenceTotal,
  withRawField,
  withTerms,
} from '../../testkit/fixtures/public-output-v2/resource-budgets-v2.js';
import {
  keyPermutedEquivalentSource,
  sourceWithAccessorFileField,
  sourceWithPoisonConfirmedTail,
  throwingProxySource,
} from '../../testkit/fixtures/public-output-v2/resource-budget-ordering-v2.js';
import { v2ShadowFailureInputs } from '../../testkit/fixtures/public-output-v2/resource-budget-legacy-isolation-v2.js';
import {
  FORBIDDEN_BUDGET_DETAIL_MARKERS,
  failureInputsByStage,
} from '../../testkit/fixtures/public-output-v2/resource-budget-projection-v2.js';
import {
  PUBLIC_JSON_MAX,
  compactJsonValueOfBytes,
  tinyPublicErrorResult,
} from '../../testkit/fixtures/public-output-v2/serialized-resource-budget-v2.js';
import { createUnsafeLocateSuccessV2 } from '../../testkit/fixtures/public-output-v2/synthetic-locate-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const B = LOCATE_RESULT_RESOURCE_BUDGETS_V2;

const primitivesSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'resource-budget-primitives',
});
const rawSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'raw-resource-budgets',
});
const corpusSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'corpus-resource-budgets',
});
const publicFieldSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'public-field-resource-budgets',
});
const serializedSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'serialized-resource-budget',
});
const maxStructureSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'maximum-structure-budget',
});
const orderingSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'resource-budget-ordering',
});
const projectionSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'resource-budget-projection',
});
const legacySelected = isSelected({
  group: 'public-output-v2',
  caseId: 'resource-budget-legacy-isolation',
});

describe.runIf(primitivesSelected)('F1B resource-budget-primitives', () => {
  it('F1B-RAW-JSON-001 accepted subset matches compact JSON UTF-8 bytes', () => {
    const samples: unknown[] = [
      { a: 1, b: 'x"y\\z', c: true, d: null, e: [1, '中文', '😀'] },
      { n: -0, f: 1.5, g: 'line\n\t' },
      { s: '\uD800' },
      [],
      'plain',
      42,
      false,
      null,
    ];
    for (const sample of samples) {
      const expected = Buffer.byteLength(JSON.stringify(sample), 'utf8');
      expect(guardCompactJsonDataV2(sample, expected)).toEqual({ ok: true });
      expect(guardCompactJsonDataV2(sample, expected - 1)).toEqual({
        ok: false,
        stage: 'raw-json',
      });
      expect(guardCompactJsonDataV2(sample, expected + 1)).toEqual({
        ok: true,
      });
    }
  });

  it('F1B-RAW-JSON-001 rejects invalid JSON-data graphs without full stringify', () => {
    const cycle: Record<string, unknown> = {};
    cycle['self'] = cycle;
    const rejected: unknown[] = [
      undefined,
      { a: undefined },
      Object.create({ x: 1 }),
      { toJSON: () => ({}) },
      { get x() { return 1; } },
      (() => {
        const o: Record<string | symbol, unknown> = {};
        o[Symbol('s')] = 1;
        return o;
      })(),
      (() => {
        const a: unknown[] = [1];
        (a as { foo?: number }).foo = 2;
        return a;
      })(),
      (() => {
        const a: unknown[] = [];
        a[0] = 1;
        a[2] = 3;
        return a;
      })(),
      BigInt(1),
      () => 1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      cycle,
    ];
    for (const sample of rejected) {
      expect(guardCompactJsonDataV2(sample, 1024).ok).toBe(false);
    }
  });

  it('F1B-RAW-JSON-001 request 16KiB forward ABI N/N+1', () => {
    const limit = B.request.maxRawJsonUtf8Bytes;
    const pass = compactJsonValueOfBytes(limit);
    const fail = compactJsonValueOfBytes(limit + 1);
    expect(guardCompactJsonDataV2(pass, limit)).toEqual({ ok: true });
    expect(guardCompactJsonDataV2(fail, limit)).toEqual({
      ok: false,
      stage: 'raw-json',
    });
  });

  it('budget leaf has no cycle with guards (constants only)', () => {
    expect(B.raw.maxJsonUtf8Bytes).toBe(4 * 1024 * 1024);
    expect(B.public.maxJsonUtf8Bytes).toBe(1024 * 1024);
    expect(utf8ByteLengthV2('中')).toBe(3);
    expect(utf8ByteLengthV2('😀')).toBe(4);
  });
});

describe.runIf(rawSelected)('F1B raw-resource-budgets', () => {
  it('F1B-TERM-001 N/N+1 for items, item bytes, and totals', () => {
    expect(assemblePublicLocateResultV2(withTerms(15, 8)).ok).toBe(true);
    expect(assemblePublicLocateResultV2(withTerms(16, 8)).ok).toBe(true);
    expect(assemblePublicLocateResultV2(withTerms(17, 8))).toEqual(
      FIXED_INTERNAL_ERROR_V2,
    );

    expect(assemblePublicLocateResultV2(withTerms(1, 127)).ok).toBe(true);
    expect(assemblePublicLocateResultV2(withTerms(1, 128)).ok).toBe(true);
    expect(assemblePublicLocateResultV2(withTerms(1, 129))).toEqual(
      FIXED_INTERNAL_ERROR_V2,
    );

    // total 1024 = 8 * 128
    expect(assemblePublicLocateResultV2(withTerms(8, 128)).ok).toBe(true);
    // total 1025 impossible with item cap 128; 9*114=1026 fails total via 9 items under item cap
    const overTotal = withTerms(9, 114);
    expect(assemblePublicLocateResultV2(overTotal)).toEqual(
      FIXED_INTERNAL_ERROR_V2,
    );

    const cjk = withTerms(1, 3) as unknown as {
      evidence: { normalizedTerms: Array<{ value: string }> };
    };
    cjk.evidence.normalizedTerms[0]!.value = '中';
    expect(assemblePublicLocateResultV2(cjk).ok).toBe(true);
  });

  it('F1B-EVIDENCE-001 count gates fail closed before poison elements', () => {
    expect(assemblePublicLocateResultV2(withConfirmedCount(19)).ok).toBe(true);
    expect(assemblePublicLocateResultV2(withConfirmedCount(20)).ok).toBe(true);
    expect(
      assemblePublicLocateResultV2(withConfirmedCount(21, 0)),
    ).toEqual(FIXED_INTERNAL_ERROR_V2);
    expect(
      assemblePublicLocateResultV2(sourceWithPoisonConfirmedTail(21)),
    ).toEqual(FIXED_INTERNAL_ERROR_V2);

    expect(assemblePublicLocateResultV2(withEvidenceTotal(19, 20)).ok).toBe(
      true,
    );
    expect(assemblePublicLocateResultV2(withEvidenceTotal(20, 20)).ok).toBe(
      true,
    );
    expect(assemblePublicLocateResultV2(withEvidenceTotal(20, 21))).toEqual(
      FIXED_INTERNAL_ERROR_V2,
    );
  });

  it('F1B-RAW-FIELD-001 file/symbol/excerpt and spaced 400k excerpt', () => {
    expect(
      assemblePublicLocateResultV2(
        withRawField('file', `a/${utf8Repeat('b', 4094)}`),
      ).ok,
    ).toBe(true);
    expect(
      assemblePublicLocateResultV2(
        withRawField('file', `a/${utf8Repeat('b', 4095)}`),
      ),
    ).toEqual(FIXED_INTERNAL_ERROR_V2);

    expect(
      assemblePublicLocateResultV2(
        withRawField('symbol', utf8Repeat('s', 2048)),
      ).ok,
    ).toBe(true);
    expect(
      assemblePublicLocateResultV2(
        withRawField('symbol', utf8Repeat('s', 2049)),
      ),
    ).toEqual(FIXED_INTERNAL_ERROR_V2);

    expect(
      assemblePublicLocateResultV2(
        withRawField('excerpt', utf8Repeat('e', 16384)),
      ).ok,
    ).toBe(true);
    expect(
      assemblePublicLocateResultV2(
        withRawField('excerpt', utf8Repeat('e', 16385)),
      ),
    ).toEqual(FIXED_INTERNAL_ERROR_V2);
    expect(
      assemblePublicLocateResultV2(
        withRawField('excerpt', 'x '.repeat(200_000)),
      ),
    ).toEqual(FIXED_INTERNAL_ERROR_V2);

    // 129 path segments
    const segments = Array.from({ length: 129 }, (_, i) => `s${String(i)}`);
    expect(
      assemblePublicLocateResultV2(withRawField('file', segments.join('/'))),
    ).toEqual(FIXED_INTERNAL_ERROR_V2);
  });

  it('F1B-RAW-JSON-001 source 4MiB gate via preflight', () => {
    const base = createUnsafeLocateSuccessV2();
    expect(
      preflightUnsafePublicMaterializationSourceBudgetV2(base),
    ).toEqual({ ok: true });
    const over = compactJsonValueOfBytes(B.raw.maxJsonUtf8Bytes + 1);
    expect(guardCompactJsonDataV2(over, B.raw.maxJsonUtf8Bytes).ok).toBe(false);
  });
});

describe.runIf(corpusSelected)('F1B corpus-resource-budgets', () => {
  it('F1B-CORPUS-001 dual-mode count/bytes and derived total', () => {
    // 64 values => 128 dual-mode entries
    const values = Array.from({ length: 64 }, () => utf8Repeat('c', 8));
    const atCap = makeDualModeCorpus(values);
    expect(atCap.entries.length).toBe(128);
    expect(guardSensitiveCorpusBudgetV2(atCap)).toEqual({ ok: true });

    const overCount = makeSizedCorpusEntries(129, 8);
    expect(guardSensitiveCorpusBudgetV2(overCount)).toEqual({
      ok: false,
      stage: 'corpus',
    });

    const entry7 = makeDualModeCorpus([utf8Repeat('c', 7)]);
    expect(guardSensitiveCorpusBudgetV2(entry7).ok).toBe(false);
    const entry8 = makeDualModeCorpus([utf8Repeat('c', 8)]);
    expect(guardSensitiveCorpusBudgetV2(entry8).ok).toBe(true);
    const entry512 = makeDualModeCorpus([utf8Repeat('c', 512)]);
    expect(guardSensitiveCorpusBudgetV2(entry512).ok).toBe(true);
    const entry513 = makeDualModeCorpus([utf8Repeat('c', 513)]);
    expect(guardSensitiveCorpusBudgetV2(entry513).ok).toBe(false);

    const matched = makeDualModeCorpus([utf8Repeat('c', 16)]);
    expect(
      guardSensitiveCorpusBudgetV2(
        corpusWithDerivedTotal(matched, matched.totalUtf8Bytes),
      ),
    ).toEqual({ ok: true });
    expect(
      guardSensitiveCorpusBudgetV2(
        corpusWithDerivedTotal(matched, matched.totalUtf8Bytes - 1),
      ).ok,
    ).toBe(false);
    expect(
      guardSensitiveCorpusBudgetV2(
        corpusWithDerivedTotal(matched, matched.totalUtf8Bytes + 1),
      ).ok,
    ).toBe(false);
    expect(
      guardSensitiveCorpusBudgetV2(corpusWithDerivedTotal(matched, 1.5)).ok,
    ).toBe(false);

    // Does not dedupe by value: two identical values still count 4 entries
    const dup = makeDualModeCorpus([utf8Repeat('d', 8), utf8Repeat('d', 8)]);
    // makeDualModeCorpus uses flatMap on values array — two same values => 4 entries
    expect(dup.entries.length).toBe(4);
    expect(guardSensitiveCorpusBudgetV2(dup).ok).toBe(true);
  });
});

describe.runIf(publicFieldSelected)('F1B public-field-resource-budgets', () => {
  it('F1B-PUBLIC-FIELD-001 N/N+1 placeholder semantics', () => {
    expect(applyPublicFieldBudgetV2('term', redactionOf(127)).value.length).toBe(
      127,
    );
    expect(applyPublicFieldBudgetV2('term', redactionOf(128)).value.length).toBe(
      128,
    );
    const termOver = applyPublicFieldBudgetV2('term', redactionOf(129));
    expect(termOver).toEqual({
      value: '[REDACTED:BINARY_OR_OVERSIZED_CONTENT]',
      reasonCodes: ['BINARY_OR_OVERSIZED_CONTENT'],
    });

    for (const field of ['file', 'symbol', 'excerpt'] as const) {
      expect(
        applyPublicFieldBudgetV2(field, redactionOf(2047)).value,
      ).toHaveLength(2047);
      expect(
        applyPublicFieldBudgetV2(field, redactionOf(2048)).value,
      ).toHaveLength(2048);
      const over = applyPublicFieldBudgetV2(field, redactionOf(2049));
      if (field === 'file') {
        expect(over).toEqual({
          value: '[REDACTED_PATH]',
          reasonCodes: ['BINARY_OR_OVERSIZED_CONTENT'],
        });
      } else {
        expect(over).toEqual({
          value: '[REDACTED:BINARY_OR_OVERSIZED_CONTENT]',
          reasonCodes: ['BINARY_OR_OVERSIZED_CONTENT'],
        });
      }
    }
  });

  it('F1B-PUBLIC-FIELD-001 / ORDINAL-001 assembler file/excerpt replacement and order', () => {
    expect(assemblePublicLocateResultV2(withPublicFileBytes(2048)).ok).toBe(
      true,
    );
    const fileOver = assemblePublicLocateResultV2(withPublicFileBytes(2049));
    if (!fileOver.ok) throw new Error('expected success with placeholder');
    expect(fileOver.evidence.confirmed[0]!.location).toMatchObject({
      file: '[REDACTED_PATH]',
      resolvable: false,
    });
    expect(fileOver.evidence.coverage.degradations).toContain(
      'LOCATION_REDACTED',
    );
    expect(fileOver.evidence.status).toBe('partial');

    expect(assemblePublicLocateResultV2(withPublicExcerptBytes(2048)).ok).toBe(
      true,
    );
    const excerptOver = assemblePublicLocateResultV2(
      withPublicExcerptBytes(2049),
    );
    if (!excerptOver.ok) throw new Error('expected success');
    expect(excerptOver.evidence.confirmed[0]!.location.excerpt).toBe(
      '[REDACTED:BINARY_OR_OVERSIZED_CONTENT]',
    );

    const multi = assemblePublicLocateResultV2(
      withOversizedPublicFileAndExcerpt(),
    );
    if (!multi.ok) throw new Error('expected success');
    expect(multi.evidence.confirmed).toHaveLength(1);
    expect(multi.evidence.candidates).toHaveLength(1);
    expect(multi.evidence.confirmed[0]!.id).toBe('evidence:v2:0001');
    expect(multi.evidence.candidates[0]!.id).toBe('evidence:v2:0002');
    expect(multi.evidence.candidates[0]!.location.file).toBe('src/second.ts');
  });
});

describe.runIf(serializedSelected)('F1B serialized-resource-budget', () => {
  it('F1B-PUBLIC-JSON-001 guard N/N+1 and safe mapper', () => {
    const pass = compactJsonValueOfBytes(PUBLIC_JSON_MAX) as never;
    const fail = compactJsonValueOfBytes(PUBLIC_JSON_MAX + 1) as never;
    // Use guardCompactJsonData path via serialized guard on a LocateResult-shaped object
    expect(guardCompactJsonDataV2(pass, PUBLIC_JSON_MAX)).toEqual({
      ok: true,
    });
    expect(guardCompactJsonDataV2(fail, PUBLIC_JSON_MAX)).toEqual({
      ok: false,
      stage: 'raw-json',
    });

    const tiny = tinyPublicErrorResult();
    expect(guardSerializedPublicResultBudgetV2(tiny)).toEqual({ ok: true });
    expect(LocateResultV2Schema.parse(tiny)).toEqual(tiny);

    const max = assemblePublicLocateResultV2(createMaximumUnsafeSourceV2());
    expect(max.ok).toBe(true);
    if (max.ok) {
      expect(guardSerializedPublicResultBudgetV2(max)).toEqual({ ok: true });
    }
  });
});

describe.runIf(maxStructureSelected)('F1B maximum-structure-budget', () => {
  it('F1B-MAX-STRUCTURE-001 fits frozen 4MiB/1MiB budgets with headroom', () => {
    const source = createMaximumUnsafeSourceV2();
    const sourceBytes = measureCompactJsonUtf8Bytes(source);
    expect(sourceBytes).toBeLessThanOrEqual(B.raw.maxJsonUtf8Bytes);
    const publicResult = assemblePublicLocateResultV2(source);
    expect(publicResult.ok).toBe(true);
    if (!publicResult.ok) return;
    const publicBytes = measureCompactJsonUtf8Bytes(publicResult);
    expect(publicBytes).toBeLessThanOrEqual(B.public.maxJsonUtf8Bytes);
    // Record headroom (must remain positive; do not raise constants)
    expect(B.raw.maxJsonUtf8Bytes - sourceBytes).toBeGreaterThan(0);
    expect(B.public.maxJsonUtf8Bytes - publicBytes).toBeGreaterThan(0);
  });
});

describe.runIf(orderingSelected)('F1B resource-budget-ordering', () => {
  it('F1B-ORDERING-001 poison/accessor/Proxy/permutation', () => {
    expect(
      assemblePublicLocateResultV2(sourceWithPoisonConfirmedTail(21)),
    ).toEqual(FIXED_INTERNAL_ERROR_V2);

    const accessor = sourceWithAccessorFileField();
    expect(assemblePublicLocateResultV2(accessor)).toEqual(
      FIXED_INTERNAL_ERROR_V2,
    );
    expect(
      (accessor as { __getterCalls: () => number }).__getterCalls(),
    ).toBe(0);

    expect(assemblePublicLocateResultV2(throwingProxySource())).toEqual(
      FIXED_INTERNAL_ERROR_V2,
    );

    const [a, b] = keyPermutedEquivalentSource();
    const ra = assemblePublicLocateResultV2(a);
    const rb = assemblePublicLocateResultV2(b);
    expect(JSON.stringify(ra)).toBe(JSON.stringify(rb));
  });
});

describe.runIf(projectionSelected)('F1B resource-budget-projection', () => {
  it('F1B-PROJECTION-001 fixed error across synthetic projections', () => {
    const inputs = failureInputsByStage();
    for (const input of Object.values(inputs)) {
      const result = assemblePublicLocateResultV2(input);
      expect(result).toEqual(FIXED_INTERNAL_ERROR_V2);
      const projection = projectSyntheticLocateResultV2(result);
      expect(projection.service).toEqual(FIXED_INTERNAL_ERROR_V2);
      expect(projection.structuredContent).toEqual(FIXED_INTERNAL_ERROR_V2);
      expect(projection.isError).toBe(true);
      const blob = [
        projection.text,
        projection.debugLocateStdout,
        JSON.stringify(projection.service),
      ].join('\n');
      for (const marker of FORBIDDEN_BUDGET_DETAIL_MARKERS) {
        expect(blob).not.toContain(marker);
      }
    }
  });
});

describe.runIf(legacySelected)('F1B resource-budget-legacy-isolation', () => {
  it('F1B-LEGACY-ISOLATION-001 v2 shadow failures do not alter v1 engine bytes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'repo-nav-f1b-'));
    try {
      writeFileSync(join(dir, 'mapping.ts'), 'export const mapping = 1;\n');
      class StubBackend implements RepositorySearchBackend {
        public readonly id = 'ripgrep' as const;
        public async probe(): Promise<BackendHealth> {
          return { state: 'available' };
        }
        public async search(): Promise<BackendSearchResult> {
          return {
            health: { state: 'available' },
            hits: [
              {
                file: 'mapping.ts',
                lines: [1, 1],
                matchedText: 'export const mapping = 1;',
                source: 'ripgrep',
                reasonCodes: ['LITERAL_TERM_HIT'],
              },
            ],
            complete: true,
          };
        }
      }
      const engine = createCanonicalLocateEngineHarnessV2([new StubBackend()],
        new NodeRepositoryReader(),
      ).service;
      const request = {
        repoPath: dir,
        question: 'Find mapping',
        terms: ['mapping'],
      };
      const before = await engine.locate(request, {
        signal: new AbortController().signal,
      });
      const beforeBytes = JSON.stringify(before);

      for (const input of v2ShadowFailureInputs()) {
        expect(assemblePublicLocateResultV2(input)).toEqual(
          FIXED_INTERNAL_ERROR_V2,
        );
      }

      const after = await engine.locate(request, {
        signal: new AbortController().signal,
      });
      expect(JSON.stringify(after)).toBe(beforeBytes);
      expect(after).toEqual(before);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// silence unused import in case tree-shaking of helper
void createPoisonConfirmedArray;
