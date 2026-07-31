/** Anchor intent normalization fixtures for F2. */

export const ANCHOR_INTENT_INSENSITIVE_DUP_V2 = Object.freeze([
  Object.freeze({ kind: 'term' as const, value: 'Foo' }),
  Object.freeze({ kind: 'term' as const, value: 'foo' }),
]);
