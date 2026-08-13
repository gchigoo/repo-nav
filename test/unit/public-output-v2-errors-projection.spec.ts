import { describe, expect, it } from 'vitest';

import { assemblePublicLocateResultV2 } from '../../src/evidence/public-output/public-result-assembler-v2.js';
import { projectSyntheticLocateResultV2 } from '../../testkit/fixtures/public-output-v2/synthetic-locate-projection-helper-v2.js';
import { createUnsafeLocateSuccessV2 } from '../../testkit/fixtures/public-output-v2/synthetic-locate-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const errorsSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'safe-errors',
});
const paritySelected = isSelected({
  group: 'public-output-v2',
  caseId: 'synthetic-parity',
});

describe.runIf(errorsSelected)('v2 safe error table', () => {
  it('maps all four raw codes to exact safe public errors', () => {
    expect(
      assemblePublicLocateResultV2({
        ok: false,
        error: { code: 'INVALID_INPUT', suggestedAction: 'ADD_TERM' },
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Locate request does not match the required schema.',
        recoverable: true,
        suggestedAction: 'ADD_TERM',
      },
    });
    expect(
      assemblePublicLocateResultV2({
        ok: false,
        error: { code: 'INVALID_REPOSITORY' },
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'INVALID_REPOSITORY',
        message: 'Repository root is invalid or unavailable.',
        recoverable: true,
      },
    });
    expect(
      assemblePublicLocateResultV2({
        ok: false,
        error: { code: 'PATH_OUTSIDE_ROOT' },
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'PATH_OUTSIDE_ROOT',
        message: 'Repository path is outside the configured root.',
        recoverable: false,
      },
    });
    expect(
      assemblePublicLocateResultV2({
        ok: false,
        error: { code: 'INTERNAL_ERROR' },
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Repository evidence request failed.',
        recoverable: false,
      },
    });
  });

  it('fails unsafe error detail and illegal actions closed without leaking them', () => {
    const forbidden = [
      'D:/private/repository/secret.ts',
      'backend-stderr-secret',
      'unsafe-stack-detail',
    ] as const;
    for (const error of [
      {
        code: 'INVALID_INPUT',
        message: forbidden[0],
      },
      {
        code: 'INTERNAL_ERROR',
        suggestedAction: 'ADD_TERM',
        backend: forbidden[1],
      },
      {
        code: 'INTERNAL_ERROR',
        stack: forbidden[2],
      },
    ]) {
      const result = assemblePublicLocateResultV2({
        ok: false,
        error,
      });
      expect(result).toEqual({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Repository evidence request failed.',
          recoverable: false,
        },
      });
      const serialized = JSON.stringify(result);
      for (const value of forbidden) expect(serialized).not.toContain(value);
    }
  });
});

describe.runIf(paritySelected)('v2 synthetic projection parity', () => {
  it('projects one parsed success identically across all synthetic exits', () => {
    const rawSecret = 'projection-do-not-publish';
    const raw = structuredClone(createUnsafeLocateSuccessV2());
    if (!raw.ok) throw new Error('Fixture must be a success.');
    const mutable = raw as unknown as {
      evidence: {
        normalizedTerms: Array<{ value: string }>;
        confirmed: Array<{
          location: { file: string; excerpt: string };
        }>;
      };
    };
    const term = mutable.evidence.normalizedTerms[0];
    const confirmed = mutable.evidence.confirmed[0];
    if (term === undefined || confirmed === undefined) {
      throw new Error('Fixture data missing.');
    }
    term.value = `password=${rawSecret}`;
    confirmed.location.file = `src/${rawSecret}/config.ts`;
    confirmed.location.excerpt = `password=${rawSecret}`;

    const parsed = assemblePublicLocateResultV2(raw);
    const projection = projectSyntheticLocateResultV2(parsed);
    expect(projection.service).toEqual(parsed);
    expect(projection.structuredContent).toEqual(parsed);
    expect(JSON.parse(projection.text)).toEqual(parsed);
    expect(JSON.parse(projection.debugLocateStdout)).toEqual(parsed);
    expect(projection.isError).toBe(false);
    expect(JSON.stringify(projection)).not.toContain(rawSecret);
  });

  it('projects one parsed error identically with isError=true', () => {
    const parsed = assemblePublicLocateResultV2({
      ok: false,
      error: { code: 'INVALID_INPUT', suggestedAction: 'ADD_TERM' },
    });
    const projection = projectSyntheticLocateResultV2(parsed);
    expect(projection.service).toEqual(parsed);
    expect(projection.structuredContent).toEqual(parsed);
    expect(JSON.parse(projection.text)).toEqual(parsed);
    expect(JSON.parse(projection.debugLocateStdout)).toEqual(parsed);
    expect(projection.isError).toBe(true);
  });
});
