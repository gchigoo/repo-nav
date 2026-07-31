import {
  REDACTION_REASON_CODES_V2,
  TOKEN_PLACEHOLDER_V2,
  orderedReasons,
  type RedactionReasonCodeV2,
  type SensitiveSpanV2,
} from './sensitive-value-contract-v2.js';

export class SpanContractViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpanContractViolationError';
  }
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}

export function isCodePointBoundary(value: string, index: number): boolean {
  if (index < 0 || index > value.length) {
    return false;
  }
  if (index === 0 || index === value.length) {
    return true;
  }
  return !(
    isHighSurrogate(value.charCodeAt(index - 1)) &&
    isLowSurrogate(value.charCodeAt(index))
  );
}

export function expandCrlfSpan(
  value: string,
  start: number,
  end: number,
): { readonly start: number; readonly end: number } {
  let nextStart = start;
  let nextEnd = end;
  if (nextStart > 0 && value.startsWith('\r\n', nextStart - 1)) {
    nextStart -= 1;
  }
  if (nextEnd < value.length && value.startsWith('\r\n', nextEnd - 1)) {
    nextEnd += 1;
  }
  if (value.startsWith('\r\n', nextStart) && nextEnd === nextStart + 1) {
    nextEnd = nextStart + 2;
  }
  if (
    nextEnd - nextStart === 1 &&
    nextStart > 0 &&
    value[nextStart] === '\n' &&
    value[nextStart - 1] === '\r'
  ) {
    nextStart -= 1;
  }
  return { start: nextStart, end: nextEnd };
}

export function createSensitiveSpanV2(
  value: string,
  start: number,
  end: number,
  reasons:
    ReadonlySet<RedactionReasonCodeV2> | readonly RedactionReasonCodeV2[],
): SensitiveSpanV2 {
  const reasonSet =
    reasons instanceof Set ? reasons : new Set<RedactionReasonCodeV2>(reasons);
  const reasonCodes = orderedReasons(reasonSet);
  if (reasonCodes.length === 0) {
    throw new SpanContractViolationError(
      'SensitiveSpanV2 reasonCodes must be non-empty.',
    );
  }
  let spanStart = start;
  let spanEnd = end;
  for (let index = start; index < end; index += 1) {
    const code = value.charCodeAt(index);
    if (code === 0x0d || code === 0x0a) {
      const expanded = expandCrlfSpan(value, spanStart, spanEnd);
      spanStart = expanded.start;
      spanEnd = expanded.end;
      break;
    }
  }
  if (!(
    0 <= spanStart &&
    spanStart < spanEnd &&
    spanEnd <= value.length &&
    isCodePointBoundary(value, spanStart) &&
    isCodePointBoundary(value, spanEnd)
  )) {
    throw new SpanContractViolationError(
      'SensitiveSpanV2 coordinates must be valid UTF-16 half-open code-point boundaries.',
    );
  }
  return Object.freeze({
    start: spanStart,
    end: spanEnd,
    reasonCodes: Object.freeze(reasonCodes) as SensitiveSpanV2['reasonCodes'],
  });
}

function reasonRank(reason: RedactionReasonCodeV2): number {
  return REDACTION_REASON_CODES_V2.indexOf(reason);
}

export function validateSensitiveSpansV2(
  value: string,
  spans: readonly SensitiveSpanV2[],
): void {
  for (const span of spans) {
    if (span.reasonCodes.length === 0) {
      throw new SpanContractViolationError(
        'SensitiveSpanV2 reasonCodes must be non-empty.',
      );
    }
    const unique = new Set(span.reasonCodes);
    if (unique.size !== span.reasonCodes.length) {
      throw new SpanContractViolationError(
        'SensitiveSpanV2 reasonCodes must be unique.',
      );
    }
    const ordered = orderedReasons(unique);
    if (
      ordered.length !== span.reasonCodes.length ||
      ordered.some((reason, index) => reason !== span.reasonCodes[index])
    ) {
      throw new SpanContractViolationError(
        'SensitiveSpanV2 reasonCodes must follow REDACTION_REASON_CODES_V2 order.',
      );
    }
    if (!(
      0 <= span.start &&
      span.start < span.end &&
      span.end <= value.length &&
      isCodePointBoundary(value, span.start) &&
      isCodePointBoundary(value, span.end)
    )) {
      throw new SpanContractViolationError(
        'SensitiveSpanV2 coordinates must be valid UTF-16 half-open code-point boundaries.',
      );
    }
  }
}

export function mergeSensitiveSpansV2(
  value: string,
  spans: readonly SensitiveSpanV2[],
): readonly SensitiveSpanV2[] {
  validateSensitiveSpansV2(value, spans);
  if (spans.length === 0) {
    return Object.freeze([]);
  }
  const ordered = [...spans].sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start;
    }
    if (left.end !== right.end) {
      return left.end - right.end;
    }
    const leftReason = left.reasonCodes[0]!;
    const rightReason = right.reasonCodes[0]!;
    return reasonRank(leftReason) - reasonRank(rightReason);
  });
  const merged: SensitiveSpanV2[] = [];
  for (const span of ordered) {
    const previous = merged[merged.length - 1];
    if (previous !== undefined && span.start <= previous.end) {
      const reasons = new Set<RedactionReasonCodeV2>([
        ...previous.reasonCodes,
        ...span.reasonCodes,
      ]);
      merged[merged.length - 1] = createSensitiveSpanV2(
        value,
        previous.start,
        Math.max(previous.end, span.end),
        reasons,
      );
    } else {
      merged.push(span);
    }
  }
  return Object.freeze(merged);
}

export function materializeSensitiveSpansV2(
  value: string,
  spans: readonly SensitiveSpanV2[],
  placeholder: string = TOKEN_PLACEHOLDER_V2,
): {
  readonly value: string;
  readonly reasonCodes: readonly RedactionReasonCodeV2[];
  readonly mergedSpanCount: number;
} {
  const merged = mergeSensitiveSpansV2(value, spans);
  if (merged.length === 0) {
    return {
      value,
      reasonCodes: Object.freeze([]),
      mergedSpanCount: 0,
    };
  }
  let output = '';
  let cursor = 0;
  const reasons = new Set<RedactionReasonCodeV2>();
  for (const span of merged) {
    output += value.slice(cursor, span.start);
    output += placeholder;
    for (const reason of span.reasonCodes) {
      reasons.add(reason);
    }
    cursor = span.end;
  }
  output += value.slice(cursor);
  return {
    value: output,
    reasonCodes: orderedReasons(reasons),
    mergedSpanCount: merged.length,
  };
}

export function assertAmplificationBoundV2(
  original: string,
  output: string,
  mergedSpanCount: number,
  placeholder: string = TOKEN_PLACEHOLDER_V2,
): void {
  const maxUnits = original.length + mergedSpanCount * placeholder.length;
  const maxBytes =
    Buffer.byteLength(original, 'utf8') +
    mergedSpanCount * Buffer.byteLength(placeholder, 'utf8');
  if (output.length > maxUnits) {
    throw new SpanContractViolationError(
      'Materialized UTF-16 length exceeds linear amplification bound.',
    );
  }
  if (Buffer.byteLength(output, 'utf8') > maxBytes) {
    throw new SpanContractViolationError(
      'Materialized UTF-8 bytes exceed linear amplification bound.',
    );
  }
}
