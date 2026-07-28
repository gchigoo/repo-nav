/**
 * Legacy-compatible candidate enumeration + bounded selection（S1 物理拆分）。
 */
import {
  CANDIDATE_REASON_CODES,
  PROMOTION_REQUIREMENT_CODES,
  createDiscoveryKey,
  createEvidenceId,
  normalizeEvidenceExcerpt,
  type CandidateEvidence,
  type CandidateReasonCode,
  type EvidenceLocation,
  type EvidenceProvenance,
  type EvidenceSource,
  type PromotionRequirementCode,
} from '../../contracts/index.js';
import type { DiscoveryRecord } from '../discovery-record.js';
import {
  maskNonCode,
  maskSqlNonCode,
} from '../direct-mapping-classifier.js';

export interface CandidatePolicyInput {
  readonly records: readonly DiscoveryRecord[];
  readonly contexts: readonly VerifiedCandidateContext[];
  readonly maxCandidates: number;
  readonly signal: AbortSignal;
}

export interface VerifiedCandidateContext {
  readonly seedDiscoveryKey: string;
  readonly file: string;
  readonly lines: readonly [number, number];
  readonly unredactedExcerpt: string;
  readonly provenance: EvidenceProvenance;
}

export interface ClassifiedCandidateDraft {
  readonly seedDiscoveryKey: string;
  readonly discoveryKey: string;
  readonly role: 'related';
  readonly location: EvidenceLocation;
  readonly provenance: EvidenceProvenance;
  readonly reasonCodes: readonly CandidateReasonCode[];
  readonly promotionRequirements: readonly PromotionRequirementCode[];
}

export interface CandidatePolicyResult {
  readonly candidates: readonly ClassifiedCandidateDraft[];
  readonly truncated: boolean;
}

interface CandidateReasonPolicy {
  readonly owner: 'F3' | 'F5' | 'F6';
  readonly role: CandidateEvidence['role'];
  readonly promotionRequirements: readonly PromotionRequirementCode[];
}

function promotionSet(
  ...codes: readonly PromotionRequirementCode[]
): readonly PromotionRequirementCode[] {
  return Object.freeze(codes);
}

export const CANDIDATE_REASON_POLICY = Object.freeze({
  EXACT_TERM_WITHOUT_DIRECT_MAPPING: Object.freeze({
    owner: 'F3',
    role: 'reference',
    promotionRequirements: promotionSet(
      'USER_SEMANTIC_CONFIRMATION',
      'DIRECT_REFERENCE_REQUIRED',
    ),
  }),
  SYMBOL_REFERENCE_ONLY: Object.freeze({
    owner: 'F3',
    role: 'reference',
    promotionRequirements: promotionSet(
      'DIRECT_REFERENCE_REQUIRED',
      'CALL_PATH_REQUIRED',
    ),
  }),
  SAME_SCOPE_SIMILAR_IDENTIFIER: Object.freeze({
    owner: 'F5',
    role: 'related',
    promotionRequirements: promotionSet(
      'USER_SEMANTIC_CONFIRMATION',
      'DIRECT_REFERENCE_REQUIRED',
    ),
  }),
  SAME_ENTITY_SIBLING: Object.freeze({
    owner: 'F5',
    role: 'related',
    promotionRequirements: promotionSet(
      'USER_SEMANTIC_CONFIRMATION',
      'DIRECT_REFERENCE_REQUIRED',
    ),
  }),
  ALIAS_SOURCE_NEIGHBOR: Object.freeze({
    owner: 'F5',
    role: 'related',
    promotionRequirements: promotionSet(
      'USER_SEMANTIC_CONFIRMATION',
      'DIRECT_REFERENCE_REQUIRED',
    ),
  }),
  SECONDARY_BACKEND_HIT: Object.freeze({
    owner: 'F6',
    role: 'related',
    promotionRequirements: promotionSet('DIRECT_REFERENCE_REQUIRED'),
  }),
} satisfies Readonly<Record<CandidateReasonCode, CandidateReasonPolicy>>);

