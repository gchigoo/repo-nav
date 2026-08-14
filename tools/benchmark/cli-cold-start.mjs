import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const cliPath = join(repositoryRoot, 'dist', 'cli', 'main.js');
const executeModuleUrl = pathToFileURL(
  join(repositoryRoot, 'dist', 'cli', 'execute.js'),
).href;
const artifactPath = join(
  repositoryRoot,
  'test-artifacts',
  'benchmark',
  'cli-cold-start-v1.json',
);
const SAMPLE_COUNT = 20;
const REPORT_KEYS = Object.freeze([
  'application',
  'commands',
  'package',
  'sampleCount',
  'schemaVersion',
]);

function requireExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new Error(`${label} has invalid keys.`);
  }
}

function requireFinitePositive(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be finite and positive.`);
  }
  return value;
}

function requireNonnegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a nonnegative integer.`);
  }
  return value;
}

function validateCommandSamples(value, label) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  requireExactKeys(value, ['medianMs', 'p90Ms', 'samplesMs'], label);
  if (
    !Array.isArray(value.samplesMs) ||
    value.samplesMs.length !== SAMPLE_COUNT
  ) {
    throw new Error(`${label}.samplesMs must contain ${SAMPLE_COUNT} samples.`);
  }
  value.samplesMs.forEach((sample, index) =>
    requireFinitePositive(sample, `${label}.samplesMs[${index}]`),
  );
  const expected = summarize(value.samplesMs);
  if (!Object.is(value.medianMs, expected.medianMs)) {
    throw new Error(`${label}.medianMs does not match samples.`);
  }
  if (!Object.is(value.p90Ms, expected.p90Ms)) {
    throw new Error(`${label}.p90Ms does not match samples.`);
  }
}

function validateApplicationMeasurement(value, label) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  requireExactKeys(value, ['applicationLoaderCount', 'maxRssKilobytes'], label);
  requireFinitePositive(value.maxRssKilobytes, `${label}.maxRssKilobytes`);
  if (value.applicationLoaderCount !== 0) {
    throw new Error(`${label}.applicationLoaderCount must be zero.`);
  }
}

export function validateCliColdStartReport(report) {
  if (typeof report !== 'object' || report === null || Array.isArray(report)) {
    throw new Error('CLI cold-start report must be an object.');
  }
  requireExactKeys(report, REPORT_KEYS, 'CLI cold-start report');
  if (report.schemaVersion !== 1) {
    throw new Error('CLI cold-start report schemaVersion must be 1.');
  }
  if (report.sampleCount !== SAMPLE_COUNT) {
    throw new Error(`sampleCount must be ${SAMPLE_COUNT}.`);
  }
  if (
    typeof report.commands !== 'object' ||
    report.commands === null ||
    Array.isArray(report.commands)
  ) {
    throw new Error('commands must be an object.');
  }
  requireExactKeys(
    report.commands,
    ['bareNode', 'help', 'version'],
    'commands',
  );
  validateCommandSamples(report.commands.bareNode, 'commands.bareNode');
  validateCommandSamples(report.commands.help, 'commands.help');
  validateCommandSamples(report.commands.version, 'commands.version');
  if (
    typeof report.application !== 'object' ||
    report.application === null ||
    Array.isArray(report.application)
  ) {
    throw new Error('application must be an object.');
  }
  requireExactKeys(report.application, ['help', 'version'], 'application');
  validateApplicationMeasurement(report.application.help, 'application.help');
  validateApplicationMeasurement(
    report.application.version,
    'application.version',
  );
  if (
    typeof report.package !== 'object' ||
    report.package === null ||
    Array.isArray(report.package)
  ) {
    throw new Error('package must be an object.');
  }
  requireExactKeys(
    report.package,
    ['entryCount', 'packedBytes', 'unpackedBytes'],
    'package',
  );
  requireNonnegativeInteger(report.package.entryCount, 'package.entryCount');
  requireFinitePositive(report.package.packedBytes, 'package.packedBytes');
  requireFinitePositive(report.package.unpackedBytes, 'package.unpackedBytes');
  return report;
}

export function readCheckedChildResult(result, label) {
  if (result.status !== 0) {
    throw new Error(
      `${label} failed: ${String(result.stderr || result.stdout).trim()}`,
    );
  }
  if (result.stderr !== '') {
    throw new Error(`${label} wrote to stderr.`);
  }
  if (typeof result.stdout !== 'string') {
    throw new Error(`${label} returned non-text stdout.`);
  }
  return result.stdout;
}

function runChecked(args, label) {
  return readCheckedChildResult(
    spawnSync(process.execPath, args, {
      cwd: repositoryRoot,
      encoding: 'utf8',
      shell: false,
    }),
    label,
  );
}

export function parseCheckedJson(text, label) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} returned malformed JSON.`);
  }
}

function percentile(sorted, fraction) {
  const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index];
}

function summarize(samples) {
  const sorted = [...samples].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];
  return {
    samplesMs: samples,
    medianMs: median,
    p90Ms: percentile(sorted, 0.9),
  };
}

function measureCommand(args, label) {
  const samples = [];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const started = performance.now();
    runChecked(args, `${label} sample ${index + 1}`);
    samples.push(performance.now() - started);
  }
  return summarize(samples);
}

function measureApplicationFastPath(argument) {
  const source = `
    const { executeCli } = await import(${JSON.stringify(executeModuleUrl)});
    let applicationLoaderCount = 0;
    const result = await executeCli(
      [${JSON.stringify(argument)}],
      new AbortController().signal,
      {
        loadApplicationAdapter: async () => {
          applicationLoaderCount += 1;
          throw new Error('application adapter must not load');
        },
      },
    );
    if (result.exitCode !== 0) process.exit(3);
    process.stdout.write(JSON.stringify({
      maxRssKilobytes: process.resourceUsage().maxRSS,
      applicationLoaderCount,
    }));
  `;
  const output = runChecked(
    ['--input-type=module', '-e', source],
    `application ${argument}`,
  );
  return parseCheckedJson(output, `application ${argument}`);
}

function packageDryRun() {
  const output = runChecked(
    [
      join(repositoryRoot, 'tools', 'release', 'pack-candidate.mjs'),
      '--dry-run',
    ],
    'package dry-run',
  );
  const report = parseCheckedJson(output, 'package dry-run');
  return {
    entryCount: report.entryCount,
    packedBytes: report.packed,
    unpackedBytes: report.unpacked,
  };
}

export function runCliColdStartBenchmark() {
  const report = validateCliColdStartReport({
    schemaVersion: 1,
    sampleCount: SAMPLE_COUNT,
    commands: {
      bareNode: measureCommand(['-e', ''], 'bare node'),
      help: measureCommand([cliPath, '--help'], 'CLI help'),
      version: measureCommand([cliPath, '--version'], 'CLI version'),
    },
    application: {
      help: measureApplicationFastPath('--help'),
      version: measureApplicationFastPath('--version'),
    },
    package: packageDryRun(),
  });
  mkdirSync(dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const report = runCliColdStartBenchmark();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
