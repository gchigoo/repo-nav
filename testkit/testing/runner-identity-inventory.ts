import { readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

import ts from 'typescript';

import type { RunnerSurface } from '../runners/runner-registry.js';
import type { TestIdentity } from './selection.js';

export interface RunnerIdentityInventoryRow {
  readonly surface: RunnerSurface;
  readonly group: string;
  readonly caseId: string;
  readonly ownerFile: string;
}

export interface RunnerIdentityInventorySource {
  readonly surface: RunnerSurface;
  readonly ownerFile: string;
  readonly text: string;
  readonly fileName?: string;
}

export interface RunnerIdentityRegistryLike {
  readonly surface: RunnerSurface;
  readonly identity: TestIdentity;
  readonly ownerFiles: readonly string[];
}

interface IdentityValue {
  readonly group: readonly string[];
  readonly caseId: readonly string[];
}

interface ScanEnvironment {
  readonly strings: ReadonlyMap<string, readonly string[]>;
  readonly stringArrays: ReadonlyMap<string, readonly string[]>;
  readonly identities: ReadonlyMap<string, readonly IdentityValue[]>;
  readonly selectorIdentifiers: ReadonlySet<string>;
  readonly selectorNamespaces: ReadonlySet<string>;
}

interface MutableScanEnvironment {
  readonly strings: Map<string, readonly string[]>;
  readonly stringArrays: Map<string, readonly string[]>;
  readonly identities: Map<string, readonly IdentityValue[]>;
  readonly selectorIdentifiers: Set<string>;
  readonly selectorNamespaces: Set<string>;
}

interface ScanContext {
  readonly source: RunnerIdentityInventorySource;
  readonly sourceFile: ts.SourceFile;
  readonly checker: ts.TypeChecker | undefined;
  readonly localFunctions: ReadonlyMap<string, ts.FunctionLikeDeclaration>;
  readonly rows: RunnerIdentityInventoryRow[];
  readonly errors: string[];
  readonly helperStack: string[];
}

const SURFACE_DIRECTORIES = Object.freeze([
  Object.freeze({ surface: 'unit' as const, directory: 'test/unit' }),
  Object.freeze({ surface: 'golden' as const, directory: 'test/golden' }),
  Object.freeze({ surface: 'mcp' as const, directory: 'test/mcp' }),
]);

const VALID_SURFACES: ReadonlySet<string> = new Set(
  SURFACE_DIRECTORIES.map((entry) => entry.surface),
);

function mutableEnvironment(
  environment?: ScanEnvironment,
): MutableScanEnvironment {
  return {
    strings: new Map(environment?.strings ?? []),
    stringArrays: new Map(environment?.stringArrays ?? []),
    identities: new Map(environment?.identities ?? []),
    selectorIdentifiers: new Set(environment?.selectorIdentifiers ?? []),
    selectorNamespaces: new Set(environment?.selectorNamespaces ?? []),
  };
}

function readonlyEnvironment(
  environment: MutableScanEnvironment,
): ScanEnvironment {
  return {
    strings: environment.strings,
    stringArrays: environment.stringArrays,
    identities: environment.identities,
    selectorIdentifiers: environment.selectorIdentifiers,
    selectorNamespaces: environment.selectorNamespaces,
  };
}

function withStringBinding(
  environment: ScanEnvironment,
  name: string,
  values: readonly string[],
): ScanEnvironment {
  const next = mutableEnvironment(environment);
  next.strings.set(name, values);
  return readonlyEnvironment(next);
}

function withParameterBindings(
  environment: ScanEnvironment,
  parameters: readonly ts.ParameterDeclaration[],
  args: readonly ts.Expression[],
  context: ScanContext,
): ScanEnvironment {
  const next = mutableEnvironment(environment);
  for (const [index, parameter] of parameters.entries()) {
    clearBinding(parameter.name, next);
    if (!ts.isIdentifier(parameter.name)) {
      continue;
    }
    const argument = args[index];
    if (argument === undefined) {
      continue;
    }
    if (isSelectorReference(argument, environment)) {
      next.selectorIdentifiers.add(parameter.name.text);
    } else {
      const current = stripExpression(argument);
      if (
        ts.isIdentifier(current) &&
        environment.selectorNamespaces.has(current.text)
      ) {
        next.selectorNamespaces.add(parameter.name.text);
      }
    }
    const strings = evaluateStringExpression(argument, environment, context);
    if (strings !== null) {
      next.strings.set(parameter.name.text, strings);
      continue;
    }
    const stringArray = evaluateStringArrayExpression(
      argument,
      environment,
      context,
    );
    if (stringArray !== null) {
      next.stringArrays.set(parameter.name.text, stringArray);
      continue;
    }
    const identity = evaluateIdentityExpression(argument, environment, context);
    if (identity !== null) {
      next.identities.set(parameter.name.text, identity);
    }
  }
  return readonlyEnvironment(next);
}

function stripExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  for (;;) {
    if (
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isNonNullExpression(current)
    ) {
      current = current.expression;
      continue;
    }
    return current;
  }
}

