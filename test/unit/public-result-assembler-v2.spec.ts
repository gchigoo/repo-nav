import { describe, expect, it } from 'vitest';

import { assemblePublicLocateResultV2 } from '../../src/evidence/public-output/public-result-assembler-v2.js';
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

describe.runIf(allowlistSelected)('PublicResultAssemblerV2 allowlist', () => {
  it('constructs only public-owned fields from a valid raw success', () => {
    const result = assemblePublicLocateResultV2(createUnsafeLocateSuccessV2());
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

  it('preserves a literal path placeholder without redaction metadata', () => {
    const raw = structuredClone(createUnsafeLocateSuccessV2());
    if (!raw.ok) throw new Error('Fixture must be a success.');
    const mutable = raw as unknown as {
      evidence: {
        confirmed: Array<{ location: { file: string } }>;
      };
    };
    const confirmed = mutable.evidence.confirmed[0];
    if (confirmed === undefined) throw new Error('Fixture evidence missing.');
    confirmed.location.file = '[REDACTED_PATH]';

    const result = assemblePublicLocateResultV2(raw);
    if (!result.ok) throw new Error('Expected a public success.');
    const publicEvidence = result.evidence.confirmed[0];
    if (publicEvidence === undefined) {
      throw new Error('Public evidence missing.');
    }
    expect(publicEvidence.location).toMatchObject({
      file: '[REDACTED_PATH]',
      resolvable: true,
    });
    expect(publicEvidence.location.redaction).toBeUndefined();
    expect(result.evidence.status).toBe('ok');
  });

  it('fails closed for any raw extra or output-owned field', () => {
    for (const mutation of [
      { schemaVersion: '2.0' },
      { repositoryRef: 'local-repository' },
      { status: 'ok' },
      { root: 'D:/private/repository' },
      { remote: 'https://user:secret@example.test/repo.git' },
      { discoveryHash: 'private-discovery-hash' },
    ]) {
      const raw = structuredClone(createUnsafeLocateSuccessV2()) as unknown as {
        evidence: Record<string, unknown>;
      };
      Object.assign(raw.evidence, mutation);
      expect(assemblePublicLocateResultV2(raw as never)).toEqual({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Repository evidence request failed.',
          recoverable: false,
        },
      });
    }
  });

  it('fails closed instead of repairing non-canonical raw ordering', () => {
    const raw = structuredClone(createUnsafeLocateSuccessV2());
    if (!raw.ok) throw new Error('Fixture must be a success.');
    const mutable = raw as unknown as {
      evidence: {
        coverage: {
          abortSource: string;
          limitsReached: string[];
        };
      };
    };
    mutable.evidence.coverage.abortSource = 'deadline';
    mutable.evidence.coverage.limitsReached = [
      'TIMEOUT_REACHED',
      'MAX_FILES_REACHED',
    ];
    expect(assemblePublicLocateResultV2(raw)).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Repository evidence request failed.',
        recoverable: false,
      },
    });
  });
});

describe.runIf(ordinalSelected)('PublicResultAssemblerV2 ordinal IDs', () => {
  it('preserves confirmed/candidate order and assigns one continuous sequence', () => {
    const raw = structuredClone(createUnsafeLocateSuccessV2());
    if (!raw.ok) throw new Error('Fixture must be a success.');
    const confirmed = raw.evidence.confirmed[0];
    if (confirmed === undefined) throw new Error('Fixture evidence missing.');
    const mutable = raw as unknown as {
      evidence: {
        confirmed: unknown[];
        candidates: unknown[];
        coverage: { snapshot: { filesChecked: number } };
      };
    };
    mutable.evidence.confirmed.push({
      ...confirmed,
      location: { ...confirmed.location, file: 'src/server/second.ts' },
    });
    mutable.evidence.candidates.push({
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
    mutable.evidence.coverage.snapshot.filesChecked = 3;

    const result = assemblePublicLocateResultV2(raw);
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

describe.runIf(statusSelected)('PublicResultAssemblerV2 derived status', () => {
  it('derives zero, one and multiple hidden-path degradation exactly once', () => {
    const safe = assemblePublicLocateResultV2(createUnsafeLocateSuccessV2());
    if (!safe.ok) throw new Error('Expected a safe success.');
    expect(safe.evidence.status).toBe('ok');
    expect(safe.evidence.coverage.degradations).not.toContain(
      'LOCATION_REDACTED',
    );

    for (const pathCount of [1, 2]) {
      const raw = structuredClone(createUnsafeLocateSuccessV2());
      if (!raw.ok) throw new Error('Fixture must be a success.');
      const original = raw.evidence.confirmed[0];
      if (original === undefined) throw new Error('Fixture evidence missing.');
      const mutable = raw as unknown as {
        evidence: {
          confirmed: Array<Record<string, unknown>>;
          coverage: { snapshot: { filesChecked: number } };
        };
      };
      mutable.evidence.confirmed = Array.from(
        { length: pathCount },
        (_value, index) => ({
          ...original,
          location: {
            ...original.location,
            file: `src/customer-do-not-publish-${index}/config.ts`,
            excerpt: `password=customer-do-not-publish-${index}`,
          },
        }),
      );
      mutable.evidence.coverage.snapshot.filesChecked = pathCount;
      const result = assemblePublicLocateResultV2(raw);
      if (!result.ok) throw new Error('Expected a redacted success.');
      expect(result.evidence.status).toBe('partial');
      expect(
        result.evidence.coverage.degradations.filter(
          (code) => code === 'LOCATION_REDACTED',
        ),
      ).toHaveLength(1);
      expect(
        result.evidence.confirmed.every(
          (item) =>
            item.location.file === '[REDACTED_PATH]' &&
            item.location.resolvable === false,
        ),
      ).toBe(true);
    }
  });

  it('keeps timeout precedence above location degradation', () => {
    const raw = structuredClone(createUnsafeLocateSuccessV2());
    if (!raw.ok) throw new Error('Fixture must be a success.');
    const mutable = raw as unknown as {
      evidence: {
        confirmed: Array<{ location: { file: string } }>;
        coverage: {
          abortSource: string;
          limitsReached: string[];
          strategyComplete: boolean;
          backends: unknown[];
        };
      };
    };
    const confirmed = mutable.evidence.confirmed[0];
    if (confirmed === undefined) throw new Error('Fixture evidence missing.');
    confirmed.location.file = 'src/api_key/config.ts';
    mutable.evidence.coverage.abortSource = 'deadline';
    mutable.evidence.coverage.limitsReached = ['TIMEOUT_REACHED'];
    mutable.evidence.coverage.strategyComplete = false;
    mutable.evidence.coverage.backends = [
      {
        backend: 'codegraph',
        status: 'used',
        completion: 'incomplete',
        termination: 'aborted',
        reasonCode: 'BACKEND_ABORTED',
        hitCount: 1,
      },
    ];

    const result = assemblePublicLocateResultV2(raw);
    if (!result.ok) throw new Error('Expected a redacted success.');
    expect(result.evidence.status).toBe('timeout');
    expect(result.evidence.coverage.degradations).toContain(
      'LOCATION_REDACTED',
    );
  });
});
