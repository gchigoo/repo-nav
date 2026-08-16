import { describe, expect, it } from 'vitest';

import {
  createEvidenceId,
  createPublicErrorResult,
  NEXT_ACTION_CODES,
  type CandidateEvidence,
  type ConfirmedEvidence,
  type LocateResult,
} from '../../src/contracts/index.js';
import {
  OVERSIZED_CONTENT_PLACEHOLDER,
  redactConfirmedEvidence,
  redactLocateResult,
  redactPublicText,
} from '../../src/evidence/evidence-redactor.js';
import { finalizeLocateResultV2 } from '../../src/evidence/locate-execution/finalize-locate-result-v2.js';
import { locateExecutionFinalizerInputFromUnsafePublicSourceV2 } from '../../testkit/fixtures/locate-execution-v2/finalizer-facts-v2.js';
import { createUnsafeLocateSuccessV2 } from '../../testkit/fixtures/public-output-v2/synthetic-locate-v2.js';
import { scrubDiagnostic } from '../../src/mcp/diagnostic-scrubber.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'output-guardrails',
  caseId: 'redaction-policy',
});

function confirmed(excerpt: string): ConfirmedEvidence {
  const discoveryKey = `discovery:v1\u0000server/config.ts\u00001\u00001\u0000${'a'.repeat(64)}`;
  return {
    evidenceClass: 'confirmed',
    id: createEvidenceId(discoveryKey, 'confirmed', 'value-mapping'),
    role: 'value-mapping',
    location: {
      file: 'server/config.ts',
      lines: [1, 1],
      excerpt,
    },
    provenance: {
      discoveredBy: ['ripgrep'],
      verifiedBy: 'filesystem',
      operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
    },
    reasonCodes: ['DIRECT_ALIAS_MAPPING'],
  };
}

describe.runIf(selected)('evidence output redaction', () => {
  it('redacts four deterministic reason families in schema order', () => {
    const secret = 'client_secret="super-secret-value"';
    const connection =
      'postgres://admin:db-password@localhost/app?token=query-secret';
    const personal = 'owner=stan.guo@mail.ru phone=+86 138-0013-8000';

    expect(redactPublicText(secret)).toEqual({
      value: 'client_secret="[REDACTED]"',
      reasonCodes: ['SECRET_LIKE_VALUE'],
    });
    const connectionResult = redactPublicText(connection);
    expect(connectionResult.reasonCodes).toContain('CONNECTION_STRING');
    expect(connectionResult.value).not.toContain('db-password');
    expect(connectionResult.value).not.toContain('query-secret');
    expect(redactPublicText(personal)).toEqual({
      value: 'owner=[REDACTED] phone=[REDACTED]',
      reasonCodes: ['PERSONAL_DATA'],
    });
    expect(redactPublicText(`value=${'x'.repeat(2_049)}`)).toEqual({
      value: OVERSIZED_CONTENT_PLACEHOLDER,
      reasonCodes: ['BINARY_OR_OVERSIZED_CONTENT'],
    });

    for (const [raw, expected] of [
      ['password="my secret value"', 'password="[REDACTED]"'],
      ['password="abc,def"', 'password="[REDACTED]"'],
      ["password='abc;def'", "password='[REDACTED]'"],
      [String.raw`password="my \"escaped\" secret"`, 'password="[REDACTED]"'],
      ['password=`my secret value`', 'password=`[REDACTED]`'],
      ['password=`abc,def`', 'password=`[REDACTED]`'],
    ] as const) {
      const quoted = redactPublicText(raw);
      expect(quoted.value).toBe(expected);
      expect(quoted.reasonCodes).toContain('SECRET_LIKE_VALUE');
    }
    const malformed = redactPublicText('password="unterminated secret value');
    expect(malformed.value).toBe(OVERSIZED_CONTENT_PLACEHOLDER);
    expect(malformed.reasonCodes).toEqual([
      'SECRET_LIKE_VALUE',
      'BINARY_OR_OVERSIZED_CONTENT',
    ]);
    expect(redactPublicText('password=`${process.env.SECRET}`')).toEqual({
      value: OVERSIZED_CONTENT_PLACEHOLDER,
      reasonCodes: ['SECRET_LIKE_VALUE', 'BINARY_OR_OVERSIZED_CONTENT'],
    });
  });

  it('preserves canonical ID and location metadata while dropping hash material', () => {
    const raw = confirmed('password=do-not-publish');
    const redacted = redactConfirmedEvidence(raw);
    expect(redacted.id).toBe(raw.id);
    expect(redacted.location.file).toBe(raw.location.file);
    expect(redacted.location.lines).toEqual(raw.location.lines);
    expect(redacted.location.excerpt).not.toContain('do-not-publish');
    expect(redacted.location.redaction).toEqual({
      applied: true,
      reasonCodes: ['SECRET_LIKE_VALUE'],
    });
    expect(JSON.stringify(redacted)).not.toContain('discovery:v1');
  });

  it('does not guess personal names outside the approved email/phone boundary', () => {
    expect(redactPublicText('ownerName=Steven Guo')).toEqual({
      value: 'ownerName=Steven Guo',
      reasonCodes: [],
    });
  });

  it('propagates a deterministically bounded malformed secret tail', () => {
    const rawSecret = 'malformed shared value';
    const seed = confirmed(`password="${rawSecret}`);
    const derived: CandidateEvidence = {
      evidenceClass: 'candidate',
      id: `evidence:v1:${'1'.repeat(64)}`,
      role: 'related',
      location: {
        file: 'server/alias.ts',
        lines: [1, 1],
        excerpt: `const alias = "${rawSecret}";`,
      },
      provenance: {
        discoveredBy: ['ripgrep'],
        verifiedBy: 'filesystem',
        operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
      },
      reasonCodes: ['SAME_ENTITY_SIBLING'],
      promotionRequirements: ['DIRECT_REFERENCE_REQUIRED'],
    };
    const rawResult: LocateResult = {
      ok: true,
      evidence: {
        schemaVersion: '1.0',
        status: 'partial',
        repositoryRoot: 'D:/fixture/repository',
        normalizedTerms: [{ value: 'password', caseSensitive: false }],
        confirmed: [seed],
        candidates: [derived],
        coverage: {
          backends: [],
          fallbackChecked: false,
          indexState: 'unknown',
          indexFreshness: 'not-applicable',
          limitsReached: [],
          exclusionSummary: {},
        },
        nextActions: ['CONFIRM_CANDIDATE'],
      },
    };
    const redacted = redactLocateResult(rawResult);
    expect(JSON.stringify(redacted)).not.toContain(rawSecret);
    if (!redacted.ok) {
      throw new Error('Expected a redacted success result.');
    }
    expect(redacted.evidence.confirmed[0]?.location.excerpt).toBe(
      OVERSIZED_CONTENT_PLACEHOLDER,
    );
    expect(redacted.evidence.candidates[0]?.location.excerpt).toBe(
      'const alias = "[REDACTED]";',
    );
  });
});

