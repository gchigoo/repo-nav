import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  createDiscoveryKey,
  createEvidenceId,
  normalizeLocateAnchors,
  normalizeSearchTerms,
  type EvidenceLocation,
  type LocateResult,
  type NormalizedSearchTerm,
} from '../../src/contracts/index.js';
import { classifyDiscoveryRecords } from '../../src/evidence/direct-mapping-classifier.js';
import type { DiscoveryRecord } from '../../src/evidence/discovery-record.js';
import {
  assertGoldenCase,
  GoldenCaseSchema,
  type GoldenObservation,
  type GoldenSuccessCase,
} from '../../testkit/contracts/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const fixtureRoot = resolve(repositoryRoot, 'testkit', 'fixtures', 'text-engine');
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
        const matchedTerms = terms.filter((term) => containsTerm(excerpt, term));
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

function observe(caseId: ClassifierCaseId, goldenCase: GoldenSuccessCase): GoldenObservation {
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
  const result: LocateResult = {
    ok: true,
    evidence: {
      schemaVersion: '1.0',
      status: 'ok',
      repositoryRoot: goldenCase.fixtureRoot,
      normalizedTerms: terms,
      confirmed: classified.confirmed,
      candidates:
        caseId === 'exclusion-summary' ? [] : classified.candidates,
      coverage: {
        backends: [
          { backend: 'ripgrep', status: 'used', hitCount: records.length },
        ],
        fallbackChecked: false,
        indexState: 'unknown',
        indexFreshness: 'not-applicable',
        limitsReached: [],
        exclusionSummary: classified.exclusionSummary,
      },
      nextActions: classified.candidates.length > 0 ? ['CONFIRM_CANDIDATE'] : [],
    },
  };
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
        const terms = normalizeSearchTerms(
          goldenCase.request.terms,
          goldenCase.request.termCase ?? 'smart',
        );
        const records = recordsFor(CASE_FILES[caseId], terms);
        const decoy =
          caseId === 'source-field-mapping'
            ? records.find((item) => item.location.lines[0] === 2)
            : records[0];
        if (decoy === undefined) {
          throw new Error('Expected a decoy discovery record.');
        }
        expect(goldenCase.expected.forbiddenEvidenceIds).toEqual([
          createEvidenceId(decoy.discoveryKey, 'confirmed', 'value-mapping'),
        ]);
      },
    );
  });
}

defineCase('source-field-mapping');
defineCase('false-confirmation-decoys');
defineCase('exclusion-summary');
