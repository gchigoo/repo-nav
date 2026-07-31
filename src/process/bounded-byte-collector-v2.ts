import type {
  SafeStdoutConsumerDecisionV2,
  SafeStdoutConsumerFinalizationV2,
  SafeStdoutConsumerV2,
} from '../contracts/safe-process.js';

/**
 * buffered run() 的 stdout/stderr collector；N+1 语义由 kernel 在 offer 层执行，
 * collector 只接受已裁剪的 offered prefix。
 */
export class BoundedByteCollectorV2 implements SafeStdoutConsumerV2<
  Uint8Array,
  Uint8Array
> {
  private readonly chunks: Buffer[] = [];
  private acceptedBytes = 0;

  public push(bytes: Uint8Array): SafeStdoutConsumerDecisionV2 {
    if (bytes.byteLength === 0) {
      return { action: 'continue', consumedBytes: 0 };
    }
    this.chunks.push(Buffer.from(bytes));
    this.acceptedBytes += bytes.byteLength;
    return { action: 'continue', consumedBytes: bytes.byteLength };
  }

  public partial(): SafeStdoutConsumerFinalizationV2<Uint8Array> {
    return { ok: true, value: this.snapshot() };
  }

  public finish(): SafeStdoutConsumerFinalizationV2<Uint8Array> {
    return { ok: true, value: this.snapshot() };
  }

  public validatePartialValue(value: unknown): value is Uint8Array {
    return value instanceof Uint8Array;
  }

  public validateCompleteValue(value: unknown): value is Uint8Array {
    return value instanceof Uint8Array;
  }

  public byteLength(): number {
    return this.acceptedBytes;
  }

  private snapshot(): Uint8Array {
    if (this.chunks.length === 0) {
      return new Uint8Array();
    }
    return Buffer.concat(this.chunks, this.acceptedBytes);
  }
}
