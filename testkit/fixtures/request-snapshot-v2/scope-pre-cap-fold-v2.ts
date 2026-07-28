/**
 * F3-SCOPE-FOLD-001：pre-cap fold 与固定 800 cap；excluded 不占 cap。
 */
export const SCOPE_FOLD_SAFE_FILE_V2 = 'server/fold.ts';

export const SCOPE_FOLD_INCLUDED_DECISION_V2 = Object.freeze({
  layer: 'server',
  included: true,
  confirmation: 'allowed' as const,
});

export const SCOPE_FOLD_EXCLUDED_DECISION_V2 = Object.freeze({
  layer: 'docs',
  included: false,
  confirmation: 'excluded' as const,
});
