/**
 * Production installed audit gate using the pinned npm CLI and explicit policy.
 * Packs the current candidate, installs it in a temporary consumer, audits the
 * installed production closure, and evaluates valid npm audit JSON even when
 * npm exits nonzero because vulnerabilities were reported.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateProductionAudit } from './production-audit-policy.mjs';

const modulePath = fileURLToPath(import.meta.url);
const root = join(dirname(modulePath), '../..');
const npmCli = join(root, 'node_modules/npm/bin/npm-cli.js');
const policyPath = join(root, 'tools/release/production-audit-policy.json');
const tempParent = join(root, 'test-artifacts');

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function makeError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function runNpmChecked(args, options = {}) {
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, ...(options.env ?? {}) },
  });
  if (result.error) {
    throw makeError('npm-spawn-failed', result.error.message, { args });
  }
  if (result.signal !== null || result.status !== 0) {
    throw makeError('npm-command-failed', `npm ${args.join(' ')} failed`, {
      args,
      signal: result.signal,
      status: result.status,
      stderr: String(result.stderr ?? '').slice(0, 2000),
      stdout: String(result.stdout ?? '').slice(0, 2000),
    });
  }
  return result.stdout;
}

function parseJsonText(text, code, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw makeError(code, `${label} JSON parse failed`, {
      bytes: Buffer.byteLength(String(text ?? ''), 'utf8'),
      cause: errorMessage(error),
    });
  }
}

export function parseInstalledAuditJson(stdout) {
  return parseJsonText(stdout, 'audit-json-invalid-or-truncated', 'npm audit');
}

function parsePolicy() {
  return parseJsonText(
    readFileSync(policyPath, 'utf8'),
    'policy-json-invalid',
    'production audit policy',
  );
}

function parsePackInfo(stdout) {
  const parsed = parseJsonText(stdout, 'pack-json-invalid', 'npm pack');
  const info = Array.isArray(parsed) ? parsed[0] : parsed;
  if (
    info === null ||
    typeof info !== 'object' ||
    typeof info.filename !== 'string' ||
    info.filename.length === 0
  ) {
    throw makeError('pack-json-schema-invalid', 'npm pack JSON shape invalid');
  }
  return info;
}

function assertPathInside(parent, child) {
  const resolvedParent = resolve(parent);
  const resolvedChild = resolve(child);
  if (
    resolvedChild !== resolvedParent &&
    !resolvedChild.startsWith(`${resolvedParent}${sep}`)
  ) {
    throw makeError('path-containment-failed', 'npm pack output escaped temp');
  }
}

function createBaseResult(pkg) {
  return {
    ok: false,
    candidateVersion: pkg.version,
    tarballSha256: null,
    auditExitStatus: null,
    counts: null,
    low: null,
    moderate: null,
    high: null,
    critical: null,
    blockingFindings: null,
    disposedFindings: null,
    failures: [],
  };
}

function isCompleteCounts(counts) {
  return (
    counts !== null &&
    typeof counts === 'object' &&
    Number.isInteger(counts.moderate) &&
    counts.moderate >= 0 &&
    Number.isInteger(counts.high) &&
    counts.high >= 0 &&
    Number.isInteger(counts.critical) &&
    counts.critical >= 0
  );
}

function blockingCount(counts) {
  return counts.moderate + counts.high + counts.critical;
}

function evidenceCount(evaluation) {
  return (
    (Array.isArray(evaluation?.blockingFindings)
      ? evaluation.blockingFindings.length
      : 0) +
    (Array.isArray(evaluation?.disposedFindings)
      ? evaluation.disposedFindings.length
      : 0)
  );
}

export function classifyInstalledAuditSubprocess(audit, evaluation) {
  const failures = [];
  if (audit?.error !== undefined && audit.error !== null) {
    failures.push('audit-spawn-failed');
    return Object.freeze({ ok: false, failures: Object.freeze(failures) });
  }
  if (audit?.signal !== null && audit?.signal !== undefined) {
    failures.push(`audit-subprocess-signal:${audit.signal}`);
  }
  if (typeof audit?.stderr !== 'string' || audit.stderr.trim().length > 0) {
    failures.push('audit-subprocess-stderr-nonempty');
  }
  if (!Number.isInteger(audit?.status)) {
    failures.push('audit-subprocess-status-missing');
  }
  if (failures.length > 0) {
    return Object.freeze({ ok: false, failures: Object.freeze(failures) });
  }

  const counts = evaluation?.counts;
  const completeCounts = isCompleteCounts(counts);
  const reportConsistent = evaluation?.auditOk === true && completeCounts;
  const count = completeCounts ? blockingCount(counts) : null;
  if (!reportConsistent) {
    failures.push('audit-subprocess-report-inconsistent');
  }

  if (audit.status === 0) {
    if (completeCounts && count !== 0) {
      failures.push('audit-subprocess-status-0-with-blocking-counts');
    }
  } else if (audit.status === 1) {
    if (completeCounts && count === 0) {
      failures.push('audit-subprocess-status-1-without-blocking-counts');
    }
    if (reportConsistent && evidenceCount(evaluation) === 0) {
      failures.push('audit-subprocess-status-1-without-blocking-evidence');
    }
  } else {
    failures.push(`audit-subprocess-status-unsupported:${audit.status}`);
  }

  return Object.freeze({
    ok: failures.length === 0,
    failures: Object.freeze(failures),
  });
}

export function applyInstalledAuditCleanupFailure(result, cleanupFailure) {
  if (cleanupFailure === null || cleanupFailure === undefined) return result;
  return {
    ...result,
    ok: false,
    failures: [
      ...(Array.isArray(result.failures) ? result.failures : []),
      `cleanup-failed:${errorMessage(cleanupFailure)}`,
    ],
  };
}

export function orchestrateInstalledAuditSubprocess(input) {
  const { audit, candidateVersion, policy, tarballSha256, now } = input;
  const parseFailures = [];
  let evaluation = null;

  try {
    const auditReport = parseInstalledAuditJson(audit?.stdout ?? '');
    evaluation = evaluateProductionAudit(auditReport, policy, now);
  } catch (error) {
    parseFailures.push(error.code ?? 'audit-json-invalid-or-truncated');
  }

  const statusClassification = classifyInstalledAuditSubprocess(
    audit,
    evaluation,
  );
  const counts = evaluation?.counts ?? null;
  const failures = [
    ...parseFailures,
    ...statusClassification.failures,
    ...(Array.isArray(evaluation?.failures) ? evaluation.failures : []),
  ];

  return {
    ok:
      parseFailures.length === 0 &&
      statusClassification.ok &&
      evaluation?.ok === true,
    candidateVersion,
    tarballSha256,
    auditExitStatus: Number.isInteger(audit?.status) ? audit.status : null,
    counts,
    low: counts?.low ?? null,
    moderate: counts?.moderate ?? null,
    high: counts?.high ?? null,
    critical: counts?.critical ?? null,
    blockingFindings: Array.isArray(evaluation?.blockingFindings)
      ? evaluation.blockingFindings.length
      : null,
    disposedFindings: Array.isArray(evaluation?.disposedFindings)
      ? evaluation.disposedFindings.length
      : null,
    failures,
  };
}

function runInstalledAudit(workDir, pkg) {
  const policy = parsePolicy();
  const packDir = join(workDir, 'pack');
  const consumerDir = join(workDir, 'consumer');
  mkdirSync(packDir, { recursive: true });
  mkdirSync(consumerDir, { recursive: true });

  const packInfo = parsePackInfo(
    runNpmChecked(['pack', '--json', '--pack-destination', packDir]),
  );
  if (packInfo.name !== pkg.name || packInfo.version !== pkg.version) {
    throw makeError('pack-identity-mismatch', 'npm pack identity mismatch', {
      packName: packInfo.name,
      packVersion: packInfo.version,
      packageName: pkg.name,
      packageVersion: pkg.version,
    });
  }
  const tarballPath = resolve(packDir, packInfo.filename);
  assertPathInside(packDir, tarballPath);
  const tarballSha256 = createHash('sha256')
    .update(readFileSync(tarballPath))
    .digest('hex');

  writeFileSync(
    join(consumerDir, 'package.json'),
    `${JSON.stringify({ name: 'repo-nav-audit-consumer', private: true }, null, 2)}\n`,
  );
  runNpmChecked(
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarballPath],
    { cwd: consumerDir },
  );

  const audit = spawnSync(
    process.execPath,
    [npmCli, 'audit', '--omit=dev', '--audit-level=moderate', '--json'],
    { cwd: consumerDir, encoding: 'utf8', shell: false },
  );
  return orchestrateInstalledAuditSubprocess({
    audit,
    candidateVersion: pkg.version,
    policy,
    tarballSha256,
  });
}

function main() {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  let result = createBaseResult(pkg);
  let workDir = null;
  let cleanupFailure = null;

  try {
    if (pkg.private !== false) {
      throw makeError(
        'package-private-invalid',
        'private must be false for public beta',
      );
    }
    mkdirSync(tempParent, { recursive: true });
    workDir = mkdtempSync(join(tempParent, 'installed-audit-'));
    result = runInstalledAudit(workDir, pkg);
  } catch (error) {
    result = {
      ...result,
      ok: false,
      failures: error.details?.failures ?? [
        error.code ?? 'audit-installed-closure-failed',
      ],
      error: errorMessage(error),
      details: error.details ?? {},
    };
  } finally {
    if (workDir !== null) {
      try {
        rmSync(workDir, { recursive: true, force: true });
      } catch (error) {
        cleanupFailure = error;
      }
    }
  }

  return applyInstalledAuditCleanupFailure(result, cleanupFailure);
}

if (process.argv[1] === modulePath) {
  const result = main();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.ok ? 0 : 1);
}
