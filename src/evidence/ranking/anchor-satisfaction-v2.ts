import type { NormalizedAnchorIntentV2 } from './anchor-intent-normalizer-v2.js';
import type { TrustedStableRecordViewV2 } from '../request-snapshot/pre-ranking-evidence-pool-v2.js';
import { MATCH_PRIORITY_V2, type MatchPriorityV2 } from './match-priority-v2.js';

export type AnchorSatisfactionLevelV2 = 'confirmed' | 'candidate' | 'none';

export type UnsatisfiedAnchorReasonV2 =
  | 'NOT_FOUND'
  | 'UNVERIFIED'
  | 'BUDGET_EXCEEDED';

function draftFile(record: TrustedStableRecordViewV2): string {
  return record.draft.location.file;
}

function draftSymbol(record: TrustedStableRecordViewV2): string | undefined {
  return record.draft.location.symbol;
}

function isConfirmed(record: TrustedStableRecordViewV2): boolean {
  return record.draft.evidenceClass === 'confirmed';
}

function hasReason(
  record: TrustedStableRecordViewV2,
  code: string,
): boolean {
  const draft = record.draft;
  if (!('reasonCodes' in draft) || !Array.isArray(draft.reasonCodes)) {
    return false;
  }
  return draft.reasonCodes.includes(code as never);
}

function roleOf(record: TrustedStableRecordViewV2): string | undefined {
  const draft = record.draft;
  return 'role' in draft && typeof draft.role === 'string'
    ? draft.role
    : undefined;
}

/**
 * 计算 record 相对 anchor 的 satisfaction。
 */
export function satisfactionForAnchorV2(
  intent: NormalizedAnchorIntentV2,
  record: TrustedStableRecordViewV2,
): AnchorSatisfactionLevelV2 {
  const value = intent.caseSensitive
    ? intent.value
    : intent.value.toLocaleLowerCase('und');
  const file = draftFile(record);
  const symbol = draftSymbol(record);
  const fileCmp = intent.caseSensitive ? file : file.toLocaleLowerCase('und');
  const symbolCmp =
    symbol === undefined
      ? undefined
      : intent.caseSensitive
        ? symbol
        : symbol.toLocaleLowerCase('und');

  switch (intent.kind) {
    case 'file':
      return fileCmp === value ? 'confirmed' : 'none';
    case 'symbol':
      if (symbolCmp !== value) {
        return 'none';
      }
      if (
        isConfirmed(record) &&
        (roleOf(record) === 'definition' || roleOf(record) === 'execution-site')
      ) {
        return 'confirmed';
      }
      return 'candidate';
    case 'table':
      if (
        isConfirmed(record) &&
        (roleOf(record) === 'definition' || roleOf(record) === 'value-mapping') &&
        (symbolCmp === value ||
          hasReason(record, 'EXACT_TERM_MATCH') ||
          hasReason(record, 'DIRECT_ALIAS_MAPPING'))
      ) {
        return 'confirmed';
      }
      if (symbolCmp === value || hasReason(record, 'EXACT_TERM_MATCH')) {
        return 'candidate';
      }
      return 'none';
    case 'route':
      if (
        isConfirmed(record) &&
        (roleOf(record) === 'definition' ||
          roleOf(record) === 'execution-site') &&
        (symbolCmp === value || hasReason(record, 'EXACT_TERM_MATCH'))
      ) {
        return 'confirmed';
      }
      if (symbolCmp === value || hasReason(record, 'EXACT_TERM_MATCH')) {
        return 'candidate';
      }
      return 'none';
    case 'term':
      if (
        isConfirmed(record) &&
        (hasReason(record, 'EXACT_TERM_MATCH') ||
          hasReason(record, 'DIRECT_ALIAS_MAPPING'))
      ) {
        return 'confirmed';
      }
      if (hasReason(record, 'EXACT_TERM_MATCH')) {
        return 'candidate';
      }
      return 'none';
    default:
      return 'none';
  }
}

/**
 * 为 record 选择最高 MatchPriority，并收集 matched anchor keys。
 */