function symbolDeclarationsFor(
  identifier: ts.Identifier,
  context: ScanContext,
): readonly ts.Declaration[] {
  const symbol = context.checker?.getSymbolAtLocation(identifier);
  if (symbol === undefined) {
    return [];
  }
  const unaliased =
    (symbol.flags & ts.SymbolFlags.Alias) !== 0
      ? context.checker?.getAliasedSymbol(symbol)
      : symbol;
  return unaliased?.declarations ?? [];
}

function declarationInitializer(
  declaration: ts.Declaration,
): ts.Expression | undefined {
  if (ts.isVariableDeclaration(declaration)) {
    return declaration.initializer;
  }
  if (ts.isPropertyAssignment(declaration)) {
    return declaration.initializer;
  }
  return undefined;
}

function evaluateStringExpression(
  expression: ts.Expression,
  environment: ScanEnvironment,
  context: ScanContext,
): readonly string[] | null {
  const current = stripExpression(expression);
  if (
    ts.isStringLiteral(current) ||
    ts.isNoSubstitutionTemplateLiteral(current)
  ) {
    return [current.text];
  }
  if (ts.isIdentifier(current)) {
    const bound = environment.strings.get(current.text);
    if (bound !== undefined) {
      return bound;
    }
    for (const declaration of symbolDeclarationsFor(current, context)) {
      const initializer = declarationInitializer(declaration);
      if (initializer === undefined || initializer === expression) {
        continue;
      }
      const resolved = evaluateStringExpression(
        initializer,
        environment,
        context,
      );
      if (resolved !== null) {
        return resolved;
      }
    }
  }
  if (
    ts.isCallExpression(current) &&
    ts.isPropertyAccessExpression(current.expression) &&
    current.expression.name.text === 'freeze' &&
    current.arguments.length === 1
  ) {
    const [argument] = current.arguments;
    if (argument !== undefined && ts.isExpression(argument)) {
      return evaluateStringExpression(argument, environment, context);
    }
  }
  return null;
}

function evaluateStringArrayExpression(
  expression: ts.Expression,
  environment: ScanEnvironment,
  context: ScanContext,
): readonly string[] | null {
  const current = stripExpression(expression);
  if (ts.isArrayLiteralExpression(current)) {
    const values: string[] = [];
    for (const element of current.elements) {
      if (ts.isSpreadElement(element)) {
        const spreadValues = evaluateStringArrayExpression(
          element.expression,
          environment,
          context,
        );
        if (spreadValues === null) {
          return null;
        }
        values.push(...spreadValues);
        continue;
      }
      const strings = evaluateStringExpression(element, environment, context);
      if (strings === null) {
        return null;
      }
      values.push(...strings);
    }
    return values;
  }
  if (ts.isIdentifier(current)) {
    const bound = environment.stringArrays.get(current.text);
    if (bound !== undefined) {
      return bound;
    }
    for (const declaration of symbolDeclarationsFor(current, context)) {
      const initializer = declarationInitializer(declaration);
      if (initializer === undefined || initializer === expression) {
        continue;
      }
      const resolved = evaluateStringArrayExpression(
        initializer,
        environment,
        context,
      );
      if (resolved !== null) {
        return resolved;
      }
    }
  }
  if (
    ts.isCallExpression(current) &&
    ts.isPropertyAccessExpression(current.expression) &&
    current.expression.name.text === 'freeze' &&
    current.arguments.length === 1
  ) {
    const [argument] = current.arguments;
    if (argument !== undefined && ts.isExpression(argument)) {
      return evaluateStringArrayExpression(argument, environment, context);
    }
  }
  return null;
}

function propertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text;
  }
  return null;
}

function identityFromObjectLiteral(
  objectLiteral: ts.ObjectLiteralExpression,
  environment: ScanEnvironment,
  context: ScanContext,
): readonly IdentityValue[] | null {
  let groupExpression: ts.Expression | undefined;
  let caseExpression: ts.Expression | undefined;

  for (const property of objectLiteral.properties) {
    if (ts.isSpreadAssignment(property)) {
      return null;
    }
    if (ts.isPropertyAssignment(property)) {
      const name = propertyNameText(property.name);
      if (name === null) {
        return null;
      }
      if (name === 'group') {
        groupExpression = property.initializer;
      } else if (name === 'caseId') {
        caseExpression = property.initializer;
      }
      continue;
    }
    if (ts.isShorthandPropertyAssignment(property)) {
      if (property.name.text === 'group') {
        groupExpression = property.name;
      } else if (property.name.text === 'caseId') {
        caseExpression = property.name;
      }
      continue;
    }
    return null;
  }

  if (groupExpression === undefined || caseExpression === undefined) {
    return null;
  }
  const groups = evaluateStringExpression(
    groupExpression,
    environment,
    context,
  );
  const cases = evaluateStringExpression(caseExpression, environment, context);
  if (groups === null || cases === null) {
    return null;
  }
  return [Object.freeze({ group: groups, caseId: cases })];
}

