import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

export type TypeScriptImportGraph = ReadonlyMap<string, readonly string[]>;

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
      ? [unresolved.replace(/\.(?:js|mjs|cjs)$/u, '.ts'), unresolved]
      : [`${unresolved}.ts`, resolve(unresolved, 'index.ts')];
  const target = candidates.find(
    (candidate) =>
      existsSync(candidate) && candidate.startsWith(resolve(repositoryRoot)),
  );
  return target === undefined
    ? undefined
    : posixRelative(repositoryRoot, target);
}

function runtimeLocalSpecifiers(
  source: string,
  fileName: string,
): readonly string[] {
  const specifiers: string[] = [];
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      if (node.importClause?.isTypeOnly === true) {
        return;
      }
      const module = node.moduleSpecifier;
      if (ts.isStringLiteral(module) && module.text.startsWith('.')) {
        const clause = node.importClause;
        if (
          clause?.namedBindings &&
          ts.isNamedImports(clause.namedBindings) &&
          clause.namedBindings.elements.length > 0 &&
          clause.namedBindings.elements.every((element) => element.isTypeOnly)
        ) {
          // import { type X } from './y' with no value bindings
          if (clause.name === undefined) {
            return;
          }
        }
        specifiers.push(module.text);
      }
      return;
    }
    if (ts.isExportDeclaration(node)) {
      if (node.isTypeOnly) {
        return;
      }
      const module = node.moduleSpecifier;
      if (
        module !== undefined &&
        ts.isStringLiteral(module) &&
        module.text.startsWith('.')
      ) {
        specifiers.push(module.text);
      }
      return;
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] !== undefined &&
      ts.isStringLiteral(node.arguments[0]) &&
      node.arguments[0].text.startsWith('.')
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return specifiers;
}

/**
 * Build a runtime-only TypeScript import graph using the compiler AST.
 */
export function buildTypeScriptImportGraph(
  repositoryRoot: string,
): TypeScriptImportGraph {
  const files = [
    ...collectTypeScriptFiles(resolve(repositoryRoot, 'src')),
    ...collectTypeScriptFiles(resolve(repositoryRoot, 'tools')),
  ];
  const graph = new Map<string, readonly string[]>();
  for (const file of files) {
    const dependencies = runtimeLocalSpecifiers(
      readFileSync(file, 'utf8'),
      file,
    )
      .map((specifier) => resolveLocalImport(repositoryRoot, file, specifier))
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
  forbidden: (file: string, path: readonly string[]) => boolean,
): readonly (readonly string[])[] {
  const findings: string[][] = [];
  for (const root of roots) {
    const visit = (
      file: string,
      path: readonly string[],
      visited: ReadonlySet<string>,
    ): void => {
      if (forbidden(file, path)) {
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

/**
 * F8：EvidenceModule 可登记 accepted ready provider；经该边的 subtree 不算 cutover。
 */
export function isThroughAcceptedCompleteReadyProviderV2(
  file: string,
  path: readonly string[] = [],
): boolean {
  return (
    file.includes('accepted-complete-real-locate-shadow-orchestrator-v2') ||
    path.some((entry) =>
      entry.includes('accepted-complete-real-locate-shadow-orchestrator-v2'),
    )
  );
}

/**
 * F1C dangerous runtime modules that must stay unreachable from production roots.
 * F8：EvidenceModule 可登记 accepted ready provider；其 subtree 不记 forbidden。
 */
export function isForbiddenCanonicalBridgeRuntimeEdge(
  file: string,
  path: readonly string[] = [],
): boolean {
  if (isThroughAcceptedCompleteReadyProviderV2(file, path)) {
    return false;
  }
  return (
    file === 'src/contracts/v2/locate-result-v2.ts' ||
    file.includes('/evidence/public-output/') ||
    file.includes('/evidence/canonical/')
  );
}

/** F1B dormant v2 modules；同样豁免 F8 ready-provider subtree。 */
export function isForbiddenPublicOutputV2RuntimeEdge(
  file: string,
  path: readonly string[] = [],
): boolean {
  if (isThroughAcceptedCompleteReadyProviderV2(file, path)) {
    return false;
  }
  return (
    file === 'src/contracts/v2/locate-result-v2.ts' ||
    file.includes('/evidence/public-output/')
  );
}
