import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { readPackageMetadata } from '../../src/runtime/package-metadata.js';
import { EXPECTED_PACKAGE_VERSION_V2 } from '../../testkit/fixtures/release-v2/version-sources-v2.js';
import {
  EXPECTED_NODE_ENGINES_V2,
  NODE_BOUNDARY_TABLE_V2,
} from '../../testkit/fixtures/release-v2/node-range-v2.js';
import {
  EXPECTED_LICENSE_HOLDER_V2,
  EXPECTED_LICENSE_SPDX_V2,
  EXPECTED_PRIVATE_V2,
} from '../../testkit/fixtures/release-v2/package-metadata-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const root = resolve(import.meta.dirname, '../..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  version: string;
  private: boolean;
  engines: { node: string };
  license: string;
};

function majorAllowed(version: string, range: string): boolean {
  const major = Number(version.split('.')[0]);
  if (range !== EXPECTED_NODE_ENGINES_V2) return false;
  return major === 22 || major === 24;
}

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'version-sources' }),
)('F9-VERSION-001 version-sources', () => {
  it('uses package.json as sole version authority', () => {
    expect(pkg.version).toBe(EXPECTED_PACKAGE_VERSION_V2);
    expect(readPackageMetadata().version).toBe(EXPECTED_PACKAGE_VERSION_V2);
    expect(pkg.private).toBe(false);
    const wrap = JSON.parse(
      readFileSync(resolve(root, 'npm-shrinkwrap.json'), 'utf8'),
    ) as { version: string; name: string };
    expect(wrap.version).toBe(EXPECTED_PACKAGE_VERSION_V2);
    expect(wrap.name).toBe('repo-nav');
  });
});

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'node-range-declared' }),
)('F9-NODE-001 node-range-declared', () => {
  it('declares exact Node ^22 || ^24 with semver boundary table', () => {
    expect(pkg.engines.node).toBe(EXPECTED_NODE_ENGINES_V2);
    for (const row of NODE_BOUNDARY_TABLE_V2) {
      expect(majorAllowed(row.version, pkg.engines.node)).toBe(row.allowed);
    }
  });
});

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'package-metadata' }),
)('F9-METADATA-001 package-metadata', () => {
  it('keeps MIT license SPDX, private false, and LICENSE holder exact', () => {
    expect(pkg.license).toBe(EXPECTED_LICENSE_SPDX_V2);
    expect(pkg.private).toBe(EXPECTED_PRIVATE_V2);
    const license = readFileSync(resolve(root, 'LICENSE'), 'utf8');
    expect(license).toContain(EXPECTED_LICENSE_HOLDER_V2);
    expect(license).toContain('MIT License');
  });

  it('aligns public install docs and package metadata with the 2.0.0 cutover', () => {
    const requiredInstall = 'npm i -g repo-nav@2.0.0';
    expect(pkg.version).toBe('2.0.0');
    for (const relativePath of [
      'README.md',
      'docs/getting-started-mcp.md',
      'docs/migration-v1-to-v2.md',
    ]) {
      const text = readFileSync(resolve(root, relativePath), 'utf8');
      expect(text).toContain(requiredInstall);
      expect(text).not.toContain('repo-nav@beta');
    }
  });
});
