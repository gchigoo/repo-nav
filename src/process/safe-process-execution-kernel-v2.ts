import {
  spawn,
  type ChildProcess,
  type ChildProcessWithoutNullStreams,
} from 'node:child_process';

import {
  CLEANUP_INVARIANT_MESSAGE,
  SafeProcessRequestSchema,
  type SafeProcessRequest,
  type SafeProcessStreamingResultV2,
  type SafeStdoutConsumerDecisionV2,
  type SafeStdoutConsumerV2,
} from '../contracts/safe-process.js';
import { BoundedByteCollectorV2 } from './bounded-byte-collector-v2.js';
import {
  createPrimaryTerminationTriggerStateV2,
  reducePrimaryTerminationTriggerV2,
  type PrimaryTerminationTriggerKindV2,
  type PrimaryTerminationTriggerStateV2,
} from './primary-termination-trigger-reducer-v2.js';
import {
  isLegalCompletedExitPairV2,
  reduceSettlementVerdictV2,
} from './settlement-verdict-v2.js';
import {
  classifySpawnFailureReasonV2,
  type SpawnFailureReasonV2,
} from './spawn-failure-reason-v2.js';

const INHERITED_ENV_ALLOWLIST = [
  'PATH',
  'PATHEXT',
  'SystemRoot',
  'TEMP',
  'TMP',
] as const;
const FINAL_CLOSE_WAIT_MS = 2_000;

export interface SafeProcessKernelHooksV2 {
  readonly spawn?: typeof spawn;
  readonly terminateProcessTree?: (
    pid: number,
    force: boolean,
  ) => Promise<void>;
  readonly killDirectChild?: (child: ChildProcess) => void;
  readonly setTimeout?: typeof setTimeout;
  readonly clearTimeout?: typeof clearTimeout;
}

