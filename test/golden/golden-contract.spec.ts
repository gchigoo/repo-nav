import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  createDiscoveryKey,
  createEvidenceId,
  type LocateResult,
} from '../../src/contracts/index.js';
import {
  assertGoldenCase,
  GoldenCaseSchema,
  type GoldenCase,
  type GoldenObservation,
} from '../../testkit/contracts/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const manifestDirectory = resolve(
  repositoryRoot,
  'testkit',
  'manifests',
  'golden',
);
const successManifestPath = resolve(
  manifestDirectory,
  'manifest-schema-success.yaml',
);
const errorManifestPath = resolve(
  manifestDirectory,
  'manifest-schema-error.yaml',
);

function loadManifest(path: string): unknown {
  const manifest: unknown = parse(readFileSync(path, 'utf8'));
  return manifest;
}

function loadCase(path: string): GoldenCase {
  return GoldenCaseSchema.parse(loadManifest(path));
}

function createSuccessResult(): LocateResult {
  const discoveryKey = createDiscoveryKey({
    file: 'mapping.ts',
    lines: [4, 4],
    excerpt: '  return { hcpCode: row.hcp_id };',
  });
  return {
    ok: true,
    evidence: {
      schemaVersion: '1.0',
      status: 'ok',
      repositoryRoot: 'testkit/fixtures/foundation',
      normalizedTerms: [{ value: 'hcp_id', caseSensitive: false }],
      confirmed: [
        {
          evidenceClass: 'confirmed',
          id: createEvidenceId(
            discoveryKey,
            'confirmed',
            'value-mapping',
          ),
          role: 'value-mapping',
          location: {
            file: 'mapping.ts',
            lines: [4, 4],
            excerpt: '  return { hcpCode: row.hcp_id };',
          },
          provenance: {
            discoveredBy: ['ripgrep'],
            verifiedBy: 'filesystem',
            operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
          },
          reasonCodes: ['EXACT_TERM_MATCH', 'DIRECT_ALIAS_MAPPING'],
        },
      ],
      candidates: [],
      coverage: {
        backends: [
          {
            backend: 'codegraph',
            status: 'unavailable',
            reasonCode: 'CODEGRAPH_INDEX_MISSING',
            hitCount: 0,
          },
        ],
        fallbackChecked: true,
        indexState: 'missing',
        indexFreshness: 'unknown',
        limitsReached: [],
        exclusionSummary: { UNVERIFIED_FILE_CONTENT: 1 },
      },
      nextActions: [],
    },
  };
}

function observationFor(result: LocateResult, mcpIsError: boolean): GoldenObservation {
  return {
    result,
    mcpIsError,
    structuredContent: result,
    textContent: JSON.stringify(result),
  };
}

const manifestIdentity = {
  group: 'runner-smoke',
  caseId: 'manifest-schema',
} as const;

describe.runIf(isSelected(manifestIdentity))('Golden manifest schema', () => {
  it('parses independent success and error variants', () => {
    expect(loadCase(successManifestPath).kind).toBe('success');
    expect(loadCase(errorManifestPath).kind).toBe('error');
  });

  it('forbids lifecycle fields from GoldenCase', () => {
    const manifest = loadManifest(successManifestPath);
    expect(
      GoldenCaseSchema.safeParse({
        ...(manifest as Readonly<Record<string, unknown>>),
        scenario: 'graceful-shutdown',
      }).success,
    ).toBe(false);
  });
});

const evaluatorIdentity = {
  group: 'runner-smoke',
  caseId: 'evaluator-smoke',
} as const;

describe.runIf(isSelected(evaluatorIdentity))('Golden evaluator', () => {
  it('evaluates success and error variants through one public function', () => {
    const successCase = loadCase(successManifestPath);
    const errorCase = loadCase(errorManifestPath);
    const successResult = createSuccessResult();
    const errorResult = {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'terms must contain at least one item.',
        recoverable: true,
        suggestedAction: 'ADD_TERM',
      },
    } as const satisfies LocateResult;

    expect(() =>
      assertGoldenCase(successCase, observationFor(successResult, false)),
    ).not.toThrow();
    expect(() =>
      assertGoldenCase(errorCase, observationFor(errorResult, true)),
    ).not.toThrow();
  });

  it('makes forbidden, required coverage, exclusion, and parity checks effective', () => {
    const successCase = loadCase(successManifestPath);
    const errorCase = loadCase(errorManifestPath);
    const successResult = createSuccessResult();
    if (!successResult.ok) {
      throw new Error('Synthetic success result is invalid.');
    }
    const forbiddenCase = {
      ...successCase,
      expected: {
        ...successCase.expected,
        forbiddenEvidenceIds: [successResult.evidence.confirmed[0]?.id],
        requiredCoverageCodes: ['MAX_FILES_REACHED'],
        minimumExclusionCounts: { UNVERIFIED_FILE_CONTENT: 2 },
      },
    };
    const errorResult = {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'terms must contain at least one item.',
        recoverable: true,
        suggestedAction: 'ADD_TERM',
      },
    } as const satisfies LocateResult;
    const parityFailure = {
      ...observationFor(errorResult, true),
      textContent: JSON.stringify({ ok: true }),
    };

    expect(() =>
      assertGoldenCase(forbiddenCase, observationFor(successResult, false)),
    ).toThrow(/forbidden|coverage|exclusions/iu);
    expect(() => assertGoldenCase(errorCase, parityFailure)).toThrow(
      /parity|differ/iu,
    );
  });

  it('rejects every success transport parity failure mode', () => {
    const successCase = loadCase(successManifestPath);
    const successResult = createSuccessResult();
    const validObservation = observationFor(successResult, false);
    const errorResult = {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Synthetic mismatch.',
        recoverable: false,
      },
    } as const satisfies LocateResult;

    expect(() =>
      assertGoldenCase(successCase, { ...validObservation, mcpIsError: true }),
    ).toThrow(/MCP error flag/iu);
    expect(() =>
      assertGoldenCase(successCase, {
        ...validObservation,
        structuredContent: errorResult,
      }),
    ).toThrow(/structured|differ/iu);
    expect(() =>
      assertGoldenCase(successCase, {
        ...validObservation,
        textContent: JSON.stringify(errorResult),
      }),
    ).toThrow(/parity|differ/iu);
    expect(() =>
      assertGoldenCase(successCase, {
        ...validObservation,
        textContent: 'not-json',
      }),
    ).toThrow(/not JSON|parity/iu);
  });
});
