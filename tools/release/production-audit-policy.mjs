const POLICY_KEYS = Object.freeze([
  'blockingSeverities',
  'dispositions',
  'schemaVersion',
]);
const DISPOSITION_KEYS = Object.freeze([
  'advisoryId',
  'affectedRange',
  'createdOn',
  'expiresOn',
  'installedPath',
  'owner',
  'packageName',
  'rationale',
]);
const POLICY_BLOCKING_SEVERITIES = Object.freeze([
  'moderate',
  'high',
  'critical',
]);
const AUDIT_REPORT_KEYS = Object.freeze([
  'auditReportVersion',
  'metadata',
  'vulnerabilities',
]);
const AUDIT_METADATA_KEYS = Object.freeze(['dependencies', 'vulnerabilities']);
const AUDIT_COUNT_KEYS = Object.freeze([
  'critical',
  'high',
  'info',
  'low',
  'moderate',
  'total',
]);
const AUDIT_DEPENDENCY_COUNT_KEYS = Object.freeze([
  'dev',
  'optional',
  'peer',
  'peerOptional',
  'prod',
  'total',
]);
const AUDIT_VULNERABILITY_KEYS = Object.freeze([
  'effects',
  'fixAvailable',
  'isDirect',
  'name',
  'nodes',
  'range',
  'severity',
  'via',
]);
const AUDIT_FIX_AVAILABLE_KEYS = Object.freeze([
  'isSemVerMajor',
  'name',
  'version',
]);
const AUDIT_ADVISORY_KEYS = Object.freeze([
  'cwe',
  'cvss',
  'dependency',
  'name',
  'range',
  'severity',
  'source',
  'title',
  'url',
]);
const AUDIT_CVSS_KEYS = Object.freeze(['score', 'vectorString']);
const SEVERITIES = Object.freeze([
  'info',
  'low',
  'moderate',
  'high',
  'critical',
]);
const SEVERITY_RANK = Object.freeze({
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
});

function severityRank(severity) {
  return SEVERITY_RANK[severity];
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function keysEqual(value, expected) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

function isNonEmptyStrictString(value) {
  return (
    typeof value === 'string' && value.trim() === value && value.length > 0
  );
}

function isDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return false;
  }
  const millis = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(millis)) return false;
  return new Date(millis).toISOString().slice(0, 10) === value;
}

