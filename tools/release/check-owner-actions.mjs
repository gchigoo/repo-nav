/**
 * Validate owner preflight; exit 2 when candidate-bound final actions are missing.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeReleaseDesignRevisionV1 } from './design-revision.mjs';
import { validateOwnerPreflight } from './owner-action-schema.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
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

if (!existsSync(preflightPath)) {
  process.stderr.write('owner preflight missing\n');
  process.exit(1);
}

const revision = computeReleaseDesignRevisionV1();
const preflight = JSON.parse(readFileSync(preflightPath, 'utf8'));
validateOwnerPreflight(preflight, revision.designRevisionSha256);

const residuals = [];
if (!existsSync(actionsPath)) {
  residuals.push('candidate-bound-owner-actions-json-missing');
}
if (!existsSync(confirmationPath)) {
  residuals.push('real-consumer-confirmation-json-missing');
}

process.stdout.write(
  `${JSON.stringify(
    {
      ok: residuals.length === 0,
      preflightValidated: true,
      designRevisionSha256: revision.designRevisionSha256,
      residuals,
    },
    null,
    2,
  )}\n`,
);
if (residuals.length > 0) {
  process.exit(2);
}
