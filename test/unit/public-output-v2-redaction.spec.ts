import { describe, expect, it } from 'vitest';

import {
  BINARY_OR_OVERSIZED_PLACEHOLDER_V2,
  EMPTY_SENSITIVE_CORPUS_V2,
  PATH_PLACEHOLDER_V2,
  TOKEN_PLACEHOLDER_V2,
  SpanContractViolationError,
  assertAmplificationBoundV2,
  assertCorpusProvenanceV2,
  classifyPhoneTokenV2,
  collectSensitiveCorpusV2,
  createSensitiveCorpusV2,
  createSensitiveSpanV2,
  isValidRawLocatorV2,
  materializeSensitiveSpansV2,
  mergeSensitiveSpansV2,
  projectPublicSafeRankingKeyV2,
  redactPublicFieldV2,
  utf8Bytes,
} from '../../src/evidence/public-output/sensitive-value-policy-v2.js';
import { assemblePublicLocateResultV2 } from '../../src/evidence/public-output/public-result-assembler-v2.js';
import {
  ELIGIBLE_LONG_SECRET_V2,
  LOCAL_ONLY_ASSIGNMENTS_V2,
  LOW_INFORMATION_SENTINELS_V2,
  PATH_SEGMENT_CASES_V2,
  TEXT_BOUNDARY_HAYSTACK_V2,
} from '../../testkit/fixtures/public-output-v2/corpus-policy-v2.js';
import {
  PHONE_ACCEPT_V2,
  PHONE_LOCAL_ONLY_BARE_UNIX_V2,
  PHONE_REJECT_V2,
  PHONE_TIMESTAMP_CUE_V2,
  PHONE_WITH_CUE_V2,
} from '../../testkit/fixtures/public-output-v2/phone-corpus-v2.js';
import {
  rankingFileWithSegmentBytesV2,
  rankingSymbolOfBytesV2,
} from '../../testkit/fixtures/public-output-v2/public-safe-ranking-key-v2.js';
import {
  AMPLIFICATION_REPEAT_ASSIGNMENT_V2,
  PLACEHOLDER_LITERALS_V2,
} from '../../testkit/fixtures/public-output-v2/redaction-amplification-v2.js';
import { SPAN_UNICODE_FIXTURES_V2 } from '../../testkit/fixtures/public-output-v2/span-redaction-v2.js';
import { createUnsafeLocateSuccessV2 } from '../../testkit/fixtures/public-output-v2/synthetic-locate-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const fieldRedactionSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'field-redaction',
});
const locationRedactionSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'location-redaction',
});
const spanRedactionSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'span-redaction',
});
const corpusPolicySelected = isSelected({
  group: 'public-output-v2',
  caseId: 'corpus-policy',
});
const corpusBoundariesSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'corpus-boundaries',
});
const phoneCorpusSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'phone-corpus-policy',
});
const amplificationSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'redaction-amplification',
});
const rankingKeySelected = isSelected({
  group: 'public-output-v2',
  caseId: 'public-safe-ranking-key',
});

