import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  normalizeLocateAnchors,
  normalizeSearchTerms,
  type EvidenceLocation,
  type NormalizedSearchTerm,
} from '../../src/contracts/index.js';
import {
  LocateResultV2Schema,
  type LocateResultV2,
} from '../../src/contracts/v2/locate-result-v2.js';
import { classifyDiscoveryRecords } from '../../src/evidence/direct-mapping-classifier.js';
import type { DiscoveryRecord } from '../../src/evidence/discovery-record.js';
import { createDiscoveryKey } from '../../src/contracts/index.js';
import {
  assertGoldenCase,
  GoldenCaseSchema,
  type GoldenObservation,
  type GoldenSuccessCase,
} from '../../testkit/contracts/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const fixtureRoot = resolve(
  repositoryRoot,
  'testkit',
  'fixtures',
  'text-engine',
);
const manifestRoot = resolve(repositoryRoot, 'testkit', 'manifests', 'golden');

const CASE_FILES = Object.freeze({
  'source-field-mapping': ['server/mapping.fixture'],
  'false-confirmation-decoys': [
    'server/decoys.fixture',
    'tests/mapping.spec.fixture',
    'docs/example.md',
  ],
  'exclusion-summary': [
    'server/mapping.fixture',
    'server/negative.fixture',
    'client/outside.fixture',
    'tests/mapping.spec.fixture',
    'docs/example.md',
  ],
} as const);

type ClassifierCaseId = keyof typeof CASE_FILES;

function containsTerm(excerpt: string, term: NormalizedSearchTerm): boolean {
  return term.caseSensitive
    ? excerpt.includes(term.value)
    : excerpt
        .toLocaleLowerCase('und')
        .includes(term.value.toLocaleLowerCase('und'));
}

function recordsFor(
  files: readonly string[],
  terms: readonly NormalizedSearchTerm[],
): readonly DiscoveryRecord[] {
  return files.flatMap((file) =>
    readFileSync(resolve(fixtureRoot, ...file.split('/')), 'utf8')
      .replaceAll('\r\n', '\n')
      .split('\n')
      .flatMap((excerpt, index) => {
        const matchedTerms = terms.filter((term) =>
          containsTerm(excerpt, term),
        );
        if (excerpt.length === 0 || matchedTerms.length === 0) {
          return [];
        }
        const location: EvidenceLocation = {
          file,
          lines: [index + 1, index + 1],
          excerpt,
        };
        return [
          {
            discoveryKey: createDiscoveryKey(location),
            location,
            discoveredBy: ['ripgrep'],
            operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
            discoveryReasonCodes: ['LITERAL_TERM_HIT'],
            matchedTerms,
            focusLines: location.lines,
            focusExcerpt: location.excerpt,
            canonicalSymbols: [],
          },
        ];
      }),
  );
}

function loadCase(caseId: ClassifierCaseId): GoldenSuccessCase {
  const input: unknown = parse(
    readFileSync(resolve(manifestRoot, `${caseId}.yaml`), 'utf8'),
  );
  const parsed = GoldenCaseSchema.parse(input);
  if (parsed.kind !== 'success') {
    throw new Error(`${caseId} must be a success case.`);
  }
  return parsed;
}

