import {
  REDACTION_REASON_CODES,
  type CandidateEvidence,
  type ConfirmedEvidence,
  type EvidenceLocation,
  type LocateResult,
  type RedactionReasonCode,
} from '../contracts/index.js';

export const PUBLIC_DISPLAY_TOKEN_MAX_BYTES = 2 * 1024;
export const OVERSIZED_CONTENT_PLACEHOLDER =
  '[REDACTED:BINARY_OR_OVERSIZED_CONTENT]';
const TOKEN_PLACEHOLDER = '[REDACTED]';

const SECRET_KEY =
  String.raw`\b(?:password|passwd|secret|token|api[_-]?key|client[_-]?secret)\b`;
const TEMPLATE_QUOTE = '`';
const SECRET_ASSIGNMENT = new RegExp(
  String.raw`(${SECRET_KEY}\s*[:=]\s*)(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|${TEMPLATE_QUOTE}((?:\\.|[^${TEMPLATE_QUOTE}\\])*)${TEMPLATE_QUOTE}|([^\s,"'${TEMPLATE_QUOTE};}\]]+))`,
  'giu',
);
const MALFORMED_DOUBLE_QUOTED_SECRET = new RegExp(
  String.raw`${SECRET_KEY}\s*[:=]\s*"((?:\\.|[^"\\])*)$`,
  'iu',
);
const MALFORMED_SINGLE_QUOTED_SECRET = new RegExp(
  String.raw`${SECRET_KEY}\s*[:=]\s*'((?:\\.|[^'\\])*)$`,
  'iu',
);
const MALFORMED_TEMPLATE_QUOTED_SECRET = new RegExp(
  String.raw`${SECRET_KEY}\s*[:=]\s*${TEMPLATE_QUOTE}((?:\\.|[^${TEMPLATE_QUOTE}\\])*)$`,
  'iu',
);
const FIXED_CREDENTIAL =
  /\b(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})\b/gu;
const CONNECTION_USERINFO =
  /\b([a-z][a-z0-9+.-]*:\/\/)([^\s/@:]+):([^\s/@]+)@/giu;
const CONNECTION_SECRET_QUERY =
  /([?&](?:password|passwd|secret|token|api[_-]?key)=)([^&#\s]+)/giu;
const CONNECTION_DETECTOR =
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]+@|[?&](?:password|passwd|secret|token|api[_-]?key)=/iu;
const EMAIL_ADDRESS =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const PHONE_LIKE_TOKEN = /(?:\+?\d[\d ()-]{7,}\d)/gu;
const NON_WHITESPACE_TOKEN = /\S+/gu;

function orderedReasons(
  values: readonly RedactionReasonCode[],
): readonly RedactionReasonCode[] {
  const present = new Set(values);
  return Object.freeze(
    REDACTION_REASON_CODES.filter((reason) => present.has(reason)),
  );
}

function containsOversizedToken(value: string): boolean {
  for (const match of value.matchAll(NON_WHITESPACE_TOKEN)) {
    const token = match[0];
    if (Buffer.byteLength(token, 'utf8') > PUBLIC_DISPLAY_TOKEN_MAX_BYTES) {
      return true;
    }
  }
  return false;
}

export interface PublicTextRedaction {
  readonly value: string;
  readonly reasonCodes: readonly RedactionReasonCode[];
}

interface SensitiveToken {
  readonly value: string;
  readonly reasonCode: RedactionReasonCode;
}

function matches(pattern: RegExp, value: string): readonly RegExpMatchArray[] {
  return Array.from(value.matchAll(new RegExp(pattern.source, pattern.flags)));
}

function hasMatch(pattern: RegExp, value: string): boolean {
  return new RegExp(pattern.source, pattern.flags).test(value);
}

function secretAssignmentValue(match: RegExpMatchArray): string | undefined {
  return match[2] ?? match[3] ?? match[4] ?? match[5];
}

function malformedQuotedSecretTail(value: string): string | undefined {
  for (const pattern of [
    MALFORMED_DOUBLE_QUOTED_SECRET,
    MALFORMED_SINGLE_QUOTED_SECRET,
    MALFORMED_TEMPLATE_QUOTED_SECRET,
  ]) {
    const match = new RegExp(pattern.source, pattern.flags).exec(value);
    if (match !== null) {
      return match[1] ?? '';
    }
  }
  return undefined;
}

function hasUnsafeTemplateSecret(value: string): boolean {
  return matches(SECRET_ASSIGNMENT, value).some(
    (match) => match[4]?.includes('${') === true,
  );
}

function collectSensitiveTokens(values: readonly string[]): readonly SensitiveToken[] {
  const tokens = new Map<string, RedactionReasonCode>();
  const add = (value: string | undefined, reasonCode: RedactionReasonCode): void => {
    if (value !== undefined && value.length > 0 && value !== TOKEN_PLACEHOLDER) {
      tokens.set(value, reasonCode);
    }
  };
  for (const value of values) {
    for (const match of matches(SECRET_ASSIGNMENT, value)) {
      add(secretAssignmentValue(match), 'SECRET_LIKE_VALUE');
    }
    add(malformedQuotedSecretTail(value), 'SECRET_LIKE_VALUE');
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
      add(match[0], 'PERSONAL_DATA');
    }
    for (const match of matches(PHONE_LIKE_TOKEN, value)) {
      add(match[0], 'PERSONAL_DATA');
    }
  }
  return Object.freeze(
    Array.from(tokens, ([value, reasonCode]) => ({ value, reasonCode })).sort(
      (left, right) => right.value.length - left.value.length,
    ),
  );
}

