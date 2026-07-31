import { createHash } from 'node:crypto';

import type { SafeProcessRunner } from '../../contracts/index.js';

export type RepositoryGitStateV2 = 'clean' | 'dirty' | 'not-git' | 'unknown';

export interface RepositoryGitProbeResultV2 {
  readonly gitState: RepositoryGitStateV2;
  /** 无绝对路径：如 `HEAD:<sha>` / `HEAD:<sha>+dirty:<fp>`；unknown/not-git 为空串 */
  readonly snapshotRef: string;
}

const GIT_MAX_OUTPUT_BYTES = 4096;

async function runGit(
  runner: SafeProcessRunner,
  repositoryRoot: string,
  argv: readonly string[],
  signal: AbortSignal,
  maxStdoutBytes = GIT_MAX_OUTPUT_BYTES,
) {
  return await runner.run(
    {
      executable: 'git',
      argv: [...argv],
      cwd: repositoryRoot,
      maxStdoutBytes,
      maxStderrBytes: GIT_MAX_OUTPUT_BYTES,
      timeoutMs: 5_000,
      terminateGraceMs: 500,
    },
    signal,
  );
}

function isNotGit(stderr: Uint8Array): boolean {
  return /not a git repository/iu.test(Buffer.from(stderr).toString('utf8'));
}

function shortSha(hex: string): string {
  const trimmed = hex.trim();
  return trimmed.length >= 12 ? trimmed.slice(0, 12) : trimmed;
}

function dirtyFingerprint(parts: readonly string[]): string {
  return createHash('sha256')
    .update(parts.join('\u0001'), 'utf8')
    .digest('hex')
    .slice(0, 12);
}

/**
 * 用 diff --quiet / cached + 有界 untracked 探测替代整包 porcelain 截断。
 */
export async function probeRepositoryGitStateV2(
  repositoryRoot: string,
  runner: SafeProcessRunner,
  signal: AbortSignal,
): Promise<RepositoryGitStateV2> {
  const probed = await probeRepositoryGitStateDetailedV2(
    repositoryRoot,
    runner,
    signal,
  );
  return probed.gitState;
}

/**
 * gitState + 无绝对路径 snapshotRef。
 */
