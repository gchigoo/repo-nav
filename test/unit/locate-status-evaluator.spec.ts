import { describe, expect, it } from 'vitest';

import { finalizeLocateResultV2 } from '../../src/evidence/locate-execution/finalize-locate-result-v2.js';
import {
  LOCATE_EXECUTION_DEFAULT_RESOLVED_LIMITS_V2,
  locateExecutionFinalizerInputFromUnsafePublicSourceV2,
} from '../../testkit/fixtures/locate-execution-v2/finalizer-facts-v2.js';
import { createUnsafeLocateSuccessV2 } from '../../testkit/fixtures/public-output-v2/synthetic-locate-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const TRANSITION_FIXTURE_ROWS = [
  'invalid-input',
  'invalid-repository',
  'path-outside-root',
  'internal-error',
  'caller-abort',
  'internal-deadline',
  'backend-unavailable',
  'coverage-gap',
  'verified-evidence',
  'verified-no-result',
] as const;

function selected(caseId: string): boolean {
  return isSelected({ group: 'locate-status', caseId });
}

function statusForV2(
  mutate: (raw: ReturnType<typeof createUnsafeLocateSuccessV2>) => void = () =>
    undefined,
  timeoutMs = LOCATE_EXECUTION_DEFAULT_RESOLVED_LIMITS_V2.timeoutMs,
) {
  const raw = structuredClone(createUnsafeLocateSuccessV2());
  mutate(raw);
  const limits = {
    ...LOCATE_EXECUTION_DEFAULT_RESOLVED_LIMITS_V2,
    timeoutMs,
  };
  return finalizeLocateResultV2(
    locateExecutionFinalizerInputFromUnsafePublicSourceV2(raw, limits),
  ).value;
}

describe.runIf(selected('transition-matrix-completeness'))(
  'Locate transition matrix completeness',
  () => {
    it('keeps every approved public status and safe error transition reachable', () => {
      expect(TRANSITION_FIXTURE_ROWS).toHaveLength(10);
      const statuses = new Set<string>();

      const ok = statusForV2();
      if (ok.ok) statuses.add(ok.evidence.status);

      const noResult = statusForV2((raw) => {
        if (!raw.ok) throw new Error('Expected success fixture.');
        Object.assign(raw.evidence, { confirmed: [], candidates: [] });
      });
      if (noResult.ok) statuses.add(noResult.evidence.status);

      const partial = statusForV2((raw) => {
        if (!raw.ok) throw new Error('Expected success fixture.');
        Object.assign(raw.evidence.coverage, {
          backends: [
            {
              backend: 'ripgrep',
              status: 'used',
              completion: 'incomplete',
              termination: 'output-limit',
              hitCount: 1,
            },
          ],
        });
      });
      if (partial.ok) statuses.add(partial.evidence.status);

      const unavailable = statusForV2((raw) => {
        if (!raw.ok) throw new Error('Expected success fixture.');
        Object.assign(raw.evidence, { confirmed: [], candidates: [] });
        Object.assign(raw.evidence.coverage, {
          backends: [
            {
              backend: 'ripgrep',
              status: 'unavailable',
              completion: 'incomplete',
              termination: 'process-error',
              reasonCode: 'RIPGREP_UNAVAILABLE',
              hitCount: 0,
            },
          ],
        });
      });
      if (unavailable.ok) statuses.add(unavailable.evidence.status);

      for (const abortSource of ['caller', 'deadline'] as const) {
        const aborted = statusForV2((raw) => {
          if (!raw.ok) throw new Error('Expected success fixture.');
          Object.assign(raw.evidence.coverage, { abortSource });
        });
        if (aborted.ok) statuses.add(aborted.evidence.status);
      }

      expect([...statuses].sort()).toEqual(
        [
          'backend_unavailable',
          'cancelled',
          'no_result',
          'ok',
          'partial',
          'timeout',
        ].sort(),
      );
    });
  },
);

describe.runIf(selected('hit-unverified-fallback-complete'))(
  'hit-unverified with complete fallback',
  () => {
    it('returns no_result only after the required fallback completes', () => {
      const result = statusForV2((raw) => {
        if (!raw.ok) throw new Error('Expected success fixture.');
        Object.assign(raw.evidence, { confirmed: [], candidates: [] });
        Object.assign(raw.evidence.coverage, {
          backends: [
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
              hitCount: 0,
            },
          ],
        });
      });
      expect(result.ok && result.evidence.status).toBe('no_result');
    });
  },
);

describe.runIf(selected('hit-unverified-fallback-unavailable'))(
  'hit-unverified with unavailable fallback',
  () => {
    it('uses backend_unavailable instead of incomplete no_result', () => {
      const result = statusForV2((raw) => {
        if (!raw.ok) throw new Error('Expected success fixture.');
        Object.assign(raw.evidence, { confirmed: [], candidates: [] });
        Object.assign(raw.evidence.coverage, {
          backends: [
            {
              backend: 'ripgrep',
              status: 'unavailable',
              completion: 'incomplete',
              termination: 'process-error',
              reasonCode: 'RIPGREP_UNAVAILABLE',
              hitCount: 0,
            },
          ],
        });
      });
      expect(result.ok && result.evidence.status).toBe('backend_unavailable');
    });
  },
);

for (const caseId of [
  'caller-abort-empty',
  'caller-abort-with-evidence',
] as const) {
  describe.runIf(selected(caseId))(caseId, () => {
    it('gives caller abort priority and never suggests retry', () => {
      const result = statusForV2((raw) => {
        if (!raw.ok) throw new Error('Expected success fixture.');
        if (caseId === 'caller-abort-empty') {
          Object.assign(raw.evidence, { confirmed: [], candidates: [] });
        }
        Object.assign(raw.evidence.coverage, { abortSource: 'caller' });
      });
      if (!result.ok) throw new Error('Expected success result.');
      expect(result.evidence.status).toBe('cancelled');
      expect(result.evidence.nextActions).not.toContain(
        'RETRY_WITH_HIGHER_LIMIT',
      );
    });
  });
}

for (const [caseId, timeoutMs, expectedActions] of [
  ['internal-deadline-below-max', 1_000, ['RETRY_WITH_HIGHER_LIMIT']],
  ['internal-deadline-at-max', 30_000, []],
] as const) {
  describe.runIf(selected(caseId))(caseId, () => {
    it('maps a deadline to timeout and retries only below the maximum', () => {
      const result = statusForV2((raw) => {
        if (!raw.ok) throw new Error('Expected success fixture.');
        Object.assign(raw.evidence.coverage, { abortSource: 'deadline' });
      }, timeoutMs);
      if (!result.ok) throw new Error('Expected success result.');
      expect(result.evidence.status).toBe('timeout');
      expect(result.evidence.coverage.limitsReached).toContain(
        'TIMEOUT_REACHED',
      );
      expect(result.evidence.nextActions).toEqual(expectedActions);
    });
  });
}
