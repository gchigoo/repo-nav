import { describe, expect, it } from 'vitest';

import {
  FinalizedUnsafeLocateResultV2Schema,
  LocateResultV2Schema,
  deriveLocateStatusV2,
  type FinalizedUnsafeLocateResultV2,
  type LocateResultV2,
} from '../../src/contracts/v2/locate-result-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'public-output-v2',
  caseId: 'schema-contract-families',
});

function rawSuccess(): FinalizedUnsafeLocateResultV2 {
  return {
    ok: true,
    evidence: {
      normalizedTerms: [{ value: 'mapping', caseSensitive: false }],
      confirmed: [
        {
          evidenceClass: 'confirmed',
          role: 'value-mapping',
          location: {
            file: 'src/server/mapping.ts',
            symbol: 'resolveMapping',
            lines: [1, 3],
            excerpt: 'export const resolveMapping = true;',
          },
          provenance: {
            discoveredBy: ['codegraph', 'filesystem'],
            verifiedBy: 'filesystem',
            operations: ['CODEGRAPH_QUERY', 'FILESYSTEM_READ_RANGE'],
          },
          reasonCodes: ['DIRECT_ALIAS_MAPPING'],
        },
      ],
      candidates: [],
      coverage: {
        backends: [
          {
            backend: 'codegraph',
            status: 'used',
            completion: 'complete',
            termination: 'none',
            hitCount: 1,
          },
        ],
        strategyComplete: true,
        fallbackChecked: true,
        indexState: 'available',
        indexFreshness: 'not-applicable',
        limitsReached: [],
        degradations: [],
        exclusionSummary: {},
        abortSource: 'none',
        unsatisfiedAnchors: [],
        snapshot: {
          gitState: 'clean',
          consistency: 'stable',
          filesChecked: 1,
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
          semanticClassification: ['typescript', 'javascript', 'sql'],
          unsupportedLanguageHits: 0,
        },
      },
      nextActions: [],
    },
  };
}

