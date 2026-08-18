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

function stepRuns(job: Record<string, unknown> | undefined): readonly string[] {
  if (job === undefined) {
    return [];
  }
  const steps = job['steps'];
  if (!Array.isArray(steps)) {
    return [];
  }
  return steps
    .map((step) => {
      if (typeof step !== 'object' || step === null) {
        return '';
      }
      const run = (step as Record<string, unknown>)['run'];
      return typeof run === 'string' ? run : '';
    })
    .filter((run) => run.length > 0);
}

function assertAdditionalJobs(
  jobs: Record<string, Record<string, unknown>>,
): void {
  const arm = jobs['macos-arm-unit'];
  expect(arm?.['runs-on']).toBe('macos-14');
  const armRuns = stepRuns(arm);
  expect(armRuns).toEqual(
    expect.arrayContaining([
      'npm ci',
      'npm run clean',
      'npm run typecheck',
      'npm test',
    ]),
  );
  expect(armRuns).toHaveLength(5);
  expect(armRuns.filter((run) => run === 'npm run clean')).toHaveLength(1);
  const armRunsJoined = armRuns.join('\n');
  expect(armRunsJoined).not.toContain('npm run build');
  expect(armRunsJoined).not.toContain('codegraph');
  const ripgrepInstall = armRuns.find((run) =>
    run.includes('@vscode/ripgrep@1.15.9'),
  );
  expect(ripgrepInstall).toContain('GITHUB_PATH');
  expect(ripgrepInstall).toContain('--version');

  const codegraphRuns = stepRuns(jobs['codegraph-integration']);
  const codegraphRunsJoined = codegraphRuns.join('\n');
  expect(codegraphRunsJoined).toContain('@colbymchenry/codegraph@1.5.0');
  expect(codegraphRunsJoined).toContain('@vscode/ripgrep@1.15.9');
  for (const language of ['typescript', 'javascript', 'python', 'go']) {
    expect(codegraphRunsJoined).toContain(
      `codegraph init testkit/fixtures/codegraph-differential/${language}`,
    );
  }
  expect(codegraphRuns).toContain('npm run test:integration:codegraph');
  expect(codegraphRuns).toContain('npm run benchmark:codegraph-differential');

  const aggregate = jobs[PLATFORM_AGGREGATE_JOB_ID_V1];
  expect(
    [...((aggregate?.['needs'] as string[] | undefined) ?? [])].sort(),
  ).toEqual(
    [
      PLATFORM_MATRIX_JOB_ID_V1,
      'macos-arm-unit',
      'codegraph-integration',
    ].sort(),
  );
  const aggregateRuns = stepRuns(aggregate).join('\n');
  for (const jobId of [
    PLATFORM_MATRIX_JOB_ID_V1,
    'macos-arm-unit',
    'codegraph-integration',
  ]) {
    expect(aggregateRuns).toContain(`needs.${jobId}.result`);
    expect(aggregateRuns).toContain('!= "success"');
  }
}

function withoutJob(
  jobs: Record<string, Record<string, unknown>>,
  jobId: string,
): Record<string, Record<string, unknown>> {
  const next = structuredClone(jobs);
  delete next[jobId];
  return next;
}

function withoutRunContaining(
  jobs: Record<string, Record<string, unknown>>,
  jobId: string,
  needle: string,
): Record<string, Record<string, unknown>> {
  const next = structuredClone(jobs);
  const job = next[jobId];
  const steps = job?.['steps'];
  if (job === undefined || !Array.isArray(steps)) {
    return next;
  }
  job['steps'] = steps.filter((step) => {
    if (typeof step !== 'object' || step === null) {
      return true;
    }
    const run = (step as Record<string, unknown>)['run'];
    return !(typeof run === 'string' && run.includes(needle));
  });
  return next;
}

function withoutAggregateNeed(
  jobs: Record<string, Record<string, unknown>>,
  jobId: string,
): Record<string, Record<string, unknown>> {
  const next = structuredClone(jobs);
  const aggregate = next[PLATFORM_AGGREGATE_JOB_ID_V1];
  if (aggregate !== undefined && Array.isArray(aggregate['needs'])) {
    aggregate['needs'] = aggregate['needs'].filter((need) => need !== jobId);
  }
  return next;
}

