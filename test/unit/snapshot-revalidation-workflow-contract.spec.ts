import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';

import { computeRealRepoBenchmarkCatalogSha256 } from '../../tools/benchmark/real-repo-benchmark-runner.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'cross-platform-ci-contract',
  caseId: 'snapshot-revalidation-benchmark-job',
});
const repositoryRoot = resolve(import.meta.dirname, '../..');
const workflowPath = resolve(
  repositoryRoot,
  '.github/workflows/package-release-ci.yml',
);
const checkoutPin = 'actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0';
const setupNodePin =
  'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020';
const uploadArtifactPin =
  'actions/upload-artifact@b7c566a772e6b6bfb58ed0dc250532a479d7789f';
const provenanceWriterPath = resolve(
  repositoryRoot,
  'tools/benchmark/write-snapshot-revalidation-provenance.mjs',
);
const catalogPath = resolve(
  repositoryRoot,
  'testkit/fixtures/benchmark-repos/catalog.json',
);

function loadWorkflow(): Record<string, unknown> {
  return parseYaml(readFileSync(workflowPath, 'utf8')) as Record<
    string,
    unknown
  >;
}

function authoritativeReportFixture(catalogSha256: string) {
  const policies = [
    {
      policy: 'all-loaded-baseline',
      metadataChecks: 3,
      digestChecks: 3,
      digestBytes: 96,
      eligibleDecisionSafe: true,
    },
    {
      policy: 'retained-digest',
      metadataChecks: 1,
      digestChecks: 1,
      digestBytes: 32,
      eligibleDecisionSafe: false,
    },
    {
      policy: 'conditional-digest',
      metadataChecks: 2,
      digestChecks: 2,
      digestBytes: 64,
      eligibleDecisionSafe: true,
    },
  ].map((row) => ({
    ...row,
    loadedCount: 3,
    retainedCount: 1,
    eligibleCount: 2,
    samplesMicroseconds: [1, 2, 3, 4, 5],
    p50Microseconds: 3,
    p95Microseconds: 5,
  }));
  return {
    schemaVersion: 1,
    catalogSha256,
    environment: {
      runner: 'ubuntu-24.04',
      nodeMajor: 22,
      platform: 'linux',
      arch: 'x64',
    },
    sampling: {
      warmupRuns: 1,
      measuredRuns: 5,
      quantile: 'nearest-rank',
    },
    policies,
    correctness: policies.map(({ policy, eligibleDecisionSafe }) => ({
      policy,
      retainedMutationDetected: true,
      eligibleDecisionSafe,
      abortPurged: true,
      unreadablePurged: true,
    })),
    selected: null,
  };
}

function runProvenanceWriter(input: {
  readonly workspace: string;
  readonly report: unknown;
  readonly environment?: Readonly<Record<string, string>>;
}) {
  mkdirSync(resolve(input.workspace, 'test-artifacts/benchmark'), {
    recursive: true,
  });
  mkdirSync(resolve(input.workspace, 'testkit/fixtures/benchmark-repos'), {
    recursive: true,
  });
  writeFileSync(
    resolve(
      input.workspace,
      'test-artifacts/benchmark/snapshot-revalidation-candidate-v1.json',
    ),
    `${JSON.stringify(input.report, null, 2)}\n`,
    'utf8',
  );
  writeFileSync(
    resolve(input.workspace, 'testkit/fixtures/benchmark-repos/catalog.json'),
    readFileSync(catalogPath),
  );
  return spawnSync(process.execPath, [provenanceWriterPath], {
    cwd: input.workspace,
    encoding: 'utf8',
    shell: false,
    env: {
      ...process.env,
      GITHUB_REPOSITORY: 'gchigoo/repo-nav',
      GITHUB_WORKFLOW: 'package-release-ci',
      GITHUB_JOB: 'snapshot-revalidation-benchmark',
      GITHUB_SHA: 'a'.repeat(40),
      GITHUB_RUN_ID: '123',
      GITHUB_RUN_ATTEMPT: '2',
      ...input.environment,
    },
  });
}

