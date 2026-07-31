const PHONE_CUE = /(?:phone|tel|mobile|contact)/iu;
const TIMESTAMP_CUE = /(?:version|ver|build|release|timestamp|epoch)/iu;
const ALLOWED_PHONE_CHARS = /^[+\d() .\-]+$/u;
const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/u;
const SEMVER_LIKE = /^v?\d+(?:\.\d+){1,3}(?:[-+][0-9A-Za-z.-]+)?$/u;
const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const UUID_FRAGMENT = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){1,3}$/iu;
const COMPACT_DATETIME = /^\d{8}(?:\d{6})?$/u;
const PHONE_CANDIDATE = /(?:\+?\d[\d() .\-]{6,}\d)/gu;

const UNIX_SECONDS_MIN = 946_684_800; // 2000-01-01 UTC
const UNIX_SECONDS_MAX = 4_102_444_799; // 2099-12-31 UTC
const UNIX_MS_MIN = UNIX_SECONDS_MIN * 1000;
const UNIX_MS_MAX = UNIX_SECONDS_MAX * 1000 + 999;

export type PhoneClassificationV2 = 'accept' | 'reject' | 'local-only';

function digitCount(value: string): number {
  return (value.match(/\d/gu) ?? []).length;
}

function isStructuredPhone(value: string, digits: string): boolean {
  if (/^\+?\d{10,15}$/u.test(value.replace(/[() .\-]/gu, ''))) {
    // compact national / country+national without separators after stripping
  }
  const groups = value
    .replace(/^\+/u, '')
    .split(/[() .\-]+/u)
    .filter((part) => part.length > 0);
  if (groups.every((part) => /^\d+$/u.test(part))) {
    if (groups.length === 1 && digits.length >= 10 && digits.length <= 15) {
      return true;
    }
    // 3-3-4
    if (
      groups.length === 3 &&
      groups[0]!.length === 3 &&
      groups[1]!.length === 3 &&
      groups[2]!.length === 4
    ) {
      return true;
    }
    // country(1-3) + 3-3-4
    if (
      groups.length === 4 &&
      groups[0]!.length >= 1 &&
      groups[0]!.length <= 3 &&
      groups[1]!.length === 3 &&
      groups[2]!.length === 3 &&
      groups[3]!.length === 4
    ) {
      return true;
    }
    // country + compact national
    if (
      groups.length === 2 &&
      groups[0]!.length >= 1 &&
      groups[0]!.length <= 3 &&
      groups[1]!.length >= 10 &&
      groups[1]!.length <= 12
    ) {
      return true;
    }
    // spaced national like 138 0013 8000
    if (
      groups.length === 3 &&
      groups[0]!.length >= 3 &&
      groups[0]!.length <= 4 &&
      groups[1]!.length >= 3 &&
      groups[1]!.length <= 4 &&
      groups[2]!.length >= 3 &&
      groups[2]!.length <= 4 &&
      digits.length >= 10 &&
      digits.length <= 15
    ) {
      return true;
    }
  }
  const stripped = value.replace(/[() .\-]/gu, '');
  return /^\+?\d{10,15}$/u.test(stripped);
}

function isAmbiguousUnix(digits: string): boolean {
  if (digits.length === 10) {
    const value = Number(digits);
    return value >= UNIX_SECONDS_MIN && value <= UNIX_SECONDS_MAX;
  }
  if (digits.length === 13) {
    const value = Number(digits);
    return value >= UNIX_MS_MIN && value <= UNIX_MS_MAX;
  }
  return false;
}

export function classifyPhoneTokenV2(
  token: string,
  fieldContext: string,
): PhoneClassificationV2 {
  const trimmed = token.trim();
  if (!ALLOWED_PHONE_CHARS.test(trimmed)) {
    return 'reject';
  }
  const digits = (trimmed.match(/\d/gu) ?? []).join('');
  if (digits.length < 10 || digits.length > 15) {
    return 'reject';
  }
  if (
    ISO_DATE.test(trimmed) ||
    SEMVER_LIKE.test(trimmed) ||
    UUID_LIKE.test(trimmed) ||
    UUID_FRAGMENT.test(trimmed) ||
    COMPACT_DATETIME.test(trimmed)
  ) {
    return 'reject';
  }
  if (TIMESTAMP_CUE.test(fieldContext)) {
    return 'reject';
  }
  if (!isStructuredPhone(trimmed, digits)) {
    return 'reject';
  }
  if (isAmbiguousUnix(digits) && !PHONE_CUE.test(fieldContext)) {
    return 'local-only';
  }
  return 'accept';
}

export function findPhoneCandidatesV2(value: string): readonly {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}[] {
  const pattern = new RegExp(PHONE_CANDIDATE.source, PHONE_CANDIDATE.flags);
  const found: { start: number; end: number; text: string }[] = [];
  for (const match of value.matchAll(pattern)) {
    if (match.index === undefined) {
      continue;
    }
    found.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
    });
  }
  return found;
}

export function phoneDigitsV2(value: string): number {
  return digitCount(value);
}