const IDENTIFIER_PATTERN = /(?:[$_]|\p{ID_Start})(?:[$_\u200C\u200D]|\p{ID_Continue})*/gu;
const MAX_CONTEXT_LINES = 12;
const MAX_CONTEXT_BYTES = 4 * 1024;
const DERIVED_PROVENANCE = Object.freeze({
  discoveredBy: Object.freeze(['filesystem'] as const),
  verifiedBy: 'filesystem' as const,
  operations: Object.freeze(['FILESYSTEM_FIND_MATCHES'] as const),
});
const KEYWORDS = new Set([
  'as',
  'bigint',
  'boolean',
  'class',
  'const',
  'create',
  'export',
  'extends',
  'false',
  'from',
  'function',
  'import',
  'interface',
  'number',
  'let',
  'new',
  'null',
  'return',
  'select',
  'table',
  'string',
  'true',
  'type',
  'undefined',
  'unknown',
  'var',
  'void',
]);
const DERIVED_SELECTION_PRIORITY = Object.freeze({
  ALIAS_SOURCE_NEIGHBOR: 0,
  SAME_ENTITY_SIBLING: 1,
  SAME_SCOPE_SIMILAR_IDENTIFIER: 2,
} as const);

interface IdentifierToken {
  readonly value: string;
  readonly normalizedValue: string;
  readonly start: number;
  readonly end: number;
  readonly line: number;
}

interface BalancedRange {
  readonly start: number;
  readonly end: number;
  readonly kind: 'brace' | 'paren' | 'bracket';
  readonly containerKind:
    | 'scope'
    | 'object'
    | 'declaration'
    | 'sql-table'
    | 'paren'
    | 'bracket';
}

interface BalancedStructure {
  readonly ranges: readonly BalancedRange[];
  readonly complete: boolean;
}