interface ReturnPathAnalysis {
  readonly expressions: readonly ts.Expression[];
  readonly canFallThrough: boolean;
  readonly unresolved: boolean;
}

const FALLTHROUGH_RETURN_PATH: ReturnPathAnalysis = Object.freeze({
  expressions: [],
  canFallThrough: true,
  unresolved: false,
});

const UNRESOLVED_RETURN_PATH: ReturnPathAnalysis = Object.freeze({
  expressions: [],
  canFallThrough: false,
  unresolved: true,
});

function resolvedReturnPath(
  expressions: readonly ts.Expression[],
  canFallThrough: boolean,
): ReturnPathAnalysis {
  return Object.freeze({
    expressions,
    canFallThrough,
    unresolved: false,
  });
}

function containsReturnOutsideNestedFunction(node: ts.Node): boolean {
  let found = false;
  const visit = (current: ts.Node): void => {
    if (found) {
      return;
    }
    if (
      current !== node &&
      (ts.isFunctionDeclaration(current) ||
        ts.isFunctionExpression(current) ||
        ts.isArrowFunction(current))
    ) {
      return;
    }
    if (ts.isReturnStatement(current)) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

function analyzeReturnPathStatements(
  statements: readonly ts.Statement[],
): ReturnPathAnalysis {
  const expressions: ts.Expression[] = [];
  for (const statement of statements) {
    const analysis = analyzeReturnPathStatement(statement);
    if (analysis.unresolved) {
      return UNRESOLVED_RETURN_PATH;
    }
    expressions.push(...analysis.expressions);
    if (!analysis.canFallThrough) {
      return resolvedReturnPath(expressions, false);
    }
  }
  return resolvedReturnPath(expressions, true);
}

function analyzeIfReturnPaths(statement: ts.IfStatement): ReturnPathAnalysis {
  const thenAnalysis = analyzeReturnPathStatement(statement.thenStatement);
  const elseAnalysis =
    statement.elseStatement === undefined
      ? FALLTHROUGH_RETURN_PATH
      : analyzeReturnPathStatement(statement.elseStatement);
  if (thenAnalysis.unresolved || elseAnalysis.unresolved) {
    return UNRESOLVED_RETURN_PATH;
  }
  return resolvedReturnPath(
    [...thenAnalysis.expressions, ...elseAnalysis.expressions],
    thenAnalysis.canFallThrough || elseAnalysis.canFallThrough,
  );
}

function analyzeReturnPathStatement(
  statement: ts.Statement,
): ReturnPathAnalysis {
  if (ts.isReturnStatement(statement)) {
    if (statement.expression === undefined) {
      return UNRESOLVED_RETURN_PATH;
    }
    return resolvedReturnPath([statement.expression], false);
  }
  if (ts.isBlock(statement)) {
    return analyzeReturnPathStatements(statement.statements);
  }
  if (ts.isIfStatement(statement)) {
    return analyzeIfReturnPaths(statement);
  }
  if (containsReturnOutsideNestedFunction(statement)) {
    return UNRESOLVED_RETURN_PATH;
  }
  return FALLTHROUGH_RETURN_PATH;
}

function returnExpressions(
  body: ts.ConciseBody,
): readonly ts.Expression[] | null {
  if (ts.isBlock(body)) {
    const analysis = analyzeReturnPathStatements(body.statements);
    if (
      analysis.unresolved ||
      analysis.canFallThrough ||
      analysis.expressions.length === 0
    ) {
      return null;
    }
    return analysis.expressions;
  }
  return [body];
}

function hasFunctionBody(
  functionLike: ts.FunctionLikeDeclaration,
): functionLike is ts.FunctionLikeDeclaration & {
  readonly body: ts.ConciseBody;
} {
  return functionLike.body !== undefined;
}

function resolveCalledFunction(
  expression: ts.Expression,
  context: ScanContext,
): (ts.FunctionLikeDeclaration & { readonly body: ts.ConciseBody }) | null {
  const current = stripExpression(expression);
  if (!ts.isIdentifier(current)) {
    return null;
  }
  const local = context.localFunctions.get(current.text);
  if (local !== undefined && hasFunctionBody(local)) {
    return local;
  }
  for (const declaration of symbolDeclarationsFor(current, context)) {
    if (ts.isFunctionDeclaration(declaration) && hasFunctionBody(declaration)) {
      return declaration;
    }
    if (
      ts.isVariableDeclaration(declaration) &&
      declaration.initializer !== undefined
    ) {
      const initializer = stripExpression(declaration.initializer);
      if (
        (ts.isFunctionExpression(initializer) ||
          ts.isArrowFunction(initializer)) &&
        hasFunctionBody(initializer)
      ) {
        return initializer;
      }
    }
  }
  return null;
}

function functionName(functionLike: ts.FunctionLikeDeclaration): string {
  if ('name' in functionLike && functionLike.name !== undefined) {
    return functionLike.name.getText();
  }
  return '<anonymous-helper>';
}

function evaluateIdentityReturningCall(
  call: ts.CallExpression,
  environment: ScanEnvironment,
  context: ScanContext,
): readonly IdentityValue[] | null {
  const functionLike = resolveCalledFunction(call.expression, context);
  if (functionLike === null) {
    return null;
  }
  const nextEnvironment = withParameterBindings(
    environment,
    functionLike.parameters,
    [...call.arguments].filter(ts.isExpression),
    context,
  );
  const expressions = returnExpressions(functionLike.body);
  if (expressions === null) {
    return null;
  }
  const identities: IdentityValue[] = [];
  for (const expression of expressions) {
    const resolved = evaluateIdentityExpression(
      expression,
      nextEnvironment,
      context,
    );
    if (resolved === null) {
      return null;
    }
    identities.push(...resolved);
  }
  return identities.length > 0 ? identities : null;
}

function evaluateIdentityExpression(
  expression: ts.Expression,
  environment: ScanEnvironment,
  context: ScanContext,
): readonly IdentityValue[] | null {
  const current = stripExpression(expression);
  if (ts.isObjectLiteralExpression(current)) {
    return identityFromObjectLiteral(current, environment, context);
  }
  if (ts.isIdentifier(current)) {
    const bound = environment.identities.get(current.text);
    if (bound !== undefined) {
      return bound;
    }
    for (const declaration of symbolDeclarationsFor(current, context)) {
      const initializer = declarationInitializer(declaration);
      if (initializer === undefined || initializer === expression) {
        continue;
      }
      const resolved = evaluateIdentityExpression(
        initializer,
        environment,
        context,
      );
      if (resolved !== null) {
        return resolved;
      }
    }
  }
  if (ts.isCallExpression(current)) {
    if (
      ts.isPropertyAccessExpression(current.expression) &&
      current.expression.name.text === 'freeze' &&
      current.arguments.length === 1
    ) {
      const [argument] = current.arguments;
      if (argument !== undefined && ts.isExpression(argument)) {
        return evaluateIdentityExpression(argument, environment, context);
      }
    }
    return evaluateIdentityReturningCall(current, environment, context);
  }
  return null;
}

function collectIdentity(
  expression: ts.Expression | undefined,
  environment: ScanEnvironment,
  context: ScanContext,
): void {
  if (expression === undefined) {
    context.errors.push(
      `${context.source.ownerFile}: isSelected missing identity argument`,
    );
    return;
  }
  const identities = evaluateIdentityExpression(
    expression,
    environment,
    context,
  );
  if (identities === null) {
    context.errors.push(
      `${context.source.ownerFile}: could not statically resolve isSelected identity at ${lineAndColumn(expression, context.sourceFile)}`,
    );
    return;
  }
  for (const identity of identities) {
    for (const group of identity.group) {
      for (const caseId of identity.caseId) {
        if (group.length === 0 || caseId.length === 0) {
          context.errors.push(
            `${context.source.ownerFile}: empty isSelected group/case at ${lineAndColumn(expression, context.sourceFile)}`,
          );
          continue;
        }
        context.rows.push({
          surface: context.source.surface,
          group,
          caseId,
          ownerFile: context.source.ownerFile,
        });
      }
    }
  }
}

function lineAndColumn(node: ts.Node, sourceFile: ts.SourceFile): string {
  const position = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  );
  return `${position.line + 1}:${position.character + 1}`;
}

function collectLocalFunctions(
  sourceFile: ts.SourceFile,
): ReadonlyMap<string, ts.FunctionLikeDeclaration> {
  const functions = new Map<string, ts.FunctionLikeDeclaration>();
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
      functions.set(node.name.text, node);
      return;
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined
    ) {
      const initializer = stripExpression(node.initializer);
      if (
        ts.isFunctionExpression(initializer) ||
        ts.isArrowFunction(initializer)
      ) {
        functions.set(node.name.text, initializer);
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return functions;
}

const RUNNER_SELECTOR_EXPORTS = new Set(['isSelected', 'isExplicitlySelected']);

function isSelectionModuleSpecifier(moduleSpecifier: ts.Expression): boolean {
  if (!ts.isStringLiteral(moduleSpecifier)) {
    return false;
  }
  return /(?:^|\/)testkit\/testing\/selection\.js$/u.test(moduleSpecifier.text);
}

function isRunnerSelectorExport(name: string): boolean {
  return RUNNER_SELECTOR_EXPORTS.has(name);
}

function isSelectorReference(
  expression: ts.Expression,
  environment: ScanEnvironment,
): boolean {
  const current = stripExpression(expression);
  if (ts.isIdentifier(current)) {
    return environment.selectorIdentifiers.has(current.text);
  }
  if (
    !ts.isPropertyAccessExpression(current) ||
    !isRunnerSelectorExport(current.name.text)
  ) {
    return false;
  }
  const namespace = stripExpression(current.expression);
  return (
    ts.isIdentifier(namespace) &&
    environment.selectorNamespaces.has(namespace.text)
  );
}

function bindImportDeclaration(
  declaration: ts.ImportDeclaration,
  environment: MutableScanEnvironment,
): void {
  if (!isSelectionModuleSpecifier(declaration.moduleSpecifier)) {
    return;
  }
  const bindings = declaration.importClause?.namedBindings;
  if (bindings === undefined) {
    return;
  }
  if (ts.isNamespaceImport(bindings)) {
    environment.selectorIdentifiers.delete(bindings.name.text);
    environment.selectorNamespaces.add(bindings.name.text);
    return;
  }
  for (const element of bindings.elements) {
    const importedName = element.propertyName?.text ?? element.name.text;
    if (isRunnerSelectorExport(importedName)) {
      environment.selectorNamespaces.delete(element.name.text);
      environment.selectorIdentifiers.add(element.name.text);
    }
  }
}

function objectBindingPropertyName(element: ts.BindingElement): string | null {
  if (element.propertyName === undefined && ts.isIdentifier(element.name)) {
    return element.name.text;
  }
  if (
    element.propertyName !== undefined &&
    (ts.isIdentifier(element.propertyName) ||
      ts.isStringLiteral(element.propertyName))
  ) {
    return element.propertyName.text;
  }
  return null;
}

function clearBinding(
  name: ts.BindingName,
  environment: MutableScanEnvironment,
): void {
  if (ts.isIdentifier(name)) {
    environment.strings.delete(name.text);
    environment.stringArrays.delete(name.text);
    environment.identities.delete(name.text);
    environment.selectorIdentifiers.delete(name.text);
    environment.selectorNamespaces.delete(name.text);
    return;
  }
  for (const element of name.elements) {
    if (ts.isBindingElement(element)) {
      clearBinding(element.name, environment);
    }
  }
}

function clearStatementBindings(
  statement: ts.Statement,
  environment: MutableScanEnvironment,
): void {
  if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) {
      clearBinding(declaration.name, environment);
    }
    return;
  }
  if (
    (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
    statement.name !== undefined
  ) {
    clearBinding(statement.name, environment);
  }
}

function clearFunctionScopedVarBindings(
  node: ts.Node,
  environment: MutableScanEnvironment,
): void {
  const visit = (current: ts.Node): void => {
    if (current !== node && ts.isFunctionLike(current)) {
      return;
    }
    if (
      ts.isVariableDeclarationList(current) &&
      (current.flags & ts.NodeFlags.BlockScoped) === 0
    ) {
      for (const declaration of current.declarations) {
        clearBinding(declaration.name, environment);
      }
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
}

function bindSelectorVariableDeclaration(
  declaration: ts.VariableDeclaration,
  environment: MutableScanEnvironment,
): void {
  clearBinding(declaration.name, environment);
  if (declaration.initializer === undefined) {
    return;
  }
  const readonlyEnv = readonlyEnvironment(environment);
  const initializer = stripExpression(declaration.initializer);
  if (ts.isIdentifier(declaration.name)) {
    if (isSelectorReference(initializer, readonlyEnv)) {
      environment.selectorIdentifiers.add(declaration.name.text);
      return;
    }
    if (
      ts.isIdentifier(initializer) &&
      readonlyEnv.selectorNamespaces.has(initializer.text)
    ) {
      environment.selectorNamespaces.add(declaration.name.text);
    }
    return;
  }
  if (
    !ts.isObjectBindingPattern(declaration.name) ||
    !ts.isIdentifier(initializer) ||
    !readonlyEnv.selectorNamespaces.has(initializer.text)
  ) {
    return;
  }
  for (const element of declaration.name.elements) {
    if (
      ts.isIdentifier(element.name) &&
      isRunnerSelectorExport(objectBindingPropertyName(element) ?? '')
    ) {
      environment.selectorIdentifiers.add(element.name.text);
    }
  }
}

function isSelectorCall(
  expression: ts.Expression,
  environment: ScanEnvironment,
): boolean {
  return isSelectorReference(expression, environment);
}

function scanHelperCall(
  call: ts.CallExpression,
  environment: ScanEnvironment,
  context: ScanContext,
): boolean {
  const functionLike = resolveCalledFunction(call.expression, context);
  if (functionLike === null) {
    return false;
  }
  const name = functionName(functionLike);
  if (context.helperStack.includes(name)) {
    context.errors.push(
      `${context.source.ownerFile}: recursive runner identity helper ${name}`,
    );
    return true;
  }
  const nextEnvironment = withParameterBindings(
    environment,
    functionLike.parameters,
    [...call.arguments].filter(ts.isExpression),
    context,
  );
  context.helperStack.push(name);
  scanNode(functionLike.body, nextEnvironment, context);
  context.helperStack.pop();
  return true;
}

function bindArrayPatternStrings(
  pattern: ts.ArrayBindingPattern,
  tuple: ts.ArrayLiteralExpression,
  environment: MutableScanEnvironment,
  baseEnvironment: ScanEnvironment,
  context: ScanContext,
): void {
  for (const [index, element] of pattern.elements.entries()) {
    if (!ts.isBindingElement(element) || !ts.isIdentifier(element.name)) {
      continue;
    }
    const tupleElement = tuple.elements[index];
    if (tupleElement === undefined || ts.isSpreadElement(tupleElement)) {
      continue;
    }
    const strings = evaluateStringExpression(
      tupleElement,
      baseEnvironment,
      context,
    );
    if (strings !== null) {
      environment.strings.set(element.name.text, strings);
    }
  }
}

function forOfStringBindingEnvironments(
  statement: ts.ForOfStatement,
  environment: ScanEnvironment,
  context: ScanContext,
): readonly ScanEnvironment[] | null {
  if (
    !ts.isVariableDeclarationList(statement.initializer) ||
    statement.initializer.declarations.length !== 1
  ) {
    return null;
  }
  const [declaration] = statement.initializer.declarations;
  if (declaration === undefined) {
    return null;
  }

  if (ts.isIdentifier(declaration.name)) {
    const values = evaluateStringArrayExpression(
      statement.expression,
      environment,
      context,
    );
    if (values === null) {
      return null;
    }
    return values.map((value) =>
      withStringBinding(environment, declaration.name.getText(), [value]),
    );
  }

  if (!ts.isArrayBindingPattern(declaration.name)) {
    return null;
  }
  const iterable = stripExpression(statement.expression);
  if (!ts.isArrayLiteralExpression(iterable)) {
    return null;
  }
  const iterations: ScanEnvironment[] = [];
  for (const element of iterable.elements) {
    if (ts.isSpreadElement(element)) {
      return null;
    }
    const tuple = stripExpression(element);
    if (!ts.isArrayLiteralExpression(tuple)) {
      return null;
    }
    const next = mutableEnvironment(environment);
    bindArrayPatternStrings(
      declaration.name,
      tuple,
      next,
      environment,
      context,
    );
    iterations.push(readonlyEnvironment(next));
  }
  return iterations;
}

function bindVariableDeclaration(
  declaration: ts.VariableDeclaration,
  environment: MutableScanEnvironment,
  context: ScanContext,
): void {
  clearBinding(declaration.name, environment);
  bindSelectorVariableDeclaration(declaration, environment);
  if (
    !ts.isIdentifier(declaration.name) ||
    declaration.initializer === undefined
  ) {
    return;
  }
  const readonlyEnv = readonlyEnvironment(environment);
  const stringValue = evaluateStringExpression(
    declaration.initializer,
    readonlyEnv,
    context,
  );
  if (stringValue !== null) {
    environment.strings.set(declaration.name.text, stringValue);
  }
  const stringArray = evaluateStringArrayExpression(
    declaration.initializer,
    readonlyEnv,
    context,
  );
  if (stringArray !== null) {
    environment.stringArrays.set(declaration.name.text, stringArray);
  }
  const identity = evaluateIdentityExpression(
    declaration.initializer,
    readonlyEnv,
    context,
  );
  if (identity !== null) {
    environment.identities.set(declaration.name.text, identity);
  }
}

function scanNode(
  node: ts.Node,
  environment: ScanEnvironment,
  context: ScanContext,
): void {
  if (ts.isSourceFile(node) || ts.isBlock(node)) {
    const next = mutableEnvironment(environment);
    for (const statement of node.statements) {
      clearStatementBindings(statement, next);
      if (ts.isImportDeclaration(statement)) {
        bindImportDeclaration(statement, next);
      }
    }
    clearFunctionScopedVarBindings(node, next);
    for (const statement of node.statements) {
      scanNode(statement, readonlyEnvironment(next), context);
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          bindVariableDeclaration(declaration, next, context);
        }
      }
    }
    return;
  }

  if (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node)
  ) {
    return;
  }

  if (ts.isVariableStatement(node)) {
    const next = mutableEnvironment(environment);
    for (const declaration of node.declarationList.declarations) {
      if (declaration.initializer !== undefined) {
        scanNode(declaration.initializer, readonlyEnvironment(next), context);
      }
      bindVariableDeclaration(declaration, next, context);
    }
    return;
  }

  if (ts.isForOfStatement(node)) {
    const iterations = forOfStringBindingEnvironments(
      node,
      environment,
      context,
    );
    if (iterations !== null) {
      for (const iterationEnvironment of iterations) {
        scanNode(node.statement, iterationEnvironment, context);
      }
      return;
    }
  }

  if (ts.isCallExpression(node)) {
    if (isSelectorCall(node.expression, environment)) {
      collectIdentity(node.arguments[0], environment, context);
      return;
    }
    if (scanHelperCall(node, environment, context)) {
      return;
    }
  }

  ts.forEachChild(node, (child) => scanNode(child, environment, context));
}

