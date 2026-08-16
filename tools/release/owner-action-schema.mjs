/**
 * Strict owner preflight / action schema validation for F9.
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeReleaseDesignRevisionV1,
  strictCompact,
} from './design-revision.mjs';
import {
  RELEASE_COPYRIGHT_HOLDER_V1,
  RELEASE_OWNER_V1,
} from './release-owner.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const HEX64 = /^[0-9a-f]{64}$/u;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertStrictKeys(value, expected, label) {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be object`);
  }
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  if (actual.join(',') !== required.join(',')) {
    throw new Error(`${label} keys mismatch`);
  }
}

function assertCanonicalIsoTimestamp(name, value) {
  if (
    typeof value !== 'string' ||
    !ISO_TIMESTAMP.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`${name} must be canonical ISO timestamp`);
  }
}

function sha256Raw(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function decisionSha256(obj) {
  const rest = { ...obj };
  delete rest.decisionSha256;
  return sha256Raw(Buffer.from(strictCompact(rest), 'utf8'));
}

function assertHex(name, value) {
  if (typeof value !== 'string' || !HEX64.test(value)) {
    throw new Error(`${name} must be 64-char lowercase hex`);
  }
}

/**
 * Validate exact-one license + security-channel owner preflight.
 */
export function validateOwnerPreflight(preflight, designRevisionSha256) {
  if (typeof preflight !== 'object' || preflight === null) {
    throw new Error('preflight must be object');
  }
  const keys = Object.keys(preflight).sort();
  if (keys.join(',') !== 'license,securityChannel') {
    throw new Error('preflight must contain exact license + securityChannel');
  }
  const license = preflight.license;
  assertStrictKeys(
    license,
    [
      'action',
      'approved_at',
      'choice',
      'copyrightHolder',
      'copyrightYear',
      'designRevisionSha256',
      'owner',
      'decisionSha256',
    ],
    'preflight.license',
  );
  if (license.action !== 'license-preflight' || license.choice !== 'MIT') {
    throw new Error('license preflight must be MIT for this candidate');
  }
  if (license.designRevisionSha256 !== designRevisionSha256) {
    throw new Error('license designRevisionSha256 mismatch');
  }
  if (
    license.copyrightYear !== '2026' ||
    license.copyrightHolder !== RELEASE_COPYRIGHT_HOLDER_V1
  ) {
    throw new Error('MIT year/holder mismatch');
  }
  if (license.owner !== RELEASE_OWNER_V1) {
    throw new Error('license owner mismatch');
  }
  assertCanonicalIsoTimestamp('license.approved_at', license.approved_at);
  assertHex('license.decisionSha256', license.decisionSha256);
  if (license.decisionSha256 !== decisionSha256(license)) {
    throw new Error('license decisionSha256 mismatch');
  }
  const security = preflight.securityChannel;
  assertStrictKeys(
    security,
    [
      'action',
      'channelType',
      'designRevisionSha256',
      'owner',
      'publicSafeText',
      'verified_at',
      'decisionSha256',
    ],
    'preflight.securityChannel',
  );
  if (security.action !== 'security-channel-preflight') {
    throw new Error('security channel action mismatch');
  }
  if (security.channelType !== 'github-private-vulnerability-reporting') {
    throw new Error('security channel type mismatch');
  }
  if (security.designRevisionSha256 !== designRevisionSha256) {
    throw new Error('security designRevisionSha256 mismatch');
  }
  if (
    security.publicSafeText !==
    'Report security issues via GitHub Security Advisories for gchigoo/repo-nav. Do not file public issues for vulnerabilities or secrets.'
  ) {
    throw new Error('security publicSafeText mismatch');
  }
  if (security.owner !== RELEASE_OWNER_V1) {
    throw new Error('security channel owner mismatch');
  }
  assertCanonicalIsoTimestamp('security.verified_at', security.verified_at);
  assertHex('security.decisionSha256', security.decisionSha256);
  if (security.decisionSha256 !== decisionSha256(security)) {
    throw new Error('security decisionSha256 mismatch');
  }
  return true;
}

