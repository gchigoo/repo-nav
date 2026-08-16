import { readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { executeCli } from '../../src/cli/execute.js';
import { createRepoNavMcpServer } from '../../src/mcp/repo-nav-mcp-server.js';
import { readPackageMetadata } from '../../src/runtime/package-metadata.js';
import {
  LEGACY_V1_API_REPLACEMENTS_V2,
  LEGACY_V1_NON_SUBPATH_API_KEYS_V2,
  LEGACY_V1_SOURCE_STATE_V2,
  type LegacyV1ApiReplacementV2,
  type LegacyV1SourceStateV2,
} from '../../testkit/fixtures/repository-hardening-v2/legacy-v1-api-map-v2.js';
import {
  PUBLIC_PACKAGE_EXPORT_DISPOSITIONS_V2,
  PUBLIC_PACKAGE_EXPORT_KEYS_V2,
  PUBLIC_PACKAGE_SUBPATH_EXPORTS_V2,
  type PublicPackageExportDispositionV2,
  type PublicPackageSubpathExportsV2,
} from '../../testkit/fixtures/repository-hardening-v2/public-package-subpaths-v2.js';
import {
  PUBLIC_ROOT_RUNTIME_EXPORT_KEYS_V2,
  PUBLIC_ROOT_TYPE_EXPORT_KEYS_V2,
} from '../../testkit/fixtures/repository-hardening-v2/public-root-api-v2.js';
import {
  VERSION_AUTHORITIES_V2,
  type VersionAuthorityV2,
} from '../../testkit/fixtures/repository-hardening-v2/version-authorities-v2.js';
import {
  WEAK_REGISTRY_DISPOSITIONS_V2,
  type WeakRegistryDispositionV2,
} from '../../testkit/fixtures/repository-hardening-v2/weak-registry-disposition-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

interface ExportInventoryV2 {
  readonly runtime: readonly string[];
  readonly types: readonly string[];
}

interface ObservedPackageSubpathExportsV2 extends ExportInventoryV2 {
  readonly specifier: string;
  readonly sourceFile: string;
}

interface WeakRegistrySiteV2 {
  readonly module: string;
  readonly binding: string;
  readonly keyType: string | null;
}

interface LegacySourceInventoryV2 {
  readonly state: LegacyV1SourceStateV2;
  readonly exports: readonly string[];
}

interface VersionAuthorityObservationV2 {
  readonly id: VersionAuthorityV2['id'];
  readonly module: string;
  readonly binding: string;
  readonly wiring: 'wired' | 'unwired';
  readonly actual: string | null;
}

interface SourceInventoryV2 {
  readonly root: ExportInventoryV2;
  readonly packageExportKeys: readonly string[];
  readonly packageSubpaths: readonly ObservedPackageSubpathExportsV2[];
  readonly legacy: LegacySourceInventoryV2;
  readonly weakSites: readonly WeakRegistrySiteV2[];
  readonly versionAuthorities: readonly VersionAuthorityObservationV2[];
}

interface InventoryFixtureV2 {
  readonly rootRuntime: readonly string[];
  readonly rootTypes: readonly string[];
  readonly packageExportKeys: readonly string[];
  readonly packageExportDispositions: readonly PublicPackageExportDispositionV2[];
  readonly packageSubpaths: readonly PublicPackageSubpathExportsV2[];
  readonly legacyState: LegacyV1SourceStateV2;
  readonly legacy: readonly LegacyV1ApiReplacementV2[];
  readonly weak: readonly WeakRegistryDispositionV2[];
  readonly versions: readonly VersionAuthorityV2[];
}

const repositoryRoot = resolve(import.meta.dirname, '../..');

const REQUIRED_LEGACY_MAPPINGS_V2 = Object.freeze([
  Object.freeze({
    legacy: 'repo-nav/legacy-v1',
    replacement: 'repo-nav',
    disposition: 'replace',
  }),
  Object.freeze({
    legacy: 'repo-nav/advanced',
    replacement: 'repo-nav/advanced',
    disposition: 'retained-root',
  }),
  Object.freeze({
    legacy: 'repo-nav/backends',
    replacement: 'repo-nav/backends',
    disposition: 'retained-root',
  }),
  Object.freeze({
    legacy: 'repo-nav/node',
    replacement: 'repo-nav/node',
    disposition: 'retained-root',
  }),
  Object.freeze({
    legacy: 'LocateResult',
    replacement: 'LocateResultV2',
    disposition: 'replace',
  }),
  Object.freeze({
    legacy: 'LocateToolOutput',
    replacement: 'LocateResultV2',
    disposition: 'replace',
  }),
  Object.freeze({
    legacy: 'LocateResultSchema',
    replacement: 'LocateResultV2Schema',
    disposition: 'replace',
  }),
  Object.freeze({
    legacy: 'LocateToolOutputSchema',
    replacement: 'LocateResultV2Schema',
    disposition: 'replace',
  }),
  Object.freeze({
    legacy: 'EvidencePack',
    replacement: 'EvidencePackV2',
    disposition: 'replace',
  }),
  Object.freeze({
    legacy: 'RepoNavToolError',
    replacement: 'RepoNavToolErrorV2',
    disposition: 'replace',
  }),
  Object.freeze({
    legacy: 'LocateRequest',
    replacement: 'LocateRequest',
    disposition: 'retained-root',
  }),
  Object.freeze({
    legacy: 'PackageMetadataV1',
    replacement: 'PackageMetadata',
    disposition: 'replace',
  }),
  Object.freeze({
    legacy: 'RepositorySearchBackend',
    replacement: null,
    disposition: 'removed-internal-only',
  }),
  Object.freeze({
    legacy: 'CodeGraphBackend.probe',
    replacement: 'CodeGraphBackend.probe',
    disposition: 'retained-root',
  }),
  Object.freeze({
    legacy: 'CodeGraphBackend.search',
    replacement: 'CodeGraphBackend.search',
    disposition: 'retained-root',
  }),
  Object.freeze({
    legacy: 'RipgrepBackend.probe',
    replacement: 'RipgrepBackend.probe',
    disposition: 'retained-root',
  }),
  Object.freeze({
    legacy: 'RipgrepBackend.search',
    replacement: 'RipgrepBackend.search',
    disposition: 'retained-root',
  }),
] as const satisfies readonly LegacyV1ApiReplacementV2[]);

function toPosixPath(value: string): string {
  return value.split(sep).join('/');
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right);
}

function diagnosticText(diagnostics: readonly ts.Diagnostic[]): string {
  return diagnostics
    .map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    )
    .join('\n');
}

function createInventoryProgramV2(): ts.Program {
  const configPath = resolve(repositoryRoot, 'tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error !== undefined) {
    throw new Error(diagnosticText([config.error]));
  }
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    repositoryRoot,
  );
  if (parsed.errors.length > 0) {
    throw new Error(diagnosticText(parsed.errors));
  }
  return ts.createProgram(parsed.fileNames, parsed.options);
}

function requireSourceFileV2(
  program: ts.Program,
  relativePath: string,
): ts.SourceFile {
  const sourceFile = program.getSourceFile(
    resolve(repositoryRoot, relativePath),
  );
  if (sourceFile === undefined) {
    throw new Error(`TypeScript program omitted ${relativePath}`);
  }
  return sourceFile;
}

