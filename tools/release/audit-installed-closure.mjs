/**
 * Production installed audit gate using the pinned npm CLI and explicit policy.
 * Packs the current candidate, installs it in a temporary consumer, audits the
 * installed production closure, and evaluates valid npm audit JSON even when
 * npm exits nonzero because vulnerabilities were reported.
 */
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateProductionAudit } from './production-audit-policy.mjs';
import { releaseEvidenceCandidateV1 } from './release-evidence-schema.mjs';
import {
  ensureReleaseCandidateV1,
  installReleaseCandidateV1,
} from './release-candidate.mjs';

const modulePath = fileURLToPath(import.meta.url);
const root = join(dirname(modulePath), '../..');
const npmCli = join(root, 'node_modules/npm/bin/npm-cli.js');
const policyPath = join(root, 'tools/release/production-audit-policy.json');
const tempParent = join(root, 'test-artifacts');
const evidencePath = join(
  root,
  'test-artifacts/release-evidence/installed-audit-v1.json',
);

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function makeError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
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

function createBaseResult(pkg) {
  return {
    schemaVersion: 1,
    ok: false,
    authority: 'exact-packed-candidate+immutable-copy+fresh-consumer-npm-audit',
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
    schemaVersion: 1,
    authority: 'exact-packed-candidate+immutable-copy+fresh-consumer-npm-audit',
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
  const candidate = ensureReleaseCandidateV1(root, npmCli);
  if (candidate.name !== pkg.name || candidate.version !== pkg.version) {
    throw makeError(
      'candidate-identity-mismatch',
      'release candidate identity mismatch',
    );
  }
  const installed = installReleaseCandidateV1({
    root,
    npmCli,
    candidate,
    consumerRoot: join(workDir, 'consumer'),
    consumerName: 'repo-nav-audit-consumer',
  });

  const audit = spawnSync(
    process.execPath,
    [npmCli, 'audit', '--omit=dev', '--audit-level=moderate', '--json'],
    { cwd: installed.consumerRoot, encoding: 'utf8', shell: false },
  );
  return {
    ...orchestrateInstalledAuditSubprocess({
      audit,
      candidateVersion: candidate.version,
      policy,
      tarballSha256: candidate.tarballSha256,
    }),
    generatedAt: new Date().toISOString(),
    candidate: releaseEvidenceCandidateV1(installed.candidate),
  };
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
  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.ok ? 0 : 1);
}