describe.runIf(fieldRedactionSelected)('v2 field redaction policy', () => {
  it('collects response-level secrets and removes them from every public field', () => {
    const rawSecret = 'cross-field-do-not-publish';
    const corpus = collectSensitiveCorpusV2({
      normalizedTerms: [{ value: `password="${rawSecret}"` }],
      confirmed: [
        {
          location: {
            file: 'src/config.ts',
            symbol: 'databasePassword',
            excerpt: `const alias = "${rawSecret}"; owner=stan.guo@example.com`,
          },
        },
      ],
    });

    const term = redactPublicFieldV2(
      `databasePassword=${rawSecret}`,
      'term',
      corpus,
    );
    const symbol = redactPublicFieldV2('databasePassword', 'symbol', corpus);
    const excerpt = redactPublicFieldV2(
      `const alias = "${rawSecret}";`,
      'excerpt',
      corpus,
    );

    expect(term.value).not.toContain(rawSecret);
    expect(term.reasonCodes).toEqual(['SECRET_LIKE_VALUE']);
    expect(symbol).toEqual({
      value: 'database[REDACTED]',
      reasonCodes: ['SECRET_LIKE_VALUE'],
    });
    expect(excerpt.value).not.toContain(rawSecret);
    expect(excerpt.reasonCodes).toEqual(['SECRET_LIKE_VALUE']);
  });

  it('uses canonical reasons for connection, personal, oversized and controls', () => {
    const value =
      'postgres://admin:db-secret@example.test/app?token=query-secret ' +
      'stan.guo@example.com\u001b[31m\u202e';
    const redacted = redactPublicFieldV2(
      value,
      'excerpt',
      collectSensitiveCorpusV2(value),
    );

    expect(redacted.value).not.toMatch(
      /(?:db-secret|query-secret|stan\.guo@example\.com|\u001b|\u202e)/u,
    );
    expect(redacted.reasonCodes).toEqual([
      'CONNECTION_STRING',
      'PERSONAL_DATA',
      'UNTRUSTED_CONTROL_CHARACTERS',
    ]);

    expect(
      redactPublicFieldV2(
        `value=${'x'.repeat(2_049)}`,
        'excerpt',
        EMPTY_SENSITIVE_CORPUS_V2,
      ),
    ).toEqual({
      value: BINARY_OR_OVERSIZED_PLACEHOLDER_V2,
      reasonCodes: ['BINARY_OR_OVERSIZED_CONTENT'],
    });
  });

  it('canonicalizes excerpt line endings but replaces disallowed control runs', () => {
    expect(
      redactPublicFieldV2(
        'first\r\nsecond\rlast\tok',
        'excerpt',
        EMPTY_SENSITIVE_CORPUS_V2,
      ),
    ).toEqual({
      value: 'first\nsecond\nlast\tok',
      reasonCodes: [],
    });
    expect(
      redactPublicFieldV2(
        'first\nsecond\tthird',
        'term',
        EMPTY_SENSITIVE_CORPUS_V2,
      ),
    ).toEqual({
      value: 'first[REDACTED]second[REDACTED]third',
      reasonCodes: ['UNTRUSTED_CONTROL_CHARACTERS'],
    });
  });

  it('does not treat source placeholder literals as policy replacements', () => {
    expect(
      redactPublicFieldV2('[REDACTED]', 'excerpt', EMPTY_SENSITIVE_CORPUS_V2),
    ).toEqual({
      value: '[REDACTED]',
      reasonCodes: [],
    });
    expect(
      redactPublicFieldV2('[REDACTED_PATH]', 'file', EMPTY_SENSITIVE_CORPUS_V2),
    ).toEqual({
      value: '[REDACTED_PATH]',
      reasonCodes: [],
    });
  });

  it('covers uppercase, hyphen, camel, Pascal, quoted assignments and bare ESC', () => {
    for (const identifier of [
      'MY_API_KEY',
      'SERVICE-AUTH-TOKEN',
      'apiKey',
      'ApiKey',
      'databasePassword',
    ]) {
      for (const field of ['term', 'symbol'] as const) {
        const result = redactPublicFieldV2(
          identifier,
          field,
          EMPTY_SENSITIVE_CORPUS_V2,
        );
        expect(result.value, `${field}:${identifier}`).not.toContain(
          identifier,
        );
        expect(result.reasonCodes, `${field}:${identifier}`).toContain(
          'SECRET_LIKE_VALUE',
        );
      }
      const file = redactPublicFieldV2(
        `src/${identifier}/config.ts`,
        'file',
        EMPTY_SENSITIVE_CORPUS_V2,
      );
      expect(file.value, identifier).toBe('[REDACTED_PATH]');
      expect(file.reasonCodes, identifier).toContain('SECRET_LIKE_VALUE');
    }

    for (const excerpt of [
      '{"password":"json-do-not-publish"}',
      "{'api_key':'json-do-not-publish'}",
      '"clientSecret" = "json-do-not-publish"',
    ]) {
      const result = redactPublicFieldV2(
        excerpt,
        'excerpt',
        EMPTY_SENSITIVE_CORPUS_V2,
      );
      expect(result.value, excerpt).not.toContain('json-do-not-publish');
      expect(result.reasonCodes, excerpt).toContain('SECRET_LIKE_VALUE');
    }

    for (const value of [
      'before\u001bafter',
      'before\u001b[31after',
      'before\u001b🙂after',
      'before\u007fafter',
      'before\u202eafter',
    ]) {
      const result = redactPublicFieldV2(
        value,
        'excerpt',
        EMPTY_SENSITIVE_CORPUS_V2,
      );
      expect(result.value, value).not.toMatch(
        /[\u001b\u007f\u202e]/u,
      );
      expect(result.reasonCodes, value).toContain(
        'UNTRUSTED_CONTROL_CHARACTERS',
      );
    }
  });

  it('owns fixed credentials, phone PII and malformed quote/template families', () => {
    for (const credential of [
      `AKIA${'A'.repeat(16)}`,
      `ghp_${'B'.repeat(20)}`,
      `eyJ${'C'.repeat(8)}.${'D'.repeat(8)}.${'E'.repeat(8)}`,
    ]) {
      const result = redactPublicFieldV2(
        credential,
        'excerpt',
        EMPTY_SENSITIVE_CORPUS_V2,
      );
      expect(result.value, credential).not.toContain(credential);
      expect(result.reasonCodes, credential).toEqual([
        'SECRET_LIKE_VALUE',
      ]);
    }

    const phone = '+1 (415) 555-0123';
    expect(
      redactPublicFieldV2(phone, 'excerpt', EMPTY_SENSITIVE_CORPUS_V2),
    ).toEqual({
      value: '[REDACTED]',
      reasonCodes: ['PERSONAL_DATA'],
    });

    for (const malformed of [
      'password="unterminated-quote-do-not-publish',
      "api_key='unterminated-single-quote-do-not-publish",
      'clientSecret=`unsafe-template-do-not-publish',
      'password="dangling-double-escape-do-not-publish\\',
      "api_key='dangling-single-escape-do-not-publish\\",
      'clientSecret=`dangling-template-escape-do-not-publish\\',
    ]) {
      expect(
        redactPublicFieldV2(malformed, 'excerpt', EMPTY_SENSITIVE_CORPUS_V2),
        malformed,
      ).toEqual({
        value: BINARY_OR_OVERSIZED_PLACEHOLDER_V2,
        reasonCodes: [
          'SECRET_LIKE_VALUE',
          'BINARY_OR_OVERSIZED_CONTENT',
        ],
      });
    }
  });
});

