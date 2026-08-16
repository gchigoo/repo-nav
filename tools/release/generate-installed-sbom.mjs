/**
 * Write a deterministic CycloneDX SBOM from one exact packed candidate's fresh
 * consumer installation.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ensureReleaseCandidateV1,
  installReleaseCandidateV1,
} from './release-candidate.mjs';
import { buildInstalledSbomFromPackageLock } from './sbom-from-shrinkwrap.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const npmCli = join(root, 'node_modules/npm/bin/npm-cli.js');
const tempParent = join(root, 'test-artifacts');
let workDir;

try {
  const candidate = ensureReleaseCandidateV1(root, npmCli);
  mkdirSync(tempParent, { recursive: true });
  workDir = mkdtempSync(join(tempParent, 'installed-sbom-'));
  const installed = installReleaseCandidateV1({
    root,
    npmCli,
    candidate,
    consumerRoot: join(workDir, 'consumer'),
    consumerName: 'repo-nav-sbom-consumer',
  });
  const result = buildInstalledSbomFromPackageLock(installed.consumerRoot, {
    packageName: candidate.name,
    packageVersion: candidate.version,
    packIntegrity: candidate.packIntegrity,
    tarballSha256: candidate.tarballSha256,
  });
  const outDir = join(root, 'test-artifacts', 'release-sbom');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'installed-sbom.cdx.json'), result.text);
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        path: 'test-artifacts/release-sbom/installed-sbom.cdx.json',
        tarballSha256: candidate.tarballSha256,
        sha256: result.sha256,
        componentCount: result.componentCount,
        edgeCount: result.edgeCount,
        specVersion: result.bom.specVersion,
      },
      null,
      2,
    )}\n`,
  );
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
} finally {
  if (workDir !== undefined) {
    rmSync(workDir, { recursive: true, force: true });
  }
}
