import {
  comparePublicEvidence,
  type CandidateEvidence,
  type ConfirmedEvidence,
} from '../contracts/index.js';

export interface BoundedEvidenceSelection<T> {
  readonly selected: readonly T[];
  readonly truncated: boolean;
}

function selectBounded<T extends ConfirmedEvidence | CandidateEvidence>(
  values: readonly T[],
  maximum: number,
): BoundedEvidenceSelection<T> {
  const ordered = [...values].sort(comparePublicEvidence);
  return Object.freeze({
    selected: Object.freeze(ordered.slice(0, maximum)),
    truncated: ordered.length > maximum,
  });
}

export function selectConfirmedBudget(
  values: readonly ConfirmedEvidence[],
  maximum: number,
): BoundedEvidenceSelection<ConfirmedEvidence> {
  return selectBounded(values, maximum);
}

export function selectCandidateBudget(
  values: readonly CandidateEvidence[],
  maximum: number,
): BoundedEvidenceSelection<CandidateEvidence> {
  return selectBounded(values, maximum);
}