describe.runIf(locationRedactionSelected)('v2 location redaction policy', () => {
  it('accepts only normalized repository-relative POSIX raw locators', () => {
    for (const invalid of [
      '',
      '.',
      '..',
      '../secret.ts',
      'src/../secret.ts',
      '/root/secret.ts',
      'C:/root/secret.ts',
      String.raw`C:\root\secret.ts`,
      String.raw`\\server\share\secret.ts`,
      'src\\secret.ts',
      'src/\0secret.ts',
    ]) {
      expect(isValidRawLocatorV2(invalid), invalid).toBe(false);
    }
    expect(isValidRawLocatorV2('src/server/a.ts')).toBe(true);
    expect(isValidRawLocatorV2('src/new\nline.ts')).toBe(true);
  });

  it('hides the complete path for sensitive segments, inherited tokens and display threats', () => {
    const rawSecret = 'customer-do-not-publish';
    const corpus = collectSensitiveCorpusV2(`password=${rawSecret}`);

    for (const file of [
      'src/api_key/config.ts',
      `src/${rawSecret}/config.ts`,
      'src/new\nline.ts',
      `src/${'x'.repeat(2_049)}/config.ts`,
    ]) {
      const redacted = redactPublicFieldV2(file, 'file', corpus);
      expect(redacted.value, file).toBe('[REDACTED_PATH]');
      expect(redacted.reasonCodes.length, file).toBeGreaterThan(0);
    }
  });
});

