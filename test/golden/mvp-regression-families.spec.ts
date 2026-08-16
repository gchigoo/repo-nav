import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createDiscoveryKey,
  type EvidenceLocation,
  type NormalizedSearchTerm,
} from '../../src/contracts/index.js';
import { LocateResultV2Schema } from '../../src/contracts/v2/locate-result-v2.js';
import { classifyDiscoveryRecords } from '../../src/evidence/direct-mapping-classifier.js';
import type { DiscoveryRecord } from '../../src/evidence/discovery-record.js';
import { redactPublicText } from '../../src/evidence/evidence-redactor.js';
import { finalizeLocateResultV2 } from '../../src/evidence/locate-execution/finalize-locate-result-v2.js';
import { locateExecutionFinalizerInputFromUnsafePublicSourceV2 } from '../../testkit/fixtures/locate-execution-v2/finalizer-facts-v2.js';
import { createUnsafeLocateSuccessV2 } from '../../testkit/fixtures/public-output-v2/synthetic-locate-v2.js';
import { buildFixtureCompletenessReport } from '../../testkit/contracts/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const mappingTerms: readonly NormalizedSearchTerm[] = [
  { value: 'targetField', caseSensitive: false },
  { value: 'row.source_field', caseSensitive: false },
];

function record(file: string, excerpt: string): DiscoveryRecord {
  const location: EvidenceLocation = {
    file,
    lines: [1, excerpt.split('\n').length],
    excerpt,
  };
  return {
    discoveryKey: createDiscoveryKey(location),
    location,
    discoveredBy: ['ripgrep'],
    operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
    discoveryReasonCodes: ['LITERAL_TERM_HIT'],
    matchedTerms: mappingTerms,
    focusLines: location.lines,
    focusExcerpt: excerpt,
    canonicalSymbols: [],
  };
}

describe.runIf(
  isSelected({
    group: 'classification',
    caseId: 'classification-syntax-family',
  }),
)('classification syntax family', () => {
  it('confirms assignment/object/SQL and rejects executable-looking decoys', () => {
    const positives = [
      ['server/assignment.ts', 'targetField = row.source_field;'],
      ['server/object.ts', 'return { targetField: row.source_field };'],
      ['db/mapping.sql', 'SELECT row.source_field AS targetField FROM source'],
    ] as const;
    for (const [file, excerpt] of positives) {
      const classified = classifyDiscoveryRecords([record(file, excerpt)], {
        anchors: [],
        layers: [],
        negativeTerms: [],
      });
      expect(classified.confirmed, excerpt).toHaveLength(1);
      expect(classified.candidates, excerpt).toEqual([]);
    }

    for (const excerpt of [
      '// targetField = row.source_field;',
      'interface Dto { targetField: row.source_field }',
      'const example = "targetField = row.source_field";',
      "SELECT 'row.source_field AS targetField' AS note",
    ]) {
      const classified = classifyDiscoveryRecords(
        [
          record(
            excerpt.startsWith('SELECT') ? 'db/decoy.sql' : 'server/decoy.ts',
            excerpt,
          ),
        ],
        { anchors: [], layers: [], negativeTerms: [] },
      );
      expect(classified.confirmed, excerpt).toEqual([]);
      expect(classified.candidates, excerpt).toHaveLength(1);
    }
  });
});

describe.runIf(
  isSelected({ group: 'candidate', caseId: 'candidate-family-contract' }),
)('candidate family contract', () => {
  it('keeps promotion order exact and the locked false-positive ID absent', () => {
    const result = LocateResultV2Schema.parse(
      JSON.parse(
        readFileSync(
          resolve(
            repositoryRoot,
            'testkit',
            'expected',
            'sibling-candidate.json',
          ),
          'utf8',
        ),
      ) as unknown,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a successful candidate snapshot.');
    }
    expect(result.evidence.candidates).toHaveLength(4);
    expect(result.evidence.candidates[0]?.promotionRequirements).toEqual([
      'USER_SEMANTIC_CONFIRMATION',
      'DIRECT_REFERENCE_REQUIRED',
    ]);
    expect(result.evidence.candidates.map(({ id }) => id)).not.toContain(
      'evidence:v2:9999',
    );
  });
});

