import {
  createDiscoveryKey,
  type CandidateReasonCode,
} from '../../contracts/index.js';
import type { DiscoveryRecord } from '../discovery-record.js';
import {
  promotionRequirementsForReasons,
  type ClassifiedCandidateDraft,
  type VerifiedCandidateContext,
} from '../candidate-policy/apply-candidate-policy.js';
import {
  readCandidateTokenProposalFactsV2,
  type VerifiedCandidateTokenProposalV2,
} from './candidate-token-proposal-enumerator-v2.js';

const DERIVED_PROVENANCE = Object.freeze({
  discoveredBy: Object.freeze(['filesystem' as const]),
  verifiedBy: 'filesystem' as const,
  operations: Object.freeze(['FILESYSTEM_READ_RANGE' as const]),
});

/**
 * 在给定 record universe 上判定 reserved-token（evaluator 职责，enumerator 不做）。
 */
export function isReservedTokenInUniverseV2(
  normalizedValue: string,
  file: string,
  line: number,
  records: readonly DiscoveryRecord[],
): boolean {
  return records.some((record) => {
    if (
      record.location.file !== file ||
      line < record.focusLines[0] ||
      line > record.focusLines[1]
    ) {
      return false;
    }
    return [...record.matchedTerms.map((term) => term.value), ...record.canonicalSymbols]
      .map((value) => value.normalize('NFKC').toLocaleLowerCase('und'))
      .includes(normalizedValue);
  });
}

function draftFromProposal(
  proposal: VerifiedCandidateTokenProposalV2,
  reasonCodes: readonly CandidateReasonCode[],
): ClassifiedCandidateDraft {
  const facts = readCandidateTokenProposalFactsV2(proposal);
  const location = Object.freeze({
    file: facts.file,
    symbol: facts.tokenValue,
    lines: Object.freeze([facts.line, facts.line] as const),
    excerpt: facts.tokenValue,
  });
  return Object.freeze({
    seedDiscoveryKey: facts.seedDiscoveryKey,
    discoveryKey: createDiscoveryKey(location),
    role: 'related' as const,
    location,
    provenance: DERIVED_PROVENANCE,
    reasonCodes: Object.freeze([...reasonCodes]),
    promotionRequirements: promotionRequirementsForReasons(reasonCodes),
  });
}

/**
 * Expanded lane evaluator：使用 expanded record universe；不截断 legacy。
 */
export function evaluateExpandedCandidateProposalsV2(input: {
  readonly proposals: readonly VerifiedCandidateTokenProposalV2[];
  readonly expandedRecords: readonly DiscoveryRecord[];
  readonly reasonFor: (
    proposal: VerifiedCandidateTokenProposalV2,
  ) => readonly CandidateReasonCode[];
}): readonly ClassifiedCandidateDraft[] {
  const drafts: ClassifiedCandidateDraft[] = [];
  for (const proposal of input.proposals) {
    const facts = readCandidateTokenProposalFactsV2(proposal);
    if (
      isReservedTokenInUniverseV2(
        facts.normalizedValue,
        facts.file,
        facts.line,
        input.expandedRecords,
      )
    ) {
      continue;
    }
    const reasonCodes = input.reasonFor(proposal);
    if (reasonCodes.length > 0) {
      drafts.push(draftFromProposal(proposal, reasonCodes));
    }
  }
  return Object.freeze(drafts);
}

/**
 * Legacy lane evaluator：使用 legacy record universe；expanded-only reserved 不抑制。
 */
export function evaluateLegacyCandidateProposalsV2(input: {
  readonly proposals: readonly VerifiedCandidateTokenProposalV2[];
  readonly legacyRecords: readonly DiscoveryRecord[];
  readonly reasonFor: (
    proposal: VerifiedCandidateTokenProposalV2,
  ) => readonly CandidateReasonCode[];
}): readonly ClassifiedCandidateDraft[] {
  const drafts: ClassifiedCandidateDraft[] = [];
  for (const proposal of input.proposals) {
    const facts = readCandidateTokenProposalFactsV2(proposal);
    if (
      isReservedTokenInUniverseV2(
        facts.normalizedValue,
        facts.file,
        facts.line,
        input.legacyRecords,
      )
    ) {
      continue;
    }
    const reasonCodes = input.reasonFor(proposal);
    if (reasonCodes.length > 0) {
      drafts.push(draftFromProposal(proposal, reasonCodes));
    }
  }
  return Object.freeze(drafts);
}

/**
 * 证明：同一 proposal 在 expanded-only reserved 时 legacy 仍可保留。
 */
export function expandedOnlyReservedDoesNotSuppressLegacyV2(input: {
  readonly proposal: VerifiedCandidateTokenProposalV2;
  readonly expandedRecords: readonly DiscoveryRecord[];
  readonly legacyRecords: readonly DiscoveryRecord[];
}): {
  readonly expandedReserved: boolean;
  readonly legacyReserved: boolean;
} {
  const facts = readCandidateTokenProposalFactsV2(input.proposal);
  return Object.freeze({
    expandedReserved: isReservedTokenInUniverseV2(
      facts.normalizedValue,
      facts.file,
      facts.line,
      input.expandedRecords,
    ),
    legacyReserved: isReservedTokenInUniverseV2(
      facts.normalizedValue,
      facts.file,
      facts.line,
      input.legacyRecords,
    ),
  });
}

export type { VerifiedCandidateContext };
