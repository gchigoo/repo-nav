import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isSelected } from '../../testkit/testing/selection.js';
import {
  assertRepositoryStateUnchanged,
  captureRepositoryState,
  runWithRepositoryStateGuard,
  // @ts-expect-error release helpers are plain ESM modules without declarations
} from '../../tools/release/real-consumer-snapshot.mjs';

const selected = isSelected({
  group: 'public-beta-release',
  caseId: 'real-consumer-read-only',
});

function createRepository(): string {
  const path = mkdtempSync(join(tmpdir(), 'repo-nav-h1-state-'));
  execFileSync('git', ['init', '-b', 'main'], { cwd: path });
  execFileSync('git', ['config', 'user.email', 'h1@example.invalid'], {
    cwd: path,
  });
  execFileSync('git', ['config', 'user.name', 'H1 Fixture'], { cwd: path });
  writeFileSync(join(path, 'tracked.txt'), 'baseline\n');
  execFileSync('git', ['add', 'tracked.txt'], { cwd: path });
  execFileSync('git', ['commit', '-m', 'fixture'], { cwd: path });
  return realpathSync(path);
}

describe.runIf(selected)('H1 real-consumer repository state', () => {
  it('captures branch, HEAD, absolute index hash, and complete worktree state', () => {
    const repository = createRepository();
    try {
      writeFileSync(join(repository, 'untracked.txt'), 'untracked\n');
      const before = captureRepositoryState(repository);
      const after = captureRepositoryState(repository);
      expect(before).toMatchObject({
        branch: 'main',
        worktreeEntryCount: 2,
      });
      expect(before.headSha).toMatch(/^[0-9a-f]{40}$/u);
      expect(before.indexPath).toMatch(/\/index$/u);
      expect(before.indexSha256).toMatch(/^[0-9a-f]{64}$/u);
      expect(before.worktreeTreeSha256).toMatch(/^[0-9a-f]{64}$/u);
      expect(() => assertRepositoryStateUnchanged(before, after)).not.toThrow();
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it('measures repository after-state even when candidate execution fails', async () => {
    const repository = createRepository();
    try {
      const before = captureRepositoryState(repository);
      await expect(
        runWithRepositoryStateGuard(repository, before, async () => {
          throw new Error('candidate execution failed');
        }),
      ).rejects.toThrow('candidate execution failed');

      await expect(
        runWithRepositoryStateGuard(repository, before, async () => {
          writeFileSync(
            join(repository, 'tracked.txt'),
            'candidate mutation\n',
          );
          throw new Error('candidate execution failed');
        }),
      ).rejects.toThrow(/repository changed during execution/iu);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it('detects branch, HEAD, index, and worktree mutations', () => {
    const repository = createRepository();
    try {
      const baseline = captureRepositoryState(repository);

      writeFileSync(join(repository, 'tracked.txt'), 'worktree mutation\n');
      expect(() =>
        assertRepositoryStateUnchanged(
          baseline,
          captureRepositoryState(repository),
        ),
      ).toThrow(/repository state changed/iu);

      writeFileSync(join(repository, 'tracked.txt'), 'index mutation\n');
      execFileSync('git', ['add', 'tracked.txt'], { cwd: repository });
      expect(() =>
        assertRepositoryStateUnchanged(
          baseline,
          captureRepositoryState(repository),
        ),
      ).toThrow(/repository state changed/iu);

      execFileSync('git', ['commit', '-m', 'head mutation'], {
        cwd: repository,
      });
      expect(() =>
        assertRepositoryStateUnchanged(
          baseline,
          captureRepositoryState(repository),
        ),
      ).toThrow(/repository state changed/iu);

      execFileSync('git', ['switch', '-c', 'other'], { cwd: repository });
      expect(() =>
        assertRepositoryStateUnchanged(
          baseline,
          captureRepositoryState(repository),
        ),
      ).toThrow(/repository state changed/iu);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });
});