function scanSource(
  source: RunnerIdentityInventorySource,
  checker?: ts.TypeChecker,
  sourceFileOverride?: ts.SourceFile,
): readonly RunnerIdentityInventoryRow[] {
  const sourceFile =
    sourceFileOverride ??
    ts.createSourceFile(
      source.fileName ?? source.ownerFile,
      source.text,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS,
    );
  const context: ScanContext = {
    source,
    sourceFile,
    checker,
    localFunctions: collectLocalFunctions(sourceFile),
    rows: [],
    errors: [],
    helperStack: [],
  };
  scanNode(sourceFile, readonlyEnvironment(mutableEnvironment()), context);
  if (context.errors.length > 0) {
    throw new Error(context.errors.join('\n'));
  }
  return context.rows;
}

function isRunnerSurface(value: string): value is RunnerSurface {
  return VALID_SURFACES.has(value);
}

function validateInventoryRows(
  rows: readonly RunnerIdentityInventoryRow[],
): void {
  for (const row of rows) {
    if (!isRunnerSurface(row.surface)) {
      throw new Error(`unknown runner surface ${String(row.surface)}`);
    }
    if (row.group.length === 0 || row.caseId.length === 0) {
      throw new Error(`empty runner identity ${inventoryIdentityKey(row)}`);
    }
    if (!isPosixRepositoryRelativePath(row.ownerFile)) {
      throw new Error(`invalid runner identity owner ${row.ownerFile}`);
    }
  }
}

