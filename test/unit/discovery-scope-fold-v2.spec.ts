import { describe, expect, it } from 'vitest';

import {
  bindRawDiscoveryLocatorV2,
  projectExpandedSafePreCapPoolV2,
} from '../../src/evidence/request-snapshot/discovery-lane-universe-v2.js';
import {
  DISCOVERY_RESERVATION_CAP_V2,
} from '../../src/evidence/request-snapshot/discovery-reservation-v2.js';
import {
  registerLegacySelectedPathV2,
  readLegacySelectedPathForTestV2,
  sealTrustedLegacySelectedPathPoolV2,
  selectAndFreezeLegacyBackendHitsV1,
} from '../../src/evidence/request-snapshot/legacy-scope-policy-pool-v1.js';
import {
  readScopeFoldedSelectorFactsV2,
  scopeFoldSafeCandidatePoolV2,
} from '../../src/evidence/request-snapshot/scope-folded-discovery-selector-v2.js';
import { issueLocateProjectionExecutionCapabilityV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { requireLocateProjectionExecutionTokenV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import {
  createLegacyHitV2,
  createLegacySearchResultV2,
} from '../../testkit/fixtures/request-snapshot-v2/legacy-scope-policy-pool-v2.js';
import {
  SCOPE_FOLD_EXCLUDED_DECISION_V2,
  SCOPE_FOLD_INCLUDED_DECISION_V2,
  SCOPE_FOLD_SAFE_FILE_V2,
} from '../../testkit/fixtures/request-snapshot-v2/scope-pre-cap-fold-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

function createExecutionToken() {
  const capability = issueLocateProjectionExecutionCapabilityV2();
  return requireLocateProjectionExecutionTokenV2(capability);
}

const scopeSelected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'scope-pre-cap-fold',
});

const legacySelected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'legacy-scope-policy-pool',
});

describe.runIf(scopeSelected)('F3-SCOPE-FOLD-001 scope-pre-cap-fold', () => {
  it('folds complete-safe groups and excludes without consuming the 800 cap', () => {
    const execution = createExecutionToken();
    const includedInputs = [];
    for (let index = 0; index < 3; index += 1) {
      const locatorRef = bindRawDiscoveryLocatorV2(
        {
          source: 'backend',
          backend: 'ripgrep',
          pathFlavor: 'native',
          rawPath: `${SCOPE_FOLD_SAFE_FILE_V2.replace('.ts', '')}-${index}.ts`,
        },
        execution,
      );
      expect(locatorRef).toBeDefined();
      includedInputs.push({
        locatorRef: locatorRef!,
        safeFile: `safe-${index}.ts`,
        safeSymbol: '',
        lineStart: 1,
        lineEnd: 1,
        source: 'ripgrep' as const,
      });
    }

    const excludedRef = bindRawDiscoveryLocatorV2(
      {
        source: 'backend',
        backend: 'ripgrep',
        pathFlavor: 'native',
        rawPath: 'docs/excluded.md',
      },
      execution,
    );
    expect(excludedRef).toBeDefined();
    includedInputs.push({
      locatorRef: excludedRef!,
      safeFile: 'docs/excluded.md',
      safeSymbol: '',
      lineStart: 1,
      lineEnd: 1,
      source: 'ripgrep' as const,
    });

    const preCap = projectExpandedSafePreCapPoolV2(
      includedInputs,
      true,
      execution,
    );
    const decisions = [
      ...includedInputs.slice(0, 3).map((input) =>
        Object.freeze({
          locatorRef: input.locatorRef,
          decision: SCOPE_FOLD_INCLUDED_DECISION_V2,
        }),
      ),
      Object.freeze({
        locatorRef: excludedRef!,
        decision: SCOPE_FOLD_EXCLUDED_DECISION_V2,
      }),
    ];

    const view = scopeFoldSafeCandidatePoolV2(preCap, decisions, execution);
    const facts = readScopeFoldedSelectorFactsV2(view, execution);
    expect(facts.candidates).toHaveLength(3);
    expect(facts.excludedLedger).toHaveLength(1);
    expect(facts.candidates.length).toBeLessThanOrEqual(
      DISCOVERY_RESERVATION_CAP_V2,
    );
    expect(facts.complete).toBe(true);

    // incomplete raw → empty safe pre-cap
    const incomplete = projectExpandedSafePreCapPoolV2(
      includedInputs,
      false,
      execution,
    );
    expect(incomplete.candidates).toEqual([]);
    expect(incomplete.complete).toBe(false);
  });

  it('applies fixed 800 cap atomically on safe groups', () => {
    const execution = createExecutionToken();
    const inputs = [];
    for (let index = 0; index < DISCOVERY_RESERVATION_CAP_V2 + 2; index += 1) {
      const locatorRef = bindRawDiscoveryLocatorV2(
        {
          source: 'backend',
          backend: 'codegraph',
          pathFlavor: 'native',
          rawPath: `server/cap-${index}.ts`,
        },
        execution,
      );
      inputs.push({
        locatorRef: locatorRef!,
        safeFile: `cap-${index}.ts`,
        safeSymbol: '',
        lineStart: 1,
        lineEnd: 1,
        source: 'codegraph' as const,
      });
    }
    const preCap = projectExpandedSafePreCapPoolV2(inputs, true, execution);
    const decisions = inputs.map((input) =>
      Object.freeze({
        locatorRef: input.locatorRef,
        decision: SCOPE_FOLD_INCLUDED_DECISION_V2,
      }),
    );
    const facts = readScopeFoldedSelectorFactsV2(
      scopeFoldSafeCandidatePoolV2(preCap, decisions, execution),
      execution,
    );
    expect(facts.candidates).toHaveLength(DISCOVERY_RESERVATION_CAP_V2);
    expect(facts.filesTruncated).toBe(true);
  });
});

