/**
 * F8 LanguageEvidenceAdapterRegistryV2：extension → adapter 冻结表与冲突 gate。
 */

import type { LanguageAdapterKindV2 } from './language-adapter-kinds-v2.js';
import { SEMANTIC_CLASSIFICATION_ORDER_V2 } from './language-adapter-kinds-v2.js';

export interface LanguageAdapterExtensionEntryV2 {
  readonly adapter: Exclude<LanguageAdapterKindV2, 'fallback'>;
  readonly extensions: readonly string[];
}

const DEFAULT_ENTRIES: readonly LanguageAdapterExtensionEntryV2[] =
  Object.freeze([
    Object.freeze({
      adapter: 'typescript' as const,
      extensions: Object.freeze(['.ts', '.tsx', '.mts', '.cts']),
    }),
    Object.freeze({
      adapter: 'javascript' as const,
      extensions: Object.freeze(['.js', '.jsx', '.mjs', '.cjs']),
    }),
    Object.freeze({
      adapter: 'sql' as const,
      extensions: Object.freeze(['.sql']),
    }),
  ]);

function asciiFoldExtension(extension: string): string {
  let out = '';
  for (let i = 0; i < extension.length; i += 1) {
    const code = extension.charCodeAt(i);
    if (code >= 0x41 && code <= 0x5a) {
      out += String.fromCharCode(code + 0x20);
    } else {
      out += extension[i]!;
    }
  }
  return out;
}

function assertValidExtension(extension: string): string {
  const folded = asciiFoldExtension(extension);
  if (folded.length < 2 || folded[0] !== '.') {
    throw new TypeError('language adapter extension must have leading dot');
  }
  for (let i = 1; i < folded.length; i += 1) {
    const code = folded.charCodeAt(i);
    const isLower = code >= 0x61 && code <= 0x7a;
    const isDigit = code >= 0x30 && code <= 0x39;
    if (!isLower && !isDigit) {
      throw new TypeError('language adapter extension must be ASCII lowercase');
    }
  }
  if (folded.includes('.', 1)) {
    throw new TypeError('language adapter extension must be single segment');
  }
  return folded;
}

export interface LanguageEvidenceAdapterRegistryV2 {
  readonly semanticClassification: readonly ['typescript', 'javascript', 'sql'];
  resolveAdapter(lastExtension: string | undefined): LanguageAdapterKindV2;
  modeForExtension(
    lastExtension: string | undefined,
  ): 'ts' | 'tsx' | 'js' | 'jsx' | 'sql' | undefined;
}

/**
 * 构造全局唯一 extension registry；duplicate/overlap/nonASCII/fallback-early 失败。
 */
export function createLanguageEvidenceAdapterRegistryV2(
  entries: readonly LanguageAdapterExtensionEntryV2[] = DEFAULT_ENTRIES,
): LanguageEvidenceAdapterRegistryV2 {
  const byExtension = new Map<
    string,
    Exclude<LanguageAdapterKindV2, 'fallback'>
  >();
  const seenAdapters = new Set<string>();
  for (const entry of entries) {
    if (entry.adapter === ('fallback' as string)) {
      throw new TypeError('fallback adapter cannot appear in extension table');
    }
    if (seenAdapters.has(entry.adapter)) {
      throw new TypeError('duplicate language adapter entry');
    }
    seenAdapters.add(entry.adapter);
    if (entry.extensions.length === 0) {
      throw new TypeError('language adapter extensions must be non-empty');
    }
    for (const extension of entry.extensions) {
      const folded = assertValidExtension(extension);
      if (byExtension.has(folded)) {
        throw new TypeError('duplicate language adapter extension');
      }
      byExtension.set(folded, entry.adapter);
    }
  }
  for (const required of SEMANTIC_CLASSIFICATION_ORDER_V2) {
    if (!seenAdapters.has(required)) {
      throw new TypeError(`missing required language adapter ${required}`);
    }
  }

  const modeByExtension = new Map<string, 'ts' | 'tsx' | 'js' | 'jsx' | 'sql'>([
    ['.ts', 'ts'],
    ['.mts', 'ts'],
    ['.cts', 'ts'],
    ['.tsx', 'tsx'],
    ['.js', 'js'],
    ['.mjs', 'js'],
    ['.cjs', 'js'],
    ['.jsx', 'jsx'],
    ['.sql', 'sql'],
  ]);

  return Object.freeze({
    semanticClassification: SEMANTIC_CLASSIFICATION_ORDER_V2,
    resolveAdapter(lastExtension: string | undefined): LanguageAdapterKindV2 {
      if (lastExtension === undefined || lastExtension.length === 0) {
        return 'fallback';
      }
      const folded = asciiFoldExtension(lastExtension);
      return byExtension.get(folded) ?? 'fallback';
    },
    modeForExtension(lastExtension: string | undefined) {
      if (lastExtension === undefined || lastExtension.length === 0) {
        return undefined;
      }
      return modeByExtension.get(asciiFoldExtension(lastExtension));
    },
  });
}

let defaultRegistry: LanguageEvidenceAdapterRegistryV2 | undefined;

export function requireDefaultLanguageEvidenceAdapterRegistryV2(): LanguageEvidenceAdapterRegistryV2 {
  defaultRegistry ??= createLanguageEvidenceAdapterRegistryV2();
  return defaultRegistry;
}

export { verifiedLastExtensionFromBasenameV2 } from '../request-snapshot/capability-classification-views-v2.js';
