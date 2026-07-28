import type {
  SafeStdoutConsumerDecisionV2,
  SafeStdoutConsumerFinalizationV2,
  SafeStdoutConsumerV2,
} from '../../contracts/safe-process.js';
import { LineFramerV2 } from './line-framer-v2.js';
import {
  RipgrepProtocolFsmV2,
  type RipgrepMatchEventV2,
  type RipgrepProtocolFsmConfigV2,
  type RipgrepSummaryStatsV2,
} from './ripgrep-protocol-fsm-v2.js';

export interface RipgrepJsonConsumerCompleteV2 {
  readonly matches: readonly RipgrepMatchEventV2[];
  readonly stats: RipgrepSummaryStatsV2;
  readonly matchCount: number;
  readonly scopeCount: number;
  readonly submatchCount: number;
}

export interface RipgrepJsonConsumerPartialV2 {
  readonly matches: readonly RipgrepMatchEventV2[];
  readonly matchCount: number;
}

export interface RipgrepJsonLineConsumerOptionsV2 {
  readonly allowContext: boolean;
  readonly onMatch?: (match: RipgrepMatchEventV2) => 'continue' | 'stop';
}

/**
 * 同步 ripgrep JSON Lines consumer：framer + fatal UTF-8 + FSM。
 */
export class RipgrepJsonLineConsumerV2
  implements
    SafeStdoutConsumerV2<
      RipgrepJsonConsumerPartialV2,
      RipgrepJsonConsumerCompleteV2
    >
{
  private readonly framer = new LineFramerV2();
  private readonly fsm: RipgrepProtocolFsmV2;
  private readonly onMatch:
    | ((match: RipgrepMatchEventV2) => 'continue' | 'stop')
    | undefined;
  private readonly matches: RipgrepMatchEventV2[] = [];
  private invalid = false;
  private decoder = new TextDecoder('utf-8', { fatal: true });

  public constructor(options: RipgrepJsonLineConsumerOptionsV2) {
    const config: RipgrepProtocolFsmConfigV2 = {
      allowContext: options.allowContext,
    };
    this.fsm = new RipgrepProtocolFsmV2(config);
    this.onMatch = options.onMatch;
  }

  public push(bytes: Uint8Array): SafeStdoutConsumerDecisionV2 {
    if (this.invalid || bytes.byteLength === 0) {
      return { action: 'continue', consumedBytes: bytes.byteLength };
    }
    const framed = this.framer.push(bytes);
    if (framed.kind === 'invalid') {
      this.invalid = true;
      return { action: 'stop', consumedBytes: 1 };
    }
    for (const lineBytes of framed.lines) {
      let text: string;
      try {
        text = this.decoder.decode(lineBytes);
      } catch {
        this.invalid = true;
        return { action: 'stop', consumedBytes: Math.max(1, bytes.byteLength) };
      }
      const result = this.fsm.pushJsonLine(text);
      if (result.kind === 'invalid') {
        this.invalid = true;
        return { action: 'stop', consumedBytes: Math.max(1, bytes.byteLength) };
      }
      if (result.event.type === 'match') {
        this.matches.push(result.event);
        if (this.onMatch?.(result.event) === 'stop') {
          return {
            action: 'stop',
            consumedBytes: Math.max(1, bytes.byteLength),
          };
        }
      }
    }
    return { action: 'continue', consumedBytes: bytes.byteLength };
  }

  public partial(): SafeStdoutConsumerFinalizationV2<RipgrepJsonConsumerPartialV2> {
    if (this.invalid) {
      return { ok: false, kind: 'consumer-invalid' };
    }
    return {
      ok: true,
      value: Object.freeze({
        matches: Object.freeze([...this.matches]),
        matchCount: this.matches.length,
      }),
    };
  }

  public finish(): SafeStdoutConsumerFinalizationV2<RipgrepJsonConsumerCompleteV2> {
    if (this.invalid) {
      return { ok: false, kind: 'consumer-invalid' };
    }
    try {
      this.decoder.decode();
    } catch {
      return { ok: false, kind: 'consumer-invalid' };
    }
    const framed = this.framer.finish();
    if (framed.kind === 'invalid') {
      return { ok: false, kind: 'consumer-invalid' };
    }
    const finished = this.fsm.finish();
    if (finished.kind === 'invalid') {
      return { ok: false, kind: 'consumer-invalid' };
    }
    return {
      ok: true,
      value: Object.freeze({
        matches: Object.freeze([...this.matches]),
        stats: finished.stats,
        matchCount: finished.matchCount,
        scopeCount: finished.scopeCount,
        submatchCount: finished.submatchCount,
      }),
    };
  }

  public validatePartialValue(
    value: unknown,
  ): value is RipgrepJsonConsumerPartialV2 {
    return (
      typeof value === 'object' &&
      value !== null &&
      'matches' in value &&
      'matchCount' in value &&
      Array.isArray((value as { matches: unknown }).matches) &&
      typeof (value as { matchCount: unknown }).matchCount === 'number'
    );
  }

  public validateCompleteValue(
    value: unknown,
  ): value is RipgrepJsonConsumerCompleteV2 {
    return (
      typeof value === 'object' &&
      value !== null &&
      'matches' in value &&
      'stats' in value &&
      'matchCount' in value &&
      'scopeCount' in value &&
      'submatchCount' in value
    );
  }
}
