/**
 * Write canonical installed SBOM artifact from shrinkwrap.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildInstalledSbomFromShrinkwrap } from './sbom-from-shrinkwrap.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

try {
  const result = buildInstalledSbomFromShrinkwrap(root);
  const outDir = join(root, 'test-artifacts', 'release-sbom');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'installed-sbom.cdx.json'), result.text);
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        path: 'test-artifacts/release-sbom/installed-sbom.cdx.json',
        sha256: result.sha256,
        componentCount: result.componentCount,
        edgeCount: result.edgeCount,
        specVersion: result.bom.specVersion,
      },
      null,
      2,
    )}\n`,
  );
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
}