function requireJob(
  document: Record<string, unknown>,
): Record<string, unknown> {
  const jobs = document['jobs'];
  if (typeof jobs !== 'object' || jobs === null || Array.isArray(jobs)) {
    throw new Error('package-release-ci jobs must be an object');
  }
  const job = (jobs as Record<string, unknown>)[
    'snapshot-revalidation-benchmark'
  ];
  if (typeof job !== 'object' || job === null || Array.isArray(job)) {
    throw new Error('snapshot-revalidation-benchmark job is missing');
  }
  return job as Record<string, unknown>;
}

function requireSteps(job: Record<string, unknown>): Record<string, unknown>[] {
  const steps = job['steps'];
  if (!Array.isArray(steps)) {
    throw new Error('snapshot benchmark steps must be an array');
  }
  return steps as Record<string, unknown>[];
}

function assertSnapshotBenchmarkJob(document: Record<string, unknown>): void {
  const jobs = document['jobs'] as Record<string, Record<string, unknown>>;
  expect(jobs['package-release']).toBeDefined();
  expect(jobs['macos-arm-smoke']).toMatchObject({ 'runs-on': 'macos-14' });
  const job = requireJob(document);
  expect(job['runs-on']).toBe('ubuntu-24.04');
  const steps = requireSteps(job);
  const runs = steps.flatMap((step) =>
    typeof step['run'] === 'string' ? [step['run']] : [],
  );
  const uses = steps.flatMap((step) =>
    typeof step['uses'] === 'string' ? [step['uses']] : [],
  );

  expect(runs).toContain('npm ci');
  expect(runs).toContain(
    'npm run benchmark:snapshot-revalidation -- --mode authoritative-ci',
  );
  expect(runs).toContain(
    'node tools/benchmark/write-snapshot-revalidation-provenance.mjs',
  );
  const provenanceWriter = readFileSync(provenanceWriterPath, 'utf8');
  expect(provenanceWriter).toContain(
    'snapshot-revalidation-provenance-v1.json',
  );
  expect(provenanceWriter).toContain(
    "requiredExact('GITHUB_REPOSITORY', 'gchigoo/repo-nav')",
  );
  expect(provenanceWriter).toContain(
    "requiredExact('GITHUB_WORKFLOW', 'package-release-ci')",
  );
  expect(provenanceWriter).toContain(
    "requiredExact('GITHUB_JOB', 'snapshot-revalidation-benchmark')",
  );
  expect(provenanceWriter).toContain("required('GITHUB_SHA')");
  expect(provenanceWriter).toContain("required('GITHUB_RUN_ID')");
  expect(provenanceWriter).toContain("required('GITHUB_RUN_ATTEMPT')");
  expect(provenanceWriter).toContain("requiredExact('GITHUB_REPOSITORY'");
  expect(provenanceWriter).toContain("requiredExact('GITHUB_WORKFLOW'");
  expect(provenanceWriter).toContain("requiredExact('GITHUB_JOB'");
  expect(provenanceWriter).toContain('catalogSha256');
  expect(provenanceWriter).toContain('reportSha256');

  expect(uses).toContain(checkoutPin);
  expect(uses).toContain(setupNodePin);
  expect(uses).toContain(uploadArtifactPin);
  const setupNode = steps.find((step) => step['uses'] === setupNodePin);
  expect(setupNode?.['with']).toMatchObject({ 'node-version': 22 });

  const upload = steps.find((step) => step['uses'] === uploadArtifactPin);
  expect(upload?.['with']).toMatchObject({
    name: 'snapshot-revalidation-candidate-v1',
    path: expect.stringContaining(
      'test-artifacts/benchmark/snapshot-revalidation-candidate-v1.json',
    ),
    'if-no-files-found': 'error',
    'retention-days': 7,
  });
  expect((upload?.['with'] as Record<string, unknown>)['path']).toEqual(
    expect.stringContaining(
      'test-artifacts/benchmark/snapshot-revalidation-provenance-v1.json',
    ),
  );
}

