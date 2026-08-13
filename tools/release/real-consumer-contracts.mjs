import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';

import { gitEnv } from './real-consumer-snapshot.mjs';

const SENSITIVE_POLICY = 'memory-only-v2-strict-forbidden-scan-no-persist';
const RELEASE_OWNER = 'Gchigoo';
const CONFIRMATION_KEYS = new Set([
  'schemaVersion',
  'candidate',
  'repository',
  'intent',
  'sensitiveOutputPolicy',
  'owner',
  'verified_at',
  'decisionSha256',
]);
const CANDIDATE_KEYS = new Set(['name', 'version', 'tarballSha256']);
const REPOSITORY_KEYS = new Set([
  'canonicalRepositoryPath',
  'branch',
  'headSha',
]);
const INTENT_KEYS = new Set([
  'intentId',
  'requestSha256',
  'expectedSchemaVersion',
]);
const CANDIDATE_VERSION_PATTERN =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertStrictKeys(value, allowed, label) {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be an object`);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(`${label} contains an undeclared key`);
    }
  }
}

function runGit(repositoryRoot, args) {
  const result = spawnSync('git', ['-C', repositoryRoot, ...args], {
    encoding: 'utf8',
    env: gitEnv(),
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error('unable to resolve repository confirmation authority');
  }
  return result.stdout.trim();
}

export function strictCompactJson(value) {
  return JSON.stringify(value, (_, item) => {
    if (isPlainObject(item)) {
      return Object.fromEntries(
        Object.keys(item)
          .sort()
          .map((key) => [key, item[key]]),
      );
    }
    return item;
  });
}

export function computeConfirmationDecisionSha256(confirmation) {
  const input = { ...confirmation };
  delete input.decisionSha256;
  return createHash('sha256').update(strictCompactJson(input)).digest('hex');
}

export function validateRealConsumerCandidate(candidate) {
  assertStrictKeys(candidate, CANDIDATE_KEYS, 'confirmation.candidate');
  if (candidate.name !== 'repo-nav') {
    throw new Error('confirmation.candidate.name must be repo-nav');
  }
  if (
    typeof candidate.version !== 'string' ||
    !CANDIDATE_VERSION_PATTERN.test(candidate.version)
  ) {
    throw new Error('confirmation.candidate.version must be a valid semver');
  }
  if (
    typeof candidate.tarballSha256 !== 'string' ||
    !/^[0-9a-f]{64}$/u.test(candidate.tarballSha256)
  ) {
    throw new Error(
      'confirmation.candidate.tarballSha256 must be 64 lowercase hex',
    );
  }
  return {
    name: candidate.name,
    version: candidate.version,
    tarballSha256: candidate.tarballSha256,
  };
}

export function validateRealConsumerConfirmation(confirmation) {
  assertStrictKeys(confirmation, CONFIRMATION_KEYS, 'confirmation');
  if (confirmation.schemaVersion !== 1) {
    throw new Error('confirmation.schemaVersion must be 1');
  }
  const candidate = validateRealConsumerCandidate(confirmation.candidate);

  const repository = confirmation.repository;
  assertStrictKeys(repository, REPOSITORY_KEYS, 'confirmation.repository');
  for (const key of REPOSITORY_KEYS) {
    if (typeof repository[key] !== 'string' || repository[key].length === 0) {
      throw new Error(`confirmation.repository.${key} must be nonempty string`);
    }
  }

  const intent = confirmation.intent;
  assertStrictKeys(intent, INTENT_KEYS, 'confirmation.intent');
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
  if (confirmation.owner !== RELEASE_OWNER) {
    throw new Error('confirmation.owner does not match the release owner');
  }
  if (
    typeof confirmation.verified_at !== 'string' ||
    !ISO_TIMESTAMP_PATTERN.test(confirmation.verified_at) ||
    Number.isNaN(Date.parse(confirmation.verified_at)) ||
    new Date(confirmation.verified_at).toISOString() !==
      confirmation.verified_at
  ) {
    throw new Error('confirmation.verified_at must be canonical ISO timestamp');
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
  if (
    computeConfirmationDecisionSha256(confirmation) !==
    confirmation.decisionSha256
  ) {
    throw new Error('confirmation.decisionSha256 mismatch');
  }

  let canonicalRepositoryPath;
  try {
    canonicalRepositoryPath = realpathSync(repository.canonicalRepositoryPath);
  } catch {
    throw new Error(
      'confirmation.repository.canonicalRepositoryPath unreadable',
    );
  }
  const gitRoot = realpathSync(
    runGit(canonicalRepositoryPath, ['rev-parse', '--show-toplevel']),
  );
  if (gitRoot !== canonicalRepositoryPath) {
    throw new Error(
      'confirmation.repository.canonicalRepositoryPath must equal realpath(git show-toplevel)',
    );
  }
  if (
    runGit(canonicalRepositoryPath, ['rev-parse', '--abbrev-ref', 'HEAD']) !==
    repository.branch
  ) {
    throw new Error(
      'confirmation.repository.branch does not match HEAD branch',
    );
  }
  if (
    runGit(canonicalRepositoryPath, ['rev-parse', 'HEAD']) !==
    repository.headSha
  ) {
    throw new Error('confirmation.repository.headSha does not match HEAD');
  }

  return {
    canonicalRepositoryPath,
    confirmedBranch: repository.branch,
    confirmedHeadSha: repository.headSha,
    confirmationDecisionSha256: confirmation.decisionSha256,
    candidate,
  };
}