function normalizeInventoryRows(
  rows: readonly RunnerIdentityInventoryRow[],
): readonly RunnerIdentityInventoryRow[] {
  validateInventoryRows(rows);
  const unique = new Map<string, RunnerIdentityInventoryRow>();
  for (const row of rows) {
    unique.set(inventoryOwnerKey(row), Object.freeze({ ...row }));
  }
  return [...unique.values()].sort(compareInventoryRows);
}

export function scanRunnerIdentityInventoryFromSources(
  sources: readonly RunnerIdentityInventorySource[],
): readonly RunnerIdentityInventoryRow[] {
  const rows = sources.flatMap((source) => scanSource(source));
  return normalizeInventoryRows(rows);
}

function readTsConfig(repositoryRoot: string): ts.ParsedCommandLine {
  const configPath = resolve(repositoryRoot, 'tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error !== undefined) {
    throw new Error(
      ts.flattenDiagnosticMessageText(config.error.messageText, '\n'),
    );
  }
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    repositoryRoot,
  );
  if (parsed.errors.length > 0) {
    throw new Error(
      parsed.errors
        .map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        )
        .join('\n'),
    );
  }
  return parsed;
}

export function scanRunnerIdentityInventory(
  repositoryRoot: string,
): readonly RunnerIdentityInventoryRow[] {
  const sources = listRunnerIdentityInventorySources(repositoryRoot);
  const parsed = readTsConfig(repositoryRoot);
  const absoluteFiles = sources.map((source) =>
    resolve(repositoryRoot, ...source.ownerFile.split('/')),
  );
  const program = ts.createProgram({
    rootNames: absoluteFiles,
    options: parsed.options,
  });
  const checker = program.getTypeChecker();
  const rows: RunnerIdentityInventoryRow[] = [];
  for (const source of sources) {
    const fileName = resolve(repositoryRoot, ...source.ownerFile.split('/'));
    const sourceFile = program.getSourceFile(fileName);
    if (sourceFile === undefined) {
      throw new Error(`TypeScript program omitted ${source.ownerFile}`);
    }
    rows.push(...scanSource(source, checker, sourceFile));
  }
  return normalizeInventoryRows(rows);
}

