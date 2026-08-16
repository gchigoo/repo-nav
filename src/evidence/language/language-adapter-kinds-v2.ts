/**
 * F8 frozen adapter kind / lexical mode / producer kind enums。
 */

export type LanguageAdapterKindV2 =
  'typescript' | 'javascript' | 'sql' | 'python' | 'go' | 'fallback';

export type EcmaLexicalModeV2 = 'ts' | 'tsx' | 'js' | 'jsx';
export type LanguageLexicalModeV2 = EcmaLexicalModeV2 | 'sql' | 'python' | 'go';

export type LexicalRegistryStateV2 =
  'pending' | 'fulfilled' | 'failed' | 'disposed';

export type LanguageProducerKindV2 =
  | 'direct-anchored'
  | 'direct-term'
  | 'anchored-definition'
  | 'anchored-reference'
  | 'verified-literal'
  | 'secondary'
  | 'derived-neighbor'
  | 'none';

export const SEMANTIC_CLASSIFICATION_ORDER_V2 = Object.freeze([
  'typescript',
  'javascript',
  'sql',
  'python',
  'go',
] as const);

export type SemanticClassificationV2 =
  (typeof SEMANTIC_CLASSIFICATION_ORDER_V2)[number];
