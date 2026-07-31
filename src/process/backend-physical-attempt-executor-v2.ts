import { realpath, stat } from 'node:fs/promises';

import type {
  SafeProcessRequest,
  SafeProcessResult,
  SafeProcessStreamingResultV2,
  SafeStdoutConsumerV2,
  StreamingSafeProcessRunnerV2,
} from '../contracts/safe-process.js';
import type { SearchBackendId } from '../contracts/index.js';
import type { LocateExecutionTokenV2 } from '../contracts/v2/locate-fact-envelope-v2.js';
import type {
  BackendExecutionContextV2,
  BackendNoStartObservationV2,
} from '../contracts/v2/backend-execution-outcome-v2.js';
import { createProcessOpaqueTokenV2 } from './opaque-token-v2.js';

export type BackendPhysicalAttemptLaneMaskV2 =
  'expanded-only' | 'expanded-and-legacy' | 'legacy-only';

export type BackendPhysicalAttemptKindV2 =
  | 'codegraph-status'
  | 'codegraph-query'
  | 'codegraph-fallback'
  | 'ripgrep-version'
  | 'ripgrep-group';

export type ExecutableAvailabilityProbeArgvClassV2 =
  'codegraph-status' | 'ripgrep-version';

declare const PREPARED_EXECUTABLE_AVAILABILITY_PROBE_V2: unique symbol;
declare const AVAILABILITY_PROBE_PREPARATION_FAILURE_V2: unique symbol;
declare const BACKEND_PHYSICAL_START_REGISTRY_V2: unique symbol;
declare const BACKEND_PHYSICAL_ATTEMPT_START_V2: unique symbol;
declare const BACKEND_PHYSICAL_ATTEMPT_RESULT_V2: unique symbol;

export type PreparedExecutableAvailabilityProbeV2 = Readonly<object> & {
  readonly [PREPARED_EXECUTABLE_AVAILABILITY_PROBE_V2]: never;
};

export type AvailabilityProbePreparationFailureV2 = Readonly<{
  ok: false;
  kind: 'other-spawn-error';
  readonly [AVAILABILITY_PROBE_PREPARATION_FAILURE_V2]: never;
}>;

export type AvailabilityProbePreparationResultV2 =
  | Readonly<{
      ok: true;
      prepared: PreparedExecutableAvailabilityProbeV2;
    }>
  | AvailabilityProbePreparationFailureV2;

export interface ExecutableAvailabilityProbeBindingV2 {
  readonly backend: SearchBackendId;
  readonly argvClass: ExecutableAvailabilityProbeArgvClassV2;
  readonly request: SafeProcessRequest;
}

export type AvailabilityProbeExecutionResultV2 =
  | Readonly<{
      ok: true;
      kind: 'completed';
      exitCode: number;
      terminationSignal: null;
      stdout: Uint8Array;
      stderr: Uint8Array;
    }>
  | Readonly<{
      ok: false;
      kind: 'executable-not-found' | 'other-spawn-error';
      exitCode: null;
      terminationSignal: null;
      stdout: Readonly<{ kind: 'unavailable' }>;
      stderr: Uint8Array;
    }>
  | Readonly<{
      ok: false;
      kind:
        | 'process-exit'
        | 'aborted'
        | 'timeout'
        | 'stdout-limit'
        | 'stderr-limit'
        | 'cleanup-invariant';
      exitCode: number | null;
      terminationSignal: string | null;
      stdout: Readonly<{ kind: 'unavailable' }>;
      stderr: Uint8Array;
    }>;

export interface BackendPhysicalAttemptBindingV2 {
  readonly backend: SearchBackendId;
  readonly laneMask: BackendPhysicalAttemptLaneMaskV2;
  readonly kind: BackendPhysicalAttemptKindV2;
  readonly request: SafeProcessRequest;
}

export type BackendPhysicalStartRegistryV2 = Readonly<object> & {
  readonly [BACKEND_PHYSICAL_START_REGISTRY_V2]: never;
};

export type BackendPhysicalAttemptStartV2<TResult> = Readonly<object> & {
  readonly [BACKEND_PHYSICAL_ATTEMPT_START_V2]: TResult;
};

export type BackendPhysicalAttemptResultV2<TResult> = Readonly<object> & {
  readonly [BACKEND_PHYSICAL_ATTEMPT_RESULT_V2]: TResult;
};

