import {
  PUBLIC_FIELD_MAX_BYTES_V2,
  type PublicFieldKindV2,
  type RedactionReasonCodeV2,
  type SensitiveSpanV2,
} from './sensitive-value-contract-v2.js';
import { createSensitiveSpanV2 } from './sensitive-span-merge-v2.js';
import {
  classifyPhoneTokenV2,
  findPhoneCandidatesV2,
} from './sensitive-phone-v2.js';

const TEMPLATE_QUOTE = '`';
const ASSIGNMENT_KEY = String.raw`(?:"([^"\r\n]+)"|'([^'\r\n]+)'|([A-Za-z_$][A-Za-z0-9_$-]*))`;
export const SECRET_ASSIGNMENT = new RegExp(
  String.raw`(${ASSIGNMENT_KEY}\s*[:=]\s*)(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|${TEMPLATE_QUOTE}((?:\\.|[^${TEMPLATE_QUOTE}\\])*)${TEMPLATE_QUOTE}|([^\s,"'${TEMPLATE_QUOTE};}\]]+))`,
  'gu',
);
export const MALFORMED_SECRET_PATTERNS = Object.freeze([
  new RegExp(
    String.raw`${ASSIGNMENT_KEY}\s*[:=]\s*"((?:\\.|[^"\\])*)\\?$`,
    'u',
  ),
  new RegExp(
    String.raw`${ASSIGNMENT_KEY}\s*[:=]\s*'((?:\\.|[^'\\])*)\\?$`,
    'u',
  ),
  new RegExp(
    String.raw`${ASSIGNMENT_KEY}\s*[:=]\s*${TEMPLATE_QUOTE}((?:\\.|[^${TEMPLATE_QUOTE}\\])*)\\?$`,
    'u',
  ),
]);
export const FIXED_CREDENTIAL =
  /\b(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})\b/gu;
export const CONNECTION_USERINFO =
  /\b([a-z][a-z0-9+.-]*:\/\/)([^\s/@:]+):([^\s/@]+)@/giu;
