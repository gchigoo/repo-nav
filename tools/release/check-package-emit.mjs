/**
 * Verify source→emit bijection, no maps, LF, and no second dist/src tree.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const srcRoot = join(root, 'src');
const distRoot = join(root, 'dist');

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

if (!existsSync(distRoot)) {
  process.stderr.write('dist missing; run build first\n');
  process.exit(1);
}
if (existsSync(join(distRoot, 'src'))) {
  process.stderr.write('forbidden second dist/src tree\n');
  process.exit(1);
}

const sources = walk(srcRoot).filter((p) => p.endsWith('.ts'));
for (const src of sources) {
  const rel = relative(srcRoot, src).replace(/\\/g, '/').replace(/\.ts$/u, '');
  const js = join(distRoot, `${rel}.js`);
  const dts = join(distRoot, `${rel}.d.ts`);
  if (!existsSync(js) || !existsSync(dts)) {
    process.stderr.write(`missing emit for ${rel}\n`);
    process.exit(1);
  }
  if (
    existsSync(join(distRoot, `${rel}.js.map`)) ||
    existsSync(join(distRoot, `${rel}.d.ts.map`))
  ) {
    process.stderr.write(`map emit forbidden for ${rel}\n`);
    process.exit(1);
  }
  const jsText = readFileSync(js, 'utf8');
  if (jsText.includes('sourceMappingURL')) {
    process.stderr.write(`dangling sourceMappingURL in ${rel}.js\n`);
    process.exit(1);
  }
  if (jsText.includes('\r')) {
    process.stderr.write(`CRLF forbidden in ${rel}.js\n`);
    process.exit(1);
  }
}

process.stdout.write(
  `${JSON.stringify({ ok: true, sourceCount: sources.length }, null, 2)}\n`,
);