describe.runIf(spanRedactionSelected)('F1A span redaction', () => {
  it('F1A-SPAN-001 merges unicode-safe spans and rejects empty reasons', () => {
    const emoji = SPAN_UNICODE_FIXTURES_V2.emoji;
    const left = createSensitiveSpanV2(emoji, 0, 6, ['SECRET_LIKE_VALUE']);
    const right = createSensitiveSpanV2(emoji, 6, emoji.length, [
      'PERSONAL_DATA',
    ]);
    const merged = mergeSensitiveSpansV2(emoji, [right, left]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.reasonCodes).toEqual([
      'SECRET_LIKE_VALUE',
      'PERSONAL_DATA',
    ]);

    const crlf = SPAN_UNICODE_FIXTURES_V2.crlf;
    const crOnly = createSensitiveSpanV2(crlf, 4, 5, [
      'UNTRUSTED_CONTROL_CHARACTERS',
    ]);
    expect(crOnly.start).toBe(4);
    expect(crOnly.end).toBe(6);

    expect(() =>
      createSensitiveSpanV2(
        emoji,
        0,
        1,
        [] as unknown as ['SECRET_LIKE_VALUE'],
      ),
    ).toThrow(SpanContractViolationError);
  });

  it('F1A-REASON-001 unions propagation and local reasons canonically', () => {
    const value = 'postgres://u:db-secret@h/?token=query-secret a@b.co\u001b';
    const corpus = collectSensitiveCorpusV2(value);
    const first = redactPublicFieldV2(value, 'excerpt', corpus);
    const second = redactPublicFieldV2(value, 'excerpt', corpus);
    expect(first).toEqual(second);
    expect(first.reasonCodes).toEqual([
      'CONNECTION_STRING',
      'PERSONAL_DATA',
      'UNTRUSTED_CONTROL_CHARACTERS',
    ]);
    for (const entry of corpus.entries) {
      expect(entry.reasonCodes.every((code) =>
        ['SECRET_LIKE_VALUE', 'CONNECTION_STRING', 'PERSONAL_DATA'].includes(
          code,
        ),
      )).toBe(true);
    }
  });
});

describe.runIf(corpusPolicySelected)('F1A corpus policy', () => {
  it('F1A-LOCAL-001 keeps low-entropy assignments local-only', () => {
    for (const assignment of LOCAL_ONLY_ASSIGNMENTS_V2) {
      const corpus = collectSensitiveCorpusV2({
        term: assignment,
        excerpt: `${assignment}; cat`,
      });
      expect(corpus.entries).toEqual([]);
      const local = redactPublicFieldV2(
        assignment,
        'excerpt',
        EMPTY_SENSITIVE_CORPUS_V2,
      );
      expect(local.value).toContain(TOKEN_PLACEHOLDER_V2);
      expect(
        redactPublicFieldV2('cat', 'term', corpus).value,
      ).toBe('cat');
      expect(
        redactPublicFieldV2('src/catalog.ts', 'file', corpus).value,
      ).toBe('src/catalog.ts');
    }
  });

  it('F1A-ELIGIBILITY-001 enforces 8-512 bytes and frozen sentinels', () => {
    const shortValue = 'abc1234';
    const minValue = 'abcd1234';
    const maxValue = `${'abcd'}${'x'.repeat(508)}`;
    const overValue = `${'abcd'}${'x'.repeat(509)}`;
    expect(
      collectSensitiveCorpusV2(`password=${shortValue}`).entries,
    ).toEqual([]);
    expect(
      collectSensitiveCorpusV2(`password=${minValue}`).entries.length,
    ).toBe(2);
    expect(
      collectSensitiveCorpusV2(`password=${maxValue}`).entries.length,
    ).toBe(2);
    expect(
      collectSensitiveCorpusV2(`password=${overValue}`).entries,
    ).toEqual([]);
    for (const sentinel of LOW_INFORMATION_SENTINELS_V2) {
      if (utf8Bytes(sentinel) < 8) {
        continue;
      }
      expect(
        collectSensitiveCorpusV2(`password="${sentinel}"`).entries,
        sentinel,
      ).toEqual([]);
    }
    const eligible = collectSensitiveCorpusV2(
      `password=${ELIGIBLE_LONG_SECRET_V2}`,
    );
    expect(eligible.entries).toHaveLength(2);
    expect(eligible.entries.map((entry) => entry.propagation)).toEqual([
      'exact-text',
      'path-segment',
    ]);
    expect(eligible.totalUtf8Bytes).toBe(
      utf8Bytes(ELIGIBLE_LONG_SECRET_V2) * 2,
    );
  });
});

