/**
 * ripgrep JSON Lines 协议 FSM：begin/match/context/end/summary。
 * production allowContext=false；任一违规 → invalid。
 */

export type RipgrepEventTypeV2 =
  | 'begin'
  | 'match'
  | 'context'
  | 'end'
  | 'summary';

export interface RipgrepParsedPathV2 {
  readonly text: string;
}

export interface RipgrepSubmatchV2 {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export interface RipgrepMatchEventV2 {
  readonly type: 'match';
  readonly path: string;
  readonly lineNumber: number;
  readonly lineText: string;
  readonly absoluteOffset: number;
  readonly submatches: readonly RipgrepSubmatchV2[];
}

export interface RipgrepBeginEventV2 {
  readonly type: 'begin';
  readonly path: string;
}

export interface RipgrepEndEventV2 {
  readonly type: 'end';
  readonly path: string;
}

export interface RipgrepContextEventV2 {
  readonly type: 'context';
  readonly path: string;
  readonly lineNumber: number;
  readonly lineText: string;
}

export interface RipgrepSummaryStatsV2 {
  readonly searches: number;
  readonly searchesWithMatch: number;
  readonly matchedLines: number;
  readonly matches: number;
}

export interface RipgrepSummaryEventV2 {
  readonly type: 'summary';
  readonly stats: RipgrepSummaryStatsV2;
}

export type RipgrepProtocolEventV2 =
  | RipgrepBeginEventV2
  | RipgrepMatchEventV2
  | RipgrepContextEventV2
  | RipgrepEndEventV2
  | RipgrepSummaryEventV2;

export interface RipgrepProtocolFsmConfigV2 {
  readonly allowContext: boolean;
}

export type RipgrepProtocolPushResultV2 =
  | Readonly<{ kind: 'ok'; event: RipgrepProtocolEventV2 }>
  | Readonly<{ kind: 'invalid' }>;

export type RipgrepProtocolFinishResultV2 =
  | Readonly<{
      kind: 'ok';
      stats: RipgrepSummaryStatsV2;
      matchCount: number;
      scopeCount: number;
      submatchCount: number;
    }>
  | Readonly<{ kind: 'invalid' }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function nestedText(value: unknown): string | undefined {
  return isRecord(value) && typeof value['text'] === 'string'
    ? value['text']
    : undefined;
}

function isNonnegSafeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveSafeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
}

function utf8ByteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}

function sliceUtf8ByByteOffset(
  text: string,
  start: number,
  end: number,
): string | undefined {
  const encoded = Buffer.from(text, 'utf8');
  if (start < 0 || end < start || end > encoded.byteLength) {
    return undefined;
  }
  try {
    return encoded.subarray(start, end).toString('utf8');
  } catch {
    return undefined;
  }
}

/**
 * 严格协议状态机。
 */
export class RipgrepProtocolFsmV2 {
  private readonly allowContext: boolean;
  private openPath: string | undefined;
  private matchesInOpenScope = 0;
  private summary: RipgrepSummaryStatsV2 | undefined;
  private completedScopes = 0;
  private matchedScopes = 0;
  private matchEvents = 0;
  private submatchCount = 0;
  private afterSummary = false;

  public constructor(config: RipgrepProtocolFsmConfigV2) {
    this.allowContext = config.allowContext;
  }

  public pushJsonLine(lineText: string): RipgrepProtocolPushResultV2 {
    if (this.afterSummary) {
      return { kind: 'invalid' };
    }
    if (lineText.length === 0) {
      return { kind: 'invalid' };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(lineText) as unknown;
    } catch {
      return { kind: 'invalid' };
    }
    if (!isRecord(parsed) || typeof parsed['type'] !== 'string' || !isRecord(parsed['data'])) {
      return { kind: 'invalid' };
    }
    const type = parsed['type'];
    const data = parsed['data'];
    switch (type) {
      case 'begin':
        return this.onBegin(data);
      case 'match':
        return this.onMatch(data);
      case 'context':
        return this.onContext(data);
      case 'end':
        return this.onEnd(data);
      case 'summary':
        return this.onSummary(data);
      default:
        return { kind: 'invalid' };
    }
  }

  public finish(): RipgrepProtocolFinishResultV2 {
    if (
      this.openPath !== undefined ||
      this.summary === undefined ||
      !this.afterSummary
    ) {
      return { kind: 'invalid' };
    }
    const stats = this.summary;
    if (
      stats.searches < this.completedScopes ||
      stats.searchesWithMatch !== this.matchedScopes ||
      stats.matchedLines !== this.matchEvents ||
      stats.matches !== this.submatchCount
    ) {
      return { kind: 'invalid' };
    }
    if (
      this.matchEvents === 0 &&
      (this.completedScopes !== 0 ||
        stats.searchesWithMatch !== 0 ||
        stats.matchedLines !== 0 ||
        stats.matches !== 0)
    ) {
      return { kind: 'invalid' };
    }
    return {
      kind: 'ok',
      stats,
      matchCount: this.matchEvents,
      scopeCount: this.completedScopes,
      submatchCount: this.submatchCount,
    };
  }

