/**
 * F8 SQL semantic adapter：alias / CREATE TABLE columns。
 */

import { balancedStructureV2 } from './identifier-structure-kernel-v2.js';
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

function containsCreateTableColumn(
  sql: string,
  terms: readonly string[],
): boolean {
  if (!/\bCREATE\s+TABLE\b/iu.test(sql) || terms.length === 0) {
    return false;
  }
  return terms.some((term) =>
    new RegExp(`\\b${escapeRegExp(term)}\\b`, 'iu').test(sql),
  );
}

export function createSqlLanguageAdapterV2(): Readonly<{
  kind: 'sql';
  classifySemantic(
    input: VerifiedSemanticLanguageClassificationInputV2,
  ): Readonly<{
    producerKind: LanguageProducerKindV2;
    sourceRef: LanguageAdapterProducerSourceRefV2;
  }>;
}> {
  return Object.freeze({
    kind: 'sql' as const,
    classifySemantic(input) {
      const view = requireSemanticLanguageClassificationInputV2(input);
      const masked = maskSqlNonCode(view.sourceText);
      const structure = balancedStructureV2(masked);
      const structureComplete =
        view.structureComplete && structure.complete;
      const terms = view.matchedTerms;
      let producerKind: LanguageProducerKindV2 = 'none';

      if (
        structureComplete &&
        (containsSqlAlias(masked, terms) ||
          containsCreateTableColumn(masked, terms))
      ) {
        producerKind =
          view.anchoredSymbol !== undefined ? 'direct-anchored' : 'direct-term';
      } else if (terms.length > 0) {
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
        ...(view.anchoredSymbol === undefined
          ? {}
          : { canonicalSymbol: view.anchoredSymbol }),
      });
      return Object.freeze({ producerKind, sourceRef });
    },
  });
}