export function listRunnerIdentityInventorySources(
  repositoryRoot: string,
): readonly RunnerIdentityInventorySource[] {
  const sources: RunnerIdentityInventorySource[] = [];
  for (const entry of SURFACE_DIRECTORIES) {
    const directory = resolve(repositoryRoot, ...entry.directory.split('/'));
    for (const file of listTypeScriptFiles(directory)) {
      const ownerFile = relative(repositoryRoot, file).split(sep).join('/');
      sources.push({
        surface: entry.surface,
        ownerFile,
        fileName: file,
        text: readFileSync(file, 'utf8'),
      });
    }
  }
  return sources.sort((left, right) =>
    left.ownerFile.localeCompare(right.ownerFile),
  );
}

function listTypeScriptFiles(directory: string): readonly string[] {
  const entries = readdirSync(directory).sort((left, right) =>
    left.localeCompare(right),
  );
  const files: string[] = [];
  for (const entry of entries) {
    const absolute = resolve(directory, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      files.push(...listTypeScriptFiles(absolute));
    } else if (stat.isFile() && entry.endsWith('.ts')) {
      files.push(absolute);
    }
  }
  return files;
}

function isPosixRepositoryRelativePath(value: string): boolean {
  if (value.length === 0) return false;
  if (value.includes('\\')) return false;
  if (value.startsWith('/') || /^[A-Za-z]:/u.test(value)) return false;
  if (value.startsWith('//')) return false;
  return value
    .split('/')
    .every(
      (segment) => segment.length > 0 && segment !== '.' && segment !== '..',
    );
}

