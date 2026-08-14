import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import {
  PLATFORM_MATRIX_JOB_ID_V1,
  PLATFORM_WORKFLOW_PATH_V1,
  PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1,
  type PlatformAssertionMarkerOwnerV1,
  type PlatformCaseBindingV1,
  type PlatformEvidenceHashOwnerV1,
} from '../../testkit/contracts/platform-contract.js';
import {
  type PlatformContractSummaryV1,
  type PrivatePlatformRunnerResultV1,
  validatePlatformBatchResult,
} from '../../testkit/testing/platform-contract.js';
import { isSelected } from '../../testkit/testing/selection.js';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const SELECTED_CONTRACTS = [
  'F4-PATH-001',
  'F4-PATH-004',
  'F4-MCP-001',
  'F4-MCP-002',
] as const;
const EVIDENCE_SHA256 = '1'.repeat(64);

interface PlatformCommandInvocation {
  readonly executable: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
}

interface PlatformSafeSummary {
  readonly schemaVersion: 1;
  readonly os: string;
  readonly nodeMajor: number;
  readonly arch: string;
  readonly contracts: readonly string[];
  readonly passedAssertionMarkers: readonly {
    readonly contractId: string;
    readonly assertionId: string;
  }[];
  readonly contractEvidenceHashes: readonly {
    readonly contractId: string;
    readonly evidenceId: string;
    readonly sha256: string;
  }[];
}

interface PlatformContractsRunResult {
  readonly mode: 'contracts';
  readonly safeSummary: PlatformSafeSummary;
  readonly summaries: readonly PlatformContractSummaryV1[];
}

type RunPlatformContracts = (
  argv: readonly string[],
  options: Readonly<Record<string, unknown>>,
) => Promise<unknown>;

async function loadRunPlatformContracts(): Promise<RunPlatformContracts> {
  const module = (await import(
    pathToFileURL(
      resolve(repositoryRoot, 'tools/ci/run-platform-contracts.mjs'),
    ).href
  )) as { readonly runPlatformContracts: RunPlatformContracts };
  return module.runPlatformContracts;
}

