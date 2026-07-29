import {
  comparePublicEvidence,
  createEvidenceId,
  type CandidateEvidence,
  type ConfirmedEvidence,
  type ExclusionReasonCode,
  type NormalizedLocateAnchor,
  type NormalizedSearchTerm,
  type RepoLayer,
} from '../contracts/index.js';
import type { DiscoveryRecord } from './discovery-record.js';
import { secondaryBackendCandidateReasons } from './candidate-policy.js';
import {
  legacyResolveRepositoryLayerV1,
  resolveRepositoryLayerV1,
  resolveRepositoryScopeV1,
} from './scope/index.js';
import { maskNonCode } from './language/ecmascript-lexical-kernel-v2.js';
import { maskSqlNonCode } from './language/sql-lexical-kernel-v2.js';

export { maskNonCode } from './language/ecmascript-lexical-kernel-v2.js';
export { maskSqlNonCode } from './language/sql-lexical-kernel-v2.js';

export interface ClassificationContext {
  readonly anchors: readonly NormalizedLocateAnchor[];
  readonly layers: readonly RepoLayer[];
  readonly negativeTerms: readonly NormalizedSearchTerm[];
  readonly primaryAttempted?: boolean;
}

export interface ClassificationResult {
  readonly confirmed: readonly ConfirmedEvidence[];
  readonly candidates: readonly CandidateEvidence[];
  readonly exclusionSummary: Readonly<
    Partial<Record<ExclusionReasonCode, number>>
  >;
  readonly recordsClassified: number;
}

type Classification =
  | {
      readonly evidenceClass: 'confirmed';
      readonly role: ConfirmedEvidence['role'];
      readonly reasonCodes: ConfirmedEvidence['reasonCodes'];
      readonly canonicalSymbol?: string;
    }
  | {
      readonly evidenceClass: 'candidate';
      readonly role: CandidateEvidence['role'];
      readonly reasonCodes: CandidateEvidence['reasonCodes'];
      readonly promotionRequirements: CandidateEvidence['promotionRequirements'];
      readonly canonicalSymbol?: string;
    };

const MAX_CLASSIFICATION_LINES = 12;
const MAX_CLASSIFICATION_BYTES = 4 * 1024;

function comparisonText(value: string, caseSensitive: boolean): string {
  return caseSensitive ? value : value.toLocaleLowerCase('und');
}

function exactValueMatches(
  actual: string,
  expected: string,
  caseSensitive: boolean,
): boolean {
  return (
    comparisonText(actual, caseSensitive) ===
    comparisonText(expected, caseSensitive)
  );
}

function containsTerm(excerpt: string, term: NormalizedSearchTerm): boolean {
  return comparisonText(excerpt, term.caseSensitive).includes(
    comparisonText(term.value, term.caseSensitive),
  );
}

/**
 * Compatible export：repo-scope-v1 layer classification。
 * S1 characterization 另见 `legacyResolveRepositoryLayerV1`。
 */
export function resolveRepositoryLayer(file: string): RepoLayer {
  return resolveRepositoryLayerV1(file);
}

/** @deprecated S1 characterization only — frozen pre-policy semantics. */
export const resolveRepositoryLayerLegacyForCharacterization =
  legacyResolveRepositoryLayerV1;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function tokenPattern(value: string): string {
  return `(?<![\\p{L}\\p{N}_$])(${escapeRegExp(value)})(?![\\p{L}\\p{N}_$])`;
}

function exactPairMatches(
  text: string,
  target: NormalizedSearchTerm,
  source: NormalizedSearchTerm,
  middlePattern: string,
): boolean {
  return exactPairRanges(text, target, source, middlePattern).length > 0;
}

function exactPairRanges(
  text: string,
  target: NormalizedSearchTerm,
  source: NormalizedSearchTerm,
  middlePattern: string,
): readonly { readonly start: number; readonly end: number }[] {
  const expression = new RegExp(
    `${tokenPattern(target.value)}${middlePattern}${tokenPattern(source.value)}`,
    'giu',
  );
  return Array.from(text.matchAll(expression)).flatMap((match) => {
    const actualTarget = match[1];
    const actualSource = match[2];
    const matches =
      actualTarget !== undefined &&
      actualSource !== undefined &&
      exactValueMatches(actualTarget, target.value, target.caseSensitive) &&
      exactValueMatches(actualSource, source.value, source.caseSensitive);
    return matches && match.index !== undefined
      ? [{ start: match.index, end: match.index + match[0].length }]
      : [];
  });
}

