import type { RepoLayer } from '../../contracts/index.js';
import { asciiLowercaseCodeUnitsV1 } from './ascii-lowercase-v1.js';
import type { ResolvedRepositoryScopeV1 } from './resolve-repository-scope-v1.js';

export type ScopeConfirmationModeV1 =
  | 'allowed'
  | 'candidate-only'
  | 'excluded';

export type RepositoryScopeRuleV1 =
  | 'test-segment'
  | 'test-basename'
  | 'docs-segment'
  | 'docs-extension'
  | 'explicit-prefix'
  | 'ordinary-segment'
  | 'unknown';

export interface VerifiedScopePolicyPathViewV2 {
  readonly posixSegments: readonly string[];
  readonly basename: string;
}

export interface RepositoryScopeDecisionV1 {
  readonly layer: RepoLayer;
  readonly included: boolean;
  readonly confirmation: ScopeConfirmationModeV1;
  readonly rule: RepositoryScopeRuleV1;
}

export interface RepositoryScopePolicyV1 {
  decide(
    path: VerifiedScopePolicyPathViewV2,
    scope: ResolvedRepositoryScopeV1,
  ): RepositoryScopeDecisionV1;
}

const TEST_SEGMENTS = Object.freeze(
  new Set([
    'test',
    'tests',
    '__tests__',
    'spec',
    'specs',
    'fixtures',
    '__fixtures__',
    'e2e',
  ]),
);

const DOCS_SEGMENTS = Object.freeze(
  new Set(['doc', 'docs', 'documentation', 'examples']),
);

const DOCS_EXTENSIONS = Object.freeze(
  new Set(['.md', '.mdx', '.rst', '.adoc']),
);

const ORDINARY_SEGMENT_LAYER = Object.freeze({
  client: 'client',
  frontend: 'client',
  web: 'client',
  ui: 'client',
  server: 'server',
  backend: 'server',
  api: 'server',
  db: 'db',
  database: 'db',
  migration: 'db',
  migrations: 'db',
  config: 'config',
  configs: 'config',
} as const satisfies Readonly<Record<string, RepoLayer>>);

interface ExplicitPrefixMappingV1 {
  readonly segments: readonly string[];
  readonly layer: RepoLayer;
}

const EXPLICIT_PREFIX_SPECS: readonly ExplicitPrefixMappingV1[] = Object.freeze([
  Object.freeze({ segments: Object.freeze(['apps', 'web']), layer: 'client' }),
  Object.freeze({
    segments: Object.freeze(['packages', 'frontend']),
    layer: 'client',
  }),
  Object.freeze({
    segments: Object.freeze(['src', 'client']),
    layer: 'client',
  }),
  Object.freeze({ segments: Object.freeze(['apps', 'api']), layer: 'server' }),
  Object.freeze({
    segments: Object.freeze(['packages', 'backend']),
    layer: 'server',
  }),
  Object.freeze({
    segments: Object.freeze(['src', 'server']),
    layer: 'server',
  }),
  Object.freeze({ segments: Object.freeze(['db']), layer: 'db' }),
  Object.freeze({ segments: Object.freeze(['database']), layer: 'db' }),
  Object.freeze({ segments: Object.freeze(['migrations']), layer: 'db' }),
  Object.freeze({ segments: Object.freeze(['.config']), layer: 'config' }),
  Object.freeze({ segments: Object.freeze(['config']), layer: 'config' }),
  Object.freeze({ segments: Object.freeze(['configs']), layer: 'config' }),
]);

function buildExplicitPrefixTableV1(): readonly ExplicitPrefixMappingV1[] {
  const byKey = new Map<string, ExplicitPrefixMappingV1>();
  for (const mapping of EXPLICIT_PREFIX_SPECS) {
    const key = mapping.segments.join('/');
    const existing = byKey.get(key);
    if (existing !== undefined && existing.layer !== mapping.layer) {
      throw new TypeError(
        `duplicate conflicting explicit prefix mapping: ${key}`,
      );
    }
    byKey.set(key, mapping);
  }
  // 同长度同 path 冲突已在上面拒绝；按长度降序便于最长前缀匹配
  return Object.freeze(
    [...byKey.values()].sort(
      (left, right) => right.segments.length - left.segments.length,
    ),
  );
}

const EXPLICIT_PREFIX_TABLE = buildExplicitPrefixTableV1();

function comparisonSegmentsV1(
  path: VerifiedScopePolicyPathViewV2,
): readonly string[] {
  return Object.freeze(
    path.posixSegments.map((segment) => asciiLowercaseCodeUnitsV1(segment)),
  );
}

