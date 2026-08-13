import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type {
  BackendHealth,
  BackendSearchRequest,
  BackendSearchResult,
  RepositorySearchBackend,
} from '../../src/contracts/index.js';
import { CanonicalRepositoryLocateExecutorV2 } from '../../src/evidence/locate-execution/canonical-locate-executor-v2.js';
import {
  issueLocateProjectionExecutionCapabilityV2,
  requireLocateProjectionExecutionTokenV2,
} from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { DISCOVERY_RESERVATION_CAP_V2 } from '../../src/evidence/request-snapshot/discovery-reservation-v2.js';
import { readDualLaneExecutionReceiptV2 } from '../../src/evidence/request-snapshot/dual-lane-execution-receipt-v2.js';
import {
  deriveLaneBackendResultV2,
  resolveSharedSearchMaxHitsV2,
  searchBackendMultiViewV2,
} from '../../src/evidence/request-snapshot/pre-f5-multi-view-search-v2.js';
import { createMultiViewBackendSearchRequestV2 } from '../../src/evidence/request-snapshot/discovery-reservation-v2.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { createBackendExecutionContextV2 } from '../../src/process/backend-execution-context-v2.js';
import { createProcessOpaqueTokenV2 } from '../../src/process/opaque-token-v2.js';
import type { LocateExecutionTokenV2 } from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import { asTraceableSearchBackendsV2 } from '../../testkit/testing/create-canonical-locate-engine-harness-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'executor-dual-lane-wiring',
});

class CapturingBackend implements RepositorySearchBackend {
  public readonly id = 'ripgrep' as const;
  public lastMaxHits: number | undefined;
  public searchCount = 0;

  public async probe(): Promise<BackendHealth> {
    return { state: 'available' };
  }

  public async search(
    request: BackendSearchRequest,
  ): Promise<BackendSearchResult> {
    this.searchCount += 1;
    this.lastMaxHits = request.maxHits;
    const hits = Array.from(
      { length: Math.min(12, request.maxHits) },
      (_, index) =>
        Object.freeze({
          file: `server/file-${index}.ts`,
          lines: Object.freeze([1, 1] as [number, number]),
          matchedText: `const token${index} = row.token_${index};`,
          source: 'ripgrep' as const,
          reasonCodes: Object.freeze(['LITERAL_TERM_HIT' as const]),
        }),
    );
    return {
      health: { state: 'available' },
      hits: Object.freeze(hits),
      complete: true,
    };
  }
}

describe.runIf(selected)('F3-DISCOVERY-001 executor-dual-lane-wiring', () => {
  it('consumes expandedMaxHits=800 via shared search and runs scope fold + legacy reservation', async () => {
    expect(resolveSharedSearchMaxHitsV2(40, DISCOVERY_RESERVATION_CAP_V2)).toBe(
      DISCOVERY_RESERVATION_CAP_V2,
    );

    const capturing = new CapturingBackend();
    const multiView = createMultiViewBackendSearchRequestV2(
      {
        repositoryRoot: '/tmp/unused',
        terms: Object.freeze([{ value: 'token', caseSensitive: false }]),
        anchors: Object.freeze([]),
        negativeTerms: Object.freeze([]),
        layers: Object.freeze(['server']),
      },
      40,
    );
    expect(multiView.expandedMaxHits).toBe(DISCOVERY_RESERVATION_CAP_V2);
    const signal = new AbortController().signal;
    const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
    const context = createBackendExecutionContextV2(
      new NodeSafeProcessRunner(),
      undefined,
      signal,
      execution,
    );
    const lanes = await searchBackendMultiViewV2(
      asTraceableSearchBackendsV2([capturing])[0]!,
      multiView,
      signal,
      context,
      execution,
    );
    expect(capturing.searchCount).toBe(1);
    expect(capturing.lastMaxHits).toBe(DISCOVERY_RESERVATION_CAP_V2);
    expect(lanes.sharedSearchMaxHits).toBe(DISCOVERY_RESERVATION_CAP_V2);
    expect(lanes.legacy.hits.length).toBeLessThanOrEqual(40);
    expect(lanes.expanded.hits.length).toBeLessThanOrEqual(
      DISCOVERY_RESERVATION_CAP_V2,
    );
    expect(deriveLaneBackendResultV2(lanes.expanded, 3).hits).toHaveLength(3);

    const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-dual-lane-'));
    try {
      for (let index = 0; index < 4; index += 1) {
        const relative = `server/file-${index}.ts`;
        const absolute = resolve(workspace, relative);
        mkdirSync(dirname(absolute), { recursive: true });
        writeFileSync(
          absolute,
          `const token${index} = row.token_${index};\n`,
          'utf8',
        );
      }
      const backend = new CapturingBackend();
      const capability = issueLocateProjectionExecutionCapabilityV2();
      const execution = requireLocateProjectionExecutionTokenV2(capability);
      const executor = new CanonicalRepositoryLocateExecutorV2(
        asTraceableSearchBackendsV2([backend]),
        new NodeRepositoryReader(),
      );
      const result = await executor.execute(
        {
          repoPath: workspace,
          question: 'dual lane wiring',
          terms: ['token0', 'row.token_0'],
          termCase: 'sensitive',
          layers: ['server'],
        },
        { signal: new AbortController().signal },
        capability,
      );
      expect(result.ok).toBe(true);
      expect(backend.lastMaxHits).toBe(DISCOVERY_RESERVATION_CAP_V2);
      const receipt = readDualLaneExecutionReceiptV2(execution);
      expect(receipt).toBeDefined();
      expect(receipt?.sharedSearchMaxHits).toBe(DISCOVERY_RESERVATION_CAP_V2);
      expect(receipt?.expandedMaxHits).toBe(DISCOVERY_RESERVATION_CAP_V2);
      expect(receipt?.scopeFoldInvoked).toBe(true);
      expect(receipt?.usedLegacyCandidateReservation).toBe(true);
      expect(receipt?.scopeFoldCandidateCount).toBeGreaterThanOrEqual(0);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
