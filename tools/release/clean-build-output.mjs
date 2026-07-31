/**
 * Delete only the repository-root dist directory before fresh builds.
 */
import { rmSync, existsSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dist = join(root, 'dist');
if (existsSync(dist)) {
  const resolvedRoot = realpathSync(root);
  const resolvedDist = realpathSync(dist);
  if (
    resolvedDist !== join(resolvedRoot, 'dist') &&
    !resolvedDist.startsWith(resolvedRoot)
  ) {
    throw new Error('Refusing to delete dist outside repository root.');
  }
  rmSync(dist, { recursive: true, force: true });
}