function emptyBytes(): Uint8Array {
  return new Uint8Array();
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

export async function defaultTerminateProcessTreeV2(
  pid: number,
  force: boolean,
): Promise<void> {
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

function isThenable(value: unknown): boolean {
  return (
    (typeof value === 'object' &&
      value !== null &&
      'then' in value &&
      typeof (value as { then: unknown }).then === 'function') ||
    typeof value === 'function'
  );
}

function validateFinalizationWrapper(
  raw: unknown,
): { readonly ok: true; readonly value: unknown } | { readonly ok: false } {
  if (raw === undefined || raw === null || typeof raw !== 'object') {
    return { ok: false };
  }
  if (isThenable(raw)) {
    return { ok: false };
  }
  const keys = Object.keys(raw as object);
  if ('ok' in (raw as object) && (raw as { ok: unknown }).ok === true) {
    if (keys.length !== 2 || !keys.includes('value')) {
      return { ok: false };
    }
    return { ok: true, value: (raw as { value: unknown }).value };
  }
  if (
    'ok' in (raw as object) &&
    (raw as { ok: unknown }).ok === false &&
    'kind' in (raw as object) &&
    (raw as { kind: unknown }).kind === 'consumer-invalid' &&
    keys.length === 2
  ) {
    return { ok: false };
  }
  return { ok: false };
}

function isValidDecision(
  decision: unknown,
  offeredLength: number,
): decision is SafeStdoutConsumerDecisionV2 {
  if (
    typeof decision !== 'object' ||
    decision === null ||
    !('action' in decision) ||
    !('consumedBytes' in decision)
  ) {
    return false;
  }
  const action = (decision as { action: unknown }).action;
  const consumed = (decision as { consumedBytes: unknown }).consumedBytes;
  if (action !== 'continue' && action !== 'stop') {
    return false;
  }
  if (typeof consumed !== 'number' || !Number.isSafeInteger(consumed)) {
    return false;
  }
  if (action === 'continue') {
    return consumed === offeredLength;
  }
  return consumed >= 1 && consumed <= offeredLength;
}

function noChildResult(
  kind: 'invalid-request' | 'aborted',
): SafeProcessStreamingResultV2<never, never> {
  return Object.freeze({
    ok: false,
    kind,
    startState: 'no-child',
    exitCode: null,
    terminationSignal: null,
    stdout: Object.freeze({ kind: 'unavailable' as const }),
    stderr: emptyBytes(),
  });
}

function spawnFailureResult(
  reason: SpawnFailureReasonV2,
): SafeProcessStreamingResultV2<never, never> {
  return Object.freeze({
    ok: false,
    kind: 'other-spawn-error',
    startState: 'no-child',
    spawnFailureReason: reason,
    exitCode: null,
    terminationSignal: null,
    stdout: Object.freeze({ kind: 'unavailable' as const }),
    stderr: emptyBytes(),
  });
}

/**
 * 唯一 child lifecycle / N+1 owner。buffered 与 streaming 共用本 kernel。
 */
export class SafeProcessExecutionKernelV2 {
  private readonly spawnImpl: typeof spawn;
  private readonly terminateProcessTree: (
    pid: number,
    force: boolean,
  ) => Promise<void>;
  private readonly killDirectChild: (child: ChildProcess) => void;
  private readonly setTimeoutImpl: typeof setTimeout;
  private readonly clearTimeoutImpl: typeof clearTimeout;

  public constructor(hooks: SafeProcessKernelHooksV2 = {}) {
    this.spawnImpl = hooks.spawn ?? spawn;
    this.terminateProcessTree =
      hooks.terminateProcessTree ?? defaultTerminateProcessTreeV2;
    this.killDirectChild =
      hooks.killDirectChild ??
      ((child) => {
        child.kill('SIGKILL');
      });
    this.setTimeoutImpl = hooks.setTimeout ?? setTimeout;
    this.clearTimeoutImpl = hooks.clearTimeout ?? clearTimeout;
  }

  public runStreaming<TPartial, TComplete>(
    request: SafeProcessRequest,
    signal: AbortSignal,
    consumer: SafeStdoutConsumerV2<TPartial, TComplete>,
  ): Promise<SafeProcessStreamingResultV2<TPartial, TComplete>> {
    const parsed = SafeProcessRequestSchema.safeParse(request);
    if (!parsed.success) {
      return Promise.resolve(noChildResult('invalid-request'));
    }
    if (signal.aborted) {
      return Promise.resolve(noChildResult('aborted'));
    }
    return this.executeStarted(parsed.data, signal, consumer);
  }

  private executeStarted<TPartial, TComplete>(
    validRequest: SafeProcessRequest,
    signal: AbortSignal,
    consumer: SafeStdoutConsumerV2<TPartial, TComplete>,
  ): Promise<SafeProcessStreamingResultV2<TPartial, TComplete>> {
    return new Promise((resolveResult, rejectResult) => {
      let settled = false;
      let spawned = false;
      let hardKillStarted = false;
      let sequence = 0;
      let triggerState = createPrimaryTerminationTriggerStateV2();
      let stdoutAccepted = 0;
      let stderrCollector = new BoundedByteCollectorV2();
      let timeout: ReturnType<typeof setTimeout> | undefined;
      let hardKillTimeout: ReturnType<typeof setTimeout> | undefined;
      let cleanupDeadlineTimeout: ReturnType<typeof setTimeout> | undefined;
      let closeCandidate:
        { exitCode: number | null; signal: string | null } | undefined;
      let cleanupFailed = false;
      let finalizerInvalid = false;
      let stdoutPartial: TPartial | undefined;
      let stdoutComplete: TComplete | undefined;
      let stdoutUnavailable = false;
      let child: ChildProcessWithoutNullStreams;

      try {
        child = this.spawnImpl(
          validRequest.executable,
          [...validRequest.argv],
          {
            cwd: validRequest.cwd,
            env: controlledEnvironment(validRequest.env),
            shell: false,
            detached: process.platform !== 'win32',
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
          },
        ) as unknown as ChildProcessWithoutNullStreams;
      } catch (error: unknown) {
        resolveResult(spawnFailureResult(classifySpawnFailureReasonV2(error)));
        return;
      }

      const nextSequence = (): number => {
        sequence += 1;
        return sequence;
      };

      const acceptTrigger = (kind: PrimaryTerminationTriggerKindV2): void => {
        triggerState = reducePrimaryTerminationTriggerV2(triggerState, {
          sequence: nextSequence(),
          kind,
        });
      };

      const cleanupListeners = (): void => {
        if (timeout !== undefined) {
          this.clearTimeoutImpl(timeout);
        }
        if (hardKillTimeout !== undefined) {
          this.clearTimeoutImpl(hardKillTimeout);
        }
        if (cleanupDeadlineTimeout !== undefined) {
          this.clearTimeoutImpl(cleanupDeadlineTimeout);
        }
        signal.removeEventListener('abort', onAbort);
        child.stdout.removeListener('data', onStdout);
        child.stderr.removeListener('data', onStderr);
        child.removeListener('spawn', onChildSpawn);
      };

      const settleStreaming = (
        result: SafeProcessStreamingResultV2<TPartial, TComplete>,
      ): void => {
        if (settled) {
          return;
        }
        settled = true;
        cleanupListeners();
        if (result.kind === 'cleanup-invariant' && !result.ok) {
          rejectResult(new Error(CLEANUP_INVARIANT_MESSAGE));
          return;
        }
        resolveResult(result);
      };

      const rejectCleanupInvariant = (): void => {
        cleanupFailed = true;
        try {
          this.killDirectChild(child);
        } catch {
          // owned child may already have exited
        }
        finalizeAndSettle();
      };

      const startHardKill = (): void => {
        if (settled || hardKillStarted || child.pid === undefined) {
          return;
        }
        hardKillStarted = true;
        cleanupDeadlineTimeout = this.setTimeoutImpl(
          rejectCleanupInvariant,
          FINAL_CLOSE_WAIT_MS,
        );
        void this.terminateProcessTree(child.pid, true).catch(() => {
          try {
            this.killDirectChild(child);
          } catch {
            // final deadline owns the invariant verdict
          }
        });
      };

      const beginTermination = (): void => {
        if (settled) {
          return;
        }
        if (timeout !== undefined) {
          this.clearTimeoutImpl(timeout);
          timeout = undefined;
        }
        signal.removeEventListener('abort', onAbort);
        if (child.pid === undefined) {
          return;
        }
        void this.terminateProcessTree(child.pid, false).catch(startHardKill);
        hardKillTimeout = this.setTimeoutImpl(
          startHardKill,
          validRequest.terminateGraceMs,
        );
      };

      const runFinalizer = (mode: 'partial' | 'finish'): void => {
        let raw: unknown;
        try {
          raw = mode === 'partial' ? consumer.partial() : consumer.finish();
        } catch {
          finalizerInvalid = true;
          stdoutUnavailable = true;
          return;
        }
        const wrapper = validateFinalizationWrapper(raw);
        if (!wrapper.ok) {
          // wrapper false covers both invalid shape and ok:false consumer-invalid
          if (
            typeof raw === 'object' &&
            raw !== null &&
            (raw as { ok?: unknown }).ok === false &&
            (raw as { kind?: unknown }).kind === 'consumer-invalid' &&
            Object.keys(raw).length === 2
          ) {
            finalizerInvalid = true;
            stdoutUnavailable = true;
            return;
          }
          finalizerInvalid = true;
          stdoutUnavailable = true;
          return;
        }
        try {
          const valid =
            mode === 'partial'
              ? consumer.validatePartialValue(wrapper.value)
              : consumer.validateCompleteValue(wrapper.value);
          if (valid !== true) {
            finalizerInvalid = true;
            stdoutUnavailable = true;
            return;
          }
        } catch {
          finalizerInvalid = true;
          stdoutUnavailable = true;
          return;
        }
        if (mode === 'partial') {
          stdoutPartial = wrapper.value as TPartial;
        } else {
          stdoutComplete = wrapper.value as TComplete;
        }
      };

      const finalizeAndSettle = (): void => {
        if (settled) {
          return;
        }
        const primary = triggerState.frozen;
        if (primary === undefined && closeCandidate !== undefined) {
          runFinalizer('finish');
        } else if (primary !== undefined) {
          runFinalizer('partial');
        } else {
          runFinalizer('finish');
        }

        const verdict = reduceSettlementVerdictV2({
          cleanupFailed,
          finalizerInvalid,
          primary,
          close: closeCandidate,
        });
        const stderrFin = stderrCollector.partial();
        const stderrBytes = stderrFin.ok ? stderrFin.value : emptyBytes();

        if (verdict === 'cleanup-invariant') {
          settleStreaming({
            ok: false,
            kind: 'cleanup-invariant',
            startState: 'started',
            exitCode: closeCandidate?.exitCode ?? null,
            terminationSignal: closeCandidate?.signal ?? null,
            stdout: { kind: 'unavailable' },
            stderr: stderrBytes,
          });
          return;
        }
        if (verdict === 'completed' && closeCandidate !== undefined) {
          settleStreaming({
            ok: true,
            kind: 'completed',
            startState: 'started',
            exitCode: closeCandidate.exitCode as number,
            terminationSignal: null,
            stdout: {
              kind: 'complete',
              value: stdoutComplete as TComplete,
            },
            stderr: stderrBytes,
          });
          return;
        }
        if (verdict === 'process-exit') {
          settleStreaming({
            ok: false,
            kind: 'process-exit',
            startState: 'started',
            exitCode: closeCandidate?.exitCode ?? null,
            terminationSignal: closeCandidate?.signal ?? null,
            stdout: { kind: 'unavailable' },
            stderr: stderrBytes,
          });
          return;
        }
        if (verdict === 'consumer-invalid') {
          settleStreaming({
            ok: false,
            kind: 'consumer-invalid',
            startState: 'started',
            exitCode: closeCandidate?.exitCode ?? null,
            terminationSignal: closeCandidate?.signal ?? null,
            stdout: { kind: 'unavailable' },
            stderr: stderrBytes,
          });
          return;
        }
        const primaryKind = verdict as
          | 'aborted'
          | 'timeout'
          | 'stdout-limit'
          | 'stderr-limit'
          | 'consumer-stop';
        const hasPartial =
          !stdoutUnavailable &&
          stdoutPartial !== undefined &&
          !finalizerInvalid;
        settleStreaming({
          ok: false,
          kind: primaryKind,
          startState: 'started',
          exitCode: closeCandidate?.exitCode ?? null,
          terminationSignal: closeCandidate?.signal ?? null,
          stdout: hasPartial
            ? { kind: 'partial', value: stdoutPartial as TPartial }
            : { kind: 'unavailable' },
          stderr: stderrBytes,
        });
      };

      const offerStdout = (chunk: Buffer): void => {
        if (settled || triggerState.frozen !== undefined) {
          return;
        }
        let offset = 0;
        while (offset < chunk.byteLength) {
          if (triggerState.frozen !== undefined) {
            return;
          }
          const remaining = validRequest.maxStdoutBytes - stdoutAccepted;
          if (remaining <= 0) {
            // already at N; any further byte is N+1 sentinel
            acceptTrigger('stdout-limit');
            beginTermination();
            return;
          }
          const offerLen = Math.min(remaining, chunk.byteLength - offset);
          const offered = chunk.subarray(offset, offset + offerLen);
          let decision: unknown;
          try {
            decision = consumer.push(offered);
          } catch {
            acceptTrigger('consumer-invalid');
            beginTermination();
            return;
          }
          if (!isValidDecision(decision, offered.byteLength)) {
            acceptTrigger('consumer-invalid');
            beginTermination();
            return;
          }
          if (decision.action === 'stop') {
            stdoutAccepted += decision.consumedBytes;
            acceptTrigger('consumer-stop');
            beginTermination();
            return;
          }
          stdoutAccepted += decision.consumedBytes;
          offset += decision.consumedBytes;
          if (
            stdoutAccepted === validRequest.maxStdoutBytes &&
            offset < chunk.byteLength
          ) {
            acceptTrigger('stdout-limit');
            beginTermination();
            return;
          }
        }
      };

      const offerStderr = (chunk: Buffer): void => {
        if (settled || triggerState.frozen !== undefined) {
          return;
        }
        let offset = 0;
        let accepted = stderrCollector.byteLength();
        while (offset < chunk.byteLength) {
          if (triggerState.frozen !== undefined) {
            return;
          }
          const remaining = validRequest.maxStderrBytes - accepted;
          if (remaining <= 0) {
            acceptTrigger('stderr-limit');
            beginTermination();
            return;
          }
          const offerLen = Math.min(remaining, chunk.byteLength - offset);
          const offered = chunk.subarray(offset, offset + offerLen);
          const decision = stderrCollector.push(offered);
          if (!isValidDecision(decision, offered.byteLength)) {
            acceptTrigger('consumer-invalid');
            beginTermination();
            return;
          }
          accepted += decision.consumedBytes;
          offset += decision.consumedBytes;
          if (
            accepted === validRequest.maxStderrBytes &&
            offset < chunk.byteLength
          ) {
            acceptTrigger('stderr-limit');
            beginTermination();
            return;
          }
        }
      };

      const onStdout = (chunk: Buffer): void => offerStdout(chunk);
      const onStderr = (chunk: Buffer): void => offerStderr(chunk);
      const onAbort = (): void => {
        acceptTrigger('aborted');
        beginTermination();
      };
      const onChildSpawn = (): void => {
        spawned = true;
      };
      const onChildError = (error: unknown): void => {
        if (settled) {
          return;
        }
        if (!spawned) {
          settleStreaming(
            spawnFailureResult(classifySpawnFailureReasonV2(error)),
          );
          return;
        }
        if (triggerState.frozen !== undefined) {
          startHardKill();
          return;
        }
        cleanupFailed = true;
        finalizeAndSettle();
      };
      const onChildClose = (
        code: number | null,
        closeSignal: NodeJS.Signals | null,
      ): void => {
        try {
          if (settled) {
            return;
          }
          closeCandidate = {
            exitCode: code,
            signal: closeSignal,
          };
          // legal completed only when no primary and legal exit pair
          if (
            triggerState.frozen === undefined &&
            !isLegalCompletedExitPairV2(closeCandidate)
          ) {
            // process-exit path; still finalize
          }
          finalizeAndSettle();
        } finally {
          child.removeListener('error', onChildError);
        }
      };

      child.stdout.on('data', onStdout);
      child.stderr.on('data', onStderr);
      child.once('spawn', onChildSpawn);
      child.on('error', onChildError);
      child.once('close', onChildClose);
      signal.addEventListener('abort', onAbort, { once: true });
      if (signal.aborted) {
        acceptTrigger('aborted');
        beginTermination();
      }
      if (triggerState.frozen === undefined) {
        timeout = this.setTimeoutImpl(() => {
          acceptTrigger('timeout');
          beginTermination();
        }, validRequest.timeoutMs);
      }
    });
  }
}

/** 测试可见：当前 trigger state 形状。 */
export type { PrimaryTerminationTriggerStateV2 };
