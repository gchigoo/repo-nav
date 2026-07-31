import { describe, expect, it } from 'vitest';

import {
  PLATFORM_CELLS_V1,
  PLATFORM_COMMANDS_V1,
} from '../../testkit/contracts/platform-contract.js';
import {
  buildPlatformCoreCommandReportV1,
  validatePlatformCoreCommandReportV1,
} from '../../testkit/contracts/platform-evidence-report.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'cross-platform-ci-contract',
    caseId: 'safe-platform-report',
  }),
)('F4-REPORT-001 safe platform report', () => {
  it('accepts strict reports and rejects forbidden keys and splices', () => {
    const cell = PLATFORM_CELLS_V1[0];
    if (cell === undefined) {
      throw new Error('missing cell');
    }
    const outcomes = {
      install: 'success',
      runtime: 'success',
      build: 'success',
      typecheck: 'success',
      unit: 'success',
      golden: 'success',
      mcp: 'success',
      docs: 'success',
      platform: 'success',
    } as const;
    expect(PLATFORM_COMMANDS_V1).toHaveLength(9);
    const report = buildPlatformCoreCommandReportV1({
      cellId: cell.id,
      actual: cell,
      run: { workflowRunId: '42', runAttempt: 1 },
      revision: {
        workflowSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        sourceSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        eventName: 'workflow_dispatch',
      },
      commandOutcomes: outcomes,
      requiredCaseIds: ['F4-PATH-001'],
      passedAssertionMarkers: [
        {
          contractId: 'F4-PATH-001',
          assertionId: 'absolute-parent-nonnormalized-rejected',
        },
      ],
      contractEvidenceHashes: [],
      completedAt: '2026-07-24T00:00:00.000Z',
    });
    expect(report.schemaVersion).toBe(1);
    expect(report.contractEvidenceHashes).toEqual([]);

    expect(() =>
      validatePlatformCoreCommandReportV1(
        { ...report, cwd: '/tmp' },
        {
          expectedMarkers: report.passedAssertionMarkers,
          expectedEvidence: [],
          expectedCaseIds: report.requiredCaseIds,
        },
      ),
    ).toThrow(/forbidden report key/u);

    expect(() =>
      validatePlatformCoreCommandReportV1(
        {
          ...report,
          run: { workflowRunId: 'not-decimal', runAttempt: 1 },
        },
        {
          expectedMarkers: report.passedAssertionMarkers,
          expectedEvidence: [],
          expectedCaseIds: report.requiredCaseIds,
        },
      ),
    ).toThrow(/workflowRunId/u);

    expect(() =>
      validatePlatformCoreCommandReportV1(
        {
          ...report,
          run: { workflowRunId: '42', runAttempt: 0 },
        },
        {
          expectedMarkers: report.passedAssertionMarkers,
          expectedEvidence: [],
          expectedCaseIds: report.requiredCaseIds,
        },
      ),
    ).toThrow(/runAttempt/u);

    expect(() =>
      validatePlatformCoreCommandReportV1(
        {
          ...report,
          passedAssertionMarkers: [
            ...report.passedAssertionMarkers,
            {
              contractId: 'F4-PATH-001',
              assertionId: 'absolute-parent-nonnormalized-rejected',
            },
          ],
        },
        {
          expectedMarkers: report.passedAssertionMarkers,
          expectedEvidence: [],
          expectedCaseIds: report.requiredCaseIds,
        },
      ),
    ).toThrow();

    const secondCell = PLATFORM_CELLS_V1[1];
    if (secondCell === undefined) {
      throw new Error('missing second cell');
    }
    const otherRun = buildPlatformCoreCommandReportV1({
      cellId: secondCell.id,
      actual: secondCell,
      run: { workflowRunId: '99', runAttempt: 2 },
      revision: report.revision,
      commandOutcomes: outcomes,
      requiredCaseIds: [],
      passedAssertionMarkers: [],
      contractEvidenceHashes: [],
      completedAt: report.completedAt,
    });
    expect(otherRun.run.workflowRunId).not.toBe(report.run.workflowRunId);
    expect(otherRun.run.runAttempt).not.toBe(report.run.runAttempt);
  });
});
