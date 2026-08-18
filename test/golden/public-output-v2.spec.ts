import { describe, expect, it } from 'vitest';

import {
  collectSensitiveCorpusV2,
  redactPublicFieldV2,
} from '../../src/evidence/public-output/sensitive-value-policy-v2.js';
import { finalizeLocateResultV2 } from '../../src/evidence/locate-execution/finalize-locate-result-v2.js';
import { locateExecutionFinalizerInputFromUnsafePublicSourceV2 } from '../../testkit/fixtures/locate-execution-v2/finalizer-facts-v2.js';
import { projectSyntheticLocateResultV2 } from '../../testkit/fixtures/public-output-v2/synthetic-locate-projection-helper-v2.js';
import { createUnsafeLocateSuccessV2 } from '../../testkit/fixtures/public-output-v2/synthetic-locate-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const projectionSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'public-output-v2-projection',
});
const determinismSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'public-output-v2-determinism',
});

function finalizeUnsafeSourceV2(
  source: ReturnType<typeof createUnsafeLocateSuccessV2>,
) {
  return finalizeLocateResultV2(
    locateExecutionFinalizerInputFromUnsafePublicSourceV2(source),
  ).value;
}

describe.runIf(projectionSelected)(
  'public output v2 hostile field projection',
  () => {
    it('matches the exact field truth table and removes the hostile corpus', () => {
      const forbidden = [
        'customer-do-not-publish',
        'db-password',
        'query-secret',
        'stan.guo@example.com',
      ] as const;
      const raw = {
        term: 'password=customer-do-not-publish',
        file: 'src/customer-do-not-publish/databasePassword.ts',
        symbol: 'databasePassword',
        excerpt:
          'postgres://admin:db-password@example.test/app?token=query-secret ' +
          'owner=stan.guo@example.com\u001b[31m',
      };
      const corpus = collectSensitiveCorpusV2(raw);
      const projection = {
        term: redactPublicFieldV2(raw.term, 'term', corpus),
        file: redactPublicFieldV2(raw.file, 'file', corpus),
        symbol: redactPublicFieldV2(raw.symbol, 'symbol', corpus),
        excerpt: redactPublicFieldV2(raw.excerpt, 'excerpt', corpus),
      };

      expect(projection).toEqual({
        term: {
          value: 'password=[REDACTED]',
          reasonCodes: ['SECRET_LIKE_VALUE'],
        },
        file: {
          value: '[REDACTED_PATH]',
          reasonCodes: ['SECRET_LIKE_VALUE'],
        },
        symbol: {
          value: 'databasePassword',
          reasonCodes: [],
        },
        excerpt: {
          value:
            'postgres://[REDACTED]@example.test/app?token=[REDACTED] ' +
            'owner=[REDACTED]',
          reasonCodes: [
            'CONNECTION_STRING',
            'PERSONAL_DATA',
            'UNTRUSTED_CONTROL_CHARACTERS',
          ],
        },
      });
      const serialized = JSON.stringify(projection);
      for (const value of forbidden) {
        expect(serialized).not.toContain(value);
      }
    });

    it('keeps the hostile corpus out of every parsed success projection', () => {
      const forbidden = 'all-projections-do-not-publish';
      const raw = structuredClone(createUnsafeLocateSuccessV2());
      if (!raw.ok) throw new Error('Fixture must be a success.');
      const mutable = raw as unknown as {
        evidence: {
          normalizedTerms: Array<{ value: string }>;
          confirmed: Array<{
            location: { file: string; symbol?: string; excerpt: string };
          }>;
        };
      };
      const term = mutable.evidence.normalizedTerms[0];
      const evidence = mutable.evidence.confirmed[0];
      if (term === undefined || evidence === undefined) {
        throw new Error('Fixture data missing.');
      }
      term.value = `password=${forbidden}`;
      evidence.location.file = `src/${forbidden}/config.ts`;
      evidence.location.symbol = `databasePassword-${forbidden}`;
      evidence.location.excerpt = `password=${forbidden}`;

      const parsed = finalizeUnsafeSourceV2(raw);
      const projection = projectSyntheticLocateResultV2(parsed);
      expect(projection.service).toEqual(parsed);
      expect(projection.structuredContent).toEqual(parsed);
      expect(JSON.parse(projection.text)).toMatchObject({
        schemaVersion: '2.0-agent',
      });
      expect(JSON.parse(projection.debugLocateStdout)).toEqual(parsed);
      expect(JSON.stringify(projection)).not.toContain(forbidden);
    });

    it('preserves uppercase and Pascal locators while blocking secret values and bare ESC', () => {
      const locators = ['MY_API_KEY', 'SERVICE-AUTH-TOKEN', 'ApiKey'] as const;
      const forbidden = ['json-do-not-publish', '\u001b'] as const;
      const raw = structuredClone(createUnsafeLocateSuccessV2());
      if (!raw.ok) throw new Error('Fixture must be a success.');
      const mutable = raw as unknown as {
        evidence: {
          normalizedTerms: Array<{ value: string }>;
          confirmed: Array<{
            location: { file: string; symbol?: string; excerpt: string };
          }>;
        };
      };
      const term = mutable.evidence.normalizedTerms[0];
      const evidence = mutable.evidence.confirmed[0];
      if (term === undefined || evidence === undefined) {
        throw new Error('Fixture data missing.');
      }
      term.value = locators[0];
      evidence.location.file = `src/${locators[1]}/config.json`;
      evidence.location.symbol = locators[2];
      evidence.location.excerpt = `{"password":"${forbidden[0]}"}${forbidden[1]}`;

      const projection = projectSyntheticLocateResultV2(
        finalizeUnsafeSourceV2(raw),
      );
      const serialized = JSON.stringify(projection);
      for (const value of locators) {
        expect(serialized).toContain(value);
      }
      for (const value of forbidden) {
        expect(serialized).not.toContain(value);
      }
    });

    it('blocks credentials, phone-like PII and malformed templates in all projections', () => {
      const credential = `ghp_${'A'.repeat(20)}`;
      const phone = '+1 (415) 555-0123';
      const malformedValue = 'malformed-template-do-not-publish';
      const raw = structuredClone(createUnsafeLocateSuccessV2());
      if (!raw.ok) throw new Error('Fixture must be a success.');
      const mutable = raw as unknown as {
        evidence: {
          normalizedTerms: Array<{ value: string }>;
          confirmed: Array<{
            location: { symbol?: string; excerpt: string };
          }>;
        };
      };
      const term = mutable.evidence.normalizedTerms[0];
      const evidence = mutable.evidence.confirmed[0];
      if (term === undefined || evidence === undefined) {
        throw new Error('Fixture data missing.');
      }
      term.value = credential;
      evidence.location.symbol = phone;
      evidence.location.excerpt = `clientSecret=\`${malformedValue}\\`;

      const parsed = finalizeUnsafeSourceV2(raw);
      if (!parsed.ok) throw new Error('Expected a public success.');
      expect(parsed.evidence.normalizedTerms[0]).toEqual({
        value: '[REDACTED]',
        caseSensitive: false,
      });
      expect(parsed.evidence.normalizedTerms[0]?.redaction).toBeUndefined();
      expect(parsed.evidence.confirmed[0]?.location.redaction?.fields).toEqual([
        {
          field: 'symbol',
          reasonCodes: ['PERSONAL_DATA'],
        },
        {
          field: 'excerpt',
          reasonCodes: ['SECRET_LIKE_VALUE', 'BINARY_OR_OVERSIZED_CONTENT'],
        },
      ]);

      const projection = projectSyntheticLocateResultV2(parsed);
      const serialized = JSON.stringify(projection);
      for (const value of [credential, phone, malformedValue]) {
        expect(serialized).not.toContain(value);
      }
      expect(projection.service).toEqual(parsed);
      expect(projection.structuredContent).toEqual(parsed);
      expect(JSON.parse(projection.text)).toMatchObject({
        schemaVersion: '2.0-agent',
      });
      expect(JSON.parse(projection.debugLocateStdout)).toEqual(parsed);
    });
  },
);

