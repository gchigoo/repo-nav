import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  PLATFORM_CELLS_V1,
  PLATFORM_COMMANDS_V1,
  PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1,
  applicableBindingsForOs,
} from '../../testkit/contracts/platform-contract.js';
import {
  buildPlatformCoreCommandReportV1,
  type PlatformCoreCommandReportV1,
} from '../../testkit/contracts/platform-evidence-report.js';
import {
  RELEASE_FORBIDDEN_SCRIPT_TOKENS_V2,
  RELEASE_READINESS_PRIVATE_V2,
  RELEASE_READINESS_PUBLISH_V2,
} from '../../testkit/fixtures/release-v2/release-readiness-v2.js';
import { EXPECTED_PACKAGE_VERSION_V2 } from '../../testkit/fixtures/release-v2/version-sources-v2.js';
import {
  isExplicitlySelected,
  isSelected,
} from '../../testkit/testing/selection.js';
import {
  computeOwnerActionsDecisionSha256,
  validateOwnerActions,
  // @ts-expect-error release helpers are plain ESM modules without declarations
} from '../../tools/release/owner-action-schema.mjs';
import {
  executeReleaseBuildV1,
  // @ts-expect-error release helpers are plain ESM modules without declarations
} from '../../tools/release/build-receipt.mjs';
import {
  materializeReleaseCandidateV1,
  // @ts-expect-error release helpers are plain ESM modules without declarations
} from '../../tools/release/pack-candidate.mjs';
import {
  RELEASE_CANDIDATE_LOCK_V1,
  ensureReleaseCandidateV1,
  loadReleaseCandidateV1,
  writeReleaseCandidateManifestV1,
  // @ts-expect-error release helpers are plain ESM modules without declarations
} from '../../tools/release/release-candidate.mjs';
import {
  validateInstalledAuditEvidenceV1,
  validateInstalledClosureEvidenceV1,
  validateOwnerVerificationEvidenceV1,
  validateRealConsumerEvidenceV1,
  // @ts-expect-error release helpers are plain ESM modules without declarations
} from '../../tools/release/release-evidence-schema.mjs';

const root = resolve(import.meta.dirname, '../..');
const npmCli = resolve(root, 'node_modules/npm/bin/npm-cli.js');
const releaseReadinessIdentity = {
  group: 'public-beta-release',
  caseId: 'release-readiness',
} as const;
const explicitReleaseReadiness = isExplicitlySelected(releaseReadinessIdentity);

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

interface SixCellCandidateV1 {
  readonly name: string;
  readonly version: string;
  readonly tarballSha256: string;
  readonly sourceSha256: string;
}

function currentSourceSha(): string {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  });
  if (result.status !== 0 || !/^[0-9a-f]{40}$/u.test(result.stdout.trim())) {
    throw new Error('current source SHA unavailable');
  }
  return result.stdout.trim();
}

function createSixCellReports(
  candidate: SixCellCandidateV1,
  completedAt: string = new Date().toISOString(),
): readonly PlatformCoreCommandReportV1[] {
  const sourceSha = currentSourceSha();
  const productionClosureSha256 = 'd'.repeat(64);
  const commandOutcomes = Object.fromEntries(
    PLATFORM_COMMANDS_V1.map((command) => [command.id, 'success'] as const),
  ) as Record<(typeof PLATFORM_COMMANDS_V1)[number]['id'], 'success'>;
  return PLATFORM_CELLS_V1.map((cell) => {
    const applicable = applicableBindingsForOs(
      PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1,
      cell.os,
    );
    const passedAssertionMarkers = applicable.flatMap((binding) =>
      binding.requiredAssertionIds.map((assertionId) => ({
        contractId: binding.contractId,
        assertionId,
      })),
    );
    const contractEvidenceHashes = applicable.flatMap((binding) =>
      binding.requiredEvidenceHashIds.map((evidenceId) => ({
        contractId: binding.contractId,
        evidenceId,
        sha256:
          evidenceId === 'candidate-id'
            ? candidate.tarballSha256
            : evidenceId === 'semantic-manifest'
              ? candidate.sourceSha256
              : productionClosureSha256,
      })),
    );
    return buildPlatformCoreCommandReportV1({
      cellId: cell.id,
      actual: cell,
      run: { workflowRunId: '1234567890', runAttempt: 1 },
      revision: {
        workflowSha: 'a'.repeat(40),
        sourceSha,
        eventName: 'push',
      },
      commandOutcomes,
      requiredCaseIds: applicable.map((binding) => binding.contractId).sort(),
      passedAssertionMarkers,
      contractEvidenceHashes,
      completedAt,
    });
  });
}