function compareText(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function orderedUnique<T extends string>(
  values: readonly T[],
  order: readonly T[],
): readonly T[] {
  const priority = new Map(order.map((value, index) => [value, index]));
  return Object.freeze(
    Array.from(new Set(values)).sort(
      (left, right) =>
        (priority.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (priority.get(right) ?? Number.MAX_SAFE_INTEGER),
    ),
  );
}

export function promotionRequirementsForReasons(
  reasonCodes: readonly CandidateReasonCode[],
): readonly PromotionRequirementCode[] {
  return orderedUnique(
    reasonCodes.flatMap(
      (reasonCode) => CANDIDATE_REASON_POLICY[reasonCode].promotionRequirements,
    ),
    PROMOTION_REQUIREMENT_CODES,
  );
}

export function secondaryBackendCandidateReasons(
  discoveredBy: readonly EvidenceSource[],
  primaryAttempted: boolean,
): readonly CandidateReasonCode[] {
  const reasons: readonly CandidateReasonCode[] = primaryAttempted &&
    discoveredBy.length === 1 &&
    discoveredBy[0] === 'ripgrep'
    ? ['SECONDARY_BACKEND_HIT']
    : [];
  return Object.freeze(reasons);
}

export function createVerifiedCandidateContext(
  record: DiscoveryRecord,
  location: EvidenceLocation = record.location,
): VerifiedCandidateContext {
  return Object.freeze({
    seedDiscoveryKey: record.discoveryKey,
    file: location.file,
    lines: location.lines,
    unredactedExcerpt: location.excerpt,
    provenance: Object.freeze({
      discoveredBy: record.discoveredBy,
      verifiedBy: 'filesystem',
      operations: record.operations,
    }),
  });
}

function identifierTokens(masked: string, firstLine: number): readonly IdentifierToken[] {
  return Object.freeze(
    Array.from(masked.matchAll(IDENTIFIER_PATTERN)).flatMap((match) => {
      if (match.index === undefined) {
        return [];
      }
      const value = match[0];
      const normalizedValue = value.normalize('NFKC').toLocaleLowerCase('und');
      if (KEYWORDS.has(normalizedValue)) {
        return [];
      }
      const line =
        firstLine + (masked.slice(0, match.index).match(/\n/gu)?.length ?? 0);
      return [{
        value,
        normalizedValue,
        start: match.index,
        end: match.index + value.length,
        line,
      }];
    }),
  );
}

function identifierSegments(value: string): readonly string[] {
  const separated = value
    .normalize('NFKC')
    .replace(/([\p{Ll}\p{N}])([\p{Lu}])/gu, '$1 $2')
    .replace(/([\p{Lu}])([\p{Lu}][\p{Ll}])/gu, '$1 $2')
    .replace(/([\p{L}])([\p{N}])/gu, '$1 $2')
    .replace(/([\p{N}])([\p{L}])/gu, '$1 $2');
  return Object.freeze(
    separated
      .split(/[_$\s]+/u)
      .filter((segment) => segment.length > 0)
      .map((segment) => segment.toLocaleLowerCase('und')),
  );
}

function oneSegmentApart(leftValue: string, rightValue: string): boolean {
  const left = identifierSegments(leftValue);
  const right = identifierSegments(rightValue);
  if (!left.some((segment) => segment.length > 1 && right.includes(segment))) {
    return false;
  }
  if (Math.abs(left.length - right.length) > 1) {
    return false;
  }
  if (left.length === right.length) {
    return left.filter((segment, index) => segment !== right[index]).length === 1;
  }
  const shorter = left.length < right.length ? left : right;
  const longer = left.length < right.length ? right : left;
  for (let omitted = 0; omitted < longer.length; omitted += 1) {
    const candidate = longer.filter((_segment, index) => index !== omitted);
    if (candidate.every((segment, index) => segment === shorter[index])) {
      return true;
    }
  }
  return false;
}

function balancedStructure(masked: string): BalancedStructure {
  const ranges: BalancedRange[] = [];
  const stack: {
    readonly delimiter: '{' | '(' | '[';
    readonly start: number;
  }[] = [];
  let complete = true;
  for (let index = 0; index < masked.length; index += 1) {
    const character = masked[index];
    if (character === '{' || character === '(' || character === '[') {
      stack.push({ delimiter: character, start: index });
      continue;
    }
    if (character !== '}' && character !== ')' && character !== ']') {
      continue;
    }
    const expected = character === '}' ? '{' : character === ')' ? '(' : '[';
    const opened = stack.at(-1);
    if (opened?.delimiter !== expected) {
      complete = false;
      continue;
    }
    stack.pop();
    const prefix = masked.slice(0, opened.start).trimEnd();
    if (expected === '{') {
      const declaration =
        /\b(?:class|interface)\s+[$_\p{ID_Start}][^{};]*$/iu.test(prefix) ||
        /\btype\s+[$_\p{ID_Start}][^{};=]*=\s*$/iu.test(prefix) ||
        /\b(?:as|satisfies)\s*$/iu.test(prefix) ||
        (/:\s*$/u.test(prefix) &&
          /^\s*(?:=|;|\||&|>|\]|\)|\}|\{)/u.test(
            masked.slice(index + 1),
          ));
      const object =
        !declaration &&
        (/\breturn$/iu.test(prefix) || /[=(:,]\s*$/u.test(prefix));
      ranges.push({
        start: opened.start,
        end: index + 1,
        kind: 'brace',
        containerKind: declaration
          ? 'declaration'
          : object
            ? 'object'
            : 'scope',
      });
    } else if (expected === '(') {
      ranges.push({
        start: opened.start,
        end: index + 1,
        kind: 'paren',
        containerKind: /\bCREATE\s+TABLE\b[^;()]*$/iu.test(
          masked.slice(0, opened.start),
        )
          ? 'sql-table'
          : 'paren',
      });
    } else {
      ranges.push({
        start: opened.start,
        end: index + 1,
        kind: 'bracket',
        containerKind: 'bracket',
      });
    }
  }
  if (stack.length > 0) {
    complete = false;
  }
  return Object.freeze({
    ranges: Object.freeze(
      ranges.sort(
      (left, right) =>
          left.start - right.start ||
          left.end - right.end ||
          compareText(left.kind, right.kind),
      ),
    ),
    complete,
  });
}

function innermostOwnedRange(
  ranges: readonly BalancedRange[],
  token: IdentifierToken,
  predicate: (range: BalancedRange) => boolean,
): BalancedRange | undefined {
  return ranges
    .filter(
      (range) =>
        predicate(range) &&
        range.start < token.start &&
        range.end >= token.end,
    )
    .sort(
      (first, second) =>
        first.end - first.start - (second.end - second.start),
    )[0];
}

function sameRange(
  left: BalancedRange | undefined,
  right: BalancedRange | undefined,
): boolean {
  return (
    left !== undefined &&
    right !== undefined &&
    left.start === right.start &&
    left.end === right.end &&
    left.kind === right.kind &&
    left.containerKind === right.containerKind
  );
}

function entityOwner(
  structure: BalancedStructure,
  token: IdentifierToken,
): BalancedRange | undefined {
  return innermostOwnedRange(
    structure.ranges,
    token,
    (range) =>
      range.containerKind === 'object' ||
      range.containerKind === 'declaration' ||
      range.containerKind === 'sql-table',
  );
}

function directBraceOwner(
  structure: BalancedStructure,
  token: IdentifierToken,
): BalancedRange | undefined {
  return innermostOwnedRange(
    structure.ranges,
    token,
    (range) => range.kind === 'brace',
  );
}

function isPropertyOrColumn(
  masked: string,
  token: IdentifierToken,
  range: BalancedRange,
  structure: BalancedStructure,
): boolean {
  const tail = masked.slice(token.end, range.end);
  if (range.kind === 'brace') {
    if (!sameRange(directBraceOwner(structure, token), range)) {
      return false;
    }
    return /^\s*\??\s*(?::|=)/u.test(tail);
  }
  const previous = masked.slice(range.start + 1, token.start).trimEnd().at(-1);
  return (
    (previous === undefined || previous === ',' || previous === '(') &&
    /^\s+(?:bigint|boolean|date|decimal|integer|jsonb?|numeric|text|timestamp|uuid|varchar)\b/iu.test(
      tail,
    )
  );
}

function aliasNeighbors(
  masked: string,
  file: string,
  left: IdentifierToken,
  right: IdentifierToken,
  structure: BalancedStructure,
): boolean {
  const first = left.start < right.start ? left : right;
  const second = first === left ? right : left;
  const between = masked.slice(first.end, second.start).trim();
  if (!/^(?::|=|,|AS)$/iu.test(between)) {
    return false;
  }
  if (left.line !== right.line) {
    return false;
  }
  if (between.toLocaleUpperCase('und') === 'AS') {
    return file.toLocaleLowerCase('und').endsWith('.sql');
  }
  const sharedParen = sameRange(
    innermostOwnedRange(
      structure.ranges,
      left,
      (range) => range.kind === 'paren',
    ),
    innermostOwnedRange(
      structure.ranges,
      right,
      (range) => range.kind === 'paren',
    ),
  );
  if (between === '=') {
    return !sharedParen;
  }
  if (!structure.complete) {
    return false;
  }
  const firstOwner = entityOwner(structure, first);
  const secondOwner = entityOwner(structure, second);
  if (
    firstOwner === undefined ||
    secondOwner === undefined ||
    !sameRange(firstOwner, secondOwner) ||
    firstOwner.containerKind !== 'object'
  ) {
    return false;
  }
  if (between === ':') {
    return isPropertyOrColumn(masked, first, firstOwner, structure);
  }
  return (
    directBraceOwner(structure, first)?.start === firstOwner.start &&
    directBraceOwner(structure, second)?.start === firstOwner.start &&
    /^\s*(?:,|\})/u.test(masked.slice(first.end, firstOwner.end)) &&
    /^\s*(?:,|\})/u.test(masked.slice(second.end, secondOwner.end))
  );
}

