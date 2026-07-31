/**
 * Assert production runtime has no v1 projector / redactor reachability seams.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

const DELETED = Object.freeze([
  'src/evidence/locate-execution/v1-locate-result-projector.ts',
  'src/evidence/canonical/v2-shadow-locate-projector.ts',
  'src/evidence/public-output/synthetic-locate-projection-v2.ts',
  'tsconfig.cli.json',
]);

const FORBIDDEN = Object.freeze([
  'V1LocateResultProjector',
  'legacyV1Projection',
]);

const SCAN = Object.freeze([
  'src/mcp',
  'src/cli',
  'src/index.ts',
  'src/evidence/evidence.module.ts',
  'src/evidence/locate-execution',
]);

function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

function collectTs(abs) {
  const st = statSync(abs);
  if (st.isFile()) return abs.endsWith('.ts') ? [abs] : [];
  const out = [];
  for (const name of readdirSync(abs)) {
    if (name === 'node_modules' || name === 'dist') continue;
    out.push(...collectTs(join(abs, name)));
  }
  return out;
}

for (const rel of DELETED) {
  if (existsSync(join(root, rel))) fail(`forbidden path still exists: ${rel}`);
}

const index = readFileSync(join(root, 'src/index.ts'), 'utf8');
if (index.includes('evidence-redactor')) {
  fail('src/index.ts must not export evidence-redactor');
}
if (index.includes('redactLocateResult')) {
  fail('src/index.ts must not mention redactLocateResult');
}

for (const scan of SCAN) {
  const abs = join(root, scan);
  if (!existsSync(abs)) fail(`scan path missing: ${scan}`);
  for (const file of collectTs(abs)) {
    const text = readFileSync(file, 'utf8');
    for (const token of FORBIDDEN) {
      if (text.includes(token)) fail(`${file} contains ${token}`);
    }
    if (
      !file.replace(/\\/gu, '/').endsWith('/evidence-redactor.ts') &&
      (text.includes('redactLocateResult') ||
        text.includes('applyPublicErrorPolicy'))
    ) {
      fail(`${file} must not call v1 redactor/error policy`);
    }
  }
}

process.stdout.write(
  `${JSON.stringify({ ok: true, deleted: DELETED.length, scanned: SCAN.length }, null, 2)}\n`,
);
