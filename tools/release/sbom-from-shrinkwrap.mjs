/**
 * Shared production-graph and CycloneDX builders from a fresh consumer lockfile.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RELEASE_BOUNDARIES_V1 } from './release-boundaries-v1.mjs';

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new Error(`${label} JSON parse failed`);
  }
}

function packageNameFromPath(pathKey) {
  const marker = 'node_modules/';
  const index = pathKey.lastIndexOf(marker);
  if (index < 0) return null;
  const suffix = pathKey.slice(index + marker.length);
  if (suffix.startsWith('@')) {
    const segments = suffix.split('/');
    return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : null;
  }
  return suffix.split('/')[0] ?? null;
}

function dependencyTargetCandidates(pathKey, dependencyName) {
  const candidates = [`${pathKey}/node_modules/${dependencyName}`];
  let cursor = pathKey;
  while (true) {
    const marker = cursor.lastIndexOf('/node_modules/');
    if (marker < 0) break;
    cursor = cursor.slice(0, marker);
    candidates.push(`${cursor}/node_modules/${dependencyName}`);
  }
  candidates.push(`node_modules/${dependencyName}`);
  return [...new Set(candidates)];
}

function resolveDependencyTarget(
  packagePaths,
  pathKey,
  dependencyName,
  optional,
) {
  const target = dependencyTargetCandidates(pathKey, dependencyName).find(
    (candidate) => packagePaths.has(candidate),
  );
  if (target !== undefined) return target;
  if (optional) return null;
  throw new Error(
    `installed package-lock dependency missing: ${dependencyName}`,
  );
}

export function loadInstalledPackageLockGraphV1(
  consumerRoot,
  { packageName, packageVersion, packIntegrity },
) {
  if (
    typeof packageName !== 'string' ||
    packageName.length === 0 ||
    typeof packageVersion !== 'string' ||
    packageVersion.length === 0 ||
    typeof packIntegrity !== 'string' ||
    !/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(packIntegrity)
  ) {
    throw new Error('installed package-lock candidate binding required');
  }

  const consumerPkg = readJson(
    join(consumerRoot, 'package.json'),
    'fresh consumer package.json',
  );
  const lock = readJson(
    join(consumerRoot, 'package-lock.json'),
    'fresh consumer package-lock.json',
  );
  if (!isPlainObject(lock.packages)) {
    throw new Error('fresh consumer package-lock packages required');
  }
  if (
    lock.name !== consumerPkg.name ||
    lock.version !== consumerPkg.version ||
    !isPlainObject(lock.packages[''])
  ) {
    throw new Error('fresh consumer package-lock root identity mismatch');
  }
  const rootDependencies = lock.packages[''].dependencies;
  if (
    !isPlainObject(rootDependencies) ||
    Object.keys(rootDependencies).length !== 1 ||
    typeof rootDependencies[packageName] !== 'string'
  ) {
    throw new Error('fresh consumer must depend only on the release candidate');
  }

  const candidatePath = `node_modules/${packageName}`;
  const candidateEntry = lock.packages[candidatePath];
  if (
    !isPlainObject(candidateEntry) ||
    candidateEntry.version !== packageVersion ||
    candidateEntry.integrity !== packIntegrity
  ) {
    throw new Error('fresh consumer package-lock candidate mismatch');
  }

  const nodes = Object.entries(lock.packages)
    .filter(
      ([pathKey, entry]) =>
        pathKey !== '' && isPlainObject(entry) && entry.dev !== true,
    )
    .map(([pathKey, entry]) => {
      const name =
        pathKey === candidatePath
          ? packageName
          : (entry.name ?? packageNameFromPath(pathKey));
      if (typeof name !== 'string' || typeof entry.version !== 'string') {
        throw new Error(
          `installed package-lock node identity missing: ${pathKey}`,
        );
      }
      if (
        typeof entry.integrity !== 'string' ||
        !/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(entry.integrity)
      ) {
        throw new Error(
          `installed package-lock node integrity missing: ${pathKey}`,
        );
      }
      return Object.freeze({
        path: pathKey,
        name,
        version: entry.version,
        integrity: entry.integrity,
        dependencies: isPlainObject(entry.dependencies)
          ? Object.freeze({ ...entry.dependencies })
          : Object.freeze({}),
        optionalDependencies: isPlainObject(entry.optionalDependencies)
          ? Object.freeze({ ...entry.optionalDependencies })
          : Object.freeze({}),
      });
    })
    .sort((left, right) => left.path.localeCompare(right.path));

  if (!nodes.some((node) => node.path === candidatePath)) {
    throw new Error('installed package-lock candidate node missing');
  }
  if (nodes.length > RELEASE_BOUNDARIES_V1.productionGraphNodes) {
    throw new Error(
      `production nodes ${nodes.length} exceed budget ${RELEASE_BOUNDARIES_V1.productionGraphNodes}`,
    );
  }

  const packagePaths = new Set(nodes.map((node) => node.path));
  const edges = [];
  for (const node of nodes) {
    const requiredNames = Object.keys(node.dependencies).sort();
    const optionalNames = Object.keys(node.optionalDependencies).sort();
    for (const dependencyName of requiredNames) {
      const target = resolveDependencyTarget(
        packagePaths,
        node.path,
        dependencyName,
        false,
      );
      edges.push(Object.freeze({ from: node.path, to: target }));
    }
    for (const dependencyName of optionalNames) {
      if (requiredNames.includes(dependencyName)) continue;
      const target = resolveDependencyTarget(
        packagePaths,
        node.path,
        dependencyName,
        true,
      );
      if (target !== null) {
        edges.push(Object.freeze({ from: node.path, to: target }));
      }
    }
  }
  edges.sort((left, right) =>
    `${left.from}\0${left.to}`.localeCompare(`${right.from}\0${right.to}`),
  );
  if (edges.length > RELEASE_BOUNDARIES_V1.productionGraphEdges) {
    throw new Error(
      `production edges ${edges.length} exceed budget ${RELEASE_BOUNDARIES_V1.productionGraphEdges}`,
    );
  }

  return Object.freeze({
    packageName,
    packageVersion,
    candidatePath,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    nodeCount: nodes.length,
    edgeCount: edges.length,
  });
}

export function buildInstalledSbomFromPackageLock(
  consumerRoot,
  { packageName, packageVersion, packIntegrity, tarballSha256 },
) {
  if (
    typeof tarballSha256 !== 'string' ||
    !/^[0-9a-f]{64}$/u.test(tarballSha256)
  ) {
    throw new Error('SBOM tarballSha256 binding required');
  }
  const graph = loadInstalledPackageLockGraphV1(consumerRoot, {
    packageName,
    packageVersion,
    packIntegrity,
  });
  const nodeByPath = new Map(graph.nodes.map((node) => [node.path, node]));
  const componentByRef = new Map();
  for (const node of graph.nodes) {
    const bomRef = `pkg:npm/${node.name}@${node.version}`;
    componentByRef.set(bomRef, {
      type: 'library',
      'bom-ref': bomRef,
      name: node.name,
      version: node.version,
      purl: bomRef,
    });
  }
  const components = [...componentByRef.values()].sort((left, right) =>
    left['bom-ref'].localeCompare(right['bom-ref']),
  );
  if (components.length > RELEASE_BOUNDARIES_V1.sbomComponents) {
    throw new Error(
      `SBOM components ${components.length} exceed budget ${RELEASE_BOUNDARIES_V1.sbomComponents}`,
    );
  }

  const depends = new Map();
  for (const edge of graph.edges) {
    const fromNode = nodeByPath.get(edge.from);
    const toNode = nodeByPath.get(edge.to);
    if (fromNode === undefined || toNode === undefined) {
      throw new Error('SBOM graph edge references unknown node');
    }
    const from = `pkg:npm/${fromNode.name}@${fromNode.version}`;
    const to = `pkg:npm/${toNode.name}@${toNode.version}`;
    const targets = depends.get(from) ?? new Set();
    targets.add(to);
    depends.set(from, targets);
  }
  const dependencies = [...depends.entries()]
    .map(([ref, targets]) => ({ ref, dependsOn: [...targets].sort() }))
    .sort((left, right) => left.ref.localeCompare(right.ref));
  const edgeCount = dependencies.reduce(
    (count, dependency) => count + dependency.dependsOn.length,
    0,
  );
  if (edgeCount > RELEASE_BOUNDARIES_V1.sbomEdges) {
    throw new Error(
      `SBOM edges ${edgeCount} exceed budget ${RELEASE_BOUNDARIES_V1.sbomEdges}`,
    );
  }

  const rootRef = `pkg:npm/${packageName}@${packageVersion}`;
  if (!componentByRef.has(rootRef)) {
    throw new Error('SBOM root component missing from installed graph');
  }
  const bom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    metadata: {
      component: {
        type: 'application',
        'bom-ref': rootRef,
        name: packageName,
        version: packageVersion,
        purl: rootRef,
      },
      properties: [
        {
          name: 'repo-nav:release:tarballSha256',
          value: tarballSha256,
        },
      ],
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
    rootName: packageName,
    rootVersion: packageVersion,
    packageNames: Object.freeze(
      [...new Set(graph.nodes.map((node) => node.name))].sort(),
    ),
  };
}