describe.runIf(corpusBoundariesSelected)('F1A corpus boundaries', () => {
  it('F1A-TEXT-BOUNDARY-001 matches exact-text boundaries only', () => {
    const corpus = createSensitiveCorpusV2([
      {
        value: 'cat',
        reasonCodes: ['SECRET_LIKE_VALUE'],
        propagation: 'exact-text',
      },
      {
        value: 'cat',
        reasonCodes: ['SECRET_LIKE_VALUE'],
        propagation: 'path-segment',
      },
    ]);
    const redacted = redactPublicFieldV2(
      TEXT_BOUNDARY_HAYSTACK_V2,
      'excerpt',
      corpus,
    );
    expect(redacted.value).toBe('[REDACTED] catalog scat [REDACTED]-1');
    const punctuated = createSensitiveCorpusV2([
      {
        value: ELIGIBLE_LONG_SECRET_V2,
        reasonCodes: ['SECRET_LIKE_VALUE'],
        propagation: 'exact-text',
      },
      {
        value: ELIGIBLE_LONG_SECRET_V2,
        reasonCodes: ['SECRET_LIKE_VALUE'],
        propagation: 'path-segment',
      },
    ]);
    expect(
      redactPublicFieldV2(
        `use(${ELIGIBLE_LONG_SECRET_V2})`,
        'excerpt',
        punctuated,
      ).value,
    ).toBe('use([REDACTED])');
  });

  it('F1A-PATH-SEGMENT-001 matches complete POSIX segments only', () => {
    const corpus = createSensitiveCorpusV2([
      {
        value: 'cat',
        reasonCodes: ['SECRET_LIKE_VALUE'],
        propagation: 'exact-text',
      },
      {
        value: 'cat',
        reasonCodes: ['SECRET_LIKE_VALUE'],
        propagation: 'path-segment',
      },
    ]);
    for (const fixture of PATH_SEGMENT_CASES_V2) {
      const redacted = redactPublicFieldV2(fixture.path, 'file', corpus);
      if (fixture.shouldRedact) {
        expect(redacted.value, fixture.path).toBe(PATH_PLACEHOLDER_V2);
      } else {
        expect(redacted.value, fixture.path).toBe(fixture.path);
      }
    }
  });
});

describe.runIf(phoneCorpusSelected)('F1A phone corpus policy', () => {
  it('F1A-PHONE-001 accepts 10-15 digit phone shapes', () => {
    for (const phone of PHONE_ACCEPT_V2) {
      expect(classifyPhoneTokenV2(phone, phone), phone).toBe('accept');
      const corpus = collectSensitiveCorpusV2(`contact ${phone}`);
      expect(
        corpus.entries.some((entry) => entry.value === phone),
        phone,
      ).toBe(true);
      expect(
        redactPublicFieldV2(phone, 'excerpt', EMPTY_SENSITIVE_CORPUS_V2).value,
        phone,
      ).toBe(TOKEN_PLACEHOLDER_V2);
    }
    expect(classifyPhoneTokenV2('2125551234', PHONE_WITH_CUE_V2)).toBe(
      'accept',
    );
    expect(classifyPhoneTokenV2('2125551234', '2125551234')).toBe(
      'local-only',
    );
  });

  it('F1A-PHONE-NEG-001 rejects dates versions uuid and bare unix', () => {
    for (const rejected of PHONE_REJECT_V2) {
      expect(classifyPhoneTokenV2(rejected, rejected), rejected).toBe(
        'reject',
      );
      expect(
        collectSensitiveCorpusV2(rejected).entries.some(
          (entry) => entry.value === rejected,
        ),
        rejected,
      ).toBe(false);
    }
    expect(
      collectSensitiveCorpusV2(PHONE_TIMESTAMP_CUE_V2).entries.some((entry) =>
        entry.value.includes('1690000000'),
      ),
    ).toBe(false);
    for (const bare of PHONE_LOCAL_ONLY_BARE_UNIX_V2) {
      expect(classifyPhoneTokenV2(bare, bare), bare).toBe('local-only');
      expect(
        collectSensitiveCorpusV2(bare).entries.some(
          (entry) => entry.value === bare,
        ),
        bare,
      ).toBe(false);
    }
  });
});

