import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SBOM_SPEC_VERSION_V2 } from '../../testkit/fixtures/release-v2/dependency-closure-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';
import {
  evaluateProductionAudit,
  validateProductionAuditPolicy,
  // @ts-expect-error missing declaration file for untyped .mjs module
} from '../../tools/release/production-audit-policy.mjs';
import {
  applyInstalledAuditCleanupFailure,
  orchestrateInstalledAuditSubprocess,
  parseInstalledAuditJson,
  // @ts-expect-error missing declaration file for untyped .mjs module
} from '../../tools/release/audit-installed-closure.mjs';

const root = resolve(import.meta.dirname, '../..');
const now = new Date('2026-08-07T00:00:00.000Z');

type AuditSeverity = 'low' | 'moderate' | 'high' | 'critical';
type AuditCountSeverity = 'info' | AuditSeverity;
type DependencyCountKey =
  'dev' | 'optional' | 'peer' | 'peerOptional' | 'prod' | 'total';
type JsonObject = Record<string, unknown>;

const defaultPolicy = Object.freeze({
  schemaVersion: 1,
  blockingSeverities: ['moderate', 'high', 'critical'],
  dispositions: [],
});

function validDisposition(overrides: Record<string, string> = {}) {
  return {
    advisoryId: '1123001',
    packageName: 'vulnerable-lib',
    installedPath: 'node_modules/vulnerable-lib',
    affectedRange: '<1.0.0',
    rationale: 'Pinned false-positive window for synthetic test only.',
    owner: 'release-security',
    createdOn: '2026-08-01',
    expiresOn: '2026-09-01',
    ...overrides,
  };
}

function countBag(
  overrides: Partial<Record<AuditCountSeverity | 'total', number>> = {},
): Record<AuditCountSeverity | 'total', number> {
  return {
    info: 0,
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0,
    total: 0,
    ...overrides,
  };
}

function dependencyCounts(
  overrides: Partial<Record<DependencyCountKey, number>> = {},
): Record<DependencyCountKey, number> {
  return {
    prod: 2,
    dev: 0,
    optional: 0,
    peer: 0,
    peerOptional: 0,
    total: 2,
    ...overrides,
  };
}

function auditAdvisory(
  severity: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    source: 1123001,
    name: 'vulnerable-lib',
    dependency: 'vulnerable-lib',
    title: 'Synthetic advisory',
    url: 'https://github.com/advisories/GHSA-test-test-test',
    severity,
    cwe: ['CWE-400'],
    cvss: {
      score: severity === 'critical' ? 9.8 : severity === 'high' ? 8.1 : 5.4,
      vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L',
    },
    range: '<1.0.0',
    ...overrides,
  };
}

function auditReport(
  severity: AuditSeverity,
  options: {
    readonly advisory?: JsonObject;
    readonly counts?: Partial<Record<AuditCountSeverity | 'total', number>>;
    readonly dependencies?: JsonObject;
    readonly effects?: readonly string[];
    readonly fixAvailable?: unknown;
    readonly nodes?: readonly string[];
    readonly packageName?: string;
    readonly range?: string;
    readonly via?: readonly unknown[];
  } = {},
): JsonObject {
  const packageName = options.packageName ?? 'vulnerable-lib';
  const counts = countBag({ [severity]: 1, total: 1 });
  const range = options.range ?? '<1.0.0';
  const advisory =
    options.advisory ??
    auditAdvisory(severity, {
      name: packageName,
      dependency: packageName,
      range,
    });
  return {
    auditReportVersion: 2,
    vulnerabilities: {
      [packageName]: {
        name: packageName,
        severity,
        isDirect: false,
        via: options.via ?? [advisory],
        effects: options.effects ?? [],
        range,
        nodes: options.nodes ?? [`node_modules/${packageName}`],
        fixAvailable: options.fixAvailable ?? true,
      },
    },
    metadata: {
      vulnerabilities: { ...counts, ...options.counts },
      dependencies: options.dependencies ?? dependencyCounts(),
    },
  };
}

function emptyAuditReport(): JsonObject {
  return {
    auditReportVersion: 2,
    vulnerabilities: {},
    metadata: {
      vulnerabilities: countBag(),
      dependencies: dependencyCounts({ prod: 1, total: 1 }),
    },
  };
}

