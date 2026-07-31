import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'canonical-locate-bridge',
  caseId: 'canonical-package-declaration-boundary',
});

describe.runIf(selected)(
  'F1C-PACKAGE-001 package declaration boundary',
  () => {
    it('does not export concrete engine or private bridge symbols from package root', () => {
      const index = readFileSync(resolve('src/index.ts'), 'utf8');
      expect(index).not.toMatch(/repository-evidence-engine/u);
      expect(index).not.toMatch(/locate-execution/u);
      expect(index).not.toMatch(/canonical\//u);
      expect(index).not.toMatch(/locate-fact-envelope-v2/u);
      const dist = resolve('dist/index.d.ts');
      const declaration = readFileSync(dist, 'utf8');
      expect(declaration).not.toMatch(/RepositoryEvidenceEngine/u);
      expect(declaration).not.toMatch(/LocateExecutionTokenV2/u);
      expect(declaration).not.toMatch(/TrustedFinalizedLocateFactsV2/u);
      expect(declaration).not.toMatch(/V2ShadowLocateProjector/u);
      expect(declaration).not.toMatch(/CANONICAL_LOCATE_EXECUTOR_V2/u);
    });
  },
);