function observe(
  caseId: ClassifierCaseId,
  goldenCase: GoldenSuccessCase,
): GoldenObservation {
  const mode = goldenCase.request.termCase ?? 'smart';
  const terms = normalizeSearchTerms(goldenCase.request.terms, mode);
  const negativeTerms = normalizeSearchTerms(
    goldenCase.request.negativeTerms ?? [],
    mode,
  );
  const records = recordsFor(CASE_FILES[caseId], terms);
  const classified = classifyDiscoveryRecords(
    records,
    {
      anchors: normalizeLocateAnchors(goldenCase.request.anchors ?? [], mode),
      layers: goldenCase.request.layers ?? [],
      negativeTerms,
    },
    caseId === 'exclusion-summary'
      ? { DUPLICATE_LOCATION: 1, UNVERIFIED_FILE_CONTENT: 1 }
      : {},
  );
  const candidates =
    caseId === 'exclusion-summary' ? [] : classified.candidates;
  const confirmed = classified.confirmed.map((item, index) =>
    Object.freeze({
      evidenceClass: 'confirmed' as const,
      id: `evidence:v2:${String(index + 1).padStart(4, '0')}`,
      role: item.role,
      location: Object.freeze({
        file: item.location.file,
        resolvable: true,
        ...(item.location.symbol === undefined
          ? {}
          : { symbol: item.location.symbol }),
        lines: item.location.lines,
        excerpt: item.location.excerpt,
        ...(item.location.redaction === undefined
          ? {}
          : {
              redaction: Object.freeze({
                applied: true as const,
                fields: Object.freeze([
                  Object.freeze({
                    field: 'excerpt' as const,
                    reasonCodes: item.location.redaction.reasonCodes,
                  }),
                ]),
              }),
            }),
      }),
      provenance: item.provenance,
      reasonCodes: item.reasonCodes,
    }),
  );
  const projectedCandidates = candidates.map((item, index) =>
    Object.freeze({
      evidenceClass: 'candidate' as const,
      id: `evidence:v2:${String(confirmed.length + index + 1).padStart(4, '0')}`,
      role: item.role,
      location: Object.freeze({
        file: item.location.file,
        resolvable: true,
        ...(item.location.symbol === undefined
          ? {}
          : { symbol: item.location.symbol }),
        lines: item.location.lines,
        excerpt: item.location.excerpt,
      }),
      provenance: item.provenance,
      reasonCodes: item.reasonCodes,
      promotionRequirements: item.promotionRequirements,
    }),
  );
  const result = LocateResultV2Schema.parse({
    ok: true,
    evidence: {
      schemaVersion: '2.0',
      status: 'ok',
      repositoryRef: 'local-repository',
      normalizedTerms: terms,
      confirmed,
      candidates: projectedCandidates,
      coverage: {
        backends: [
          {
            backend: 'ripgrep',
            status: 'used',
            completion: 'complete',
            termination: 'none',
            hitCount: records.length,
          },
        ],
        strategyComplete: true,
        fallbackChecked: false,
        indexState: 'unknown',
        indexFreshness: 'unknown',
        limitsReached: [],
        degradations: [],
        exclusionSummary: classified.exclusionSummary,
        abortSource: 'none',
        unsatisfiedAnchors: [],
        snapshot: {
          gitState: 'unknown',
          consistency: 'stable',
          filesChecked: Math.max(
            1,
            new Set(
              [...confirmed, ...projectedCandidates].map(
                (item) => item.location.file,
              ),
            ).size,
          ),
          discardedEvidenceCount: 0,
        },
        scope: {
          requested: [],
          effective: ['client', 'server', 'db', 'config', 'unknown'],
          policyVersion: 'repo-scope-v1',
          unmatchedLayers: [],
        },
        capabilities: {
          textSearch: 'supported-text-files',
          semanticClassification: [
            'typescript',
            'javascript',
            'sql',
            'python',
            'go',
          ],
          unsupportedLanguageHits: 0,
        },
      },
      nextActions: projectedCandidates.length > 0 ? ['CONFIRM_CANDIDATE'] : [],
    },
  } satisfies LocateResultV2);
  return {
    result,
    mcpIsError: false,
    structuredContent: result,
    textContent: JSON.stringify(result),
  };
}

function defineCase(caseId: ClassifierCaseId): void {
  const identity = { group: 'text-engine-classifier', caseId } as const;
  describe.runIf(isSelected(identity))(caseId, () => {
    it('matches the versioned Golden manifest', () => {
      const goldenCase = loadCase(caseId);
      const observation = observe(caseId, goldenCase);
      expect(() => assertGoldenCase(goldenCase, observation)).not.toThrow();
      if (!observation.result.ok) {
        throw new Error('Classifier Golden observation must be successful.');
      }
      if (caseId === 'false-confirmation-decoys') {
        expect(observation.result.evidence.confirmed).toEqual([]);
      }
      if (caseId === 'source-field-mapping') {
        expect(observation.result.evidence.confirmed).toHaveLength(1);
        expect(observation.result.evidence.candidates).toHaveLength(1);
      }
    });

    it.runIf(caseId !== 'exclusion-summary')(
      'locks a decoy hypothetical confirmed ID as forbidden',
      () => {
        const goldenCase = loadCase(caseId);
        expect(goldenCase.expected.forbiddenEvidenceIds).toEqual([
          'evidence:v2:9999',
        ]);
      },
    );
  });
}

defineCase('source-field-mapping');
defineCase('false-confirmation-decoys');
defineCase('exclusion-summary');
