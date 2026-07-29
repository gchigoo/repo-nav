import { createHash } from 'node:crypto';

import {
  EVIDENCE_CLASS_PRIORITY,
  EVIDENCE_ROLE_PRIORITY,
} from './constants.js';
import type {
  CandidateEvidence,
  ConfirmedEvidence,
  EvidenceRole,
} from './evidence.js';

export type PublicEvidence = ConfirmedEvidence | CandidateEvidence;

export interface EvidenceDiscoveryIdentity {
  readonly file: string;
  readonly lines: readonly [start: number, end: number];
  readonly excerpt: string;
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function normalizeEvidenceExcerpt(excerpt: string): string {
  return excerpt.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}

export function createDiscoveryKey(
  identity: EvidenceDiscoveryIdentity,
): string {
  const normalizedFile = identity.file.replaceAll('\\', '/');
  const excerptHash = sha256Hex(normalizeEvidenceExcerpt(identity.excerpt));
  return [
    'discovery:v1',
    normalizedFile,
    String(identity.lines[0]),
    String(identity.lines[1]),
    excerptHash,
  ].join('\u0000');
}

export function createEvidenceId(
  discoveryKey: string,
  evidenceClass: PublicEvidence['evidenceClass'],
  primaryRole: EvidenceRole,
): string {
  const publicCanonicalKey = [discoveryKey, evidenceClass, primaryRole].join(
    '\u0000',
  );
  return `evidence:v1:${sha256Hex(publicCanonicalKey)}`;
}

export function selectPrimaryEvidenceRole(
  roles: readonly EvidenceRole[],
): EvidenceRole {
  const sorted = [...roles].sort(
    (left, right) =>
      EVIDENCE_ROLE_PRIORITY[left] - EVIDENCE_ROLE_PRIORITY[right],
  );
  const primary = sorted[0];
  if (primary === undefined) {
    throw new Error('At least one evidence role is required.');
  }
  return primary;
}

function compareCanonicalText(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

export function comparePublicEvidence(
  left: PublicEvidence,
  right: PublicEvidence,
): number {
  return (
    EVIDENCE_CLASS_PRIORITY[left.evidenceClass] -
      EVIDENCE_CLASS_PRIORITY[right.evidenceClass] ||
    EVIDENCE_ROLE_PRIORITY[left.role] - EVIDENCE_ROLE_PRIORITY[right.role] ||
    compareCanonicalText(left.location.file, right.location.file) ||
    left.location.lines[0] - right.location.lines[0] ||
    left.location.lines[1] - right.location.lines[1] ||
    compareCanonicalText(left.id, right.id)
  );
}
