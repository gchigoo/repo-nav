import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterAll, beforeAll, describe, expect } from 'vitest';

import {
  F9_PACK_ASSERTION_IDS_V2,
  PACKAGE_FILES_ALLOWLIST_V2,
} from '../../testkit/fixtures/release-v2/package-allowlist-v2.js';
import { INSTALL_REQUIRED_BINS_V2 } from '../../testkit/fixtures/release-v2/package-install-v2.js';
import { EXPECTED_NODE_ENGINES_V2 } from '../../testkit/fixtures/release-v2/node-range-v2.js';
import {
  platformContractIt,
  recordPlatformContractEvidenceHash,
} from '../../testkit/testing/platform-contract.js';
import { isExplicitlySelected } from '../../testkit/testing/selection.js';
import {
  ensureReleaseCandidateV1,
  installReleaseCandidateV1,
  // @ts-expect-error release helpers are plain ESM modules without declarations
} from '../../tools/release/release-candidate.mjs';

const root = resolve(import.meta.dirname, '../..');
const npmCli = resolve(root, 'node_modules/npm/bin/npm-cli.js');
const CONTRACT = 'F9-PACK-001';
const selected = isExplicitlySelected({
  group: 'public-beta-release',
  caseId: 'package-install-and-bin-smoke',
});

interface InstalledPlatformObservationV2 {
  readonly candidate: {
    readonly version: string;
    readonly tarballSha256: string;
    readonly sourceSha256: string;
  };
  readonly packageJson: {
    readonly private: boolean;
    readonly files: readonly string[];
    readonly bin: Readonly<Record<string, string>>;
    readonly engines: { readonly node: string };
  };
  readonly installedFiles: readonly string[];
  readonly cliHelp: string;
  readonly mcpServerVersion: string | undefined;
  readonly mcpToolNames: readonly string[];
  readonly mcpStructuredContent: unknown;
  readonly mcpTextContent: unknown;
  readonly mcpStderr: string;
  readonly npmLsVersion: string | undefined;
  readonly productionClosureSha256: string;
}

let workspace: string | undefined;
let observed: InstalledPlatformObservationV2 | undefined;

function requireObservation(): InstalledPlatformObservationV2 {
  if (observed === undefined) {
    throw new Error('installed platform observation unavailable');
  }
  return observed;
}

function installedFiles(packageRoot: string): readonly string[] {
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile()) {
        files.push(relative(packageRoot, absolute).split('\\').join('/'));
      } else {
        throw new Error('installed package contains a non-regular entry');
      }
    }
  };
  visit(packageRoot);
  return Object.freeze(files.sort());
}

function inheritedEnvironment(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
}

beforeAll(async () => {
  if (!selected) {
    return;
  }
  workspace = mkdtempSync(join(tmpdir(), 'repo-nav-platform-package-'));
  const candidate = ensureReleaseCandidateV1(root, npmCli);
  const consumerRoot = join(workspace, 'consumer');
  const installed = installReleaseCandidateV1({
    root,
    npmCli,
    candidate,
    consumerRoot,
    consumerName: 'repo-nav-platform-consumer',
  });
  const packageRoot = installed.installedPackageRoot;
  const packageJson = JSON.parse(
    readFileSync(join(packageRoot, 'package.json'), 'utf8'),
  ) as InstalledPlatformObservationV2['packageJson'];
  const installedCli = join(packageRoot, 'dist/cli/main.js');
  const cli = spawnSync(process.execPath, [installedCli, '--help'], {
    cwd: consumerRoot,
    encoding: 'utf8',
    shell: false,
  });
  if (cli.status !== 0 || cli.signal !== null || cli.error !== undefined) {
    throw new Error('installed repo-nav CLI help failed');
  }

  const fixtureRoot = join(workspace, 'repository');
  mkdirSync(fixtureRoot, { recursive: true });
  writeFileSync(
    join(fixtureRoot, 'mapping.ts'),
    'export const installedMapping = row.installed_mapping;\n',
    'utf8',
  );
  const installedMcp = join(packageRoot, 'dist/main.js');
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [installedMcp],
    cwd: consumerRoot,
    env: inheritedEnvironment(),
    stderr: 'pipe',
  });
  let mcpStderr = '';
  transport.stderr?.on('data', (chunk) => {
    mcpStderr += Buffer.isBuffer(chunk)
      ? chunk.toString('utf8')
      : String(chunk);
  });
  const client = new Client({
    name: 'repo-nav-platform-installed-consumer',
    version: '1.0.0',
  });
  let serverVersion: string | undefined;
  let toolNames: readonly string[] = [];
  let structuredContent: unknown;
  let textContent: unknown;
  try {
    await client.connect(transport);
    serverVersion = client.getServerVersion()?.version;
    const tools = await client.listTools();
    toolNames = Object.freeze(tools.tools.map((tool) => tool.name).sort());
    const result = await client.callTool({
      name: 'repo_nav_locate',
      arguments: {
        repoPath: fixtureRoot,
        question: 'Where is installedMapping?',
        terms: ['installedMapping', 'row.installed_mapping'],
      },
    });
    structuredContent = result.structuredContent;
    if (!Array.isArray(result.content)) {
      throw new Error('installed MCP locate content missing');
    }
    const text = result.content.find(
      (entry): entry is { readonly type: 'text'; readonly text: string } =>
        typeof entry === 'object' &&
        entry !== null &&
        Reflect.get(entry, 'type') === 'text' &&
        typeof Reflect.get(entry, 'text') === 'string',
    );
    if (text === undefined) {
      throw new Error('installed MCP locate text content missing');
    }
    textContent = JSON.parse(text.text);
  } finally {
    await client.close();
  }

  const npmLs = spawnSync(
    process.execPath,
    [npmCli, 'ls', candidate.name, '--json'],
    { cwd: consumerRoot, encoding: 'utf8', shell: false },
  );
  if (
    npmLs.status !== 0 ||
    npmLs.signal !== null ||
    npmLs.error !== undefined
  ) {
    throw new Error('installed candidate npm ls failed');
  }
  const npmLsReport = JSON.parse(npmLs.stdout) as {
    dependencies?: Record<string, { version?: string }>;
  };
  const packageLock = readFileSync(join(consumerRoot, 'package-lock.json'));
  observed = Object.freeze({
    candidate: Object.freeze({
      version: candidate.version,
      tarballSha256: candidate.tarballSha256,
      sourceSha256: candidate.sourceSha256,
    }),
    packageJson,
    installedFiles: installedFiles(packageRoot),
    cliHelp: cli.stdout,
    mcpServerVersion: serverVersion,
    mcpToolNames: toolNames,
    mcpStructuredContent: structuredContent,
    mcpTextContent: textContent,
    mcpStderr,
    npmLsVersion: npmLsReport.dependencies?.[candidate.name]?.version,
    productionClosureSha256: createHash('sha256')
      .update(packageLock)
      .digest('hex'),
  });
}, 120_000);

