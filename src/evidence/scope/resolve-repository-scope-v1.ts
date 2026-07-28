import { REPO_LAYERS, type RepoLayer } from '../../contracts/index.js';

export const DEFAULT_EFFECTIVE_SCOPE_V1 = Object.freeze([
  'client',
  'server',
  'db',
  'config',
  'unknown',
] as const satisfies readonly RepoLayer[]);

export interface ResolvedRepositoryScopeV1 {
  readonly requested: readonly RepoLayer[];
  readonly effective: readonly RepoLayer[];
  readonly policyVersion: 'repo-scope-v1';
}

/**
 * 按 REPO_LAYERS 枚举顺序去重；省略/空 → requested=[] + 固定 default effective。
 */
export function resolveRepositoryScopeV1(
  layers: readonly RepoLayer[] | undefined,
): ResolvedRepositoryScopeV1 {
  if (layers === undefined || layers.length === 0) {
    return Object.freeze({
      requested: Object.freeze([]),
      effective: DEFAULT_EFFECTIVE_SCOPE_V1,
      policyVersion: 'repo-scope-v1' as const,
    });
  }
  const present = new Set(layers);
  const requested = Object.freeze(
    REPO_LAYERS.filter((layer) => present.has(layer)),
  );
  return Object.freeze({
    requested,
    effective: requested,
    policyVersion: 'repo-scope-v1' as const,
  });
}

/**
 * unmatched = effective − matched，仍按 REPO_LAYERS 顺序。
 */
export function unmatchedLayersFromMatchedV1(
  effective: readonly RepoLayer[],
  matched: ReadonlySet<RepoLayer>,
): readonly RepoLayer[] {
  return Object.freeze(effective.filter((layer) => !matched.has(layer)));
}
