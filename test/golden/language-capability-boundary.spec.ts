import { describe, expect, it } from 'vitest';

import { createAcceptedCompleteRealLocateShadowOrchestratorV2 } from '../../src/evidence/canonical/accepted-complete-real-locate-shadow-orchestrator-v2.js';
import { requireDefaultLanguageEvidenceAdapterRegistryV2 } from '../../src/evidence/language/language-adapter-registry-v2.js';
import { V1LocateResultProjector } from '../../src/evidence/locate-execution/v1-locate-result-projector.js';
import { createFourPrerequisiteCanonicalInputV2 } from '../../testkit/fixtures/canonical-locate-bridge-v2/four-prerequisite-base-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'language-capability-boundary',
    caseId: 'v2-shadow-and-v1-parity',
  }),
)('F8-V1-001 v2-shadow-and-v1-parity', () => {
  it('keeps v1 projector exact on four-prerequisite input while shadow stays internal', () => {
    const { input, capability } = createFourPrerequisiteCanonicalInputV2();
    const v1 = new V1LocateResultProjector().project(input, capability);
    expect(v1).toBe(input.legacyV1Projection);
    expect(v1.ok).toBe(true);
    if (!v1.ok) {
      throw new Error('expected v1 success');
    }
    expect(v1.evidence.schemaVersion).toBe('1.0');

    const orchestrator = createAcceptedCompleteRealLocateShadowOrchestratorV2();
    const shadow = orchestrator.projectAcceptedExecution(input, capability);
    // without ranking/aggregation registration, shadow fails closed; v1 unchanged
    expect(shadow.ok).toBe(false);
    expect(input.legacyV1Projection).toBe(v1);

    const registry = requireDefaultLanguageEvidenceAdapterRegistryV2();
    expect(registry.semanticClassification).toEqual([
      'typescript',
      'javascript',
      'sql',
    ]);
  });
});
