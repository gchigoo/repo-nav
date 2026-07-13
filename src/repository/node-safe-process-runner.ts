import { spawn } from 'node:child_process';

import { Injectable } from '@nestjs/common';

import {
  SafeProcessRequestSchema,
  type SafeProcessFailure,
  type SafeProcessRequest,
  type SafeProcessResult,
  type SafeProcessRunner,
} from '../contracts/index.js';

const INHERITED_ENV_ALLOWLIST = [
  'PATH',
  'PATHEXT',
  'SystemRoot',
  'TEMP',
  'TMP',
] as const;
const CLEANUP_INVARIANT_MESSAGE = 'Safe process cleanup invariant failed.';
const FINAL_CLOSE_WAIT_MS = 2_000;

type TerminationKind = Extract<
  SafeProcessFailure['kind'],
  'aborted' | 'timeout' | 'stdout-limit' | 'stderr-limit'
>;

function emptyBytes(): Uint8Array {
  return new Uint8Array();
}

function fixedFailure(
  kind: 'invalid-request' | 'spawn-error',
): SafeProcessFailure {
  return {
    ok: false,
    kind,
    exitCode: null,
    terminationSignal: null,
    stdout: emptyBytes(),
    stderr: emptyBytes(),
  };
}

function controlledEnvironment(
  additions?: Readonly<Record<string, string>>,
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  const parentEntries = Object.entries(process.env);
  for (const requestedKey of INHERITED_ENV_ALLOWLIST) {
    const found = parentEntries.find(
      ([key, value]) =>
        value !== undefined && key.toLowerCase() === requestedKey.toLowerCase(),
    );
    if (found !== undefined) {
      environment[found[0]] = found[1];
    }
  }
  for (const [key, value] of Object.entries(additions ?? {})) {
    environment[key] = value;
  }
  return environment;
}

async function runTaskkill(pid: number, force: boolean): Promise<void> {
  await new Promise<void>((resolveTaskkill, rejectTaskkill) => {
    const argv = ['/PID', String(pid), '/T'];
    if (force) {
      argv.push('/F');
    }
    const killer = spawn('taskkill.exe', argv, {
      shell: false,
      stdio: 'ignore',
      windowsHide: true,
    });
    let completed = false;
    const fail = (): void => {
      if (!completed) {
        completed = true;
        rejectTaskkill(new Error(CLEANUP_INVARIANT_MESSAGE));
      }
    };
    killer.once('error', fail);
    killer.once('close', (code) => {
      if (completed) {
        return;
      }
      completed = true;
      if (code === 0) {
        resolveTaskkill();
      } else {
        rejectTaskkill(new Error(CLEANUP_INVARIANT_MESSAGE));
      }
    });
  });
}

async function terminateProcessTree(pid: number, force: boolean): Promise<void> {
  if (process.platform === 'win32') {
    await runTaskkill(pid, force);
    return;
  }
  try {
    process.kill(-pid, force ? 'SIGKILL' : 'SIGTERM');
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? error.code
        : undefined;
    if (code !== 'ESRCH') {
      throw error;
    }
  }
}

@Injectable()
export class NodeSafeProcessRunner implements SafeProcessRunner {
  protected terminateProcessTree(pid: number, force: boolean): Promise<void> {
    return terminateProcessTree(pid, force);
  }

  protected killDirectChild(child: ReturnType<typeof spawn>): void {
    child.kill('SIGKILL');
  }

