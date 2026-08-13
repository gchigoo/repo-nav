import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import {
  AUTHORITATIVE_SELECTION_CHARACTERIZATION_V2,
  UPSTREAM_WORKFLOW_PATHS_V2,
} from '../../testkit/fixtures/repository-hardening-v2/upstream-baseline-contracts-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const CHECKOUT_PIN =
  'actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0';
const SETUP_NODE_PIN =
  'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020';

function readRepositoryFile(path: string): string {
  return readFileSync(resolve(repositoryRoot, path), 'utf8')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n');
}

function workflow(path: string): Record<string, unknown> {
  return parseYaml(readRepositoryFile(path)) as Record<string, unknown>;
}

function workflowJobs(
  document: Readonly<Record<string, unknown>>,
): Readonly<Record<string, Readonly<Record<string, unknown>>>> {
  const jobs = document['jobs'];
  if (typeof jobs !== 'object' || jobs === null || Array.isArray(jobs)) {
    throw new Error('Workflow jobs must be an object.');
  }
  return jobs as Readonly<Record<string, Readonly<Record<string, unknown>>>>;
}

function stepCommands(job: Readonly<Record<string, unknown>>): string {
  const steps = job['steps'];
  if (!Array.isArray(steps)) {
    throw new Error('Workflow job steps must be an array.');
  }
  return steps
    .map((step) =>
      typeof step === 'object' &&
      step !== null &&
      typeof step['run'] === 'string'
        ? step['run']
        : '',
    )
    .join('\n');
}

const selected = isSelected({
  group: 'public-beta-release',
  caseId: 'upstream-baseline-contract',
});

describe.runIf(selected)('R1 upstream 1.1.0 baseline contract', () => {
  it('retains the authoritative expanded-hit characterization owners', () => {
    for (const characterization of AUTHORITATIVE_SELECTION_CHARACTERIZATION_V2) {
      const source = readRepositoryFile(characterization.ownerFile);
      for (const testName of characterization.testNames) {
        expect(source).toContain(testName);
      }
    }
  });

  it('retains the non-blocking nightly fixture benchmark workflow', () => {
    const raw = readRepositoryFile(UPSTREAM_WORKFLOW_PATHS_V2.nightlyBenchmark);
    const document = workflow(UPSTREAM_WORKFLOW_PATHS_V2.nightlyBenchmark);
    expect(document['name']).toBe('nightly-real-repo-benchmark');
    expect(raw).toContain("cron: '0 4 * * *'");
    expect(raw).toContain(CHECKOUT_PIN);
    expect(raw).toContain(SETUP_NODE_PIN);
    expect(raw).not.toMatch(/@(?:v\d+|main)\b/u);

    const nightly = workflowJobs(document)['fixture-scenarios-nightly'];
    expect(nightly?.['runs-on']).toBe('ubuntu-24.04');
    expect(nightly?.['continue-on-error']).toBe(true);
    const commands = stepCommands(nightly ?? {});
    expect(commands).toContain('npm ci');
    expect(commands).toContain('npm run build');
    expect(commands).toContain('@vscode/ripgrep@1.15.9');
    expect(commands).toContain('npm run benchmark:fixture-scenarios');
  });

  it('retains the tag-bound release gate without publish authority', () => {
    const raw = readRepositoryFile(UPSTREAM_WORKFLOW_PATHS_V2.releaseTag);
    const document = workflow(UPSTREAM_WORKFLOW_PATHS_V2.releaseTag);
    expect(document['name']).toBe('release-tag-ci');
    expect(raw).toContain("- 'v*'");
    expect(raw).toContain(CHECKOUT_PIN);
    expect(raw).toContain(SETUP_NODE_PIN);
    expect(raw).toContain('persist-credentials: false');
    expect(raw).not.toMatch(/@(?:v\d+|main)\b/u);
    expect(raw).not.toMatch(
      /npm\s+(?:publish|dist-tag)|gh\s+release|git\s+push/iu,
    );

    const releaseGate = workflowJobs(document)['release-gate'];
    expect(releaseGate?.['runs-on']).toBe('ubuntu-24.04');
    const commands = stepCommands(releaseGate ?? {});
    expect(commands).toContain('npm ci');
    expect(commands).toContain('npm run build');
    expect(commands).toContain('npm run package:smoke');
    expect(commands).toContain('npm run package:closure:check');
    expect(commands).toContain('npm run benchmark:fixture-scenarios');
    expect(commands).toContain('node dist/cli/main.js --help');
  });
});