export async function probeRepositoryGitStateDetailedV2(
  repositoryRoot: string,
  runner: SafeProcessRunner,
  signal: AbortSignal,
): Promise<RepositoryGitProbeResultV2> {
  let inside;
  try {
    inside = await runGit(
      runner,
      repositoryRoot,
      ['rev-parse', '--is-inside-work-tree'],
      signal,
    );
  } catch {
    return Object.freeze({ gitState: 'unknown', snapshotRef: '' });
  }

  if (!inside.ok) {
    if (
      inside.kind === 'spawn-error' ||
      inside.kind === 'timeout' ||
      inside.kind === 'aborted' ||
      inside.kind === 'stdout-limit' ||
      inside.kind === 'stderr-limit' ||
      inside.kind === 'invalid-request'
    ) {
      return Object.freeze({ gitState: 'unknown', snapshotRef: '' });
    }
    if (isNotGit(inside.stderr)) {
      return Object.freeze({ gitState: 'not-git', snapshotRef: '' });
    }
    return Object.freeze({ gitState: 'unknown', snapshotRef: '' });
  }

  const head = await runGit(
    runner,
    repositoryRoot,
    ['rev-parse', 'HEAD'],
    signal,
  );
  const headRef =
    head.ok && head.stdout.byteLength > 0
      ? `HEAD:${shortSha(Buffer.from(head.stdout).toString('utf8'))}`
      : 'HEAD:unknown';

  const unstaged = await runGit(
    runner,
    repositoryRoot,
    ['diff', '--quiet'],
    signal,
  );
  if (!unstaged.ok) {
    if (
      unstaged.kind === 'spawn-error' ||
      unstaged.kind === 'timeout' ||
      unstaged.kind === 'aborted' ||
      unstaged.kind === 'stdout-limit' ||
      unstaged.kind === 'stderr-limit' ||
      unstaged.kind === 'invalid-request'
    ) {
      return Object.freeze({ gitState: 'unknown', snapshotRef: '' });
    }
    if (isNotGit(unstaged.stderr)) {
      return Object.freeze({ gitState: 'not-git', snapshotRef: '' });
    }
    if (unstaged.kind === 'non-zero-exit' && unstaged.exitCode === 1) {
      const fp = dirtyFingerprint(['unstaged', headRef]);
      return Object.freeze({
        gitState: 'dirty',
        snapshotRef: `${headRef}+dirty:${fp}`,
      });
    }
    return Object.freeze({ gitState: 'unknown', snapshotRef: '' });
  }

  const staged = await runGit(
    runner,
    repositoryRoot,
    ['diff', '--cached', '--quiet'],
    signal,
  );
  if (!staged.ok) {
    if (
      staged.kind === 'spawn-error' ||
      staged.kind === 'timeout' ||
      staged.kind === 'aborted' ||
      staged.kind === 'stdout-limit' ||
      staged.kind === 'stderr-limit' ||
      staged.kind === 'invalid-request'
    ) {
      return Object.freeze({ gitState: 'unknown', snapshotRef: '' });
    }
    if (isNotGit(staged.stderr)) {
      return Object.freeze({ gitState: 'not-git', snapshotRef: '' });
    }
    if (staged.kind === 'non-zero-exit' && staged.exitCode === 1) {
      const fp = dirtyFingerprint(['staged', headRef]);
      return Object.freeze({
        gitState: 'dirty',
        snapshotRef: `${headRef}+dirty:${fp}`,
      });
    }
    return Object.freeze({ gitState: 'unknown', snapshotRef: '' });
  }

  const untracked = await runGit(
    runner,
    repositoryRoot,
    ['ls-files', '--others', '--exclude-standard', '-z'],
    signal,
    256,
  );
  if (!untracked.ok) {
    if (
      untracked.kind === 'spawn-error' ||
      untracked.kind === 'timeout' ||
      untracked.kind === 'aborted' ||
      untracked.kind === 'invalid-request'
    ) {
      return Object.freeze({ gitState: 'unknown', snapshotRef: '' });
    }
    if (untracked.kind === 'stdout-limit') {
      const fp = dirtyFingerprint(['untracked-overflow', headRef]);
      return Object.freeze({
        gitState: 'dirty',
        snapshotRef: `${headRef}+dirty:${fp}`,
      });
    }
    if (isNotGit(untracked.stderr)) {
      return Object.freeze({ gitState: 'not-git', snapshotRef: '' });
    }
    return Object.freeze({ gitState: 'unknown', snapshotRef: '' });
  }

  if (untracked.stdout.byteLength > 0) {
    const fp = dirtyFingerprint([
      'untracked',
      headRef,
      String(untracked.stdout.byteLength),
    ]);
    return Object.freeze({
      gitState: 'dirty',
      snapshotRef: `${headRef}+dirty:${fp}`,
    });
  }

  return Object.freeze({ gitState: 'clean', snapshotRef: headRef });
}

/**
 * 纯函数映射表：供 unit 真值表直接验证（兼容旧 porcelain 语义）。
 */
export function mapGitProcessResultToStateV2(input: {
  readonly ok: boolean;
  readonly kind?: string;
  readonly stdoutEmpty?: boolean;
  readonly stderrText?: string;
}): RepositoryGitStateV2 {
  if (!input.ok) {
    if (
      input.kind === 'spawn-error' ||
      input.kind === 'timeout' ||
      input.kind === 'aborted' ||
      input.kind === 'stdout-limit' ||
      input.kind === 'stderr-limit' ||
      input.kind === 'invalid-request'
    ) {
      return 'unknown';
    }
    if (/not a git repository/iu.test(input.stderrText ?? '')) {
      return 'not-git';
    }
    return 'unknown';
  }
  return input.stdoutEmpty === true ? 'clean' : 'dirty';
}
