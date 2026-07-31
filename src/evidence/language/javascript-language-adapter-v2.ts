/**
 * F8 JavaScript semantic adapter（js|jsx）：共同 runtime 规则，拒 TS-only。
 */

import { maskNonCode } from './ecmascript-lexical-kernel-v2.js';
import {
  decodeCompleteEmbeddedSqlLiteralV2,
  requireCompleteEmbeddedSqlLiteralFactsV2,
} from './embedded-sql-literal-decoder-v2.js';
import { maskSqlNonCode } from './sql-lexical-kernel-v2.js';
import type { LanguageProducerKindV2 } from './language-adapter-kinds-v2.js';
import {
  signLanguageAdapterSourceRefV2,
  type LanguageAdapterProducerSourceRefV2,
} from './language-adapter-producer-v2.js';
import type { VerifiedSemanticLanguageClassificationInputV2 } from './language-lexical-coordinator-v2.js';
import { requireSemanticLanguageClassificationInputV2 } from './language-lexical-coordinator-v2.js';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function hasJsRuntimeDefinition(code: string, symbol: string): boolean {
  const token = escapeRegExp(symbol);
  return new RegExp(
    `(?:\\b(?:async\\s+)?function\\s+${token}\\s*\\(|\\b(?:const|let|var)\\s+${token}\\s*=|\\bclass\\s+${token}\\b)`,
    'u',
  ).test(code);
}

function hasTsOnlyDeclaration(code: string, symbol: string): boolean {
  const token = escapeRegExp(symbol);
  return (
    new RegExp(`\\b(?:interface|enum)\\s+${token}\\b`, 'u').test(code) ||
    new RegExp(`\\btype\\s+${token}\\b`, 'u').test(code)
  );
}

function hasAssignmentOrObject(
  code: string,
  terms: readonly string[],
): boolean {
  if (terms.length < 2) {
    return false;
  }
  for (let i = 0; i < terms.length; i += 1) {
    for (let j = 0; j < terms.length; j += 1) {
      if (i === j) continue;
      const left = escapeRegExp(terms[i]!);
      const right = escapeRegExp(terms[j]!);
      if (
        new RegExp(`${left}\\s*=\\s*${right}`, 'u').test(code) ||
        new RegExp(`${left}\\s*:\\s*${right}`, 'u').test(code)
      ) {
        return true;
      }
    }
  }
  return false;
}

function containsSqlAlias(sql: string, terms: readonly string[]): boolean {
  if (terms.length < 2) {
    return false;
  }
  for (let i = 0; i < terms.length; i += 1) {
    for (let j = 0; j < terms.length; j += 1) {
      if (i === j) continue;
      const source = escapeRegExp(terms[i]!);
      const target = escapeRegExp(terms[j]!);
      if (new RegExp(`${source}\\s+AS\\s+${target}`, 'iu').test(sql)) {
        return true;
      }
    }
  }
  return false;
}

export function createJavascriptLanguageAdapterV2(): Readonly<{
  kind: 'javascript';
  classifySemantic(
    input: VerifiedSemanticLanguageClassificationInputV2,
  ): Readonly<{
    producerKind: LanguageProducerKindV2;
    sourceRef: LanguageAdapterProducerSourceRefV2;
  }>;
}> {
  return Object.freeze({
    kind: 'javascript' as const,
    classifySemantic(input) {
      const view = requireSemanticLanguageClassificationInputV2(input);
      const code = maskNonCode(view.sourceText);
      const terms = view.matchedTerms;
      const structureComplete = view.structureComplete;
      let producerKind: LanguageProducerKindV2 = 'none';
      let definitionRole: 'definition' | 'execution-site' | undefined;
      let canonicalSymbol: string | undefined;

      if (
        structureComplete &&
        view.anchoredSymbol !== undefined &&
        hasTsOnlyDeclaration(code, view.anchoredSymbol)
      ) {
        // TS-only 不得成为 JS definition；降为 literal/reference
        producerKind =
          terms.length > 0 ? 'verified-literal' : 'anchored-reference';
        canonicalSymbol = view.anchoredSymbol;
      } else if (
        structureComplete &&
        terms.length >= 2 &&
        hasAssignmentOrObject(code, terms)
      ) {
        producerKind =
          view.anchoredSymbol !== undefined ? 'direct-anchored' : 'direct-term';
      } else if (structureComplete && view.anchoredSymbol !== undefined) {
        if (hasJsRuntimeDefinition(code, view.anchoredSymbol)) {
          producerKind = 'anchored-definition';
          definitionRole = 'definition';
          canonicalSymbol = view.anchoredSymbol;
        } else {
          producerKind = 'anchored-reference';
          canonicalSymbol = view.anchoredSymbol;
        }
      }

      if (structureComplete) {
        const embedded = decodeCompleteEmbeddedSqlLiteralV2(view.sourceText);
        if (embedded.ok) {
          const decoded = requireCompleteEmbeddedSqlLiteralFactsV2(
            embedded.facts,
          );
          if (containsSqlAlias(maskSqlNonCode(decoded.decoded), terms)) {
            producerKind =
              view.anchoredSymbol !== undefined
                ? 'direct-anchored'
                : 'direct-term';
          }
        }
      }

      if (producerKind === 'none' && terms.length > 0) {
        producerKind = 'verified-literal';
      }

      const sourceRef = signLanguageAdapterSourceRefV2({
        producerKind,
        producerBasis: view.producerBasis,
        eligibleRef: view.eligibleRef,
        execution: view.execution,
        lane: 'supported',
        matchedTermPresent: terms.length > 0,
        structureComplete,
        ...(definitionRole === undefined ? {} : { definitionRole }),
        ...(canonicalSymbol === undefined ? {} : { canonicalSymbol }),
      });
      return Object.freeze({ producerKind, sourceRef });
    },
  });
}
