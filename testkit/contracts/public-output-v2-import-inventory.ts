import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import {
  dirname,
  extname,
  relative,
  resolve,
  sep,
} from 'node:path';

export type TypeScriptImportGraph = ReadonlyMap<
  string,
  readonly string[]
>;

function posixRelative(repositoryRoot: string, file: string): string {
  return relative(repositoryRoot, file).split(sep).join('/');
}

function collectTypeScriptFiles(directory: string): readonly string[] {
  const files: string[] = [];
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) {
        visit(path);
      } else if (
        entry.isFile() &&
        path.endsWith('.ts') &&
        !path.endsWith('.d.ts')
      ) {
        files.push(path);
      }
    }
  };
  if (existsSync(directory)) visit(directory);
  return files;
}

function resolveLocalImport(
  repositoryRoot: string,
  importer: string,
  specifier: string,
): string | undefined {
  const unresolved = resolve(dirname(importer), specifier);
  const candidates =
    extname(unresolved).length > 0
      ? [
          unresolved.replace(/\.(?:js|mjs|cjs)$/u, '.ts'),
          unresolved,
        ]
      : [`${unresolved}.ts`, resolve(unresolved, 'index.ts')];
  const target = candidates.find(
    (candidate) =>
      existsSync(candidate) &&
      candidate.startsWith(resolve(repositoryRoot)),
  );
  return target === undefined
    ? undefined
    : posixRelative(repositoryRoot, target);
}

function localSpecifiers(source: string): readonly string[] {
  const specifiers: string[] = [];
  const staticImport =
    /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"](\.[^'"]+)['"]/gu;
  const dynamicImport = /import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/gu;
  for (const pattern of [staticImport, dynamicImport]) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier !== undefined) specifiers.push(specifier);
    }
  }
  return specifiers;
}

export function buildTypeScriptImportGraph(
  repositoryRoot: string,
): TypeScriptImportGraph {
  const files = [
    ...collectTypeScriptFiles(resolve(repositoryRoot, 'src')),
    ...collectTypeScriptFiles(resolve(repositoryRoot, 'tools')),
  ];
  const graph = new Map<string, readonly string[]>();
  for (const file of files) {
    const dependencies = localSpecifiers(
      readFileSync(file, 'utf8'),
    )
      .map((specifier) =>
        resolveLocalImport(repositoryRoot, file, specifier),
      )
      .filter((value): value is string => value !== undefined);
    graph.set(
      posixRelative(repositoryRoot, file),
      Object.freeze([...new Set(dependencies)].sort()),
    );
  }
  return graph;
}

export function findForbiddenReachability(
  graph: TypeScriptImportGraph,
  roots: readonly string[],
  forbidden: (file: string) => boolean,
): readonly (readonly string[])[] {
  const findings: string[][] = [];
  for (const root of roots) {
    const visit = (
      file: string,
      path: readonly string[],
      visited: ReadonlySet<string>,
    ): void => {
      if (forbidden(file)) {
        findings.push([...path, file]);
        return;
      }
      if (visited.has(file)) return;
      const nextVisited = new Set(visited);
      nextVisited.add(file);
      for (const dependency of graph.get(file) ?? []) {
        visit(dependency, [...path, file], nextVisited);
      }
    };
    visit(root, [], new Set<string>());
  }
  return Object.freeze(findings);
}
