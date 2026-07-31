import type { TrustedStableRecordViewV2 } from '../request-snapshot/pre-ranking-evidence-pool-v2.js';
import type { MatchPriorityV2 } from './match-priority-v2.js';
import {
  projectRankingSafeKeyV2,
  type RankingSafeKeyV2,
} from './public-safe-ranking-key-bridge-v2.js';

const CLASS_ORDER = Object.freeze({
  confirmed: 0,
  candidate: 1,
} as const);

/**
 * 结构化 safe ordering key（禁止 join/JSON.stringify codec）。
 */
export interface PublicSafeEvidenceOrderingKeyV2 {
  readonly priority: MatchPriorityV2;
  readonly file: string;
  readonly lineStart: number;
  readonly lineEnd: number;
  readonly symbol: string;
  readonly classOrder: number;
  readonly roleOrders: readonly number[];
  readonly reasonOrders: readonly number[];
  readonly operationOrders: readonly number[];
  readonly sourceOrders: readonly number[];
}

function enumOrder(value: string, universe: readonly string[]): number {
  const index = universe.indexOf(value);
  return index < 0 ? 999 : index;
}

const ROLE_UNIVERSE = Object.freeze([
  'definition',
  'execution-site',
  'value-mapping',
  'reference',
  'related',
]);
const REASON_UNIVERSE = Object.freeze([
  'EXACT_TERM_MATCH',
  'DIRECT_ALIAS_MAPPING',
  'SECONDARY_BACKEND_HIT',
  'EXACT_TERM_WITHOUT_DIRECT_MAPPING',
  'SYMBOL_REFERENCE_ONLY',
  'SAME_SCOPE_SIMILAR_IDENTIFIER',
  'SAME_ENTITY_SIBLING',
  'ALIAS_SOURCE_NEIGHBOR',
]);
const SOURCE_UNIVERSE = Object.freeze(['codegraph', 'ripgrep', 'filesystem']);
const OPERATION_UNIVERSE = Object.freeze([
  'FILESYSTEM_READ_RANGE',
  'FILESYSTEM_FIND_MATCHES',
]);

/**
 * 从 trusted view + priority 构造 ordering key。
 */
export function buildPublicSafeOrderingKeyV2(
  record: TrustedStableRecordViewV2,
  priority: MatchPriorityV2,
): Readonly<{
  safeKey: RankingSafeKeyV2;
  orderingKey: PublicSafeEvidenceOrderingKeyV2;
}> {
  const draft = record.draft;
  const safeKey = projectRankingSafeKeyV2(
    draft.location.symbol === undefined
      ? { file: draft.location.file }
      : { file: draft.location.file, symbol: draft.location.symbol },
  );
  const evidenceClass =
    draft.evidenceClass === 'confirmed' ? 'confirmed' : 'candidate';
  const roles =
    'role' in draft && typeof draft.role === 'string' ? [draft.role] : [];
  const reasons =
    'reasonCodes' in draft && Array.isArray(draft.reasonCodes)
      ? [...draft.reasonCodes]
      : [];
  const operations = draft.provenance.operations ?? [];
  const sources = draft.provenance.discoveredBy ?? [];
  const orderingKey: PublicSafeEvidenceOrderingKeyV2 = Object.freeze({
    priority,
    file: safeKey.file,
    lineStart: draft.location.lines[0],
    lineEnd: draft.location.lines[1],
    symbol: safeKey.symbol,
    classOrder: CLASS_ORDER[evidenceClass],
    roleOrders: Object.freeze(
      roles.map((role) => enumOrder(role, ROLE_UNIVERSE)),
    ),
    reasonOrders: Object.freeze(
      reasons.map((reason) => enumOrder(String(reason), REASON_UNIVERSE)),
    ),
    operationOrders: Object.freeze(
      operations.map((operation) =>
        enumOrder(String(operation), OPERATION_UNIVERSE),
      ),
    ),
    sourceOrders: Object.freeze(
      sources.map((source) => enumOrder(String(source), SOURCE_UNIVERSE)),
    ),
  });
  return Object.freeze({ safeKey, orderingKey });
}

/**
 * priority descending；其余 scalar/vector ascending。
 */
export function comparePublicSafeOrderingKeyV2(
  left: PublicSafeEvidenceOrderingKeyV2,
  right: PublicSafeEvidenceOrderingKeyV2,
): number {
  if (left.priority !== right.priority) {
    return right.priority - left.priority;
  }
  const scalar =
    left.file.localeCompare(right.file) ||
    left.lineStart - right.lineStart ||
    left.lineEnd - right.lineEnd ||
    left.symbol.localeCompare(right.symbol) ||
    left.classOrder - right.classOrder;
  if (scalar !== 0) {
    return scalar;
  }
  const vectors: Array<readonly number[]> = [
    left.roleOrders,
    right.roleOrders,
    left.reasonOrders,
    right.reasonOrders,
    left.operationOrders,
    right.operationOrders,
    left.sourceOrders,
    right.sourceOrders,
  ];
  for (let index = 0; index < vectors.length; index += 2) {
    const a = vectors[index]!;
    const b = vectors[index + 1]!;
    const length = Math.min(a.length, b.length);
    for (let i = 0; i < length; i += 1) {
      if (a[i]! !== b[i]!) {
        return a[i]! - b[i]!;
      }
    }
    if (a.length !== b.length) {
      return a.length - b.length;
    }
  }
  return 0;
}

export function orderingKeysEqualV2(
  left: PublicSafeEvidenceOrderingKeyV2,
  right: PublicSafeEvidenceOrderingKeyV2,
): boolean {
  return comparePublicSafeOrderingKeyV2(left, right) === 0;
}