function termPairs(
  terms: readonly NormalizedSearchTerm[],
): readonly (readonly [NormalizedSearchTerm, NormalizedSearchTerm])[] {
  return terms.flatMap((target) =>
    terms
      .filter((source) => source !== target)
      .map((source) => [target, source] as const),
  );
}

function spacesPreservingLines(value: string): string {
  return value.replace(/[^\n]/gu, ' ');
}

function maskDeclarationDecoys(code: string): string {
  return code
    .replace(
      /\b(?:export\s+)?(?:declare\s+)?(?:interface|enum|namespace)\b[^{}]*\{[^{}]*\}/giu,
      spacesPreservingLines,
    )
    .replace(
      /\b(?:export\s+)?(?:declare\s+)?type\b[^;\n]*(?:;|$)/giu,
      spacesPreservingLines,
    )
    .replace(/@[\p{L}_$][^\n]*/giu, spacesPreservingLines);
}

function hasAssignmentMapping(
  code: string,
  terms: readonly NormalizedSearchTerm[],
): boolean {
  return termPairs(terms).some(([target, source]) =>
    exactPairMatches(code, target, source, '\\s*=\\s*'),
  );
}

function hasObjectMapping(
  windowCode: string,
  focusCode: string,
  terms: readonly NormalizedSearchTerm[],
): boolean {
  const focusOffset = Math.max(0, windowCode.length - focusCode.length);
  return termPairs(terms).some(([target, source]) =>
    exactPairRanges(focusCode, target, source, '\\s*:\\s*').some((pair) => {
      const pairStart = focusOffset + pair.start;
      const openBrace = windowCode.lastIndexOf('{', pairStart);
      const closeBrace = windowCode.lastIndexOf('}', pairStart);
      if (openBrace < 0 || openBrace < closeBrace) {
        return false;
      }
      const beforeOpen = windowCode.slice(0, openBrace).trimEnd();
      return (
        /\breturn$/iu.test(beforeOpen) ||
        /=$/u.test(beforeOpen) ||
        /[\p{L}_$][\p{L}\p{N}_$]*\s*\($/iu.test(beforeOpen)
      );
    }),
  );
}

function containsSqlAlias(
  sql: string,
  terms: readonly NormalizedSearchTerm[],
): boolean {
  return termPairs(terms).some(([source, target]) =>
    exactPairMatches(sql, source, target, '\\s+AS\\s+'),
  );
}

function sqlCallArguments(excerpt: string): readonly string[] {
  const code = maskNonCode(excerpt);
  const callPattern = /\b(?:query|select|addSelect)\s*\(/giu;
  const argumentsFound: string[] = [];
  for (const match of code.matchAll(callPattern)) {
    if (match.index === undefined) {
      continue;
    }
    let index = match.index + match[0].length;
    while (/\s/u.test(excerpt[index] ?? '')) {
      index += 1;
    }
    const quote = excerpt[index];
    if (quote !== '"' && quote !== "'" && quote !== '`') {
      continue;
    }
    const start = index + 1;
    let escaped = false;
    for (index = start; index < excerpt.length; index += 1) {
      const character = excerpt[index] ?? '';
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        argumentsFound.push(excerpt.slice(start, index));
        break;
      }
    }
  }
  return Object.freeze(argumentsFound);
}

function hasSqlAliasMapping(record: DiscoveryRecord): boolean {
  if (record.location.file.toLowerCase().endsWith('.sql')) {
    return containsSqlAlias(
      maskSqlNonCode(record.focusExcerpt),
      record.matchedTerms,
    );
  }
  return sqlCallArguments(record.focusExcerpt).some(
    (argument) =>
      !argument.includes('${') &&
      containsSqlAlias(maskSqlNonCode(argument), record.matchedTerms),
  );
}

function anchoredSymbolsFor(
  record: DiscoveryRecord,
  anchors: readonly NormalizedLocateAnchor[],
): readonly string[] {
  return record.canonicalSymbols.filter((symbol) =>
    anchors.some(
      (anchor) =>
        anchor.kind === 'symbol' &&
        exactValueMatches(symbol, anchor.value, anchor.caseSensitive),
    ),
  );
}

function symbolDefinitionRole(
  code: string,
  symbol: string,
): ConfirmedEvidence['role'] | undefined {
  const token = tokenPattern(symbol);
  if (
    new RegExp(`\\b(?:class|interface|enum)\\s+${token}[^{};]*\\{`, 'u').test(
      code,
    ) ||
    new RegExp(`\\btype\\s+${token}[^;=]*=\\s*\\{`, 'u').test(code)
  ) {
    return 'definition';
  }
  if (
    new RegExp(
      `(?:\\b(?:async\\s+)?function\\s+${token}\\s*\\([^)]*\\)[^{;]*\\{|\\b(?:const|let|var)\\s+${token}\\s*=\\s*(?:async\\s*)?(?:function\\b|\\([^)]*\\)\\s*=>|[\\p{L}_$][\\p{L}\\p{N}_$]*\\s*=>|class\\b))`,
      'u',
    ).test(code) ||
    new RegExp(
      `(?:^|[;{}])\\s*(?:(?:public|protected|private|static|abstract|async|override|readonly|get|set)\\s+)*\\*?${token}\\s*(?:<[^>{}]*>)?\\([^)]*\\)\\s*(?::[^;{]+)?\\{`,
      'mu',
    ).test(code)
  ) {
    return 'execution-site';
  }
  return undefined;
}

function withinClassificationWindow(excerpt: string): boolean {
  return (
    excerpt.split('\n').length <= MAX_CLASSIFICATION_LINES &&
    Buffer.byteLength(excerpt, 'utf8') <= MAX_CLASSIFICATION_BYTES
  );
}

function classifyRecord(
  record: DiscoveryRecord,
  context: ClassificationContext,
  forceCandidate: boolean,
): Classification | undefined {
  const code = maskDeclarationDecoys(maskNonCode(record.location.excerpt));
  const focusCode = maskDeclarationDecoys(maskNonCode(record.focusExcerpt));
  const directMapping =
    withinClassificationWindow(record.location.excerpt) &&
    (hasAssignmentMapping(focusCode, record.matchedTerms) ||
      hasObjectMapping(code, focusCode, record.matchedTerms) ||
      hasSqlAliasMapping(record));
  if (directMapping && !forceCandidate) {
    return {
      evidenceClass: 'confirmed',
      role: 'value-mapping',
      reasonCodes: ['DIRECT_ALIAS_MAPPING', 'EXACT_TERM_MATCH'],
      ...(record.canonicalSymbols[0] === undefined
        ? {}
        : { canonicalSymbol: record.canonicalSymbols[0] }),
    };
  }

  const anchoredSymbols = anchoredSymbolsFor(record, context.anchors);
  if (anchoredSymbols.length > 0) {
    const definitions = anchoredSymbols
      .flatMap((symbol) => {
        const role = symbolDefinitionRole(
          maskNonCode(record.focusExcerpt),
          symbol,
        );
        return role === undefined ? [] : [{ symbol, role }];
      })
      .sort(
        (left, right) =>
          (left.role === 'execution-site' ? 0 : 1) -
            (right.role === 'execution-site' ? 0 : 1) ||
          (left.symbol === right.symbol
            ? 0
            : left.symbol < right.symbol
              ? -1
              : 1),
      );
    const primaryDefinition = definitions[0];
    if (primaryDefinition !== undefined && !forceCandidate) {
      return {
        evidenceClass: 'confirmed',
        role: primaryDefinition.role,
        reasonCodes: ['EXACT_SYMBOL_ANCHOR'],
        canonicalSymbol: primaryDefinition.symbol,
      };
    }
    const primarySymbol = primaryDefinition?.symbol ?? anchoredSymbols[0];
    return {
      evidenceClass: 'candidate',
      role: 'reference',
      reasonCodes: ['SYMBOL_REFERENCE_ONLY'],
      promotionRequirements: [
        'DIRECT_REFERENCE_REQUIRED',
        'CALL_PATH_REQUIRED',
      ],
      ...(primarySymbol === undefined
        ? {}
        : { canonicalSymbol: primarySymbol }),
    };
  }

  if (record.matchedTerms.length > 0) {
    return {
      evidenceClass: 'candidate',
      role: 'reference',
      reasonCodes: ['EXACT_TERM_WITHOUT_DIRECT_MAPPING'],
      promotionRequirements: [
        'USER_SEMANTIC_CONFIRMATION',
        'DIRECT_REFERENCE_REQUIRED',
      ],
    };
  }
  const secondaryReasons = secondaryBackendCandidateReasons(
    record.discoveredBy,
    context.primaryAttempted === true,
  );
  if (secondaryReasons.length > 0) {
    return {
      evidenceClass: 'candidate',
      role: 'related',
      reasonCodes: secondaryReasons,
      promotionRequirements: ['DIRECT_REFERENCE_REQUIRED'],
    };
  }
  return undefined;
}

function publicLocation(
  record: DiscoveryRecord,
  classification: Classification,
): ConfirmedEvidence['location'] {
  return Object.freeze({
    ...record.location,
    ...(classification.canonicalSymbol === undefined
      ? {}
      : { symbol: classification.canonicalSymbol }),
  });
}

function addExclusion(
  summary: Partial<Record<ExclusionReasonCode, number>>,
  code: ExclusionReasonCode,
  count = 1,
): void {
  summary[code] = (summary[code] ?? 0) + count;
}

export function classifyDiscoveryRecords(
  records: readonly DiscoveryRecord[],
  context: ClassificationContext,
  initialExclusions: Readonly<
    Partial<Record<ExclusionReasonCode, number>>
  > = {},
): ClassificationResult {
  const confirmed: ConfirmedEvidence[] = [];
  const candidates: CandidateEvidence[] = [];
  const exclusionSummary: Partial<Record<ExclusionReasonCode, number>> = {
    ...initialExclusions,
  };
  let recordsClassified = 0;

  for (const record of records) {
    if (
      context.negativeTerms.some((term) =>
        containsTerm(record.focusExcerpt, term),
      )
    ) {
      addExclusion(exclusionSummary, 'NEGATIVE_TERM_MATCH');
      continue;
    }

    const layer = resolveRepositoryLayer(record.location.file);
    const resolvedScope = resolveRepositoryScopeV1(context.layers);
    const included = resolvedScope.effective.includes(layer);
    const isTestOrDocs = layer === 'test' || layer === 'docs';
    if (!included) {
      addExclusion(exclusionSummary, 'OUTSIDE_LAYER_HINT');
      continue;
    }

    recordsClassified += 1;
    // 显式 test/docs = candidate-only hard ceiling
    const classification = classifyRecord(record, context, isTestOrDocs);
    if (classification === undefined) {
      addExclusion(exclusionSummary, 'UNVERIFIED_FILE_CONTENT');
      continue;
    }

    const location = publicLocation(record, classification);
    const provenance = Object.freeze({
      discoveredBy: record.discoveredBy,
      verifiedBy: 'filesystem' as const,
      operations: record.operations,
    });
    const id = createEvidenceId(
      record.discoveryKey,
      classification.evidenceClass,
      classification.role,
    );
    if (classification.evidenceClass === 'confirmed') {
      confirmed.push(
        Object.freeze({
          evidenceClass: 'confirmed',
          id,
          role: classification.role,
          location,
          provenance,
          reasonCodes: classification.reasonCodes,
        }),
      );
    } else {
      candidates.push(
        Object.freeze({
          evidenceClass: 'candidate',
          id,
          role: classification.role,
          location,
          provenance,
          reasonCodes: classification.reasonCodes,
          promotionRequirements: classification.promotionRequirements,
        }),
      );
    }
  }

  confirmed.sort(comparePublicEvidence);
  candidates.sort(comparePublicEvidence);
  return Object.freeze({
    confirmed: Object.freeze(confirmed),
    candidates: Object.freeze(candidates),
    exclusionSummary: Object.freeze(exclusionSummary),
    recordsClassified,
  });
}