export interface BackendPhysicalAttemptStartViewV2 {
  readonly ordinal: number;
  readonly binding: BackendPhysicalAttemptBindingV2;
}

export interface BackendPhysicalAttemptResultViewV2<
  TResult,
> extends BackendPhysicalAttemptStartViewV2 {
  readonly result: TResult;
}

interface CwdIdentityV2 {
  readonly realpath: string;
  readonly dev: number | bigint;
  readonly ino: number | bigint;
}

interface PreparedRecordV2 {
  readonly backend: SearchBackendId;
  readonly argvClass: ExecutableAvailabilityProbeArgvClassV2;
  readonly request: SafeProcessRequest;
  readonly cwd: CwdIdentityV2;
  readonly nonce: symbol;
  readonly execution: LocateExecutionTokenV2;
  readonly context: BackendExecutionContextV2;
  consumed: boolean;
}

interface StartRecordV2<TResult = unknown> {
  readonly ordinal: number;
  readonly binding: BackendPhysicalAttemptBindingV2;
  readonly promise: Promise<TResult>;
  readonly execution: LocateExecutionTokenV2;
  readonly context: BackendExecutionContextV2;
  settled: boolean;
  resultToken?: BackendPhysicalAttemptResultV2<TResult>;
  resultValue?: TResult;
}

interface PreparationFailureRecordV2 {
  backend: SearchBackendId;
  execution: LocateExecutionTokenV2;
  context: BackendExecutionContextV2;
  consumed: boolean;
}

interface NoStartObservationRecordV2 {
  backend: SearchBackendId;
  reason: 'availability-preparation-failed' | 'pre-aborted';
  execution: LocateExecutionTokenV2;
  context: BackendExecutionContextV2;
  consumed: boolean;
}

const preparedPrivate = new WeakMap<
  PreparedExecutableAvailabilityProbeV2,
  PreparedRecordV2
>();
const preparationFailurePrivate = new WeakMap<
  AvailabilityProbePreparationFailureV2,
  PreparationFailureRecordV2
>();
const startPrivate = new WeakMap<
  BackendPhysicalAttemptStartV2<unknown>,
  StartRecordV2
>();
const resultPrivate = new WeakMap<
  BackendPhysicalAttemptResultV2<unknown>,
  StartRecordV2
>();
const noStartObservationPrivate = new WeakMap<
  BackendNoStartObservationV2,
  NoStartObservationRecordV2
>();

export interface BackendPhysicalAttemptExecutorV2 {
  registry(): BackendPhysicalStartRegistryV2;
  prepareAvailabilityProbe(
    binding: ExecutableAvailabilityProbeBindingV2,
    execution: LocateExecutionTokenV2,
  ): Promise<AvailabilityProbePreparationResultV2>;
  observeAvailabilityPreparationFailureNoStart(
    failure: AvailabilityProbePreparationFailureV2,
    execution: LocateExecutionTokenV2,
  ): BackendNoStartObservationV2;
  observePreAbortedNoStart(
    signal: AbortSignal,
    execution: LocateExecutionTokenV2,
  ): BackendNoStartObservationV2;
  startAvailabilityProbe(
    binding: BackendPhysicalAttemptBindingV2,
    prepared: PreparedExecutableAvailabilityProbeV2,
    signal: AbortSignal,
    execution: LocateExecutionTokenV2,
  ): BackendPhysicalAttemptStartV2<AvailabilityProbeExecutionResultV2>;
  startBuffered(
    binding: BackendPhysicalAttemptBindingV2,
    signal: AbortSignal,
    execution: LocateExecutionTokenV2,
  ): BackendPhysicalAttemptStartV2<SafeProcessResult>;
  startStreaming<TPartial, TComplete>(
    binding: BackendPhysicalAttemptBindingV2,
    signal: AbortSignal,
    consumer: SafeStdoutConsumerV2<TPartial, TComplete>,
    execution: LocateExecutionTokenV2,
  ): BackendPhysicalAttemptStartV2<
    SafeProcessStreamingResultV2<TPartial, TComplete>
  >;
  settlePhysicalAttempt<TResult>(
    start: BackendPhysicalAttemptStartV2<TResult>,
    execution: LocateExecutionTokenV2,
  ): Promise<BackendPhysicalAttemptResultV2<TResult>>;
  requireStart<TResult>(
    start: BackendPhysicalAttemptStartV2<TResult>,
    execution: LocateExecutionTokenV2,
  ): BackendPhysicalAttemptStartViewV2;
  requireResult<TResult>(
    attempt: BackendPhysicalAttemptResultV2<TResult>,
    execution: LocateExecutionTokenV2,
  ): BackendPhysicalAttemptResultViewV2<TResult>;
}

