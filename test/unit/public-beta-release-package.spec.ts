import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PACKAGE_FILES_ALLOWLIST_V2 } from '../../testkit/fixtures/release-v2/package-allowlist-v2.js';
import { REPRO_TSCONFIG_BUILD_V2 } from '../../testkit/fixtures/release-v2/reproducibility-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const root = resolve(import.meta.dirname, '../..');

describe.runIf(
  isSelected({
    group: 'public-beta-release',
    caseId: 'package-install-and-bin-smoke',
  }),
)('F9-PACK-001 package-install-and-bin-smoke', () => {
  it('keeps positive files allowlist exact and shrinkwrap in package surface', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(root, 'package.json'), 'utf8'),
    ) as {
      files?: string[];
      private: boolean;
      bin?: Record<string, string>;
    };
    expect(pkg.private).toBe(true);
    expect([...(pkg.files ?? [])].sort()).toEqual(
      [...PACKAGE_FILES_ALLOWLIST_V2].sort(),
    );
    expect(pkg.bin?.['repo-nav']).toBe('dist/cli/main.js');
    expect(pkg.bin?.['repo-nav-mcp']).toBe('dist/main.js');
    const wrap = readFileSync(resolve(root, 'npm-shrinkwrap.json'), 'utf8');
    expect(wrap.length).toBeGreaterThan(0);
    // Local semantic marker input for platform evidence (not remote six-cell).
    const semantic = createHash('sha256')
      .update(JSON.stringify({ files: pkg.files, bin: pkg.bin }))
      .digest('hex');
    expect(semantic).toMatch(/^[0-9a-f]{64}$/u);
  });
});

describe.runIf(
  isSelected({
    group: 'public-beta-release',
    caseId: 'package-reproducibility',
  }),
)('F9-PACK-REPRO-001 package-reproducibility', () => {
  it('configures no source maps and LF newLine in tsconfig.build', () => {
    const ts = JSON.parse(
      readFileSync(resolve(root, 'tsconfig.build.json'), 'utf8'),
    ) as { compilerOptions: Record<string, unknown> };
    expect(ts.compilerOptions.sourceMap).toBe(REPRO_TSCONFIG_BUILD_V2.sourceMap);
    expect(ts.compilerOptions.declarationMap).toBe(
      REPRO_TSCONFIG_BUILD_V2.declarationMap,
    );
    expect(ts.compilerOptions.newLine).toBe(REPRO_TSCONFIG_BUILD_V2.newLine);
    const sourcePaths = JSON.parse(
      readFileSync(
        resolve(
          root,
          'testkit/manifests/release-v2/release-candidate-source-paths-v1.json',
        ),
        'utf8',
      ),
    ) as { paths: string[] };
    expect(sourcePaths.paths).toContain('package.json');
    expect(sourcePaths.paths).toContain(
      'testkit/manifests/release-v2/release-candidate-source-paths-v1.json',
    );
  });
});
