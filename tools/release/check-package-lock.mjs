/**
 * Ensure single shrinkwrap authority and no dual lock.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
if (existsSync(join(root, 'package-lock.json'))) {
  process.stderr.write(
    'package-lock.json forbidden while shrinkwrap present\n',
  );
  process.exit(1);
}
const wrap = JSON.parse(
  readFileSync(join(root, 'npm-shrinkwrap.json'), 'utf8'),
);
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (wrap.version !== pkg.version || wrap.name !== pkg.name) {
  process.stderr.write('shrinkwrap name/version mismatch\n');
  process.exit(1);
}
process.stdout.write(`${JSON.stringify({ ok: true }, null, 2)}\n`);
