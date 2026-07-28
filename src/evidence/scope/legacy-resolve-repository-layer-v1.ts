import { extname, posix } from 'node:path';

import type { RepoLayer } from '../../contracts/index.js';

/**
 * 迁移前 frozen layer resolver：仅供 S1 characterization / 兼容 re-export。
 * 不做 prefix/nested/e2e/doc 语义扩展。
 */
export const LEGACY_TEST_SEGMENTS_V1 = Object.freeze(
  new Set([
    'test',
    'tests',
    '__tests__',
    'spec',
    'specs',
    'fixtures',
    '__fixtures__',
  ]),
);

export const LEGACY_DOCS_SEGMENTS_V1 = Object.freeze(
  new Set(['docs', 'documentation', 'examples']),
);

export const LEGACY_DOCS_EXTENSIONS_V1 = Object.freeze(
  new Set(['.md', '.mdx', '.rst', '.adoc']),
);

export const LEGACY_TOP_LEVEL_LAYERS_V1 = Object.freeze(
  new Set<RepoLayer>(['client', 'server', 'db', 'config']),
);

/**
 * Frozen pre-F7 layer classification（posix.normalize + locale-insensitive lower）。
 */
export function legacyResolveRepositoryLayerV1(file: string): RepoLayer {
  const normalized = posix.normalize(file.replaceAll('\\', '/'));
  const segments = normalized.split('/').map((segment) => segment.toLowerCase());
  const basename = segments.at(-1) ?? '';
  if (
    segments.some((segment) => LEGACY_TEST_SEGMENTS_V1.has(segment)) ||
    basename.includes('.spec.') ||
    basename.includes('.test.')
  ) {
    return 'test';
  }
  if (
    segments.some((segment) => LEGACY_DOCS_SEGMENTS_V1.has(segment)) ||
    LEGACY_DOCS_EXTENSIONS_V1.has(extname(basename).toLowerCase())
  ) {
    return 'docs';
  }
  const topLevel = segments[0] as RepoLayer | undefined;
  return topLevel !== undefined && LEGACY_TOP_LEVEL_LAYERS_V1.has(topLevel)
    ? topLevel
    : 'unknown';
}
