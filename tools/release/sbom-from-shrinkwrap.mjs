/**
 * Shared CycloneDX 1.5 builder from npm-shrinkwrap production projection.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RELEASE_BOUNDARIES_V1 } from './release-boundaries-v1.mjs';

/**
 * Build deterministic installed SBOM artifact from shrinkwrap.
 */
export function buildInstalledSbomFromShrinkwrap(repositoryRoot) {
  const pkg = JSON.parse(
    readFileSync(join(repositoryRoot, 'package.json'), 'utf8'),
  );
  if (!existsSync(join(repositoryRoot, 'npm-shrinkwrap.json'))) {
    throw new Error('npm-shrinkwrap.json required');
  }
  const wrap = JSON.parse(
    readFileSync(join(repositoryRoot, 'npm-shrinkwrap.json'), 'utf8'),
  );
  const packages = wrap.packages ?? {};
  const components = [];
  const bomRefByPath = new Map();

  for (const [pathKey, entry] of Object.entries(packages)) {
    if (entry?.dev === true) continue;
    const name =
      pathKey === ''
        ? pkg.name
        : (entry.name ?? pathKey.split('node_modules/').pop());
    const version = pathKey === '' ? pkg.version : entry.version;
    if (typeof name !== 'string' || typeof version !== 'string') continue;
    const bomRef = `pkg:npm/${name}@${version}`;
    bomRefByPath.set(pathKey, bomRef);
    components.push({
      type: 'library',
      'bom-ref': bomRef,
      name,
      version,
      purl: bomRef,
    });
  }

  const depends = new Map();
  for (const [pathKey, entry] of Object.entries(packages)) {
    if (entry?.dev === true) continue;
    const from = bomRefByPath.get(pathKey);
    if (from == null) continue;
    for (const depName of Object.keys(entry.dependencies ?? {})) {
      const childKey =
        pathKey === ''
          ? `node_modules/${depName}`
          : `${pathKey}/node_modules/${depName}`;
      const to =
        bomRefByPath.get(childKey) ??
        bomRefByPath.get(`node_modules/${depName}`);
      if (to == null) continue;
      const set = depends.get(from) ?? new Set();
      set.add(to);
      depends.set(from, set);
    }
  }

  const dependencies = [...depends.entries()]
    .map(([ref, set]) => ({
      ref,
      dependsOn: [...set].sort(),
    }))
    .sort((a, b) => a.ref.localeCompare(b.ref));
  components.sort((a, b) => a['bom-ref'].localeCompare(b['bom-ref']));

  if (components.length > RELEASE_BOUNDARIES_V1.sbomComponents) {
    throw new Error(
      `SBOM components ${components.length} exceed budget ${RELEASE_BOUNDARIES_V1.sbomComponents}`,
    );
  }
  const edgeCount = dependencies.reduce((n, d) => n + d.dependsOn.length, 0);
  if (edgeCount > RELEASE_BOUNDARIES_V1.sbomEdges) {
    throw new Error(
      `SBOM edges ${edgeCount} exceed budget ${RELEASE_BOUNDARIES_V1.sbomEdges}`,
    );
  }

  const bom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    metadata: {
      component: {
        type: 'application',
        'bom-ref': `pkg:npm/${pkg.name}@${pkg.version}`,
        name: pkg.name,
        version: pkg.version,
        purl: `pkg:npm/${pkg.name}@${pkg.version}`,
      },
    },
    components,
    dependencies,
  };
  const text = `${JSON.stringify(bom)}\n`;
  if (Buffer.byteLength(text, 'utf8') > RELEASE_BOUNDARIES_V1.sbomBytes) {
    throw new Error('SBOM bytes exceed budget');
  }
  return {
    bom,
    text,
    sha256: createHash('sha256').update(text).digest('hex'),
    componentCount: components.length,
    edgeCount,
    rootName: pkg.name,
    rootVersion: pkg.version,
  };
}
