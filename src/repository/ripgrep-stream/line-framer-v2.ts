/**
 * Raw LF line framer：pending CR 单 byte slot、payload 内 raw CR invalid、maxLineBytes 上限。
 */

export const RIPGREP_MAX_LINE_BYTES_V2 = 1_048_576;

export type LineFramerPushResultV2 =
  | Readonly<{ kind: 'continue'; lines: readonly Uint8Array[] }>
  | Readonly<{ kind: 'invalid' }>;

export type LineFramerFinishResultV2 =
  Readonly<{ kind: 'ok' }> | Readonly<{ kind: 'invalid' }>;

/**
 * 按 raw LF 切分；剥离紧邻 LF 的单个 CR；不先转 string。
 */
export class LineFramerV2 {
  private readonly maxLineBytes: number;
  private pending: number[] = [];
  private pendingCr = false;

  public constructor(maxLineBytes: number = RIPGREP_MAX_LINE_BYTES_V2) {
    this.maxLineBytes = maxLineBytes;
  }

  public push(bytes: Uint8Array): LineFramerPushResultV2 {
    const lines: Uint8Array[] = [];
    for (let index = 0; index < bytes.byteLength; index += 1) {
      const byte = bytes[index]!;
      if (this.pendingCr) {
        this.pendingCr = false;
        if (byte === 0x0a) {
          // CRLF：丢弃 pending CR，结束 line
          const line = Uint8Array.from(this.pending);
          this.pending = [];
          lines.push(line);
          continue;
        }
        // 孤立 CR 进入 payload → 显式 invalid
        return { kind: 'invalid' };
      }
      if (byte === 0x0d) {
        this.pendingCr = true;
        continue;
      }
      if (byte === 0x0a) {
        const line = Uint8Array.from(this.pending);
        this.pending = [];
        lines.push(line);
        continue;
      }
      // payload 内 raw CR 已通过 pending 路径处理；此处其余 byte
      if (this.pending.length >= this.maxLineBytes) {
        return { kind: 'invalid' };
      }
      this.pending.push(byte);
    }
    return { kind: 'continue', lines: Object.freeze(lines) };
  }

  /**
   * 自然结束：pending CR 或非空未终止 line 均为 invalid。
   */
  public finish(): LineFramerFinishResultV2 {
    if (this.pendingCr || this.pending.length > 0) {
      return { kind: 'invalid' };
    }
    return { kind: 'ok' };
  }

  public pendingByteLength(): number {
    return this.pending.length + (this.pendingCr ? 1 : 0);
  }
}
