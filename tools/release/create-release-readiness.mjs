/**
 * Emit a fail-closed, candidate-bound, publish-false readiness verdict.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeReleaseDesignRevisionV1 } from './design-revision.mjs';
import {
  validateOwnerActions,
  validateOwnerPreflight,
} from './owner-action-schema.mjs';
import { loadReleaseCandidateV1 } from './release-candidate.mjs';
import {
  releaseEvidenceCandidateV1,
  validateInstalledAuditEvidenceV1,
  validateInstalledClosureEvidenceV1,
  validateInstalledSbomEvidenceV1,
  validateOwnerVerificationEvidenceV1,
  validateRealConsumerEvidenceV1,
} from './release-evidence-schema.mjs';
import { validateRealConsumerConfirmation } from './real-consumer-contracts.mjs';
import { captureRepositoryState } from './real-consumer-snapshot.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const npmCli = join(root, 'node_modules/npm/bin/npm-cli.js');
const HEX64 = /^[0-9a-f]{64}$/u;
const evidenceDirectory = join(root, 'test-artifacts/release-evidence');
const ownerSourceDirectory = join(
  root,
  'docs/superpowers/evidence/release-runtime',
);

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function readJsonAuthority(path, label, residuals) {
  if (!existsSync(path)) {
    residuals.push(`${label}-missing`);
    return undefined;
  }
  try {
    const bytes = readFileSync(path);
    return Object.freeze({
      value: JSON.parse(bytes.toString('utf8')),
      sha256: sha256(bytes),
    });
  } catch {
    residuals.push(`${label}-invalid`);
    return undefined;
  }
}

function readEvidence(relativePath, residuals) {
  return readJsonAuthority(
    join(evidenceDirectory, relativePath),
    relativePath,
    residuals,
  );
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const residuals = [];
if (pkg.private !== false) residuals.push('package-private-not-false');
if (
  typeof pkg.version !== 'string' ||
  !/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/u.test(
    pkg.version,
  )
) {
  residuals.push('package-version-invalid');
}
if (!existsSync(join(root, 'npm-shrinkwrap.json'))) {
  residuals.push('npm-shrinkwrap-missing');
}
if (existsSync(join(root, 'package-lock.json'))) {
  residuals.push('package-lock-present');
}
for (const required of ['LICENSE', 'SECURITY.md']) {
  if (!existsSync(join(root, required))) {
    residuals.push(`${required.toLowerCase()}-missing`);
  }
}

let candidate;
try {
  candidate = loadReleaseCandidateV1(root, npmCli);
} catch {
  residuals.push('current-packed-candidate-missing-or-stale');
}
const revision = computeReleaseDesignRevisionV1({ requireClean: false });
const evidenceHashes = {};
const now = Date.now();

if (candidate !== undefined) {
  const expectedCandidate = releaseEvidenceCandidateV1(candidate);
  const closure = readEvidence('installed-closure-v1.json', residuals);
  if (closure !== undefined) {
    evidenceHashes.installedClosureSha256 = closure.sha256;
    try {
      validateInstalledClosureEvidenceV1(closure.value, expectedCandidate, {
        now,
      });
    } catch {
      residuals.push('installed-closure-evidence-invalid');
    }
  }

  const audit = readEvidence('installed-audit-v1.json', residuals);
  if (audit !== undefined) {
    evidenceHashes.installedAuditSha256 = audit.sha256;
    try {
      validateInstalledAuditEvidenceV1(audit.value, expectedCandidate, {
        now,
      });
    } catch {
      residuals.push('installed-audit-evidence-invalid');
    }
  }

  const sbom = readEvidence('installed-sbom-verification-v1.json', residuals);
  if (sbom !== undefined) {
    evidenceHashes.installedSbomSha256 = sbom.sha256;
    try {
      validateInstalledSbomEvidenceV1(sbom.value, expectedCandidate, {
        now,
      });
    } catch {
      residuals.push('installed-sbom-evidence-invalid');
    }
  }

  const preflightAuthority = readJsonAuthority(
    join(ownerSourceDirectory, 'public-beta-release-owner-preflight.json'),
    'owner-preflight-source',
    residuals,
  );
  const ownerActionsAuthority = readJsonAuthority(
    join(ownerSourceDirectory, 'public-beta-release-owner-actions.json'),
    'owner-actions-source',
    residuals,
  );
  const confirmationAuthority = readJsonAuthority(
    join(ownerSourceDirectory, 'public-beta-real-consumer-confirmation.json'),
    'real-consumer-confirmation-source',
    residuals,
  );

  let ownerSource;
  let confirmationSource;
  if (
    preflightAuthority !== undefined &&
    ownerActionsAuthority !== undefined &&
    confirmationAuthority !== undefined
  ) {
    try {
      validateOwnerPreflight(
        preflightAuthority.value,
        revision.designRevisionSha256,
      );
      const ownerActions = validateOwnerActions(ownerActionsAuthority.value, {
        candidate: Object.freeze({
          name: candidate.name,
          version: candidate.version,
          tarballSha256: candidate.tarballSha256,
          designRevisionSha256: revision.designRevisionSha256,
        }),
        preflight: preflightAuthority.value,
        now,
      });
      const confirmation = validateRealConsumerConfirmation(
        confirmationAuthority.value,
        { now },
      );
      for (const key of ['name', 'version', 'tarballSha256']) {
        if (confirmation.candidate[key] !== candidate[key]) {
          throw new Error('real consumer confirmation candidate mismatch');
        }
      }
      ownerSource = Object.freeze({
        ownerActionsDecisionSha256: ownerActions.decisionSha256,
        ownerActionsVerifiedAt: ownerActions.verifiedAt,
        ownerActionsSourceSha256: ownerActionsAuthority.sha256,
        confirmationDecisionSha256: confirmation.confirmationDecisionSha256,
        confirmationVerifiedAt: confirmation.verifiedAt,
        confirmationSourceSha256: confirmationAuthority.sha256,
        preflightSourceSha256: preflightAuthority.sha256,
      });
      const repository = captureRepositoryState(
        confirmation.canonicalRepositoryPath,
      );
      confirmationSource = Object.freeze({
        confirmationDecisionSha256: confirmation.confirmationDecisionSha256,
        confirmationVerifiedAt: confirmation.verifiedAt,
        confirmationSourceSha256: confirmationAuthority.sha256,
        confirmedHeadSha: confirmation.confirmedHeadSha,
        indexSha256: repository.indexSha256,
        worktreeTreeSha256: repository.worktreeTreeSha256,
        worktreeEntryCount: repository.worktreeEntryCount,
      });
    } catch {
      residuals.push('owner-or-consumer-source-authority-invalid');
    }
  }

  const owner = readEvidence('owner-actions-verification-v1.json', residuals);
  if (owner !== undefined) {
    evidenceHashes.ownerActionsVerificationSha256 = owner.sha256;
    if (ownerSource === undefined) {
      residuals.push('owner-actions-source-authority-unavailable');
    } else {
      try {
        validateOwnerVerificationEvidenceV1(
          owner.value,
          expectedCandidate,
          ownerSource,
          { now },
        );
      } catch {
        residuals.push('owner-actions-verification-evidence-invalid');
      }
    }
  }

  const realConsumer = readEvidence('real-consumer-e2e-v1.json', residuals);
  if (realConsumer !== undefined) {
    evidenceHashes.realConsumerEvidenceSha256 = realConsumer.sha256;
    if (confirmationSource === undefined) {
      residuals.push('real-consumer-source-authority-unavailable');
    } else {
      try {
        validateRealConsumerEvidenceV1(
          realConsumer.value,
          expectedCandidate,
          confirmationSource,
          { now },
        );
      } catch {
        residuals.push('real-consumer-evidence-invalid');
      }
    }
  }
}

const sixCell = spawnSync(
  process.execPath,
  [
    join(root, 'tools/ci/assert-public-beta-package-evidence.mjs'),
    '--require-six-cell',
  ],
  { cwd: root, encoding: 'utf8', shell: false },
);
if (sixCell.status !== 0 || sixCell.signal !== null) {
  residuals.push('remote-six-cell-evidence-missing-or-invalid');
} else {
  try {
    const parsed = JSON.parse(sixCell.stdout);
    const sixCellCandidate = parsed?.candidate;
    if (
      parsed?.ok !== true ||
      typeof parsed?.sixCellEvidenceSha256 !== 'string' ||
      !HEX64.test(parsed.sixCellEvidenceSha256) ||
      candidate === undefined ||
      sixCellCandidate?.name !== candidate.name ||
      sixCellCandidate?.version !== candidate.version ||
      sixCellCandidate?.tarballSha256 !== candidate.tarballSha256 ||
      sixCellCandidate?.sourceSha256 !== candidate.sourceSha256 ||
      sixCellCandidate?.designRevisionSha256 !== candidate.designRevisionSha256
    ) {
      residuals.push('remote-six-cell-evidence-invalid');
    } else {
      evidenceHashes.sixCellEvidenceSha256 = parsed.sixCellEvidenceSha256;
    }
  } catch {
    residuals.push('remote-six-cell-evidence-invalid');
  }
}

const body = {
  schemaVersion: 1,
  version: pkg.version,
  private: pkg.private,
  publishPerformed: false,
  designRevisionSha256: revision.designRevisionSha256,
  engines: pkg.engines?.node,
  shrinkwrapPresent: existsSync(join(root, 'npm-shrinkwrap.json')),
  candidate:
    candidate === undefined ? null : releaseEvidenceCandidateV1(candidate),
  evidenceHashes,
  residuals: Object.freeze([...new Set(residuals)].sort()),
};
const readinessSha256 = sha256(Buffer.from(JSON.stringify(body), 'utf8'));
const report = {
  ok: body.residuals.length === 0,
  ...body,
  readinessSha256,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) {
  process.exit(2);
}