describe.runIf(selected)(
  'snapshot revalidation authoritative benchmark workflow',
  () => {
    it('pins the Ubuntu Node 22 report and provenance artifact contract', () => {
      const document = loadWorkflow();
      assertSnapshotBenchmarkJob(document);

      const mutations: Record<string, unknown>[] = [];
      const missingJob = structuredClone(document);
      delete (missingJob['jobs'] as Record<string, unknown>)[
        'snapshot-revalidation-benchmark'
      ];
      mutations.push(missingJob);

      for (const mutate of [
        (job: Record<string, unknown>) => {
          job['runs-on'] = 'ubuntu-latest';
        },
        (job: Record<string, unknown>) => {
          const steps = requireSteps(job);
          job['steps'] = steps.filter((step) => step['run'] !== 'npm ci');
        },
        (job: Record<string, unknown>) => {
          const steps = requireSteps(job);
          job['steps'] = steps.filter(
            (step) =>
              step['run'] !==
              'npm run benchmark:snapshot-revalidation -- --mode authoritative-ci',
          );
        },
        (job: Record<string, unknown>) => {
          const steps = requireSteps(job);
          job['steps'] = steps.filter(
            (step) =>
              step['run'] !==
              'node tools/benchmark/write-snapshot-revalidation-provenance.mjs',
          );
        },
        (job: Record<string, unknown>) => {
          const steps = requireSteps(job);
          const checkout = steps.find((step) => step['uses'] === checkoutPin);
          if (checkout !== undefined) {
            checkout['uses'] = 'actions/checkout@main';
          }
        },
        (job: Record<string, unknown>) => {
          const steps = requireSteps(job);
          const setupNode = steps.find((step) => step['uses'] === setupNodePin);
          if (setupNode !== undefined) {
            setupNode['uses'] = 'actions/setup-node@main';
          }
        },
        (job: Record<string, unknown>) => {
          const steps = requireSteps(job);
          const upload = steps.find(
            (step) => step['uses'] === uploadArtifactPin,
          );
          if (upload !== undefined) {
            upload['uses'] = 'actions/upload-artifact@main';
          }
        },
        (job: Record<string, unknown>) => {
          const steps = requireSteps(job);
          const upload = steps.find(
            (step) => step['uses'] === uploadArtifactPin,
          );
          const withValue = upload?.['with'];
          if (
            typeof withValue === 'object' &&
            withValue !== null &&
            !Array.isArray(withValue)
          ) {
            (withValue as Record<string, unknown>)['path'] =
              'test-artifacts/benchmark/snapshot-revalidation-candidate-v1.json';
          }
        },
      ]) {
        const mutation = structuredClone(document);
        mutate(requireJob(mutation));
        mutations.push(mutation);
      }

      for (const mutation of mutations) {
        expect(() => assertSnapshotBenchmarkJob(mutation)).toThrow();
      }
    });

    it('binds provenance to the authoritative report, catalog, and GitHub runtime identity', () => {
      const catalogSha256 = computeRealRepoBenchmarkCatalogSha256(catalogPath);
      const workspace = mkdtempSync(
        resolve(tmpdir(), 'repo-nav-snapshot-provenance-'),
      );
      try {
        const report = authoritativeReportFixture(catalogSha256);
        const success = runProvenanceWriter({ workspace, report });
        expect(success.status, success.stderr).toBe(0);
        const provenance = JSON.parse(
          readFileSync(
            resolve(
              workspace,
              'test-artifacts/benchmark/snapshot-revalidation-provenance-v1.json',
            ),
            'utf8',
          ),
        ) as Record<string, unknown>;
        expect(provenance).toMatchObject({
          schemaVersion: 1,
          repository: 'gchigoo/repo-nav',
          workflow: 'package-release-ci',
          job: 'snapshot-revalidation-benchmark',
          artifactName: 'snapshot-revalidation-candidate-v1',
          headSha: 'a'.repeat(40),
          runId: 123,
          runAttempt: 2,
          catalogSha256,
          reportSha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
        });

        for (const mutation of [
          {
            report: { ...report, selected: 'conditional-digest' },
          },
          {
            report: { ...report, catalogSha256: 'b'.repeat(64) },
          },
          {
            report: {
              ...report,
              environment: { ...report.environment, nodeMajor: 24 },
            },
          },
          {
            report,
            environment: { GITHUB_JOB: 'package-release' },
          },
          {
            report,
            environment: { GITHUB_SHA: 'not-a-sha' },
          },
        ]) {
          const result = runProvenanceWriter({
            workspace,
            report: mutation.report,
            ...(mutation.environment === undefined
              ? {}
              : { environment: mutation.environment }),
          });
          expect(result.status).not.toBe(0);
        }
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });
  },
);