  private onBegin(data: Record<string, unknown>): RipgrepProtocolPushResultV2 {
    if (this.openPath !== undefined || this.summary !== undefined) {
      return { kind: 'invalid' };
    }
    const path = nestedText(data['path']);
    if (path === undefined) {
      return { kind: 'invalid' };
    }
    this.openPath = path;
    this.matchesInOpenScope = 0;
    return { kind: 'ok', event: { type: 'begin', path } };
  }

  private onMatch(data: Record<string, unknown>): RipgrepProtocolPushResultV2 {
    if (this.openPath === undefined || this.summary !== undefined) {
      return { kind: 'invalid' };
    }
    const path = nestedText(data['path']);
    const lineText = nestedText(data['lines']);
    const lineNumber = data['line_number'];
    const absoluteOffset = data['absolute_offset'];
    const rawSubmatches = data['submatches'];
    if (
      path === undefined ||
      path !== this.openPath ||
      lineText === undefined ||
      !isPositiveSafeInt(lineNumber) ||
      !isNonnegSafeInt(absoluteOffset) ||
      !Array.isArray(rawSubmatches) ||
      rawSubmatches.length === 0
    ) {
      return { kind: 'invalid' };
    }
    const lineBytes = utf8ByteLength(lineText);
    const submatches: RipgrepSubmatchV2[] = [];
    for (const raw of rawSubmatches) {
      if (!isRecord(raw)) {
        return { kind: 'invalid' };
      }
      const matchText = nestedText(raw['match']);
      const start = raw['start'];
      const end = raw['end'];
      if (
        matchText === undefined ||
        !isNonnegSafeInt(start) ||
        !isNonnegSafeInt(end) ||
        !(start < end && end <= lineBytes)
      ) {
        return { kind: 'invalid' };
      }
      const sliced = sliceUtf8ByByteOffset(lineText, start, end);
      if (sliced === undefined || sliced !== matchText) {
        return { kind: 'invalid' };
      }
      submatches.push({ text: matchText, start, end });
    }
    this.matchesInOpenScope += 1;
    this.matchEvents += 1;
    this.submatchCount += submatches.length;
    return {
      kind: 'ok',
      event: {
        type: 'match',
        path,
        lineNumber,
        lineText: lineText.replace(/[\r\n]+$/u, ''),
        absoluteOffset,
        submatches: Object.freeze(submatches),
      },
    };
  }

  private onContext(data: Record<string, unknown>): RipgrepProtocolPushResultV2 {
    if (!this.allowContext) {
      return { kind: 'invalid' };
    }
    if (
      this.openPath === undefined ||
      this.matchesInOpenScope < 1 ||
      this.summary !== undefined
    ) {
      return { kind: 'invalid' };
    }
    const path = nestedText(data['path']);
    const lineText = nestedText(data['lines']);
    const lineNumber = data['line_number'];
    if (
      path === undefined ||
      path !== this.openPath ||
      lineText === undefined ||
      !isPositiveSafeInt(lineNumber)
    ) {
      return { kind: 'invalid' };
    }
    return {
      kind: 'ok',
      event: {
        type: 'context',
        path,
        lineNumber,
        lineText: lineText.replace(/[\r\n]+$/u, ''),
      },
    };
  }

  private onEnd(data: Record<string, unknown>): RipgrepProtocolPushResultV2 {
    if (this.openPath === undefined || this.summary !== undefined) {
      return { kind: 'invalid' };
    }
    const path = nestedText(data['path']);
    if (path === undefined || path !== this.openPath) {
      return { kind: 'invalid' };
    }
    if (this.matchesInOpenScope < 1) {
      return { kind: 'invalid' };
    }
    this.completedScopes += 1;
    this.matchedScopes += 1;
    this.openPath = undefined;
    this.matchesInOpenScope = 0;
    return { kind: 'ok', event: { type: 'end', path } };
  }

  private onSummary(data: Record<string, unknown>): RipgrepProtocolPushResultV2 {
    if (this.openPath !== undefined || this.summary !== undefined) {
      return { kind: 'invalid' };
    }
    const statsRaw = data['stats'];
    if (!isRecord(statsRaw)) {
      return { kind: 'invalid' };
    }
    const searches = statsRaw['searches'];
    const searchesWithMatch = statsRaw['searches_with_match'];
    const matchedLines = statsRaw['matched_lines'];
    const matches = statsRaw['matches'];
    if (
      !isNonnegSafeInt(searches) ||
      !isNonnegSafeInt(searchesWithMatch) ||
      !isNonnegSafeInt(matchedLines) ||
      !isNonnegSafeInt(matches)
    ) {
      return { kind: 'invalid' };
    }
    this.summary = {
      searches,
      searchesWithMatch,
      matchedLines,
      matches,
    };
    this.afterSummary = true;
    return {
      kind: 'ok',
      event: { type: 'summary', stats: this.summary },
    };
  }
}