afterAll(() => {
  if (workspace !== undefined) {
    rmSync(workspace, { recursive: true, force: true });
  }
});

describe.runIf(selected)('F9-PACK-001 platform assertion owner', () => {
  expect(F9_PACK_ASSERTION_IDS_V2).toEqual([
    'tarball-allowlist-exact',
    'package-bins-executable',
    'node-engine-range-declared',
    'mcp-v2-installed-parity',
    'package-runtime-closure',
  ]);

  platformContractIt(
    CONTRACT,
    'tarball-allowlist-exact',
    'installs only the declared package surface from the exact tarball',
    () => {
      const observation = requireObservation();
      expect([...observation.packageJson.files].sort()).toEqual(
        [...PACKAGE_FILES_ALLOWLIST_V2].sort(),
      );
      expect(observation.installedFiles).toEqual(
        expect.arrayContaining([
          'LICENSE',
          'README.md',
          'SECURITY.md',
          'dist/main.js',
          'dist/cli/main.js',
          'package.json',
        ]),
      );
      expect(
        observation.installedFiles.some(
          (file) =>
            /^(?:src|tools|test|testkit)\//u.test(file) ||
            file.endsWith('.map'),
        ),
      ).toBe(false);
    },
    120_000,
  );

  platformContractIt(
    CONTRACT,
    'package-bins-executable',
    'executes installed CLI and MCP bin entry points',
    () => {
      const observation = requireObservation();
      for (const bin of INSTALL_REQUIRED_BINS_V2) {
        expect(observation.packageJson.bin[bin.name]).toBe(bin.path);
      }
      expect(observation.cliHelp).toContain('repo-nav debug');
      expect(observation.mcpServerVersion).toBe(observation.candidate.version);
    },
    120_000,
  );

  platformContractIt(
    CONTRACT,
    'node-engine-range-declared',
    'checks the installed package Node engine range',
    () => {
      expect(requireObservation().packageJson.engines.node).toBe(
        EXPECTED_NODE_ENGINES_V2,
      );
    },
    120_000,
  );

  platformContractIt(
    CONTRACT,
    'mcp-v2-installed-parity',
    'executes installed MCP locate with structured and text parity',
    () => {
      const observation = requireObservation();
      expect(observation.mcpToolNames).toContain('repo_nav_locate');
      expect(observation.mcpStderr).toBe('');
      expect(observation.mcpStructuredContent).toEqual(
        observation.mcpTextContent,
      );
      expect(observation.mcpStructuredContent).toMatchObject({
        ok: true,
        evidence: { schemaVersion: '2.0' },
      });
    },
    120_000,
  );

  platformContractIt(
    CONTRACT,
    'package-runtime-closure',
    'binds the installed closure to the exact candidate and source digests',
    () => {
      const observation = requireObservation();
      expect(observation.packageJson.private).toBe(false);
      expect(observation.npmLsVersion).toBe(observation.candidate.version);
      recordPlatformContractEvidenceHash(
        CONTRACT,
        'candidate-id',
        observation.candidate.tarballSha256,
      );
      recordPlatformContractEvidenceHash(
        CONTRACT,
        'semantic-manifest',
        observation.candidate.sourceSha256,
      );
      recordPlatformContractEvidenceHash(
        CONTRACT,
        'production-closure',
        observation.productionClosureSha256,
      );
    },
    120_000,
  );
});
