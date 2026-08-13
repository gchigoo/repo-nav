import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  type LocateResultV2,
  LocateResultV2Schema,
} from '../../src/contracts/v2/locate-result-v2.js';
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

function createSuccessResult(): LocateResultV2 {
  return LocateResultV2Schema.parse(
    JSON.parse(
      readFileSync(
        resolve(
          repositoryRoot,
          'testkit',
          'expected',
          'foundation-success.json',
        ),
        'utf8',
      ),
    ),
  );
}

function observationFor(
  result: LocateResultV2,
  mcpIsError: boolean,
): GoldenObservation {
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
        message: 'Locate request does not match the required schema.',
        recoverable: true,
        suggestedAction: 'ADD_TERM',
      },
    } as const satisfies LocateResultV2;

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
        forbiddenEvidenceIds: [
          successResult.evidence.confirmed[0]?.id ??
            successResult.evidence.candidates[0]?.id,
        ],
        requiredCoverageCodes: ['MAX_FILES_REACHED'],
        minimumExclusionCounts: { UNVERIFIED_FILE_CONTENT: 2 },
      },
    };
    const errorResult = {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Locate request does not match the required schema.',
        recoverable: true,
        suggestedAction: 'ADD_TERM',
      },
    } as const satisfies LocateResultV2;
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
        message: 'Repository evidence request failed.',
        recoverable: false,
      },
    } as const satisfies LocateResultV2;

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
