/**
 * Write F9 untracked owner-preflight JSON from approved license + security fields.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const paths = [
  'docs/superpowers/archive/codestable/features/2026-07-24-public-beta-release/public-beta-release-design.md',
  'docs/superpowers/archive/codestable/features/2026-07-24-public-beta-release/public-beta-release-checklist.yaml',
];

function sha256Raw(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function strictCompact(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(strictCompact).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${strictCompact(value[k])}`).join(',')}}`;
}

function decisionSha256(obj) {
  const rest = { ...obj };
  delete rest.decisionSha256;
  return sha256Raw(Buffer.from(strictCompact(rest), 'utf8'));
}

const entries = paths.map((p) => {
  const buf = readFileSync(join(root, p));
  return {
    path: p.replaceAll('\\', '/'),
    byteLength: buf.byteLength,
    sha256: sha256Raw(buf),
  };
});

const revisionBody = {
  schemaVersion: 1,
  algorithm: 'sha256-raw-bytes-v1',
  entries,
};
const designRevisionSha256 = sha256Raw(
  Buffer.from(strictCompact(revisionBody), 'utf8'),
);

const owner = 'Gchigoo';
const approved_at = '2026-07-29T00:00:00.000Z';
const verified_at = '2026-07-29T00:00:00.000Z';

const licenseBase = {
  action: 'license-preflight',
  approved_at,
  choice: 'MIT',
  copyrightHolder: 'Gchigoo',
  copyrightYear: '2026',
  designRevisionSha256,
  owner,
};
const license = {
  ...licenseBase,
  decisionSha256: decisionSha256(licenseBase),
};

const securityBase = {
  action: 'security-channel-preflight',
  channelType: 'github-private-vulnerability-reporting',
  designRevisionSha256,
  owner,
  publicSafeText:
    'Report security issues via GitHub Security Advisories for gchigoo/repo-nav. Do not file public issues for vulnerabilities or secrets.',
  verified_at,
};
const securityChannel = {
  ...securityBase,
  decisionSha256: decisionSha256(securityBase),
};

const preflight = { license, securityChannel };
const outRel =
  'docs/superpowers/evidence/release-runtime/public-beta-release-owner-preflight.json';
const outAbs = join(root, outRel);
mkdirSync(dirname(outAbs), { recursive: true });
writeFileSync(outAbs, `${JSON.stringify(preflight, null, 2)}\n`);
process.stdout.write(
  `${JSON.stringify(
    {
      out: outRel,
      designRevisionSha256,
      licenseDecisionSha256: license.decisionSha256,
      securityDecisionSha256: securityChannel.decisionSha256,
    },
    null,
    2,
  )}\n`,
);
