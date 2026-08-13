import type {
  SafeProcessRequest,
  StreamingSafeProcessRunnerV2,
} from '../contracts/safe-process.js';
import { BoundedByteCollectorV2 } from './bounded-byte-collector-v2.js';

export type ExecutableAvailabilityProbeResultV2 =
  | Readonly<{
      ok: true;
      stdout: Uint8Array;
    }>
  | Readonly<{
      ok: false;
      kind: 'not-found' | 'aborted' | 'failed';
    }>;

export async function runExecutableAvailabilityProbeV2(
  runner: StreamingSafeProcessRunnerV2,
  request: SafeProcessRequest,
  signal: AbortSignal,
): Promise<ExecutableAvailabilityProbeResultV2> {
  const streaming = await runner.runStreaming(
    request,
    signal,
    new BoundedByteCollectorV2(),
  );
  if (streaming.ok) {
    return streaming.exitCode === 0
      ? Object.freeze({
          ok: true as const,
          stdout: streaming.stdout.value,
        })
      : Object.freeze({ ok: false as const, kind: 'failed' as const });
  }
  if (
    streaming.kind === 'other-spawn-error' &&
    streaming.spawnFailureReason === 'not-found'
  ) {
    return Object.freeze({ ok: false, kind: 'not-found' });
  }
  if (streaming.kind === 'aborted' || streaming.kind === 'timeout') {
    return Object.freeze({ ok: false, kind: 'aborted' });
  }
  return Object.freeze({ ok: false, kind: 'failed' });
}