export function classifyRecordPriorityV2(input: {
  readonly record: TrustedStableRecordViewV2;
  readonly anchorIntents: readonly NormalizedAnchorIntentV2[];
  readonly regularTerms: readonly Readonly<{
    value: string;
    caseSensitive: boolean;
  }>[];
}): Readonly<{
  priority: MatchPriorityV2 | undefined;
  matchedAnchorKeys: readonly string[];
  regularTermCount: number;
}> {
  const matchedAnchorKeys: string[] = [];
  let best: MatchPriorityV2 | undefined;
  const consider = (priority: MatchPriorityV2): void => {
    if (best === undefined || priority > best) {
      best = priority;
    }
  };

  for (const intent of input.anchorIntents) {
    const level = satisfactionForAnchorV2(intent, input.record);
    if (level === 'none') {
      continue;
    }
    matchedAnchorKeys.push(intent.canonicalKey);
    if (intent.kind === 'file') {
      consider(MATCH_PRIORITY_V2.FILE_ANCHOR);
    } else if (intent.kind === 'symbol') {
      consider(
        level === 'confirmed'
          ? MATCH_PRIORITY_V2.SYMBOL_DEFINITION
          : MATCH_PRIORITY_V2.SYMBOL_CANDIDATE,
      );
    } else if (intent.kind === 'route') {
      consider(
        level === 'confirmed'
          ? MATCH_PRIORITY_V2.ROUTE_EXECUTION
          : MATCH_PRIORITY_V2.ROUTE_OR_TABLE_CANDIDATE,
      );
    } else if (intent.kind === 'table') {
      consider(
        level === 'confirmed'
          ? MATCH_PRIORITY_V2.TABLE_MAPPING
          : MATCH_PRIORITY_V2.ROUTE_OR_TABLE_CANDIDATE,
      );
    } else if (intent.kind === 'term') {
      consider(MATCH_PRIORITY_V2.TERM_LITERAL);
    }
  }

  const signals = input.record.rankingSignals;
  let regularTermCount = 0;
  if (signals.kind === 'direct') {
    const focus = signals.focusExcerpt.toLocaleLowerCase('und');
    for (const term of input.regularTerms) {
      const needle = term.caseSensitive
        ? term.value
        : term.value.toLocaleLowerCase('und');
      const haystack = term.caseSensitive
        ? signals.focusExcerpt
        : focus;
      if (haystack.includes(needle)) {
        regularTermCount += 1;
      }
    }
    if (
      input.record.draft.provenance.discoveredBy.includes('codegraph') &&
      draftSymbol(input.record) !== undefined
    ) {
      consider(MATCH_PRIORITY_V2.STRUCTURED_CODEGRAPH);
    }
    if (regularTermCount >= 2) {
      consider(MATCH_PRIORITY_V2.MULTI_TERM);
    } else if (regularTermCount === 1) {
      consider(MATCH_PRIORITY_V2.SINGLE_TERM);
    }
  }
  if (hasReason(input.record, 'SECONDARY_BACKEND_HIT')) {
    consider(MATCH_PRIORITY_V2.SECONDARY_BACKEND);
  }

  return Object.freeze({
    priority: best,
    matchedAnchorKeys: Object.freeze(matchedAnchorKeys),
    regularTermCount,
  });
}

/**
 * 从 retained arrays 重算 unsatisfied ledger。
 */
export function buildUnsatisfiedAnchorsV2(input: {
  readonly anchorIntents: readonly NormalizedAnchorIntentV2[];
  readonly retained: readonly TrustedStableRecordViewV2[];
  readonly completeness: ReadonlyMap<string, 'complete' | 'incomplete'>;
  readonly collisionAnchorKeys: ReadonlySet<string>;
  readonly budgetDeferredKeys: ReadonlySet<string>;
}): readonly Readonly<{
  requestIndex: number;
  kind: NormalizedAnchorIntentV2['kind'];
  satisfaction: 'candidate' | 'none';
  reason: UnsatisfiedAnchorReasonV2;
}>[] {
  const out: Array<{
    requestIndex: number;
    kind: NormalizedAnchorIntentV2['kind'];
    satisfaction: 'candidate' | 'none';
    reason: UnsatisfiedAnchorReasonV2;
  }> = [];
  for (const intent of [...input.anchorIntents].sort(
    (a, b) => a.requestIndex - b.requestIndex,
  )) {
    let best: AnchorSatisfactionLevelV2 = 'none';
    for (const record of input.retained) {
      const level = satisfactionForAnchorV2(intent, record);
      if (level === 'confirmed') {
        best = 'confirmed';
        break;
      }
      if (level === 'candidate') {
        best = 'candidate';
      }
    }
    if (best === 'confirmed') {
      continue;
    }
    if (best === 'candidate') {
      out.push(
        Object.freeze({
          requestIndex: intent.requestIndex,
          kind: intent.kind,
          satisfaction: 'candidate',
          reason: 'UNVERIFIED',
        }),
      );
      continue;
    }
    const incomplete =
      input.completeness.get(intent.canonicalKey) === 'incomplete' ||
      input.collisionAnchorKeys.has(intent.canonicalKey) ||
      input.budgetDeferredKeys.has(intent.canonicalKey);
    out.push(
      Object.freeze({
        requestIndex: intent.requestIndex,
        kind: intent.kind,
        satisfaction: 'none',
        reason: incomplete ? 'BUDGET_EXCEEDED' : 'NOT_FOUND',
      }),
    );
  }
  return Object.freeze(out);
}