function withoutAggregateResultCheck(
  jobs: Record<string, Record<string, unknown>>,
  jobId: string,
): Record<string, Record<string, unknown>> {
  const next = structuredClone(jobs);
  const aggregate = next[PLATFORM_AGGREGATE_JOB_ID_V1];
  if (aggregate === undefined) {
    return next;
  }
  const steps = aggregate['steps'];
  if (!Array.isArray(steps)) {
    return next;
  }
  aggregate['steps'] = steps.map((step) => {
    if (typeof step !== 'object' || step === null) {
      return step;
    }
    const record = step as Record<string, unknown>;
    const run = record['run'];
    if (typeof run !== 'string') {
      return step;
    }
    return {
      ...record,
      run: run
        .split('\n')
        .filter((line) => !line.includes(`needs.${jobId}.result`))
        .join('\n'),
    };
  });
  return next;
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
    const matrixRuns = stepRuns(matrixJob);
    const matrixRunsJoined = matrixRuns.join('\n');
    expect(matrixRuns.filter((run) => run === 'npm run build')).toHaveLength(1);
    expect(
      matrixRuns.filter((run) => run.includes('npm run build')),
    ).toHaveLength(1);
    expect(matrixRunsJoined).toContain('@vscode/ripgrep@1.15.9');
    expect(matrixRunsJoined).not.toContain('@colbymchenry/codegraph');
    expect(matrixRunsJoined).not.toContain('CG_SHIM');
    const hostToolInstaller = readFileSync(
      resolve(repositoryRoot, 'tools/ci/install-host-tools.mjs'),
      'utf8',
    );
    expect(hostToolInstaller).toContain("'@vscode/ripgrep@1.15.9'");
    expect(hostToolInstaller).not.toContain('codegraph');
    expect(matrixRuns).toContain('npm run test:mcp:built -- --all');
    expect(matrixRuns).toContain('npm run test:docs:built');
    expect(matrixRuns).toContain('npm run test:platform');
    expect(matrixRuns).not.toContain('npm run test:mcp -- --all');
    expect(matrixRuns).not.toContain('npm run test:docs');

    const aggregate = jobs[PLATFORM_AGGREGATE_JOB_ID_V1];
    assertAdditionalJobs(jobs);
    expect(aggregate?.['name']).toBe(PLATFORM_AGGREGATE_JOB_ID_V1);
    expect(aggregate?.['runs-on']).toBe('ubuntu-24.04');
    expect(aggregate?.['if']).toBe('always()');
    const aggregateSteps = aggregate?.['steps'] as Array<
      Record<string, unknown>
    >;
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

    for (const jobId of [
      'macos-arm-unit',
      'codegraph-integration',
      PLATFORM_AGGREGATE_JOB_ID_V1,
    ]) {
      expect(() => assertAdditionalJobs(withoutJob(jobs, jobId))).toThrow();
    }
    for (const needle of [
      '@vscode/ripgrep@1.15.9',
      'GITHUB_PATH',
      '--version',
    ]) {
      expect(() =>
        assertAdditionalJobs(
          withoutRunContaining(jobs, 'macos-arm-unit', needle),
        ),
      ).toThrow();
    }
    expect(() =>
      assertAdditionalJobs(
        withoutRunContaining(
          jobs,
          'codegraph-integration',
          '@colbymchenry/codegraph@1.5.0',
        ),
      ),
    ).toThrow();
    for (const needle of [
      '@vscode/ripgrep@1.15.9',
      'codegraph init testkit/fixtures/codegraph-differential/typescript',
      'codegraph init testkit/fixtures/codegraph-differential/javascript',
      'codegraph init testkit/fixtures/codegraph-differential/python',
      'codegraph init testkit/fixtures/codegraph-differential/go',
      'npm run benchmark:codegraph-differential',
    ]) {
      expect(() =>
        assertAdditionalJobs(
          withoutRunContaining(jobs, 'codegraph-integration', needle),
        ),
      ).toThrow();
    }
    expect(() =>
      assertAdditionalJobs(
        withoutRunContaining(
          jobs,
          'codegraph-integration',
          'npm run test:integration:codegraph',
        ),
      ),
    ).toThrow();
    for (const jobId of ['macos-arm-unit', 'codegraph-integration']) {
      expect(() =>
        assertAdditionalJobs(withoutAggregateNeed(jobs, jobId)),
      ).toThrow();
    }
    for (const jobId of [
      PLATFORM_MATRIX_JOB_ID_V1,
      'macos-arm-unit',
      'codegraph-integration',
    ]) {
      expect(() =>
        assertAdditionalJobs(withoutAggregateResultCheck(jobs, jobId)),
      ).toThrow();
    }

    const repository =
      createFilesystemPlatformContractRepository(repositoryRoot);
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
  it('probes local runtime identity against supported OS, arch, and Node ranges', () => {
    const identity = probeRuntimeIdentity();
    expect(['linux', 'win32', 'darwin']).toContain(identity.platform);
    expect(['x64', 'arm64']).toContain(identity.arch);
    expect([22, 24]).toContain(identity.nodeMajor);
  });
});

describe.runIf(
  isSelected({
    group: 'cross-platform-ci-contract',
    caseId: 'synthetic-extension-protocol',
  }),
)('F4-EXT-001 synthetic extension protocol', () => {
  it('accepts complete synthetic snapshot and rejects hostile mutations', () => {
    const repository =
      createFilesystemPlatformContractRepository(repositoryRoot);
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
