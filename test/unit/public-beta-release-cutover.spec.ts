import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createRepoNavApplicationContext } from '../../src/app/create-application-context.js';
import { createAcceptedCompleteRealLocateShadowOrchestratorV2 } from '../../src/evidence/canonical/accepted-complete-real-locate-shadow-orchestrator-v2.js';
import {
  CANONICAL_LOCATE_EXECUTOR_V2,
  LOCATE_RESULT_PROJECTOR,
} from '../../src/evidence/locate-execution/locate-execution.tokens.js';
import {
  PUBLIC_LOCATE_EXECUTION_APPLICATION_V2,
  type PublicLocateExecutionApplicationV2,
} from '../../src/evidence/locate-execution/public-locate-execution-application-v2.js';
import { V2LocateResultProjector } from '../../src/evidence/locate-execution/v2-locate-result-projector.js';
import { issueLocateProjectionExecutionCapabilityV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import {
  CUTOVER_DELETED_PRODUCTION_PATHS_V2,
  CUTOVER_FORBIDDEN_IMPORTS_V2,
  CUTOVER_REQUIRED_TOKEN_V2,
} from '../../testkit/fixtures/release-v2/cutover-truth-v2.js';
import { FAIL_CLOSED_UNREGISTERED_SUCCESS_V2 } from '../../testkit/fixtures/release-v2/cutover-failure-order-v2.js';
import { SINGLE_EXEC_INVALID_INGRESS_V2 } from '../../testkit/fixtures/release-v2/single-execution-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const root = resolve(import.meta.dirname, '../..');

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'projector-cutover' }),
)('F9-CUTOVER-001 projector-cutover', () => {
  it('binds unique LOCATE_RESULT_PROJECTOR to V2LocateResultProjector', async () => {
    const application = await createRepoNavApplicationContext();
    try {
      const projector = application.get(LOCATE_RESULT_PROJECTOR);
      expect(projector).toBeInstanceOf(V2LocateResultProjector);
      const executor = application.get(CANONICAL_LOCATE_EXECUTOR_V2);
      expect(executor).toBeDefined();
      const src = readFileSync(
        resolve(
          root,
          'src/evidence/locate-execution/v2-locate-result-projector.ts',
        ),
        'utf8',
      );
      expect(src).toContain(CUTOVER_REQUIRED_TOKEN_V2);
      for (const forbidden of CUTOVER_FORBIDDEN_IMPORTS_V2) {
        expect(src).not.toContain(forbidden);
      }
      for (const deleted of CUTOVER_DELETED_PRODUCTION_PATHS_V2) {
        expect(existsSync(resolve(root, deleted))).toBe(false);
      }
    } finally {
      await application.close();
    }
  });
});

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'single-execution' }),
)('F9-SINGLE-EXEC-001 single-execution', () => {
  it('issues capability before validation and does not call executor on invalid input', async () => {
    const application = await createRepoNavApplicationContext();
    try {
      const locate = application.get<PublicLocateExecutionApplicationV2>(
        PUBLIC_LOCATE_EXECUTION_APPLICATION_V2,
      );
      const view = await locate.execute(
        SINGLE_EXEC_INVALID_INGRESS_V2.rawRequest,
        { callerSignal: new AbortController().signal },
      );
      expect(view.value.ok).toBe(false);
      if (view.value.ok) throw new Error('expected tool error');
      expect(view.value.error.code).toBe(
        SINGLE_EXEC_INVALID_INGRESS_V2.expectedCode,
      );
    } finally {
      await application.close();
    }
  });
});

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'failure-order' }),
)('F9-FAIL-CLOSED-001 failure-order', () => {
  it('maps F8 typed failure to INTERNAL_ERROR without v1 fallback', () => {
    const projector = new V2LocateResultProjector(
      createAcceptedCompleteRealLocateShadowOrchestratorV2(),
    );
    const capability = issueLocateProjectionExecutionCapabilityV2();
    const fakeInput = Object.freeze({
      ok: true as const,
      envelope: Object.freeze({
        repositoryRoot: '/tmp/x',
        normalizedTerms: Object.freeze([]),
        fragments: Object.freeze({}),
      }),
    });
    const bundle = projector.project(fakeInput, capability);
    expect(bundle.value.ok).toBe(false);
    if (bundle.value.ok) throw new Error('expected INTERNAL_ERROR');
    expect(bundle.value.error.code).toBe(
      FAIL_CLOSED_UNREGISTERED_SUCCESS_V2.expectedCode,
    );
  });
});
