import { describe, expect, it } from 'vitest';

import { createRepoNavApplicationContext } from '../../src/app/create-application-context.js';
import { issueLocateProjectionExecutionCapabilityV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import {
  PUBLIC_LOCATE_EXECUTION_APPLICATION_V2,
  type PublicLocateExecutionApplicationV2,
} from '../../src/evidence/locate-execution/public-locate-execution-application-v2.js';
import {
  promoteTrustedSerializedPublicToolErrorV2,
  requirePublicLocateTransportValueV2,
} from '../../src/evidence/locate-execution/public-locate-transport-registry-v2.js';
import { createTrustedSerializedPublicToolErrorV2 } from '../../src/evidence/canonical/trusted-serialized-locate-result-v2.js';
import { TRANSPORT_INVALID_INPUT_CODE_V2 } from '../../testkit/fixtures/release-v2/transport-receipt-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');

describe.runIf(
  isSelected({
    group: 'public-beta-release',
    caseId: 'transport-receipt-parity',
  }),
)('F9-TRANSPORT-001 transport-receipt-parity', () => {
  it('rejects receipt/value/capability hostile swaps before exposing JSON', async () => {
    const application = await createRepoNavApplicationContext();
    try {
      const locate = application.get<PublicLocateExecutionApplicationV2>(
        PUBLIC_LOCATE_EXECUTION_APPLICATION_V2,
      );
      const view = await locate.execute(
        { repoPath: root, terms: [] },
        { callerSignal: new AbortController().signal },
      );
      expect(view.value.ok).toBe(false);
      if (view.value.ok) throw new Error('expected INVALID_INPUT');
      expect(view.value.error.code).toBe(TRANSPORT_INVALID_INPUT_CODE_V2);
      expect(JSON.parse(view.compactJson)).toEqual(view.value);

      const a = issueLocateProjectionExecutionCapabilityV2();
      const b = issueLocateProjectionExecutionCapabilityV2();
      const sa = createTrustedSerializedPublicToolErrorV2(
        'INTERNAL_ERROR',
        undefined,
        a,
      );
      const sb = createTrustedSerializedPublicToolErrorV2(
        'INVALID_INPUT',
        'ADD_TERM',
        b,
      );
      const ba = promoteTrustedSerializedPublicToolErrorV2(sa, a);
      const bb = promoteTrustedSerializedPublicToolErrorV2(sb, b);
      expect(() =>
        requirePublicLocateTransportValueV2(ba.value, bb.receipt, a),
      ).toThrow(/PUBLIC_LOCATE_TRANSPORT_INVARIANT/u);
      expect(() =>
        requirePublicLocateTransportValueV2(ba.value, ba.receipt, b),
      ).toThrow(/PUBLIC_LOCATE_TRANSPORT_INVARIANT/u);
    } finally {
      await application.close();
    }
  });
});
