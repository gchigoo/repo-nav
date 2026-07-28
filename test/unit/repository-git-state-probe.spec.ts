import { describe, expect, it } from 'vitest';

import { mapGitProcessResultToStateV2 } from '../../src/evidence/request-snapshot/repository-git-state-probe-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'snapshot-git-state',
});

describe.runIf(selected)('F3-GIT-001 snapshot-git-state', () => {
  it('maps clean dirty not-git and unknown without leaking output', () => {
    expect(
      mapGitProcessResultToStateV2({ ok: true, stdoutEmpty: true }),
    ).toBe('clean');
    expect(
      mapGitProcessResultToStateV2({ ok: true, stdoutEmpty: false }),
    ).toBe('dirty');
    expect(
      mapGitProcessResultToStateV2({
        ok: false,
        kind: 'non-zero-exit',
        stderrText: 'fatal: not a git repository',
      }),
    ).toBe('not-git');
    expect(
      mapGitProcessResultToStateV2({ ok: false, kind: 'timeout' }),
    ).toBe('unknown');
    expect(
      mapGitProcessResultToStateV2({ ok: false, kind: 'spawn-error' }),
    ).toBe('unknown');
    expect(
      mapGitProcessResultToStateV2({ ok: false, kind: 'aborted' }),
    ).toBe('unknown');
  });
});
