export const PUBLIC_FIELD_MAX_BYTES_V2 = 2 * 1024;
export const TOKEN_PLACEHOLDER_V2 = '[REDACTED]';
export const PATH_PLACEHOLDER_V2 = '[REDACTED_PATH]';
export const BINARY_OR_OVERSIZED_PLACEHOLDER_V2 =
  '[REDACTED:BINARY_OR_OVERSIZED_CONTENT]';

export const REDACTION_REASON_CODES_V2 = Object.freeze([
  'SECRET_LIKE_VALUE',
  'CONNECTION_STRING',
  'PERSONAL_DATA',
  'BINARY_OR_OVERSIZED_CONTENT',
  'UNTRUSTED_CONTROL_CHARACTERS',
] as const);

export type RedactionReasonCodeV2 =
  (typeof REDACTION_REASON_CODES_V2)[number];
export type PublicFieldKindV2 = 'term' | 'file' | 'symbol' | 'excerpt';

export interface SensitiveCorpusEntryV2 {
  readonly value: string;
  readonly reasonCode: Extract<
    RedactionReasonCodeV2,
    'SECRET_LIKE_VALUE' | 'CONNECTION_STRING' | 'PERSONAL_DATA'
  >;
}

export interface PublicFieldRedactionV2 {
  readonly value: string;
  readonly reasonCodes: readonly RedactionReasonCodeV2[];
}

const TEMPLATE_QUOTE = '`';
const ASSIGNMENT_KEY =
  String.raw`(?:"([^"\r\n]+)"|'([^'\r\n]+)'|([A-Za-z_$][A-Za-z0-9_$-]*))`;