function vulnerabilityRecord(
  report: JsonObject,
  packageName: string,
): JsonObject {
  const vulnerabilities = report.vulnerabilities;
  if (
    vulnerabilities === null ||
    typeof vulnerabilities !== 'object' ||
    Array.isArray(vulnerabilities)
  ) {
    throw new Error('test audit vulnerabilities missing');
  }
  const record = (vulnerabilities as Record<string, unknown>)[packageName];
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error(`test audit vulnerability missing: ${packageName}`);
  }
  return record as JsonObject;
}

function metaAuditReport(
  options: {
    readonly directVia?: readonly unknown[];
    readonly metaVia?: readonly unknown[];
  } = {},
): JsonObject {
  const direct = vulnerabilityRecord(auditReport('moderate'), 'vulnerable-lib');
  const metaRange = '<2.0.0';
  return {
    auditReportVersion: 2,
    vulnerabilities: {
      'meta-lib': {
        name: 'meta-lib',
        severity: 'moderate',
        isDirect: false,
        via: options.metaVia ?? ['vulnerable-lib'],
        effects: ['vulnerable-lib'],
        range: metaRange,
        nodes: ['node_modules/meta-lib'],
        fixAvailable: {
          name: 'meta-lib',
          version: '2.0.0',
          isSemVerMajor: false,
        },
      },
      'vulnerable-lib': {
        ...direct,
        via: options.directVia ?? direct.via,
      },
    },
    metadata: {
      vulnerabilities: countBag({ moderate: 2, total: 2 }),
      dependencies: dependencyCounts({ prod: 3, total: 3 }),
    },
  };
}

function policyWithDispositions(
  dispositions: readonly Record<string, string>[],
) {
  return {
    schemaVersion: 1,
    blockingSeverities: ['moderate', 'high', 'critical'],
    dispositions,
  };
}

function sourceDisposition(
  advisoryId: string,
  overrides: Record<string, string> = {},
) {
  return validDisposition({ advisoryId, ...overrides });
}

function capturedAudit(
  stdout: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    error: null,
    signal: null,
    status: 0,
    stderr: '',
    stdout,
    ...overrides,
  };
}