function bindingsForContracts(
  contracts: readonly string[],
): readonly PlatformCaseBindingV1<string>[] {
  const selected = PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1.bindings.filter(
    (binding) => contracts.includes(binding.contractId),
  );
  if (selected.length !== contracts.length) {
    throw new Error('test fixture selected unknown platform contract');
  }
  return selected;
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function markerOwnerFor(
  markerOwners: readonly PlatformAssertionMarkerOwnerV1<string>[],
  contractId: string,
  assertionId: string,
): string {
  const owner = markerOwners.find(
    (entry) =>
      entry.contractId === contractId && entry.assertionId === assertionId,
  );
  if (owner === undefined) {
    throw new Error(`missing marker owner ${contractId}/${assertionId}`);
  }
  return owner.assertionOwner;
}

function evidenceOwnerFor(
  evidenceOwners: readonly PlatformEvidenceHashOwnerV1<string>[],
  contractId: string,
  evidenceId: string,
): string {
  const owner = evidenceOwners.find(
    (entry) =>
      entry.contractId === contractId && entry.evidenceId === evidenceId,
  );
  if (owner === undefined) {
    throw new Error(`missing evidence owner ${contractId}/${evidenceId}`);
  }
  return owner.evidenceOwner;
}

function privateResultForBindings(
  bindings: readonly PlatformCaseBindingV1<string>[],
): PrivatePlatformRunnerResultV1 {
  const markerOwners = PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1.markerOwners;
  const evidenceOwners =
    PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1.evidenceHashOwners;
  return {
    registeredOwners: sortedUnique(
      bindings.flatMap((binding) => [
        binding.assertionOwner,
        ...binding.requiredAssertionIds.map((assertionId) =>
          markerOwnerFor(markerOwners, binding.contractId, assertionId),
        ),
        ...binding.requiredEvidenceHashIds.map((evidenceId) =>
          evidenceOwnerFor(evidenceOwners, binding.contractId, evidenceId),
        ),
      ]),
    ),
    assertions: bindings.flatMap((binding) =>
      binding.requiredAssertionIds.map((assertionId) => ({
        contractId: binding.contractId,
        assertionId,
        status: 'passed' as const,
        actualOwner: markerOwnerFor(
          markerOwners,
          binding.contractId,
          assertionId,
        ),
      })),
    ),
    evidence: bindings.flatMap((binding) =>
      binding.requiredEvidenceHashIds.map((evidenceId) => ({
        contractId: binding.contractId,
        evidenceId,
        sha256: EVIDENCE_SHA256,
        actualOwner: evidenceOwnerFor(
          evidenceOwners,
          binding.contractId,
          evidenceId,
        ),
      })),
    ),
  };
}

function identityString(binding: PlatformCaseBindingV1<string>): string {
  return `${binding.group}/${binding.executableCaseId}`;
}

function npmScriptName(invocation: PlatformCommandInvocation): string {
  const runIndex = invocation.args.indexOf('run');
  const script = invocation.args[runIndex + 1];
  if (runIndex < 0 || script === undefined) {
    throw new Error(`not an npm run invocation: ${invocation.args.join(' ')}`);
  }
  return script;
}

function identityArguments(
  invocation: PlatformCommandInvocation,
): readonly string[] {
  const identities: string[] = [];
  for (let index = 0; index < invocation.args.length; index += 1) {
    if (invocation.args[index] !== '--identity') {
      continue;
    }
    const value = invocation.args[index + 1];
    if (value === undefined) {
      throw new Error('missing --identity value');
    }
    identities.push(value);
  }
  return identities;
}

function expectedSafeSummary(
  summaries: readonly PlatformContractSummaryV1[],
): PlatformSafeSummary {
  return {
    schemaVersion: 1,
    os: 'linux',
    nodeMajor: 22,
    arch: 'x64',
    contracts: summaries.map((entry) => entry.contractId).sort(),
    passedAssertionMarkers: summaries
      .flatMap((entry) => entry.passedAssertionMarkers)
      .sort(
        (left, right) =>
          left.contractId.localeCompare(right.contractId) ||
          left.assertionId.localeCompare(right.assertionId),
      ),
    contractEvidenceHashes: summaries
      .flatMap((entry) => entry.contractEvidenceHashes)
      .sort(
        (left, right) =>
          left.contractId.localeCompare(right.contractId) ||
          left.evidenceId.localeCompare(right.evidenceId),
      ),
  };
}

function stepRuns(job: Record<string, unknown> | undefined): readonly string[] {
  if (job === undefined || !Array.isArray(job['steps'])) {
    return [];
  }
  return job['steps']
    .map((step) => {
      if (typeof step !== 'object' || step === null) {
        return '';
      }
      const run = (step as Record<string, unknown>)['run'];
      return typeof run === 'string' ? run : '';
    })
    .filter((run) => run.length > 0);
}

describe.runIf(
  isSelected({
    group: 'cross-platform-ci-contract',
    caseId: 'platform-process-budget',
  }),
)('B1.4 platform process budget', () => {
  it('runs at most one built runner per surface with repeated exact identities', async () => {
    const selectedBindings = bindingsForContracts(SELECTED_CONTRACTS);
    const unitBindings = selectedBindings.filter(
      (binding) => binding.surface === 'unit',
    );
    const mcpBindings = selectedBindings.filter(
      (binding) => binding.surface === 'mcp',
    );
    expect(unitBindings.length).toBeGreaterThanOrEqual(2);
    expect(mcpBindings.length).toBeGreaterThanOrEqual(2);

    const invocations: PlatformCommandInvocation[] = [];
    const commandRunner = async (
      invocation: PlatformCommandInvocation,
    ): Promise<number> => {
      invocations.push({
        ...invocation,
        args: [...invocation.args],
        env: { ...invocation.env },
      });
      const resultPath = invocation.env['REPO_NAV_PLATFORM_RESULT_PATH'];
      if (typeof resultPath !== 'string' || resultPath.length === 0) {
        throw new Error('platform runner omitted private result path');
      }
      const script = npmScriptName(invocation);
      const surfaceBindings = script === 'test' ? unitBindings : mcpBindings;
      mkdirSync(dirname(resultPath), { recursive: true });
      writeFileSync(
        resultPath,
        `${JSON.stringify(privateResultForBindings(surfaceBindings), null, 2)}\n`,
        'utf8',
      );
      return 0;
    };

    const runPlatformContracts = await loadRunPlatformContracts();
    const result = (await runPlatformContracts(
      SELECTED_CONTRACTS.flatMap((contractId) => ['--contract', contractId]),
      {
        commandRunner,
        runtimeIdentity: { platform: 'linux', arch: 'x64', nodeMajor: 22 },
        writeSummary: false,
      },
    )) as PlatformContractsRunResult;

    const buildInvocations = invocations.filter(
      (invocation) => npmScriptName(invocation) === 'build',
    );
    const unitInvocations = invocations.filter(
      (invocation) => npmScriptName(invocation) === 'test',
    );
    const mcpInvocations = invocations.filter(
      (invocation) => npmScriptName(invocation) === 'test:mcp:built',
    );

    expect(buildInvocations).toHaveLength(0);
    expect(unitInvocations.length).toBeLessThanOrEqual(1);
    expect(mcpInvocations.length).toBeLessThanOrEqual(1);
    expect(unitInvocations).toHaveLength(1);
    expect(mcpInvocations).toHaveLength(1);

    const [unitInvocation] = unitInvocations;
    const [mcpInvocation] = mcpInvocations;
    expect(unitInvocation).toBeDefined();
    expect(mcpInvocation).toBeDefined();
    if (unitInvocation === undefined || mcpInvocation === undefined) {
      throw new Error('missing expected platform runner invocation');
    }
    expect(unitInvocation.args).not.toContain('--group');
    expect(unitInvocation.args).not.toContain('--case');
    expect(mcpInvocation.args).not.toContain('--group');
    expect(mcpInvocation.args).not.toContain('--case');
    expect(identityArguments(unitInvocation)).toEqual(
      unitBindings.map(identityString),
    );
    expect(identityArguments(mcpInvocation)).toEqual(
      mcpBindings.map(identityString),
    );

    const expectedUnitSummaries = validatePlatformBatchResult({
      bindings: unitBindings,
      privateResult: privateResultForBindings(unitBindings),
      markerOwners: PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1.markerOwners,
      evidenceOwners:
        PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1.evidenceHashOwners,
    });
    const expectedMcpSummaries = validatePlatformBatchResult({
      bindings: mcpBindings,
      privateResult: privateResultForBindings(mcpBindings),
      markerOwners: PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1.markerOwners,
      evidenceOwners:
        PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1.evidenceHashOwners,
    });
    const expectedSummaries = [
      ...expectedUnitSummaries,
      ...expectedMcpSummaries,
    ];
    expect(result.mode).toBe('contracts');
    expect(result.summaries).toEqual(expectedSummaries);
    expect(result.safeSummary).toEqual(expectedSafeSummary(expectedSummaries));
  });

  it('fails closed when validator summaries do not match the selected surface group', async () => {
    const selectedBindings = bindingsForContracts(['F4-PATH-001']);
    const commandRunner = async (
      invocation: PlatformCommandInvocation,
    ): Promise<number> => {
      const resultPath = invocation.env['REPO_NAV_PLATFORM_RESULT_PATH'];
      if (typeof resultPath !== 'string' || resultPath.length === 0) {
        throw new Error('platform runner omitted private result path');
      }
      mkdirSync(dirname(resultPath), { recursive: true });
      writeFileSync(
        resultPath,
        `${JSON.stringify(privateResultForBindings(selectedBindings), null, 2)}\n`,
        'utf8',
      );
      return 0;
    };

    const runPlatformContracts = await loadRunPlatformContracts();

    await expect(
      runPlatformContracts(['--contract', 'F4-PATH-001'], {
        commandRunner,
        runtimeIdentity: { platform: 'linux', arch: 'x64', nodeMajor: 22 },
        validateBatchResult: () => [
          {
            contractId: 'UNEXPECTED-CONTRACT',
            passedAssertionMarkers: [],
            contractEvidenceHashes: [],
          },
        ],
        writeSummary: false,
      }),
    ).rejects.toThrow(/platform summaries\(unit\) mismatch/u);
  });

  it('keeps built scripts and workflow build budget load-bearing', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'),
    ) as { readonly scripts?: Readonly<Record<string, string>> };
    expect(packageJson.scripts).toMatchObject({
      'test:mcp:built': 'tsx testkit/runners/mcp-runner.ts',
      'test:mcp': 'npm run build --silent && npm run test:mcp:built --',
      'test:docs:built': 'tsx testkit/docs/docs-smoke-runner.ts',
      'test:docs': 'npm run build --silent && npm run test:docs:built',
    });

    const workflowRaw = readFileSync(
      resolve(repositoryRoot, PLATFORM_WORKFLOW_PATH_V1),
      'utf8',
    )
      .replaceAll('\r\n', '\n')
      .replaceAll('\r', '\n');
    const workflow = parseYaml(workflowRaw) as Record<string, unknown>;
    const jobs = workflow['jobs'] as Record<string, Record<string, unknown>>;
    const matrixRuns = stepRuns(jobs[PLATFORM_MATRIX_JOB_ID_V1]);

    expect(matrixRuns.filter((run) => run === 'npm run build')).toHaveLength(1);
    expect(
      matrixRuns.filter((run) => run.includes('npm run build')),
    ).toHaveLength(1);
    expect(matrixRuns).toContain('npm run test:mcp:built -- --all');
    expect(matrixRuns).toContain('npm run test:docs:built');
    expect(matrixRuns).toContain('npm run test:platform');
    expect(matrixRuns).not.toContain('npm run test:mcp -- --all');
    expect(matrixRuns).not.toContain('npm run test:docs');
    expect(
      matrixRuns.find((run) => run === 'npm run test:platform'),
    ).not.toMatch(/build/u);
  });
});