function writeSixCellReports(
  directory: string,
  reports: readonly unknown[],
): void {
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  for (const report of reports) {
    const cellId =
      typeof report === 'object' && report !== null
        ? Reflect.get(report, 'cellId')
        : undefined;
    if (typeof cellId !== 'string') {
      throw new Error('synthetic platform report cellId missing');
    }
    writeFileSync(
      join(directory, `${cellId}.json`),
      `${JSON.stringify(report, null, 2)}\n`,
    );
  }
}

function runSixCellAggregate(directory: string) {
  return spawnSync(
    process.execPath,
    [
      resolve(root, 'tools/ci/assert-public-beta-package-evidence.mjs'),
      '--require-six-cell',
      '--report-dir',
      directory,
    ],
    { cwd: root, encoding: 'utf8', shell: false },
  );
}

function createCandidateFixture(): {
  readonly fixtureRoot: string;
  readonly manifestPath: string;
  readonly candidate: Record<string, unknown>;
} {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'repo-nav-candidate-'));
  writeFileSync(
    join(fixtureRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'repo-nav',
        version: '2.0.0',
        private: false,
        type: 'module',
        files: ['dist/**/*.js', 'dist/**/*.d.ts', 'README.md'],
        devDependencies: { typescript: '5.8.3' },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(join(fixtureRoot, 'README.md'), 'candidate-v1\n');
  writeFileSync(
    join(fixtureRoot, 'tsconfig.build.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          declaration: true,
          outDir: './dist',
          rootDir: './src',
          strict: true,
          sourceMap: false,
          declarationMap: false,
          newLine: 'lf',
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    )}\n`,
  );
  mkdirSync(join(fixtureRoot, 'src'));
  writeFileSync(
    join(fixtureRoot, 'src/index.ts'),
    "export const candidateFixture = 'compiled';\n",
  );
  symlinkSync(
    resolve(root, 'node_modules'),
    resolve(fixtureRoot, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  const designDirectory = join(
    fixtureRoot,
    'docs/superpowers/archive/codestable/features/2026-07-24-public-beta-release',
  );
  mkdirSync(designDirectory, { recursive: true });
  writeFileSync(
    join(designDirectory, 'public-beta-release-design.md'),
    'fixture design\n',
  );
  writeFileSync(
    join(designDirectory, 'public-beta-release-checklist.yaml'),
    'schemaVersion: 1\n',
  );
  const sourceManifestDirectory = join(
    fixtureRoot,
    'testkit/manifests/release-v2',
  );
  mkdirSync(sourceManifestDirectory, { recursive: true });
  writeFileSync(
    join(sourceManifestDirectory, 'release-candidate-source-paths-v1.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        paths: [
          'package.json',
          'README.md',
          'tsconfig.build.json',
          'src',
          'docs/superpowers/archive/codestable/features/2026-07-24-public-beta-release/public-beta-release-design.md',
          'docs/superpowers/archive/codestable/features/2026-07-24-public-beta-release/public-beta-release-checklist.yaml',
          'testkit/manifests/release-v2/release-candidate-source-paths-v1.json',
        ],
      },
      null,
      2,
    )}\n`,
  );
  const execution = executeReleaseBuildV1(
    fixtureRoot,
    (buildCapability: object) =>
      materializeReleaseCandidateV1({
        root: fixtureRoot,
        npmCli,
        buildCapability,
      }),
  ) as {
    result: {
      manifestPath: string;
    };
  };
  const manifest = JSON.parse(
    readFileSync(execution.result.manifestPath, 'utf8'),
  ) as {
    candidate: Record<string, unknown>;
  };
  return {
    fixtureRoot,
    manifestPath: execution.result.manifestPath,
    candidate: manifest.candidate,
  };
}

