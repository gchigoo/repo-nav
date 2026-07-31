/**
 * RealConsumerConfirmationV1 validation (owner-supplied JSON only).
 * Field shape matches public-beta-release design §RealConsumerConfirmationV1.
 */
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const SENSITIVE_POLICY = 'memory-only-v2-strict-forbidden-scan-no-persist';

/**
 * Compact JSON with ASCII-sorted object keys (self-excluding hash input).
 */
export function strictCompactJson(value) {
  return JSON.stringify(value, (_, v) => {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      const sorted = {};
      for (const key of Object.keys(v).sort()) {
        sorted[key] = v[key];
      }
      return sorted;
    }
    return v;
  });
}

/**
 * Compute decisionSha256 over all fields except decisionSha256 itself.
 */
export function computeConfirmationDecisionSha256(confirmation) {
  const rest = { ...confirmation };
  delete rest.decisionSha256;
  return createHash('sha256').update(strictCompactJson(rest)).digest('hex');
}

/**
 * Validate RealConsumerConfirmationV1 without inventing values.
 */
export function validateRealConsumerConfirmation(confirmation) {
  if (typeof confirmation !== 'object' || confirmation === null) {
    throw new Error('confirmation must be an object');
  }
  if (confirmation.schemaVersion !== 1) {
    throw new Error('confirmation.schemaVersion must be 1');
  }
  if (
    typeof confirmation.candidate !== 'object' ||
    confirmation.candidate === null
  ) {
    throw new Error('confirmation.candidate must be an object');
  }
  if (
    typeof confirmation.repository !== 'object' ||
    confirmation.repository === null
  ) {
    throw new Error('confirmation.repository must be an object');
  }
  if (typeof confirmation.intent !== 'object' || confirmation.intent === null) {
    throw new Error('confirmation.intent must be an object');
  }
  const repo = confirmation.repository;
  for (const key of ['canonicalRepositoryPath', 'branch', 'headSha']) {
    if (typeof repo[key] !== 'string' || repo[key].length === 0) {
      throw new Error(`confirmation.repository.${key} must be nonempty string`);
    }
  }
  const intent = confirmation.intent;
  if (typeof intent.intentId !== 'string' || intent.intentId.length === 0) {
    throw new Error('confirmation.intent.intentId must be nonempty string');
  }
  if (
    typeof intent.requestSha256 !== 'string' ||
    !/^[0-9a-f]{64}$/u.test(intent.requestSha256)
  ) {
    throw new Error('confirmation.intent.requestSha256 must be 64 hex');
  }
  if (intent.expectedSchemaVersion !== '2.0') {
    throw new Error('confirmation.intent.expectedSchemaVersion must be 2.0');
  }
  if (confirmation.sensitiveOutputPolicy !== SENSITIVE_POLICY) {
    throw new Error('confirmation.sensitiveOutputPolicy mismatch');
  }
  if (
    typeof confirmation.owner !== 'string' ||
    confirmation.owner.length === 0
  ) {
    throw new Error('confirmation.owner must be nonempty string');
  }
  if (
    typeof confirmation.verified_at !== 'string' ||
    Number.isNaN(Date.parse(confirmation.verified_at))
  ) {
    throw new Error('confirmation.verified_at must be ISO timestamp');
  }
  const ageMs = Date.now() - Date.parse(confirmation.verified_at);
  if (ageMs > 24 * 60 * 60 * 1000 || ageMs < -60_000) {
    throw new Error('confirmation.verified_at must be within 24h');
  }
  if (
    typeof confirmation.decisionSha256 !== 'string' ||
    !/^[0-9a-f]{64}$/u.test(confirmation.decisionSha256)
  ) {
    throw new Error('confirmation.decisionSha256 must be 64 hex');
  }
  const expected = computeConfirmationDecisionSha256(confirmation);
  if (expected !== confirmation.decisionSha256) {
    throw new Error('confirmation.decisionSha256 mismatch');
  }

  const path = repo.canonicalRepositoryPath;
  let realPath;
  try {
    realPath = realpathSync(path);
  } catch {
    throw new Error(
      'confirmation.repository.canonicalRepositoryPath unreadable',
    );
  }
  const toplevel = spawnSync(
    'git',
    ['-C', realPath, 'rev-parse', '--show-toplevel'],
    { encoding: 'utf8', shell: false },
  );
  if (toplevel.status !== 0) {
    throw new Error('canonicalRepositoryPath is not a git worktree');
  }
  const gitRoot = realpathSync(toplevel.stdout.trim());
  if (gitRoot !== realPath) {
    throw new Error(
      'canonicalRepositoryPath must equal realpath(git show-toplevel)',
    );
  }

  const branch = spawnSync(
    'git',
    ['-C', realPath, 'rev-parse', '--abbrev-ref', 'HEAD'],
    { encoding: 'utf8', shell: false },
  );
  const head = spawnSync('git', ['-C', realPath, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
    shell: false,
  });
  if (branch.status !== 0 || head.status !== 0) {
    throw new Error('unable to resolve branch/HEAD for confirmation target');
  }
  if (branch.stdout.trim() !== repo.branch) {
    throw new Error(
      'confirmation.repository.branch does not match HEAD branch',
    );
  }
  if (head.stdout.trim() !== repo.headSha) {
    throw new Error('confirmation.repository.headSha does not match HEAD');
  }

  return {
    canonicalRepositoryPath: realPath,
    confirmationDecisionSha256: confirmation.decisionSha256,
  };
}
