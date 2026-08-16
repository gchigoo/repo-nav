/**
 * Verify a deterministic CycloneDX SBOM from one exact packed candidate's fresh
 * consumer installation.
 */
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ensureReleaseCandidateV1,
  installReleaseCandidateV1,
} from './release-candidate.mjs';
import { releaseEvidenceCandidateV1 } from './release-evidence-schema.mjs';
import { buildInstalledSbomFromPackageLock } from './sbom-from-shrinkwrap.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const npmCli = join(root, 'node_modules/npm/bin/npm-cli.js');
const tempParent = join(root, 'test-artifacts');
const evidencePath = join(
  root,
  'test-artifacts/release-evidence/installed-sbom-verification-v1.json',
);
let workDir;

function fail(message) {
  throw new Error(message);
}

try {
  const candidate = ensureReleaseCandidateV1(root, npmCli);
  mkdirSync(tempParent, { recursive: true });
  workDir = mkdtempSync(join(tempParent, 'verify-installed-sbom-'));
  const installed = installReleaseCandidateV1({
    root,
    npmCli,
    candidate,
    consumerRoot: join(workDir, 'consumer'),
    consumerName: 'repo-nav-sbom-verifier',
  });
  const pkg = JSON.parse(
    readFileSync(join(installed.installedPackageRoot, 'package.json'), 'utf8'),
  );
  if (pkg.private !== false) fail('private must be false for public beta');
  const result = buildInstalledSbomFromPackageLock(installed.consumerRoot, {
    packageName: candidate.name,
    packageVersion: candidate.version,
    packIntegrity: candidate.packIntegrity,
    tarballSha256: candidate.tarballSha256,
  });
  const rootRef = result.bom.metadata.component['bom-ref'];
  if (rootRef !== `pkg:npm/${pkg.name}@${pkg.version}`) {
    fail('SBOM root bom-ref mismatch');
  }
  if (result.bom.specVersion !== '1.5') {
    fail('SBOM specVersion must be 1.5');
  }
  if (result.componentCount < 1) fail('SBOM components empty');
  const tarballProperty = result.bom.metadata.properties?.find(
    (property) => property.name === 'repo-nav:release:tarballSha256',
  );
  if (tarballProperty?.value !== candidate.tarballSha256) {
    fail('SBOM tarballSha256 binding mismatch');
  }

  for (const required of ['ajv', 'fast-uri', 'zod']) {
    if (!result.packageNames.includes(required)) {
      fail(`installed production graph missing ${required}`);
    }
    const hit = result.bom.components.some(
      (component) =>
        component.name === required || component.name.endsWith(`/${required}`),
    );
    if (!hit) fail(`SBOM missing component for ${required}`);
  }

  const report = {
    schemaVersion: 1,
    ok: true,
    generatedAt: new Date().toISOString(),
    candidate: releaseEvidenceCandidateV1(installed.candidate),
    specVersion: result.bom.specVersion,
    componentCount: result.componentCount,
    edgeCount: result.edgeCount,
    sha256: result.sha256,
    root: rootRef,
    tarballSha256: candidate.tarballSha256,
    failures: Object.freeze([]),
    authority:
      'exact-packed-candidate+immutable-copy+fresh-consumer-package-lock-sbom',
  };
  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
} finally {
  if (workDir !== undefined) {
    rmSync(workDir, { recursive: true, force: true });
  }
}
