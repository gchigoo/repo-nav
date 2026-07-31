/**
 * Emit candidate-bound public-ready publish-false readiness verdict from local facts.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeReleaseDesignRevisionV1 } from './design-revision.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.private !== false) fail('private must be false for public beta');
if (
  typeof pkg.version !== 'string' ||
  !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(pkg.version)
) {
  fail('version must be a semver release or prerelease');
}
if (!existsSync(join(root, 'npm-shrinkwrap.json'))) fail('shrinkwrap missing');
if (existsSync(join(root, 'package-lock.json')))
  fail('package-lock must not exist');
if (!existsSync(join(root, 'LICENSE'))) fail('LICENSE missing');
if (!existsSync(join(root, 'SECURITY.md'))) fail('SECURITY.md missing');

const revision = computeReleaseDesignRevisionV1({ requireClean: false });
const body = {
  schemaVersion: 1,
  version: pkg.version,
  private: false,
  publishPerformed: false,
  designRevisionSha256: revision.designRevisionSha256,
  engines: pkg.engines.node,
  shrinkwrapPresent: true,
};
const readinessSha256 = createHash('sha256')
  .update(JSON.stringify(body))
  .digest('hex');

process.stdout.write(
  `${JSON.stringify({ ok: true, ...body, readinessSha256 }, null, 2)}\n`,
);