export const CONNECTION_SECRET_QUERY =
  /([?&](?:password|passwd|secret|token|api[_-]?key)=)([^&#\s]+)/giu;
export const EMAIL_ADDRESS = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
export const NON_WHITESPACE_TOKEN = /\S+/gu;
export const ANSI_SEQUENCE = /\u001b(?:\[[0-?]*[ -/]*[@-~]|[@-_])/gu;
export const BIDI_CONTROLS =
  /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]+/gu;
const IDENTIFIER_ALNUM_RUN = /[A-Za-z0-9]+/gu;

export interface IdentifierSegment {
  readonly value: string;
  readonly start: number;
  readonly end: number;
}

export interface IdentifierRange {
  readonly start: number;
  readonly end: number;
}

export function splitIdentifierSegments(
  value: string,
): readonly IdentifierSegment[] {
  const segments: IdentifierSegment[] = [];
  for (const run of value.matchAll(IDENTIFIER_ALNUM_RUN)) {
    const text = run[0];
    const offset = run.index;
    let start = 0;
    for (let index = 1; index < text.length; index += 1) {
      const previous = text[index - 1]!;
      const current = text[index]!;
      const next = text[index + 1];
      const lowerToUpper = /[a-z0-9]/u.test(previous) && /[A-Z]/u.test(current);
      const acronymToWord =
        /[A-Z]/u.test(previous) &&
        /[A-Z]/u.test(current) &&
        next !== undefined &&
        /[a-z]/u.test(next);
      if (lowerToUpper || acronymToWord) {
        segments.push({
          value: text.slice(start, index),
          start: offset + start,
          end: offset + index,
        });
        start = index;
      }
    }
    segments.push({
      value: text.slice(start),
      start: offset + start,
      end: offset + text.length,
    });
  }
  return segments;
}

export function sensitiveIdentifierRanges(
  value: string,
): readonly IdentifierRange[] {
  const segments = splitIdentifierSegments(value);
  const ranges: IdentifierRange[] = [];
  const singles = new Set(['password', 'passwd', 'secret', 'token']);
  const pairs = new Set(['api:key', 'client:secret', 'auth:token']);
  for (let index = 0; index < segments.length; index += 1) {
    const current = segments[index]!;
    const normalized = current.value.toLowerCase();
    if (singles.has(normalized)) {
      ranges.push({ start: current.start, end: current.end });
    }
    const next = segments[index + 1];
    if (
      next !== undefined &&
      pairs.has(`${normalized}:${next.value.toLowerCase()}`)
    ) {
      ranges.push({ start: current.start, end: next.end });
    }
  }
  const ordered = ranges.sort((left, right) => left.start - right.start);
  const merged: IdentifierRange[] = [];
  for (const range of ordered) {
    const previous = merged[merged.length - 1];
    if (previous !== undefined && range.start <= previous.end) {
      merged[merged.length - 1] = {
        start: previous.start,
        end: Math.max(previous.end, range.end),
      };
    } else {
      merged.push(range);
    }
  }
  return merged;
}

export function hasSensitiveIdentifier(value: string): boolean {
  return sensitiveIdentifierRanges(value).length > 0;
}

export function clonePattern(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags);
}

export function matches(
  pattern: RegExp,
  value: string,
): readonly RegExpMatchArray[] {
  return Array.from(value.matchAll(clonePattern(pattern)));
}

export function secretAssignmentValue(
  match: RegExpMatchArray,
): string | undefined {
  return match[5] ?? match[6] ?? match[7] ?? match[8];
}

export function secretAssignmentKey(
  match: RegExpMatchArray,
): string | undefined {
  return match[2] ?? match[3] ?? match[4];
}

export function secretAssignmentValueSpan(
  match: RegExpMatchArray,
): { readonly start: number; readonly end: number } | undefined {
  if (match.index === undefined) {
    return undefined;
  }
  const prefix = match[1] ?? '';
  const value = secretAssignmentValue(match);
  if (value === undefined) {
    return undefined;
  }
  const quoted =
    match[5] !== undefined || match[6] !== undefined || match[7] !== undefined;
  const valueStart = match.index + prefix.length + (quoted ? 1 : 0);
  return { start: valueStart, end: valueStart + value.length };
}

export function malformedSecretTail(value: string): string | undefined {
  for (const pattern of MALFORMED_SECRET_PATTERNS) {
    const match = clonePattern(pattern).exec(value);
    const key = match?.[1] ?? match?.[2] ?? match?.[3];
    if (match !== null && key !== undefined && hasSensitiveIdentifier(key)) {
      return match[4] ?? '';
    }
  }
  return undefined;
}

export function hasUnsafeTemplateSecret(value: string): boolean {
  return matches(SECRET_ASSIGNMENT, value).some(
    (match) =>
      secretAssignmentKey(match) !== undefined &&
      hasSensitiveIdentifier(secretAssignmentKey(match)!) &&
      match[7]?.includes('${') === true,
  );
}

export function containsOversizedToken(value: string): boolean {
  return matches(NON_WHITESPACE_TOKEN, value).some(
    (match) => Buffer.byteLength(match[0], 'utf8') > PUBLIC_FIELD_MAX_BYTES_V2,
  );
}

export function containsUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        return true;
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function pushSpan(
  output: SensitiveSpanV2[],
  value: string,
  start: number,
  end: number,
  reason: RedactionReasonCodeV2,
): void {
  if (start < end) {
    output.push(createSensitiveSpanV2(value, start, end, [reason]));
  }
}

export function detectAssignmentSpansV2(
  value: string,
): readonly SensitiveSpanV2[] {
  const spans: SensitiveSpanV2[] = [];
  for (const match of matches(SECRET_ASSIGNMENT, value)) {
    const key = secretAssignmentKey(match);
    const range = secretAssignmentValueSpan(match);
    if (
      key === undefined ||
      range === undefined ||
      !hasSensitiveIdentifier(key)
    ) {
      continue;
    }
    pushSpan(spans, value, range.start, range.end, 'SECRET_LIKE_VALUE');
  }
  return spans;
}

export function detectFixedCredentialSpansV2(
  value: string,
): readonly SensitiveSpanV2[] {
  const spans: SensitiveSpanV2[] = [];
  for (const match of matches(FIXED_CREDENTIAL, value)) {
    if (match.index === undefined) {
      continue;
    }
    pushSpan(
      spans,
      value,
      match.index,
      match.index + match[0].length,
      'SECRET_LIKE_VALUE',
    );
  }
  return spans;
}

export function detectConnectionSpansV2(
  value: string,
): readonly SensitiveSpanV2[] {
  const spans: SensitiveSpanV2[] = [];
  for (const match of matches(CONNECTION_USERINFO, value)) {
    if (match.index === undefined) {
      continue;
    }
    const scheme = match[1] ?? '';
    const user = match[2] ?? '';
    const password = match[3] ?? '';
    const start = match.index + scheme.length;
    const end = start + user.length + 1 + password.length;
    pushSpan(spans, value, start, end, 'CONNECTION_STRING');
  }
  for (const match of matches(CONNECTION_SECRET_QUERY, value)) {
    if (match.index === undefined) {
      continue;
    }
    const prefix = match[1] ?? '';
    const secret = match[2] ?? '';
    const start = match.index + prefix.length;
    pushSpan(spans, value, start, start + secret.length, 'CONNECTION_STRING');
  }
  return spans;
}

export function detectEmailSpansV2(value: string): readonly SensitiveSpanV2[] {
  const spans: SensitiveSpanV2[] = [];
  for (const match of matches(EMAIL_ADDRESS, value)) {
    if (match.index === undefined) {
      continue;
    }
    const previous = match.index === 0 ? undefined : value[match.index - 1];
    if (previous === ':') {
      continue;
    }
    pushSpan(
      spans,
      value,
      match.index,
      match.index + match[0].length,
      'PERSONAL_DATA',
    );
  }
  return spans;
}

export function detectPhoneSpansV2(value: string): readonly SensitiveSpanV2[] {
  const spans: SensitiveSpanV2[] = [];
  for (const candidate of findPhoneCandidatesV2(value)) {
    const classification = classifyPhoneTokenV2(candidate.text, value);
    if (classification === 'reject') {
      continue;
    }
    pushSpan(spans, value, candidate.start, candidate.end, 'PERSONAL_DATA');
  }
  return spans;
}

export function detectIdentifierSpansV2(
  value: string,
): readonly SensitiveSpanV2[] {
  return sensitiveIdentifierRanges(value).map((range) =>
    createSensitiveSpanV2(value, range.start, range.end, ['SECRET_LIKE_VALUE']),
  );
}

export function detectControlSpansV2(
  value: string,
  field: PublicFieldKindV2,
): readonly SensitiveSpanV2[] {
  const spans: SensitiveSpanV2[] = [];
  for (const match of matches(ANSI_SEQUENCE, value)) {
    if (match.index === undefined) {
      continue;
    }
    pushSpan(
      spans,
      value,
      match.index,
      match.index + match[0].length,
      'UNTRUSTED_CONTROL_CHARACTERS',
    );
  }
  for (const match of matches(BIDI_CONTROLS, value)) {
    if (match.index === undefined) {
      continue;
    }
    pushSpan(
      spans,
      value,
      match.index,
      match.index + match[0].length,
      'UNTRUSTED_CONTROL_CHARACTERS',
    );
  }
  const controls =
    field === 'excerpt'
      ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu
      : /[\u0000-\u001f\u007f]/gu;
  for (const match of value.matchAll(controls)) {
    if (match.index === undefined) {
      continue;
    }
    pushSpan(
      spans,
      value,
      match.index,
      match.index + match[0].length,
      'UNTRUSTED_CONTROL_CHARACTERS',
    );
  }
  if (field === 'file') {
    for (const match of value.matchAll(/[\t]/gu)) {
      if (match.index === undefined) {
        continue;
      }
      pushSpan(
        spans,
        value,
        match.index,
        match.index + 1,
        'UNTRUSTED_CONTROL_CHARACTERS',
      );
    }
  }
  return spans;
}

export function detectUnpairedSurrogateSpansV2(
  value: string,
): readonly SensitiveSpanV2[] {
  const spans: SensitiveSpanV2[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        pushSpan(spans, value, index, index + 1, 'BINARY_OR_OVERSIZED_CONTENT');
      } else {
        index += 1;
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      pushSpan(spans, value, index, index + 1, 'BINARY_OR_OVERSIZED_CONTENT');
    }
  }
  return spans;
}

