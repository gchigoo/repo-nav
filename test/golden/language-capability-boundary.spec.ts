import { describe, expect, it } from 'vitest';

import { createAcceptedCompleteRealLocateShadowOrchestratorV2 } from '../../src/evidence/canonical/accepted-complete-real-locate-shadow-orchestrator-v2.js';
import { requireDefaultLanguageEvidenceAdapterRegistryV2 } from '../../src/evidence/language/language-adapter-registry-v2.js';
import { V2LocateResultProjector } from '../../src/evidence/locate-execution/v2-locate-result-projector.js';
import { createFourPrerequisiteCanonicalInputV2 } from '../../testkit/fixtures/canonical-locate-bridge-v2/four-prerequisite-base-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'language-capability-boundary',
    caseId: 'v2-shadow-and-v1-parity',
  }),
)('F8-V1-001 v2-shadow-and-v1-parity', () => {
  it('uses production v2 projector; shadow remains internal and fail-closed without aggregation', () => {
    const { input, capability } = createFourPrerequisiteCanonicalInputV2();
    const projector = new V2LocateResultProjector(
      createAcceptedCompleteRealLocateShadowOrchestratorV2(),
    );
    const produced = projector.project(input, capability);
    expect(produced.value.ok).toBe(false);
    if (produced.value.ok) {
      throw new Error('expected fail-closed without aggregation registration');
    }
    expect(produced.value.error.code).toBe('INTERNAL_ERROR');

    const orchestrator = createAcceptedCompleteRealLocateShadowOrchestratorV2();
    const shadow = orchestrator.projectAcceptedExecution(input, capability);
    expect(shadow.ok).toBe(false);

    const registry = requireDefaultLanguageEvidenceAdapterRegistryV2();
    expect(registry.semanticClassification).toEqual([
      'typescript',
      'javascript',
      'sql',
    ]);
  });
});
