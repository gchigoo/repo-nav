/**
 * Python semantic adapter: def/class and assignment/mapping.
 */

import { maskPythonNonCode } from './python-lexical-kernel-v2.js';
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

function tokenPattern(value: string): string {
  return `(?<![\\p{L}\\p{N}_])(${escapeRegExp(value)})(?![\\p{L}\\p{N}_])`;
}

function hasPythonDefinition(code: string, symbol: string): boolean {
  const token = tokenPattern(symbol);
  return new RegExp(
    `(?:^[ \\t]*(?:async[ \\t]+)?def[ \\t]+${token}[ \\t]*\\(|^[ \\t]*class[ \\t]+${token}\\b)`,
    'mu',
  ).test(code);
}

function hasAssignmentOrMapping(
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

export function createPythonLanguageAdapterV2(): Readonly<{
  kind: 'python';
  classifySemantic(
    input: VerifiedSemanticLanguageClassificationInputV2,
  ): Readonly<{
    producerKind: LanguageProducerKindV2;
    sourceRef: LanguageAdapterProducerSourceRefV2;
  }>;
}> {
  return Object.freeze({
    kind: 'python' as const,
    classifySemantic(input) {
      const view = requireSemanticLanguageClassificationInputV2(input);
      const code = maskPythonNonCode(view.sourceText);
      const terms = view.matchedTerms;
      const structureComplete = view.structureComplete;
      let producerKind: LanguageProducerKindV2 = 'none';
      let definitionRole: 'definition' | 'execution-site' | undefined;
      let canonicalSymbol: string | undefined;

      if (
        structureComplete &&
        terms.length >= 2 &&
        hasAssignmentOrMapping(code, terms)
      ) {
        producerKind =
          view.anchoredSymbol !== undefined ? 'direct-anchored' : 'direct-term';
      } else if (structureComplete && view.anchoredSymbol !== undefined) {
        if (hasPythonDefinition(code, view.anchoredSymbol)) {
          producerKind = 'anchored-definition';
          definitionRole = 'definition';
          canonicalSymbol = view.anchoredSymbol;
        } else {
          producerKind = 'anchored-reference';
          canonicalSymbol = view.anchoredSymbol;
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
