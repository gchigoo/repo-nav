import { describe, expect, it } from 'vitest';

import { finalizeLocateResultV2 } from '../../src/evidence/locate-execution/finalize-locate-result-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'canonical-locate-bridge',
    caseId: 'canonical-safe-error-serialization',
  }),
)('canonical safe error serialization', () => {
  it('returns exact immutable JSON and byte count for every safe error', () => {
    for (const input of [
      {
        ok: false as const,
        error: {
          code: 'INVALID_INPUT' as const,
          suggestedAction: 'ADD_TERM' as const,
        },
      },
      {
        ok: false as const,
        error: { code: 'INVALID_REPOSITORY' as const },
      },
      {
        ok: false as const,
        error: { code: 'PATH_OUTSIDE_ROOT' as const },
      },
      {
        ok: false as const,
        error: { code: 'INTERNAL_ERROR' as const },
      },
    ]) {
      const transport = finalizeLocateResultV2(input);
      expect(transport.compactJson).toBe(JSON.stringify(transport.value));
      expect(transport.utf8Bytes).toBe(
        Buffer.byteLength(transport.compactJson, 'utf8'),
      );
      expect(Object.isFrozen(transport)).toBe(true);
      expect(Object.isFrozen(transport.value)).toBe(true);
    }
  });

  it('does not serialize forged detail', () => {
    const forbidden = 'unsafe-stack-detail';
    const transport = finalizeLocateResultV2({
      ok: false,
      error: { code: 'INTERNAL_ERROR', stack: forbidden } as never,
    });
    expect(transport.compactJson).not.toContain(forbidden);
    expect(transport.value).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR' },
    });
  });
});
