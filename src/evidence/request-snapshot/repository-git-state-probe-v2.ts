import type { SafeProcessRunner } from '../../contracts/index.js';

export type RepositoryGitStateV2 = 'clean' | 'dirty' | 'not-git' | 'unknown';

const GIT_ARGV = Object.freeze(['status', '--porcelain=v1', '-z'] as const);

const GIT_MAX_OUTPUT_BYTES = 1024;

/**
 * 固定 argv + 1 KiB bounded output；失败一律 unknown；不输出 stdout/stderr/revision。
 */
export async function probeRepositoryGitStateV2(
  repositoryRoot: string,
  runner: SafeProcessRunner,
  signal: AbortSignal,
): Promise<RepositoryGitStateV2> {
  let result;
  try {
    result = await runner.run(
      {
        executable: 'git',
        argv: [...GIT_ARGV],
        cwd: repositoryRoot,
        maxStdoutBytes: GIT_MAX_OUTPUT_BYTES,
        maxStderrBytes: GIT_MAX_OUTPUT_BYTES,
        timeoutMs: 5_000,
        terminateGraceMs: 500,
      },
      signal,
    );
  } catch {
    return 'unknown';
  }

  if (!result.ok) {
    if (
      result.kind === 'spawn-error' ||
      result.kind === 'timeout' ||
      result.kind === 'aborted' ||
      result.kind === 'stdout-limit' ||
      result.kind === 'stderr-limit' ||
      result.kind === 'invalid-request'
    ) {
      return 'unknown';
    }
    const stderrText = Buffer.from(result.stderr).toString('utf8');
    if (/not a git repository/iu.test(stderrText)) {
      return 'not-git';
    }
    return 'unknown';
  }

  return result.stdout.byteLength === 0 ? 'clean' : 'dirty';
}

/**
 * 纯函数映射表：供 unit 真值表直接验证。
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
