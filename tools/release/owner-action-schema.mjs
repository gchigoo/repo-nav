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

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const HEX64 = /^[0-9a-f]{64}$/u;

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
  if (license.action !== 'license-preflight' || license.choice !== 'MIT') {
    throw new Error('license preflight must be MIT for this candidate');
  }
  if (license.designRevisionSha256 !== designRevisionSha256) {
    throw new Error('license designRevisionSha256 mismatch');
  }
  if (
    license.copyrightYear !== '2026' ||
    license.copyrightHolder !== 'Gchigoo'
  ) {
    throw new Error('MIT year/holder mismatch');
  }
  assertHex('license.decisionSha256', license.decisionSha256);
  if (license.decisionSha256 !== decisionSha256(license)) {
    throw new Error('license decisionSha256 mismatch');
  }
  const security = preflight.securityChannel;
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
  assertHex('security.decisionSha256', security.decisionSha256);
  if (security.decisionSha256 !== decisionSha256(security)) {
    throw new Error('security decisionSha256 mismatch');
  }
  return true;
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