function sameEntitySibling(
  masked: string,
  left: IdentifierToken,
  right: IdentifierToken,
  structure: BalancedStructure,
): boolean {
  if (!structure.complete) {
    return false;
  }
  const leftOwner = entityOwner(structure, left);
  const rightOwner = entityOwner(structure, right);
  if (
    leftOwner === undefined ||
    rightOwner === undefined ||
    !sameRange(leftOwner, rightOwner)
  ) {
    return false;
  }
  return (
    isPropertyOrColumn(masked, left, leftOwner, structure) &&
    isPropertyOrColumn(masked, right, rightOwner, structure)
  );
}

function isTypePositionToken(
  masked: string,
  token: IdentifierToken,
  structure: BalancedStructure,
): boolean {
  const statementPrefix = masked.slice(0, token.start);
  const boundary = Math.max(
    statementPrefix.lastIndexOf(';'),
    statementPrefix.lastIndexOf('\n'),
    statementPrefix.lastIndexOf('{'),
    statementPrefix.lastIndexOf('}'),
  );
  const prefix = statementPrefix.slice(boundary + 1);
  if (
    /\b(?:as|satisfies)\b[^;=\n]*$/iu.test(prefix) ||
    isInsideAngleType(masked, token, boundary)
  ) {
    return true;
  }
  const owner = entityOwner(structure, token);
  if (
    owner?.containerKind === 'object' &&
    sameRange(directBraceOwner(structure, token), owner)
  ) {
    return false;
  }
  if (
    owner !== undefined &&
    isPropertyOrColumn(masked, token, owner, structure)
  ) {
    return false;
  }
  return prefix.includes(':');
}

