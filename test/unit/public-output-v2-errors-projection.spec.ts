import { describe, expect, it } from 'vitest';

import { finalizeLocateResultV2 } from '../../src/evidence/locate-execution/finalize-locate-result-v2.js';
import { locateExecutionFinalizerInputFromUnsafePublicSourceV2 } from '../../testkit/fixtures/locate-execution-v2/finalizer-facts-v2.js';
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

type DeepMutableV2<T> = T extends object
  ? { -readonly [K in keyof T]: DeepMutableV2<T[K]> }
  : T;

function mutableUnsafeSourceV2(): DeepMutableV2<
  ReturnType<typeof createUnsafeLocateSuccessV2>
> {
  return structuredClone(createUnsafeLocateSuccessV2()) as DeepMutableV2<
    ReturnType<typeof createUnsafeLocateSuccessV2>
  >;
}

describe.runIf(errorsSelected)('v2 safe error table', () => {
  it('maps all four fact codes to exact safe public errors', () => {
    const rows = [
      {
        input: {
          ok: false as const,
          error: {
            code: 'INVALID_INPUT' as const,
            suggestedAction: 'ADD_TERM' as const,
          },
        },
        expected: {
          code: 'INVALID_INPUT',
          message: 'Locate request does not match the required schema.',
          recoverable: true,
          suggestedAction: 'ADD_TERM',
        },
      },
      {
        input: {
          ok: false as const,
          error: { code: 'INVALID_REPOSITORY' as const },
        },
        expected: {
          code: 'INVALID_REPOSITORY',
          message: 'Repository root is invalid or unavailable.',
          recoverable: true,
        },
      },
      {
        input: {
          ok: false as const,
          error: { code: 'PATH_OUTSIDE_ROOT' as const },
        },
        expected: {
          code: 'PATH_OUTSIDE_ROOT',
          message: 'Repository path is outside the configured root.',
          recoverable: false,
        },
      },
      {
        input: {
          ok: false as const,
          error: { code: 'INTERNAL_ERROR' as const },
        },
        expected: {
          code: 'INTERNAL_ERROR',
          message: 'Repository evidence request failed.',
          recoverable: false,
        },
      },
    ];

    for (const row of rows) {
      const result = finalizeLocateResultV2(row.input).value;
      expect(result).toEqual({ ok: false, error: row.expected });
    }
  });

  it('never serializes unsafe error detail', () => {
    const forbidden = 'D:/private/repository/secret.ts';
    const transport = finalizeLocateResultV2({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: forbidden,
      } as never,
    });
    expect(transport.value).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Repository evidence request failed.',
        recoverable: false,
      },
    });
    expect(transport.compactJson).not.toContain(forbidden);
  });
});

describe.runIf(paritySelected)('v2 synthetic projection parity', () => {
  it('projects one finalized success identically across all synthetic exits', () => {
    const rawSecret = 'projection-do-not-publish';
    const raw = mutableUnsafeSourceV2();
    if (!raw.ok) throw new Error('Fixture must be a success.');
    raw.evidence.normalizedTerms[0]!.value = `password=${rawSecret}`;
    raw.evidence.confirmed[0]!.location.file = `src/${rawSecret}/config.ts`;
    raw.evidence.confirmed[0]!.location.excerpt = `password=${rawSecret}`;

    const transport = finalizeLocateResultV2(
      locateExecutionFinalizerInputFromUnsafePublicSourceV2(raw),
    );
    const projection = projectSyntheticLocateResultV2(transport.value);
    expect(projection.service).toEqual(transport.value);
    expect(projection.structuredContent).toEqual(transport.value);
    expect(projection.text).toBe(transport.compactJson);
    expect(JSON.parse(projection.debugLocateStdout)).toEqual(transport.value);
    expect(projection.isError).toBe(false);
    expect(JSON.stringify(projection)).not.toContain(rawSecret);
  });

  it('projects one finalized error identically with isError=true', () => {
    const transport = finalizeLocateResultV2({
      ok: false,
      error: { code: 'INVALID_INPUT', suggestedAction: 'ADD_TERM' },
    });
    const projection = projectSyntheticLocateResultV2(transport.value);
    expect(projection.service).toEqual(transport.value);
    expect(projection.structuredContent).toEqual(transport.value);
    expect(projection.text).toBe(transport.compactJson);
    expect(JSON.parse(projection.debugLocateStdout)).toEqual(transport.value);
    expect(projection.isError).toBe(true);
  });
});
