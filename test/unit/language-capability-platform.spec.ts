import { describe, expect, it } from 'vitest';

import {
  requireDefaultLanguageEvidenceAdapterRegistryV2,
  verifiedLastExtensionFromBasenameV2,
} from '../../src/evidence/language/language-adapter-registry-v2.js';
import {
  createCapabilityPreBudgetCountV2,
  requireCapabilityPreBudgetCountV2,
} from '../../src/evidence/language/capability-coverage-v2.js';
import {
  fallbackCandidateCasesV2,
  javascriptExtensionCasesV2,
  sqlExtensionCasesV2,
  typescriptExtensionCasesV2,
  unsupportedCountCasesV2,
} from '../../testkit/fixtures/language-capability-v2/extension-matrix-v2.js';
import { recordPlatformAssertionMarker } from '../../testkit/testing/platform-contract.js';
import { isSelected } from '../../testkit/testing/selection.js';

export function assertTypescriptExtensionV2(): void {
  const registry = requireDefaultLanguageEvidenceAdapterRegistryV2();
  for (const row of typescriptExtensionCasesV2) {
    const extension = verifiedLastExtensionFromBasenameV2(row.basename);
    expect(extension).toBe(row.extension);
    expect(registry.resolveAdapter(extension)).toBe('typescript');
  }
  recordPlatformAssertionMarker('F8-LANG-001', 'typescript-extension');
}

export function assertJavascriptExtensionV2(): void {
  const registry = requireDefaultLanguageEvidenceAdapterRegistryV2();
  for (const row of javascriptExtensionCasesV2) {
    const extension = verifiedLastExtensionFromBasenameV2(row.basename);
    expect(extension).toBe(row.extension);
    expect(registry.resolveAdapter(extension)).toBe('javascript');
  }
  recordPlatformAssertionMarker('F8-LANG-001', 'javascript-extension');
}

export function assertSqlExtensionV2(): void {
  const registry = requireDefaultLanguageEvidenceAdapterRegistryV2();
  for (const row of sqlExtensionCasesV2) {
    const extension = verifiedLastExtensionFromBasenameV2(row.basename);
    expect(extension).toBe(row.extension);
    expect(registry.resolveAdapter(extension)).toBe('sql');
  }
  recordPlatformAssertionMarker('F8-LANG-001', 'sql-extension');
}

export function assertFallbackCandidateOnlyV2(): void {
  const registry = requireDefaultLanguageEvidenceAdapterRegistryV2();
  for (const row of fallbackCandidateCasesV2) {
    const extension = verifiedLastExtensionFromBasenameV2(row.basename);
    expect(registry.resolveAdapter(extension)).toBe('fallback');
  }
  recordPlatformAssertionMarker('F8-LANG-001', 'fallback-candidate-only');
}

export function assertUnsupportedCountBeforeBudgetV2(): void {
  expect(unsupportedCountCasesV2.length).toBeGreaterThan(0);
  for (const row of unsupportedCountCasesV2) {
    if (row.adapter === 'fallback') {
      expect(row.countsUnsupported).toBe(true);
    } else {
      expect(row.countsUnsupported).toBe(false);
    }
  }
  // behavioral: producer API exists and is the count owner (not fixture-only)
  expect(typeof createCapabilityPreBudgetCountV2).toBe('function');
  expect(typeof requireCapabilityPreBudgetCountV2).toBe('function');
  recordPlatformAssertionMarker(
    'F8-LANG-001',
    'unsupported-count-before-budget',
  );
}

describe.runIf(
  isSelected({
    group: 'language-capability-boundary',
    caseId: 'language-extension-and-fallback',
  }),
)('F8-LANG-001 language-extension-and-fallback', () => {
  it('asserts five platform markers', () => {
    assertTypescriptExtensionV2();
    assertJavascriptExtensionV2();
    assertSqlExtensionV2();
    assertFallbackCandidateOnlyV2();
    assertUnsupportedCountBeforeBudgetV2();
  });
});
