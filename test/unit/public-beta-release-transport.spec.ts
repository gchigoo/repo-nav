import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createRepoNavApplicationContext } from '../../src/app/create-application-context.js';
import {
  PUBLIC_LOCATE_EXECUTION_APPLICATION_V2,
  type PublicLocateExecutionApplicationV2,
} from '../../src/evidence/locate-execution/public-locate-execution-application-v2.js';
import {
  TRANSPORT_INVALID_INPUT_CODE_V2,
  TRANSPORT_VALUE_KEYS_V2,
} from '../../testkit/fixtures/release-v2/transport-receipt-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const root = resolve(import.meta.dirname, '../..');

describe.runIf(
  isSelected({
    group: 'public-beta-release',
    caseId: 'transport-receipt-parity',
  }),
)('F9-TRANSPORT-001 flat transport parity', () => {
  it('returns one immutable value/json/byte tuple without identity receipts', async () => {
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
      expect(view.utf8Bytes).toBe(Buffer.byteLength(view.compactJson, 'utf8'));
      expect(Object.keys(view).sort()).toEqual(TRANSPORT_VALUE_KEYS_V2);
      expect(Object.isFrozen(view)).toBe(true);
      expect(Object.isFrozen(view.value)).toBe(true);
      expect('receipt' in view).toBe(false);
    } finally {
      await application.close();
    }
  });
});