export function computeOwnerActionsDecisionSha256(actions) {
  return decisionSha256(actions);
}

export function validateOwnerActions(actions, expected) {
  assertStrictKeys(
    actions,
    [
      'schemaVersion',
      'candidate',
      'license',
      'securityChannel',
      'owner',
      'verified_at',
      'decisionSha256',
    ],
    'owner actions',
  );
  if (actions.schemaVersion !== 1) {
    throw new Error('owner actions schemaVersion must be 1');
  }
  assertStrictKeys(
    actions.candidate,
    ['name', 'version', 'tarballSha256', 'designRevisionSha256'],
    'owner actions candidate',
  );
  for (const key of [
    'name',
    'version',
    'tarballSha256',
    'designRevisionSha256',
  ]) {
    if (actions.candidate[key] !== expected.candidate[key]) {
      throw new Error(`owner actions candidate ${key} mismatch`);
    }
  }
  assertStrictKeys(
    actions.license,
    [
      'action',
      'preflightDecisionSha256',
      'choice',
      'copyrightYear',
      'copyrightHolder',
    ],
    'owner actions license',
  );
  if (
    actions.license.action !== 'license-final' ||
    actions.license.preflightDecisionSha256 !==
      expected.preflight.license.decisionSha256 ||
    actions.license.choice !== expected.preflight.license.choice ||
    actions.license.copyrightYear !==
      expected.preflight.license.copyrightYear ||
    actions.license.copyrightHolder !==
      expected.preflight.license.copyrightHolder
  ) {
    throw new Error('owner actions license binding mismatch');
  }
  assertStrictKeys(
    actions.securityChannel,
    ['action', 'preflightDecisionSha256', 'channelType', 'publicSafeText'],
    'owner actions securityChannel',
  );
  if (
    actions.securityChannel.action !== 'security-channel-final' ||
    actions.securityChannel.preflightDecisionSha256 !==
      expected.preflight.securityChannel.decisionSha256 ||
    actions.securityChannel.channelType !==
      expected.preflight.securityChannel.channelType ||
    actions.securityChannel.publicSafeText !==
      expected.preflight.securityChannel.publicSafeText
  ) {
    throw new Error('owner actions security channel binding mismatch');
  }
  if (actions.owner !== RELEASE_OWNER_V1) {
    throw new Error('owner actions owner mismatch');
  }
  assertCanonicalIsoTimestamp('owner actions verified_at', actions.verified_at);
  const ageMs = (expected.now ?? Date.now()) - Date.parse(actions.verified_at);
  if (ageMs > 7 * 24 * 60 * 60 * 1000 || ageMs < -60_000) {
    throw new Error('owner actions verified_at must be within 7d');
  }
  assertHex('owner actions decisionSha256', actions.decisionSha256);
  if (actions.decisionSha256 !== decisionSha256(actions)) {
    throw new Error('owner actions decisionSha256 mismatch');
  }
  return Object.freeze({
    candidate: Object.freeze({ ...actions.candidate }),
    decisionSha256: actions.decisionSha256,
    verifiedAt: actions.verified_at,
  });
}

function main() {
  const args = process.argv.slice(2);
  const preflightIdx = args.indexOf('--preflight');
  if (preflightIdx < 0) {
    throw new Error('Usage: owner-action-schema.mjs --preflight <path>');
  }
  const rel = args[preflightIdx + 1];
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    throw new Error(`preflight missing: ${rel}`);
  }
  const revision = computeReleaseDesignRevisionV1();
  const preflight = JSON.parse(readFileSync(abs, 'utf8'));
  validateOwnerPreflight(preflight, revision.designRevisionSha256);
  process.stdout.write(
    `${JSON.stringify({ ok: true, designRevisionSha256: revision.designRevisionSha256 }, null, 2)}\n`,
  );
}

if (process.argv[1]?.endsWith('owner-action-schema.mjs')) {
  main();
}
