import { describe, expect, it } from 'vitest';

import { bindRawDiscoveryLocatorV2 } from '../../src/evidence/request-snapshot/discovery-lane-universe-v2.js';
import { issueLocateProjectionExecutionCapabilityV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { requireLocateProjectionExecutionTokenV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import {
  decideRepositoryScopeV1,
  pathViewFromPosixPathV1,
  resolveRepositoryScopeV1,
} from '../../src/evidence/scope/index.js';
import {
  PATH_SOURCE_MATRIX_V1,
  SCOPE_PRIORITY_SAMPLES_V1,
} from '../../testkit/fixtures/scope-v1/path-source-matrix-v1.js';
import { recordPlatformAssertionMarker } from '../../testkit/testing/platform-contract.js';
import { isSelected } from '../../testkit/testing/selection.js';

function executionToken() {
  return requireLocateProjectionExecutionTokenV2(
    issueLocateProjectionExecutionCapabilityV2(),
  );
}

describe.runIf(
  isSelected({
    group: 'repository-scope-policy',
    caseId: 'platform-path-flavor-and-priority',
  }),
)('F7-SCOPE-001 platform-path-flavor-and-priority', () => {
  it('asserts native/POSIX flavor and scope priority markers', () => {
    const execution = executionToken();
    const nativeBackslash = bindRawDiscoveryLocatorV2(
      {
        source: 'backend',
        backend: 'ripgrep',
        pathFlavor: 'native',
        rawPath: PATH_SOURCE_MATRIX_V1.windowsNativeBackslash,
      },
      execution,
    );
    if (process.platform === 'win32') {
      expect(nativeBackslash).toBeDefined();
    } else {
      expect(nativeBackslash).toBeUndefined();
    }
    recordPlatformAssertionMarker('F7-SCOPE-001', 'backend-native-path-flavor');

    const scope = resolveRepositoryScopeV1(undefined);
    for (const sample of SCOPE_PRIORITY_SAMPLES_V1) {
      const decision = decideRepositoryScopeV1(
        pathViewFromPosixPathV1(sample.path),
        scope,
      );
      expect(decision.layer).toBe(sample.layer);
    }
    recordPlatformAssertionMarker('F7-SCOPE-001', 'scope-priority');

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
    recordPlatformAssertionMarker('F7-SCOPE-001', 'caller-backslash-rejected');

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
    recordPlatformAssertionMarker('F7-SCOPE-001', 'drive-relative-rejected');
  });
});