function isInsideAngleType(
  masked: string,
  token: IdentifierToken,
  statementBoundary: number,
): boolean {
  let nestedClosings = 0;
  for (let index = token.start - 1; index > statementBoundary; index -= 1) {
    const character = masked[index];
    if (character === '>') {
      nestedClosings += 1;
      continue;
    }
    if (character !== '<') {
      continue;
    }
    if (nestedClosings > 0) {
      nestedClosings -= 1;
      continue;
    }
    let depth = 1;
    for (let closing = index + 1; closing < masked.length; closing += 1) {
      const closingCharacter = masked[closing];
      if (closingCharacter === '<') {
        depth += 1;
      } else if (closingCharacter === '>') {
        depth -= 1;
        if (depth === 0) {
          return closing >= token.end;
        }
      } else if (
        depth === 1 &&
        (closingCharacter === ';' ||
          closingCharacter === '\n' ||
          closingCharacter === '{' ||
          closingCharacter === '}')
      ) {
        return false;
      }
    }
    return false;
  }
  return false;
}

function sameScopeSimilar(
  masked: string,
  left: IdentifierToken,
  right: IdentifierToken,
  structure: BalancedStructure,
): boolean {
  if (
    !structure.complete ||
    isTypePositionToken(masked, left, structure) ||
    isTypePositionToken(masked, right, structure)
  ) {
    return false;
  }
  return (
    sameRange(
      directBraceOwner(structure, left),
      directBraceOwner(structure, right),
    ) &&
    oneSegmentApart(left.value, right.value)
  );
}

function contextSizeIsValid(context: VerifiedCandidateContext): boolean {
  const excerptLines = context.unredactedExcerpt.split('\n').length;
  return (
    excerptLines <= MAX_CONTEXT_LINES &&
    Buffer.byteLength(context.unredactedExcerpt, 'utf8') <= MAX_CONTEXT_BYTES &&
    context.lines[0] >= 1 &&
    context.lines[0] <= context.lines[1] &&
    context.lines[1] - context.lines[0] + 1 === excerptLines
  );
}

