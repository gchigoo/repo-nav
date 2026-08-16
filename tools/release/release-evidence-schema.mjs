const HEX40_OR_64 = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const INTEGRITY = /^sha512-[A-Za-z0-9+/]+={0,2}$/u;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const MAX_LOCAL_EVIDENCE_AGE_MS_V1 = 24 * 60 * 60 * 1000;

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function assertStrictEvidenceKeysV1(value, expected, label) {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  if (actual.join(',') !== required.join(',')) {
    throw new Error(`${label} keys mismatch`);
  }
}

function assertHex64V1(value, label) {
  if (typeof value !== 'string' || !HEX64.test(value)) {
    throw new Error(`${label} must be lowercase sha256`);
  }
}

function assertNonnegativeIntegerV1(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a nonnegative integer`);
  }
}

export function validateFreshTimestampV1(value, label, options = {}) {
  if (
    typeof value !== 'string' ||
    !ISO_TIMESTAMP.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`${label} must be a canonical ISO timestamp`);
  }
  const now = options.now ?? Date.now();
  const maxAgeMs = options.maxAgeMs ?? MAX_LOCAL_EVIDENCE_AGE_MS_V1;
  const age = now - Date.parse(value);
  if (age > maxAgeMs || age < -60_000) {
    throw new Error(`${label} is stale or from the future`);
  }
  return value;
}

export function releaseEvidenceCandidateV1(candidate) {
  return Object.freeze({
    name: candidate.name,
    version: candidate.version,
    tarballSha256: candidate.tarballSha256,
    sourceSha256: candidate.sourceSha256,
    designRevisionSha256: candidate.designRevisionSha256,
    packIntegrity: candidate.packIntegrity,
    packedBytes: candidate.packedBytes,
  });
}

export function validateReleaseEvidenceCandidateV1(value, expected) {
  assertStrictEvidenceKeysV1(
    value,
    [
      'name',
      'version',
      'tarballSha256',
      'sourceSha256',
      'designRevisionSha256',
      'packIntegrity',
      'packedBytes',
    ],
    'release evidence candidate',
  );
  if (
    value.name !== expected.name ||
    value.version !== expected.version ||
    value.tarballSha256 !== expected.tarballSha256 ||
    value.sourceSha256 !== expected.sourceSha256 ||
    value.designRevisionSha256 !== expected.designRevisionSha256 ||
    value.packIntegrity !== expected.packIntegrity ||
    value.packedBytes !== expected.packedBytes
  ) {
    throw new Error('release evidence candidate binding mismatch');
  }
  assertHex64V1(value.tarballSha256, 'candidate.tarballSha256');
  assertHex64V1(value.sourceSha256, 'candidate.sourceSha256');
  assertHex64V1(value.designRevisionSha256, 'candidate.designRevisionSha256');
  if (
    typeof value.packIntegrity !== 'string' ||
    !INTEGRITY.test(value.packIntegrity)
  ) {
    throw new Error('candidate.packIntegrity invalid');
  }
  assertNonnegativeIntegerV1(value.packedBytes, 'candidate.packedBytes');
  return value;
}

function validateEmptyStringArrayV1(value, label) {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== 'string')
  ) {
    throw new Error(`${label} must be a string array`);
  }
  if (value.length !== 0) {
    throw new Error(`${label} must be empty`);
  }
}

export function validateInstalledClosureEvidenceV1(
  report,
  expected,
  options = {},
) {
  assertStrictEvidenceKeysV1(
    report,
    [
      'schemaVersion',
      'ok',
      'generatedAt',
      'candidate',
      'nodeCount',
      'edgeCount',
      'npmLsExitStatus',
      'problems',
      'failures',
      'authority',
    ],
    'installed closure evidence',
  );
  if (
    report.schemaVersion !== 1 ||
    report.ok !== true ||
    report.authority !==
      'exact-packed-candidate+immutable-copy+fresh-consumer-package-lock+npm-ls' ||
    report.npmLsExitStatus !== 0
  ) {
    throw new Error('installed closure evidence verdict invalid');
  }
  validateFreshTimestampV1(report.generatedAt, 'closure.generatedAt', options);
  validateReleaseEvidenceCandidateV1(report.candidate, expected);
  assertNonnegativeIntegerV1(report.nodeCount, 'closure.nodeCount');
  assertNonnegativeIntegerV1(report.edgeCount, 'closure.edgeCount');
  validateEmptyStringArrayV1(report.problems, 'closure.problems');
  validateEmptyStringArrayV1(report.failures, 'closure.failures');
  return report;
}

function validateAuditCountsV1(counts) {
  assertStrictEvidenceKeysV1(
    counts,
    ['info', 'low', 'moderate', 'high', 'critical', 'total'],
    'installed audit counts',
  );
  for (const key of ['info', 'low', 'moderate', 'high', 'critical', 'total']) {
    assertNonnegativeIntegerV1(counts[key], `audit.counts.${key}`);
  }
  if (
    counts.total !==
    counts.info + counts.low + counts.moderate + counts.high + counts.critical
  ) {
    throw new Error('installed audit counts total mismatch');
  }
}

export function validateInstalledAuditEvidenceV1(
  report,
  expected,
  options = {},
) {
  assertStrictEvidenceKeysV1(
    report,
    [
      'schemaVersion',
      'ok',
      'generatedAt',
      'authority',
      'candidate',
      'candidateVersion',
      'tarballSha256',
      'auditExitStatus',
      'counts',
      'low',
      'moderate',
      'high',
      'critical',
      'blockingFindings',
      'disposedFindings',
      'failures',
    ],
    'installed audit evidence',
  );
  if (
    report.schemaVersion !== 1 ||
    report.ok !== true ||
    report.authority !==
      'exact-packed-candidate+immutable-copy+fresh-consumer-npm-audit' ||
    (report.auditExitStatus !== 0 && report.auditExitStatus !== 1)
  ) {
    throw new Error('installed audit evidence verdict invalid');
  }
  validateFreshTimestampV1(report.generatedAt, 'audit.generatedAt', options);
  validateReleaseEvidenceCandidateV1(report.candidate, expected);
  if (
    report.candidateVersion !== expected.version ||
    report.tarballSha256 !== expected.tarballSha256
  ) {
    throw new Error('installed audit legacy candidate binding mismatch');
  }
  validateAuditCountsV1(report.counts);
  for (const key of ['low', 'moderate', 'high', 'critical']) {
    if (report[key] !== report.counts[key]) {
      throw new Error(`installed audit ${key} count mismatch`);
    }
  }
  assertNonnegativeIntegerV1(report.blockingFindings, 'audit.blockingFindings');
  assertNonnegativeIntegerV1(report.disposedFindings, 'audit.disposedFindings');
  if (report.blockingFindings !== 0) {
    throw new Error('installed audit contains blocking findings');
  }
  validateEmptyStringArrayV1(report.failures, 'audit.failures');
  return report;
}

export function validateInstalledSbomEvidenceV1(
  report,
  expected,
  options = {},
) {
  assertStrictEvidenceKeysV1(
    report,
    [
      'schemaVersion',
      'ok',
      'generatedAt',
      'candidate',
      'specVersion',
      'componentCount',
      'edgeCount',
      'sha256',
      'root',
      'tarballSha256',
      'failures',
      'authority',
    ],
    'installed SBOM evidence',
  );
  if (
    report.schemaVersion !== 1 ||
    report.ok !== true ||
    report.authority !==
      'exact-packed-candidate+immutable-copy+fresh-consumer-package-lock-sbom' ||
    report.specVersion !== '1.5'
  ) {
    throw new Error('installed SBOM evidence verdict invalid');
  }
  validateFreshTimestampV1(report.generatedAt, 'sbom.generatedAt', options);
  validateReleaseEvidenceCandidateV1(report.candidate, expected);
  assertNonnegativeIntegerV1(report.componentCount, 'sbom.componentCount');
  assertNonnegativeIntegerV1(report.edgeCount, 'sbom.edgeCount');
  assertHex64V1(report.sha256, 'sbom.sha256');
  if (
    report.root !== `pkg:npm/${expected.name}@${expected.version}` ||
    report.tarballSha256 !== expected.tarballSha256
  ) {
    throw new Error('installed SBOM candidate binding mismatch');
  }
  validateEmptyStringArrayV1(report.failures, 'sbom.failures');
  return report;
}

export function validateOwnerVerificationEvidenceV1(
  report,
  expected,
  source,
  options = {},
) {
  assertStrictEvidenceKeysV1(
    report,
    [
      'schemaVersion',
      'ok',
      'generatedAt',
      'candidate',
      'designRevisionSha256',
      'ownerActionsDecisionSha256',
      'ownerActionsVerifiedAt',
      'ownerActionsSourceSha256',
      'confirmationDecisionSha256',
      'confirmationVerifiedAt',
      'confirmationSourceSha256',
      'preflightSourceSha256',
      'preflightValidated',
      'ownerActionsValidated',
      'realConsumerConfirmationValidated',
      'residuals',
    ],
    'owner verification evidence',
  );
  if (
    report.schemaVersion !== 1 ||
    report.ok !== true ||
    report.designRevisionSha256 !== expected.designRevisionSha256 ||
    report.preflightValidated !== true ||
    report.ownerActionsValidated !== true ||
    report.realConsumerConfirmationValidated !== true
  ) {
    throw new Error('owner verification evidence verdict invalid');
  }
  validateFreshTimestampV1(report.generatedAt, 'owner.generatedAt', options);
  validateReleaseEvidenceCandidateV1(report.candidate, expected);
  for (const key of [
    'ownerActionsDecisionSha256',
    'ownerActionsSourceSha256',
    'confirmationDecisionSha256',
    'confirmationSourceSha256',
    'preflightSourceSha256',
  ]) {
    assertHex64V1(report[key], `owner.${key}`);
  }
  if (
    report.ownerActionsDecisionSha256 !== source.ownerActionsDecisionSha256 ||
    report.ownerActionsVerifiedAt !== source.ownerActionsVerifiedAt ||
    report.ownerActionsSourceSha256 !== source.ownerActionsSourceSha256 ||
    report.confirmationDecisionSha256 !== source.confirmationDecisionSha256 ||
    report.confirmationVerifiedAt !== source.confirmationVerifiedAt ||
    report.confirmationSourceSha256 !== source.confirmationSourceSha256 ||
    report.preflightSourceSha256 !== source.preflightSourceSha256
  ) {
    throw new Error('owner verification source binding mismatch');
  }
  validateFreshTimestampV1(
    report.ownerActionsVerifiedAt,
    'owner.ownerActionsVerifiedAt',
    { ...options, maxAgeMs: 7 * 24 * 60 * 60 * 1000 },
  );
  validateFreshTimestampV1(
    report.confirmationVerifiedAt,
    'owner.confirmationVerifiedAt',
    options,
  );
  validateEmptyStringArrayV1(report.residuals, 'owner.residuals');
  return report;
}

function validateMeasuredRealConsumerV1(measured) {
  assertStrictEvidenceKeysV1(
    measured,
    [
      'cli',
      'locate',
      'mcp',
      'mcpCliParity',
      'forbiddenScanPassed',
      'repositoryUnchanged',
    ],
    'real consumer measured',
  );
  assertStrictEvidenceKeysV1(
    measured.cli,
    ['exitCode', 'signal', 'stderrEmpty', 'jsonValid'],
    'real consumer measured.cli',
  );
  assertStrictEvidenceKeysV1(
    measured.locate,
    ['ok', 'schemaVersion', 'status', 'evidenceSatisfied'],
    'real consumer measured.locate',
  );
  assertStrictEvidenceKeysV1(
    measured.mcp,
    ['exitCode', 'signal', 'stderrEmpty', 'transcriptValid'],
    'real consumer measured.mcp',
  );
  if (
    measured.cli.exitCode !== 0 ||
    measured.cli.signal !== null ||
    measured.cli.stderrEmpty !== true ||
    measured.cli.jsonValid !== true ||
    measured.locate.ok !== true ||
    measured.locate.schemaVersion !== '2.0' ||
    measured.locate.evidenceSatisfied !== true ||
    measured.mcp.exitCode !== 0 ||
    measured.mcp.signal !== null ||
    measured.mcp.stderrEmpty !== true ||
    measured.mcp.transcriptValid !== true ||
    measured.mcpCliParity !== true ||
    measured.forbiddenScanPassed !== true ||
    measured.repositoryUnchanged !== true
  ) {
    throw new Error('real consumer measured verdict invalid');
  }
}

export function validateRealConsumerEvidenceV1(
  report,
  expected,
  source,
  options = {},
) {
  assertStrictEvidenceKeysV1(
    report,
    [
      'ok',
      'schemaVersion',
      'generatedAt',
      'confirmationDecisionSha256',
      'confirmationVerifiedAt',
      'confirmationSourceSha256',
      'candidate',
      'measured',
      'repository',
    ],
    'real consumer evidence',
  );
  if (report.ok !== true || report.schemaVersion !== 1) {
    throw new Error('real consumer evidence verdict invalid');
  }
  validateFreshTimestampV1(
    report.generatedAt,
    'realConsumer.generatedAt',
    options,
  );
  validateReleaseEvidenceCandidateV1(report.candidate, expected);
  assertHex64V1(
    report.confirmationDecisionSha256,
    'realConsumer.confirmationDecisionSha256',
  );
  assertHex64V1(
    report.confirmationSourceSha256,
    'realConsumer.confirmationSourceSha256',
  );
  if (
    report.confirmationDecisionSha256 !== source.confirmationDecisionSha256 ||
    report.confirmationVerifiedAt !== source.confirmationVerifiedAt ||
    report.confirmationSourceSha256 !== source.confirmationSourceSha256
  ) {
    throw new Error('real consumer confirmation source binding mismatch');
  }
  validateFreshTimestampV1(
    report.confirmationVerifiedAt,
    'realConsumer.confirmationVerifiedAt',
    options,
  );
  validateMeasuredRealConsumerV1(report.measured);
  assertStrictEvidenceKeysV1(
    report.repository,
    ['headSha', 'indexSha256', 'worktreeTreeSha256', 'worktreeEntryCount'],
    'real consumer repository',
  );
  if (
    typeof report.repository.headSha !== 'string' ||
    !HEX40_OR_64.test(report.repository.headSha)
  ) {
    throw new Error('real consumer repository headSha invalid');
  }
  assertHex64V1(
    report.repository.indexSha256,
    'realConsumer.repository.indexSha256',
  );
  assertHex64V1(
    report.repository.worktreeTreeSha256,
    'realConsumer.repository.worktreeTreeSha256',
  );
  assertNonnegativeIntegerV1(
    report.repository.worktreeEntryCount,
    'realConsumer.repository.worktreeEntryCount',
  );
  if (
    report.repository.headSha !== source.confirmedHeadSha ||
    report.repository.indexSha256 !== source.indexSha256 ||
    report.repository.worktreeTreeSha256 !== source.worktreeTreeSha256 ||
    report.repository.worktreeEntryCount !== source.worktreeEntryCount
  ) {
    throw new Error('real consumer repository source binding mismatch');
  }
  return report;
}
