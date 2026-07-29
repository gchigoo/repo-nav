import {
  CORPUS_ENTRY_BYTES_MAX_V2,
  CORPUS_ENTRY_BYTES_MIN_V2,
  EMPTY_SENSITIVE_CORPUS_V2,
  LOW_INFORMATION_LITERALS_V2,
  PATH_PLACEHOLDER_V2,
  TOKEN_PLACEHOLDER_V2,
  orderedPropagationReasons,
  utf8Bytes,
  type CorpusPropagationModeV2,
  type CorpusPropagationReasonCodeV2,
  type SensitiveCorpusEntryV2,
  type SensitiveCorpusV2,
  type SensitiveSpanV2,
} from './sensitive-value-contract-v2.js';
import { createSensitiveSpanV2 } from './sensitive-span-merge-v2.js';
import {
  CONNECTION_SECRET_QUERY,
  CONNECTION_USERINFO,
  EMAIL_ADDRESS,
  FIXED_CREDENTIAL,
  SECRET_ASSIGNMENT,
  hasSensitiveIdentifier,
  malformedSecretTail,
  matches,
  secretAssignmentKey,
  secretAssignmentValue,
} from './sensitive-detectors-v2.js';
import {
  classifyPhoneTokenV2,
  findPhoneCandidatesV2,
} from './sensitive-phone-v2.js';

const authenticCorpora = new WeakSet<object>();
const corpusBySource = new WeakMap<object, SensitiveCorpusV2>();

const PROPAGATION_MODES = Object.freeze([
  'exact-text',
  'path-segment',
] as const satisfies readonly CorpusPropagationModeV2[]);

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

export function comparisonKeyV2(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase();
}

export function isCorpusByteEligibleV2(value: string): boolean {
  const bytes = utf8Bytes(value);
  return (
    bytes >= CORPUS_ENTRY_BYTES_MIN_V2 && bytes <= CORPUS_ENTRY_BYTES_MAX_V2
  );
}

export function isGenericAssignmentEligibleV2(value: string): boolean {
  if (!isCorpusByteEligibleV2(value)) {
    return false;
  }
  const key = comparisonKeyV2(value);
  if (key.length === 0 || LOW_INFORMATION_LITERALS_V2.has(key)) {
    return false;
  }
  if (/^\d+$/u.test(key)) {
    return false;
  }
  const distinct = new Set(Array.from(key));
  return distinct.size >= 4;
}

function isBoundaryCodePoint(codePoint: number): boolean {
  return /\p{L}|\p{N}|\p{M}|\p{Pc}/u.test(String.fromCodePoint(codePoint));
}

function codePointBefore(value: string, index: number): number | undefined {
  if (index <= 0) {
    return undefined;
  }
  if (index >= 2) {
    const high = value.charCodeAt(index - 2);
    const low = value.charCodeAt(index - 1);
    if (high >= 0xd800 && high <= 0xdbff && low >= 0xdc00 && low <= 0xdfff) {
      return value.codePointAt(index - 2);
    }
  }
  return value.codePointAt(index - 1);
}

function codePointAtOrAfter(value: string, index: number): number | undefined {
  if (index >= value.length) {
    return undefined;
  }
  return value.codePointAt(index);
}

function firstCodePoint(value: string): number | undefined {
  return value.codePointAt(0);
}

function lastCodePoint(value: string): number | undefined {
  const points = Array.from(value);
  const last = points[points.length - 1];
  return last === undefined ? undefined : last.codePointAt(0);
}

export function findExactTextCorpusSpansV2(
  value: string,
  needle: string,
  reasons: readonly [
    CorpusPropagationReasonCodeV2,
    ...CorpusPropagationReasonCodeV2[],
  ],
): readonly SensitiveSpanV2[] {
  if (needle.length === 0) {
    return [];
  }
  const spans: SensitiveSpanV2[] = [];
  let from = 0;
  while (from <= value.length - needle.length) {
    const start = value.indexOf(needle, from);
    if (start === -1) {
      break;
    }
    const end = start + needle.length;
    const first = firstCodePoint(needle);
    const last = lastCodePoint(needle);
    const before = codePointBefore(value, start);
    const after = codePointAtOrAfter(value, end);
    const startOk =
      first === undefined ||
      !isBoundaryCodePoint(first) ||
      before === undefined ||
      !isBoundaryCodePoint(before);
    const endOk =
      last === undefined ||
      !isBoundaryCodePoint(last) ||
      after === undefined ||
      !isBoundaryCodePoint(after);
    if (startOk && endOk) {
      spans.push(createSensitiveSpanV2(value, start, end, reasons));
    }
    from = start + 1;
  }
  return spans;
}

export function pathHasCompleteSegmentV2(
  path: string,
  segment: string,
): boolean {
  return path.split('/').includes(segment);
}

export function findPathSegmentCorpusHitV2(
  path: string,
  needle: string,
): boolean {
  return pathHasCompleteSegmentV2(path, needle);
}

function modeRank(mode: CorpusPropagationModeV2): number {
  return PROPAGATION_MODES.indexOf(mode);
}

function compareCorpusEntries(
  left: SensitiveCorpusEntryV2,
  right: SensitiveCorpusEntryV2,
): number {
  const byteDelta = utf8Bytes(right.value) - utf8Bytes(left.value);
  if (byteDelta !== 0) {
    return byteDelta;
  }
  if (left.value < right.value) {
    return -1;
  }
  if (left.value > right.value) {
    return 1;
  }
  return modeRank(left.propagation) - modeRank(right.propagation);
}