const SECRET_ASSIGNMENT = new RegExp(
  String.raw`(${ASSIGNMENT_KEY}\s*[:=]\s*)(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|${TEMPLATE_QUOTE}((?:\\.|[^${TEMPLATE_QUOTE}\\])*)${TEMPLATE_QUOTE}|([^\s,"'${TEMPLATE_QUOTE};}\]]+))`,
  'gu',
);
const MALFORMED_SECRET_PATTERNS = Object.freeze([
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
const FIXED_CREDENTIAL =
  /\b(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})\b/gu;
const CONNECTION_USERINFO =
  /\b([a-z][a-z0-9+.-]*:\/\/)([^\s/@:]+):([^\s/@]+)@/giu;
const CONNECTION_SECRET_QUERY =
  /([?&](?:password|passwd|secret|token|api[_-]?key)=)([^&#\s]+)/giu;
const EMAIL_ADDRESS =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const PHONE_LIKE_TOKEN = /(?:\+?\d[\d ()-]{7,}\d)/gu;
const NON_WHITESPACE_TOKEN = /\S+/gu;
const ANSI_SEQUENCE = /\u001b(?:\[[0-?]*[ -/]*[@-~]|[@-_])/gu;
const BIDI_CONTROLS =
  /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]+/gu;
const IDENTIFIER_ALNUM_RUN = /[A-Za-z0-9]+/gu;

interface IdentifierSegment {
  readonly value: string;
  readonly start: number;
  readonly end: number;
}

interface IdentifierRange {
  readonly start: number;
  readonly end: number;
}

function splitIdentifierSegments(value: string): readonly IdentifierSegment[] {
  const segments: IdentifierSegment[] = [];
  for (const run of value.matchAll(IDENTIFIER_ALNUM_RUN)) {
    const text = run[0];
    const offset = run.index;
    let start = 0;
    for (let index = 1; index < text.length; index += 1) {
      const previous = text[index - 1]!;
      const current = text[index]!;
      const next = text[index + 1];
      const lowerToUpper =
        /[a-z0-9]/u.test(previous) && /[A-Z]/u.test(current);
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

function sensitiveIdentifierRanges(value: string): readonly IdentifierRange[] {
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

function hasSensitiveIdentifier(value: string): boolean {
  return sensitiveIdentifierRanges(value).length > 0;
}

function redactSensitiveIdentifiers(value: string): string {
  let redacted = value;
  for (const range of [...sensitiveIdentifierRanges(value)].reverse()) {
    redacted =
      redacted.slice(0, range.start) +
      TOKEN_PLACEHOLDER_V2 +
      redacted.slice(range.end);
  }
  return redacted;
}

function clonePattern(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags);
}

function matches(pattern: RegExp, value: string): readonly RegExpMatchArray[] {
  return Array.from(value.matchAll(clonePattern(pattern)));
}

function hasMatch(pattern: RegExp, value: string): boolean {
  return clonePattern(pattern).test(value);
}

function orderedReasons(
  values: ReadonlySet<RedactionReasonCodeV2>,
): readonly RedactionReasonCodeV2[] {
  return Object.freeze(
    REDACTION_REASON_CODES_V2.filter((reason) => values.has(reason)),
  );
}

function secretAssignmentValue(
  match: RegExpMatchArray,
): string | undefined {
  return match[5] ?? match[6] ?? match[7] ?? match[8];
}

function secretAssignmentKey(
  match: RegExpMatchArray,
): string | undefined {
  return match[2] ?? match[3] ?? match[4];
}

function malformedSecretTail(value: string): string | undefined {
  for (const pattern of MALFORMED_SECRET_PATTERNS) {
    const match = clonePattern(pattern).exec(value);
    const key = match?.[1] ?? match?.[2] ?? match?.[3];
    if (match !== null && key !== undefined && hasSensitiveIdentifier(key)) {
      return match[4] ?? '';
    }
  }
  return undefined;
}

function hasUnsafeTemplateSecret(value: string): boolean {
  return matches(SECRET_ASSIGNMENT, value).some(
    (match) =>
      secretAssignmentKey(match) !== undefined &&
      hasSensitiveIdentifier(secretAssignmentKey(match)!) &&
      match[7]?.includes('${') === true,
  );
}

function redactSecretAssignments(value: string): {
  readonly value: string;
  readonly changed: boolean;
} {
  let redacted = value;
  let changed = false;
  for (const match of [...matches(SECRET_ASSIGNMENT, value)].reverse()) {
    const key = secretAssignmentKey(match);
    if (
      match.index === undefined ||
      key === undefined ||
      !hasSensitiveIdentifier(key)
    ) {
      continue;
    }
    const prefix = match[1] ?? '';
    const replacement =
      match[5] !== undefined
        ? `${prefix}"${TOKEN_PLACEHOLDER_V2}"`
        : match[6] !== undefined
          ? `${prefix}'${TOKEN_PLACEHOLDER_V2}'`
          : match[7] !== undefined
            ? `${prefix}\`${TOKEN_PLACEHOLDER_V2}\``
            : `${prefix}${TOKEN_PLACEHOLDER_V2}`;
    redacted =
      redacted.slice(0, match.index) +
      replacement +
      redacted.slice(match.index + match[0].length);
    changed = true;
  }
  return { value: redacted, changed };
}

function containsOversizedToken(value: string): boolean {
  return matches(NON_WHITESPACE_TOKEN, value).some(
    (match) =>
      Buffer.byteLength(match[0], 'utf8') > PUBLIC_FIELD_MAX_BYTES_V2,
  );
}

function containsUnpairedSurrogate(value: string): boolean {
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

function collectStrings(
  input: unknown,
  output: string[],
  visited: Set<object>,
): void {
  if (typeof input === 'string') {
    output.push(input);
    return;
  }
  if (typeof input !== 'object' || input === null || visited.has(input)) {
    return;
  }
  visited.add(input);
  if (Array.isArray(input)) {
    for (const value of input) {
      collectStrings(value, output, visited);
    }
    return;
  }
  for (const value of Object.values(input)) {
    collectStrings(value, output, visited);
  }
}

export function collectSensitiveCorpusV2(
  input: unknown,
): readonly SensitiveCorpusEntryV2[] {
  const values: string[] = [];
  collectStrings(input, values, new Set<object>());
  const tokens = new Map<
    string,
    SensitiveCorpusEntryV2['reasonCode']
  >();
  const add = (
    value: string | undefined,
    reasonCode: SensitiveCorpusEntryV2['reasonCode'],
  ): void => {
    if (
      value !== undefined &&
      value.length > 0 &&
      value !== TOKEN_PLACEHOLDER_V2 &&
      value !== PATH_PLACEHOLDER_V2
    ) {
      tokens.set(value, reasonCode);
    }
  };

  for (const value of values) {
    for (const match of matches(SECRET_ASSIGNMENT, value)) {
      const key = secretAssignmentKey(match);
      if (key !== undefined && hasSensitiveIdentifier(key)) {
        add(secretAssignmentValue(match), 'SECRET_LIKE_VALUE');
      }
    }
    add(malformedSecretTail(value), 'SECRET_LIKE_VALUE');
    for (const match of matches(FIXED_CREDENTIAL, value)) {
      add(match[0], 'SECRET_LIKE_VALUE');
    }
    for (const match of matches(CONNECTION_USERINFO, value)) {
      add(match[3], 'CONNECTION_STRING');
    }
    for (const match of matches(CONNECTION_SECRET_QUERY, value)) {
      add(match[2], 'CONNECTION_STRING');
    }
    for (const match of matches(EMAIL_ADDRESS, value)) {
      const previous =
        match.index === undefined || match.index === 0
          ? undefined
          : value[match.index - 1];
      if (previous !== ':') {
        add(match[0], 'PERSONAL_DATA');
      }
    }
    for (const match of matches(PHONE_LIKE_TOKEN, value)) {
      add(match[0], 'PERSONAL_DATA');
    }
  }

  return Object.freeze(
    Array.from(tokens, ([value, reasonCode]) =>
      Object.freeze({ value, reasonCode }),
    ).sort((left, right) => right.value.length - left.value.length),
  );
}

export function isValidRawLocatorV2(value: string): boolean {
  if (
    value.length === 0 ||
    value === '.' ||
    value.includes('\\') ||
    value.includes('\0') ||
    value.startsWith('/') ||
    value.startsWith('//') ||
    /^[A-Za-z]:/u.test(value)
  ) {
    return false;
  }
  const segments = value.split('/');
  return (
    segments.every(
      (segment) =>
        segment.length > 0 && segment !== '.' && segment !== '..',
    ) && segments.join('/') === value
  );
}

function replaceControlRuns(
  value: string,
  field: PublicFieldKindV2,
): { readonly value: string; readonly changed: boolean } {
  const canonical =
    field === 'excerpt' ? value.replace(/\r\n?/gu, '\n') : value;
  const controls =
    field === 'excerpt'
      ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/gu
      : /[\u0000-\u001f\u007f]+/gu;
  const replaced = canonical
    .replace(ANSI_SEQUENCE, TOKEN_PLACEHOLDER_V2)
    .replace(controls, TOKEN_PLACEHOLDER_V2)
    .replace(BIDI_CONTROLS, TOKEN_PLACEHOLDER_V2);
  return {
    value: replaced,
    changed: replaced !== canonical,
  };
}

function redactText(
  value: string,
  field: Exclude<PublicFieldKindV2, 'file'>,
  corpus: readonly SensitiveCorpusEntryV2[],
): PublicFieldRedactionV2 {
  const reasons = new Set<RedactionReasonCodeV2>();
  const malformed =
    containsUnpairedSurrogate(value) ||
    malformedSecretTail(value) !== undefined ||
    hasUnsafeTemplateSecret(value);
  const oversized =
    field === 'excerpt'
      ? containsOversizedToken(value)
      : Buffer.byteLength(value, 'utf8') > PUBLIC_FIELD_MAX_BYTES_V2;
  if (malformed || oversized) {
    if (
      malformedSecretTail(value) !== undefined ||
      hasUnsafeTemplateSecret(value)
    ) {
      reasons.add('SECRET_LIKE_VALUE');
    }
    reasons.add('BINARY_OR_OVERSIZED_CONTENT');
    return Object.freeze({
      value: BINARY_OR_OVERSIZED_PLACEHOLDER_V2,
      reasonCodes: orderedReasons(reasons),
    });
  }

  let redacted =
    field === 'excerpt' ? value.replace(/\r\n?/gu, '\n') : value;
  const assignment = redactSecretAssignments(redacted);
  if (assignment.changed) {
    reasons.add('SECRET_LIKE_VALUE');
    redacted = assignment.value;
  }
  if (hasMatch(FIXED_CREDENTIAL, redacted)) {
    reasons.add('SECRET_LIKE_VALUE');
    redacted = redacted.replace(FIXED_CREDENTIAL, TOKEN_PLACEHOLDER_V2);
  }
  if (
    hasMatch(CONNECTION_USERINFO, redacted) ||
    hasMatch(CONNECTION_SECRET_QUERY, redacted)
  ) {
    reasons.add('CONNECTION_STRING');
    redacted = redacted
      .replace(
        CONNECTION_USERINFO,
        (_match: string, scheme: string) =>
          `${scheme}${TOKEN_PLACEHOLDER_V2}@`,
      )
      .replace(
        CONNECTION_SECRET_QUERY,
        (_match: string, prefix: string) =>
          `${prefix}${TOKEN_PLACEHOLDER_V2}`,
      );
  }
  if (
    hasMatch(EMAIL_ADDRESS, redacted) ||
    hasMatch(PHONE_LIKE_TOKEN, redacted)
  ) {
    reasons.add('PERSONAL_DATA');
    redacted = redacted
      .replace(EMAIL_ADDRESS, TOKEN_PLACEHOLDER_V2)
      .replace(PHONE_LIKE_TOKEN, TOKEN_PLACEHOLDER_V2);
  }
  for (const token of corpus) {
    if (redacted.includes(token.value)) {
      redacted = redacted.replaceAll(token.value, TOKEN_PLACEHOLDER_V2);
      reasons.add(token.reasonCode);
    }
  }
  if (field !== 'excerpt' && hasSensitiveIdentifier(redacted)) {
    reasons.add('SECRET_LIKE_VALUE');
    redacted = redactSensitiveIdentifiers(redacted);
  }

  const controlled = replaceControlRuns(redacted, field);
  if (controlled.changed) {
    reasons.add('UNTRUSTED_CONTROL_CHARACTERS');
  }
  return Object.freeze({
    value: controlled.value,
    reasonCodes: orderedReasons(reasons),
  });
}

function redactFile(
  value: string,
  corpus: readonly SensitiveCorpusEntryV2[],
): PublicFieldRedactionV2 {
  const reasons = new Set<RedactionReasonCodeV2>();
  if (
    containsUnpairedSurrogate(value) ||
    value
      .split('/')
      .some(
        (segment) =>
          Buffer.byteLength(segment, 'utf8') > PUBLIC_FIELD_MAX_BYTES_V2,
      )
  ) {
    reasons.add('BINARY_OR_OVERSIZED_CONTENT');
  }
  for (const token of corpus) {
    if (value.includes(token.value)) {
      reasons.add(token.reasonCode);
    }
  }
  if (
    hasSensitiveIdentifier(value) ||
    matches(SECRET_ASSIGNMENT, value).some((match) => {
      const key = secretAssignmentKey(match);
      return key !== undefined && hasSensitiveIdentifier(key);
    }) ||
    hasMatch(FIXED_CREDENTIAL, value)
  ) {
    reasons.add('SECRET_LIKE_VALUE');
  }
  if (
    hasMatch(CONNECTION_USERINFO, value) ||
    hasMatch(CONNECTION_SECRET_QUERY, value)
  ) {
    reasons.add('CONNECTION_STRING');
  }
  if (
    hasMatch(EMAIL_ADDRESS, value) ||
    hasMatch(PHONE_LIKE_TOKEN, value)
  ) {
    reasons.add('PERSONAL_DATA');
  }
  if (
    replaceControlRuns(value, 'file').changed ||
    /[\r\n\t]/u.test(value)
  ) {
    reasons.add('UNTRUSTED_CONTROL_CHARACTERS');
  }
  return Object.freeze({
    value: reasons.size === 0 ? value : PATH_PLACEHOLDER_V2,
    reasonCodes: orderedReasons(reasons),
  });
}

export function redactPublicFieldV2(
  value: string,
  field: PublicFieldKindV2,
  corpus: readonly SensitiveCorpusEntryV2[],
): PublicFieldRedactionV2 {
  return field === 'file'
    ? redactFile(value, corpus)
    : redactText(value, field, corpus);
}
