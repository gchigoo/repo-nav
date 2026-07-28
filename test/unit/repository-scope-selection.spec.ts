import { describe, expect, it } from 'vitest';

import {
  bindRawDiscoveryLocatorV2,
  projectExpandedSafePreCapPoolV2,
} from '../../src/evidence/request-snapshot/discovery-lane-universe-v2.js';
import {
  readScopeFoldedSelectorFactsV2,
  scopeFoldSafeCandidatePoolV2,
  type ScopeFoldCandidateDecisionV2,
} from '../../src/evidence/request-snapshot/scope-folded-discovery-selector-v2.js';
import {
  createTrustedRepositoryScopePolicyAdapterV1,
  observeTrustedScopeEligibilityV2,
} from '../../src/evidence/request-snapshot/trusted-scope-policy-adapter-v2.js';
import { DiscoveryHitSelectorV2 } from '../../src/evidence/ranking/discovery-hit-selector-v2.js';
import { encodeAnchorComparisonKeyV2 } from '../../src/evidence/ranking/anchor-intent-normalizer-v2.js';
import { DISCOVERY_RESERVATION_CAP_V2 } from '../../src/evidence/request-snapshot/discovery-reservation-v2.js';
import { issueLocateProjectionExecutionCapabilityV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { requireLocateProjectionExecutionTokenV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import {
  createRepositoryScopePolicyV1,
  resolveRepositoryScopeV1,
} from '../../src/evidence/scope/index.js';
import { EXPANDED_LEGACY_SELECTION_V1 } from '../../testkit/fixtures/scope-v1/expanded-legacy-selection-v1.js';
import { SAFE_GROUP_FOLD_V1 } from '../../testkit/fixtures/scope-v1/safe-group-fold-v1.js';
import { isSelected } from '../../testkit/testing/selection.js';

function executionToken() {
  return requireLocateProjectionExecutionTokenV2(
    issueLocateProjectionExecutionCapabilityV2(),
  );
}

describe.runIf(
  isSelected({
    group: 'repository-scope-policy',
    caseId: 'pre-budget-selection',
  }),
)('F7-SELECT-001 pre-budget-selection', () => {
  it('folds scope before fixed 800 and maxFiles, keeping in-scope server', () => {
    expect(DISCOVERY_RESERVATION_CAP_V2).toBe(800);
    const execution = executionToken();
    const inputs = [];
    for (let index = 0; index < 12; index += 1) {
      const rawPath = `${EXPANDED_LEGACY_SELECTION_V1.excludedDocsPrefix}${index}.md`;
      const locatorRef = bindRawDiscoveryLocatorV2(
        {
          source: 'backend',
          backend: 'ripgrep',
          pathFlavor: 'native',
          rawPath,
        },
        execution,
      );
      expect(locatorRef).toBeDefined();
      inputs.push({
        locatorRef: locatorRef!,
        safeFile: rawPath,
        safeSymbol: '',
        lineStart: 1,
        lineEnd: 1,
        source: 'ripgrep' as const,
      });
    }
    const serverRef = bindRawDiscoveryLocatorV2(
      {
        source: 'backend',
        backend: 'ripgrep',
        pathFlavor: 'native',
        rawPath: EXPANDED_LEGACY_SELECTION_V1.inScopeServerFile,
      },
      execution,
    );
    expect(serverRef).toBeDefined();
    inputs.push({
      locatorRef: serverRef!,
      safeFile: 'safe-server.ts',
      safeSymbol: '',
      lineStart: 1,
      lineEnd: 1,
      source: 'ripgrep' as const,
      matchedAnchorKeys: Object.freeze([
        encodeAnchorComparisonKeyV2('file', true, 'safe-server.ts'),
      ]),
    });

    const preCap = projectExpandedSafePreCapPoolV2(inputs, true, execution);
    const adapter = createTrustedRepositoryScopePolicyAdapterV1(
      createRepositoryScopePolicyV1(),
      execution,
    );
    const observation = observeTrustedScopeEligibilityV2({
      adapter,
      preCapPool: preCap,
      resolvedScope: resolveRepositoryScopeV1(undefined),
      execution,
    });
    const folded = scopeFoldSafeCandidatePoolV2(preCap, observation, execution);
    const facts = readScopeFoldedSelectorFactsV2(folded, execution);
    expect(facts.excludedLedger.length).toBe(12);
    expect(facts.candidates.some((c) => c.locatorRef === serverRef)).toBe(true);

    const anchorKey = encodeAnchorComparisonKeyV2('file', true, 'safe-server.ts');
    const draft = new DiscoveryHitSelectorV2().select(
      folded,
      [
        Object.freeze({
          requestIndex: 0,
          kind: 'file' as const,
          value: 'safe-server.ts',
          comparisonValue: 'safe-server.ts',
          caseSensitive: true,
          canonicalKey: anchorKey,
        }),
      ],
      EXPANDED_LEGACY_SELECTION_V1.maxFilesOne,
      execution,
    );
    expect(draft.draft.selectedLocatorRefs).toContain(serverRef);
  });
});

describe.runIf(
  isSelected({
    group: 'repository-scope-policy',
    caseId: 'safe-key-collision',
  }),
)('F7-COLLISION-001 safe-key-collision', () => {
  it('applies four-row atomic fold truth table for safe-key groups', () => {
    const execution = executionToken();
    const includedRef = bindRawDiscoveryLocatorV2(
      {
        source: 'backend',
        backend: 'ripgrep',
        pathFlavor: 'native',
        rawPath: 'src/server/a.ts',
      },
      execution,
    );
    const excludedRef = bindRawDiscoveryLocatorV2(
      {
        source: 'backend',
        backend: 'ripgrep',
        pathFlavor: 'native',
        rawPath: 'docs/a.md',
      },
      execution,
    );
    expect(includedRef).toBeDefined();
    expect(excludedRef).toBeDefined();

    // 同 safe file/lines/symbol/source 才构成同一 fold group
    const sharedSafe = SAFE_GROUP_FOLD_V1.includedSafeFile;
    const preCap = projectExpandedSafePreCapPoolV2(
      [
        {
          locatorRef: includedRef!,
          safeFile: sharedSafe,
          safeSymbol: '',
          lineStart: 1,
          lineEnd: 1,
          source: 'ripgrep',
        },
        {
          locatorRef: excludedRef!,
          safeFile: sharedSafe,
          safeSymbol: '',
          lineStart: 1,
          lineEnd: 1,
          source: 'ripgrep',
        },
      ],
      true,
      execution,
    );
    const decisions = Object.freeze([
      Object.freeze({
        locatorRef: includedRef!,
        decision: Object.freeze({
          layer: 'server',
          included: true,
          confirmation: 'allowed' as const,
        }),
      }),
      Object.freeze({
        locatorRef: excludedRef!,
        decision: Object.freeze({
          layer: 'docs',
          included: false,
          confirmation: 'excluded' as const,
        }),
      }),
    ]) satisfies readonly ScopeFoldCandidateDecisionV2[];
    const folded = scopeFoldSafeCandidatePoolV2(preCap, decisions, execution);
    const facts = readScopeFoldedSelectorFactsV2(folded, execution);
    expect(facts.candidates).toHaveLength(0);
    expect(facts.safeSelectionCollision).toBe(true);
    expect(facts.excludedLedger.map((e) => e.locatorRef)).toEqual([excludedRef]);

    const mixedConfirmation = scopeFoldSafeCandidatePoolV2(
      preCap,
      Object.freeze([
        Object.freeze({
          locatorRef: includedRef!,
          decision: Object.freeze({
            layer: 'server',
            included: true,
            confirmation: 'allowed' as const,
          }),
        }),
        Object.freeze({
          locatorRef: excludedRef!,
          decision: Object.freeze({
            layer: 'test',
            included: true,
            confirmation: 'candidate-only' as const,
          }),
        }),
      ]),
      execution,
    );
    const mixedFacts = readScopeFoldedSelectorFactsV2(
      mixedConfirmation,
      execution,
    );
    expect(mixedFacts.candidates).toHaveLength(0);
    expect(mixedFacts.excludedLedger).toHaveLength(0);
    expect(mixedFacts.safeSelectionCollision).toBe(true);
  });
});
