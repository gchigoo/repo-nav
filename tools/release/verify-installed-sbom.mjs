/**
 * Verify canonical installed SBOM from shrinkwrap production graph.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { buildInstalledSbomFromShrinkwrap } from './sbom-from-shrinkwrap.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.private !== false) fail('private must be false for public beta');

let result;
try {
  result = buildInstalledSbomFromShrinkwrap(root);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

const rootRef = result.bom.metadata.component['bom-ref'];
if (rootRef !== `pkg:npm/${pkg.name}@${pkg.version}`) {
  fail('SBOM root bom-ref mismatch');
}
if (result.bom.specVersion !== '1.5') fail('SBOM specVersion must be 1.5');
if (result.componentCount < 1) fail('SBOM components empty');

// Required runtime deps that must appear when present in shrinkwrap.
for (const required of ['ajv', 'fast-uri', 'zod']) {
  const hit = result.bom.components.some(
    (c) => c.name === required || c.name.endsWith(`/${required}`),
  );
  const wrap = JSON.parse(
    readFileSync(join(root, 'npm-shrinkwrap.json'), 'utf8'),
  );
  const inWrap = Object.keys(wrap.packages ?? {}).some(
    (key) =>
      key === `node_modules/${required}` ||
      key.endsWith(`/node_modules/${required}`),
  );
  if (inWrap && !hit) fail(`SBOM missing component for ${required}`);
}

if (!existsSync(join(root, 'npm-shrinkwrap.json'))) {
  fail('npm-shrinkwrap.json required');
}

process.stdout.write(
  `${JSON.stringify(
    {
      ok: true,
      specVersion: result.bom.specVersion,
      componentCount: result.componentCount,
      edgeCount: result.edgeCount,
      sha256: result.sha256,
      root: rootRef,
    },
    null,
    2,
  )}\n`,
);
