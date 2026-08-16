/**
 * One-process clean TypeScript build and exact package candidate materializer.
 */
import { realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { executeReleaseBuildV1 } from './build-receipt.mjs';
import { materializeReleaseCandidateV1 } from './pack-candidate.mjs';

const modulePath = fileURLToPath(import.meta.url);
const root = resolve(dirname(modulePath), '../..');
const npmCli = join(root, 'node_modules/npm/bin/npm-cli.js');

function runBuildPackageCandidateV1() {
  const execution = executeReleaseBuildV1(root, (buildCapability) =>
    materializeReleaseCandidateV1({
      root,
      npmCli,
      buildCapability,
    }),
  );
  const candidate = execution.result;
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        builder: 'build-package-candidate',
        typescriptVersion: execution.receipt.typescriptVersion,
        sourceSha256: execution.receipt.sourceSha256,
        buildOutputSha256: execution.receipt.outputSha256,
        buildReceiptSha256: execution.receipt.receiptSha256,
        tarballPath: candidate.tarballPath,
        tarballSha256: candidate.tarballSha256,
      },
      null,
      2,
    )}\n`,
  );
}

const entryPath = process.argv[1];
if (
  entryPath !== undefined &&
  realpathSync.native(resolve(entryPath)) === realpathSync.native(modulePath)
) {
  try {
    runBuildPackageCandidateV1();
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
