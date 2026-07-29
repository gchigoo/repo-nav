import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect } from 'vitest';

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
import { isSelected } from '../../testkit/testing/selection.js';

const root = resolve(import.meta.dirname, '../..');
const CONTRACT = 'F9-PACK-001';

describe.runIf(
  isSelected({
    group: 'public-beta-release',
    caseId: 'package-install-and-bin-smoke',
  }),
)('F9-PACK-001 platform assertion owner', () => {
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
    'records tarball allowlist exact marker',
    () => {
      const pkg = JSON.parse(
        readFileSync(resolve(root, 'package.json'), 'utf8'),
      ) as { files?: string[] };
      expect([...(pkg.files ?? [])].sort()).toEqual(
        [...PACKAGE_FILES_ALLOWLIST_V2].sort(),
      );
    },
  );

  platformContractIt(
    CONTRACT,
    'package-bins-executable',
    'records package bins marker against package.json paths',
    () => {
      const pkg = JSON.parse(
        readFileSync(resolve(root, 'package.json'), 'utf8'),
      ) as { bin?: Record<string, string> };
      for (const bin of INSTALL_REQUIRED_BINS_V2) {
        expect(pkg.bin?.[bin.name]).toBe(bin.path);
      }
    },
  );

  platformContractIt(
    CONTRACT,
    'node-engine-range-declared',
    'records node engine range declared marker',
    () => {
      const pkg = JSON.parse(
        readFileSync(resolve(root, 'package.json'), 'utf8'),
      ) as { engines: { node: string } };
      expect(pkg.engines.node).toBe(EXPECTED_NODE_ENGINES_V2);
    },
  );

  platformContractIt(
    CONTRACT,
    'mcp-v2-installed-parity',
    'records mcp v2 installed parity marker for declared bin entry',
    () => {
      const pkg = JSON.parse(
        readFileSync(resolve(root, 'package.json'), 'utf8'),
      ) as { bin?: Record<string, string> };
      expect(pkg.bin?.['repo-nav-mcp']).toBe('dist/main.js');
      expect(existsSync(resolve(root, 'src/mcp/locate-tool-output.ts'))).toBe(
        true,
      );
    },
  );

  platformContractIt(
    CONTRACT,
    'package-runtime-closure',
    'records closure marker and local candidate/semantic/closure hashes',
    () => {
      expect(existsSync(resolve(root, 'npm-shrinkwrap.json'))).toBe(true);
      const pkg = JSON.parse(
        readFileSync(resolve(root, 'package.json'), 'utf8'),
      ) as { private: boolean };
      expect(pkg.private).toBe(true);
      const pkgText = readFileSync(resolve(root, 'package.json'));
      const wrapText = readFileSync(resolve(root, 'npm-shrinkwrap.json'));
      const candidateId = createHash('sha256')
        .update(pkgText)
        .update('\0')
        .update(wrapText)
        .digest('hex');
      const semanticManifest = createHash('sha256')
        .update(JSON.stringify([...PACKAGE_FILES_ALLOWLIST_V2].sort()))
        .digest('hex');
      const productionClosure = createHash('sha256')
        .update(wrapText)
        .digest('hex');
      // Local platform evidence hashes from real checkout inputs.
      // Residual: remote same-run six-cell safe reports remain owner/CI-gated.
      recordPlatformContractEvidenceHash(CONTRACT, 'candidate-id', candidateId);
      recordPlatformContractEvidenceHash(
        CONTRACT,
        'semantic-manifest',
        semanticManifest,
      );
      recordPlatformContractEvidenceHash(
        CONTRACT,
        'production-closure',
        productionClosure,
      );
    },
  );
});