function publicSuccess(): LocateResultV2 {
  const raw = rawSuccess();
  if (!raw.ok) throw new Error('Fixture must be a success.');
  return {
    ok: true,
    evidence: {
      schemaVersion: '2.0',
      status: 'ok',
      repositoryRef: 'local-repository',
      normalizedTerms: raw.evidence.normalizedTerms,
      confirmed: raw.evidence.confirmed.map((item) => ({
        ...item,
        id: 'evidence:v2:0001',
        location: { ...item.location, resolvable: true },
      })),
      candidates: [],
      coverage: raw.evidence.coverage,
      nextActions: [],
    },
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

describe.runIf(selected)('LocateResultV2 schema contract families', () => {
  it('strictly parses the complete raw and public positive owners', () => {
    expect(FinalizedUnsafeLocateResultV2Schema.parse(rawSuccess())).toEqual(
      rawSuccess(),
    );
    expect(LocateResultV2Schema.parse(publicSuccess())).toEqual(publicSuccess());
  });

  it('rejects output-owned and arbitrary raw fields', () => {
    for (const extra of [
      { schemaVersion: '2.0' },
      { repositoryRef: 'local-repository' },
      { status: 'ok' },
      { root: 'D:/private/repo' },
      { discoveryHash: 'do-not-publish' },
    ]) {
      const fixture = clone(rawSuccess()) as unknown as {
        evidence: Record<string, unknown>;
      };
      Object.assign(fixture.evidence, extra);
      expect(FinalizedUnsafeLocateResultV2Schema.safeParse(fixture).success)
        .toBe(false);
    }
  });

  it('rejects public IDs, resolvability and redaction metadata in raw evidence', () => {
    for (const extra of [
      { id: 'evidence:v2:0001' },
      { resolvable: true },
      { redaction: { applied: true, fields: [] } },
    ]) {
      const fixture = clone(rawSuccess()) as unknown as {
        evidence: {
          confirmed: Array<{
            location: Record<string, unknown>;
            [key: string]: unknown;
          }>;
        };
      };
      const confirmed = fixture.evidence.confirmed[0];
      if (confirmed === undefined) throw new Error('Fixture evidence missing.');
      if ('id' in extra) Object.assign(confirmed, extra);
      else Object.assign(confirmed.location, extra);
      expect(FinalizedUnsafeLocateResultV2Schema.safeParse(fixture).success)
        .toBe(false);
    }
  });

  it('rejects structurally invalid raw repository locators', () => {
    for (const file of [
      '/private/a.ts',
      'C:/private/a.ts',
      String.raw`C:\private\a.ts`,
      String.raw`\\server\share\a.ts`,
      'src/../a.ts',
      'src//a.ts',
      'src/\0a.ts',
    ]) {
      const fixture = clone(rawSuccess()) as unknown as {
        evidence: {
          confirmed: Array<{ location: { file: string } }>;
        };
      };
      const confirmed = fixture.evidence.confirmed[0];
      if (confirmed === undefined) throw new Error('Fixture evidence missing.');
      confirmed.location.file = file;
      expect(
        FinalizedUnsafeLocateResultV2Schema.safeParse(fixture).success,
        file,
      ).toBe(false);
    }
  });

  it('owns backend ledger contradictions', () => {
    const fixture = clone(rawSuccess()) as unknown as {
      evidence: { coverage: { backends: unknown[] } };
    };
    fixture.evidence.coverage.backends[0] = {
      backend: 'codegraph',
      status: 'used',
      completion: 'complete',
      termination: 'timeout',
      hitCount: 1,
    };
    expect(FinalizedUnsafeLocateResultV2Schema.safeParse(fixture).success)
      .toBe(false);
  });

  it('rejects non-canonical limit and degradation order in raw and public coverage', () => {
    const reversedLimits = clone(rawSuccess()) as unknown as {
      evidence: {
        coverage: {
          abortSource: string;
          limitsReached: string[];
        };
      };
    };
    reversedLimits.evidence.coverage.abortSource = 'deadline';
    reversedLimits.evidence.coverage.limitsReached = [
      'TIMEOUT_REACHED',
      'MAX_FILES_REACHED',
    ];
    expect(
      FinalizedUnsafeLocateResultV2Schema.safeParse(reversedLimits).success,
    ).toBe(false);

    const reversedDegradations = clone(rawSuccess()) as unknown as {
      evidence: {
        coverage: {
          backends: unknown[];
          strategyComplete: boolean;
          degradations: string[];
          capabilities: { unsupportedLanguageHits: number };
        };
      };
    };
    reversedDegradations.evidence.coverage.backends = [
      {
        backend: 'codegraph',
        status: 'used',
        completion: 'incomplete',
        termination: 'output-limit',
        hitCount: 1,
      },
    ];
    reversedDegradations.evidence.coverage.strategyComplete = false;
    reversedDegradations.evidence.coverage.degradations = [
      'PROCESS_OUTPUT_LIMIT_REACHED',
      'SEMANTIC_LANGUAGE_UNSUPPORTED',
    ];
    reversedDegradations.evidence.coverage.capabilities
      .unsupportedLanguageHits = 1;
    expect(
      FinalizedUnsafeLocateResultV2Schema.safeParse(reversedDegradations)
        .success,
    ).toBe(false);

    const publicReversed = clone(publicSuccess()) as unknown as {
      evidence: {
        status: string;
        coverage: {
          abortSource: string;
          limitsReached: string[];
        };
      };
    };
    publicReversed.evidence.status = 'timeout';
    publicReversed.evidence.coverage.abortSource = 'deadline';
    publicReversed.evidence.coverage.limitsReached = [
      'TIMEOUT_REACHED',
      'MAX_FILES_REACHED',
    ];
    expect(LocateResultV2Schema.safeParse(publicReversed).success).toBe(false);
  });

  it('owns backend termination, reason, hit and fallback compensation truth', () => {
    const mutations = [
      {
        backends: [
          {
            backend: 'codegraph',
            status: 'used',
            completion: 'incomplete',
            termination: 'output-limit',
            hitCount: 1,
          },
        ],
        strategyComplete: true,
      },
      {
        backends: [
          {
            backend: 'codegraph',
            status: 'unavailable',
            completion: 'incomplete',
            termination: 'none',
            reasonCode: 'RIPGREP_UNAVAILABLE',
            hitCount: 0,
          },
        ],
        strategyComplete: false,
      },
      {
        backends: [
          {
            backend: 'codegraph',
            status: 'used',
            completion: 'incomplete',
            termination: 'early-stop',
            hitCount: 1,
          },
        ],
        strategyComplete: false,
      },
      {
        backends: [
          {
            backend: 'codegraph',
            status: 'used',
            completion: 'incomplete',
            termination: 'output-limit',
            hitCount: 1,
          },
        ],
        strategyComplete: false,
      },
      {
        backends: [
          {
            backend: 'codegraph',
            status: 'used',
            completion: 'incomplete',
            termination: 'aborted',
            reasonCode: 'BACKEND_ABORTED',
            hitCount: 1,
          },
        ],
        strategyComplete: false,
      },
      {
        backends: [
          {
            backend: 'ripgrep',
            status: 'unavailable',
            completion: 'incomplete',
            termination: 'process-error',
            reasonCode: 'RIPGREP_UNAVAILABLE',
            hitCount: 1,
          },
        ],
        strategyComplete: false,
      },
    ] as const;
    for (const mutation of mutations) {
      const fixture = clone(rawSuccess()) as unknown as {
        evidence: {
          coverage: {
            backends: unknown[];
            strategyComplete: boolean;
          };
        };
      };
      fixture.evidence.coverage.backends = [...mutation.backends];
      fixture.evidence.coverage.strategyComplete =
        mutation.strategyComplete;
      expect(
        FinalizedUnsafeLocateResultV2Schema.safeParse(fixture).success,
        JSON.stringify(mutation),
      ).toBe(false);
    }

    const compensated = clone(rawSuccess()) as unknown as {
      evidence: {
        coverage: {
          backends: unknown[];
          strategyComplete: boolean;
          degradations: string[];
        };
      };
    };
    compensated.evidence.coverage.backends = [
      {
        backend: 'codegraph',
        status: 'used',
        completion: 'incomplete',
        termination: 'output-limit',
        hitCount: 1,
      },
      {
        backend: 'ripgrep',
        status: 'used',
        completion: 'complete',
        termination: 'none',
        hitCount: 1,
      },
    ];
    compensated.evidence.coverage.strategyComplete = true;
    compensated.evidence.coverage.degradations = [];
    expect(
      FinalizedUnsafeLocateResultV2Schema.safeParse(compensated).success,
    ).toBe(true);
  });

  it('requires early-stop hits and an executed fallback ledger', () => {
    const earlyStopWithoutHits = clone(rawSuccess()) as unknown as {
      evidence: {
        confirmed: unknown[];
        coverage: {
          backends: unknown[];
          strategyComplete: boolean;
          limitsReached: string[];
          degradations: string[];
        };
      };
    };
    earlyStopWithoutHits.evidence.confirmed = [];
    earlyStopWithoutHits.evidence.coverage.backends = [
      {
        backend: 'codegraph',
        status: 'used',
        completion: 'incomplete',
        termination: 'early-stop',
        hitCount: 0,
      },
    ];
    earlyStopWithoutHits.evidence.coverage.strategyComplete = false;
    earlyStopWithoutHits.evidence.coverage.limitsReached = [
      'MAX_BACKEND_HITS_REACHED',
    ];
    earlyStopWithoutHits.evidence.coverage.degradations = [
      'BACKEND_EARLY_STOPPED',
    ];
    expect(
      FinalizedUnsafeLocateResultV2Schema.safeParse(earlyStopWithoutHits)
        .success,
    ).toBe(false);

    const hiddenFallback = clone(rawSuccess()) as unknown as {
      evidence: {
        coverage: {
          backends: unknown[];
          fallbackChecked: boolean;
        };
      };
    };
    hiddenFallback.evidence.coverage.backends = [
      {
        backend: 'codegraph',
        status: 'used',
        completion: 'complete',
        termination: 'none',
        hitCount: 1,
      },
      {
        backend: 'ripgrep',
        status: 'used',
        completion: 'complete',
        termination: 'none',
        hitCount: 1,
      },
    ];
    hiddenFallback.evidence.coverage.fallbackChecked = false;
    expect(
      FinalizedUnsafeLocateResultV2Schema.safeParse(hiddenFallback).success,
    ).toBe(false);
  });

  it('allows caller or deadline abort after a backend completed', () => {
    for (const abortSource of ['caller', 'deadline'] as const) {
      const fixture = clone(rawSuccess()) as unknown as {
        evidence: {
          coverage: {
            abortSource: string;
            limitsReached: string[];
          };
        };
      };
      fixture.evidence.coverage.abortSource = abortSource;
      fixture.evidence.coverage.limitsReached =
        abortSource === 'deadline' ? ['TIMEOUT_REACHED'] : [];
      expect(
        FinalizedUnsafeLocateResultV2Schema.safeParse(fixture).success,
        abortSource,
      ).toBe(true);
    }
  });

  it('accepts every canonical backend termination family', () => {
    const variants = [
      {
        backends: [
          {
            backend: 'codegraph',
            status: 'used',
            completion: 'complete',
            termination: 'none',
            reasonCode: 'CODEGRAPH_NO_RESULT',
            hitCount: 0,
          },
        ],
        strategyComplete: true,
        limitsReached: [],
        degradations: [],
        abortSource: 'none',
      },
      {
        backends: [
          {
            backend: 'codegraph',
            status: 'used',
            completion: 'incomplete',
            termination: 'early-stop',
            hitCount: 2,
          },
        ],
        strategyComplete: false,
        limitsReached: ['MAX_BACKEND_HITS_REACHED'],
        degradations: ['BACKEND_EARLY_STOPPED'],
        abortSource: 'none',
      },
      {
        backends: [
          {
            backend: 'codegraph',
            status: 'used',
            completion: 'incomplete',
            termination: 'output-limit',
            hitCount: 2,
          },
        ],
        strategyComplete: false,
        limitsReached: [],
        degradations: ['PROCESS_OUTPUT_LIMIT_REACHED'],
        abortSource: 'none',
      },
      {
        backends: [
          {
            backend: 'codegraph',
            status: 'used',
            completion: 'incomplete',
            termination: 'aborted',
            reasonCode: 'BACKEND_ABORTED',
            hitCount: 1,
          },
        ],
        strategyComplete: false,
        limitsReached: [],
        degradations: [],
        abortSource: 'caller',
      },
      {
        backends: [
          {
            backend: 'codegraph',
            status: 'failed',
            completion: 'incomplete',
            termination: 'timeout',
            reasonCode: 'BACKEND_PROCESS_FAILED',
            hitCount: 0,
          },
        ],
        strategyComplete: false,
        limitsReached: [],
        degradations: [],
        abortSource: 'none',
      },
      {
        backends: [
          {
            backend: 'ripgrep',
            status: 'failed',
            completion: 'incomplete',
            termination: 'process-error',
            reasonCode: 'BACKEND_PROCESS_FAILED',
            hitCount: 1,
          },
        ],
        strategyComplete: false,
        limitsReached: [],
        degradations: [],
        abortSource: 'none',
      },
      {
        backends: [
          {
            backend: 'codegraph',
            status: 'unavailable',
            completion: 'incomplete',
            termination: 'none',
            reasonCode: 'CODEGRAPH_INDEX_MISSING',
            hitCount: 0,
          },
        ],
        strategyComplete: false,
        limitsReached: [],
        degradations: [],
        abortSource: 'none',
      },
    ] as const;
    for (const variant of variants) {
      const fixture = clone(rawSuccess()) as unknown as {
        evidence: {
          confirmed: unknown[];
          coverage: {
            backends: unknown[];
            strategyComplete: boolean;
            limitsReached: string[];
            degradations: string[];
            abortSource: string;
          };
        };
      };
      fixture.evidence.coverage.backends = [...variant.backends];
      fixture.evidence.coverage.strategyComplete =
        variant.strategyComplete;
      fixture.evidence.coverage.limitsReached = [
        ...variant.limitsReached,
      ];
      fixture.evidence.coverage.degradations = [
        ...variant.degradations,
      ];
      fixture.evidence.coverage.abortSource = variant.abortSource;
      if (variant.backends[0]?.hitCount === 0) {
        fixture.evidence.confirmed = [];
      }
      expect(
        FinalizedUnsafeLocateResultV2Schema.safeParse(fixture).success,
        JSON.stringify(variant),
      ).toBe(true);
    }
  });

  it('owns snapshot consistency and retained evidence', () => {
    const fixture = clone(rawSuccess()) as unknown as {
      evidence: { coverage: { snapshot: unknown } };
    };
    fixture.evidence.coverage.snapshot = {
      gitState: 'unknown',
      consistency: 'unknown',
      filesChecked: 0,
      discardedEvidenceCount: 0,
    };
    expect(FinalizedUnsafeLocateResultV2Schema.safeParse(fixture).success)
      .toBe(false);
  });

  it('requires snapshot discarded and exclusion counts to agree', () => {
    const fixture = clone(rawSuccess()) as unknown as {
      evidence: {
        confirmed: unknown[];
        coverage: {
          degradations: string[];
          exclusionSummary: Record<string, number>;
          snapshot: {
            gitState: string;
            consistency: string;
            filesChecked: number;
            discardedEvidenceCount: number;
          };
        };
      };
    };
    fixture.evidence.confirmed = [];
    fixture.evidence.coverage.degradations = ['SNAPSHOT_CHANGED'];
    fixture.evidence.coverage.exclusionSummary = {
      SNAPSHOT_CHANGED: 2,
    };
    fixture.evidence.coverage.snapshot = {
      gitState: 'dirty',
      consistency: 'changed',
      filesChecked: 0,
      discardedEvidenceCount: 0,
    };
    expect(FinalizedUnsafeLocateResultV2Schema.safeParse(fixture).success)
      .toBe(false);
  });

  it('bounds retained evidence by the unique checked snapshot files', () => {
    const changedWithoutCheckedFiles = clone(rawSuccess()) as unknown as {
      evidence: {
        coverage: {
          degradations: string[];
          exclusionSummary: Record<string, number>;
          snapshot: {
            gitState: string;
            consistency: string;
            filesChecked: number;
            discardedEvidenceCount: number;
          };
        };
      };
    };
    changedWithoutCheckedFiles.evidence.coverage.degradations = [
      'SNAPSHOT_CHANGED',
    ];
    changedWithoutCheckedFiles.evidence.coverage.exclusionSummary = {
      SNAPSHOT_CHANGED: 1,
    };
    changedWithoutCheckedFiles.evidence.coverage.snapshot = {
      gitState: 'dirty',
      consistency: 'changed',
      filesChecked: 0,
      discardedEvidenceCount: 1,
    };
    expect(
      FinalizedUnsafeLocateResultV2Schema.safeParse(
        changedWithoutCheckedFiles,
      ).success,
    ).toBe(false);

    const twoFiles = clone(rawSuccess()) as unknown as {
      evidence: {
        confirmed: Array<{
          location: { file: string };
          [key: string]: unknown;
        }>;
        coverage: {
          snapshot: { filesChecked: number };
        };
      };
    };
    const first = twoFiles.evidence.confirmed[0];
    if (first === undefined) throw new Error('Fixture evidence missing.');
    twoFiles.evidence.confirmed.push({
      ...structuredClone(first),
      location: {
        ...structuredClone(first.location),
        file: 'src/server/second-mapping.ts',
      },
    });
    expect(
      FinalizedUnsafeLocateResultV2Schema.safeParse(twoFiles).success,
    ).toBe(false);

    twoFiles.evidence.coverage.snapshot.filesChecked = 2;
    expect(
      FinalizedUnsafeLocateResultV2Schema.safeParse(twoFiles).success,
    ).toBe(true);
  });

  it('owns default versus explicit scope and unmatched subsets', () => {
    const fixture = clone(rawSuccess()) as unknown as {
      evidence: {
        coverage: { scope: { unmatchedLayers: string[] } };
      };
    };
    fixture.evidence.coverage.scope.unmatchedLayers = ['docs'];
    expect(FinalizedUnsafeLocateResultV2Schema.safeParse(fixture).success)
      .toBe(false);
  });

  it('owns language capability degradation parity', () => {
    const fixture = clone(rawSuccess()) as unknown as {
      evidence: {
        coverage: { capabilities: { unsupportedLanguageHits: number } };
      };
    };
    fixture.evidence.coverage.capabilities.unsupportedLanguageHits = 1;
    expect(FinalizedUnsafeLocateResultV2Schema.safeParse(fixture).success)
      .toBe(false);
  });

  it('owns abort, timeout and limit parity', () => {
    const fixture = clone(rawSuccess()) as unknown as {
      evidence: { coverage: { abortSource: string } };
    };
    fixture.evidence.coverage.abortSource = 'deadline';
    expect(FinalizedUnsafeLocateResultV2Schema.safeParse(fixture).success)
      .toBe(false);
  });

  it('owns anchor completeness and request-index ordering', () => {
    const fixture = clone(rawSuccess()) as unknown as {
      evidence: {
        coverage: {
          strategyComplete: boolean;
          unsatisfiedAnchors: unknown[];
        };
      };
    };
    fixture.evidence.coverage.strategyComplete = false;
    fixture.evidence.coverage.unsatisfiedAnchors = [
      {
        requestIndex: 0,
        kind: 'symbol',
        satisfaction: 'none',
        reason: 'NOT_FOUND',
      },
    ];
    expect(FinalizedUnsafeLocateResultV2Schema.safeParse(fixture).success)
      .toBe(false);
  });

  it('rejects caller-owned LOCATION_REDACTED', () => {
    const fixture = clone(rawSuccess()) as unknown as {
      evidence: { coverage: { degradations: string[] } };
    };
    fixture.evidence.coverage.degradations = ['LOCATION_REDACTED'];
    expect(FinalizedUnsafeLocateResultV2Schema.safeParse(fixture).success)
      .toBe(false);
  });

  it('owns public location metadata and ordinal ID continuity', () => {
    const fixture = clone(publicSuccess()) as unknown as {
      evidence: { confirmed: Array<Record<string, unknown>> };
    };
    fixture.evidence.confirmed[0] = {
      ...fixture.evidence.confirmed[0]!,
      id: 'evidence:v2:0002',
    };
    expect(LocateResultV2Schema.safeParse(fixture).success).toBe(false);

    const locationFixture = clone(publicSuccess()) as unknown as {
      evidence: {
        confirmed: Array<{
          location: Record<string, unknown>;
          [key: string]: unknown;
        }>;
      };
    };
    const locationEvidence = locationFixture.evidence.confirmed[0];
    if (locationEvidence === undefined) {
      throw new Error('Fixture evidence missing.');
    }
    locationFixture.evidence.confirmed[0] = {
      ...locationEvidence,
      location: {
        ...locationEvidence.location,
        file: '[REDACTED_PATH]',
        resolvable: false,
      },
    };
    expect(LocateResultV2Schema.safeParse(locationFixture).success).toBe(false);
  });

  it('treats a safe literal path placeholder as resolvable source content', () => {
    const fixture = clone(publicSuccess()) as unknown as {
      evidence: {
        confirmed: Array<{
          location: {
            file: string;
            resolvable: boolean;
            redaction?: unknown;
          };
        }>;
      };
    };
    const confirmed = fixture.evidence.confirmed[0];
    if (confirmed === undefined) throw new Error('Fixture evidence missing.');
    confirmed.location.file = '[REDACTED_PATH]';
    confirmed.location.resolvable = true;
    delete confirmed.location.redaction;
    expect(LocateResultV2Schema.safeParse(fixture).success).toBe(true);
  });

  it('rejects unsafe control characters in every public text field', () => {
    const displayThreats = [
      '\n',
      '\r',
      '\t',
      '\u001b',
      '\u007f',
      '\u202e',
    ];
    const termResults = displayThreats.map((threat) => {
      const fixture = clone(publicSuccess()) as unknown as {
        evidence: { normalizedTerms: Array<{ value: string }> };
      };
      const term = fixture.evidence.normalizedTerms[0];
      if (term === undefined) throw new Error('Fixture term missing.');
      term.value = `safe${threat}term`;
      return LocateResultV2Schema.safeParse(fixture).success;
    });
    const symbolResults = displayThreats.map((threat) => {
      const fixture = clone(publicSuccess()) as unknown as {
        evidence: {
          confirmed: Array<{ location: { symbol?: string } }>;
        };
      };
      const confirmed = fixture.evidence.confirmed[0];
      if (confirmed === undefined) throw new Error('Fixture evidence missing.');
      confirmed.location.symbol = `safe${threat}symbol`;
      return LocateResultV2Schema.safeParse(fixture).success;
    });
    const excerptThreats = ['\r', '\u001b', '\u007f', '\u202e'];
    const excerptResults = excerptThreats.map((threat) => {
      const fixture = clone(publicSuccess()) as unknown as {
        evidence: {
          confirmed: Array<{ location: { excerpt: string } }>;
        };
      };
      const confirmed = fixture.evidence.confirmed[0];
      if (confirmed === undefined) throw new Error('Fixture evidence missing.');
      confirmed.location.excerpt = `safe${threat}excerpt`;
      return LocateResultV2Schema.safeParse(fixture).success;
    });
    expect([...termResults, ...symbolResults, ...excerptResults]).toEqual(
      Array.from(
        { length: termResults.length + symbolResults.length + excerptResults.length },
        () => false,
      ),
    );

    const formattedExcerpt = clone(publicSuccess()) as unknown as {
      evidence: {
        confirmed: Array<{ location: { excerpt: string } }>;
      };
    };
    const confirmed = formattedExcerpt.evidence.confirmed[0];
    if (confirmed === undefined) throw new Error('Fixture evidence missing.');
    confirmed.location.excerpt = 'line one\n\tline two';
    expect(LocateResultV2Schema.safeParse(formattedExcerpt).success).toBe(
      true,
    );
  });

  it('requires public redaction metadata to identify a replacement token', () => {
    const termFixture = clone(publicSuccess()) as unknown as {
      evidence: {
        normalizedTerms: Array<Record<string, unknown>>;
      };
    };
    const term = termFixture.evidence.normalizedTerms[0];
    if (term === undefined) throw new Error('Fixture term missing.');
    term.redaction = {
      applied: true,
      reasonCodes: ['SECRET_LIKE_VALUE'],
    };

    const symbolFixture = clone(publicSuccess()) as unknown as {
      evidence: {
        confirmed: Array<{
          location: Record<string, unknown> & {
            redaction?: {
              applied: true;
              fields: unknown[];
            };
          };
        }>;
      };
    };
    const symbolEvidence = symbolFixture.evidence.confirmed[0];
    if (symbolEvidence === undefined) {
      throw new Error('Fixture evidence missing.');
    }
    symbolEvidence.location.redaction = {
      applied: true,
      fields: [
        {
          field: 'symbol',
          reasonCodes: ['SECRET_LIKE_VALUE'],
        },
      ],
    };

    const excerptFixture = clone(publicSuccess()) as unknown as {
      evidence: {
        confirmed: Array<{
          location: Record<string, unknown> & {
            redaction?: {
              applied: true;
              fields: unknown[];
            };
          };
        }>;
      };
    };
    const excerptEvidence = excerptFixture.evidence.confirmed[0];
    if (excerptEvidence === undefined) {
      throw new Error('Fixture evidence missing.');
    }
    excerptEvidence.location.redaction = {
      applied: true,
      fields: [
        {
          field: 'excerpt',
          reasonCodes: ['SECRET_LIKE_VALUE'],
        },
      ],
    };

    expect(
      [
        LocateResultV2Schema.safeParse(termFixture).success,
        LocateResultV2Schema.safeParse(symbolFixture).success,
        LocateResultV2Schema.safeParse(excerptFixture).success,
      ],
    ).toEqual([false, false, false]);
  });

  it('bounds public retained evidence by checked snapshot files', () => {
    const fixture = clone(publicSuccess()) as unknown as {
      evidence: {
        confirmed: Array<{
          id: string;
          location: { file: string };
          [key: string]: unknown;
        }>;
      };
    };
    const first = fixture.evidence.confirmed[0];
    if (first === undefined) throw new Error('Fixture evidence missing.');
    fixture.evidence.confirmed.push({
      ...structuredClone(first),
      id: 'evidence:v2:0002',
      location: {
        ...structuredClone(first.location),
        file: 'src/server/public-second.ts',
      },
    });
    expect(LocateResultV2Schema.safeParse(fixture).success).toBe(false);
  });

  it('rejects unsafe resolvable paths at the public schema boundary', () => {
    for (const file of [
      '/private/a.ts',
      'C:/private/a.ts',
      String.raw`\\server\share\a.ts`,
      'src\\a.ts',
      'src/../a.ts',
      'src/\0a.ts',
      'src/line\nbreak.ts',
      'src/carriage\rreturn.ts',
      'src/tab\tname.ts',
      'src/bare\u001bname.ts',
      'src/delete\u007fname.ts',
      'src/ansi\u001b[31mname.ts',
      'src/bidi\u202ename.ts',
    ]) {
      const fixture = clone(publicSuccess()) as unknown as {
        evidence: {
          confirmed: Array<{ location: { file: string } }>;
        };
      };
      const confirmed = fixture.evidence.confirmed[0];
      if (confirmed === undefined) throw new Error('Fixture evidence missing.');
      confirmed.location.file = file;
      expect(LocateResultV2Schema.safeParse(fixture).success, file).toBe(
        false,
      );
    }
  });

  it('derives status with the frozen precedence', () => {
    const raw = rawSuccess();
    if (!raw.ok) throw new Error('Fixture must be a success.');
    expect(deriveLocateStatusV2(raw.evidence.coverage, 1)).toBe('ok');
    expect(
      deriveLocateStatusV2(
        { ...raw.evidence.coverage, abortSource: 'caller' },
        1,
      ),
    ).toBe('timeout');
    expect(
      deriveLocateStatusV2(
        { ...raw.evidence.coverage, strategyComplete: false },
        1,
      ),
    ).toBe('partial');
    expect(deriveLocateStatusV2(raw.evidence.coverage, 0)).toBe('no_result');
  });
});
