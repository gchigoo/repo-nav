import { describe, expect, it } from 'vitest';

import * as root from '../../src/index.js';
import { PUBLIC_ROOT_RUNTIME_EXPORT_KEYS_V2 } from '../../testkit/fixtures/repository-hardening-v2/public-root-api-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'package-metadata' }),
)('F9-METADATA-002 root-export-snapshot', () => {
  it('exports a frozen v2-only root runtime surface', () => {
    expect(Object.keys(root).sort()).toEqual([
      ...PUBLIC_ROOT_RUNTIME_EXPORT_KEYS_V2,
    ]);
  });
});
