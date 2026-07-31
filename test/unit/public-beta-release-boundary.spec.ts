import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  NO_V1_ALLOW_REDACT_LOCATE_FILE_V2,
  NO_V1_FORBIDDEN_SYMBOLS_V2,
  NO_V1_SCAN_PATHS_V2,
} from '../../testkit/fixtures/release-v2/runtime-graph-mutations-v2.js';
import { CUTOVER_DELETED_PRODUCTION_PATHS_V2 } from '../../testkit/fixtures/release-v2/cutover-truth-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const root = resolve(import.meta.dirname, '../..');

function collectTsFiles(absPath: string): string[] {
  const st = statSync(absPath);
  if (st.isFile()) {
    return absPath.endsWith('.ts') ? [absPath] : [];
  }
  const out: string[] = [];
  for (const name of readdirSync(absPath)) {
    if (name === 'node_modules' || name === 'dist') continue;
    out.push(...collectTsFiles(join(absPath, name)));
  }
  return out;
}

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'no-v1-runtime' }),
)('F9-NO-V1-001 no-v1-runtime', () => {
  it('removes v1 projector/synthetic seams and blocks redactLocateResult reachability', () => {
    for (const rel of CUTOVER_DELETED_PRODUCTION_PATHS_V2) {
      expect(existsSync(resolve(root, rel))).toBe(false);
    }
    expect(existsSync(resolve(root, 'tsconfig.cli.json'))).toBe(false);

    const moduleSrc = readFileSync(
      resolve(root, 'src/evidence/evidence.module.ts'),
      'utf8',
    );
    expect(moduleSrc).toContain('V2LocateResultProjector');
    expect(moduleSrc).not.toContain('V1LocateResultProjector');

    const allowAbs = resolve(root, NO_V1_ALLOW_REDACT_LOCATE_FILE_V2).replace(
      /\\/gu,
      '/',
    );
    for (const scan of NO_V1_SCAN_PATHS_V2) {
      const files = collectTsFiles(resolve(root, scan));
      for (const file of files) {
        const norm = file.replace(/\\/gu, '/');
        if (norm === allowAbs) continue;
        const text = readFileSync(file, 'utf8');
        for (const symbol of NO_V1_FORBIDDEN_SYMBOLS_V2) {
          if (symbol === 'redactLocateResult' || symbol === 'applyPublicErrorPolicy') {
            expect(text.includes(symbol)).toBe(false);
          }
        }
        expect(text).not.toContain('V1LocateResultProjector');
        expect(text).not.toContain('legacyV1Projection');
      }
    }

    const index = readFileSync(resolve(root, 'src/index.ts'), 'utf8');
    expect(index).not.toContain('evidence-redactor');
    expect(
      relative(root, resolve(root, 'src/index.ts')).replace(/\\/gu, '/'),
    ).toBe('src/index.ts');
  });
});
