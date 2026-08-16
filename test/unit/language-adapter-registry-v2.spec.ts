import { describe, expect, it } from 'vitest';

import {
  createLanguageEvidenceAdapterRegistryV2,
  requireDefaultLanguageEvidenceAdapterRegistryV2,
  verifiedLastExtensionFromBasenameV2,
} from '../../src/evidence/language/language-adapter-registry-v2.js';
import {
  fallbackCandidateCasesV2,
  goExtensionCasesV2,
  javascriptExtensionCasesV2,
  pythonExtensionCasesV2,
  sqlExtensionCasesV2,
  typescriptExtensionCasesV2,
} from '../../testkit/fixtures/language-capability-v2/extension-matrix-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'language-capability-boundary',
    caseId: 'extension-registry',
  }),
)('F8-EXT-001 extension-registry', () => {
  it('resolves frozen extensions and rejects registry conflicts', () => {
    const registry = requireDefaultLanguageEvidenceAdapterRegistryV2();
    expect(registry.semanticClassification).toEqual([
      'typescript',
      'javascript',
      'sql',
      'python',
      'go',
    ]);

    for (const row of typescriptExtensionCasesV2) {
      const extension = verifiedLastExtensionFromBasenameV2(row.basename);
      expect(extension).toBe(row.extension);
      expect(registry.resolveAdapter(extension)).toBe(row.adapter);
    }
    for (const row of javascriptExtensionCasesV2) {
      const extension = verifiedLastExtensionFromBasenameV2(row.basename);
      expect(extension).toBe(row.extension);
      expect(registry.resolveAdapter(extension)).toBe(row.adapter);
    }
    for (const row of sqlExtensionCasesV2) {
      const extension = verifiedLastExtensionFromBasenameV2(row.basename);
      expect(extension).toBe(row.extension);
      expect(registry.resolveAdapter(extension)).toBe(row.adapter);
    }
    for (const row of pythonExtensionCasesV2) {
      const extension = verifiedLastExtensionFromBasenameV2(row.basename);
      expect(extension).toBe(row.extension);
      expect(registry.resolveAdapter(extension)).toBe(row.adapter);
    }
    for (const row of goExtensionCasesV2) {
      const extension = verifiedLastExtensionFromBasenameV2(row.basename);
      expect(extension).toBe(row.extension);
      expect(registry.resolveAdapter(extension)).toBe(row.adapter);
    }
    for (const row of fallbackCandidateCasesV2) {
      const extension = verifiedLastExtensionFromBasenameV2(row.basename);
      expect(extension).toBe(row.extension);
      expect(registry.resolveAdapter(extension)).toBe('fallback');
    }

    expect(() =>
      createLanguageEvidenceAdapterRegistryV2([
        { adapter: 'typescript', extensions: ['.ts', '.ts'] },
        { adapter: 'javascript', extensions: ['.js'] },
        { adapter: 'sql', extensions: ['.sql'] },
        { adapter: 'python', extensions: ['.py'] },
        { adapter: 'go', extensions: ['.go'] },
      ]),
    ).toThrow(/duplicate/i);

    expect(() =>
      createLanguageEvidenceAdapterRegistryV2([
        { adapter: 'typescript', extensions: ['.ts'] },
        { adapter: 'javascript', extensions: ['.ts'] },
        { adapter: 'sql', extensions: ['.sql'] },
        { adapter: 'python', extensions: ['.py'] },
        { adapter: 'go', extensions: ['.go'] },
      ]),
    ).toThrow(/duplicate/i);

    expect(() =>
      createLanguageEvidenceAdapterRegistryV2([
        { adapter: 'typescript', extensions: ['.TS'] },
        { adapter: 'javascript', extensions: ['.js'] },
        { adapter: 'sql', extensions: ['.sql'] },
        { adapter: 'python', extensions: ['.py'] },
        { adapter: 'go', extensions: ['.go'] },
      ]),
    ).not.toThrow();
  });
});