function enumerateSourceFileExportsV2(
  program: ts.Program,
  sourceFile: ts.SourceFile,
): ExportInventoryV2 {
  const checker = program.getTypeChecker();
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (moduleSymbol === undefined) {
    throw new Error(
      `TypeScript checker omitted module symbol for ${sourceFile.fileName}`,
    );
  }

  const runtime: string[] = [];
  const types: string[] = [];
  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const target =
      (exported.flags & ts.SymbolFlags.Alias) !== 0
        ? checker.getAliasedSymbol(exported)
        : exported;
    if ((target.flags & ts.SymbolFlags.Value) !== 0) {
      runtime.push(exported.name);
    }
    if ((target.flags & ts.SymbolFlags.Type) !== 0) {
      types.push(exported.name);
    }
  }
  return Object.freeze({
    runtime: Object.freeze(runtime.sort()),
    types: Object.freeze(types.sort()),
  });
}

function enumerateModuleExportsV2(
  program: ts.Program,
  relativePath: string,
): ExportInventoryV2 {
  return enumerateSourceFileExportsV2(
    program,
    requireSourceFileV2(program, relativePath),
  );
}

function weakBindingV2(node: ts.NewExpression): string {
  const sourceFile = node.getSourceFile();
  let child: ts.Node = node;
  let parent = node.parent;
  while (parent !== undefined) {
    if (ts.isVariableDeclaration(parent) && parent.initializer === child) {
      return parent.name.getText(sourceFile);
    }
    if (ts.isPropertyDeclaration(parent) && parent.initializer === child) {
      return parent.name.getText(sourceFile);
    }
    if (ts.isPropertyAssignment(parent) && parent.initializer === child) {
      return parent.name.getText(sourceFile);
    }
    if (
      ts.isBinaryExpression(parent) &&
      parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      parent.right === child
    ) {
      return parent.left.getText(sourceFile);
    }
    child = parent;
    parent = parent.parent;
  }
  throw new Error(
    `Weak registry at ${sourceFile.fileName}:${String(
      sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    )} has no binding`,
  );
}

