import {
  CLEANUP_INVARIANT_MESSAGE,
  type SafeProcessResult,
  type SafeProcessStreamingResultV2,
} from '../contracts/safe-process.js';

/**
 * 将 kernel streaming settlement 投影为旧 SafeProcessResult。
 * executable-not-found / consumer-stop / consumer-invalid 不可由 BoundedByteCollector 生成；
 * 若 mutation 伪造则抛固定 invariant。
 */
export function projectBufferedCompatibilityResultV2(
  streaming: SafeProcessStreamingResultV2<Uint8Array, Uint8Array>,
): SafeProcessResult {
  if (streaming.ok) {
    if (streaming.exitCode === 0) {
      return {
        ok: true,
        exitCode: 0,
        stdout: streaming.stdout.value,
        stderr: streaming.stderr,
      };
    }
    return {
      ok: false,
      kind: 'non-zero-exit',
      exitCode: streaming.exitCode,
      terminationSignal: null,
      stdout: streaming.stdout.value,
      stderr: streaming.stderr,
    };
  }

  switch (streaming.kind) {
    case 'invalid-request':
      return {
        ok: false,
        kind: 'invalid-request',
        exitCode: null,
        terminationSignal: null,
        stdout: new Uint8Array(),
        stderr: new Uint8Array(),
      };
    case 'other-spawn-error':
      return {
        ok: false,
        kind: 'spawn-error',
        exitCode: null,
        terminationSignal: null,
        stdout: new Uint8Array(),
        stderr: new Uint8Array(),
      };
    case 'aborted':
      if (streaming.startState === 'no-child') {
        return {
          ok: false,
          kind: 'aborted',
          exitCode: null,
          terminationSignal: null,
          stdout: new Uint8Array(),
          stderr: new Uint8Array(),
        };
      }
      return {
        ok: false,
        kind: 'aborted',
        exitCode: streaming.exitCode,
        terminationSignal: streaming.terminationSignal,
        stdout: bytesFromStdout(streaming.stdout),
        stderr: streaming.stderr,
      };
    case 'timeout':
    case 'stdout-limit':
    case 'stderr-limit':
      return {
        ok: false,
        kind: streaming.kind,
        exitCode: streaming.exitCode,
        terminationSignal: streaming.terminationSignal,
        stdout: bytesFromStdout(streaming.stdout),
        stderr: streaming.stderr,
      };
    case 'process-exit':
      return {
        ok: false,
        kind: 'non-zero-exit',
        exitCode: streaming.exitCode,
        terminationSignal: streaming.terminationSignal,
        stdout: new Uint8Array(),
        stderr: streaming.stderr,
      };
    case 'cleanup-invariant':
      throw new Error(CLEANUP_INVARIANT_MESSAGE);
    case 'consumer-stop':
    case 'consumer-invalid':
      throw new Error(
        'Buffered compatibility projection rejected consumer-only kind.',
      );
    default: {
      const _exhaustive: never = streaming;
      return _exhaustive;
    }
  }
}

function bytesFromStdout(
  stdout:
    | Readonly<{ kind: 'partial'; value: Uint8Array }>
    | Readonly<{ kind: 'unavailable' }>
    | Readonly<{ kind: 'complete'; value: Uint8Array }>,
): Uint8Array {
  if (stdout.kind === 'unavailable') {
    return new Uint8Array();
  }
  return stdout.value;
}