describe.runIf(isSelected(releaseReadinessIdentity))(
  'F9-RELEASE-001 release-readiness',
  () => {
    it('keeps private false, publish scripts absent, and forbids publish/push/release scripts', () => {
      const pkg = JSON.parse(
        readFileSync(resolve(root, 'package.json'), 'utf8'),
      ) as {
        private: boolean;
        version: string;
        scripts: Record<string, string>;
      };
      expect(pkg.private).toBe(RELEASE_READINESS_PRIVATE_V2);
      expect(pkg.version).toBe(EXPECTED_PACKAGE_VERSION_V2);
      expect(RELEASE_READINESS_PUBLISH_V2).toBe(false);
      const scriptBlob = Object.values(pkg.scripts).join('\n');
      for (const token of RELEASE_FORBIDDEN_SCRIPT_TOKENS_V2) {
        expect(scriptBlob).not.toContain(token);
      }
    });

    it('uses one release-owner authority across owner and consumer validators', () => {
      const ownerAuthority = readFileSync(
        resolve(root, 'tools/release/release-owner.mjs'),
        'utf8',
      );
      expect(ownerAuthority).toContain("RELEASE_OWNER_V1 = 'Gchigoo'");
      for (const relativePath of [
        'tools/release/owner-action-schema.mjs',
        'tools/release/real-consumer-contracts.mjs',
        'tools/release/write-owner-preflight.mjs',
      ]) {
        const source = readFileSync(resolve(root, relativePath), 'utf8');
        expect(source).toContain("from './release-owner.mjs'");
        expect(source).not.toContain("= 'Gchigoo'");
      }
    });

    it('validates strict owner actions against the exact candidate and preflight', () => {
      const candidate = {
        name: 'repo-nav',
        version: '2.0.0',
        tarballSha256: 'a'.repeat(64),
        designRevisionSha256: 'b'.repeat(64),
      };
      const preflight = {
        license: {
          decisionSha256: 'c'.repeat(64),
          choice: 'MIT',
          copyrightYear: '2026',
          copyrightHolder: 'Gchigoo',
        },
        securityChannel: {
          decisionSha256: 'd'.repeat(64),
          channelType: 'github-private-vulnerability-reporting',
          publicSafeText:
            'Report security issues via GitHub Security Advisories for gchigoo/repo-nav. Do not file public issues for vulnerabilities or secrets.',
        },
      };
      const actions = {
        schemaVersion: 1,
        candidate: { ...candidate },
        license: {
          action: 'license-final',
          preflightDecisionSha256: preflight.license.decisionSha256,
          choice: preflight.license.choice,
          copyrightYear: preflight.license.copyrightYear,
          copyrightHolder: preflight.license.copyrightHolder,
        },
        securityChannel: {
          action: 'security-channel-final',
          preflightDecisionSha256: preflight.securityChannel.decisionSha256,
          channelType: preflight.securityChannel.channelType,
          publicSafeText: preflight.securityChannel.publicSafeText,
        },
        owner: 'Gchigoo',
        verified_at: new Date().toISOString(),
        decisionSha256: '',
      };
      actions.decisionSha256 = computeOwnerActionsDecisionSha256(actions);

      expect(
        validateOwnerActions(actions, { candidate, preflight }),
      ).toMatchObject({
        candidate,
        decisionSha256: actions.decisionSha256,
      });
      expect(() =>
        validateOwnerActions(
          {
            ...actions,
            candidate: { ...actions.candidate, tarballSha256: 'e'.repeat(64) },
            decisionSha256: computeOwnerActionsDecisionSha256({
              ...actions,
              candidate: {
                ...actions.candidate,
                tarballSha256: 'e'.repeat(64),
              },
            }),
          },
          { candidate, preflight },
        ),
      ).toThrow(/candidate tarballSha256 mismatch/u);
      expect(() =>
        validateOwnerActions(
          { ...actions, undeclared: true },
          { candidate, preflight },
        ),
      ).toThrow(/keys mismatch/u);

      const staleActions = {
        ...actions,
        verified_at: '2026-01-01T00:00:00.000Z',
        decisionSha256: '',
      };
      staleActions.decisionSha256 =
        computeOwnerActionsDecisionSha256(staleActions);
      expect(() =>
        validateOwnerActions(staleActions, {
          candidate,
          preflight,
          now: Date.parse('2026-08-15T00:00:00.000Z'),
        }),
      ).toThrow(/within 7d/u);
      expect(() =>
        validateOwnerActions(
          { ...actions, decisionSha256: 'f'.repeat(64) },
          { candidate, preflight },
        ),
      ).toThrow(/decisionSha256 mismatch/u);
    });

    it('rejects candidate digest, filesystem, path, and stale-source mutations', () => {
      const fixture = createCandidateFixture();
      try {
        const originalManifest = {
          schemaVersion: 1,
          candidate: fixture.candidate,
        };
        expect(() =>
          writeReleaseCandidateManifestV1({ root: fixture.fixtureRoot }),
        ).toThrow(/release build capability missing/u);
        const writeManifest = (candidate: Record<string, unknown>) =>
          writeFileSync(
            fixture.manifestPath,
            `${JSON.stringify({ schemaVersion: 1, candidate }, null, 2)}\n`,
          );
        const tarballPath = join(
          fixture.fixtureRoot,
          String(fixture.candidate.tarballPath),
        );
        const originalTarball = readFileSync(tarballPath);
        expect(
          loadReleaseCandidateV1(fixture.fixtureRoot, npmCli),
        ).toMatchObject({
          name: 'repo-nav',
          version: '2.0.0',
          buildOutputSha256: fixture.candidate.buildOutputSha256,
          buildReceiptSha256: fixture.candidate.buildReceiptSha256,
        });

        const mutatingNpmCli = join(
          fixture.fixtureRoot,
          'mutating-npm-cli.mjs',
        );
        writeFileSync(
          mutatingNpmCli,
          `import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

appendFileSync(${JSON.stringify(tarballPath)}, Buffer.of(0));
const result = spawnSync(
  process.execPath,
  [${JSON.stringify(npmCli)}, ...process.argv.slice(2)],
  { cwd: process.cwd(), encoding: 'utf8', shell: false, env: process.env },
);
if (result.error !== undefined) throw result.error;
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exitCode = result.status ?? 1;
`,
          'utf8',
        );
        expect(() =>
          loadReleaseCandidateV1(fixture.fixtureRoot, mutatingNpmCli),
        ).toThrow(/release candidate tarballSha256 mismatch/u);
        expect(readFileSync(tarballPath).byteLength).toBe(
          originalTarball.byteLength + 1,
        );
        writeFileSync(tarballPath, originalTarball);

        writeManifest({
          ...fixture.candidate,
          buildOutputSha256: '7'.repeat(64),
        });
        expect(() =>
          loadReleaseCandidateV1(fixture.fixtureRoot, npmCli),
        ).toThrow(/build receipt mismatch/u);

        writeManifest({
          ...fixture.candidate,
          buildReceiptSha256: '8'.repeat(64),
        });
        expect(() =>
          loadReleaseCandidateV1(fixture.fixtureRoot, npmCli),
        ).toThrow(/build receipt mismatch/u);

        writeManifest(fixture.candidate);
        const buildReceiptPath = join(
          fixture.fixtureRoot,
          'dist/.repo-nav-build-receipt-v1.json',
        );
        const buildReceipt = readFileSync(buildReceiptPath);
        rmSync(buildReceiptPath);
        expect(() =>
          loadReleaseCandidateV1(fixture.fixtureRoot, npmCli),
        ).toThrow(/release build receipt is missing/u);
        writeFileSync(buildReceiptPath, buildReceipt);

        writeManifest({
          ...fixture.candidate,
          tarballSha256: 'b'.repeat(64),
        });
        expect(() =>
          loadReleaseCandidateV1(fixture.fixtureRoot, npmCli),
        ).toThrow(/tarballSha256 mismatch/u);

        writeManifest({
          ...fixture.candidate,
          packIntegrity: `sha512-${Buffer.alloc(64).toString('base64')}`,
        });
        expect(() =>
          loadReleaseCandidateV1(fixture.fixtureRoot, npmCli),
        ).toThrow(/packIntegrity mismatch/u);

        writeManifest({
          ...fixture.candidate,
          packedBytes: Number(fixture.candidate.packedBytes) + 1,
        });
        expect(() =>
          loadReleaseCandidateV1(fixture.fixtureRoot, npmCli),
        ).toThrow(/packedBytes mismatch/u);

        writeFileSync(
          tarballPath,
          Buffer.concat([originalTarball, Buffer.of(0)]),
        );
        writeManifest({
          ...fixture.candidate,
          tarballSha256: sha256(readFileSync(tarballPath)),
        });
        expect(() =>
          loadReleaseCandidateV1(fixture.fixtureRoot, npmCli),
        ).toThrow(/packShasum mismatch/u);
        writeFileSync(tarballPath, originalTarball);

        writeManifest({
          ...fixture.candidate,
          tarballPath: 'outside.tgz',
        });
        expect(() =>
          loadReleaseCandidateV1(fixture.fixtureRoot, npmCli),
        ).toThrow(/escaped candidate directory/u);

        writeManifest(fixture.candidate);
        const externalTarball = join(fixture.fixtureRoot, 'external.tgz');
        writeFileSync(externalTarball, originalTarball);
        rmSync(tarballPath);
        symlinkSync(externalTarball, tarballPath);
        expect(() =>
          loadReleaseCandidateV1(fixture.fixtureRoot, npmCli),
        ).toThrow(/regular file/u);
        rmSync(tarballPath);
        writeFileSync(tarballPath, originalTarball);

        const lockPath = join(fixture.fixtureRoot, RELEASE_CANDIDATE_LOCK_V1);
        const lockTarget = join(fixture.fixtureRoot, 'untrusted-lock-target');
        writeFileSync(lockTarget, 'untrusted\n');
        symlinkSync(lockTarget, lockPath);
        expect(
          loadReleaseCandidateV1(fixture.fixtureRoot, npmCli),
        ).toMatchObject({ tarballSha256: fixture.candidate.tarballSha256 });
        expect(existsSync(lockPath)).toBe(false);

        writeFileSync(
          lockPath,
          `${JSON.stringify({
            pid: 2_147_483_647,
            token: 'a'.repeat(32),
            acquiredAt: '2020-01-01T00:00:00.000Z',
          })}\n`,
        );
        expect(
          loadReleaseCandidateV1(fixture.fixtureRoot, npmCli),
        ).toMatchObject({ tarballSha256: fixture.candidate.tarballSha256 });
        expect(existsSync(lockPath)).toBe(false);

        writeFileSync(
          fixture.manifestPath,
          `${JSON.stringify(originalManifest, null, 2)}\n`,
        );
        writeFileSync(join(fixture.fixtureRoot, 'README.md'), 'candidate-v2\n');
        expect(() =>
          loadReleaseCandidateV1(fixture.fixtureRoot, npmCli),
        ).toThrow(/release build receipt source digest mismatch/u);
      } finally {
        rmSync(fixture.fixtureRoot, { recursive: true, force: true });
      }
    });

    it('rejects minimal, stale, and internally inconsistent persisted release evidence', () => {
      const now = Date.parse('2026-08-15T06:00:00.000Z');
      const generatedAt = '2026-08-15T05:59:00.000Z';
      const candidate = {
        name: 'repo-nav',
        version: '2.0.0',
        tarballSha256: 'a'.repeat(64),
        sourceSha256: 'b'.repeat(64),
        designRevisionSha256: 'c'.repeat(64),
        packIntegrity: `sha512-${Buffer.alloc(64).toString('base64')}`,
        packedBytes: 100,
      };
      const closure = {
        schemaVersion: 1,
        ok: true,
        generatedAt,
        candidate,
        nodeCount: 2,
        edgeCount: 1,
        npmLsExitStatus: 0,
        problems: [],
        failures: [],
        authority:
          'exact-packed-candidate+immutable-copy+fresh-consumer-package-lock+npm-ls',
      };
      expect(
        validateInstalledClosureEvidenceV1(closure, candidate, { now }),
      ).toBe(closure);
      expect(() =>
        validateInstalledClosureEvidenceV1(
          { schemaVersion: 1, ok: true },
          candidate,
          { now },
        ),
      ).toThrow(/keys mismatch/u);
      expect(() =>
        validateInstalledClosureEvidenceV1(
          { ...closure, generatedAt: '2026-08-01T00:00:00.000Z' },
          candidate,
          { now },
        ),
      ).toThrow(/stale/u);

      const audit = {
        schemaVersion: 1,
        ok: true,
        generatedAt,
        authority:
          'exact-packed-candidate+immutable-copy+fresh-consumer-npm-audit',
        candidate,
        candidateVersion: candidate.version,
        tarballSha256: candidate.tarballSha256,
        auditExitStatus: 0,
        counts: {
          info: 0,
          low: 0,
          moderate: 0,
          high: 0,
          critical: 0,
          total: 0,
        },
        low: 0,
        moderate: 0,
        high: 0,
        critical: 0,
        blockingFindings: 0,
        disposedFindings: 0,
        failures: [],
      };
      expect(validateInstalledAuditEvidenceV1(audit, candidate, { now })).toBe(
        audit,
      );
      expect(() =>
        validateInstalledAuditEvidenceV1(
          { ...audit, blockingFindings: 1 },
          candidate,
          { now },
        ),
      ).toThrow(/blocking findings/u);

      const ownerSource = {
        ownerActionsDecisionSha256: 'd'.repeat(64),
        ownerActionsVerifiedAt: generatedAt,
        ownerActionsSourceSha256: 'e'.repeat(64),
        confirmationDecisionSha256: 'f'.repeat(64),
        confirmationVerifiedAt: generatedAt,
        confirmationSourceSha256: '1'.repeat(64),
        preflightSourceSha256: '2'.repeat(64),
      };
      const owner = {
        schemaVersion: 1,
        ok: true,
        generatedAt,
        candidate,
        designRevisionSha256: candidate.designRevisionSha256,
        ...ownerSource,
        preflightValidated: true,
        ownerActionsValidated: true,
        realConsumerConfirmationValidated: true,
        residuals: [],
      };
      expect(
        validateOwnerVerificationEvidenceV1(owner, candidate, ownerSource, {
          now,
        }),
      ).toBe(owner);
      expect(() =>
        validateOwnerVerificationEvidenceV1(
          { ...owner, ownerActionsDecisionSha256: '3'.repeat(64) },
          candidate,
          ownerSource,
          { now },
        ),
      ).toThrow(/source binding/u);

      const consumerSource = {
        confirmationDecisionSha256: ownerSource.confirmationDecisionSha256,
        confirmationVerifiedAt: generatedAt,
        confirmationSourceSha256: ownerSource.confirmationSourceSha256,
        confirmedHeadSha: '4'.repeat(40),
        indexSha256: '5'.repeat(64),
        worktreeTreeSha256: '6'.repeat(64),
        worktreeEntryCount: 2,
      };
      const consumer = {
        ok: true,
        schemaVersion: 1,
        generatedAt,
        confirmationDecisionSha256: consumerSource.confirmationDecisionSha256,
        confirmationVerifiedAt: consumerSource.confirmationVerifiedAt,
        confirmationSourceSha256: consumerSource.confirmationSourceSha256,
        candidate,
        measured: {
          cli: {
            exitCode: 0,
            signal: null,
            stderrEmpty: true,
            jsonValid: true,
          },
          locate: {
            ok: true,
            schemaVersion: '2.0',
            status: 'partial',
            evidenceSatisfied: true,
          },
          mcp: {
            exitCode: 0,
            signal: null,
            stderrEmpty: true,
            transcriptValid: true,
          },
          mcpCliParity: true,
          forbiddenScanPassed: true,
          repositoryUnchanged: true,
        },
        repository: {
          headSha: consumerSource.confirmedHeadSha,
          indexSha256: consumerSource.indexSha256,
          worktreeTreeSha256: consumerSource.worktreeTreeSha256,
          worktreeEntryCount: consumerSource.worktreeEntryCount,
        },
      };
      expect(
        validateRealConsumerEvidenceV1(consumer, candidate, consumerSource, {
          now,
        }),
      ).toBe(consumer);
      expect(() =>
        validateRealConsumerEvidenceV1(
          {
            ...consumer,
            confirmationVerifiedAt: '2026-08-01T00:00:00.000Z',
          },
          candidate,
          {
            ...consumerSource,
            confirmationVerifiedAt: '2026-08-01T00:00:00.000Z',
          },
          { now },
        ),
      ).toThrow(/stale/u);
    });

    it('serializes stale-lock recovery and independent candidate writers', async () => {
      const fixtureRoot = mkdtempSync(join(tmpdir(), 'repo-nav-lock-race-'));
      const sharedPath = join(fixtureRoot, 'writer-active');
      const lockPath = join(fixtureRoot, RELEASE_CANDIDATE_LOCK_V1);
      mkdirSync(join(fixtureRoot, 'test-artifacts'), { recursive: true });
      writeFileSync(
        lockPath,
        `${JSON.stringify({
          pid: 2_147_483_647,
          token: 'b'.repeat(32),
          acquiredAt: '2020-01-01T00:00:00.000Z',
        })}\n`,
      );
      const moduleUrl = pathToFileURL(
        resolve(root, 'tools/release/release-candidate.mjs'),
      ).href;
      const script = `
      import { existsSync, rmSync, writeFileSync } from 'node:fs';
      import { withReleaseCandidateLockV1 } from ${JSON.stringify(moduleUrl)};
      const [root, shared] = process.argv.slice(1);
      withReleaseCandidateLockV1(root, () => {
        if (existsSync(shared)) throw new Error('writer overlap');
        writeFileSync(shared, String(process.pid));
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150);
        rmSync(shared, { force: true });
      });
    `;
      const runWriter = () =>
        new Promise<void>((resolvePromise, rejectPromise) => {
          const child = spawn(
            process.execPath,
            ['--input-type=module', '--eval', script, fixtureRoot, sharedPath],
            { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
          );
          let stderr = '';
          child.stderr.setEncoding('utf8');
          child.stderr.on('data', (chunk) => {
            stderr += chunk;
          });
          child.once('error', rejectPromise);
          child.once('close', (code, signal) => {
            if (code === 0 && signal === null) {
              resolvePromise();
            } else {
              rejectPromise(new Error(stderr || `writer exited ${code}`));
            }
          });
        });
      try {
        await Promise.all(Array.from({ length: 6 }, () => runWriter()));
        expect(existsSync(sharedPath)).toBe(false);
        expect(existsSync(lockPath)).toBe(false);
      } finally {
        rmSync(fixtureRoot, { recursive: true, force: true });
      }
    });

    it.runIf(explicitReleaseReadiness)(
      'strictly binds six-cell reports to all commands and the current candidate',
      { timeout: 120_000 },
      () => {
        const reportRoot = mkdtempSync(join(tmpdir(), 'repo-nav-six-cell-'));
        try {
          const candidate = ensureReleaseCandidateV1(
            root,
            npmCli,
          ) as SixCellCandidateV1;
          const reports = createSixCellReports(candidate);
          const cloneReports = (): Record<string, unknown>[] =>
            JSON.parse(JSON.stringify(reports)) as Record<string, unknown>[];
          writeSixCellReports(reportRoot, reports);
          const valid = runSixCellAggregate(reportRoot);
          expect(valid.status, valid.stderr).toBe(0);
          expect(JSON.parse(valid.stdout)).toMatchObject({
            ok: true,
            candidate: {
              name: candidate.name,
              version: candidate.version,
              tarballSha256: candidate.tarballSha256,
              sourceSha256: candidate.sourceSha256,
            },
          });

          const missingCommand = cloneReports();
          const missingCommands = missingCommand[0]?.['commands'];
          if (!Array.isArray(missingCommands)) {
            throw new Error('synthetic commands missing');
          }
          missingCommands.pop();
          writeSixCellReports(reportRoot, missingCommand);
          expect(runSixCellAggregate(reportRoot).status).toBe(1);

          const extraField = cloneReports();
          if (extraField[0] === undefined) {
            throw new Error('synthetic report missing');
          }
          extraField[0]['undeclared'] = true;
          writeSixCellReports(reportRoot, extraField);
          expect(runSixCellAggregate(reportRoot).status).toBe(1);

          const staleRevision = cloneReports();
          const revision = staleRevision[0]?.['revision'];
          if (typeof revision !== 'object' || revision === null) {
            throw new Error('synthetic revision missing');
          }
          Reflect.set(revision, 'sourceSha', 'f'.repeat(40));
          writeSixCellReports(reportRoot, staleRevision);
          expect(runSixCellAggregate(reportRoot).status).toBe(1);

          const candidateDrift = cloneReports();
          const candidateEvidence =
            candidateDrift[0]?.['contractEvidenceHashes'];
          if (!Array.isArray(candidateEvidence)) {
            throw new Error('synthetic candidate evidence missing');
          }
          const candidateId = candidateEvidence.find(
            (entry) =>
              typeof entry === 'object' &&
              entry !== null &&
              Reflect.get(entry, 'evidenceId') === 'candidate-id',
          );
          if (candidateId === undefined) {
            throw new Error('synthetic candidate id missing');
          }
          Reflect.set(candidateId, 'sha256', 'e'.repeat(64));
          writeSixCellReports(reportRoot, candidateDrift);
          expect(runSixCellAggregate(reportRoot).status).toBe(1);

          const closureDrift = cloneReports();
          const closureEvidence = closureDrift[1]?.['contractEvidenceHashes'];
          if (!Array.isArray(closureEvidence)) {
            throw new Error('synthetic closure evidence missing');
          }
          const closure = closureEvidence.find(
            (entry) =>
              typeof entry === 'object' &&
              entry !== null &&
              Reflect.get(entry, 'evidenceId') === 'production-closure',
          );
          if (closure === undefined) {
            throw new Error('synthetic closure hash missing');
          }
          Reflect.set(closure, 'sha256', 'c'.repeat(64));
          writeSixCellReports(reportRoot, closureDrift);
          expect(runSixCellAggregate(reportRoot).status).toBe(1);

          writeSixCellReports(
            reportRoot,
            createSixCellReports(candidate, '2020-01-01T00:00:00.000Z'),
          );
          expect(runSixCellAggregate(reportRoot).status).toBe(1);
        } finally {
          rmSync(reportRoot, { recursive: true, force: true });
        }
      },
    );

    it('keeps readiness fail-closed while candidate-bound external evidence is absent', () => {
      const result = spawnSync(
        process.execPath,
        [resolve(root, 'tools/release/create-release-readiness.mjs')],
        { cwd: root, encoding: 'utf8', shell: false },
      );
      const report = JSON.parse(result.stdout) as {
        ok: boolean;
        publishPerformed: boolean;
        residuals: string[];
      };

      expect(result.status).toBe(2);
      expect(report.ok).toBe(false);
      expect(report.publishPerformed).toBe(false);
      expect(report.residuals.length).toBeGreaterThan(0);
      expect(report.residuals).toContain(
        'remote-six-cell-evidence-missing-or-invalid',
      );
    });
  },
);
