import { posix, win32 } from 'node:path';

import type { BackendHealth, BackendHit } from '../contracts/index.js';
import type { CodeGraphQueryPlanEntry } from './codegraph-query-planner.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeJson(stdout: Uint8Array): unknown | undefined {
  try {
    return JSON.parse(Buffer.from(stdout).toString('utf8')) as unknown;
  } catch {
    return undefined;
  }
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value >= 0;
}

function pendingChangesAreValid(value: unknown): value is {
  readonly added: number;
  readonly modified: number;
  readonly removed: number;
} {
  return (
    isRecord(value) &&
    nonNegativeInteger(value['added']) &&
    nonNegativeInteger(value['modified']) &&
    nonNegativeInteger(value['removed'])
  );
}

export function parseCodeGraphStatus(
  stdout: Uint8Array,
): BackendHealth | undefined {
  const value = decodeJson(stdout);
  if (
    !isRecord(value) ||
    typeof value['initialized'] !== 'boolean' ||
    typeof value['version'] !== 'string' ||
    value['version'].length === 0
  ) {
    return undefined;
  }
  if (!value['initialized']) {
    return Object.freeze({
      state: 'missing',
      version: value['version'],
      indexFound: false,
      reasonCode: 'CODEGRAPH_INDEX_MISSING',
    });
  }

  const pending = value['pendingChanges'];
  const index = value['index'];
  const pendingObserved = pendingChangesAreValid(pending);
  const mismatchObserved = Object.hasOwn(value, 'worktreeMismatch');
  const reindexObserved =
    isRecord(index) && typeof index['reindexRecommended'] === 'boolean';
  const stale =
    (pendingObserved &&
      (pending.added > 0 || pending.modified > 0 || pending.removed > 0)) ||
    (mismatchObserved && value['worktreeMismatch'] !== null) ||
    (reindexObserved && index['reindexRecommended'] === true);

  return Object.freeze({
    state: 'available',
    version: value['version'],
    indexFound: true,
    ...(stale
      ? { possibleStaleIndex: true as const }
      : pendingObserved && mismatchObserved && reindexObserved
        ? { possibleStaleIndex: false as const }
        : {}),
  });
}

function isSafeRelativeFile(value: string): boolean {
  const slashValue = value.replaceAll('\\', '/');
  const normalized = posix.normalize(slashValue);
  return (
    normalized !== '.' &&
    normalized !== '..' &&
    !normalized.startsWith('../') &&
    !posix.isAbsolute(normalized) &&
    !win32.isAbsolute(value) &&
    !/^[A-Za-z]:/u.test(value)
  );
}

function matchesEntry(value: string, entry: CodeGraphQueryPlanEntry): boolean {
  return entry.caseSensitive
    ? value === entry.value
    : value.toLocaleLowerCase('und') === entry.value.toLocaleLowerCase('und');
}

export interface ParsedCodeGraphQuery {
  readonly rawResultCount: number;
  readonly hits: readonly BackendHit[];
}

export function parseCodeGraphQuery(
  stdout: Uint8Array,
  entry: CodeGraphQueryPlanEntry,
): ParsedCodeGraphQuery | undefined {
  const value = decodeJson(stdout);
  if (!Array.isArray(value)) {
    return undefined;
  }
  const hits: BackendHit[] = [];
  for (const result of value) {
    if (!isRecord(result) || !isRecord(result['node'])) {
      return undefined;
    }
    const node = result['node'];
    const file = node['filePath'];
    const name = node['name'];
    const qualifiedName = node['qualifiedName'];
    const startLine = node['startLine'];
    const endLine = node['endLine'];
    if (
      typeof file !== 'string' ||
      file.length === 0 ||
      !isSafeRelativeFile(file) ||
      typeof name !== 'string' ||
      name.length === 0 ||
      (qualifiedName !== undefined && typeof qualifiedName !== 'string') ||
      typeof startLine !== 'number' ||
      !Number.isSafeInteger(startLine) ||
      startLine < 1 ||
      typeof endLine !== 'number' ||
      !Number.isSafeInteger(endLine) ||
      endLine < startLine
    ) {
      return undefined;
    }
    if (
      !matchesEntry(name, entry) &&
      !(typeof qualifiedName === 'string' && matchesEntry(qualifiedName, entry))
    ) {
      continue;
    }
    hits.push(
      Object.freeze({
        file: posix.normalize(file.replaceAll('\\', '/')),
        symbol: name,
        lines: [startLine, startLine] as const,
        source: 'codegraph' as const,
        reasonCodes: [
          entry.source === 'symbol-anchor'
            ? ('SYMBOL_SEARCH_HIT' as const)
            : ('LITERAL_TERM_HIT' as const),
        ],
      }),
    );
  }
  return Object.freeze({
    rawResultCount: value.length,
    hits: Object.freeze(hits),
  });
}
