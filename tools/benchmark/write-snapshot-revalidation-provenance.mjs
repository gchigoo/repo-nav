import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const REPORT_PATH = resolve(
  'test-artifacts/benchmark/snapshot-revalidation-candidate-v1.json',
);
const CATALOG_PATH = resolve('testkit/fixtures/benchmark-repos/catalog.json');
const OUTPUT_PATH = resolve(
  'test-artifacts/benchmark/snapshot-revalidation-provenance-v1.json',
);

function positiveInteger(name, value) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function required(name) {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function requiredExact(name, expected) {
  const value = required(name);
  if (value !== expected) {
    throw new Error(`${name} must be ${expected}`);
  }
  return value;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function readAuthoritativeReport(reportBytes, catalogSha256) {
  const report = JSON.parse(reportBytes.toString('utf8'));
  if (
    typeof report !== 'object' ||
    report === null ||
    Array.isArray(report) ||
    report.schemaVersion !== 1 ||
    report.catalogSha256 !== catalogSha256 ||
    report.selected !== null ||
    typeof report.environment !== 'object' ||
    report.environment === null ||
    Array.isArray(report.environment) ||
    report.environment.runner !== 'ubuntu-24.04' ||
    report.environment.nodeMajor !== 22 ||
    report.environment.platform !== 'linux' ||
    report.environment.arch !== 'x64'
  ) {
    throw new Error(
      'snapshot revalidation report is not an authoritative catalog-bound candidate',
    );
  }
  return report;
}

const repository = requiredExact('GITHUB_REPOSITORY', 'gchigoo/repo-nav');
const workflow = requiredExact('GITHUB_WORKFLOW', 'package-release-ci');
const job = requiredExact('GITHUB_JOB', 'snapshot-revalidation-benchmark');
const headSha = required('GITHUB_SHA');
if (!HEX40.test(headSha)) {
  throw new Error('GITHUB_SHA must be 40 lowercase hexadecimal characters');
}

const catalogBytes = readFileSync(CATALOG_PATH);
const catalogSha256 = sha256(catalogBytes);
if (!HEX64.test(catalogSha256)) {
  throw new Error(
    'catalog SHA-256 must be 64 lowercase hexadecimal characters',
  );
}
const reportBytes = readFileSync(REPORT_PATH);
readAuthoritativeReport(reportBytes, catalogSha256);

const provenance = Object.freeze({
  schemaVersion: 1,
  repository,
  workflow,
  job,
  artifactName: 'snapshot-revalidation-candidate-v1',
  headSha,
  runId: positiveInteger('GITHUB_RUN_ID', required('GITHUB_RUN_ID')),
  runAttempt: positiveInteger(
    'GITHUB_RUN_ATTEMPT',
    required('GITHUB_RUN_ATTEMPT'),
  ),
  catalogSha256,
  reportSha256: sha256(reportBytes),
});
mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, `${JSON.stringify(provenance, null, 2)}\n`, 'utf8');
process.stdout.write(`${OUTPUT_PATH}\n`);
