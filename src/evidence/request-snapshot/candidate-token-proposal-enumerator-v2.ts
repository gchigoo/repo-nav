import { maskNonCode, maskSqlNonCode } from '../direct-mapping-classifier.js';
import type { VerifiedCandidateContext } from '../candidate-policy/apply-candidate-policy.js';
import { createOpaqueTokenV2 } from './opaque-token-v2.js';

declare const VERIFIED_CANDIDATE_TOKEN_PROPOSAL_V2: unique symbol;
export type VerifiedCandidateTokenProposalV2 = Readonly<object> & {
  readonly [VERIFIED_CANDIDATE_TOKEN_PROPOSAL_V2]: never;
};

export interface CandidateTokenProposalFactsV2 {
  readonly seedDiscoveryKey: string;
  readonly file: string;
  readonly tokenValue: string;
  readonly normalizedValue: string;
  readonly line: number;
  readonly start: number;
  readonly end: number;
  readonly maskedExcerpt: string;
  readonly sql: boolean;
}

interface ProposalPrivateRecordV2 {
  readonly facts: CandidateTokenProposalFactsV2;
}

const proposalRecords = new WeakMap<
  VerifiedCandidateTokenProposalV2,
  ProposalPrivateRecordV2
>();

const IDENTIFIER_PATTERN = /[$_\p{ID_Start}][$_\p{ID_Continue}]*/gu;

const KEYWORDS = new Set([
  'const',
  'let',
  'var',
  'function',
  'class',
  'interface',
  'type',
  'return',
  'import',
  'export',
  'from',
  'as',
  'if',
  'else',
  'for',
  'while',
  'switch',
  'case',
  'break',
  'continue',
  'new',
  'this',
  'super',
  'typeof',
  'instanceof',
  'void',
  'null',
  'undefined',
  'true',
  'false',
  'async',
  'await',
  'yield',
  'select',
  'from',
  'where',
  'and',
  'or',
  'not',
  'join',
  'on',
  'as',
  'into',
  'values',
  'insert',
  'update',
  'delete',
  'create',
  'table',
  'index',
]);

function isSqlFile(file: string): boolean {
  return /\.(?:sql|ddl|dml)$/iu.test(file);
}

/**
 * Consumer-neutral enumerator：只做 mask/tokenize/offset，不调用 isReservedToken，
 * 不读取 record universe，不固化 reason/provenance。
 */
export class CandidateTokenProposalEnumeratorV2 {
  private readonly enumeratedContexts = new WeakSet<VerifiedCandidateContext>();

  /**
   * 每个已解码 context 只枚举一次。
   */
  public enumerate(
    context: VerifiedCandidateContext,
  ): readonly VerifiedCandidateTokenProposalV2[] {
    if (this.enumeratedContexts.has(context)) {
      return Object.freeze([]);
    }
    this.enumeratedContexts.add(context);

    const sql = isSqlFile(context.file);
    const masked = sql
      ? maskSqlNonCode(context.unredactedExcerpt)
      : maskNonCode(context.unredactedExcerpt);
    const firstLine = context.lines[0];
    const proposals: VerifiedCandidateTokenProposalV2[] = [];

    for (const match of masked.matchAll(IDENTIFIER_PATTERN)) {
      if (match.index === undefined) {
        continue;
      }
      const value = match[0];
      const normalizedValue = value.normalize('NFKC').toLocaleLowerCase('und');
      if (KEYWORDS.has(normalizedValue)) {
        continue;
      }
      const line =
        firstLine + (masked.slice(0, match.index).match(/\n/gu)?.length ?? 0);
      const token = createOpaqueTokenV2<VerifiedCandidateTokenProposalV2>();
      proposalRecords.set(
        token,
        Object.freeze({
          facts: Object.freeze({
            seedDiscoveryKey: context.seedDiscoveryKey,
            file: context.file,
            tokenValue: value,
            normalizedValue,
            line,
            start: match.index,
            end: match.index + value.length,
            maskedExcerpt: masked,
            sql,
          }),
        }),
      );
      proposals.push(token);
    }
    return Object.freeze(proposals);
  }
}

/**
 * Lane evaluator 读取 proposal facts；F2 不可见。
 */
export function readCandidateTokenProposalFactsV2(
  proposal: VerifiedCandidateTokenProposalV2,
): CandidateTokenProposalFactsV2 {
  const record = proposalRecords.get(proposal);
  if (record === undefined) {
    throw new TypeError('candidate token proposal is not trusted');
  }
  return record.facts;
}
