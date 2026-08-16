import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  LOCATE_EXECUTION_FACT_FAMILIES_V2,
  createLocateExecutionFactsV2,
} from '../../src/contracts/v2/locate-execution-facts-v2.js';
import { finalizeLocateResultV2 } from '../../src/evidence/locate-execution/finalize-locate-result-v2.js';
import { V2LocateResultProjector } from '../../src/evidence/locate-execution/v2-locate-result-projector.js';
import { issueLocateProjectionExecutionCapabilityV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import {
  LOCATE_EXECUTION_DEFAULT_RESOLVED_LIMITS_V2,
  locateExecutionFinalizerInputFromUnsafePublicSourceV2,
} from '../../testkit/fixtures/locate-execution-v2/finalizer-facts-v2.js';
import { createUnsafeLocateSuccessV2 } from '../../testkit/fixtures/public-output-v2/synthetic-locate-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');

type DeepMutableV2<T> = T extends object
  ? { -readonly [K in keyof T]: DeepMutableV2<T[K]> }
  : T;

function mutableUnsafeSourceV2(): DeepMutableV2<
  ReturnType<typeof createUnsafeLocateSuccessV2>
> {
  return structuredClone(createUnsafeLocateSuccessV2()) as DeepMutableV2<
    ReturnType<typeof createUnsafeLocateSuccessV2>
  >;
}

function selected(group: string, caseId: string): boolean {
  return isSelected({ group, caseId });
}

function safeInputV2() {
  return locateExecutionFinalizerInputFromUnsafePublicSourceV2(
    createUnsafeLocateSuccessV2(),
    LOCATE_EXECUTION_DEFAULT_RESOLVED_LIMITS_V2,
  );
}

describe.runIf(selected('canonical-locate-bridge', 'canonical-fact-contract'))(
  'canonical locate fact contract',
  () => {
    it('contains exactly six immutable raw fact families', () => {
      expect(LOCATE_EXECUTION_FACT_FAMILIES_V2).toEqual([
        'backend',
        'snapshot',
        'ranking',
        'scope',
        'capability',
        'abort',
      ]);
      const input = safeInputV2();
      if (!input.ok) throw new Error('Expected success facts.');
      expect(Object.keys(input.facts).sort()).toEqual(
        [...LOCATE_EXECUTION_FACT_FAMILIES_V2].sort(),
      );
      expect(Object.isFrozen(input.facts)).toBe(true);
      expect(JSON.stringify(input.facts)).not.toMatch(
        /(?:strategyComplete|fallbackChecked|nextActions|schemaVersion|status)/u,
      );
    });

    it('rejects output-owned fields in the fact builder', () => {
      const input = safeInputV2();
      if (!input.ok) throw new Error('Expected success facts.');
      expect(() =>
        createLocateExecutionFactsV2({
          ...input.facts,
          status: 'ok',
        } as never),
      ).toThrow(/unsupported field/u);
    });
  },
);

describe.runIf(
  selected('canonical-locate-bridge', 'canonical-materialization-seam'),
)('canonical locate materialization', () => {
  it('materializes redaction, IDs, schema and bytes in one pure finalizer', () => {
    const raw = mutableUnsafeSourceV2();
    if (!raw.ok) throw new Error('Expected success fixture.');
    raw.evidence.normalizedTerms[0]!.value = 'password=bridge-do-not-publish';
    raw.evidence.confirmed[0]!.location.file =
      'src/bridge-do-not-publish/config.ts';
    raw.evidence.confirmed[0]!.location.excerpt =
      'password=bridge-do-not-publish';
    const transport = finalizeLocateResultV2(
      locateExecutionFinalizerInputFromUnsafePublicSourceV2(raw),
    );
    expect(transport.value.ok).toBe(true);
    expect(transport.compactJson).toBe(JSON.stringify(transport.value));
    expect(transport.utf8Bytes).toBe(
      Buffer.byteLength(transport.compactJson, 'utf8'),
    );
    expect(transport.compactJson).not.toContain('bridge-do-not-publish');
  });
});

describe.runIf(
  selected('canonical-locate-bridge', 'canonical-real-shadow-no-cutover'),
)('canonical production authority cutover', () => {
  it('removes the obsolete shadow orchestrator source', () => {
    expect(
      existsSync(
        resolve(
          repositoryRoot,
          'src/evidence/canonical/accepted-complete-real-locate-shadow-orchestrator-v2.ts',
        ),
      ),
    ).toBe(false);
  });
});

describe.runIf(
  selected('canonical-locate-bridge', 'canonical-required-owner-finalizer'),
)('canonical required owner finalizer', () => {
  it('derives public decisions without a separate owner registry', () => {
    const result = finalizeLocateResultV2(safeInputV2()).value;
    if (!result.ok) throw new Error('Expected finalizer success.');
    expect(result.evidence.status).toBe('ok');
    expect(result.evidence.coverage.strategyComplete).toBe(true);
    expect(result.evidence.nextActions).toEqual([]);
  });
});

describe.runIf(
  selected(
    'canonical-locate-bridge',
    'canonical-synthetic-shadow-serialization',
  ),
)('canonical flat serialization', () => {
  it('returns an immutable value/json/byte tuple without identity receipts', () => {
    const transport = finalizeLocateResultV2(safeInputV2());
    expect(Object.isFrozen(transport)).toBe(true);
    expect(Object.isFrozen(transport.value)).toBe(true);
    expect(Object.keys(transport).sort()).toEqual([
      'compactJson',
      'utf8Bytes',
      'value',
    ]);
  });
});

describe.runIf(selected('input-abort-contract-v2', 'outcome-proof'))(
  'canonical outcome facts',
  () => {
    it('fails closed when finalizer facts are malformed', () => {
      const input = safeInputV2();
      if (!input.ok) throw new Error('Expected success facts.');
      const result = finalizeLocateResultV2({
        ...input,
        facts: { ...input.facts, backend: { attempts: [] } },
      } as never).value;
      expect(result).toEqual({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Repository evidence request failed.',
          recoverable: false,
        },
      });
    });
  },
);

describe.runIf(selected('language-capability-boundary', 'capability-proof'))(
  'canonical execution capability',
  () => {
    it('rejects a canonical input under a different projection capability', () => {
      const projector = new V2LocateResultProjector();
      const input = safeInputV2();
      const result = projector.project(
        { input, authority: Object.freeze({}) } as never,
        issueLocateProjectionExecutionCapabilityV2(),
      );
      expect(result.value).toMatchObject({
        ok: false,
        error: { code: 'INTERNAL_ERROR' },
      });
    });
  },
);

describe.runIf(selected('request-snapshot-cache', 'snapshot-trust-finalizer'))(
  'snapshot facts finalization',
  () => {
    it('derives snapshot mutation degradation from snapshot facts', () => {
      const raw = mutableUnsafeSourceV2();
      if (!raw.ok) throw new Error('Expected success fixture.');
      raw.evidence.coverage.snapshot.consistency = 'changed';
      raw.evidence.coverage.exclusionSummary = { SNAPSHOT_CHANGED: 1 };
      const result = finalizeLocateResultV2(
        locateExecutionFinalizerInputFromUnsafePublicSourceV2(raw),
      ).value;
      if (!result.ok) throw new Error('Expected finalizer success.');
      expect(result.evidence.status).toBe('partial');
      expect(result.evidence.coverage.degradations).toContain(
        'SNAPSHOT_CHANGED',
      );
      expect(result.evidence.coverage.exclusionSummary.SNAPSHOT_CHANGED).toBe(
        1,
      );
    });
  },
);