  public async run(
    request: SafeProcessRequest,
    signal: AbortSignal,
  ): Promise<SafeProcessResult> {
    const parsed = SafeProcessRequestSchema.safeParse(request);
    if (!parsed.success) {
      return fixedFailure('invalid-request');
    }
    if (signal.aborted) {
      return {
        ok: false,
        kind: 'aborted',
        exitCode: null,
        terminationSignal: null,
        stdout: emptyBytes(),
        stderr: emptyBytes(),
      };
    }

    const validRequest = parsed.data;
    return await new Promise<SafeProcessResult>((resolveResult, rejectResult) => {
      let settled = false;
      let spawned = false;
      let terminationKind: TerminationKind | undefined;
      let hardKillStarted = false;
      let stdoutBytes = 0;
      let stderrBytes = 0;
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      let timeout: NodeJS.Timeout | undefined;
      let hardKillTimeout: NodeJS.Timeout | undefined;
      let cleanupDeadlineTimeout: NodeJS.Timeout | undefined;

      let child: ReturnType<typeof spawn>;
      try {
        child = spawn(validRequest.executable, [...validRequest.argv], {
          cwd: validRequest.cwd,
          env: controlledEnvironment(validRequest.env),
          shell: false,
          detached: process.platform !== 'win32',
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        });
      } catch {
        resolveResult(fixedFailure('spawn-error'));
        return;
      }

      const cleanup = (): void => {
        if (timeout !== undefined) {
          clearTimeout(timeout);
        }
        if (hardKillTimeout !== undefined) {
          clearTimeout(hardKillTimeout);
        }
        if (cleanupDeadlineTimeout !== undefined) {
          clearTimeout(cleanupDeadlineTimeout);
        }
        signal.removeEventListener('abort', onAbort);
        child.stdout?.removeListener('data', onStdout);
        child.stderr?.removeListener('data', onStderr);
        child.removeListener('spawn', onChildSpawn);
      };

      const settle = (result: SafeProcessResult): void => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolveResult(result);
      };

      const rejectCleanupInvariant = (): void => {
        if (settled) {
          return;
        }
        settled = true;
        try {
          this.killDirectChild(child);
        } catch {
          // The owned child may already have exited while the tree command failed.
        }
        cleanup();
        child.stdout?.destroy();
        child.stderr?.destroy();
        rejectResult(new Error(CLEANUP_INVARIANT_MESSAGE));
      };

      const startHardKill = (): void => {
        if (settled || hardKillStarted || child.pid === undefined) {
          return;
        }
        hardKillStarted = true;
        cleanupDeadlineTimeout = setTimeout(
          rejectCleanupInvariant,
          FINAL_CLOSE_WAIT_MS,
        );
        void this.terminateProcessTree(child.pid, true).catch(() => {
          try {
            this.killDirectChild(child);
          } catch {
            // The final deadline owns the invariant verdict.
          }
        });
      };

      const beginTermination = (kind: TerminationKind): void => {
        if (terminationKind !== undefined || settled) {
          return;
        }
        terminationKind = kind;
        if (timeout !== undefined) {
          clearTimeout(timeout);
        }
        signal.removeEventListener('abort', onAbort);
        if (child.pid === undefined) {
          return;
        }
        void this.terminateProcessTree(child.pid, false).catch(startHardKill);
        hardKillTimeout = setTimeout(
          startHardKill,
          validRequest.terminateGraceMs,
        );
      };

      const capture = (chunk: Buffer, stream: 'stdout' | 'stderr'): void => {
        if (settled) {
          return;
        }
        const isStdout = stream === 'stdout';
        const currentBytes = isStdout ? stdoutBytes : stderrBytes;
        const maximumBytes = isStdout
          ? validRequest.maxStdoutBytes
          : validRequest.maxStderrBytes;
        const remaining = Math.max(0, maximumBytes - currentBytes);
        if (remaining > 0) {
          const captured = chunk.subarray(0, remaining);
          if (isStdout) {
            stdoutChunks.push(captured);
            stdoutBytes += captured.byteLength;
          } else {
            stderrChunks.push(captured);
            stderrBytes += captured.byteLength;
          }
        }
        if (remaining === 0 || chunk.byteLength >= remaining) {
          beginTermination(isStdout ? 'stdout-limit' : 'stderr-limit');
        }
      };

      const onStdout = (chunk: Buffer): void => capture(chunk, 'stdout');
      const onStderr = (chunk: Buffer): void => capture(chunk, 'stderr');
      const onAbort = (): void => beginTermination('aborted');
      const onChildSpawn = (): void => {
        spawned = true;
      };
      const onChildError = (): void => {
        if (settled) {
          return;
        }
        if (!spawned) {
          settle(fixedFailure('spawn-error'));
          return;
        }
        if (terminationKind !== undefined) {
          startHardKill();
          return;
        }
        rejectCleanupInvariant();
      };
      const onChildClose = (
        code: number | null,
        closeSignal: NodeJS.Signals | null,
      ): void => {
        try {
          if (settled) {
            return;
          }
          const stdout = Buffer.concat(stdoutChunks, stdoutBytes);
          const stderr = Buffer.concat(stderrChunks, stderrBytes);
          if (terminationKind !== undefined) {
            settle({
              ok: false,
              kind: terminationKind,
              exitCode: code,
              terminationSignal: closeSignal,
              stdout,
              stderr,
            });
            return;
          }
          if (code === 0) {
            settle({ ok: true, exitCode: 0, stdout, stderr });
            return;
          }
          settle({
            ok: false,
            kind: 'non-zero-exit',
            exitCode: code,
            terminationSignal: closeSignal,
            stdout,
            stderr,
          });
        } finally {
          child.removeListener('error', onChildError);
        }
      };

      child.stdout?.on('data', onStdout);
      child.stderr?.on('data', onStderr);
      child.once('spawn', onChildSpawn);
      child.on('error', onChildError);
      child.once('close', onChildClose);
      signal.addEventListener('abort', onAbort, { once: true });
      if (signal.aborted) {
        beginTermination('aborted');
      }
      if (terminationKind === undefined) {
        timeout = setTimeout(
          () => beginTermination('timeout'),
          validRequest.timeoutMs,
        );
      }
    });
  }
}