describe.runIf(amplificationSelected)('F1A redaction amplification', () => {
  it('F1A-AMPLIFICATION-001 and PLACEHOLDER-001 keep linear bounds', () => {
    const corpus = collectSensitiveCorpusV2(
      `password=${ELIGIBLE_LONG_SECRET_V2}`,
    );
    const original = AMPLIFICATION_REPEAT_ASSIGNMENT_V2;
    const redacted = redactPublicFieldV2(original, 'excerpt', corpus);
    const spans = mergeSensitiveSpansV2(original, [
      createSensitiveSpanV2(original, 9, 12, ['SECRET_LIKE_VALUE']),
    ]);
    const materialized = materializeSensitiveSpansV2(original, spans);
    assertAmplificationBoundV2(
      original,
      materialized.value,
      materialized.mergedSpanCount,
    );
    expect(redacted.value.includes(TOKEN_PLACEHOLDER_V2)).toBe(true);

    const withLiteral = redactPublicFieldV2(
      `${PLACEHOLDER_LITERALS_V2.token} ${ELIGIBLE_LONG_SECRET_V2}`,
      'excerpt',
      corpus,
    );
    expect(withLiteral.value).toBe(
      `${PLACEHOLDER_LITERALS_V2.token} ${TOKEN_PLACEHOLDER_V2}`,
    );
    expect(withLiteral.reasonCodes).toEqual(['SECRET_LIKE_VALUE']);
  });

  it('rejects foreign or cloned corpus at assembler provenance boundary', () => {
    const raw = createUnsafeLocateSuccessV2();
    if (!raw.ok) {
      throw new Error('Fixture must be a success.');
    }
    const corpus = collectSensitiveCorpusV2(raw);
    const clone = {
      entries: corpus.entries,
      totalUtf8Bytes: corpus.totalUtf8Bytes,
    };
    expect(() => assertCorpusProvenanceV2(raw, clone)).toThrow(
      /FOREIGN_OR_CLONE_SENSITIVE_CORPUS_V2/u,
    );
    const other = collectSensitiveCorpusV2({ other: 'password=LongSecret-99' });
    expect(() => assertCorpusProvenanceV2(raw, other)).toThrow(
      /FOREIGN_OR_CLONE_SENSITIVE_CORPUS_V2/u,
    );
    expect(assemblePublicLocateResultV2(raw).ok).toBe(true);
  });
});

describe.runIf(rankingKeySelected)('F1A public-safe ranking key', () => {
  it('F1A-RANKKEY-001 folds potential corpus targets conservatively', () => {
    for (const fixture of [
      { bytes: 7, retainable: true },
      { bytes: 8, retainable: false },
      { bytes: 512, retainable: false },
      { bytes: 513, retainable: false },
    ] as const) {
      const symbol = rankingSymbolOfBytesV2(fixture.bytes);
      const file = rankingFileWithSegmentBytesV2(fixture.bytes);
      const key = projectPublicSafeRankingKeyV2({ file, symbol });
      if (fixture.retainable) {
        expect(key.symbol).toBe(symbol);
        expect(key.file).toBe(file);
      } else {
        expect(key.symbol).toBe(TOKEN_PLACEHOLDER_V2);
        expect(key.file).toBe(PATH_PLACEHOLDER_V2);
      }
    }
    const sensitive = projectPublicSafeRankingKeyV2({
      file: 'src/api_key/a.ts',
      symbol: 'databasePassword',
    });
    expect(sensitive).toEqual({
      file: PATH_PLACEHOLDER_V2,
      symbol: TOKEN_PLACEHOLDER_V2,
    });
    const first = projectPublicSafeRankingKeyV2({
      file: 'src/safe.ts',
      symbol: 'ab',
    });
    const second = projectPublicSafeRankingKeyV2({
      file: 'src/safe.ts',
      symbol: 'ab',
    });
    expect(first).toEqual(second);
  });
});