function comparisonBasenameV1(path: VerifiedScopePolicyPathViewV2): string {
  return asciiLowercaseCodeUnitsV1(path.basename);
}

function classifyLayerAndRuleV1(
  path: VerifiedScopePolicyPathViewV2,
): Readonly<{ layer: RepoLayer; rule: RepositoryScopeRuleV1 }> {
  const segments = comparisonSegmentsV1(path);
  const basename = comparisonBasenameV1(path);

  if (segments.some((segment) => TEST_SEGMENTS.has(segment))) {
    return Object.freeze({ layer: 'test', rule: 'test-segment' as const });
  }
  if (basename.includes('.spec.') || basename.includes('.test.')) {
    return Object.freeze({ layer: 'test', rule: 'test-basename' as const });
  }

  if (segments.some((segment) => DOCS_SEGMENTS.has(segment))) {
    return Object.freeze({ layer: 'docs', rule: 'docs-segment' as const });
  }
  const lastDot = basename.lastIndexOf('.');
  if (lastDot >= 0) {
    const extension = basename.slice(lastDot);
    if (DOCS_EXTENSIONS.has(extension)) {
      return Object.freeze({ layer: 'docs', rule: 'docs-extension' as const });
    }
  }

  for (const mapping of EXPLICIT_PREFIX_TABLE) {
    if (segments.length < mapping.segments.length) {
      continue;
    }
    let matched = true;
    for (let index = 0; index < mapping.segments.length; index += 1) {
      if (segments[index] !== mapping.segments[index]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return Object.freeze({
        layer: mapping.layer,
        rule: 'explicit-prefix' as const,
      });
    }
  }

  for (const segment of segments) {
    const layer = ORDINARY_SEGMENT_LAYER[
      segment as keyof typeof ORDINARY_SEGMENT_LAYER
    ];
    if (layer !== undefined) {
      return Object.freeze({
        layer,
        rule: 'ordinary-segment' as const,
      });
    }
  }

  return Object.freeze({ layer: 'unknown', rule: 'unknown' as const });
}

function confirmationForV1(
  layer: RepoLayer,
  included: boolean,
): ScopeConfirmationModeV1 {
  if (!included) {
    return 'excluded';
  }
  if (layer === 'test' || layer === 'docs') {
    return 'candidate-only';
  }
  return 'allowed';
}

/**
 * repo-scope-v1 pure policy：只消费 F3 path view + resolved scope。
 */
export class RepositoryScopePolicyV1Impl implements RepositoryScopePolicyV1 {
  public decide(
    path: VerifiedScopePolicyPathViewV2,
    scope: ResolvedRepositoryScopeV1,
  ): RepositoryScopeDecisionV1 {
    const classified = classifyLayerAndRuleV1(path);
    const included = scope.effective.includes(classified.layer);
    return Object.freeze({
      layer: classified.layer,
      included,
      confirmation: confirmationForV1(classified.layer, included),
      rule: classified.rule,
    });
  }
}

export function createRepositoryScopePolicyV1(): RepositoryScopePolicyV1 {
  return new RepositoryScopePolicyV1Impl();
}

/**
 * 从已验证 POSIX path 构造 path view（不 normalize / 不 trim）。
 */
export function pathViewFromPosixPathV1(
  posixPath: string,
): VerifiedScopePolicyPathViewV2 {
  const segments = Object.freeze(posixPath.split('/'));
  const basename = segments.at(-1) ?? '';
  return Object.freeze({ posixSegments: segments, basename });
}

/**
 * 兼容入口：对字符串路径跑 repo-scope-v1 layer（不做 separator 转换）。
 * 调用方应先经 F3 factory；本函数仅供 classifier / characterization 桥接。
 */
export function resolveRepositoryLayerV1(file: string): RepoLayer {
  // 仅 slash 切分；不 replaceAll、不 posix.normalize
  const path = pathViewFromPosixPathV1(file.includes('\\') ? file.replaceAll('\\', '/') : file);
  return classifyLayerAndRuleV1(path).layer;
}

/**
 * 决策入口：path view + scope → decision。
 */
export function decideRepositoryScopeV1(
  path: VerifiedScopePolicyPathViewV2,
  scope: ResolvedRepositoryScopeV1,
  policy: RepositoryScopePolicyV1 = createRepositoryScopePolicyV1(),
): RepositoryScopeDecisionV1 {
  return policy.decide(path, scope);
}