function enumerateWeakRegistrySitesV2(
  program: ts.Program,
): readonly WeakRegistrySiteV2[] {
  const sites: WeakRegistrySiteV2[] = [];
  for (const sourceFile of program.getSourceFiles()) {
    const module = toPosixPath(relative(repositoryRoot, sourceFile.fileName));
    if (
      sourceFile.isDeclarationFile ||
      (!module.startsWith('src/') && module !== 'src')
    ) {
      continue;
    }
    const visit = (node: ts.Node): void => {
      if (
        ts.isNewExpression(node) &&
        ts.isIdentifier(node.expression) &&
        (node.expression.text === 'WeakMap' ||
          node.expression.text === 'WeakSet')
      ) {
        sites.push(
          Object.freeze({
            module,
            binding: weakBindingV2(node),
            keyType: node.typeArguments?.[0]?.getText(sourceFile) ?? null,
          }),
        );
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return Object.freeze(
    sites.sort(
      (left, right) =>
        compareText(left.module, right.module) ||
        compareText(left.binding, right.binding),
    ),
  );
}

function readJsonRecordV2(relativePath: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(resolve(repositoryRoot, relativePath), 'utf8'),
  ) as Record<string, unknown>;
}

function requireStringFieldV2(
  record: Readonly<Record<string, unknown>>,
  field: string,
  owner: string,
): string {
  const value = record[field];
  if (typeof value !== 'string') {
    throw new Error(`${owner}.${field} must be a string`);
  }
  return value;
}

function packageExportSourceFileV2(
  specifier: string,
  target: unknown,
): string | null {
  if (specifier === '.' || !specifier.startsWith('./')) {
    return null;
  }
  const importTarget =
    typeof target === 'object' && target !== null && !Array.isArray(target)
      ? Reflect.get(target, 'import')
      : null;
  if (
    typeof importTarget !== 'string' ||
    !/^\.\/dist\/[a-z0-9-]+\.js$/u.test(importTarget)
  ) {
    return null;
  }
  return `src/${importTarget.slice('./dist/'.length, -'.js'.length)}.ts`;
}

function parseJavascriptSourceV2(relativePath: string): ts.SourceFile {
  const source = readFileSync(resolve(repositoryRoot, relativePath), 'utf8');
  return ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
}

function expressionPathV2(expression: ts.Expression): readonly string[] | null {
  if (ts.isIdentifier(expression)) {
    return [expression.text];
  }
  if (ts.isPropertyAccessExpression(expression)) {
    const prefix = expressionPathV2(expression.expression);
    return prefix === null ? null : [...prefix, expression.name.text];
  }
  if (
    ts.isElementAccessExpression(expression) &&
    expression.argumentExpression !== undefined &&
    ts.isStringLiteralLike(expression.argumentExpression)
  ) {
    const prefix = expressionPathV2(expression.expression);
    return prefix === null
      ? null
      : [...prefix, expression.argumentExpression.text];
  }
  return null;
}

interface BindingReferenceV2 {
  readonly expression: ts.Expression;
  readonly path: readonly string[];
}

interface ResolvedExpressionReferenceV2 {
  readonly root: ts.Expression;
  readonly path: readonly string[];
}

interface ConfirmationVersionBindingContextV2 {
  readonly packageVersion: string;
}

function propertyNameTextV2(name: ts.PropertyName): string | null {
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteralLike(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text;
  }
  if (
    ts.isComputedPropertyName(name) &&
    ts.isStringLiteralLike(name.expression)
  ) {
    return name.expression.text;
  }
  return null;
}

function registerBindingReferenceV2(
  name: ts.BindingName,
  expression: ts.Expression,
  path: readonly string[],
  bindings: Map<string, BindingReferenceV2>,
): void {
  if (ts.isIdentifier(name)) {
    bindings.set(name.text, { expression, path });
    return;
  }
  if (!ts.isObjectBindingPattern(name)) {
    return;
  }
  for (const element of name.elements) {
    if (element.dotDotDotToken !== undefined) {
      continue;
    }
    const key =
      element.propertyName === undefined
        ? ts.isIdentifier(element.name)
          ? element.name.text
          : null
        : propertyNameTextV2(element.propertyName);
    if (key !== null) {
      registerBindingReferenceV2(
        element.name,
        expression,
        [...path, key],
        bindings,
      );
    }
  }
}

function bindingReferencesV2(
  sourceFile: ts.SourceFile,
): ReadonlyMap<string, BindingReferenceV2> {
  const bindings = new Map<string, BindingReferenceV2>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
      registerBindingReferenceV2(node.name, node.initializer, [], bindings);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return bindings;
}

function unwrapExpressionV2(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
}

function resolveExpressionReferenceV2(
  expression: ts.Expression,
  bindings: ReadonlyMap<string, BindingReferenceV2>,
  seenBindings: ReadonlySet<string> = new Set<string>(),
): ResolvedExpressionReferenceV2 {
  const current = unwrapExpressionV2(expression);
  if (ts.isIdentifier(current)) {
    const binding = bindings.get(current.text);
    if (binding !== undefined && !seenBindings.has(current.text)) {
      const nextSeen = new Set(seenBindings);
      nextSeen.add(current.text);
      const resolved = resolveExpressionReferenceV2(
        binding.expression,
        bindings,
        nextSeen,
      );
      return {
        root: resolved.root,
        path: [...resolved.path, ...binding.path],
      };
    }
    return { root: current, path: [] };
  }
  if (ts.isPropertyAccessExpression(current)) {
    const resolved = resolveExpressionReferenceV2(
      current.expression,
      bindings,
      seenBindings,
    );
    return {
      root: resolved.root,
      path: [...resolved.path, current.name.text],
    };
  }
  if (
    ts.isElementAccessExpression(current) &&
    current.argumentExpression !== undefined &&
    ts.isStringLiteralLike(current.argumentExpression)
  ) {
    const resolved = resolveExpressionReferenceV2(
      current.expression,
      bindings,
      seenBindings,
    );
    return {
      root: resolved.root,
      path: [...resolved.path, current.argumentExpression.text],
    };
  }
  return { root: current, path: [] };
}

function objectLiteralPropertyV2(
  objectLiteral: ts.ObjectLiteralExpression,
  key: string,
): ts.Expression | null {
  for (const property of objectLiteral.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      propertyNameTextV2(property.name) === key
    ) {
      return property.initializer;
    }
    if (
      ts.isShorthandPropertyAssignment(property) &&
      property.name.text === key
    ) {
      return property.name;
    }
  }
  return null;
}

function staticStringValueV2(
  expression: ts.Expression,
  bindings: ReadonlyMap<string, BindingReferenceV2>,
  seenExpressions: ReadonlySet<ts.Expression> = new Set<ts.Expression>(),
): string | null {
  const current = unwrapExpressionV2(expression);
  if (seenExpressions.has(current)) {
    return null;
  }
  const nextSeen = new Set(seenExpressions);
  nextSeen.add(current);
  if (ts.isStringLiteralLike(current)) {
    return current.text;
  }
  const resolved = resolveExpressionReferenceV2(current, bindings);
  if (resolved.root !== current || resolved.path.length > 0) {
    if (resolved.path.length === 0) {
      return staticStringValueV2(resolved.root, bindings, nextSeen);
    }
    if (!ts.isObjectLiteralExpression(resolved.root)) {
      return null;
    }
    let value: ts.Expression = resolved.root;
    for (const key of resolved.path) {
      if (!ts.isObjectLiteralExpression(value)) {
        return null;
      }
      const property = objectLiteralPropertyV2(value, key);
      if (property === null) {
        return null;
      }
      value = unwrapExpressionV2(property);
    }
    return staticStringValueV2(value, bindings, nextSeen);
  }
  return null;
}

function isConfirmationCandidateVersionV2(
  expression: ts.Expression,
  bindings: ReadonlyMap<string, BindingReferenceV2>,
): boolean {
  const resolved = resolveExpressionReferenceV2(expression, bindings);
  return (
    ts.isIdentifier(resolved.root) &&
    resolved.root.text === 'confirmation' &&
    sameStringsV2(resolved.path, ['candidate', 'version'])
  );
}

interface ExpressionFactsV2 {
  readonly strings: Set<string>;
  readonly calls: Set<string>;
}

function variableInitializersV2(
  sourceFile: ts.SourceFile,
): ReadonlyMap<string, ts.Expression> {
  const declarations = new Map<string, ts.Expression>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined
    ) {
      declarations.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return declarations;
}

function collectExpressionFactsV2(
  node: ts.Node,
  declarations: ReadonlyMap<string, ts.Expression>,
  seenBindings: Set<string>,
  facts: ExpressionFactsV2,
): void {
  if (ts.isStringLiteralLike(node)) {
    facts.strings.add(node.text);
  }
  if (ts.isCallExpression(node)) {
    const path = expressionPathV2(node.expression);
    if (path !== null) {
      facts.calls.add(path.join('.'));
    }
  }
  if (ts.isIdentifier(node)) {
    const initializer = declarations.get(node.text);
    if (initializer !== undefined && !seenBindings.has(node.text)) {
      seenBindings.add(node.text);
      collectExpressionFactsV2(initializer, declarations, seenBindings, facts);
    }
  }
  ts.forEachChild(node, (child) =>
    collectExpressionFactsV2(child, declarations, seenBindings, facts),
  );
}

function isPackageJsonVersionAuthorityV2(
  expression: ts.Expression,
  bindings: ReadonlyMap<string, BindingReferenceV2>,
  declarations: ReadonlyMap<string, ts.Expression>,
): boolean {
  const resolved = resolveExpressionReferenceV2(expression, bindings);
  if (!sameStringsV2(resolved.path, ['version'])) {
    return false;
  }
  const facts: ExpressionFactsV2 = {
    strings: new Set<string>(),
    calls: new Set<string>(),
  };
  collectExpressionFactsV2(
    resolved.root,
    declarations,
    new Set<string>(),
    facts,
  );
  return (
    [...facts.strings].some((value) => value.includes('package.json')) &&
    facts.calls.has('JSON.parse') &&
    facts.calls.has('readFileSync')
  );
}

function exactTarballDescriptorVersionV2(
  expression: ts.Expression,
  bindings: ReadonlyMap<string, BindingReferenceV2>,
): string | null {
  const resolved = resolveExpressionReferenceV2(expression, bindings);
  if (
    !ts.isObjectLiteralExpression(resolved.root) ||
    !sameStringsV2(resolved.path, ['version'])
  ) {
    return null;
  }
  const version = staticStringValueV2(expression, bindings);
  const nameExpression = objectLiteralPropertyV2(resolved.root, 'name');
  const name =
    nameExpression === null
      ? null
      : staticStringValueV2(nameExpression, bindings);
  if (version === null || name !== 'repo-nav') {
    return null;
  }
  const filenameExpression =
    objectLiteralPropertyV2(resolved.root, 'tarballFilename') ??
    objectLiteralPropertyV2(resolved.root, 'filename');
  const filename =
    filenameExpression === null
      ? null
      : staticStringValueV2(filenameExpression, bindings);
  if (filename !== null && filename.endsWith(`-${version}.tgz`)) {
    return version;
  }
  const shaExpression = objectLiteralPropertyV2(resolved.root, 'tarballSha256');
  const sha =
    shaExpression === null
      ? null
      : staticStringValueV2(shaExpression, bindings);
  return sha !== null && /^[0-9a-f]{64}$/u.test(sha) ? version : null;
}

function exactConfirmationAuthorityVersionV2(
  expression: ts.Expression,
  bindings: ReadonlyMap<string, BindingReferenceV2>,
  declarations: ReadonlyMap<string, ts.Expression>,
  context: ConfirmationVersionBindingContextV2,
): string | null {
  if (isPackageJsonVersionAuthorityV2(expression, bindings, declarations)) {
    return context.packageVersion;
  }
  return exactTarballDescriptorVersionV2(expression, bindings);
}

function statementAlwaysRejectsV2(statement: ts.Statement): boolean {
  if (ts.isThrowStatement(statement)) {
    return true;
  }
  if (ts.isBlock(statement)) {
    const last = statement.statements[statement.statements.length - 1];
    return last !== undefined && statementAlwaysRejectsV2(last);
  }
  return false;
}

function confirmationBindingFromConditionV2(
  condition: ts.Expression,
  rejectWhenTrue: boolean,
  bindings: ReadonlyMap<string, BindingReferenceV2>,
  declarations: ReadonlyMap<string, ts.Expression>,
  context: ConfirmationVersionBindingContextV2,
): string | null {
  const current = unwrapExpressionV2(condition);
  if (
    ts.isPrefixUnaryExpression(current) &&
    current.operator === ts.SyntaxKind.ExclamationToken
  ) {
    return confirmationBindingFromConditionV2(
      current.operand,
      !rejectWhenTrue,
      bindings,
      declarations,
      context,
    );
  }
  if (!ts.isBinaryExpression(current)) {
    return null;
  }
  if (
    rejectWhenTrue &&
    current.operatorToken.kind === ts.SyntaxKind.BarBarToken
  ) {
    return (
      confirmationBindingFromConditionV2(
        current.left,
        true,
        bindings,
        declarations,
        context,
      ) ??
      confirmationBindingFromConditionV2(
        current.right,
        true,
        bindings,
        declarations,
        context,
      )
    );
  }
  if (
    !rejectWhenTrue &&
    current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
  ) {
    return (
      confirmationBindingFromConditionV2(
        current.left,
        false,
        bindings,
        declarations,
        context,
      ) ??
      confirmationBindingFromConditionV2(
        current.right,
        false,
        bindings,
        declarations,
        context,
      )
    );
  }
  const isMismatch =
    current.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken ||
    current.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken;
  const isMatch =
    current.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken ||
    current.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken;
  if ((rejectWhenTrue && !isMismatch) || (!rejectWhenTrue && !isMatch)) {
    return null;
  }
  if (isConfirmationCandidateVersionV2(current.left, bindings)) {
    return exactConfirmationAuthorityVersionV2(
      current.right,
      bindings,
      declarations,
      context,
    );
  }
  if (isConfirmationCandidateVersionV2(current.right, bindings)) {
    return exactConfirmationAuthorityVersionV2(
      current.left,
      bindings,
      declarations,
      context,
    );
  }
  return null;
}

/**
 * Counts only fail-closed equality with a package.json version read or an exact
 * tarball descriptor. Shape checks and unused reads never produce an actual.
 */
function readConfirmationVersionBindingV2(
  sourceFile: ts.SourceFile,
  context: ConfirmationVersionBindingContextV2,
): string | null {
  const bindings = bindingReferencesV2(sourceFile);
  const declarations = variableInitializersV2(sourceFile);
  const versions = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isIfStatement(node)) {
      if (statementAlwaysRejectsV2(node.thenStatement)) {
        const version = confirmationBindingFromConditionV2(
          node.expression,
          true,
          bindings,
          declarations,
          context,
        );
        if (version !== null) {
          versions.add(version);
        }
      }
      if (
        node.elseStatement !== undefined &&
        statementAlwaysRejectsV2(node.elseStatement)
      ) {
        const version = confirmationBindingFromConditionV2(
          node.expression,
          false,
          bindings,
          declarations,
          context,
        );
        if (version !== null) {
          versions.add(version);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return versions.size === 1 ? ([...versions][0] ?? null) : null;
}

function sourceHasInstalledPackageVersionBindingV2(
  sourceFile: ts.SourceFile,
): boolean {
  const declarations = variableInitializersV2(sourceFile);
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }
    if (ts.isPropertyAccessExpression(node) && node.name.text === 'version') {
      const facts: ExpressionFactsV2 = {
        strings: new Set<string>(),
        calls: new Set<string>(),
      };
      collectExpressionFactsV2(node, declarations, new Set<string>(), facts);
      const pathEvidence = [...facts.strings].join('/');
      if (
        pathEvidence.includes('node_modules') &&
        pathEvidence.includes('package.json') &&
        (facts.calls.has('JSON.parse') || facts.calls.has('parseJson')) &&
        facts.calls.has('readFileSync')
      ) {
        found = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function expressionReferencesPropertyV2(
  node: ts.Node,
  propertyName: string,
  declarations: ReadonlyMap<string, ts.Expression>,
  seenBindings: Set<string>,
): boolean {
  if (ts.isPropertyAccessExpression(node) && node.name.text === propertyName) {
    return true;
  }
  if (
    ts.isElementAccessExpression(node) &&
    node.argumentExpression !== undefined &&
    ts.isStringLiteralLike(node.argumentExpression) &&
    node.argumentExpression.text === propertyName
  ) {
    return true;
  }
  if (ts.isIdentifier(node)) {
    const initializer = declarations.get(node.text);
    if (initializer !== undefined && !seenBindings.has(node.text)) {
      const nextBindings = new Set(seenBindings);
      nextBindings.add(node.text);
      if (
        expressionReferencesPropertyV2(
          initializer,
          propertyName,
          declarations,
          nextBindings,
        )
      ) {
        return true;
      }
    }
  }
  return node
    .getChildren()
    .some((child) =>
      expressionReferencesPropertyV2(
        child,
        propertyName,
        declarations,
        new Set(seenBindings),
      ),
    );
}

function expressionUsesNpmPackFilenameV2(
  expression: ts.Expression,
  declarations: ReadonlyMap<string, ts.Expression>,
): boolean {
  const facts: ExpressionFactsV2 = {
    strings: new Set<string>(),
    calls: new Set<string>(),
  };
  collectExpressionFactsV2(expression, declarations, new Set<string>(), facts);
  return (
    facts.strings.has('pack') &&
    facts.strings.has('--json') &&
    facts.strings.has('--pack-destination') &&
    facts.calls.has('run') &&
    facts.calls.has('JSON.parse') &&
    expressionReferencesPropertyV2(
      expression,
      'filename',
      declarations,
      new Set<string>(),
    )
  );
}

function sourceHasNpmPackFilenameBindingV2(sourceFile: ts.SourceFile): boolean {
  const declarations = variableInitializersV2(sourceFile);
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'writeReleaseCandidateManifestV1'
    ) {
      const input = node.arguments[0];
      if (input !== undefined && ts.isObjectLiteralExpression(input)) {
        const tarballPath = objectLiteralPropertyV2(input, 'tarballPath');
        const publishedTarballPath = objectLiteralPropertyV2(
          input,
          'publishedTarballPath',
        );
        if (
          tarballPath !== null &&
          publishedTarballPath !== null &&
          expressionUsesNpmPackFilenameV2(tarballPath, declarations) &&
          expressionUsesNpmPackFilenameV2(publishedTarballPath, declarations)
        ) {
          found = true;
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function npmPackFilenameV2(name: string, version: string): string {
  const packageStem = name.startsWith('@')
    ? name.slice(1).replaceAll('/', '-')
    : name;
  return `${packageStem}-${version}.tgz`;
}

async function readMcpServerVersionV2(): Promise<string | null> {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const server = createRepoNavMcpServer(async () => ({ content: [] }));
  const client = new Client({
    name: 'repository-hardening-inventory',
    version: '0.0.0',
  });
  await server.connect(serverTransport);
  try {
    await client.connect(clientTransport);
    return client.getServerVersion()?.version ?? null;
  } finally {
    await client.close();
    await server.close();
  }
}

function observationV2(
  id: VersionAuthorityV2['id'],
  module: string,
  binding: string,
  actual: string | null,
): VersionAuthorityObservationV2 {
  return Object.freeze({
    id,
    module,
    binding,
    wiring: actual === null ? 'unwired' : 'wired',
    actual,
  });
}

async function enumerateVersionAuthorityObservationsV2(): Promise<
  readonly VersionAuthorityObservationV2[]
> {
  const pkg = readJsonRecordV2('package.json');
  const packageName = requireStringFieldV2(pkg, 'name', 'package.json');
  const packageVersion = requireStringFieldV2(pkg, 'version', 'package.json');
  const shrinkwrap = readJsonRecordV2('npm-shrinkwrap.json');
  const shrinkwrapVersion = requireStringFieldV2(
    shrinkwrap,
    'version',
    'npm-shrinkwrap.json',
  );
  const packages = shrinkwrap['packages'];
  const workspace =
    typeof packages === 'object' && packages !== null
      ? Reflect.get(packages, '')
      : undefined;
  if (typeof workspace !== 'object' || workspace === null) {
    throw new Error('npm-shrinkwrap.json packages[""] must be an object');
  }
  const workspaceVersion = requireStringFieldV2(
    workspace as Record<string, unknown>,
    'version',
    'npm-shrinkwrap.json packages[""]',
  );

  const cli = await executeCli(['--version'], new AbortController().signal);
  const cliVersion = cli.exitCode === 0 ? cli.stdout : null;
  const mcpVersion = await readMcpServerVersionV2();

  const packSource = parseJavascriptSourceV2(
    'tools/release/pack-candidate.mjs',
  );
  const tarballWired = sourceHasNpmPackFilenameBindingV2(packSource);
  const releaseCandidateSource = parseJavascriptSourceV2(
    'tools/release/release-candidate.mjs',
  );
  const installedPackageWired = sourceHasInstalledPackageVersionBindingV2(
    releaseCandidateSource,
  );

  const sbomSource = parseJavascriptSourceV2(
    'tools/release/sbom-from-shrinkwrap.mjs',
  ).getFullText();
  const sbomWired =
    sbomSource.includes(
      'const rootRef = `pkg:npm/${packageName}@${packageVersion}`',
    ) &&
    sbomSource.includes("'bom-ref': rootRef") &&
    sbomSource.includes('version: packageVersion') &&
    sbomSource.includes('purl: rootRef');

  const confirmationSource = parseJavascriptSourceV2(
    'tools/release/real-consumer-contracts.mjs',
  );
  const confirmationVersion = readConfirmationVersionBindingV2(
    confirmationSource,
    { packageVersion },
  );

  return Object.freeze([
    observationV2(
      'package-json-root',
      'package.json',
      'version',
      packageVersion,
    ),
    observationV2(
      'shrinkwrap-root',
      'npm-shrinkwrap.json',
      'version',
      shrinkwrapVersion,
    ),
    observationV2(
      'shrinkwrap-workspace-root',
      'npm-shrinkwrap.json',
      'packages[""].version',
      workspaceVersion,
    ),
    observationV2(
      'runtime-package-metadata',
      'src/runtime/package-metadata.ts',
      'readPackageMetadata().version',
      readPackageMetadata().version,
    ),
    observationV2(
      'cli-version',
      'src/cli/execute.ts',
      'executeCli(["--version"]).stdout',
      cliVersion,
    ),
    observationV2(
      'mcp-server-info',
      'src/mcp/repo-nav-mcp-server.ts',
      'serverInfo.version',
      mcpVersion,
    ),
    observationV2(
      'tarball-filename',
      'tools/release/pack-candidate.mjs',
      'npm pack filename',
      tarballWired ? npmPackFilenameV2(packageName, packageVersion) : null,
    ),
    observationV2(
      'installed-package-json',
      'tools/release/release-candidate.mjs',
      'fresh consumer node_modules/repo-nav/package.json.version',
      installedPackageWired ? packageVersion : null,
    ),
    observationV2(
      'sbom-root',
      'tools/release/sbom-from-shrinkwrap.mjs',
      'bom.metadata.component.purl',
      sbomWired ? `pkg:npm/${packageName}@${packageVersion}` : null,
    ),
    observationV2(
      'real-consumer-confirmation',
      'tools/release/real-consumer-contracts.mjs',
      'confirmation.candidate.version',
      confirmationVersion,
    ),
  ]);
}

async function readSourceInventoryV2(): Promise<SourceInventoryV2> {
  const program = createInventoryProgramV2();
  const legacySourceFile = program.getSourceFile(
    resolve(repositoryRoot, 'src/legacy-v1.ts'),
  );
  const legacy: LegacySourceInventoryV2 =
    legacySourceFile === undefined
      ? Object.freeze({ state: 'removed', exports: Object.freeze([]) })
      : Object.freeze({
          state: 'present',
          exports: Object.freeze(
            (() => {
              const inventory = enumerateSourceFileExportsV2(
                program,
                legacySourceFile,
              );
              return [
                ...new Set([...inventory.runtime, ...inventory.types]),
              ].sort(compareText);
            })(),
          ),
        });

  const pkg = readJsonRecordV2('package.json');
  const packageExports = pkg['exports'];
  if (
    typeof packageExports !== 'object' ||
    packageExports === null ||
    Array.isArray(packageExports)
  ) {
    throw new Error('package.json exports must be an object');
  }

  const packageExportKeys = Object.keys(packageExports).sort(compareText);
  const packageSubpaths = packageExportKeys.flatMap((specifier) => {
    const sourceFile = packageExportSourceFileV2(
      specifier,
      Reflect.get(packageExports, specifier),
    );
    if (sourceFile === null || specifier === './legacy-v1') {
      return [];
    }
    const observed = enumerateModuleExportsV2(program, sourceFile);
    return [
      Object.freeze({
        specifier,
        sourceFile,
        runtime: observed.runtime,
        types: observed.types,
      }),
    ];
  });

  return Object.freeze({
    root: enumerateModuleExportsV2(program, 'src/index.ts'),
    packageExportKeys: Object.freeze(packageExportKeys),
    packageSubpaths: Object.freeze(packageSubpaths),
    legacy,
    weakSites: enumerateWeakRegistrySitesV2(program),
    versionAuthorities: await enumerateVersionAuthorityObservationsV2(),
  });
}

function fixtureInventoryV2(): InventoryFixtureV2 {
  return {
    rootRuntime: [...PUBLIC_ROOT_RUNTIME_EXPORT_KEYS_V2],
    rootTypes: [...PUBLIC_ROOT_TYPE_EXPORT_KEYS_V2],
    packageExportKeys: [...PUBLIC_PACKAGE_EXPORT_KEYS_V2],
    packageExportDispositions: PUBLIC_PACKAGE_EXPORT_DISPOSITIONS_V2.map(
      (entry) => ({ ...entry }),
    ),
    packageSubpaths: PUBLIC_PACKAGE_SUBPATH_EXPORTS_V2.map((entry) => ({
      ...entry,
      runtime: [...entry.runtime],
      types: [...entry.types],
    })),
    legacyState: LEGACY_V1_SOURCE_STATE_V2,
    legacy: LEGACY_V1_API_REPLACEMENTS_V2.map((entry) => ({ ...entry })),
    weak: WEAK_REGISTRY_DISPOSITIONS_V2.map((entry) => ({ ...entry })),
    versions: VERSION_AUTHORITIES_V2.map((entry) => ({ ...entry })),
  };
}

function sameStringsV2(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function duplicateValuesV2(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates].sort(compareText);
}

function weakKeyV2(
  row: Pick<WeakRegistryDispositionV2, 'module' | 'binding'>,
): string {
  return `${row.module}\u0000${row.binding}`;
}

function evaluateRepositoryHardeningInventoryV2(
  fixture: InventoryFixtureV2,
  source: SourceInventoryV2,
): readonly string[] {
  const issues: string[] = [];

  for (const [label, values] of [
    ['root runtime exports', fixture.rootRuntime],
    ['root type exports', fixture.rootTypes],
  ] as const) {
    const duplicates = duplicateValuesV2(values);
    if (duplicates.length > 0) {
      issues.push(`${label} contain duplicates: ${duplicates.join(', ')}`);
    }
  }
  if (!sameStringsV2(fixture.rootRuntime, source.root.runtime)) {
    issues.push('root runtime exports are not deep-exact');
  }
  if (!sameStringsV2(fixture.rootTypes, source.root.types)) {
    issues.push('root type exports are not deep-exact');
  }

  const packageExportDuplicates = duplicateValuesV2(fixture.packageExportKeys);
  if (packageExportDuplicates.length > 0) {
    issues.push(
      `package exports contain duplicates: ${packageExportDuplicates.join(', ')}`,
    );
  }
  if (
    !sameStringsV2(
      [...fixture.packageExportKeys].sort(compareText),
      [...source.packageExportKeys].sort(compareText),
    )
  ) {
    issues.push('package export keys are not deep-exact');
  }

  const dispositionSpecifiers = fixture.packageExportDispositions.map(
    (entry) => entry.specifier,
  );
  const duplicateDispositions = duplicateValuesV2(dispositionSpecifiers);
  if (duplicateDispositions.length > 0) {
    issues.push(
      `package export dispositions contain duplicates: ${duplicateDispositions.join(', ')}`,
    );
  }
  if (
    !sameStringsV2(
      [...dispositionSpecifiers].sort(compareText),
      [...fixture.packageExportKeys].sort(compareText),
    )
  ) {
    issues.push('package export dispositions are not deep-exact');
  }
  const dispositionsBySpecifier = new Map(
    fixture.packageExportDispositions.map((entry) => [entry.specifier, entry]),
  );
  const legacyDisposition = dispositionsBySpecifier.get('./legacy-v1');
  if (
    (legacyDisposition !== undefined &&
      legacyDisposition.action !== 'remove-c5') ||
    [...dispositionsBySpecifier.values()].some(
      (entry) =>
        entry.specifier !== './legacy-v1' && entry.action !== 'retain-c5',
    )
  ) {
    issues.push('package export C5 dispositions are inconsistent');
  }

  const sourceSubpathsBySpecifier = new Map(
    source.packageSubpaths.map((entry) => [entry.specifier, entry] as const),
  );
  const fixtureSubpathSpecifiers = fixture.packageSubpaths.map(
    (entry) => entry.specifier,
  );
  const duplicateSubpaths = duplicateValuesV2(fixtureSubpathSpecifiers);
  if (duplicateSubpaths.length > 0) {
    issues.push(
      `package subpaths contain duplicates: ${duplicateSubpaths.join(', ')}`,
    );
  }
  if (
    !sameStringsV2(
      [...fixtureSubpathSpecifiers].sort(compareText),
      [...sourceSubpathsBySpecifier.keys()].sort(compareText),
    )
  ) {
    issues.push('package subpath inventories are not deep-exact');
  }
  const retainedAdapterSubpaths = fixture.packageExportDispositions
    .filter(
      (entry) =>
        entry.action === 'retain-c5' &&
        entry.specifier.startsWith('./') &&
        entry.specifier !== './package.json',
    )
    .map((entry) => entry.specifier);
  if (
    !sameStringsV2(
      [...fixtureSubpathSpecifiers].sort(compareText),
      [...retainedAdapterSubpaths].sort(compareText),
    )
  ) {
    issues.push('retained package subpath inventories are not deep-exact');
  }
  for (const expected of fixture.packageSubpaths) {
    if (!fixture.packageExportKeys.includes(expected.specifier)) {
      issues.push(`package subpath export is missing: ${expected.specifier}`);
    }
    if (
      dispositionsBySpecifier.get(expected.specifier)?.action !== 'retain-c5'
    ) {
      issues.push(
        `package subpath is not retained for C5: ${expected.specifier}`,
      );
    }
    const observed = sourceSubpathsBySpecifier.get(expected.specifier);
    if (observed === undefined) {
      issues.push(`package subpath is not observed: ${expected.specifier}`);
      continue;
    }
    if (observed.sourceFile !== expected.sourceFile) {
      issues.push(`package subpath source mismatch: ${expected.specifier}`);
    }
    if (!sameStringsV2(expected.runtime, observed.runtime)) {
      issues.push(
        `package subpath runtime exports mismatch: ${expected.specifier}`,
      );
    }
    if (!sameStringsV2(expected.types, observed.types)) {
      issues.push(
        `package subpath type exports mismatch: ${expected.specifier}`,
      );
    }
  }

  const legacyKeys = fixture.legacy.map((entry) => entry.legacy);
  const duplicateLegacy = duplicateValuesV2(legacyKeys);
  if (duplicateLegacy.length > 0) {
    issues.push(
      `legacy mappings contain duplicates: ${duplicateLegacy.join(', ')}`,
    );
  }
  if (fixture.legacyState !== source.legacy.state) {
    issues.push(
      'legacy source state does not match the fixture-owned phase state',
    );
  }
  if (fixture.legacyState === 'present' && source.legacy.state === 'present') {
    const expectedLegacyKeys = [
      ...source.legacy.exports,
      ...LEGACY_V1_NON_SUBPATH_API_KEYS_V2,
    ].sort(compareText);
    if (!sameStringsV2([...legacyKeys].sort(compareText), expectedLegacyKeys)) {
      issues.push('legacy mappings are not deep-exact with legacy exports');
    }
  }
  const legacyByName = new Map(
    fixture.legacy.map((entry) => [entry.legacy, entry] as const),
  );
  for (const entry of fixture.legacy) {
    const replacement = entry.replacement;
    if (entry.legacy.trim().length === 0) {
      issues.push('legacy mapping contains an empty symbol');
    }
    if (entry.disposition === 'removed-internal-only') {
      if (replacement !== null) {
        issues.push(`${entry.legacy} removal must have null replacement`);
      }
    } else if (
      replacement === null ||
      replacement.trim().length === 0 ||
      /(?:TODO|TBD|placeholder|unknown|later)/iu.test(replacement)
    ) {
      issues.push(`${entry.legacy} replacement is missing or a placeholder`);
    }
  }
  for (const required of REQUIRED_LEGACY_MAPPINGS_V2) {
    const actual = legacyByName.get(required.legacy);
    if (
      actual === undefined ||
      actual.replacement !== required.replacement ||
      actual.disposition !== required.disposition
    ) {
      issues.push(`required legacy mapping mismatch: ${required.legacy}`);
    }
  }
  for (const entry of fixture.legacy) {
    if (
      /^(?:SafeProcess|SafeStdout|StreamingSafeProcess)/u.test(entry.legacy) &&
      (entry.disposition !== 'removed-internal-only' ||
        entry.replacement !== null)
    ) {
      issues.push(`${entry.legacy} must be removed-internal-only`);
    }
  }

  const weakKeys = fixture.weak.map(weakKeyV2);
  const duplicateWeak = duplicateValuesV2(weakKeys);
  if (duplicateWeak.length > 0) {
    issues.push(
      `weak registry dispositions contain duplicates: ${duplicateWeak.join(', ')}`,
    );
  }
  for (const entry of fixture.weak) {
    if (
      entry.module.trim().length === 0 ||
      entry.binding.trim().length === 0 ||
      entry.rationale.trim().length === 0
    ) {
      issues.push(
        `weak registry disposition is incomplete: ${weakKeyV2(entry)}`,
      );
    }
    if (entry.carries === 'ordinary-data' && entry.action === 'retain') {
      issues.push(
        `ordinary-data registry cannot be retained: ${weakKeyV2(entry)}`,
      );
    }
  }
  const sourceWeakKeys = source.weakSites.map(weakKeyV2);
  if (
    !sameStringsV2(
      [...weakKeys].sort(compareText),
      [...sourceWeakKeys].sort(compareText),
    )
  ) {
    issues.push('weak registry dispositions are not deep-exact with source');
  }
  const weakDispositionByKey = new Map(
    fixture.weak.map((entry) => [weakKeyV2(entry), entry] as const),
  );
  for (const site of source.weakSites) {
    const keyType = site.keyType ?? '';
    const disposition = weakDispositionByKey.get(weakKeyV2(site));
    if (
      (keyType === 'object' && disposition?.carries !== 'identity-cache') ||
      /(?:OutcomeContributionV2|CanonicalLocateExecutionV2|FinalizeLocateResultInputV2)/u.test(
        keyType,
      )
    ) {
      issues.push(
        `ordinary business data cannot be a weak-registry key: ${weakKeyV2(site)}`,
      );
    }
  }

  const versionIds = fixture.versions.map((entry) => entry.id);
  const duplicateVersions = duplicateValuesV2(versionIds);
  if (duplicateVersions.length > 0) {
    issues.push(
      `version authorities contain duplicates: ${duplicateVersions.join(', ')}`,
    );
  }
  const sourceVersionIds = source.versionAuthorities.map((entry) => entry.id);
  if (
    !sameStringsV2(
      [...versionIds].sort(compareText),
      [...sourceVersionIds].sort(compareText),
    )
  ) {
    issues.push('version authority ids are not deep-exact with source');
  }
  const sourceVersionsById = new Map(
    source.versionAuthorities.map((entry) => [entry.id, entry] as const),
  );
  for (const authority of fixture.versions) {
    const observed = sourceVersionsById.get(authority.id);
    if (authority.expected.trim().length === 0) {
      issues.push(`version authority expectation is empty: ${authority.id}`);
    }
    if (observed === undefined) {
      continue;
    }
    if (
      authority.module !== observed.module ||
      authority.binding !== observed.binding
    ) {
      issues.push(`version authority binding mismatch: ${authority.id}`);
    }
    if (authority.wiring === 'wired') {
      if (observed.wiring !== 'wired') {
        issues.push(
          `version authority is unexpectedly unwired: ${authority.id}`,
        );
      } else if (observed.actual !== authority.expected) {
        issues.push(`version authority value mismatch: ${authority.id}`);
      }
    } else if (observed.wiring !== 'unwired' || observed.actual !== null) {
      issues.push(
        `planned version authority is already wired: ${authority.id}`,
      );
    }
  }

  return Object.freeze(issues);
}

const selected = isSelected({
  group: 'public-beta-release',
  caseId: 'repository-hardening-inventory',
});
let sourceInventory: Promise<SourceInventoryV2> | undefined;

function currentSourceInventoryV2(): Promise<SourceInventoryV2> {
  sourceInventory ??= readSourceInventoryV2();
  return sourceInventory;
}

describe.runIf(selected)('P0 repository-hardening inventory', () => {
  it('matches public, legacy, weak-registry, and version source inventories', async () => {
    const source = await currentSourceInventoryV2();
    expect(source.weakSites).toHaveLength(WEAK_REGISTRY_DISPOSITIONS_V2.length);
    expect(
      WEAK_REGISTRY_DISPOSITIONS_V2.every(
        (entry) =>
          entry.action === 'retain' && entry.carries !== 'ordinary-data',
      ),
    ).toBe(true);
    expect(
      evaluateRepositoryHardeningInventoryV2(fixtureInventoryV2(), source),
    ).toEqual([]);
  });

  it('records installed-package authority as wired and confirmation as planned-unwired', async () => {
    const source = await currentSourceInventoryV2();
    expect(
      VERSION_AUTHORITIES_V2.find(
        (entry) => entry.id === 'installed-package-json',
      )?.wiring,
    ).toBe('wired');
    expect(
      source.versionAuthorities.find(
        (entry) => entry.id === 'installed-package-json',
      ),
    ).toMatchObject({ wiring: 'wired', actual: '2.0.0' });
    expect(
      VERSION_AUTHORITIES_V2.find(
        (entry) => entry.id === 'real-consumer-confirmation',
      )?.wiring,
    ).toBe('planned-unwired');
    expect(
      source.versionAuthorities.find(
        (entry) => entry.id === 'real-consumer-confirmation',
      ),
    ).toMatchObject({ wiring: 'unwired', actual: null });
  });

  it('detects semantic confirmation version bindings without source-style false positives', () => {
    const packageVersion = '9.9.9-synthetic-package';
    const tarballVersion = '8.8.8-synthetic-tarball';
    const tarballSha256 = 'a'.repeat(64);
    const detect = (source: string): string | null =>
      readConfirmationVersionBindingV2(
        ts.createSourceFile(
          'synthetic-real-consumer-contracts.mjs',
          source,
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.JS,
        ),
        { packageVersion },
      );

    expect(
      detect(`
        if (typeof confirmation.candidate.version !== 'string') {
          throw new Error('candidate.version must be a string');
        }
      `),
      'direct type-only access',
    ).toBeNull();
    expect(
      detect(`
        const candidate = confirmation.candidate;
        if (typeof candidate.version !== 'string') {
          throw new Error('candidate.version must be a string');
        }
      `),
      'aliased type-only access',
    ).toBeNull();
    expect(
      detect(`
        const exactCandidate = {
          name: 'repo-nav',
          version: '${tarballVersion}',
          tarballSha256: '${tarballSha256}',
        };
        confirmation.candidate.version;
        confirmation.candidate.version !== exactCandidate.version;
      `),
      'unused direct access and comparison',
    ).toBeNull();
    expect(
      detect(`
        const exactCandidate = {
          name: 'repo-nav',
          version: '${tarballVersion}',
          tarballSha256: '${tarballSha256}',
        };
        if (confirmation.candidate.version !== exactCandidate.version) {
          throw new Error('candidate.version mismatch');
        }
      `),
      'direct exact tarball binding does not borrow the workspace version',
    ).toBe(tarballVersion);
    expect(
      detect(`
        const exactCandidate = {
          name: 'repo-nav',
          version: '${tarballVersion}',
          tarballSha256: '${tarballSha256}',
        };
        const expected = exactCandidate;
        const candidate = confirmation.candidate;
        if (candidate.version !== expected.version) {
          throw new Error('candidate.version mismatch');
        }
      `),
      'aliased exact tarball binding',
    ).toBe(tarballVersion);
    expect(
      detect(`
        const exactCandidate = {
          name: 'repo-nav',
          version: '${tarballVersion}',
          tarballSha256: '${tarballSha256}',
        };
        const { version: expectedVersion } = exactCandidate;
        const { version: confirmationVersion } = confirmation.candidate;
        if (confirmationVersion !== expectedVersion) {
          throw new Error('candidate.version mismatch');
        }
      `),
      'destructured exact tarball binding',
    ).toBe(tarballVersion);
    expect(
      detect(`
        const pkg = JSON.parse(
          readFileSync(join(root, 'package.json'), 'utf8'),
        );
        const { version: expectedVersion } = pkg;
        const candidate = confirmation.candidate;
        if (candidate.version !== expectedVersion) {
          throw new Error('candidate.version mismatch');
        }
      `),
      'aliased exact package binding',
    ).toBe(packageVersion);
  });

  it('keeps the final package cutover atomic while allowing later version bumps', async () => {
    const currentSource = await currentSourceInventoryV2();
    const baseline = fixtureInventoryV2();
    expect(baseline.legacyState).toBe('removed');
    expect(baseline.packageExportKeys).not.toContain('./legacy-v1');
    expect(baseline.rootTypes).toContain('PackageMetadataV1');

    const currentPackageVersion = baseline.versions.find(
      (entry) => entry.id === 'package-json-root',
    )?.expected;
    if (currentPackageVersion === undefined) {
      throw new Error('Package version authority must be present.');
    }
    const syntheticVersion = `${currentPackageVersion}-synthetic-next`;
    const syntheticVersions: readonly VersionAuthorityV2[] =
      baseline.versions.map((entry) => ({
        ...entry,
        wiring: 'wired' as const,
        expected: entry.expected.replaceAll(
          currentPackageVersion,
          syntheticVersion,
        ),
      }));
    const syntheticFixture: InventoryFixtureV2 = {
      ...baseline,
      versions: syntheticVersions,
    };
    const syntheticSource: SourceInventoryV2 = {
      ...currentSource,
      versionAuthorities: syntheticVersions.map((entry) => ({
        id: entry.id,
        module: entry.module,
        binding: entry.binding,
        wiring: 'wired',
        actual: entry.expected,
      })),
    };

    expect(
      evaluateRepositoryHardeningInventoryV2(syntheticFixture, syntheticSource),
    ).toEqual([]);
  });

  it('rejects each required characterization mutation', async () => {
    const source = await currentSourceInventoryV2();
    const baseline = fixtureInventoryV2();
    const ordinaryRetained = [
      ...baseline.weak,
      {
        module: 'src/synthetic-ordinary-data.ts',
        binding: 'ordinaryDataRegistry',
        carries: 'ordinary-data' as const,
        action: 'retain' as const,
        rationale: 'Synthetic ordinary-data registry must be rejected.',
      },
    ];

    const mutations: readonly Readonly<{
      name: string;
      fixture: InventoryFixtureV2;
    }>[] = [
      {
        name: 'missing-root-export',
        fixture: {
          ...baseline,
          rootRuntime: baseline.rootRuntime.slice(1),
        },
      },
      {
        name: 'missing-package-export',
        fixture: {
          ...baseline,
          packageExportKeys: baseline.packageExportKeys.filter(
            (entry) => entry !== './advanced',
          ),
        },
      },
      {
        name: 'missing-package-subpath-inventory',
        fixture: {
          ...baseline,
          packageSubpaths: baseline.packageSubpaths.filter(
            (entry) => entry.specifier !== './advanced',
          ),
        },
      },
      {
        name: 'missing-package-export-disposition',
        fixture: {
          ...baseline,
          packageExportDispositions: baseline.packageExportDispositions.filter(
            (entry) => entry.specifier !== './advanced',
          ),
        },
      },
      {
        name: 'wrong-retained-package-export-disposition',
        fixture: {
          ...baseline,
          packageExportDispositions: baseline.packageExportDispositions.map(
            (entry) =>
              entry.specifier === './advanced'
                ? { ...entry, action: 'remove-c5' as const }
                : entry,
          ),
        },
      },
      {
        name: 'changed-package-subpath-type-export',
        fixture: {
          ...baseline,
          packageSubpaths: baseline.packageSubpaths.map((entry) =>
            entry.specifier === './advanced'
              ? { ...entry, types: entry.types.slice(1) }
              : entry,
          ),
        },
      },
      {
        name: 'synthetic-weak-map',
        fixture: {
          ...baseline,
          weak: [
            ...baseline.weak,
            {
              module: 'src/synthetic.ts',
              binding: 'syntheticWeakMap',
              carries: 'runtime-capability',
              action: 'retain',
              rationale: 'Synthetic mutation row.',
            },
          ],
        },
      },
      {
        name: 'ordinary-data-retained',
        fixture: { ...baseline, weak: ordinaryRetained },
      },
      {
        name: 'missing-mcp-version-authority',
        fixture: {
          ...baseline,
          versions: baseline.versions.filter(
            (entry) => entry.id !== 'mcp-server-info',
          ),
        },
      },
    ];

    for (const mutation of mutations) {
      expect(
        evaluateRepositoryHardeningInventoryV2(mutation.fixture, source),
        mutation.name,
      ).not.toEqual([]);
    }
  });

  it('rejects duplicate rows and empty rationales', async () => {
    const source = await currentSourceInventoryV2();
    const baseline = fixtureInventoryV2();
    const first = baseline.weak[0];
    if (first === undefined) {
      throw new Error('Weak registry fixture must not be empty.');
    }

    expect(
      evaluateRepositoryHardeningInventoryV2(
        { ...baseline, weak: [...baseline.weak, { ...first }] },
        source,
      ),
    ).not.toEqual([]);
    expect(
      evaluateRepositoryHardeningInventoryV2(
        {
          ...baseline,
          weak: baseline.weak.map((entry, index) =>
            index === 0 ? { ...entry, rationale: '   ' } : entry,
          ),
        },
        source,
      ),
    ).not.toEqual([]);
  });
});
