import { describe, expect, it } from 'vitest';

import { finalizeLocateResultV2 } from '../../src/evidence/locate-execution/finalize-locate-result-v2.js';
import { locateExecutionFinalizerInputFromUnsafePublicSourceV2 } from '../../testkit/fixtures/locate-execution-v2/finalizer-facts-v2.js';
import { createUnsafeLocateSuccessV2 } from '../../testkit/fixtures/public-output-v2/synthetic-locate-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const allowlistSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'assembler-allowlist',
});
const ordinalSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'ordinal-ids',
});
const statusSelected = isSelected({
  group: 'public-output-v2',
  caseId: 'derived-status',
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

function finalizeUnsafeSourceV2(
  source: ReturnType<typeof createUnsafeLocateSuccessV2>,
) {
  return finalizeLocateResultV2(
    locateExecutionFinalizerInputFromUnsafePublicSourceV2(source),
  ).value;
}

describe.runIf(allowlistSelected)('pure locate finalizer allowlist', () => {
  it('constructs only public-owned fields from canonical facts', () => {
    const result = finalizeUnsafeSourceV2(createUnsafeLocateSuccessV2());
    expect(result).toMatchObject({
      ok: true,
      evidence: {
        schemaVersion: '2.0',
        repositoryRef: 'local-repository',
        status: 'ok',
      },
    });
    expect(JSON.stringify(result)).not.toMatch(
      /(?:repositoryRoot|discoveryHash|branch|remote)/u,
    );
  });

  it('preserves a literal path placeholder without invented metadata', () => {
    const raw = mutableUnsafeSourceV2();
    if (!raw.ok) throw new Error('Fixture must be a success.');
    raw.evidence.confirmed[0]!.location.file = '[REDACTED_PATH]';

    const result = finalizeUnsafeSourceV2(raw);
    if (!result.ok) throw new Error('Expected a public success.');
    expect(result.evidence.confirmed[0]?.location).toMatchObject({
      file: '[REDACTED_PATH]',
      resolvable: true,
    });
    expect(result.evidence.confirmed[0]?.location.redaction).toBeUndefined();
  });
});

describe.runIf(ordinalSelected)('pure locate finalizer ordinal IDs', () => {
  it('preserves confirmed/candidate order and assigns one continuous sequence', () => {
    const raw = mutableUnsafeSourceV2();
    if (!raw.ok) throw new Error('Fixture must be a success.');
    const confirmed = raw.evidence.confirmed[0];
    if (confirmed === undefined) throw new Error('Fixture evidence missing.');
    raw.evidence.confirmed.push({
      ...confirmed,
      location: { ...confirmed.location, file: 'src/server/second.ts' },
    });
    raw.evidence.candidates.push({
      evidenceClass: 'candidate',
      role: 'related',
      location: {
        file: 'src/server/candidate.ts',
        lines: [7, 9],
        excerpt: 'candidate mapping',
      },
      provenance: {
        discoveredBy: ['ripgrep', 'filesystem'],
        verifiedBy: 'filesystem',
        operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
      },
      reasonCodes: ['SAME_ENTITY_SIBLING'],
      promotionRequirements: ['DIRECT_REFERENCE_REQUIRED'],
    });
    raw.evidence.coverage.snapshot.filesChecked = 3;

    const result = finalizeUnsafeSourceV2(raw);
    if (!result.ok) throw new Error('Expected a public success.');
    expect(result.evidence.confirmed.map((item) => item.id)).toEqual([
      'evidence:v2:0001',
      'evidence:v2:0002',
    ]);
    expect(result.evidence.candidates.map((item) => item.id)).toEqual([
      'evidence:v2:0003',
    ]);
    expect(result.evidence.confirmed.map((item) => item.location.file)).toEqual(
      ['src/server/mapping.ts', 'src/server/second.ts'],
    );
  });
});

describe.runIf(statusSelected)('pure locate finalizer derived status', () => {
  it('derives location degradation exactly once', () => {
    const safe = finalizeUnsafeSourceV2(createUnsafeLocateSuccessV2());
    if (!safe.ok) throw new Error('Expected a safe success.');
    expect(safe.evidence.status).toBe('ok');
    expect(safe.evidence.coverage.degradations).not.toContain(
      'LOCATION_REDACTED',
    );

    const raw = mutableUnsafeSourceV2();
    if (!raw.ok) throw new Error('Fixture must be a success.');
    raw.evidence.normalizedTerms[0]!.value = 'password=customer-do-not-publish';
    raw.evidence.confirmed[0]!.location.file =
      'src/customer-do-not-publish/config.ts';
    raw.evidence.confirmed[0]!.location.excerpt =
      'password=customer-do-not-publish';
    const result = finalizeUnsafeSourceV2(raw);
    if (!result.ok) throw new Error('Expected a redacted success.');
    expect(result.evidence.status).toBe('partial');
    expect(
      result.evidence.coverage.degradations.filter(
        (code) => code === 'LOCATION_REDACTED',
      ),
    ).toHaveLength(1);
    expect(result.evidence.confirmed[0]?.location).toMatchObject({
      file: '[REDACTED_PATH]',
      resolvable: false,
    });
  });

  it('keeps timeout precedence above location degradation', () => {
    const raw = mutableUnsafeSourceV2();
    if (!raw.ok) throw new Error('Fixture must be a success.');
    raw.evidence.confirmed[0]!.location.file = 'src/api_key/config.ts';
    raw.evidence.coverage.abortSource = 'deadline';
    raw.evidence.coverage.backends = [
      {
        backend: 'codegraph',
        status: 'used',
        completion: 'incomplete',
        termination: 'aborted',
        reasonCode: 'BACKEND_ABORTED',
        hitCount: 1,
      },
    ];

    const result = finalizeUnsafeSourceV2(raw);
    if (!result.ok) throw new Error('Expected a redacted success.');
    expect(result.evidence.status).toBe('timeout');
    expect(result.evidence.coverage.degradations).toContain(
      'LOCATION_REDACTED',
    );
  });
});