export function detectLocalTextSpansV2(
  value: string,
  field: Exclude<PublicFieldKindV2, 'file'>,
): readonly SensitiveSpanV2[] {
  return [
    ...detectAssignmentSpansV2(value),
    ...detectFixedCredentialSpansV2(value),
    ...detectConnectionSpansV2(value),
    ...detectEmailSpansV2(value),
    ...detectPhoneSpansV2(value),
    // A code locator such as verifyAccessToken or databasePassword names a
    // program element; it is not itself a credential. Actual assigned values,
    // fixed credentials, connection secrets, PII, and response-level corpus
    // matches remain redacted above/by the materializer.
    ...detectControlSpansV2(value, field),
  ];
}

export function detectLocalFileSpansV2(
  value: string,
): readonly SensitiveSpanV2[] {
  return [
    ...detectAssignmentSpansV2(value),
    ...detectFixedCredentialSpansV2(value),
    ...detectConnectionSpansV2(value),
    ...detectEmailSpansV2(value),
    ...detectPhoneSpansV2(value),
    // Preserve repository-relative locator segments such as auth-token/. A
    // complete segment matching an actual collected secret is still hidden by
    // matchPathSegmentCorpusHitV2 in the field materializer.
    ...detectControlSpansV2(value, 'file'),
  ];
}