export function inventoryIdentityKey(row: {
  readonly surface: RunnerSurface;
  readonly group: string;
  readonly caseId: string;
}): string {
  return `${row.surface}/${row.group}/${row.caseId}`;
}

export function inventoryOwnerKey(row: RunnerIdentityInventoryRow): string {
  return `${inventoryIdentityKey(row)}/${row.ownerFile}`;
}

function compareInventoryRows(
  left: RunnerIdentityInventoryRow,
  right: RunnerIdentityInventoryRow,
): number {
  return inventoryOwnerKey(left).localeCompare(inventoryOwnerKey(right));
}

function registryIdentityKey(registration: RunnerIdentityRegistryLike): string {
  return `${registration.surface}/${registration.identity.group}/${registration.identity.caseId}`;
}

function rowsFromRegistry(
  registry: readonly RunnerIdentityRegistryLike[],
): readonly RunnerIdentityInventoryRow[] {
  const rows: RunnerIdentityInventoryRow[] = [];
  const identities = new Set<string>();
  for (const registration of registry) {
    if (!isRunnerSurface(registration.surface)) {
      throw new Error(`unknown runner surface ${String(registration.surface)}`);
    }
    const identityKey = registryIdentityKey(registration);
    if (identities.has(identityKey)) {
      throw new Error(`duplicate runner identity ${identityKey}`);
    }
    identities.add(identityKey);
    if (registration.ownerFiles.length === 0) {
      throw new Error(`runner identity ${identityKey} has no owners`);
    }
    const ownerFiles = new Set<string>();
    for (const ownerFile of registration.ownerFiles) {
      if (ownerFiles.has(ownerFile)) {
        throw new Error(`duplicate owner ${ownerFile} for ${identityKey}`);
      }
      ownerFiles.add(ownerFile);
      rows.push({
        surface: registration.surface,
        group: registration.identity.group,
        caseId: registration.identity.caseId,
        ownerFile,
      });
    }
  }
  return normalizeInventoryRows(rows);
}

