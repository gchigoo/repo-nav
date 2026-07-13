import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  buildFixtureCompletenessReport,
  runContractSchemaProbes,
  writeFixtureCompletenessReport,
} from '../../testkit/contracts/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

const identity = {
  group: 'verification-contract',
  caseId: 'fixture-completeness',
} as const;

const probeIdentity = {
  group: 'verification-contract',
  caseId: 'contract-code-probes',
} as const;

describe.runIf(isSelected(probeIdentity))('contract enum/code probes', () => {
  it('executes every explicit schema probe independently of owner declarations', () => {
    expect(runContractSchemaProbes()).toHaveLength(79);
  });
});

describe.runIf(isSelected(identity))('MVP fixture completeness', () => {
  it('derives enum/code ownership and companion coverage without group-name inference', () => {
    const repositoryRoot = resolve(import.meta.dirname, '..', '..');
    const report = buildFixtureCompletenessReport(repositoryRoot);
    const reportPath = writeFixtureCompletenessReport(repositoryRoot, report);

    expect(report.status).toBe('passed');
    expect(report.owners.length).toBeGreaterThan(70);
    expect(report.successManifestIds).toEqual(report.companionSnapshotIds);
    expect(
      report.owners
        .filter(({ family }) =>
          family === 'ConfirmedReasonCode' || family === 'CandidateReasonCode',
        )
        .every(({ negative }) => negative !== undefined),
    ).toBe(true);
    expect(report.publicEvidencePackFieldMutations.length).toBeGreaterThan(40);
    expect(reportPath).toContain('test-artifacts');
  });

  it('rejects an unrelated registered case masquerading as a code owner', () => {
    const repositoryRoot = resolve(import.meta.dirname, '..', '..');
    const ownershipText = readFileSync(
      resolve(
        repositoryRoot,
        'testkit',
        'manifests',
        'coverage',
        'fixture-ownership.yaml',
      ),
      'utf8',
    );
    const unrelatedOwner = parse(
      ownershipText.replace(
        'SECRET_LIKE_VALUE: {positive: contract-code-probes}',
        'SECRET_LIKE_VALUE: {positive: source-field-mapping}',
      ),
    ) as unknown;
    expect(() =>
      buildFixtureCompletenessReport(repositoryRoot, unrelatedOwner),
    ).toThrow(/no machine-verified assertion/iu);
  });
});
