import type {
  SafeStdoutConsumerDecisionV2,
  SafeStdoutConsumerFinalizationV2,
  SafeStdoutConsumerV2,
} from '../../../src/contracts/safe-process.js';

export type HostileConsumerModeV2 =
  | 'continue-full'
  | 'stop-partial'
  | 'continue-zero'
  | 'stop-zero'
  | 'nan-consumed'
  | 'throw-push'
  | 'finish-promise'
  | 'finish-ok'
  | 'partial-ok'
  | 'partial-invalid';

/**
 * Hostile consumer fixture：覆盖 progress / finalizer 契约。
 */
export class HostileConsumerV2
  implements SafeStdoutConsumerV2<Uint8Array, Uint8Array>
{
  public pushCount = 0;
  public partialCount = 0;
  public finishCount = 0;
  private readonly chunks: Buffer[] = [];

  public constructor(private readonly mode: HostileConsumerModeV2) {}

  public push(bytes: Uint8Array): SafeStdoutConsumerDecisionV2 {
    this.pushCount += 1;
    if (this.mode === 'throw-push') {
      throw new Error('hostile-push');
    }
    if (this.mode === 'nan-consumed') {
      return { action: 'continue', consumedBytes: Number.NaN };
    }
    if (this.mode === 'continue-zero') {
      return { action: 'continue', consumedBytes: 0 };
    }
    if (this.mode === 'stop-zero') {
      return { action: 'stop', consumedBytes: 0 };
    }
    if (this.mode === 'stop-partial' && bytes.byteLength > 1) {
      this.chunks.push(Buffer.from(bytes.subarray(0, 1)));
      return { action: 'stop', consumedBytes: 1 };
    }
    this.chunks.push(Buffer.from(bytes));
    return { action: 'continue', consumedBytes: bytes.byteLength };
  }

  public partial(): SafeStdoutConsumerFinalizationV2<Uint8Array> {
    this.partialCount += 1;
    if (this.mode === 'partial-invalid') {
      return { ok: false, kind: 'consumer-invalid' };
    }
    return { ok: true, value: Buffer.concat(this.chunks) };
  }

  public finish(): SafeStdoutConsumerFinalizationV2<Uint8Array> {
    this.finishCount += 1;
    if (this.mode === 'finish-promise') {
      return Promise.resolve({
        ok: true,
        value: Buffer.concat(this.chunks),
      }) as unknown as SafeStdoutConsumerFinalizationV2<Uint8Array>;
    }
    return { ok: true, value: Buffer.concat(this.chunks) };
  }

  public validatePartialValue(value: unknown): value is Uint8Array {
    return value instanceof Uint8Array;
  }

  public validateCompleteValue(value: unknown): value is Uint8Array {
    return value instanceof Uint8Array;
  }
}
