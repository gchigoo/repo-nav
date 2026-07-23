import { describe, expect, it } from 'vitest';

import {
  BINARY_OR_OVERSIZED_PLACEHOLDER_V2,
  collectSensitiveCorpusV2,
  isValidRawLocatorV2,
  redactPublicFieldV2,
} from '../../src/evidence/public-output/sensitive-value-policy-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const fieldRedactionSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'field-redaction',
});
const locationRedactionSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'location-redaction',
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
      redactPublicFieldV2(`value=${'x'.repeat(2_049)}`, 'excerpt', []),
    ).toEqual({
      value: BINARY_OR_OVERSIZED_PLACEHOLDER_V2,
      reasonCodes: ['BINARY_OR_OVERSIZED_CONTENT'],
    });
  });

  it('canonicalizes excerpt line endings but replaces disallowed control runs', () => {
    expect(redactPublicFieldV2('first\r\nsecond\rlast\tok', 'excerpt', []))
      .toEqual({
        value: 'first\nsecond\nlast\tok',
        reasonCodes: [],
      });
    expect(redactPublicFieldV2('first\nsecond\tthird', 'term', [])).toEqual({
      value: 'first[REDACTED]second[REDACTED]third',
      reasonCodes: ['UNTRUSTED_CONTROL_CHARACTERS'],
    });
  });

  it('does not treat source placeholder literals as policy replacements', () => {
    expect(redactPublicFieldV2('[REDACTED]', 'excerpt', [])).toEqual({
      value: '[REDACTED]',
      reasonCodes: [],
    });
    expect(redactPublicFieldV2('[REDACTED_PATH]', 'file', [])).toEqual({
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
        const result = redactPublicFieldV2(identifier, field, []);
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
        [],
      );
      expect(file.value, identifier).toBe('[REDACTED_PATH]');
      expect(file.reasonCodes, identifier).toContain('SECRET_LIKE_VALUE');
    }

    for (const excerpt of [
      '{"password":"json-do-not-publish"}',
      "{'api_key':'json-do-not-publish'}",
      '"clientSecret" = "json-do-not-publish"',
    ]) {
      const result = redactPublicFieldV2(excerpt, 'excerpt', []);
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
      const result = redactPublicFieldV2(value, 'excerpt', []);
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
      const result = redactPublicFieldV2(credential, 'excerpt', []);
      expect(result.value, credential).not.toContain(credential);
      expect(result.reasonCodes, credential).toEqual([
        'SECRET_LIKE_VALUE',
      ]);
    }

    const phone = '+1 (415) 555-0123';
    expect(redactPublicFieldV2(phone, 'excerpt', [])).toEqual({
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
      expect(redactPublicFieldV2(malformed, 'excerpt', []), malformed)
        .toEqual({
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