function sealCorpus(
  entries: readonly SensitiveCorpusEntryV2[],
): SensitiveCorpusV2 {
  const totalUtf8Bytes = entries.reduce(
    (sum, entry) => sum + utf8Bytes(entry.value),
    0,
  );
  const corpus = Object.freeze({
    entries: Object.freeze(entries.map((entry) => Object.freeze(entry))),
    totalUtf8Bytes,
  });
  authenticCorpora.add(corpus);
  return corpus;
}

export function createSensitiveCorpusV2(
  entries: readonly SensitiveCorpusEntryV2[],
): SensitiveCorpusV2 {
  const sorted = [...entries].sort(compareCorpusEntries);
  return sealCorpus(sorted);
}

export function isAuthenticSensitiveCorpusV2(
  corpus: SensitiveCorpusV2,
): boolean {
  return corpus === EMPTY_SENSITIVE_CORPUS_V2 || authenticCorpora.has(corpus);
}

export function bindSensitiveCorpusSourceV2(
  source: object,
  corpus: SensitiveCorpusV2,
): void {
  corpusBySource.set(source, corpus);
}

export function getBoundSensitiveCorpusV2(
  source: object,
): SensitiveCorpusV2 | undefined {
  return corpusBySource.get(source);
}

export function assertCorpusProvenanceV2(
  source: object,
  corpus: SensitiveCorpusV2,
): void {
  const bound = corpusBySource.get(source);
  if (bound !== corpus || !isAuthenticSensitiveCorpusV2(corpus)) {
    throw new Error('FOREIGN_OR_CLONE_SENSITIVE_CORPUS_V2');
  }
}

authenticCorpora.add(EMPTY_SENSITIVE_CORPUS_V2);

export function collectSensitiveCorpusV2(input: unknown): SensitiveCorpusV2 {
  const values: string[] = [];
  collectStrings(input, values, new Set<object>());
  const registry = new Map<string, Set<CorpusPropagationReasonCodeV2>>();

  const add = (
    value: string | undefined,
    reason: CorpusPropagationReasonCodeV2,
    eligible: boolean,
  ): void => {
    if (
      value === undefined ||
      value.length === 0 ||
      value === TOKEN_PLACEHOLDER_V2 ||
      value === PATH_PLACEHOLDER_V2 ||
      !eligible ||
      !isCorpusByteEligibleV2(value)
    ) {
      return;
    }
    const reasons = registry.get(value) ?? new Set();
    reasons.add(reason);
    registry.set(value, reasons);
  };

  for (const value of values) {
    for (const match of matches(SECRET_ASSIGNMENT, value)) {
      const key = secretAssignmentKey(match);
      const assignmentValue = secretAssignmentValue(match);
      if (key !== undefined && hasSensitiveIdentifier(key)) {
        add(
          assignmentValue,
          'SECRET_LIKE_VALUE',
          assignmentValue !== undefined &&
            isGenericAssignmentEligibleV2(assignmentValue),
        );
      }
    }
    const malformedTail = malformedSecretTail(value);
    if (malformedTail !== undefined) {
      add(
        malformedTail,
        'SECRET_LIKE_VALUE',
        malformedTail.length > 0 && isGenericAssignmentEligibleV2(malformedTail),
      );
    }
    for (const match of matches(FIXED_CREDENTIAL, value)) {
      add(match[0], 'SECRET_LIKE_VALUE', true);
    }
    for (const match of matches(CONNECTION_USERINFO, value)) {
      add(match[3], 'CONNECTION_STRING', true);
    }
    for (const match of matches(CONNECTION_SECRET_QUERY, value)) {
      add(match[2], 'CONNECTION_STRING', true);
    }
    for (const match of matches(EMAIL_ADDRESS, value)) {
      const previous =
        match.index === undefined || match.index === 0
          ? undefined
          : value[match.index - 1];
      if (previous !== ':') {
        add(match[0], 'PERSONAL_DATA', true);
      }
    }
    for (const candidate of findPhoneCandidatesV2(value)) {
      if (classifyPhoneTokenV2(candidate.text, value) === 'accept') {
        add(candidate.text, 'PERSONAL_DATA', true);
      }
    }
  }

  const expanded: SensitiveCorpusEntryV2[] = [];
  for (const [value, reasonSet] of registry) {
    const reasonCodes = orderedPropagationReasons(reasonSet);
    for (const propagation of PROPAGATION_MODES) {
      expanded.push(
        Object.freeze({
          value,
          reasonCodes,
          propagation,
        }),
      );
    }
  }
  expanded.sort(compareCorpusEntries);
  const corpus = sealCorpus(expanded);
  if (typeof input === 'object' && input !== null) {
    bindSensitiveCorpusSourceV2(input, corpus);
  }
  return corpus;
}

export function matchExactTextCorpusSpansV2(
  value: string,
  corpus: SensitiveCorpusV2,
): readonly SensitiveSpanV2[] {
  const spans: SensitiveSpanV2[] = [];
  for (const entry of corpus.entries) {
    if (entry.propagation !== 'exact-text') {
      continue;
    }
    spans.push(
      ...findExactTextCorpusSpansV2(value, entry.value, entry.reasonCodes),
    );
  }
  return spans;
}

export function matchPathSegmentCorpusHitV2(
  path: string,
  corpus: SensitiveCorpusV2,
): {
  readonly hit: boolean;
  readonly reasonCodes: ReadonlySet<CorpusPropagationReasonCodeV2>;
} {
  const reasons = new Set<CorpusPropagationReasonCodeV2>();
  for (const entry of corpus.entries) {
    if (entry.propagation !== 'path-segment') {
      continue;
    }
    if (findPathSegmentCorpusHitV2(path, entry.value)) {
      for (const reason of entry.reasonCodes) {
        reasons.add(reason);
      }
    }
  }
  return { hit: reasons.size > 0, reasonCodes: reasons };
}
