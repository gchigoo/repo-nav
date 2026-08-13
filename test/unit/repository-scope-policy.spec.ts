import { describe, expect, it } from 'vitest';

import { bindRawDiscoveryLocatorV2 } from '../../src/evidence/request-snapshot/discovery-lane-universe-v2.js';
import { issueLocateProjectionExecutionCapabilityV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { requireLocateProjectionExecutionTokenV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import {
  asciiLowercaseCodeUnitsV1,
  createRepositoryScopePolicyV1,
  decideRepositoryScopeV1,
  legacyResolveRepositoryLayerV1,
  pathViewFromPosixPathV1,
  resolveRepositoryLayerV1,
  resolveRepositoryScopeV1,
} from '../../src/evidence/scope/index.js';
import { DOCS_PRIORITY_V1 } from '../../testkit/fixtures/scope-v1/docs-priority-v1.js';
import { EXPLICIT_PREFIX_PRIORITY_V1 } from '../../testkit/fixtures/scope-v1/explicit-prefix-priority-v1.js';
import { ORDINARY_SEGMENT_PRIORITY_V1 } from '../../testkit/fixtures/scope-v1/ordinary-segment-priority-v1.js';
import {
  PATH_SOURCE_MATRIX_V1,
  SCOPE_PRIORITY_SAMPLES_V1,
} from '../../testkit/fixtures/scope-v1/path-source-matrix-v1.js';
import { REQUEST_LAYERS_V1 } from '../../testkit/fixtures/scope-v1/request-layers-v1.js';
import { TEST_PRIORITY_V1 } from '../../testkit/fixtures/scope-v1/test-priority-v1.js';
import { isSelected } from '../../testkit/testing/selection.js';

function executionToken() {
  return requireLocateProjectionExecutionTokenV2(
    issueLocateProjectionExecutionCapabilityV2(),
  );
}

describe.runIf(
  isSelected({
    group: 'repository-scope-policy',
    caseId: 'path-comparison',
  }),
)('F7-PATH-001 path-comparison', () => {
  it('uses ASCII lowercase only and rejects dangerous F3 factory inputs', () => {
    expect(asciiLowercaseCodeUnitsV1('AbC')).toBe('abc');
    expect(asciiLowercaseCodeUnitsV1('İ')).toBe('İ');
    const policy = createRepositoryScopePolicyV1();
    const scope = resolveRepositoryScopeV1(undefined);
    const decision = policy.decide(
      pathViewFromPosixPathV1('Src/Server/A.ts'),
      scope,
    );
    expect(decision.layer).toBe('server');
    expect(decision.rule).toBe('explicit-prefix');

    const execution = executionToken();
    for (const rawPath of PATH_SOURCE_MATRIX_V1.rejectedDriveRelative) {
      expect(
        bindRawDiscoveryLocatorV2(
          {
            source: 'backend',
            backend: 'ripgrep',
            pathFlavor: 'native',
            rawPath,
          },
          execution,
        ),
      ).toBeUndefined();
    }
    for (const rawPath of PATH_SOURCE_MATRIX_V1.rejectedCallerBackslash) {
      expect(
        bindRawDiscoveryLocatorV2(
          {
            source: 'request-anchor',
            pathFlavor: 'posix',
            rawPath,
          },
          execution,
        ),
      ).toBeUndefined();
    }
    for (const rawPath of PATH_SOURCE_MATRIX_V1.acceptedPosix) {
      expect(
        bindRawDiscoveryLocatorV2(
          {
            source: 'request-anchor',
            pathFlavor: 'posix',
            rawPath,
          },
          execution,
        ),
      ).toBeDefined();
    }
    for (const sample of SCOPE_PRIORITY_SAMPLES_V1) {
      const d = decideRepositoryScopeV1(
        pathViewFromPosixPathV1(sample.path),
        scope,
      );
      expect(d.layer).toBe(sample.layer);
      expect(d.rule).toBe(sample.rule);
    }
  });
});

describe.runIf(
  isSelected({
    group: 'repository-scope-policy',
    caseId: 'test-priority',
  }),
)('F7-TEST-001 test-priority', () => {
  it('classifies test segments/basename before docs/prefix', () => {
    const scope = resolveRepositoryScopeV1(['test', 'docs', 'server']);
    for (const row of TEST_PRIORITY_V1) {
      const decision = decideRepositoryScopeV1(
        pathViewFromPosixPathV1(row.path),
        scope,
      );
      expect(decision.layer).toBe(row.layer);
      expect(decision.rule).toBe(row.rule);
      expect(decision.confirmation).toBe('candidate-only');
    }
  });
});

describe.runIf(
  isSelected({
    group: 'repository-scope-policy',
    caseId: 'docs-priority',
  }),
)('F7-DOCS-001 docs-priority', () => {
  it('matches docs segments/extensions without substring mydocs', () => {
    const scope = resolveRepositoryScopeV1(['docs', 'unknown']);
    for (const row of DOCS_PRIORITY_V1) {
      const decision = decideRepositoryScopeV1(
        pathViewFromPosixPathV1(row.path),
        scope,
      );
      expect(decision.layer).toBe(row.layer);
      expect(decision.rule).toBe(row.rule);
    }
  });
});

describe.runIf(
  isSelected({
    group: 'repository-scope-policy',
    caseId: 'explicit-prefix-priority',
  }),
)('F7-PREFIX-001 explicit-prefix-priority', () => {
  it('applies longest root-relative explicit prefixes', () => {
    for (const row of EXPLICIT_PREFIX_PRIORITY_V1) {
      expect(resolveRepositoryLayerV1(row.path)).toBe(row.layer);
    }
  });
});

describe.runIf(
  isSelected({
    group: 'repository-scope-policy',
    caseId: 'ordinary-segment-priority',
  }),
)('F7-SEGMENT-001 ordinary-segment-priority', () => {
  it('uses leftmost ordinary segment after prefix miss', () => {
    for (const row of ORDINARY_SEGMENT_PRIORITY_V1) {
      expect(resolveRepositoryLayerV1(row.path)).toBe(row.layer);
    }
  });
});

describe.runIf(
  isSelected({
    group: 'repository-scope-policy',
    caseId: 'request-scope',
  }),
)('F7-REQUEST-001 request-scope', () => {
  it('canonicalizes requested/effective layers in REPO_LAYERS order', () => {
    expect(resolveRepositoryScopeV1(REQUEST_LAYERS_V1.missing)).toEqual({
      requested: [],
      effective: [...REQUEST_LAYERS_V1.defaultEffective],
      policyVersion: 'repo-scope-v1',
    });
    expect(resolveRepositoryScopeV1([...REQUEST_LAYERS_V1.empty])).toEqual({
      requested: [],
      effective: [...REQUEST_LAYERS_V1.defaultEffective],
      policyVersion: 'repo-scope-v1',
    });
    expect(
      resolveRepositoryScopeV1([...REQUEST_LAYERS_V1.duplicates]).requested,
    ).toEqual(['client', 'server']);
    expect(
      resolveRepositoryScopeV1([...REQUEST_LAYERS_V1.permutation]).requested,
    ).toEqual(['client', 'test', 'unknown']);
    expect(
      resolveRepositoryScopeV1([...REQUEST_LAYERS_V1.all]).requested,
    ).toEqual([...REQUEST_LAYERS_V1.all]);
    // legacy characterization still frozen for top-level cases
    expect(legacyResolveRepositoryLayerV1('server/a.ts')).toBe('server');
  });
});

describe.runIf(
  isSelected({
    group: 'repository-scope-policy',
    caseId: 'priority',
  }),
)('F7 priority contract alias', () => {
  it('keeps full priority order test > docs > prefix > ordinary > unknown', () => {
    expect(resolveRepositoryLayerV1('docs/tests/a.md')).toBe('test');
    expect(resolveRepositoryLayerV1('apps/web/README.md')).toBe('docs');
    expect(resolveRepositoryLayerV1('apps/web/a.ts')).toBe('client');
    expect(resolveRepositoryLayerV1('packages/foo/server/a.ts')).toBe('server');
    expect(resolveRepositoryLayerV1('vendor/a.ts')).toBe('unknown');
  });
});
