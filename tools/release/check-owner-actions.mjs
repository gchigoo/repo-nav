/**
 * Validate owner preflight; exit 2 while candidate-bound final actions or the
 * real-consumer confirmation are missing.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeReleaseDesignRevisionV1 } from './design-revision.mjs';
import {
  validateOwnerActions,
  validateOwnerPreflight,
} from './owner-action-schema.mjs';
import { loadReleaseCandidateV1 } from './release-candidate.mjs';
import { releaseEvidenceCandidateV1 } from './release-evidence-schema.mjs';
import { validateRealConsumerConfirmation } from './real-consumer-contracts.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const npmCli = join(root, 'node_modules/npm/bin/npm-cli.js');
const preflightPath = join(
  root,
  'docs/superpowers/evidence/release-runtime/public-beta-release-owner-preflight.json',
);
const actionsPath = join(
  root,
  'docs/superpowers/evidence/release-runtime/public-beta-release-owner-actions.json',
);
const confirmationPath = join(
  root,
  'docs/superpowers/evidence/release-runtime/public-beta-real-consumer-confirmation.json',
);
const verificationPath = join(
  root,
  'test-artifacts/release-evidence/owner-actions-verification-v1.json',
);

function readJsonAuthority(path) {
  const bytes = readFileSync(path);
  return Object.freeze({
    value: JSON.parse(bytes.toString('utf8')),
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}

function writeReport(report) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

try {
  if (!existsSync(preflightPath)) {
    throw new Error('owner preflight missing');
  }
  const revision = computeReleaseDesignRevisionV1();
  const preflightAuthority = readJsonAuthority(preflightPath);
  const preflight = preflightAuthority.value;
  validateOwnerPreflight(preflight, revision.designRevisionSha256);

  const residuals = [];
  if (!existsSync(actionsPath)) {
    residuals.push('candidate-bound-owner-actions-json-missing');
  }
  if (!existsSync(confirmationPath)) {
    residuals.push('real-consumer-confirmation-json-missing');
  }
  if (residuals.length > 0) {
    writeReport({
      ok: false,
      preflightValidated: true,
      designRevisionSha256: revision.designRevisionSha256,
      residuals,
    });
    process.exit(2);
  }

  const candidate = loadReleaseCandidateV1(root, npmCli);
  const expectedCandidate = Object.freeze({
    name: candidate.name,
    version: candidate.version,
    tarballSha256: candidate.tarballSha256,
    designRevisionSha256: revision.designRevisionSha256,
  });
  const ownerActionsAuthority = readJsonAuthority(actionsPath);
  const confirmationAuthority = readJsonAuthority(confirmationPath);
  const ownerActions = validateOwnerActions(ownerActionsAuthority.value, {
    candidate: expectedCandidate,
    preflight,
  });
  const confirmation = validateRealConsumerConfirmation(
    confirmationAuthority.value,
  );
  for (const key of ['name', 'version', 'tarballSha256']) {
    if (confirmation.candidate[key] !== expectedCandidate[key]) {
      throw new Error(`real-consumer candidate ${key} mismatch`);
    }
  }

  const report = {
    schemaVersion: 1,
    ok: true,
    generatedAt: new Date().toISOString(),
    candidate: releaseEvidenceCandidateV1(candidate),
    designRevisionSha256: revision.designRevisionSha256,
    ownerActionsDecisionSha256: ownerActions.decisionSha256,
    ownerActionsVerifiedAt: ownerActions.verifiedAt,
    ownerActionsSourceSha256: ownerActionsAuthority.sha256,
    confirmationDecisionSha256: confirmation.confirmationDecisionSha256,
    confirmationVerifiedAt: confirmation.verifiedAt,
    confirmationSourceSha256: confirmationAuthority.sha256,
    preflightSourceSha256: preflightAuthority.sha256,
    preflightValidated: true,
    ownerActionsValidated: true,
    realConsumerConfirmationValidated: true,
    residuals: [],
  };
  mkdirSync(dirname(verificationPath), { recursive: true });
  writeFileSync(verificationPath, `${JSON.stringify(report, null, 2)}\n`);
  writeReport(report);
} catch {
  process.stderr.write('owner evidence validation failed\n');
  process.exit(1);
}