describe.runIf(legacySelected)(
  'F3-LEGACY-POOL-001 legacy-scope-policy-pool',
  () => {
    it('freezes selectedCount proof and seals 0/N receipt pools', () => {
      const execution = createExecutionToken();
      const empty = selectAndFreezeLegacyBackendHitsV1([], 8, execution);
      expect(empty.selectedCount).toBe(0);
      expect(empty.selectedCount).toBe(empty.result.hits.length);
      expect(Object.keys(empty.proof)).toEqual([]);
      const emptyPool = sealTrustedLegacySelectedPathPoolV2(
        empty.proof,
        [],
        execution,
      );
      expect(emptyPool).toBeDefined();

      const hits = [
        createLegacyHitV2('server/a.ts', 1),
        createLegacyHitV2('server/b.ts', 2),
        createLegacyHitV2('server/c.ts', 3),
        createLegacyHitV2('server/a.ts', 4),
      ];
      const frozen = selectAndFreezeLegacyBackendHitsV1(
        [createLegacySearchResultV2(hits)],
        2,
        execution,
      );
      expect(frozen.selectedCount).toBe(frozen.result.hits.length);
      expect(frozen.result.filesTruncated).toBe(true);
      expect(frozen.selectedCount).toBeGreaterThan(0);
      const receipts = Array.from(
        { length: frozen.selectedCount },
        (_, ordinal) =>
          registerLegacySelectedPathV2(frozen.proof, ordinal, execution),
      );
      const pool = sealTrustedLegacySelectedPathPoolV2(
        frozen.proof,
        receipts,
        execution,
      );
      expect(readLegacySelectedPathForTestV2(pool, 0)).toBe('server/a.ts');

      expect(() =>
        sealTrustedLegacySelectedPathPoolV2(
          frozen.proof,
          receipts.slice(0, 1),
          execution,
        ),
      ).toThrow(/selectedCount|receipt count/i);

      expect(() =>
        registerLegacySelectedPathV2(frozen.proof, 0, createExecutionToken()),
      ).toThrow(/trusted|execution/i);
    });
  },
);
