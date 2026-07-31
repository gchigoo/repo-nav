import { describe, expect, it } from 'vitest';

import { RipgrepJsonLineConsumerV2 } from '../../src/repository/ripgrep-stream/index.js';
import { RipgrepProtocolFsmV2 } from '../../src/repository/ripgrep-stream/ripgrep-protocol-fsm-v2.js';
import {
  malformedEmptyLineV2,
  malformedInvalidUtf8V2,
  malformedUnknownEventV2,
  malformedUnterminatedV2,
} from '../../testkit/fixtures/ripgrep/malformed-stream-v2.js';
import {
  emptyScopeStreamV2,
  validProtocolStreamV2,
} from '../../testkit/fixtures/ripgrep/protocol-fsm-v2.js';
import {
  buildMatchStreamV2,
  partitionBytesV2,
} from '../../testkit/fixtures/ripgrep/stream-partitions-v2.js';
import {
  platformContractIt,
  recordPlatformAssertionMarker,
} from '../../testkit/testing/platform-contract.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'json-line-partitions',
  }) ||
    isSelected({
      group: 'streaming-ripgrep',
      caseId: 'ripgrep-json-stream-protocol',
    }),
)('F5-STREAM-001 partitions', () => {
  platformContractIt(
    'F5-RG-001',
    'crlf-partition-stable',
    'chunk partitions yield identical matches',
    () => {
      const bytes = buildMatchStreamV2();
      const partitions = [
        partitionBytesV2(bytes, [bytes.byteLength]),
        partitionBytesV2(bytes, [1, 1, 1, 1, 1, 1, 1, 1]),
        partitionBytesV2(bytes, [3, 5, 7, 11, 13]),
      ];
      const hashes: string[] = [];
      for (const parts of partitions) {
        const consumer = new RipgrepJsonLineConsumerV2({ allowContext: false });
        for (const part of parts) {
          const decision = consumer.push(part);
          expect(decision.action).toBe('continue');
        }
        const finished = consumer.finish();
        expect(finished.ok).toBe(true);
        if (finished.ok) {
          hashes.push(JSON.stringify(finished.value.matches));
        }
      }
      expect(new Set(hashes).size).toBe(1);
      recordPlatformAssertionMarker('F5-RG-001', 'summary-fsm-complete');
    },
  );
});

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'json-line-invalid',
  }),
)('F5-STREAM-002 invalid streams', () => {
  it('fail-closes empty/unknown/utf8/unterminated', () => {
    for (const bytes of [
      malformedEmptyLineV2(),
      malformedUnknownEventV2(),
      malformedInvalidUtf8V2(),
    ]) {
      const consumer = new RipgrepJsonLineConsumerV2({ allowContext: false });
      const decision = consumer.push(bytes);
      expect(decision.action).toBe('stop');
      const partial = consumer.partial();
      expect(partial.ok).toBe(false);
    }
    const unterminated = new RipgrepJsonLineConsumerV2({ allowContext: false });
    unterminated.push(malformedUnterminatedV2());
    expect(unterminated.finish().ok).toBe(false);
  });
});

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'protocol-fsm-and-offsets',
  }) ||
    isSelected({
      group: 'streaming-ripgrep',
      caseId: 'ripgrep-json-stream-protocol',
    }),
)('F5-STREAM-003 protocol FSM', () => {
  platformContractIt(
    'F5-RG-001',
    'offset-slice-valid',
    'valid protocol accepts and empty scope rejects',
    () => {
      const fsm = new RipgrepProtocolFsmV2({ allowContext: false });
      for (const line of validProtocolStreamV2().split('\n')) {
        if (line.length === 0) continue;
        expect(fsm.pushJsonLine(line).kind).toBe('ok');
      }
      expect(fsm.finish().kind).toBe('ok');

      const empty = new RipgrepProtocolFsmV2({ allowContext: false });
      for (const line of emptyScopeStreamV2().split('\n')) {
        if (line.length === 0) continue;
        const pushed = empty.pushJsonLine(line);
        if (pushed.kind === 'invalid') {
          expect(pushed.kind).toBe('invalid');
          break;
        }
      }
      recordPlatformAssertionMarker('F5-RG-001', 'exit-summary-joint-valid');
    },
  );
});
