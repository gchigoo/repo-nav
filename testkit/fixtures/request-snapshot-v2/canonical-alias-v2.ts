/**
 * F3-CACHE-001：同 canonical target 的两个 locator alias 共享唯一 decode。
 */
export const CANONICAL_ALIAS_TARGET_V2 = 'server/alias-target.ts';
export const CANONICAL_ALIAS_LINK_V2 = 'server/alias-link.ts';

export const CANONICAL_ALIAS_CONTENT_V2 = [
  'export const aliasShared = 1;',
  'export const aliasMarker = "shared";',
].join('\n');

export const CANONICAL_ALIAS_LIMITS_V2 = Object.freeze({
  maxFileBytes: 4096,
  maxExcerptBytes: 256,
  maxExcerptLines: 4,
});