describe.runIf(
  isSelected({
    group: 'backend-transitions',
    caseId: 'backend-transition-family',
  }),
)('backend transition family', () => {
  it('owns every public backend transition reason through a registered case', () => {
    const report = buildFixtureCompletenessReport(repositoryRoot);
    const backendOwners = report.owners.filter(
      ({ family }) => family === 'BackendReasonCode',
    );
    expect(backendOwners).toHaveLength(7);
    expect(
      new Set(backendOwners.map(({ positive }) => positive)).size,
    ).toBeGreaterThan(4);
  });
});

describe.runIf(
  isSelected({ group: 'security', caseId: 'security-family-contract' }),
)('security family contract', () => {
  it('exercises all four redaction families without retaining forbidden values', () => {
    const cases = [
      ['api_key=rawSecretValue', 'SECRET_LIKE_VALUE', 'rawSecretValue'],
      [
        'postgres://admin:dbPassword@localhost/app',
        'CONNECTION_STRING',
        'dbPassword',
      ],
      ['owner=stan.guo@mail.ru', 'PERSONAL_DATA', 'stan.guo@mail.ru'],
      [
        `payload=${'x'.repeat(2_049)}`,
        'BINARY_OR_OVERSIZED_CONTENT',
        'x'.repeat(64),
      ],
    ] as const;
    for (const [input, reason, forbidden] of cases) {
      const output = redactPublicText(input);
      expect(output.reasonCodes, reason).toContain(reason);
      expect(output.value, reason).not.toContain(forbidden);
    }
  });
});

describe.runIf(
  isSelected({ group: 'final-status', caseId: 'final-status-family-contract' }),
)('final status family contract', () => {
  it('covers every recoverable final status and emits the family inventory', () => {
    const status = (
      mutation: Readonly<{
        empty?: boolean;
        incomplete?: boolean;
        unavailable?: boolean;
        abortSource?: 'caller' | 'deadline';
      }> = {},
    ) => {
      const raw = structuredClone(createUnsafeLocateSuccessV2());
      if (!raw.ok) throw new Error('Expected success fixture.');
      if (mutation.empty === true) {
        Object.assign(raw.evidence, { confirmed: [], candidates: [] });
      }
      if (mutation.incomplete === true || mutation.unavailable === true) {
        Object.assign(raw.evidence.coverage, {
          backends: [
            mutation.unavailable === true
              ? {
                  backend: 'ripgrep',
                  status: 'unavailable',
                  completion: 'incomplete',
                  termination: 'process-error',
                  reasonCode: 'RIPGREP_UNAVAILABLE',
                  hitCount: 0,
                }
              : {
                  backend: 'ripgrep',
                  status: 'used',
                  completion: 'incomplete',
                  termination: 'output-limit',
                  hitCount: 1,
                },
          ],
        });
      }
      if (mutation.abortSource !== undefined) {
        Object.assign(raw.evidence.coverage, {
          abortSource: mutation.abortSource,
        });
      }
      const result = finalizeLocateResultV2(
        locateExecutionFinalizerInputFromUnsafePublicSourceV2(raw),
      ).value;
      if (!result.ok) throw new Error('Expected finalized success.');
      return result.evidence.status;
    };
    const evaluations = [
      status(),
      status({ incomplete: true }),
      status({ empty: true }),
      status({ empty: true, unavailable: true }),
      status({ abortSource: 'caller' }),
      status({ abortSource: 'deadline' }),
    ];
    expect(evaluations).toEqual([
      'ok',
      'partial',
      'no_result',
      'backend_unavailable',
      'cancelled',
      'timeout',
    ]);

    const outputDirectory = resolve(
      repositoryRoot,
      'test-artifacts',
      'families',
    );
    mkdirSync(outputDirectory, { recursive: true });
    writeFileSync(
      resolve(outputDirectory, 'mvp-fixture-family-v1.json'),
      `${JSON.stringify(
        {
          schemaVersion: '1.0',
          families: {
            classification: ['assignment', 'object', 'sql', 'symbol', 'decoy'],
            candidate: [
              'sibling',
              'alias',
              'false-positive',
              'promotion-order',
            ],
            backendTransitions: [
              'codegraph-missing',
              'codegraph-no-result',
              'codegraph-failed',
              'codegraph-incomplete',
              'ripgrep-unavailable',
              'both-unavailable',
              'hit-unverified',
            ],
            security: ['layer-path', 'redaction', 'binary', 'oversized'],
            finalStatus: evaluations,
            protocol: ['schema', 'success-error-parity', 'typed-errors'],
            lifecycle: ['frames', 'exit', 'context-close', 'child-cleanup'],
          },
          status: 'passed',
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
  });
});
