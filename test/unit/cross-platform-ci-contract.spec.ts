import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import {
  PLATFORM_ACTION_PINS_V1,
  PLATFORM_AGGREGATE_JOB_ID_V1,
  PLATFORM_CELLS_V1,
  PLATFORM_COMMANDS_V1,
  PLATFORM_CONTRACT_IDS_V1,
  PLATFORM_MATRIX_JOB_ID_V1,
  PLATFORM_WORKFLOW_PATH_V1,
  PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1,
  SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
  createFilesystemPlatformContractRepository,
  ensureRunnerSelectionsCoverPlatformCases,
  probeRuntimeIdentity,
  validatePlatformContractSnapshotV1,
  validateProductionPlatformContractSnapshotV1,
} from '../../testkit/contracts/platform-contract.js';
import { listBindingAttestationMutationsV1 } from '../../testkit/fixtures/platform/binding-attestation-mutations.js';
import {
  buildSyntheticExtensionSnapshotV1,
  listSyntheticExtensionMutationsV1,
  syntheticProofHash,
} from '../../testkit/fixtures/platform/registry-extension-mutations.js';
import {
  recordPlatformAssertionMarker,
  recordPlatformContractEvidenceHash,
} from '../../testkit/testing/platform-contract.js';
import { isSelected } from '../../testkit/testing/selection.js';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');

function loadWorkflow(): {
  readonly raw: string;
  readonly doc: Record<string, unknown>;
} {
  // Windows checkouts may materialize CRLF; mutation regexes assert on LF only.
  const raw = readFileSync(
    resolve(repositoryRoot, PLATFORM_WORKFLOW_PATH_V1),
    'utf8',
  )
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n');
  return { raw, doc: parseYaml(raw) as Record<string, unknown> };
}

describe.runIf(
  isSelected({
    group: 'cross-platform-ci-contract',
    caseId: 'workflow-matrix-contract',
  }),
)('F4-MATRIX-001 workflow matrix contract', () => {
  it('keeps six cells, stable aggregate, pins, and fail-closed mutations', () => {
    const { raw, doc } = loadWorkflow();
    expect(raw).not.toMatch(/secrets\./u);
    expect(raw).not.toMatch(/continue-on-error/u);
    expect(raw).not.toMatch(/ubuntu-latest|windows-latest|macos-latest/u);
    expect(raw).not.toMatch(/@(?:v\d+|main)\b/u);

    const jobs = doc['jobs'] as Record<string, Record<string, unknown>>;
    const matrixJob = jobs[PLATFORM_MATRIX_JOB_ID_V1];
    expect(matrixJob).toBeDefined();
    const strategy = matrixJob?.['strategy'] as {
      'fail-fast': boolean;
      matrix: { include: Array<Record<string, unknown>> };
    };
    expect(strategy['fail-fast']).toBe(false);
    expect(strategy.matrix.include).toHaveLength(PLATFORM_CELLS_V1.length);
    for (const [index, cell] of PLATFORM_CELLS_V1.entries()) {
      expect(strategy.matrix.include[index]).toMatchObject({
        cellId: cell.id,
        runner: cell.runner,
        nodeMajor: cell.nodeMajor,
      });
    }

    const aggregate = jobs[PLATFORM_AGGREGATE_JOB_ID_V1];
    expect(aggregate?.['name']).toBe(PLATFORM_AGGREGATE_JOB_ID_V1);
    expect(aggregate?.['runs-on']).toBe('ubuntu-24.04');
    expect(aggregate?.['needs']).toEqual([PLATFORM_MATRIX_JOB_ID_V1]);
    expect(aggregate?.['if']).toBe('always()');
    const aggregateSteps = aggregate?.['steps'] as Array<Record<string, unknown>>;
    expect(
      aggregateSteps.some((step) => typeof step['uses'] === 'string'),
    ).toBe(false);

    for (const pin of PLATFORM_ACTION_PINS_V1) {
      expect(raw).toContain(`${pin.repository}@${pin.sha}`);
      expect(raw).toContain(`# ${pin.tag}`);
    }
    for (const command of PLATFORM_COMMANDS_V1) {
      expect(raw).toContain(`id: ${command.id}`);
    }

    expect(raw.match(/cellId:\s+\S+/g)).toHaveLength(6);
    const deletedCell = raw.replace(
      /^\s+- cellId: linux-node22\n(?:.*\n){2}/m,
      '',
    );
    expect(deletedCell.match(/cellId:\s+\S+/g)).toHaveLength(5);

    const renamedAggregate = raw.replaceAll(
      'cross-platform-required',
      'cross-platform-optional',
    );
    expect(renamedAggregate).not.toContain('name: cross-platform-required');
    expect(renamedAggregate).toContain('name: cross-platform-optional');

    const repository = createFilesystemPlatformContractRepository(
      repositoryRoot,
    );
    validateProductionPlatformContractSnapshotV1(
      PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1,
      repository,
    );
    ensureRunnerSelectionsCoverPlatformCases();
  });
});

describe.runIf(
  isSelected({
    group: 'cross-platform-ci-contract',
    caseId: 'runtime-cell-contract',
  }),
)('F4-RUNTIME-001 runtime cell contract', () => {
  it('probes local runtime identity against registry cells', () => {
    const identity = probeRuntimeIdentity();
    expect(['linux', 'win32', 'darwin']).toContain(identity.platform);
    expect(identity.arch).toBe('x64');
    expect([22, 24]).toContain(identity.nodeMajor);
    const match = PLATFORM_CELLS_V1.find(
      (cell) =>
        cell.os === identity.platform &&
        cell.arch === identity.arch &&
        cell.nodeMajor === identity.nodeMajor,
    );
    expect(match).toBeDefined();
  });
});

describe.runIf(
  isSelected({
    group: 'cross-platform-ci-contract',
    caseId: 'synthetic-extension-protocol',
  }),
)('F4-EXT-001 synthetic extension protocol', () => {
  it('accepts complete synthetic snapshot and rejects hostile mutations', () => {
    const repository = createFilesystemPlatformContractRepository(
      repositoryRoot,
    );
    const synthetic = buildSyntheticExtensionSnapshotV1();
    validatePlatformContractSnapshotV1(
      SYNTHETIC_PLATFORM_CONTRACT_IDS_V1,
      synthetic,
      repository,
    );
    expect(PLATFORM_CONTRACT_IDS_V1.includes('TEST-EXT-001' as never)).toBe(
      false,
    );

    for (const mutation of listSyntheticExtensionMutationsV1()) {
      expect(() =>
        validatePlatformContractSnapshotV1(
          mutation.expectedIds,
          mutation.snapshot,
          repository,
        ),
      ).toThrow();
    }

    for (const mutation of listBindingAttestationMutationsV1()) {
      expect(mutation.binding.group.length).toBeGreaterThan(0);
      expect(mutation.binding.executableCaseId.length).toBeGreaterThan(0);
    }

    recordPlatformAssertionMarker('TEST-EXT-001', 'synthetic-marker');
    recordPlatformContractEvidenceHash(
      'TEST-EXT-001',
      'synthetic-proof',
      syntheticProofHash(),
    );
  });
});
