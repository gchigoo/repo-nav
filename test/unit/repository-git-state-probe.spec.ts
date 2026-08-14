import { describe, expect, it } from 'vitest';

import { mapGitProcessResultToStateV2 } from '../../src/evidence/request-snapshot/repository-git-state-probe-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'snapshot-git-state',
});

/** Dirty snapshotRef 必须为无路径分隔符/盘符的 HEAD:<sha>+dirty:<fp> 形态。 */
function assertPathFreeSnapshotRef(ref: string): void {
  expect(ref).not.toMatch(/[\\/]/u);
  expect(ref).not.toMatch(/^[A-Za-z]:/u);
}

describe.runIf(selected)('F3-GIT-001 snapshot-git-state', () => {
  it('keeps dirty snapshotRef path-free in HEAD:<sha>+dirty:<fp> shape', () => {
    for (const ref of [
      'HEAD:deadbeef123456+dirty:abc123def456',
      'HEAD:0123456789ab+dirty:fedcba987654',
      'HEAD:unknown+dirty:0123456789ab',
    ]) {
      assertPathFreeSnapshotRef(ref);
      expect(ref).toMatch(/^HEAD:[^\\/]+(\+dirty:[a-f0-9]+)?$/u);
    }
  });

  it('maps clean dirty not-git and unknown without leaking output', () => {
    expect(mapGitProcessResultToStateV2({ ok: true, stdoutEmpty: true })).toBe(
      'clean',
    );
    expect(mapGitProcessResultToStateV2({ ok: true, stdoutEmpty: false })).toBe(
      'dirty',
    );
    expect(
      mapGitProcessResultToStateV2({
        ok: false,
        kind: 'non-zero-exit',
        stderrText: 'fatal: not a git repository',
      }),
    ).toBe('not-git');
    expect(mapGitProcessResultToStateV2({ ok: false, kind: 'timeout' })).toBe(
      'unknown',
    );
    expect(
      mapGitProcessResultToStateV2({ ok: false, kind: 'spawn-error' }),
    ).toBe('unknown');
    expect(mapGitProcessResultToStateV2({ ok: false, kind: 'aborted' })).toBe(
      'unknown',
    );
  });
});
