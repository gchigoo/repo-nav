import { describe, expect, it } from 'vitest';

import { requireDefaultLanguageEvidenceAdapterRegistryV2 } from '../../src/evidence/language/language-adapter-registry-v2.js';
import { finalizeLocateResultV2 } from '../../src/evidence/locate-execution/finalize-locate-result-v2.js';
import { locateExecutionFinalizerInputFromUnsafePublicSourceV2 } from '../../testkit/fixtures/locate-execution-v2/finalizer-facts-v2.js';
import { createUnsafeLocateSuccessV2 } from '../../testkit/fixtures/public-output-v2/synthetic-locate-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'language-capability-boundary',
    caseId: 'v2-shadow-and-v1-parity',
  }),
)('language capability finalizer parity', () => {
  it('projects canonical capabilities without a shadow aggregation stage', () => {
    const registry = requireDefaultLanguageEvidenceAdapterRegistryV2();
    expect(registry.semanticClassification).toEqual([
      'typescript',
      'javascript',
      'sql',
      'python',
      'go',
    ]);

    const result = finalizeLocateResultV2(
      locateExecutionFinalizerInputFromUnsafePublicSourceV2(
        createUnsafeLocateSuccessV2(),
      ),
    ).value;
    if (!result.ok) throw new Error('Expected finalizer success.');
    expect(
      result.evidence.coverage.capabilities.semanticClassification,
    ).toEqual(registry.semanticClassification);
  });
});
