import { describe, expect, it } from 'vitest';

import {
  createTrustedSerializedPublicToolErrorV2,
  requireTrustedSerializedLocateResultV2,
} from '../../src/evidence/canonical/trusted-serialized-locate-result-v2.js';
import { issueLocateProjectionExecutionCapabilityV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'canonical-locate-bridge',
  caseId: 'canonical-safe-error-serialization',
});

describe.runIf(selected)(
  'F1C-SAFE-ERROR-SERIALIZATION-001 fixed-safe error serialization',
  () => {
    it('accepts four codes and INVALID_INPUT with optional ADD_TERM', () => {
      const capability = issueLocateProjectionExecutionCapabilityV2();
      for (const code of [
        'INVALID_INPUT',
        'INVALID_REPOSITORY',
        'PATH_OUTSIDE_ROOT',
        'INTERNAL_ERROR',
      ] as const) {
        const token = createTrustedSerializedPublicToolErrorV2(
          code,
          code === 'INVALID_INPUT' ? 'ADD_TERM' : undefined,
          capability,
        );
        const view = requireTrustedSerializedLocateResultV2(token, capability);
        expect(view.value.ok).toBe(false);
        if (view.value.ok) throw new Error('expected error');
        expect(view.value.error.code).toBe(code);
      }
    });

    it('rejects ADD_TERM with non-INVALID_INPUT before exposing value', () => {
      const capability = issueLocateProjectionExecutionCapabilityV2();
      expect(() =>
        createTrustedSerializedPublicToolErrorV2(
          'INTERNAL_ERROR',
          'ADD_TERM',
          capability,
        ),
      ).toThrow(/code\/action/i);
    });

    it('rejects wrong-capability accessor', () => {
      const capability = issueLocateProjectionExecutionCapabilityV2();
      const token = createTrustedSerializedPublicToolErrorV2(
        'INVALID_INPUT',
        undefined,
        capability,
      );
      expect(() =>
        requireTrustedSerializedLocateResultV2(
          token,
          issueLocateProjectionExecutionCapabilityV2(),
        ),
      ).toThrow(/capability/i);
    });
  },
);
