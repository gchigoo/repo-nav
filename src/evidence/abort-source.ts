export const LOCATE_ABORT_SOURCES = Object.freeze([
  'none',
  'caller',
  'deadline',
] as const);

export type LocateAbortSource = (typeof LOCATE_ABORT_SOURCES)[number];

type TriggeredLocateAbortSource = Exclude<LocateAbortSource, 'none'>;

declare const FINALIZED_ABORT_DECISION_V2: unique symbol;
/**
 * closeFinalization 签发的无 own-property token；绑定冻结 abort source。
 */
export type FinalizedAbortDecisionV2 = Readonly<object> & {
  readonly [FINALIZED_ABORT_DECISION_V2]: never;
};

interface FinalizedAbortRecordV2 {
  readonly source: LocateAbortSource;
  readonly coordinator: LocateAbortCoordinatorV2;
}

const finalizedAbortPrivate = new WeakMap<
  FinalizedAbortDecisionV2,
  FinalizedAbortRecordV2
>();

export interface LocateAbortSchedulerV2 {
  readonly setTimeout: typeof setTimeout;
  readonly clearTimeout: typeof clearTimeout;
}

export interface LocateAbortCoordinatorV2 {
  readonly signal: AbortSignal;
  /** open 态读取 live source；close/dispose 后失败。 */
  peekSource(): LocateAbortSource;
  /** close 后仍可读冻结 source；dispose 后失败。 */
  recordedSource(): LocateAbortSource;
  abort(source: TriggeredLocateAbortSource, reason?: unknown): boolean;
  closeFinalization(): FinalizedAbortDecisionV2;
  dispose(): void;
}

type CoordinatorStateV2 = 'open' | 'closed' | 'disposed';

class LocateAbortCoordinatorV2Impl implements LocateAbortCoordinatorV2 {
  private readonly controller = new AbortController();
  private currentSource: LocateAbortSource = 'none';
  private state: CoordinatorStateV2 = 'open';
  private readonly callerSignal: AbortSignal;
  private readonly onCallerAbort: () => void;
  private deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly scheduler: LocateAbortSchedulerV2;
  private finalized: FinalizedAbortDecisionV2 | undefined;

  private constructor(
    callerSignal: AbortSignal,
    timeoutMs: number,
    scheduler: LocateAbortSchedulerV2,
  ) {
    this.callerSignal = callerSignal;
    this.scheduler = scheduler;
    this.onCallerAbort = () => {
      this.abort('caller', callerSignal.reason);
    };
    if (callerSignal.aborted) {
      this.abort('caller', callerSignal.reason);
    } else {
      callerSignal.addEventListener('abort', this.onCallerAbort);
    }
    this.deadlineTimer = scheduler.setTimeout(() => {
      this.deadlineTimer = undefined;
      this.abort(
        'deadline',
        new Error('Repository evidence deadline reached.'),
      );
    }, timeoutMs);
    if (typeof this.deadlineTimer === 'object' && this.deadlineTimer !== null) {
      const timer = this.deadlineTimer as { unref?: () => void };
      timer.unref?.();
    }
  }

  public static create(
    callerSignal: AbortSignal,
    timeoutMs: number,
    scheduler: LocateAbortSchedulerV2 = {
      setTimeout,
      clearTimeout,
    },
  ): LocateAbortCoordinatorV2 {
    if (
      typeof timeoutMs !== 'number' ||
      !Number.isSafeInteger(timeoutMs) ||
      timeoutMs < 1
    ) {
      throw new TypeError('timeoutMs must be a positive safe integer');
    }
    return new LocateAbortCoordinatorV2Impl(callerSignal, timeoutMs, scheduler);
  }

  public get signal(): AbortSignal {
    return this.controller.signal;
  }

  public peekSource(): LocateAbortSource {
    if (this.state !== 'open') {
      throw new TypeError('live abort source is unavailable after close');
    }
    return this.currentSource;
  }

  /**
   * Read the latched abort source after closeFinalization (still fails after dispose).
   */
  public recordedSource(): LocateAbortSource {
    if (this.state === 'disposed') {
      throw new TypeError('recorded abort source is unavailable after dispose');
    }
    return this.currentSource;
  }

  public abort(source: TriggeredLocateAbortSource, reason?: unknown): boolean {
    if (this.state !== 'open') {
      return false;
    }
    if (this.currentSource !== 'none') {
      return false;
    }
    this.currentSource = source;
    this.controller.abort(reason);
    return true;
  }

  public closeFinalization(): FinalizedAbortDecisionV2 {
    if (this.finalized !== undefined) {
      return this.finalized;
    }
    if (this.state !== 'open') {
      throw new TypeError('finalization latch already closed');
    }
    this.clearDeadlineTimer();
    this.removeCallerListener();
    this.state = 'closed';
    const token = Object.freeze({}) as FinalizedAbortDecisionV2;
    finalizedAbortPrivate.set(
      token,
      Object.freeze({
        source: this.currentSource,
        coordinator: this,
      }),
    );
    this.finalized = token;
    return token;
  }

  public dispose(): void {
    if (this.state === 'disposed') {
      return;
    }
    this.clearDeadlineTimer();
    this.removeCallerListener();
    this.state = 'disposed';
  }

  private clearDeadlineTimer(): void {
    if (this.deadlineTimer !== undefined) {
      this.scheduler.clearTimeout(this.deadlineTimer);
      this.deadlineTimer = undefined;
    }
  }

  private removeCallerListener(): void {
    this.callerSignal.removeEventListener('abort', this.onCallerAbort);
  }
}

export const LocateAbortCoordinatorV2 = {
  create: LocateAbortCoordinatorV2Impl.create,
};

/**
 * 读取 close token 冻结的 abort source；forged/cross-execution 拒绝。
 */
export function requireFinalizedAbortDecisionV2(
  decision: FinalizedAbortDecisionV2,
  expectedCoordinator: LocateAbortCoordinatorV2,
): LocateAbortSource {
  const record = finalizedAbortPrivate.get(decision);
  if (record === undefined || record.coordinator !== expectedCoordinator) {
    throw new TypeError('finalized abort decision is not trusted');
  }
  return record.source;
}

/**
 * Owns the composed request signal and permanently records the first abort
 * source. Legacy v1 helper retained for transitional engine paths.
 */
export class LocateAbortCoordinator {
  private readonly controller = new AbortController();
  private currentSource: LocateAbortSource = 'none';

  public get signal(): AbortSignal {
    return this.controller.signal;
  }

  public get source(): LocateAbortSource {
    return this.currentSource;
  }

  public abort(source: TriggeredLocateAbortSource, reason?: unknown): boolean {
    if (this.currentSource !== 'none') {
      return false;
    }
    this.currentSource = source;
    this.controller.abort(reason);
    return true;
  }
}