describe.runIf(determinismSelected)(
  'public output v2 field determinism',
  () => {
    it('produces stable bytes for an equivalent frozen corpus', () => {
      const input = {
        term: 'api_key=stable-secret',
        excerpt: 'api_key=stable-secret',
      };
      const project = (): string => {
        const corpus = collectSensitiveCorpusV2(input);
        return JSON.stringify({
          term: redactPublicFieldV2(input.term, 'term', corpus),
          excerpt: redactPublicFieldV2(input.excerpt, 'excerpt', corpus),
        });
      };
      expect(project()).toBe(project());
    });

    it('produces stable public bytes across repeat and input key insertion order', () => {
      const first = createUnsafeLocateSuccessV2();
      if (!first.ok) throw new Error('Fixture must be a success.');
      const reordered = {
        ok: true,
        evidence: {
          nextActions: first.evidence.nextActions,
          coverage: first.evidence.coverage,
          candidates: first.evidence.candidates,
          confirmed: first.evidence.confirmed,
          normalizedTerms: first.evidence.normalizedTerms,
        },
      } as const;
      const firstBytes = JSON.stringify(finalizeUnsafeSourceV2(first));
      expect(JSON.stringify(finalizeUnsafeSourceV2(first))).toBe(firstBytes);
      expect(JSON.stringify(finalizeUnsafeSourceV2(reordered))).toBe(
        firstBytes,
      );
    });

    it('canonicalizes nested exclusion-summary key insertion order', () => {
      const first = structuredClone(createUnsafeLocateSuccessV2());
      const second = structuredClone(createUnsafeLocateSuccessV2());
      if (!first.ok || !second.ok) {
        throw new Error('Fixtures must be successes.');
      }
      const firstMutable = first as unknown as {
        evidence: { coverage: { exclusionSummary: Record<string, number> } };
      };
      const secondMutable = second as unknown as {
        evidence: { coverage: { exclusionSummary: Record<string, number> } };
      };
      firstMutable.evidence.coverage.exclusionSummary = {
        NEGATIVE_TERM_MATCH: 1,
        OUTSIDE_LAYER_HINT: 2,
      };
      secondMutable.evidence.coverage.exclusionSummary = {
        OUTSIDE_LAYER_HINT: 2,
        NEGATIVE_TERM_MATCH: 1,
      };
      expect(JSON.stringify(finalizeUnsafeSourceV2(first))).toBe(
        JSON.stringify(finalizeUnsafeSourceV2(second)),
      );
    });
  },
);
