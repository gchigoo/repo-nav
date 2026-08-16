import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  REAL_CONSUMER_RELEASE_OWNER_V2,
  REAL_CONSUMER_SENSITIVE_POLICY_V2,
} from '../../testkit/fixtures/release-v2/real-consumer-confirmation-schema-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';
import {
  computeConfirmationDecisionSha256,
  validateRealConsumerConfirmation,
  // @ts-expect-error release helpers are plain ESM modules without declarations
} from '../../tools/release/real-consumer-contracts.mjs';

const selected = isSelected({
  group: 'public-beta-release',
  caseId: 'real-consumer-read-only',
});

function createRepository(): {
  readonly path: string;
  readonly branch: string;
  readonly headSha: string;
} {
  const path = mkdtempSync(join(tmpdir(), 'repo-nav-h1-confirmation-'));
  execFileSync('git', ['init', '-b', 'main'], { cwd: path });
  execFileSync('git', ['config', 'user.email', 'h1@example.invalid'], {
    cwd: path,
  });
  execFileSync('git', ['config', 'user.name', 'H1 Fixture'], { cwd: path });
  writeFileSync(join(path, 'package.json'), '{"name":"foreign-repository"}\n');
  execFileSync('git', ['add', 'package.json'], { cwd: path });
  execFileSync('git', ['commit', '-m', 'fixture'], { cwd: path });
  return {
    path: realpathSync.native(path),
    branch: execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: path,
      encoding: 'utf8',
    }).trim(),
    headSha: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: path,
      encoding: 'utf8',
    }).trim(),
  };
}

function confirmation(repository: ReturnType<typeof createRepository>) {
  const value = {
    schemaVersion: 1,
    candidate: {
      name: 'repo-nav',
      version: '2.0.0',
      tarballSha256: 'a'.repeat(64),
    },
    repository: {
      canonicalRepositoryPath: repository.path,
      branch: repository.branch,
      headSha: repository.headSha,
    },
    intent: {
      intentId: 'h1-real-consumer',
      requestSha256: createHash('sha256').update('package.json').digest('hex'),
      expectedSchemaVersion: '2.0',
    },
    sensitiveOutputPolicy: REAL_CONSUMER_SENSITIVE_POLICY_V2,
    owner: REAL_CONSUMER_RELEASE_OWNER_V2,
    verified_at: new Date().toISOString(),
    decisionSha256: '',
  };
  value.decisionSha256 = computeConfirmationDecisionSha256(value);
  return value;
}

describe.runIf(selected)('H1 real-consumer confirmation authority', () => {
  it('accepts only the strict candidate and confirmation envelope', () => {
    const repository = createRepository();
    try {
      expect(
        validateRealConsumerConfirmation(confirmation(repository)),
      ).toMatchObject({
        canonicalRepositoryPath: repository.path,
        candidate: {
          name: 'repo-nav',
          version: '2.0.0',
          tarballSha256: 'a'.repeat(64),
        },
      });
    } finally {
      rmSync(repository.path, { recursive: true, force: true });
    }
  });

  it.each([
    ['top-level attestation', ['serviceMcpCliParity'], true],
    ['candidate attestation', ['candidate', 'verified'], true],
    ['repository attestation', ['repository', 'clean'], true],
    ['intent attestation', ['intent', 'approved'], true],
  ])('rejects unknown %s', (_name, path, value) => {
    const repository = createRepository();
    try {
      const input = confirmation(repository) as Record<string, unknown>;
      let owner = input;
      for (const key of path.slice(0, -1)) {
        owner = owner[key] as Record<string, unknown>;
      }
      owner[path.at(-1)!] = value;
      input['decisionSha256'] = computeConfirmationDecisionSha256(input);
      expect(() => validateRealConsumerConfirmation(input)).toThrow(
        /undeclared key/iu,
      );
      try {
        validateRealConsumerConfirmation(input);
      } catch (error) {
        expect((error as Error).message).not.toContain(String(value));
        expect((error as Error).message).not.toContain(path.at(-1)!);
      }
    } finally {
      rmSync(repository.path, { recursive: true, force: true });
    }
  });

  it('rejects an owner name outside the release owner authority', () => {
    const repository = createRepository();
    try {
      const input = confirmation(repository) as unknown as Record<
        string,
        unknown
      >;
      input['owner'] = 'another-owner';
      input['decisionSha256'] = computeConfirmationDecisionSha256(input);
      expect(() => validateRealConsumerConfirmation(input)).toThrow(
        /release owner/iu,
      );
    } finally {
      rmSync(repository.path, { recursive: true, force: true });
    }
  });

  it('rejects candidate version paths, invalid semver, and malformed hashes', () => {
    const repository = createRepository();
    try {
      for (const mutation of [
        { version: '../1.1.0' },
        { version: '01.1.0' },
        { version: '1.1.0-' },
        { version: '1.1.0-01' },
        { version: '1.1.0+build..1' },
        { tarballSha256: 'not-a-hash' },
        { name: 'another-package' },
      ]) {
        const input = confirmation(repository);
        Object.assign(input.candidate, mutation);
        input.decisionSha256 = computeConfirmationDecisionSha256(input);
        expect(() => validateRealConsumerConfirmation(input)).toThrow();
      }
    } finally {
      rmSync(repository.path, { recursive: true, force: true });
    }
  });

  it('requires a canonical ISO verified_at timestamp', () => {
    const repository = createRepository();
    try {
      for (const value of [
        new Date().toISOString().slice(0, 10),
        new Date().toISOString().replace(/\.\d{3}Z$/u, 'Z'),
        'August 13, 2026',
        '2026-02-30T00:00:00.000Z',
      ]) {
        const input = confirmation(repository);
        input.verified_at = value;
        input.decisionSha256 = computeConfirmationDecisionSha256(input);
        expect(() => validateRealConsumerConfirmation(input)).toThrow(
          /canonical ISO timestamp/iu,
        );
      }
    } finally {
      rmSync(repository.path, { recursive: true, force: true });
    }
  });

  it('rejects a non-canonical repository path', () => {
    const repository = createRepository();
    const child = join(repository.path, 'nested');
    mkdirSync(child);
    try {
      const input = confirmation(repository);
      input.repository.canonicalRepositoryPath = child;
      input.decisionSha256 = computeConfirmationDecisionSha256(input);
      expect(() => validateRealConsumerConfirmation(input)).toThrow(
        /must equal realpath/iu,
      );
    } finally {
      rmSync(repository.path, { recursive: true, force: true });
    }
  });
});