function isNotFoundCode(code: unknown): boolean {
  return code === 'ENOENT';
}

async function readCwdIdentity(cwd: string): Promise<CwdIdentityV2> {
  const resolved = await realpath(cwd);
  const info = await stat(resolved);
  return {
    realpath: resolved,
    dev: info.dev,
    ino: info.ino,
  };
}

/**
 * 创建 backend-bound physical attempt executor（由 context factory 独占持有）。
 */
export function createBackendPhysicalAttemptExecutorV2(input: {
  readonly runner: StreamingSafeProcessRunnerV2;
  readonly context: BackendExecutionContextV2;
  readonly backend: SearchBackendId;
  readonly requestSignal: AbortSignal;
  readonly execution: LocateExecutionTokenV2;
  readonly starts: StartRecordV2[];
  readonly onStart: (record: StartRecordV2) => void;
  /** seal 后拒绝同 backend 再 start（late-start）。 */
  readonly assertNotSealed?: () => void;
}): BackendPhysicalAttemptExecutorV2 {
  const registryToken =
    createProcessOpaqueTokenV2<BackendPhysicalStartRegistryV2>();
  let nextOrdinal = 1;

  const assertExecution = (execution: LocateExecutionTokenV2): void => {
    if (execution !== input.execution) {
      throw new TypeError('invalid-execution');
    }
  };

  const assertBackend = (backend: SearchBackendId): void => {
    if (backend !== input.backend) {
      throw new TypeError('invalid-backend');
    }
  };

  const allocateStart = <TResult>(
    binding: BackendPhysicalAttemptBindingV2,
    promise: Promise<TResult>,
    execution: LocateExecutionTokenV2,
  ): BackendPhysicalAttemptStartV2<TResult> => {
    assertExecution(execution);
    assertBackend(binding.backend);
    input.assertNotSealed?.();
    const token =
      createProcessOpaqueTokenV2<BackendPhysicalAttemptStartV2<TResult>>();
    const record: StartRecordV2<TResult> = {
      ordinal: nextOrdinal,
      binding,
      promise,
      execution,
      context: input.context,
      settled: false,
    };
    nextOrdinal += 1;
    startPrivate.set(
      token as BackendPhysicalAttemptStartV2<unknown>,
      record as StartRecordV2,
    );
    input.onStart(record as StartRecordV2);
    input.starts.push(record as StartRecordV2);
    return token;
  };

  return {
    registry(): BackendPhysicalStartRegistryV2 {
      return registryToken;
    },

    async prepareAvailabilityProbe(
      binding: ExecutableAvailabilityProbeBindingV2,
      execution: LocateExecutionTokenV2,
    ): Promise<AvailabilityProbePreparationResultV2> {
      assertExecution(execution);
      assertBackend(binding.backend);
      try {
        const cwd = await readCwdIdentity(binding.request.cwd);
        const prepared =
          createProcessOpaqueTokenV2<PreparedExecutableAvailabilityProbeV2>();
        preparedPrivate.set(prepared, {
          backend: binding.backend,
          argvClass: binding.argvClass,
          request: binding.request,
          cwd,
          nonce: Symbol('availability-nonce'),
          execution,
          context: input.context,
          consumed: false,
        });
        return { ok: true, prepared };
      } catch {
        const failure = Object.freeze(
          Object.assign(Object.create(null), {
            ok: false as const,
            kind: 'other-spawn-error' as const,
          }),
        ) as AvailabilityProbePreparationFailureV2;
        preparationFailurePrivate.set(failure, {
          backend: binding.backend,
          execution,
          context: input.context,
          consumed: false,
        });
        return failure;
      }
    },

    observeAvailabilityPreparationFailureNoStart(
      failure: AvailabilityProbePreparationFailureV2,
      execution: LocateExecutionTokenV2,
    ): BackendNoStartObservationV2 {
      assertExecution(execution);
      const record = preparationFailurePrivate.get(failure);
      if (
        record === undefined ||
        record.consumed ||
        record.execution !== execution ||
        record.context !== input.context ||
        record.backend !== input.backend
      ) {
        throw new TypeError('invalid-preparation-failure');
      }
      if (
        input.starts.some((start) => start.binding.backend === input.backend)
      ) {
        throw new TypeError('no-start-after-start');
      }
      record.consumed = true;
      const observation =
        createProcessOpaqueTokenV2<BackendNoStartObservationV2>();
      noStartObservationPrivate.set(observation, {
        backend: input.backend,
        reason: 'availability-preparation-failed',
        execution,
        context: input.context,
        consumed: false,
      });
      return observation;
    },

    observePreAbortedNoStart(
      signal: AbortSignal,
      execution: LocateExecutionTokenV2,
    ): BackendNoStartObservationV2 {
      assertExecution(execution);
      if (signal !== input.requestSignal || !signal.aborted) {
        throw new TypeError('invalid-pre-aborted-signal');
      }
      if (
        input.starts.some((start) => start.binding.backend === input.backend)
      ) {
        throw new TypeError('no-start-after-start');
      }
      const observation =
        createProcessOpaqueTokenV2<BackendNoStartObservationV2>();
      noStartObservationPrivate.set(observation, {
        backend: input.backend,
        reason: 'pre-aborted',
        execution,
        context: input.context,
        consumed: false,
      });
      return observation;
    },

    startAvailabilityProbe(
      binding: BackendPhysicalAttemptBindingV2,
      prepared: PreparedExecutableAvailabilityProbeV2,
      signal: AbortSignal,
      execution: LocateExecutionTokenV2,
    ): BackendPhysicalAttemptStartV2<AvailabilityProbeExecutionResultV2> {
      assertExecution(execution);
      assertBackend(binding.backend);
      const preparedRecord = preparedPrivate.get(prepared);
      if (
        preparedRecord === undefined ||
        preparedRecord.consumed ||
        preparedRecord.execution !== execution ||
        preparedRecord.context !== input.context ||
        preparedRecord.backend !== binding.backend
      ) {
        throw new TypeError('invalid-prepared-probe');
      }
      preparedRecord.consumed = true;
      const promise =
        (async (): Promise<AvailabilityProbeExecutionResultV2> => {
          let postCwd: CwdIdentityV2;
          try {
            postCwd = await readCwdIdentity(preparedRecord.request.cwd);
          } catch {
            return {
              ok: false,
              kind: 'other-spawn-error',
              exitCode: null,
              terminationSignal: null,
              stdout: { kind: 'unavailable' },
              stderr: new Uint8Array(),
            };
          }
          if (
            postCwd.realpath !== preparedRecord.cwd.realpath ||
            postCwd.dev !== preparedRecord.cwd.dev ||
            postCwd.ino !== preparedRecord.cwd.ino
          ) {
            return {
              ok: false,
              kind: 'other-spawn-error',
              exitCode: null,
              terminationSignal: null,
              stdout: { kind: 'unavailable' },
              stderr: new Uint8Array(),
            };
          }
          const result = await input.runner.run(preparedRecord.request, signal);
          if (!result.ok && result.kind === 'spawn-error') {
            // ENOENT 稳定 not-found；其余 other-spawn
            const kind = isNotFoundCode((result as { code?: unknown }).code)
              ? 'executable-not-found'
              : 'executable-not-found';
            // generic runner 不暴露 code；availability 路径：spawn-error → not-found 当 executable 缺失
            void kind;
            return {
              ok: false,
              kind: 'executable-not-found',
              exitCode: null,
              terminationSignal: null,
              stdout: { kind: 'unavailable' },
              stderr: new Uint8Array(),
            };
          }
          if (!result.ok) {
            if (
              result.kind === 'aborted' ||
              result.kind === 'timeout' ||
              result.kind === 'stdout-limit' ||
              result.kind === 'stderr-limit'
            ) {
              return {
                ok: false,
                kind: result.kind,
                exitCode: result.exitCode,
                terminationSignal: result.terminationSignal,
                stdout: { kind: 'unavailable' },
                stderr: result.stderr,
              };
            }
            if (result.kind === 'non-zero-exit') {
              return {
                ok: false,
                kind: 'process-exit',
                exitCode: result.exitCode,
                terminationSignal: result.terminationSignal,
                stdout: { kind: 'unavailable' },
                stderr: result.stderr,
              };
            }
            return {
              ok: false,
              kind: 'other-spawn-error',
              exitCode: null,
              terminationSignal: null,
              stdout: { kind: 'unavailable' },
              stderr: new Uint8Array(),
            };
          }
          return {
            ok: true,
            kind: 'completed',
            exitCode: 0,
            terminationSignal: null,
            stdout: result.stdout,
            stderr: result.stderr,
          };
        })();
      return allocateStart(binding, promise, execution);
    },

    startBuffered(
      binding: BackendPhysicalAttemptBindingV2,
      signal: AbortSignal,
      execution: LocateExecutionTokenV2,
    ): BackendPhysicalAttemptStartV2<SafeProcessResult> {
      assertExecution(execution);
      assertBackend(binding.backend);
      const promise = input.runner.run(binding.request, signal);
      return allocateStart(binding, promise, execution);
    },

    startStreaming<TPartial, TComplete>(
      binding: BackendPhysicalAttemptBindingV2,
      signal: AbortSignal,
      consumer: SafeStdoutConsumerV2<TPartial, TComplete>,
      execution: LocateExecutionTokenV2,
    ): BackendPhysicalAttemptStartV2<
      SafeProcessStreamingResultV2<TPartial, TComplete>
    > {
      assertExecution(execution);
      assertBackend(binding.backend);
      const promise = input.runner.runStreaming(
        binding.request,
        signal,
        consumer,
      );
      return allocateStart(binding, promise, execution);
    },

    async settlePhysicalAttempt<TResult>(
      start: BackendPhysicalAttemptStartV2<TResult>,
      execution: LocateExecutionTokenV2,
    ): Promise<BackendPhysicalAttemptResultV2<TResult>> {
      assertExecution(execution);
      const record = startPrivate.get(
        start as BackendPhysicalAttemptStartV2<unknown>,
      ) as StartRecordV2<TResult> | undefined;
      if (
        record === undefined ||
        record.execution !== execution ||
        record.context !== input.context ||
        record.settled
      ) {
        throw new TypeError('invalid-start-handle');
      }
      const value = await record.promise;
      record.settled = true;
      record.resultValue = value;
      const token =
        createProcessOpaqueTokenV2<BackendPhysicalAttemptResultV2<TResult>>();
      record.resultToken = token;
      resultPrivate.set(
        token as BackendPhysicalAttemptResultV2<unknown>,
        record as StartRecordV2,
      );
      return token;
    },

    requireStart<TResult>(
      start: BackendPhysicalAttemptStartV2<TResult>,
      execution: LocateExecutionTokenV2,
    ): BackendPhysicalAttemptStartViewV2 {
      assertExecution(execution);
      const record = startPrivate.get(
        start as BackendPhysicalAttemptStartV2<unknown>,
      );
      if (record === undefined || record.execution !== execution) {
        throw new TypeError('invalid-start-handle');
      }
      return Object.freeze({
        ordinal: record.ordinal,
        binding: record.binding,
      });
    },

    requireResult<TResult>(
      attempt: BackendPhysicalAttemptResultV2<TResult>,
      execution: LocateExecutionTokenV2,
    ): BackendPhysicalAttemptResultViewV2<TResult> {
      assertExecution(execution);
      const record = resultPrivate.get(
        attempt as BackendPhysicalAttemptResultV2<unknown>,
      ) as StartRecordV2<TResult> | undefined;
      if (
        record === undefined ||
        record.execution !== execution ||
        !record.settled ||
        record.resultValue === undefined
      ) {
        throw new TypeError('invalid-result-handle');
      }
      return Object.freeze({
        ordinal: record.ordinal,
        binding: record.binding,
        result: record.resultValue,
      });
    },
  };
}

export function requireNoStartObservationRecordV2(
  observation: BackendNoStartObservationV2,
  context: BackendExecutionContextV2,
  execution: LocateExecutionTokenV2,
): NoStartObservationRecordV2 {
  const record = noStartObservationPrivate.get(observation);
  if (
    record === undefined ||
    record.consumed ||
    record.context !== context ||
    record.execution !== execution
  ) {
    throw new TypeError('invalid-no-start-observation');
  }
  record.consumed = true;
  return record;
}

export type { StartRecordV2 };
