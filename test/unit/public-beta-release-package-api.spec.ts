import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import ts from 'typescript';

import {
  PUBLIC_PACKAGE_EXPORT_DISPOSITIONS_V2,
  PUBLIC_PACKAGE_SUBPATH_EXPORTS_V2,
} from '../../testkit/fixtures/repository-hardening-v2/public-package-subpaths-v2.js';
import {
  LEGACY_SUBPATH_RUNTIME_ERROR_CODE_V2,
  REMOVED_LEGACY_SUBPATH_V2,
} from '../../testkit/fixtures/release-v2/legacy-subpath-negative-v2.js';
import { PACKAGE_EXPORT_KEYS_V2 } from '../../testkit/fixtures/release-v2/package-api-snapshot-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const root = resolve(import.meta.dirname, '../..');

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'package-api' }),
)('F9-PACKAGE-API-001 package-api', () => {
  it('exposes only the retained root, adapter, and package.json exports', () => {
    const exports = JSON.parse(
      readFileSync(resolve(root, 'package.json'), 'utf8'),
    ).exports as Record<string, unknown>;
    expect(Object.keys(exports).sort()).toEqual(
      [...PACKAGE_EXPORT_KEYS_V2].sort(),
    );
    expect(PUBLIC_PACKAGE_EXPORT_DISPOSITIONS_V2).toEqual([
      { specifier: '.', action: 'retain-c5' },
      { specifier: './advanced', action: 'retain-c5' },
      { specifier: './backends', action: 'retain-c5' },
      { specifier: './node', action: 'retain-c5' },
      { specifier: './package.json', action: 'retain-c5' },
    ]);
    for (const subpath of PUBLIC_PACKAGE_SUBPATH_EXPORTS_V2) {
      expect(readFileSync(resolve(root, subpath.sourceFile), 'utf8')).not.toBe(
        '',
      );
    }
    const index = readFileSync(resolve(root, 'src/index.ts'), 'utf8');
    expect(index).not.toContain('evidence-redactor');
    expect(index).not.toContain('V2LocateResultProjector');
    expect(index).not.toContain('canonical-locate-executor');
  });

  it('rejects the removed legacy subpath in the Node runtime', () => {
    const probe = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `import('${REMOVED_LEGACY_SUBPATH_V2}').then(()=>process.exit(1),error=>{if(error?.code!=='${LEGACY_SUBPATH_RUNTIME_ERROR_CODE_V2}'){console.error(error);process.exit(2)}})`,
      ],
      { cwd: root, encoding: 'utf8', shell: false },
    );
    expect(probe.status, probe.stderr || probe.stdout).toBe(0);
  });

  it('does not resolve the removed legacy subpath under NodeNext', () => {
    const resolution = ts.resolveModuleName(
      REMOVED_LEGACY_SUBPATH_V2,
      resolve(root, 'test-artifacts', 'legacy-subpath-consumer.mts'),
      {
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        target: ts.ScriptTarget.ES2022,
        strict: true,
      },
      ts.sys,
    );
    expect(resolution.resolvedModule).toBeUndefined();
  });
});