export function projectRunnerIdentityRegistry(
  registry: readonly RunnerIdentityRegistryLike[],
): readonly RunnerIdentityInventoryRow[] {
  return rowsFromRegistry(registry);
}

export function assertRunnerIdentityRegistryMatchesInventory(
  registry: readonly RunnerIdentityRegistryLike[],
  inventory: readonly RunnerIdentityInventoryRow[],
): void {
  const registryRows = rowsFromRegistry(registry);
  const inventoryRows = normalizeInventoryRows(inventory);
  const registryKeys = registryRows.map(inventoryOwnerKey);
  const inventoryKeys = inventoryRows.map(inventoryOwnerKey);
  const registrySet = new Set(registryKeys);
  const inventorySet = new Set(inventoryKeys);
  const sourceOnly = inventoryKeys.filter((key) => !registrySet.has(key));
  const registryOnly = registryKeys.filter((key) => !inventorySet.has(key));
  if (sourceOnly.length > 0 || registryOnly.length > 0) {
    throw new Error(
      [
        sourceOnly.length > 0
          ? `source-only runner identities: ${sourceOnly.join(', ')}`
          : '',
        registryOnly.length > 0
          ? `registry-only runner identities: ${registryOnly.join(', ')}`
          : '',
      ]
        .filter((part) => part.length > 0)
        .join('\n'),
    );
  }
}

export function inventoryCountsBySurface(
  rows: readonly RunnerIdentityInventoryRow[],
): Readonly<Record<RunnerSurface, number>> {
  const counts: Record<RunnerSurface, number> = {
    unit: 0,
    golden: 0,
    mcp: 0,
  };
  const identities = new Set<string>();
  for (const row of normalizeInventoryRows(rows)) {
    const key = inventoryIdentityKey(row);
    if (!identities.has(key)) {
      identities.add(key);
      counts[row.surface] += 1;
    }
  }
  return Object.freeze(counts);
}
