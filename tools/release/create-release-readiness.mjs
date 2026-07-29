/**
 * Emit candidate-bound private-true publish-false readiness verdict from local facts.
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
if (pkg.private !== true) fail('private must be true');
if (pkg.version !== '0.2.0-beta.1') fail('version must be 0.2.0-beta.1');
if (!existsSync(join(root, 'npm-shrinkwrap.json'))) fail('shrinkwrap missing');
if (existsSync(join(root, 'package-lock.json')))
  fail('package-lock must not exist');
if (!existsSync(join(root, 'LICENSE'))) fail('LICENSE missing');
if (!existsSync(join(root, 'SECURITY.md'))) fail('SECURITY.md missing');

const revision = computeReleaseDesignRevisionV1({ requireClean: false });
const body = {
  schemaVersion: 1,
  version: pkg.version,
  private: true,
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