describe.runIf(selected)('safe public errors and diagnostics', () => {
  it('locks exact recoverability and action by error code', () => {
    expect(createPublicErrorResult('INVALID_INPUT', 'ADD_TERM')).toEqual({
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Locate request does not match the required schema.',
        recoverable: true,
        suggestedAction: 'ADD_TERM',
      },
    });
    expect(createPublicErrorResult('INVALID_REPOSITORY')).toEqual({
      ok: false,
      error: {
        code: 'INVALID_REPOSITORY',
        message: 'Repository root is invalid or unavailable.',
        recoverable: true,
      },
    });
    expect(createPublicErrorResult('PATH_OUTSIDE_ROOT')).toMatchObject({
      ok: false,
      error: { recoverable: false },
    });
    expect(createPublicErrorResult('INTERNAL_ERROR')).toMatchObject({
      ok: false,
      error: { recoverable: false },
    });

    for (const code of [
      'INVALID_INPUT',
      'INVALID_REPOSITORY',
      'PATH_OUTSIDE_ROOT',
      'INTERNAL_ERROR',
    ] as const) {
      for (const action of NEXT_ACTION_CODES) {
        const result = createPublicErrorResult(code, action);
        if (result.ok) {
          throw new Error('Expected a public error result.');
        }
        expect(result.error.suggestedAction).toBe(
          code === 'INVALID_INPUT' && action === 'ADD_TERM'
            ? 'ADD_TERM'
            : undefined,
        );
      }
    }
  });

  it('does not suggest adjustable retries at schema maxima or for fixed caps', () => {
    const atMaximum = {
      maxFiles: 20,
      maxConfirmed: 20,
      maxCandidates: 20,
      timeoutMs: 30_000,
    } as const;
    const maximumRaw = structuredClone(createUnsafeLocateSuccessV2());
    if (!maximumRaw.ok) throw new Error('Expected success fixture.');
    Object.assign(maximumRaw.evidence.coverage, {
      limitsReached: [
        'MAX_FILES_REACHED',
        'MAX_CONFIRMED_REACHED',
        'MAX_CANDIDATES_REACHED',
      ],
    });
    const maximum = finalizeLocateResultV2(
      locateExecutionFinalizerInputFromUnsafePublicSourceV2(
        maximumRaw,
        atMaximum,
      ),
    ).value;
    expect(maximum.ok && maximum.evidence.nextActions).toEqual([]);

    const fixedRaw = structuredClone(createUnsafeLocateSuccessV2());
    if (!fixedRaw.ok) throw new Error('Expected success fixture.');
    Object.assign(fixedRaw.evidence.coverage, {
      limitsReached: ['MAX_FILE_BYTES_REACHED', 'MAX_EXCERPT_BYTES_REACHED'],
    });
    const fixed = finalizeLocateResultV2(
      locateExecutionFinalizerInputFromUnsafePublicSourceV2(fixedRaw),
    ).value;
    expect(fixed.ok && fixed.evidence.nextActions).toEqual([]);
  });

  it('scrubs stack, absolute paths, and sensitive tokens from diagnostics', () => {
    const raw =
      'failed C:\\private\\repo\\secret.ts token=raw-secret stan.guo@mail.ru\n    at fixture (C:\\private\\repo\\secret.ts:1:1)';
    const scrubbed = scrubDiagnostic(raw);
    expect(scrubbed).not.toMatch(
      /(?:raw-secret|stan\.guo@mail\.ru|C:\\private|\bat fixture\b)/u,
    );
    expect(scrubbed).toContain('[REDACTED]');
    expect(scrubbed).toContain('[REDACTED_PATH]');
  });
});