function orchestrateAudit(
  stdout: string,
  overrides: Record<string, unknown> = {},
  policy: JsonObject = defaultPolicy,
) {
  return orchestrateInstalledAuditSubprocess({
    audit: capturedAudit(stdout, overrides),
    candidateVersion: '1.1.0',
    policy,
    tarballSha256: 'a'.repeat(64),
    now,
  });
}

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'installed-audit' }),
)('F9-AUDIT-001 installed-audit', () => {
  it('pins MCP SDK dependency and shrinkwrap authorities to exact 1.30.0', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
    const wrap = JSON.parse(
      readFileSync(resolve(root, 'npm-shrinkwrap.json'), 'utf8'),
    );
    expect(pkg.dependencies?.['@modelcontextprotocol/sdk']).toBe('1.30.0');
    expect(
      wrap.packages?.['']?.dependencies?.['@modelcontextprotocol/sdk'],
    ).toBe('1.30.0');
    expect(
      wrap.packages?.['node_modules/@modelcontextprotocol/sdk']?.version,
    ).toBe('1.30.0');
    expect(
      wrap.packages?.['node_modules/@modelcontextprotocol/sdk']?.integrity,
    ).toMatch(/^sha512-/u);
    expect(existsSync(resolve(root, 'package-lock.json'))).toBe(false);
  });

  it('strictly validates production audit policy shape', () => {
    expect(validateProductionAuditPolicy(defaultPolicy).ok).toBe(true);
    expect(
      validateProductionAuditPolicy({ ...defaultPolicy, dispositions: {} }).ok,
    ).toBe(false);
    expect(
      validateProductionAuditPolicy({
        ...defaultPolicy,
        blockingSeverities: ['high', 'critical'],
      }).failures,
    ).toContain('policy-blocking-severities-invalid');
    expect(
      validateProductionAuditPolicy(
        policyWithDispositions([
          { ...validDisposition(), note: 'not allowed' },
        ]),
      ).failures,
    ).toContain('disposition-keys-mismatch:0');
    expect(
      validateProductionAuditPolicy(
        policyWithDispositions([validDisposition({ affectedRange: '*' })]),
      ).failures,
    ).toContain('disposition-field-wildcard:0:affectedRange');
  });

  it('blocks undisposed moderate findings and never disposes high or critical findings', () => {
    const moderate = auditReport('moderate');
    const undisposed = evaluateProductionAudit(moderate, defaultPolicy, now);
    expect(undisposed.ok).toBe(false);
    expect(undisposed.counts.moderate).toBe(1);
    expect(undisposed.blockingFindings).toHaveLength(1);

    const disposedModerate = evaluateProductionAudit(
      moderate,
      policyWithDispositions([validDisposition()]),
      now,
    );
    expect(disposedModerate.ok).toBe(true);
    expect(disposedModerate.disposedFindings).toHaveLength(1);

    for (const severity of ['high', 'critical'] as const) {
      const result = evaluateProductionAudit(
        auditReport(severity),
        policyWithDispositions([validDisposition()]),
        now,
      );
      expect(result.ok).toBe(false);
      expect(result.failures).toContain(
        `disposition-non-moderate:0:${severity}`,
      );
      expect(result.blockingFindings).toHaveLength(1);
    }

    const lowOnly = evaluateProductionAudit(
      auditReport('low'),
      defaultPolicy,
      now,
    );
    expect(lowOnly.ok).toBe(true);
    expect(lowOnly.counts.low).toBe(1);
    expect(lowOnly.blockingFindings).toHaveLength(0);
  });

  it('reconciles vulnerability counts, severities, and actionable findings', () => {
    const highEmpty = {
      ...auditReport('high'),
      vulnerabilities: {},
    };
    const highEmptyResult = evaluateProductionAudit(
      highEmpty,
      defaultPolicy,
      now,
    );
    expect(highEmptyResult.ok).toBe(false);
    expect(highEmptyResult.failures).toContain(
      'audit-vulnerability-record-count-mismatch:high:metadata-1:records-0',
    );

    const moderateEmpty = {
      ...auditReport('moderate'),
      vulnerabilities: {},
    };
    const moderateEmptyResult = evaluateProductionAudit(
      moderateEmpty,
      defaultPolicy,
      now,
    );
    expect(moderateEmptyResult.ok).toBe(false);
    expect(moderateEmptyResult.failures).toContain(
      'audit-vulnerability-record-count-mismatch:moderate:metadata-1:records-0',
    );

    const severityMismatch = auditReport('high', {
      counts: { high: 0, moderate: 1 },
    });
    const severityMismatchResult = evaluateProductionAudit(
      severityMismatch,
      defaultPolicy,
      now,
    );
    expect(severityMismatchResult.ok).toBe(false);
    expect(severityMismatchResult.failures).toContain(
      'audit-vulnerability-record-count-mismatch:moderate:metadata-1:records-0',
    );
    expect(severityMismatchResult.failures).toContain(
      'audit-vulnerability-record-count-mismatch:high:metadata-0:records-1',
    );

    const highWithModerateAdvisory = auditReport('high', {
      advisory: auditAdvisory('moderate'),
    });
    const highDispositionAttempt = evaluateProductionAudit(
      highWithModerateAdvisory,
      policyWithDispositions([validDisposition()]),
      now,
    );
    expect(highDispositionAttempt.ok).toBe(false);
    expect(highDispositionAttempt.disposedFindings).toHaveLength(0);
    expect(highDispositionAttempt.blockingFindings).toHaveLength(1);
    expect(highDispositionAttempt.failures).toContain(
      'audit-resolved-advisory-aggregate-severity-missing:vulnerable-lib:high',
    );
    expect(highDispositionAttempt.failures).toContain(
      'disposition-non-moderate:0:high',
    );

    const noActionableFinding = auditReport('moderate', { via: [] });
    const noActionableFindingResult = evaluateProductionAudit(
      noActionableFinding,
      defaultPolicy,
      now,
    );
    expect(noActionableFindingResult.ok).toBe(false);
    expect(noActionableFindingResult.failures).toContain(
      'audit-actionable-finding-missing:vulnerable-lib',
    );
  });

  it('accepts npm 11.12.1 aggregate advisory severity and range semantics', () => {
    const aggregateRanges = evaluateProductionAudit(
      auditReport('moderate', {
        range: '<3.0.0',
        via: [
          auditAdvisory('low', { source: 1123001, range: '<1.0.0' }),
          auditAdvisory('moderate', {
            source: 1123002,
            range: '>=2.0.0 <2.5.0',
          }),
        ],
      }),
      policyWithDispositions([
        sourceDisposition('1123001', { affectedRange: '<3.0.0' }),
        sourceDisposition('1123002', { affectedRange: '<3.0.0' }),
      ]),
      now,
    );
    expect(aggregateRanges.ok).toBe(true);
    expect(aggregateRanges.auditOk).toBe(true);
    expect(aggregateRanges.disposedFindings).toHaveLength(2);
    expect(
      aggregateRanges.failures.some((failure: string) =>
        failure.includes('range-mismatch'),
      ),
    ).toBe(false);

    const outerHigh = auditReport('high', {
      range: '<3.0.0',
      via: [
        auditAdvisory('moderate', { source: 1123001, range: '<1.0.0' }),
        auditAdvisory('high', {
          source: 1123002,
          range: '>=2.0.0 <3.0.0',
        }),
      ],
    });
    const highDispositionAttempt = evaluateProductionAudit(
      outerHigh,
      policyWithDispositions([
        sourceDisposition('1123001', { affectedRange: '<3.0.0' }),
        sourceDisposition('1123002', { affectedRange: '<3.0.0' }),
      ]),
      now,
    );
    expect(highDispositionAttempt.auditOk).toBe(true);
    expect(highDispositionAttempt.ok).toBe(false);
    expect(highDispositionAttempt.disposedFindings).toHaveLength(0);
    expect(highDispositionAttempt.blockingFindings).toHaveLength(2);
    expect(highDispositionAttempt.failures).toEqual(
      expect.arrayContaining([
        'disposition-non-moderate:0:high',
        'disposition-non-moderate:1:high',
      ]),
    );

    const lowerRangeDispositionAttempt = evaluateProductionAudit(
      outerHigh,
      policyWithDispositions([
        sourceDisposition('1123001', { affectedRange: '<1.0.0' }),
      ]),
      now,
    );
    expect(lowerRangeDispositionAttempt.ok).toBe(false);
    expect(lowerRangeDispositionAttempt.failures).toContain(
      'disposition-unused:0',
    );
    expect(lowerRangeDispositionAttempt.blockingFindings).toHaveLength(2);

    for (const severity of ['high', 'critical'] as const) {
      const nonDisposableOuter = evaluateProductionAudit(
        auditReport(severity, {
          range: '<9.0.0',
          via: [
            auditAdvisory('moderate', {
              source: 1123003,
              range: '<1.0.0',
            }),
            auditAdvisory(severity, {
              source: 1123004,
              range: '>=8.0.0 <9.0.0',
            }),
          ],
        }),
        policyWithDispositions([
          sourceDisposition('1123003', { affectedRange: '<9.0.0' }),
        ]),
        now,
      );
      expect(nonDisposableOuter.auditOk).toBe(true);
      expect(nonDisposableOuter.ok).toBe(false);
      expect(nonDisposableOuter.disposedFindings).toHaveLength(0);
      expect(nonDisposableOuter.failures).toContain(
        `disposition-non-moderate:0:${severity}`,
      );
    }

    const advisoryExceedsOuter = evaluateProductionAudit(
      auditReport('moderate', { via: [auditAdvisory('high')] }),
      defaultPolicy,
      now,
    );
    expect(advisoryExceedsOuter.ok).toBe(false);
    expect(advisoryExceedsOuter.failures).toContain(
      'audit-via-advisory-severity-exceeds-aggregate:vulnerable-lib:0:high:moderate',
    );
    expect(advisoryExceedsOuter.failures).toContain(
      'audit-resolved-advisory-severity-exceeds-aggregate:vulnerable-lib:high:moderate:1123001',
    );
  });

  it('accepts string-reference advisory aggregation with differing severities and ranges', () => {
    const direct = vulnerabilityRecord(
      auditReport('moderate', {
        range: '<5.0.0',
        via: [
          auditAdvisory('low', { source: 1123001, range: '<1.0.0' }),
          auditAdvisory('moderate', {
            source: 1123002,
            range: '>=2.0.0 <3.0.0',
          }),
        ],
      }),
      'vulnerable-lib',
    );
    const aggregatedReference = evaluateProductionAudit(
      {
        auditReportVersion: 2,
        vulnerabilities: {
          'meta-lib': {
            name: 'meta-lib',
            severity: 'moderate',
            isDirect: false,
            via: ['vulnerable-lib'],
            effects: ['vulnerable-lib'],
            range: '<7.0.0',
            nodes: ['node_modules/meta-lib'],
            fixAvailable: false,
          },
          'vulnerable-lib': direct,
        },
        metadata: {
          vulnerabilities: countBag({ moderate: 2, total: 2 }),
          dependencies: dependencyCounts({ prod: 3, total: 3 }),
        },
      },
      policyWithDispositions([
        sourceDisposition('1123001', { affectedRange: '<5.0.0' }),
        sourceDisposition('1123002', { affectedRange: '<5.0.0' }),
        sourceDisposition('1123001', {
          packageName: 'meta-lib',
          installedPath: 'node_modules/meta-lib',
          affectedRange: '<7.0.0',
        }),
        sourceDisposition('1123002', {
          packageName: 'meta-lib',
          installedPath: 'node_modules/meta-lib',
          affectedRange: '<7.0.0',
        }),
      ]),
      now,
    );
    expect(aggregatedReference.ok).toBe(true);
    expect(aggregatedReference.auditOk).toBe(true);
    expect(aggregatedReference.disposedFindings).toHaveLength(4);
  });

  it('accepts pinned npm v2 string via references and strict object shapes', () => {
    const stringOnly = evaluateProductionAudit(
      metaAuditReport(),
      policyWithDispositions([
        validDisposition(),
        validDisposition({
          packageName: 'meta-lib',
          installedPath: 'node_modules/meta-lib',
          affectedRange: '<2.0.0',
        }),
      ]),
      now,
    );
    expect(stringOnly.ok).toBe(true);
    expect(stringOnly.disposedFindings).toHaveLength(2);

    const mixed = evaluateProductionAudit(
      metaAuditReport({
        metaVia: [
          auditAdvisory('moderate', {
            source: 1123002,
            name: 'meta-lib',
            dependency: 'meta-lib',
            range: '<2.0.0',
          }),
          'vulnerable-lib',
        ],
      }),
      policyWithDispositions([
        validDisposition(),
        validDisposition({
          advisoryId: '1123001',
          packageName: 'meta-lib',
          installedPath: 'node_modules/meta-lib',
          affectedRange: '<2.0.0',
        }),
        validDisposition({
          advisoryId: '1123002',
          packageName: 'meta-lib',
          installedPath: 'node_modules/meta-lib',
          affectedRange: '<2.0.0',
        }),
      ]),
      now,
    );
    expect(mixed.ok).toBe(true);
    expect(mixed.disposedFindings).toHaveLength(3);
  });

  it('fails closed on dangling, cyclic, malformed via and dependency/fixAvailable shapes', () => {
    const dangling = evaluateProductionAudit(
      metaAuditReport({ metaVia: ['missing-lib'] }),
      defaultPolicy,
      now,
    );
    expect(dangling.ok).toBe(false);
    expect(dangling.failures).toContain(
      'audit-via-reference-dangling:meta-lib:missing-lib',
    );

    const cyclic = evaluateProductionAudit(
      metaAuditReport({ directVia: ['meta-lib'] }),
      defaultPolicy,
      now,
    );
    expect(cyclic.ok).toBe(false);
    expect(
      cyclic.failures.some((failure: string) =>
        failure.startsWith('audit-via-reference-cycle:'),
      ),
    ).toBe(true);

    const malformedString = evaluateProductionAudit(
      metaAuditReport({ metaVia: [''] }),
      defaultPolicy,
      now,
    );
    expect(malformedString.ok).toBe(false);
    expect(malformedString.failures).toContain(
      'audit-via-entry-invalid:meta-lib:0',
    );

    const missingDependencyCounts = evaluateProductionAudit(
      auditReport('moderate', {
        dependencies: { prod: 1, total: 1 },
      }),
      defaultPolicy,
      now,
    );
    expect(missingDependencyCounts.ok).toBe(false);
    expect(missingDependencyCounts.failures).toContain(
      'audit-dependency-counts-keys-mismatch',
    );

    const extraFixAvailable = evaluateProductionAudit(
      auditReport('moderate', {
        fixAvailable: {
          name: 'vulnerable-lib',
          version: '1.0.0',
          isSemVerMajor: false,
          extra: true,
        },
      }),
      defaultPolicy,
      now,
    );
    expect(extraFixAvailable.ok).toBe(false);
    expect(extraFixAvailable.failures).toContain(
      'audit-vulnerability-fix-available-keys-mismatch:vulnerable-lib',
    );

    const missingFixAvailable = evaluateProductionAudit(
      auditReport('moderate', {
        fixAvailable: {
          name: 'vulnerable-lib',
          isSemVerMajor: false,
        },
      }),
      defaultPolicy,
      now,
    );
    expect(missingFixAvailable.ok).toBe(false);
    expect(missingFixAvailable.failures).toContain(
      'audit-vulnerability-fix-available-keys-mismatch:vulnerable-lib',
    );

    for (const key of [
      'prod',
      'dev',
      'optional',
      'peer',
      'peerOptional',
      'total',
    ] as const) {
      const dependencies: Record<DependencyCountKey, unknown> =
        dependencyCounts();
      dependencies[key] = '0';
      const result = evaluateProductionAudit(
        auditReport('moderate', { dependencies }),
        defaultPolicy,
        now,
      );
      expect(result.ok, key).toBe(false);
      expect(result.failures, key).toContain(
        `audit-dependency-count-invalid:${key}`,
      );
    }

    for (const [field, value] of [
      ['name', 42],
      ['version', false],
      ['isSemVerMajor', 'false'],
    ] as const) {
      const fixAvailable = {
        name: 'vulnerable-lib',
        version: '1.0.0',
        isSemVerMajor: false,
        [field]: value,
      };
      const result = evaluateProductionAudit(
        auditReport('moderate', { fixAvailable }),
        defaultPolicy,
        now,
      );
      expect(result.ok, field).toBe(false);
      expect(result.failures, field).toContain(
        `audit-vulnerability-fix-available-field-invalid:vulnerable-lib:${field}`,
      );
    }

    for (const fixAvailable of [true, false] as const) {
      const result = evaluateProductionAudit(
        auditReport('low', { fixAvailable }),
        defaultPolicy,
        now,
      );
      expect(result.auditOk, String(fixAvailable)).toBe(true);
      expect(result.failures, String(fixAvailable)).not.toContain(
        'audit-vulnerability-field-invalid:vulnerable-lib:fixAvailable',
      );
    }
  });

  it('orchestrates installed audit subprocess status and report contradictions fail-closed', () => {
    const source = readFileSync(
      resolve(root, 'tools/release/audit-installed-closure.mjs'),
      'utf8',
    );
    expect(source).toMatch(
      /function runInstalledAudit[\s\S]*orchestrateInstalledAuditSubprocess\(/u,
    );
    expect(source).toMatch(
      /export function orchestrateInstalledAuditSubprocess[\s\S]*parseInstalledAuditJson[\s\S]*evaluateProductionAudit[\s\S]*classifyInstalledAuditSubprocess[\s\S]*failures/u,
    );

    const cleanStatus0 = orchestrateAudit(JSON.stringify(emptyAuditReport()));
    expect(cleanStatus0.ok).toBe(true);
    expect(cleanStatus0.auditExitStatus).toBe(0);
    expect(cleanStatus0.failures).toEqual([]);

    const status0Blocking = orchestrateAudit(
      JSON.stringify(auditReport('moderate')),
    );
    expect(status0Blocking.ok).toBe(false);
    expect(status0Blocking.failures).toContain(
      'audit-subprocess-status-0-with-blocking-counts',
    );
    expect(status0Blocking.failures).toContain(
      'undisposed-finding:moderate:vulnerable-lib:node_modules/vulnerable-lib:1123001',
    );

    const status1Clean = orchestrateAudit(JSON.stringify(emptyAuditReport()), {
      status: 1,
    });
    expect(status1Clean.ok).toBe(false);
    expect(status1Clean.failures).toContain(
      'audit-subprocess-status-1-without-blocking-counts',
    );

    const status1BlockingReport = auditReport('moderate');
    const status1BlockingEvaluation = evaluateProductionAudit(
      status1BlockingReport,
      defaultPolicy,
      now,
    );
    expect(status1BlockingEvaluation.auditOk).toBe(true);
    expect(status1BlockingEvaluation.ok).toBe(false);

    const status1Blocking = orchestrateAudit(
      JSON.stringify(status1BlockingReport),
      { status: 1 },
    );
    expect(status1Blocking.ok).toBe(false);
    expect(status1Blocking.failures).toEqual([
      'undisposed-finding:moderate:vulnerable-lib:node_modules/vulnerable-lib:1123001',
    ]);
    expect(
      status1Blocking.failures.some(
        (failure: string) =>
          failure.startsWith('audit-subprocess-') ||
          failure === 'audit-spawn-failed',
      ),
    ).toBe(false);

    const status1Disposed = orchestrateAudit(
      JSON.stringify(auditReport('moderate')),
      { status: 1 },
      policyWithDispositions([validDisposition()]),
    );
    expect(status1Disposed.ok).toBe(true);
    expect(status1Disposed.disposedFindings).toBe(1);
    expect(status1Disposed.moderate).toBe(1);

    const status0WithStderr = orchestrateAudit(
      JSON.stringify(emptyAuditReport()),
      { stderr: 'npm warning: operational contradiction' },
    );
    expect(status0WithStderr.ok).toBe(false);
    expect(status0WithStderr.failures).toContain(
      'audit-subprocess-stderr-nonempty',
    );

    const status1DisposedWithStderr = orchestrateAudit(
      JSON.stringify(auditReport('moderate')),
      { status: 1, stderr: 'registry request partially failed' },
      policyWithDispositions([validDisposition()]),
    );
    expect(status1DisposedWithStderr.ok).toBe(false);
    expect(status1DisposedWithStderr.failures).toContain(
      'audit-subprocess-stderr-nonempty',
    );

    const unsupportedStatus = orchestrateAudit(
      JSON.stringify(emptyAuditReport()),
      { status: 2 },
    );
    expect(unsupportedStatus.ok).toBe(false);
    expect(unsupportedStatus.failures).toContain(
      'audit-subprocess-status-unsupported:2',
    );

    const signaled = orchestrateAudit(JSON.stringify(emptyAuditReport()), {
      signal: 'SIGTERM',
      status: null,
    });
    expect(signaled.ok).toBe(false);
    expect(signaled.failures).toContain('audit-subprocess-signal:SIGTERM');

    const spawnError = orchestrateAudit('', {
      error: new Error('spawn ENOENT'),
      status: null,
    });
    expect(spawnError.ok).toBe(false);
    expect(spawnError.failures).toContain('audit-spawn-failed');

    let parseError: unknown;
    try {
      parseInstalledAuditJson('{');
    } catch (error) {
      parseError = error;
    }
    expect((parseError as { code?: string }).code).toBe(
      'audit-json-invalid-or-truncated',
    );

    const truncatedJson = orchestrateAudit('{', { status: 1 });
    expect(truncatedJson.ok).toBe(false);
    expect(truncatedJson.failures).toContain('audit-json-invalid-or-truncated');

    const operationalErrorJson = orchestrateAudit(
      JSON.stringify({ error: { code: 'EAUDITNOLOCK' } }),
      { status: 1 },
    );
    expect(operationalErrorJson.ok).toBe(false);
    expect(operationalErrorJson.failures).toContain(
      'audit-report-keys-mismatch',
    );
    expect(operationalErrorJson.failures).toContain(
      'audit-subprocess-report-inconsistent',
    );
  });

  it('reports installed audit cleanup failures without masking prior failures', () => {
    const result = applyInstalledAuditCleanupFailure(
      { ok: true, failures: ['existing-failure'] },
      new Error('permission denied'),
    );
    expect(result.ok).toBe(false);
    expect(result.failures).toEqual([
      'existing-failure',
      'cleanup-failed:permission denied',
    ]);
  });

  it('fails closed on expired, duplicate, unused, multi-match, path, and range disposition residuals', () => {
    const cases = [
      {
        name: 'expired',
        report: auditReport('moderate'),
        dispositions: [
          validDisposition({
            createdOn: '2026-07-01',
            expiresOn: '2026-08-01',
          }),
        ],
        failure: 'disposition-expired:0',
      },
      {
        name: 'duplicate',
        report: auditReport('moderate'),
        dispositions: [validDisposition(), validDisposition()],
        failure: 'duplicate-disposition:1',
      },
      {
        name: 'unused',
        report: auditReport('moderate'),
        dispositions: [validDisposition({ packageName: 'other-lib' })],
        failure: 'disposition-unused:0',
      },
      {
        name: 'multi-match',
        report: auditReport('moderate', {
          nodes: ['node_modules/vulnerable-lib', 'node_modules/vulnerable-lib'],
        }),
        dispositions: [validDisposition()],
        failure: 'disposition-multi-match:0',
      },
      {
        name: 'wrong path',
        report: auditReport('moderate'),
        dispositions: [
          validDisposition({ installedPath: 'node_modules/other-location' }),
        ],
        failure: 'disposition-unused:0',
      },
      {
        name: 'wrong range',
        report: auditReport('moderate'),
        dispositions: [validDisposition({ affectedRange: '<2.0.0' })],
        failure: 'disposition-unused:0',
      },
    ];

    for (const entry of cases) {
      const result = evaluateProductionAudit(
        entry.report,
        policyWithDispositions(entry.dispositions),
        now,
      );
      expect(result.ok, entry.name).toBe(false);
      expect(result.failures, entry.name).toContain(entry.failure);
    }
  });

  it('fails closed on malformed or unknown audit report schemas', () => {
    const validNonzero = evaluateProductionAudit(
      auditReport('moderate'),
      policyWithDispositions([validDisposition()]),
      now,
    );
    expect(validNonzero.ok).toBe(true);
    expect(validNonzero.counts.moderate).toBe(1);

    const missingMetadata = evaluateProductionAudit(
      { auditReportVersion: 2, vulnerabilities: {} },
      defaultPolicy,
      now,
    );
    expect(missingMetadata.ok).toBe(false);
    expect(missingMetadata.failures).toContain('audit-report-keys-mismatch');

    const unknownTopLevel = evaluateProductionAudit(
      { ...auditReport('moderate'), error: { code: 'ENOAUDIT' } },
      defaultPolicy,
      now,
    );
    expect(unknownTopLevel.ok).toBe(false);
    expect(unknownTopLevel.failures).toContain('audit-report-keys-mismatch');

    const badCounts = structuredClone(auditReport('moderate'));
    const badCountsMetadata = badCounts.metadata as {
      vulnerabilities: { total: number };
    };
    badCountsMetadata.vulnerabilities.total = 0;
    const badCountsResult = evaluateProductionAudit(
      badCounts,
      defaultPolicy,
      now,
    );
    expect(badCountsResult.ok).toBe(false);
    expect(badCountsResult.failures).toContain(
      'audit-vulnerability-total-mismatch',
    );
  });

  it('keeps installed audit as an explicit release gate outside plain unit execution', () => {
    const source = readFileSync(
      resolve(root, 'tools/release/audit-installed-closure.mjs'),
      'utf8',
    );
    expect(source).toContain("'audit', '--omit=dev', '--audit-level=moderate'");
    const pkg = JSON.parse(
      readFileSync(resolve(root, 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.['security:audit']).toBe(
      'node tools/release/audit-installed-closure.mjs',
    );
  });
});

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'installed-sbom' }),
)('F9-SBOM-001 installed-sbom', () => {
  it('runs verify-installed-sbom against canonical shrinkwrap graph', () => {
    const r = spawnSync(
      process.execPath,
      [resolve(root, 'tools/release/verify-installed-sbom.mjs')],
      { cwd: root, encoding: 'utf8', shell: false },
    );
    expect(r.status).toBe(0);
    const report = JSON.parse(r.stdout) as {
      ok: boolean;
      specVersion: string;
      componentCount: number;
      edgeCount: number;
    };
    expect(report.ok).toBe(true);
    expect(report.specVersion).toBe(SBOM_SPEC_VERSION_V2);
    expect(report.componentCount).toBeGreaterThan(0);
    expect(report.edgeCount).toBeGreaterThanOrEqual(0);
  }, 120_000);
});
