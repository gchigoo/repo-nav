import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

import { afterAll, afterEach } from 'vitest';

import {
  bindPendingPlatformAttestations,
  buildPrivatePlatformRunnerResult,
  resetPlatformContractAttestationState,
} from './platform-contract.js';

const resultPath = process.env['REPO_NAV_PLATFORM_RESULT_PATH'];
const repositoryRoot = process.env['REPO_NAV_REPOSITORY_ROOT'];

if (
  resultPath !== undefined &&
  resultPath.length > 0 &&
  repositoryRoot !== undefined &&
  repositoryRoot.length > 0
) {
  const owners = new Set<string>();
  resetPlatformContractAttestationState();

  afterEach((context) => {
    const state = context.task.result?.state;
    if (state !== 'pass' && state !== 'fail') {
      return;
    }
    const filePath = context.task.file?.filepath;
    if (typeof filePath !== 'string' || filePath.length === 0) {
      return;
    }
    const owner = relative(resolve(repositoryRoot), filePath)
      .split(sep)
      .join('/');
    owners.add(owner);
    bindPendingPlatformAttestations(owner);
  });

  afterAll(() => {
    if (owners.size === 1) {
      const onlyOwner = [...owners][0];
      if (onlyOwner !== undefined) {
        bindPendingPlatformAttestations(onlyOwner);
      }
    }
    const result = buildPrivatePlatformRunnerResult([...owners].sort());
    mkdirSync(dirname(resolve(resultPath)), { recursive: true });
    writeFileSync(
      resolve(resultPath),
      `${JSON.stringify(result, null, 2)}\n`,
      'utf8',
    );
  });
}