export function redactPublicText(value: string): PublicTextRedaction {
  if (containsOversizedToken(value)) {
    return Object.freeze({
      value: OVERSIZED_CONTENT_PLACEHOLDER,
      reasonCodes: Object.freeze(['BINARY_OR_OVERSIZED_CONTENT'] as const),
    });
  }

  const reasons: RedactionReasonCode[] = [];
  if (
    malformedQuotedSecretTail(value) !== undefined ||
    hasUnsafeTemplateSecret(value)
  ) {
    return Object.freeze({
      value: OVERSIZED_CONTENT_PLACEHOLDER,
      reasonCodes: Object.freeze([
        'SECRET_LIKE_VALUE',
        'BINARY_OR_OVERSIZED_CONTENT',
      ] as const),
    });
  }
  let redacted = value;
  if (hasMatch(SECRET_ASSIGNMENT, value) || hasMatch(FIXED_CREDENTIAL, value)) {
    reasons.push('SECRET_LIKE_VALUE');
    redacted = redacted
      .replace(
        SECRET_ASSIGNMENT,
        (
          _match,
          prefix: string,
          doubleQuoted: string | undefined,
          singleQuoted: string | undefined,
          templateQuoted: string | undefined,
        ) =>
          doubleQuoted !== undefined
            ? `${prefix}"${TOKEN_PLACEHOLDER}"`
            : singleQuoted !== undefined
              ? `${prefix}'${TOKEN_PLACEHOLDER}'`
              : templateQuoted !== undefined
                ? `${prefix}\`${TOKEN_PLACEHOLDER}\``
              : `${prefix}${TOKEN_PLACEHOLDER}`,
      )
      .replace(FIXED_CREDENTIAL, TOKEN_PLACEHOLDER);
  }
  if (hasMatch(CONNECTION_DETECTOR, value)) {
    reasons.push('CONNECTION_STRING');
    redacted = redacted
      .replace(
        CONNECTION_USERINFO,
        (_match, scheme: string) => `${scheme}${TOKEN_PLACEHOLDER}@`,
      )
      .replace(
        CONNECTION_SECRET_QUERY,
        (_match, prefix: string) => `${prefix}${TOKEN_PLACEHOLDER}`,
      );
  }
  if (hasMatch(EMAIL_ADDRESS, value) || hasMatch(PHONE_LIKE_TOKEN, value)) {
    reasons.push('PERSONAL_DATA');
    redacted = redacted
      .replace(EMAIL_ADDRESS, TOKEN_PLACEHOLDER)
      .replace(PHONE_LIKE_TOKEN, TOKEN_PLACEHOLDER);
  }

  return Object.freeze({
    value: redacted,
    reasonCodes: orderedReasons(reasons),
  });
}

export function redactEvidenceLocation(
  location: EvidenceLocation,
  inheritedTokens: readonly SensitiveToken[] = [],
): EvidenceLocation {
  const redaction = redactPublicText(location.excerpt);
  const inheritedReasons: RedactionReasonCode[] = [];
  let excerpt = redaction.value;
  for (const token of inheritedTokens) {
    if (location.excerpt.includes(token.value)) {
      inheritedReasons.push(token.reasonCode);
      excerpt = excerpt.replaceAll(token.value, TOKEN_PLACEHOLDER);
    }
  }
  const reasonCodes = orderedReasons([
    ...redaction.reasonCodes,
    ...inheritedReasons,
  ]);
  if (reasonCodes.length === 0) {
    return location;
  }
  return Object.freeze({
    file: location.file,
    ...(location.symbol === undefined ? {} : { symbol: location.symbol }),
    lines: location.lines,
    excerpt,
    redaction: Object.freeze({
      applied: true as const,
      reasonCodes: reasonCodes as readonly [
        RedactionReasonCode,
        ...RedactionReasonCode[],
      ],
    }),
  });
}

export function redactConfirmedEvidence(
  evidence: ConfirmedEvidence,
  inheritedTokens: readonly SensitiveToken[] = [],
): ConfirmedEvidence {
  return Object.freeze({
    ...evidence,
    location: redactEvidenceLocation(evidence.location, inheritedTokens),
  });
}

export function redactCandidateEvidence(
  evidence: CandidateEvidence,
  inheritedTokens: readonly SensitiveToken[] = [],
): CandidateEvidence {
  return Object.freeze({
    ...evidence,
    location: redactEvidenceLocation(evidence.location, inheritedTokens),
  });
}

export function redactLocateResult(result: LocateResult): LocateResult {
  if (!result.ok) {
    return result;
  }
  const inheritedTokens = collectSensitiveTokens([
    ...result.evidence.confirmed.map((item) => item.location.excerpt),
    ...result.evidence.candidates.map((item) => item.location.excerpt),
  ]);
  return Object.freeze({
    ok: true,
    evidence: Object.freeze({
      ...result.evidence,
      confirmed: Object.freeze(
        result.evidence.confirmed.map((item) =>
          redactConfirmedEvidence(item, inheritedTokens),
        ),
      ),
      candidates: Object.freeze(
        result.evidence.candidates.map((item) =>
          redactCandidateEvidence(item, inheritedTokens),
        ),
      ),
    }),
  });
}
