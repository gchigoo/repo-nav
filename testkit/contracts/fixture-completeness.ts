import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import { z } from 'zod';
import { parse } from 'yaml';

import {
  ANCHOR_KINDS,
  BACKEND_REASON_CODES,
  CANDIDATE_REASON_CODES,
  CONFIRMED_REASON_CODES,
  DISCOVERY_REASON_CODES,
  EVIDENCE_OPERATION_CODES,
  EVIDENCE_ROLES,
  EVIDENCE_SOURCES,
  EXCLUSION_REASON_CODES,
  LIMIT_REASON_CODES,
  NEXT_ACTION_CODES,
  PROMOTION_REQUIREMENT_CODES,
  REDACTION_REASON_CODES,
  REPO_LAYERS,
  SEARCH_BACKEND_IDS,
  TERM_CASE_MODES,
  TOOL_ERROR_CODES,
} from '../../src/contracts/index.js';
import {
  LOCATE_STATUSES_V2,
  LocateResultV2Schema,
  type LocateResultV2,
} from '../../src/contracts/v2/locate-result-v2.js';
import { GoldenCaseSchema, type GoldenCase } from './golden-case.js';
import { PUBLIC_EVIDENCE_PACK_FIELD_MUTATIONS } from './evidence-pack-field-contract.js';
import {
  REASON_CODE_NEGATIVE_PROBES,
  runContractSchemaProbes,
} from './fixture-coverage-probes.js';
import { RUNNER_SELECTIONS } from '../runners/runner-registry.js';

const OwnershipEntrySchema = z
  .strictObject({
    positive: z.string().min(1),
    negative: z.string().min(1).optional(),
  })
  .readonly();

const FixtureOwnershipSchema = z
  .strictObject({
    schemaVersion: z.literal('1.0'),
    successCases: z.record(z.string(), z.string().min(1)),
    errorCases: z.record(z.string(), z.string().min(1)),
    families: z.record(z.string(), z.record(z.string(), OwnershipEntrySchema)),
    publicBetaRelease: z.record(z.string(), z.string().min(1)).optional(),
  })
  .readonly();

const CONTRACT_FAMILIES: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    RepoLayer: REPO_LAYERS,
    AnchorKind: ANCHOR_KINDS,
    TermCaseMode: TERM_CASE_MODES,
    LocateStatus: LOCATE_STATUSES_V2,
    EvidenceSource: EVIDENCE_SOURCES,
    SearchBackendId: SEARCH_BACKEND_IDS,
    EvidenceRole: EVIDENCE_ROLES,
    ConfirmedReasonCode: CONFIRMED_REASON_CODES,
    CandidateReasonCode: CANDIDATE_REASON_CODES,
    DiscoveryReasonCode: DISCOVERY_REASON_CODES,
    PromotionRequirementCode: PROMOTION_REQUIREMENT_CODES,
    EvidenceOperationCode: EVIDENCE_OPERATION_CODES,
    BackendReasonCode: BACKEND_REASON_CODES,
    LimitReasonCode: LIMIT_REASON_CODES,
    ExclusionReasonCode: EXCLUSION_REASON_CODES,
    RedactionReasonCode: REDACTION_REASON_CODES,
    NextActionCode: NEXT_ACTION_CODES,
    ToolErrorCode: TOOL_ERROR_CODES,
  });

export interface FixtureCompletenessOwner {
  readonly family: string;
  readonly code: string;
  readonly positive: string;
  readonly negative?: string;
}

export interface FixtureCompletenessReport {
  readonly schemaVersion: '1.0';
  readonly ownershipSource: string;
  readonly ownershipSourceHash: string;
  readonly successManifestIds: readonly string[];
  readonly errorManifestIds: readonly string[];
  readonly companionSnapshotIds: readonly string[];
  readonly owners: readonly FixtureCompletenessOwner[];
  readonly publicEvidencePackFieldMutations: readonly {
    readonly path: string;
    readonly normalized: boolean;
  }[];
  readonly status: 'passed';
}