function contextContainsVerifiedFocus(
  context: VerifiedCandidateContext,
  record: DiscoveryRecord,
): boolean {
  if (
    context.lines[0] > record.focusLines[0] ||
    context.lines[1] < record.focusLines[1]
  ) {
    return false;
  }
  const contextLines = context.unredactedExcerpt.split('\n');
  const start = record.focusLines[0] - context.lines[0];
  const length = record.focusLines[1] - record.focusLines[0] + 1;
  return (
    normalizeEvidenceExcerpt(contextLines.slice(start, start + length).join('\n')) ===
    normalizeEvidenceExcerpt(record.focusExcerpt)
  );
}

function arraysEqual<T>(left: readonly T[], right: readonly T[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function validateInput(input: CandidatePolicyInput): ReadonlyMap<string, DiscoveryRecord> {
  if (!Number.isInteger(input.maxCandidates) || input.maxCandidates < 0) {
    throw new Error('Candidate maxCandidates must be a non-negative integer.');
  }
  const records = new Map<string, DiscoveryRecord>();
  for (const record of input.records) {
    if (records.has(record.discoveryKey)) {
      throw new Error(`Duplicate discovery record key: ${record.discoveryKey}`);
    }
    records.set(record.discoveryKey, record);
  }
  const bySeed = new Map<string, VerifiedCandidateContext[]>();
  for (const context of input.contexts) {
    const record = records.get(context.seedDiscoveryKey);
    if (record === undefined) {
      throw new Error(`Candidate context references an unknown seed: ${context.seedDiscoveryKey}`);
    }
    if (
      context.file !== record.location.file ||
      !contextContainsVerifiedFocus(context, record) ||
      !contextSizeIsValid(context) ||
      context.provenance.verifiedBy !== 'filesystem' ||
      !arraysEqual(context.provenance.discoveredBy, record.discoveredBy) ||
      !arraysEqual(context.provenance.operations, record.operations)
    ) {
      throw new Error(`Candidate context violates the verified seed boundary: ${context.seedDiscoveryKey}`);
    }
    const siblings = bySeed.get(context.seedDiscoveryKey) ?? [];
    if (
      siblings.some(
        (sibling) =>
          sibling.file !== context.file ||
          sibling.lines[0] <= context.lines[1] && context.lines[0] <= sibling.lines[1],
      )
    ) {
      throw new Error(`Candidate contexts conflict for seed: ${context.seedDiscoveryKey}`);
    }
    siblings.push(context);
    bySeed.set(context.seedDiscoveryKey, siblings);
  }
  return records;
}

function isTestOrDocsFile(file: string): boolean {
  const normalized = file.replaceAll('\\', '/').toLocaleLowerCase('und');
  return /(?:^|\/)(?:__tests__|docs?|examples|fixtures?|specs?|tests?)(?:\/|$)/u.test(
    normalized,
  ) || /\.(?:md|mdx|rst|adoc|spec|test)(?:\.|$)/u.test(normalized);
}

function isReservedToken(
  token: IdentifierToken,
  context: VerifiedCandidateContext,
  records: readonly DiscoveryRecord[],
): boolean {
  return records.some((record) => {
    if (
      record.location.file !== context.file ||
      token.line < record.focusLines[0] ||
      token.line > record.focusLines[1]
    ) {
      return false;
    }
    return [...record.matchedTerms.map((term) => term.value), ...record.canonicalSymbols]
      .map((value) => value.normalize('NFKC').toLocaleLowerCase('und'))
      .includes(token.normalizedValue);
  });
}

function draftFor(
  context: VerifiedCandidateContext,
  token: IdentifierToken,
  reasonCodes: readonly CandidateReasonCode[],
): ClassifiedCandidateDraft {
  const location = Object.freeze({
    file: context.file,
    symbol: token.value,
    lines: Object.freeze([token.line, token.line] as const),
    excerpt: token.value,
  });
  return Object.freeze({
    seedDiscoveryKey: context.seedDiscoveryKey,
    discoveryKey: createDiscoveryKey(location),
    role: 'related',
    location,
    provenance: DERIVED_PROVENANCE,
    reasonCodes: orderedUnique(reasonCodes, CANDIDATE_REASON_CODES),
    promotionRequirements: promotionRequirementsForReasons(reasonCodes),
  });
}

function draftPriority(draft: ClassifiedCandidateDraft): number {
  return Math.min(
    ...draft.reasonCodes.flatMap((reasonCode) =>
      reasonCode in DERIVED_SELECTION_PRIORITY
        ? [DERIVED_SELECTION_PRIORITY[reasonCode as keyof typeof DERIVED_SELECTION_PRIORITY]]
        : [],
    ),
  );
}

function compareDraftSelection(
  left: ClassifiedCandidateDraft,
  right: ClassifiedCandidateDraft,
): number {
  return (
    draftPriority(left) - draftPriority(right) ||
    compareText(left.location.file, right.location.file) ||
    left.location.lines[0] - right.location.lines[0] ||
    left.location.lines[1] - right.location.lines[1] ||
    compareText(left.discoveryKey, right.discoveryKey)
  );
}

function mergeDraft(
  current: ClassifiedCandidateDraft,
  incoming: ClassifiedCandidateDraft,
): ClassifiedCandidateDraft {
  if (
    current.location.file !== incoming.location.file ||
    current.location.lines[0] !== incoming.location.lines[0] ||
    current.location.lines[1] !== incoming.location.lines[1] ||
    current.location.excerpt !== incoming.location.excerpt
  ) {
    throw new Error(`Candidate discovery key has conflicting locations: ${current.discoveryKey}`);
  }
  const reasonCodes = orderedUnique(
    [...current.reasonCodes, ...incoming.reasonCodes],
    CANDIDATE_REASON_CODES,
  );
  return Object.freeze({
    ...current,
    seedDiscoveryKey:
      compareText(current.seedDiscoveryKey, incoming.seedDiscoveryKey) <= 0
        ? current.seedDiscoveryKey
        : incoming.seedDiscoveryKey,
    reasonCodes,
    promotionRequirements: promotionRequirementsForReasons(reasonCodes),
  });
}

function insertBounded(
  queue: ClassifiedCandidateDraft[],
  draft: ClassifiedCandidateDraft,
  capacity: number,
): boolean {
  const existingIndex = queue.findIndex(
    (candidate) => candidate.discoveryKey === draft.discoveryKey,
  );
  if (existingIndex >= 0) {
    const current = queue[existingIndex];
    if (current !== undefined) {
      queue[existingIndex] = mergeDraft(current, draft);
    }
    queue.sort(compareDraftSelection);
    return false;
  }
  if (capacity === 0) {
    return true;
  }
  queue.push(draft);
  queue.sort(compareDraftSelection);
  if (queue.length <= capacity) {
    return false;
  }
  queue.pop();
  return true;
}

function reasonsForToken(
  masked: string,
  file: string,
  token: IdentifierToken,
  seeds: readonly IdentifierToken[],
  structure: BalancedStructure,
): readonly CandidateReasonCode[] {
  const reasons: CandidateReasonCode[] = [];
  for (const seed of seeds) {
    if (aliasNeighbors(masked, file, seed, token, structure)) {
      reasons.push('ALIAS_SOURCE_NEIGHBOR');
    }
    if (sameEntitySibling(masked, seed, token, structure)) {
      reasons.push('SAME_ENTITY_SIBLING');
    }
    if (sameScopeSimilar(masked, seed, token, structure)) {
      reasons.push('SAME_SCOPE_SIMILAR_IDENTIFIER');
    }
  }
  return orderedUnique(reasons, CANDIDATE_REASON_CODES);
}

function* draftsForContext(
  context: VerifiedCandidateContext,
  seedRecord: DiscoveryRecord,
  records: readonly DiscoveryRecord[],
  signal: AbortSignal,
): Generator<ClassifiedCandidateDraft, void, undefined> {
  if (signal.aborted || isTestOrDocsFile(context.file)) {
    return;
  }
  const sql = context.file.toLocaleLowerCase('und').endsWith('.sql');
  const masked = sql
    ? maskSqlNonCode(context.unredactedExcerpt)
    : maskNonCode(context.unredactedExcerpt);
  const tokens = identifierTokens(masked, context.lines[0]);
  const structure = balancedStructure(masked);
  const seedValues = new Set(
    [...seedRecord.matchedTerms.map((term) => term.value), ...seedRecord.canonicalSymbols]
      .map((value) => value.normalize('NFKC').toLocaleLowerCase('und')),
  );
  const seeds = tokens.filter(
    (token) =>
      seedValues.has(token.normalizedValue) &&
      (sql || !isTypePositionToken(masked, token, structure)),
  );
  if (seeds.length === 0) {
    return;
  }
  for (const token of tokens) {
    if (signal.aborted) {
      return;
    }
    if (
      seedValues.has(token.normalizedValue) ||
      isReservedToken(token, context, records) ||
      (!sql && isTypePositionToken(masked, token, structure)) ||
      masked.slice(token.end).trimStart().startsWith('.')
    ) {
      continue;
    }
    const reasonCodes = reasonsForToken(
      masked,
      context.file,
      token,
      seeds,
      structure,
    );
    if (reasonCodes.length > 0) {
      yield draftFor(context, token, reasonCodes);
    }
  }
}

export function applyCandidatePolicy(input: CandidatePolicyInput): CandidatePolicyResult {
  const recordsByKey = validateInput(input);
  const records = Array.from(recordsByKey.values());
  const queue: ClassifiedCandidateDraft[] = [];
  let truncated = false;
  const contexts = [...input.contexts].sort(
    (left, right) =>
      compareText(left.seedDiscoveryKey, right.seedDiscoveryKey) ||
      compareText(left.file, right.file) ||
      left.lines[0] - right.lines[0] ||
      left.lines[1] - right.lines[1],
  );

  for (const context of contexts) {
    if (input.signal.aborted) {
      break;
    }
    const seedRecord = recordsByKey.get(context.seedDiscoveryKey);
    if (seedRecord === undefined) {
      throw new Error(`Candidate seed disappeared: ${context.seedDiscoveryKey}`);
    }
    for (const draft of draftsForContext(
      context,
      seedRecord,
      records,
      input.signal,
    )) {
      truncated =
        insertBounded(
          queue,
          draft,
          input.maxCandidates,
        ) || truncated;
    }
  }

  const retained = new Map(
    queue.map((candidate) => [candidate.discoveryKey, candidate]),
  );
  if (retained.size > 0) {
    for (const context of contexts) {
      const seedRecord = recordsByKey.get(context.seedDiscoveryKey);
      if (seedRecord === undefined) {
        throw new Error(`Candidate seed disappeared: ${context.seedDiscoveryKey}`);
      }
      for (const draft of draftsForContext(
        context,
        seedRecord,
        records,
        input.signal,
      )) {
        const current = retained.get(draft.discoveryKey);
        if (current !== undefined) {
          retained.set(draft.discoveryKey, mergeDraft(current, draft));
        }
      }
    }
  }

  return Object.freeze({
    candidates: Object.freeze(
      queue
        .map((candidate) => retained.get(candidate.discoveryKey) ?? candidate)
        .sort(compareDraftSelection),
    ),
    truncated,
  });
}

export function materializeCandidateDraft(
  draft: ClassifiedCandidateDraft,
): CandidateEvidence {
  return Object.freeze({
    evidenceClass: 'candidate',
    id: createEvidenceId(draft.discoveryKey, 'candidate', draft.role),
    role: draft.role,
    location: draft.location,
    provenance: draft.provenance,
    reasonCodes: draft.reasonCodes,
    promotionRequirements: draft.promotionRequirements,
  });
}