function dateOnlyMillis(value) {
  return Date.parse(`${value}T00:00:00.000Z`);
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function createZeroCounts() {
  return {
    info: 0,
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0,
    total: 0,
  };
}

function isBlockingSeverity(severity) {
  return POLICY_BLOCKING_SEVERITIES.includes(severity);
}

function dispositionIdentity(disposition) {
  return [
    disposition.advisoryId,
    disposition.packageName,
    disposition.installedPath,
    disposition.affectedRange,
  ].join('\u0000');
}

function findingIdentity(finding) {
  return [
    finding.advisoryId,
    finding.packageName,
    finding.installedPath,
    finding.affectedRange,
  ].join('\u0000');
}

function dispositionMatchesFinding(disposition, finding) {
  return dispositionIdentity(disposition) === findingIdentity(finding);
}

function normalizeCounts(counts) {
  return Object.freeze({
    info: counts.info,
    low: counts.low,
    moderate: counts.moderate,
    high: counts.high,
    critical: counts.critical,
    total: counts.total,
  });
}

function validateCountBag(counts, failures) {
  if (!keysEqual(counts, AUDIT_COUNT_KEYS)) {
    failures.push('audit-vulnerability-counts-keys-mismatch');
    return null;
  }
  for (const key of AUDIT_COUNT_KEYS) {
    if (!isNonNegativeInteger(counts[key])) {
      failures.push(`audit-vulnerability-count-invalid:${key}`);
    }
  }
  if (
    isNonNegativeInteger(counts.info) &&
    isNonNegativeInteger(counts.low) &&
    isNonNegativeInteger(counts.moderate) &&
    isNonNegativeInteger(counts.high) &&
    isNonNegativeInteger(counts.critical) &&
    isNonNegativeInteger(counts.total) &&
    counts.total !==
      counts.info + counts.low + counts.moderate + counts.high + counts.critical
  ) {
    failures.push('audit-vulnerability-total-mismatch');
  }
  return normalizeCounts(counts);
}

function validateDependencyCounts(counts, failures) {
  if (!isPlainObject(counts)) {
    failures.push('audit-dependency-counts-missing');
    return;
  }
  if (!keysEqual(counts, AUDIT_DEPENDENCY_COUNT_KEYS)) {
    failures.push('audit-dependency-counts-keys-mismatch');
  }
  for (const key of AUDIT_DEPENDENCY_COUNT_KEYS) {
    if (!isNonNegativeInteger(counts[key])) {
      failures.push(`audit-dependency-count-invalid:${key}`);
    }
  }
}

function validateFixAvailable(fixAvailable, packageKey, failures) {
  if (typeof fixAvailable === 'boolean') return;
  if (!isPlainObject(fixAvailable)) {
    failures.push(
      `audit-vulnerability-field-invalid:${packageKey}:fixAvailable`,
    );
    return;
  }
  if (!keysEqual(fixAvailable, AUDIT_FIX_AVAILABLE_KEYS)) {
    failures.push(
      `audit-vulnerability-fix-available-keys-mismatch:${packageKey}`,
    );
  }
  if (!isNonEmptyStrictString(fixAvailable.name)) {
    failures.push(
      `audit-vulnerability-fix-available-field-invalid:${packageKey}:name`,
    );
  }
  if (!isNonEmptyStrictString(fixAvailable.version)) {
    failures.push(
      `audit-vulnerability-fix-available-field-invalid:${packageKey}:version`,
    );
  }
  if (typeof fixAvailable.isSemVerMajor !== 'boolean') {
    failures.push(
      `audit-vulnerability-fix-available-field-invalid:${packageKey}:isSemVerMajor`,
    );
  }
}

function validateAuditAdvisory(
  advisory,
  packageName,
  viaIndex,
  vulnerability,
  failures,
) {
  if (!keysEqual(advisory, AUDIT_ADVISORY_KEYS)) {
    failures.push(
      `audit-via-advisory-keys-mismatch:${packageName}:${viaIndex}`,
    );
    return false;
  }
  let shapeValid = true;
  const stringFields = [
    'dependency',
    'name',
    'range',
    'severity',
    'title',
    'url',
  ];
  for (const field of stringFields) {
    if (!isNonEmptyStrictString(advisory[field])) {
      failures.push(
        `audit-via-advisory-field-invalid:${packageName}:${viaIndex}:${field}`,
      );
      shapeValid = false;
    }
  }
  if (!SEVERITIES.includes(advisory.severity)) {
    failures.push(
      `audit-via-advisory-severity-invalid:${packageName}:${viaIndex}`,
    );
    shapeValid = false;
  }
  if (
    typeof advisory.source !== 'number' &&
    !isNonEmptyStrictString(advisory.source)
  ) {
    failures.push(
      `audit-via-advisory-source-invalid:${packageName}:${viaIndex}`,
    );
    shapeValid = false;
  }
  if (
    !Array.isArray(advisory.cwe) ||
    !advisory.cwe.every((entry) => isNonEmptyStrictString(entry))
  ) {
    failures.push(`audit-via-advisory-cwe-invalid:${packageName}:${viaIndex}`);
    shapeValid = false;
  }
  if (!keysEqual(advisory.cvss, AUDIT_CVSS_KEYS)) {
    failures.push(
      `audit-via-advisory-cvss-keys-mismatch:${packageName}:${viaIndex}`,
    );
    shapeValid = false;
  } else {
    if (typeof advisory.cvss.score !== 'number' || advisory.cvss.score < 0) {
      failures.push(
        `audit-via-advisory-cvss-score-invalid:${packageName}:${viaIndex}`,
      );
      shapeValid = false;
    }
    if (!isNonEmptyStrictString(advisory.cvss.vectorString)) {
      failures.push(
        `audit-via-advisory-cvss-vector-invalid:${packageName}:${viaIndex}`,
      );
      shapeValid = false;
    }
  }
  if (shapeValid) {
    if (advisory.name !== vulnerability.name) {
      failures.push(
        `audit-via-advisory-name-mismatch:${packageName}:${viaIndex}`,
      );
    }
    if (advisory.dependency !== vulnerability.name) {
      failures.push(
        `audit-via-advisory-dependency-mismatch:${packageName}:${viaIndex}`,
      );
    }
    if (
      SEVERITIES.includes(advisory.severity) &&
      SEVERITIES.includes(vulnerability.severity) &&
      severityRank(advisory.severity) > severityRank(vulnerability.severity)
    ) {
      failures.push(
        `audit-via-advisory-severity-exceeds-aggregate:${packageName}:${viaIndex}:${advisory.severity}:${vulnerability.severity}`,
      );
    }
  }
  return shapeValid;
}

function hasValidNodes(vulnerability) {
  return (
    Array.isArray(vulnerability.nodes) &&
    vulnerability.nodes.length > 0 &&
    vulnerability.nodes.every((entry) => isNonEmptyStrictString(entry))
  );
}

function compareMetadataToRecords(counts, recordCounts, failures) {
  if (counts === null) return;
  for (const severity of SEVERITIES) {
    if (counts[severity] !== recordCounts[severity]) {
      failures.push(
        `audit-vulnerability-record-count-mismatch:${severity}:metadata-${counts[severity]}:records-${recordCounts[severity]}`,
      );
    }
  }
  if (counts.total !== recordCounts.total) {
    failures.push(
      `audit-vulnerability-record-count-mismatch:total:metadata-${counts.total}:records-${recordCounts.total}`,
    );
  }
}

function extractAuditFindings(report) {
  const failures = [];
  const findings = [];
  if (!keysEqual(report, AUDIT_REPORT_KEYS)) {
    return {
      ok: false,
      failures: Object.freeze(['audit-report-keys-mismatch']),
      counts: null,
      findings: Object.freeze([]),
    };
  }
  if (report.auditReportVersion !== 2) {
    failures.push('audit-report-version-invalid');
  }
  if (!keysEqual(report.metadata, AUDIT_METADATA_KEYS)) {
    failures.push('audit-metadata-keys-mismatch');
  }
  const counts = isPlainObject(report.metadata)
    ? validateCountBag(report.metadata.vulnerabilities, failures)
    : null;
  if (isPlainObject(report.metadata)) {
    validateDependencyCounts(report.metadata.dependencies, failures);
  }

  const records = new Map();
  const recordCounts = createZeroCounts();
  if (!isPlainObject(report.vulnerabilities)) {
    failures.push('audit-vulnerabilities-missing');
  } else {
    for (const [packageKey, vulnerability] of Object.entries(
      report.vulnerabilities,
    )) {
      if (!keysEqual(vulnerability, AUDIT_VULNERABILITY_KEYS)) {
        failures.push(`audit-vulnerability-keys-mismatch:${packageKey}`);
        continue;
      }
      if (!isNonEmptyStrictString(vulnerability.name)) {
        failures.push(`audit-vulnerability-field-invalid:${packageKey}:name`);
      }
      if (vulnerability.name !== packageKey) {
        failures.push(`audit-vulnerability-name-mismatch:${packageKey}`);
      }
      if (!SEVERITIES.includes(vulnerability.severity)) {
        failures.push(`audit-vulnerability-severity-invalid:${packageKey}`);
      } else {
        recordCounts[vulnerability.severity] += 1;
        recordCounts.total += 1;
      }
      if (typeof vulnerability.isDirect !== 'boolean') {
        failures.push(
          `audit-vulnerability-field-invalid:${packageKey}:isDirect`,
        );
      }
      if (!isNonEmptyStrictString(vulnerability.range)) {
        failures.push(`audit-vulnerability-field-invalid:${packageKey}:range`);
      }
      if (
        !Array.isArray(vulnerability.effects) ||
        !vulnerability.effects.every((entry) => isNonEmptyStrictString(entry))
      ) {
        failures.push(
          `audit-vulnerability-field-invalid:${packageKey}:effects`,
        );
      }
      if (!hasValidNodes(vulnerability)) {
        failures.push(`audit-vulnerability-field-invalid:${packageKey}:nodes`);
      }
      validateFixAvailable(vulnerability.fixAvailable, packageKey, failures);
      const advisories = [];
      const viaReferences = [];
      if (!Array.isArray(vulnerability.via)) {
        failures.push(`audit-vulnerability-field-invalid:${packageKey}:via`);
      } else {
        vulnerability.via.forEach((viaEntry, viaIndex) => {
          if (typeof viaEntry === 'string') {
            if (!isNonEmptyStrictString(viaEntry)) {
              failures.push(
                `audit-via-entry-invalid:${packageKey}:${viaIndex}`,
              );
              return;
            }
            viaReferences.push(viaEntry);
            return;
          }
          if (!isPlainObject(viaEntry)) {
            failures.push(`audit-via-entry-invalid:${packageKey}:${viaIndex}`);
            return;
          }
          const advisoryShapeValid = validateAuditAdvisory(
            viaEntry,
            packageKey,
            viaIndex,
            vulnerability,
            failures,
          );
          if (advisoryShapeValid) advisories.push(viaEntry);
        });
      }
      records.set(
        packageKey,
        Object.freeze({
          advisories: Object.freeze(advisories),
          packageKey,
          viaReferences: Object.freeze(viaReferences),
          vulnerability,
        }),
      );
    }
  }

  compareMetadataToRecords(counts, recordCounts, failures);

  const resolvedCache = new Map();
  function resolveAdvisories(packageKey, stack = []) {
    if (resolvedCache.has(packageKey)) return resolvedCache.get(packageKey);
    if (stack.includes(packageKey)) {
      failures.push(
        `audit-via-reference-cycle:${[...stack, packageKey].join('>')}`,
      );
      return Object.freeze([]);
    }
    const record = records.get(packageKey);
    if (record === undefined) return Object.freeze([]);
    const resolved = [...record.advisories];
    for (const reference of record.viaReferences) {
      const referencedRecord = records.get(reference);
      if (referencedRecord === undefined) {
        failures.push(
          `audit-via-reference-dangling:${packageKey}:${reference}`,
        );
        continue;
      }
      resolved.push(...resolveAdvisories(reference, [...stack, packageKey]));
    }
    const frozen = Object.freeze(resolved);
    resolvedCache.set(packageKey, frozen);
    return frozen;
  }

  for (const [packageKey, record] of records) {
    const { vulnerability } = record;
    const resolvedAdvisories = resolveAdvisories(packageKey);
    const nameValid = isNonEmptyStrictString(vulnerability.name);
    const rangeValid = isNonEmptyStrictString(vulnerability.range);
    const nodesValid = hasValidNodes(vulnerability);
    const severityValid = SEVERITIES.includes(vulnerability.severity);
    if (severityValid && resolvedAdvisories.length > 0) {
      let establishesAggregateSeverity = false;
      for (const advisory of resolvedAdvisories) {
        if (!SEVERITIES.includes(advisory.severity)) continue;
        if (advisory.severity === vulnerability.severity) {
          establishesAggregateSeverity = true;
        }
        if (
          severityRank(advisory.severity) > severityRank(vulnerability.severity)
        ) {
          failures.push(
            `audit-resolved-advisory-severity-exceeds-aggregate:${packageKey}:${advisory.severity}:${vulnerability.severity}:${String(advisory.source)}`,
          );
        }
      }
      if (!establishesAggregateSeverity) {
        failures.push(
          `audit-resolved-advisory-aggregate-severity-missing:${packageKey}:${vulnerability.severity}`,
        );
      }
    }
    if (
      severityValid &&
      isBlockingSeverity(vulnerability.severity) &&
      (resolvedAdvisories.length === 0 ||
        !nameValid ||
        !rangeValid ||
        !nodesValid)
    ) {
      failures.push(`audit-actionable-finding-missing:${packageKey}`);
    }
    if (!nameValid || !rangeValid || !nodesValid || !severityValid) continue;
    for (const advisory of resolvedAdvisories) {
      for (const node of vulnerability.nodes) {
        findings.push(
          Object.freeze({
            advisoryId: String(advisory.source),
            affectedRange: vulnerability.range,
            installedPath: node,
            packageName: vulnerability.name,
            severity: vulnerability.severity,
            title: advisory.title,
            url: advisory.url,
          }),
        );
      }
    }
  }

  return {
    ok: failures.length === 0 && counts !== null,
    failures: Object.freeze(failures),
    counts,
    findings: Object.freeze(findings),
  };
}

function isDispositionExpired(disposition, now) {
  return dateOnlyMillis(disposition.expiresOn) <= now.getTime();
}

export function validateProductionAuditPolicy(policy) {
  const failures = [];
  if (!keysEqual(policy, POLICY_KEYS)) {
    return {
      ok: false,
      failures: Object.freeze(['policy-keys-mismatch']),
    };
  }
  if (policy.schemaVersion !== 1)
    failures.push('policy-schema-version-invalid');
  if (
    !Array.isArray(policy.blockingSeverities) ||
    policy.blockingSeverities.length !== POLICY_BLOCKING_SEVERITIES.length ||
    !POLICY_BLOCKING_SEVERITIES.every(
      (severity, index) => policy.blockingSeverities[index] === severity,
    )
  ) {
    failures.push('policy-blocking-severities-invalid');
  }
  if (!Array.isArray(policy.dispositions)) {
    failures.push('policy-dispositions-invalid');
  } else {
    const identities = new Set();
    policy.dispositions.forEach((disposition, index) => {
      if (!keysEqual(disposition, DISPOSITION_KEYS)) {
        failures.push(`disposition-keys-mismatch:${index}`);
        return;
      }
      for (const field of DISPOSITION_KEYS) {
        if (!isNonEmptyStrictString(disposition[field])) {
          failures.push(`disposition-field-invalid:${index}:${field}`);
        }
        if (disposition[field] === '*') {
          failures.push(`disposition-field-wildcard:${index}:${field}`);
        }
      }
      for (const field of ['createdOn', 'expiresOn']) {
        if (!isDateOnly(disposition[field])) {
          failures.push(`disposition-date-invalid:${index}:${field}`);
        }
      }
      if (
        isDateOnly(disposition.createdOn) &&
        isDateOnly(disposition.expiresOn) &&
        dateOnlyMillis(disposition.createdOn) >=
          dateOnlyMillis(disposition.expiresOn)
      ) {
        failures.push(`disposition-date-order:${index}`);
      }
      const identity = dispositionIdentity(disposition);
      if (identities.has(identity)) {
        failures.push(`duplicate-disposition:${index}`);
      }
      identities.add(identity);
    });
  }
  return {
    ok: failures.length === 0,
    failures: Object.freeze(failures),
  };
}

export function evaluateProductionAudit(report, policy, now = new Date()) {
  const failures = [];
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    failures.push('evaluation-now-invalid');
  }
  const policyValidation = validateProductionAuditPolicy(policy);
  failures.push(...policyValidation.failures);
  const audit = extractAuditFindings(report);
  failures.push(...audit.failures);

  const blockingSeverities = policyValidation.ok
    ? new Set(policy.blockingSeverities)
    : new Set(POLICY_BLOCKING_SEVERITIES);
  const dispositions = policyValidation.ok ? policy.dispositions : [];
  const blockingFindings = [];
  const disposedFindings = [];
  const dispositionFailures = [];
  const expiredDispositionIndexes = new Set();
  const matchedDispositionIndexes = new Set();

  dispositions.forEach((disposition, index) => {
    if (isDispositionExpired(disposition, now)) {
      expiredDispositionIndexes.add(index);
      dispositionFailures.push(`disposition-expired:${index}`);
    }
    const matches = audit.findings.filter((finding) =>
      dispositionMatchesFinding(disposition, finding),
    );
    if (matches.length === 0) {
      dispositionFailures.push(`disposition-unused:${index}`);
      return;
    }
    if (matches.length > 1) {
      dispositionFailures.push(`disposition-multi-match:${index}`);
    }
    matchedDispositionIndexes.add(index);
    for (const match of matches) {
      if (match.severity !== 'moderate') {
        dispositionFailures.push(
          `disposition-non-moderate:${index}:${match.severity}`,
        );
      }
    }
  });

  for (const finding of audit.findings) {
    if (!blockingSeverities.has(finding.severity)) continue;
    const dispositionIndex = dispositions.findIndex((disposition) =>
      dispositionMatchesFinding(disposition, finding),
    );
    const canDispose =
      finding.severity === 'moderate' &&
      dispositionIndex >= 0 &&
      matchedDispositionIndexes.has(dispositionIndex) &&
      !expiredDispositionIndexes.has(dispositionIndex) &&
      dispositions.filter((disposition) =>
        dispositionMatchesFinding(disposition, finding),
      ).length === 1 &&
      audit.findings.filter((candidate) =>
        dispositionMatchesFinding(dispositions[dispositionIndex], candidate),
      ).length === 1;
    if (canDispose) {
      disposedFindings.push(finding);
      continue;
    }
    blockingFindings.push(finding);
    failures.push(
      `undisposed-finding:${finding.severity}:${finding.packageName}:${finding.installedPath}:${finding.advisoryId}`,
    );
  }

  failures.push(...dispositionFailures);
  return Object.freeze({
    ok:
      failures.length === 0 &&
      audit.ok &&
      policyValidation.ok &&
      blockingFindings.length === 0,
    auditFailures: audit.failures,
    auditOk: audit.ok,
    counts: audit.counts,
    findings: audit.findings,
    blockingFindings: Object.freeze(blockingFindings),
    disposedFindings: Object.freeze(disposedFindings),
    failures: Object.freeze(failures),
    policyFailures: policyValidation.failures,
    policyOk: policyValidation.ok,
  });
}