function sorted(values: Iterable<string>): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function sameMembers(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function knownCaseIds(): ReadonlySet<string> {
  return new Set(
    Object.values(RUNNER_SELECTIONS).flatMap((selection) => [
      ...selection.cases,
    ]),
  );
}

type CoveragePolarity = 'positive' | 'negative';

interface VerifiedCaseCoverage {
  readonly positive: Set<string>;
  readonly negative: Set<string>;
}

function coverageKey(family: string, code: string): string {
  return `${family}.${code}`;
}

function addVerifiedCoverage(
  coverage: Map<string, VerifiedCaseCoverage>,
  caseId: string,
  polarity: CoveragePolarity,
  family: string,
  code: string,
): void {
  let entry = coverage.get(caseId);
  if (entry === undefined) {
    entry = { positive: new Set(), negative: new Set() };
    coverage.set(caseId, entry);
  }
  entry[polarity].add(coverageKey(family, code));
}

function addSuccessCoverage(
  coverage: Map<string, VerifiedCaseCoverage>,
  caseId: string,
  goldenCase: Extract<GoldenCase, { readonly kind: 'success' }>,
  result: Extract<LocateResultV2, { readonly ok: true }>,
): void {
  for (const layer of goldenCase.request.layers ?? []) {
    addVerifiedCoverage(coverage, caseId, 'positive', 'RepoLayer', layer);
  }
  for (const anchor of goldenCase.request.anchors ?? []) {
    addVerifiedCoverage(
      coverage,
      caseId,
      'positive',
      'AnchorKind',
      anchor.kind,
    );
  }
  addVerifiedCoverage(
    coverage,
    caseId,
    'positive',
    'TermCaseMode',
    goldenCase.request.termCase ?? 'smart',
  );
  addVerifiedCoverage(
    coverage,
    caseId,
    'positive',
    'LocateStatus',
    result.evidence.status,
  );
  for (const evidence of result.evidence.confirmed) {
    addVerifiedCoverage(
      coverage,
      caseId,
      'positive',
      'EvidenceRole',
      evidence.role,
    );
    for (const code of evidence.reasonCodes) {
      addVerifiedCoverage(
        coverage,
        caseId,
        'positive',
        'ConfirmedReasonCode',
        code,
      );
    }
    for (const source of [
      ...evidence.provenance.discoveredBy,
      evidence.provenance.verifiedBy,
    ]) {
      addVerifiedCoverage(
        coverage,
        caseId,
        'positive',
        'EvidenceSource',
        source,
      );
    }
    for (const operation of evidence.provenance.operations) {
      addVerifiedCoverage(
        coverage,
        caseId,
        'positive',
        'EvidenceOperationCode',
        operation,
      );
    }
    for (const field of evidence.location.redaction?.fields ?? []) {
      for (const reason of field.reasonCodes) {
        addVerifiedCoverage(
          coverage,
          caseId,
          'positive',
          'RedactionReasonCode',
          reason,
        );
      }
    }
  }
  for (const evidence of result.evidence.candidates) {
    addVerifiedCoverage(
      coverage,
      caseId,
      'positive',
      'EvidenceRole',
      evidence.role,
    );
    for (const code of evidence.reasonCodes) {
      addVerifiedCoverage(
        coverage,
        caseId,
        'positive',
        'CandidateReasonCode',
        code,
      );
    }
    for (const source of [
      ...evidence.provenance.discoveredBy,
      evidence.provenance.verifiedBy,
    ]) {
      addVerifiedCoverage(
        coverage,
        caseId,
        'positive',
        'EvidenceSource',
        source,
      );
    }
    for (const operation of evidence.provenance.operations) {
      addVerifiedCoverage(
        coverage,
        caseId,
        'positive',
        'EvidenceOperationCode',
        operation,
      );
    }
    for (const requirement of evidence.promotionRequirements) {
      addVerifiedCoverage(
        coverage,
        caseId,
        'positive',
        'PromotionRequirementCode',
        requirement,
      );
    }
    for (const field of evidence.location.redaction?.fields ?? []) {
      for (const reason of field.reasonCodes) {
        addVerifiedCoverage(
          coverage,
          caseId,
          'positive',
          'RedactionReasonCode',
          reason,
        );
      }
    }
  }
  for (const backend of result.evidence.coverage.backends) {
    addVerifiedCoverage(
      coverage,
      caseId,
      'positive',
      'SearchBackendId',
      backend.backend,
    );
    if (backend.reasonCode !== undefined) {
      addVerifiedCoverage(
        coverage,
        caseId,
        'positive',
        'BackendReasonCode',
        backend.reasonCode,
      );
    }
  }
  for (const reason of result.evidence.coverage.limitsReached) {
    addVerifiedCoverage(
      coverage,
      caseId,
      'positive',
      'LimitReasonCode',
      reason,
    );
  }
  for (const reason of Object.keys(result.evidence.coverage.exclusionSummary)) {
    addVerifiedCoverage(
      coverage,
      caseId,
      'positive',
      'ExclusionReasonCode',
      reason,
    );
  }
  for (const action of result.evidence.nextActions) {
    addVerifiedCoverage(coverage, caseId, 'positive', 'NextActionCode', action);
  }
}

function buildVerifiedCoverage(
  ownership: z.infer<typeof FixtureOwnershipSchema>,
  manifests: readonly GoldenCase[],
  snapshots: ReadonlyMap<
    string,
    Extract<LocateResultV2, { readonly ok: true }>
  >,
): ReadonlyMap<string, VerifiedCaseCoverage> {
  const coverage = new Map<string, VerifiedCaseCoverage>();
  for (const key of runContractSchemaProbes()) {
    const separator = key.indexOf('.');
    addVerifiedCoverage(
      coverage,
      'contract-code-probes',
      'positive',
      key.slice(0, separator),
      key.slice(separator + 1),
    );
  }
  for (const probe of REASON_CODE_NEGATIVE_PROBES) {
    addVerifiedCoverage(
      coverage,
      'evaluator-negative-self-test',
      'negative',
      probe.family,
      probe.code,
    );
  }
  for (const goldenCase of manifests) {
    if (goldenCase.kind === 'success') {
      const owner = ownership.successCases[goldenCase.id];
      const snapshot = snapshots.get(goldenCase.id);
      if (owner === undefined || snapshot === undefined) {
        throw new Error(
          `Missing verified success inputs for ${goldenCase.id}.`,
        );
      }
      addSuccessCoverage(coverage, owner, goldenCase, snapshot);
      continue;
    }
    const owner = ownership.errorCases[goldenCase.id];
    if (owner === undefined) {
      throw new Error(`Missing verified error owner for ${goldenCase.id}.`);
    }
    addVerifiedCoverage(
      coverage,
      owner,
      'positive',
      'ToolErrorCode',
      goldenCase.expected.error.code,
    );
    if (goldenCase.expected.error.suggestedAction !== undefined) {
      addVerifiedCoverage(
        coverage,
        owner,
        'positive',
        'NextActionCode',
        goldenCase.expected.error.suggestedAction,
      );
    }
  }
  return coverage;
}

export function buildFixtureCompletenessReport(
  repositoryRoot: string,
  ownershipOverride?: unknown,
): FixtureCompletenessReport {
  const ownershipRelativePath =
    'testkit/manifests/coverage/fixture-ownership.yaml';
  const ownershipPath = resolve(repositoryRoot, ownershipRelativePath);
  const ownershipText = readFileSync(ownershipPath, 'utf8');
  const ownershipInput = ownershipOverride ?? (parse(ownershipText) as unknown);
  const ownership = FixtureOwnershipSchema.parse(ownershipInput);
  const cases = knownCaseIds();
  const owners: FixtureCompletenessOwner[] = [];

  for (const [family, expectedCodes] of Object.entries(CONTRACT_FAMILIES)) {
    const declared = ownership.families[family];
    if (declared === undefined) {
      throw new Error(`Missing fixture ownership family: ${family}.`);
    }
    const expected = sorted(expectedCodes);
    const actual = sorted(Object.keys(declared));
    if (!sameMembers(expected, actual)) {
      throw new Error(
        `Fixture ownership differs for ${family}: expected ${expected.join(',')}; received ${actual.join(',')}.`,
      );
    }
    for (const code of expected) {
      const entry = declared[code];
      if (entry === undefined) {
        throw new Error(`Missing owner for ${family}.${code}.`);
      }
      if (!cases.has(entry.positive)) {
        throw new Error(
          `Unknown positive owner ${entry.positive} for ${family}.${code}.`,
        );
      }
      if (entry.positive === 'fixture-completeness') {
        throw new Error(`Completeness cannot own ${family}.${code}.`);
      }
      if (
        (family === 'ConfirmedReasonCode' ||
          family === 'CandidateReasonCode') &&
        entry.negative === undefined
      ) {
        throw new Error(`Missing negative owner for ${family}.${code}.`);
      }
      if (entry.negative !== undefined && !cases.has(entry.negative)) {
        throw new Error(
          `Unknown negative owner ${entry.negative} for ${family}.${code}.`,
        );
      }
      if (entry.negative === 'fixture-completeness') {
        throw new Error(
          `Completeness cannot negatively own ${family}.${code}.`,
        );
      }
      owners.push(
        entry.negative === undefined
          ? { family, code, positive: entry.positive }
          : {
              family,
              code,
              positive: entry.positive,
              negative: entry.negative,
            },
      );
    }
  }

  const undeclaredFamilies = Object.keys(ownership.families).filter(
    (family) => CONTRACT_FAMILIES[family] === undefined,
  );
  if (undeclaredFamilies.length > 0) {
    throw new Error(
      `Unknown fixture ownership families: ${sorted(undeclaredFamilies).join(',')}.`,
    );
  }

  const manifestDirectory = resolve(
    repositoryRoot,
    'testkit',
    'manifests',
    'golden',
  );
  const manifests = readdirSync(manifestDirectory)
    .filter((name) => name.endsWith('.yaml'))
    .sort()
    .map((name) => {
      const input: unknown = parse(
        readFileSync(resolve(manifestDirectory, name), 'utf8'),
      );
      return GoldenCaseSchema.parse(input);
    });
  const manifestIds = manifests.map((manifest) => manifest.id);
  if (new Set(manifestIds).size !== manifestIds.length) {
    throw new Error('Golden manifest IDs must be unique.');
  }
  const successManifestIds = sorted(
    manifests
      .filter((manifest) => manifest.kind === 'success')
      .map((manifest) => manifest.id),
  );
  const errorManifestIds = sorted(
    manifests
      .filter((manifest) => manifest.kind === 'error')
      .map((manifest) => manifest.id),
  );
  const companionSnapshotIds = sorted(
    readdirSync(resolve(repositoryRoot, 'testkit', 'expected'))
      .filter((name) => name.endsWith('.json'))
      .map((name) => basename(name, '.json')),
  );
  if (!sameMembers(successManifestIds, companionSnapshotIds)) {
    throw new Error(
      'Every success manifest must have exactly one companion snapshot and no orphan snapshots.',
    );
  }
  if (
    !sameMembers(
      successManifestIds,
      sorted(Object.keys(ownership.successCases)),
    )
  ) {
    throw new Error(
      'Every success manifest must declare exactly one runner owner.',
    );
  }
  if (
    !sameMembers(errorManifestIds, sorted(Object.keys(ownership.errorCases)))
  ) {
    throw new Error(
      'Every error manifest must declare exactly one runner owner.',
    );
  }
  for (const [manifestId, owner] of Object.entries({
    ...ownership.successCases,
    ...ownership.errorCases,
  })) {
    if (!cases.has(owner)) {
      throw new Error(
        `Unknown runner owner ${owner} for manifest ${manifestId}.`,
      );
    }
  }
  const snapshots = new Map<
    string,
    Extract<LocateResultV2, { readonly ok: true }>
  >();
  for (const snapshotId of companionSnapshotIds) {
    const snapshot: unknown = JSON.parse(
      readFileSync(
        resolve(repositoryRoot, 'testkit', 'expected', `${snapshotId}.json`),
        'utf8',
      ),
    );
    const parsed = LocateResultV2Schema.parse(snapshot);
    if (!parsed.ok) {
      throw new Error(
        `Success companion snapshot is not successful: ${snapshotId}.`,
      );
    }
    snapshots.set(snapshotId, parsed);
  }

  const verifiedCoverage = buildVerifiedCoverage(
    ownership,
    manifests,
    snapshots,
  );
  for (const owner of owners) {
    const key = coverageKey(owner.family, owner.code);
    if (!verifiedCoverage.get(owner.positive)?.positive.has(key)) {
      throw new Error(
        `Positive owner ${owner.positive} has no machine-verified assertion for ${key}.`,
      );
    }
    if (
      owner.negative !== undefined &&
      !verifiedCoverage.get(owner.negative)?.negative.has(key)
    ) {
      throw new Error(
        `Negative owner ${owner.negative} has no machine-verified mutation for ${key}.`,
      );
    }
  }

  return {
    schemaVersion: '1.0',
    ownershipSource: ownershipRelativePath,
    ownershipSourceHash: createHash('sha256')
      .update(
        ownershipOverride === undefined
          ? ownershipText
          : JSON.stringify(ownershipInput),
        'utf8',
      )
      .digest('hex'),
    successManifestIds,
    errorManifestIds,
    companionSnapshotIds,
    owners,
    publicEvidencePackFieldMutations: PUBLIC_EVIDENCE_PACK_FIELD_MUTATIONS.map(
      ({ path, normalized }) => ({ path, normalized }),
    ),
    status: 'passed',
  };
}

export function writeFixtureCompletenessReport(
  repositoryRoot: string,
  report: FixtureCompletenessReport,
): string {
  const outputDirectory = resolve(
    repositoryRoot,
    'test-artifacts',
    'completeness',
  );
  mkdirSync(outputDirectory, { recursive: true });
  const outputPath = resolve(
    outputDirectory,
    'mvp-fixture-completeness-v1.json',
  );
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return outputPath;
}
