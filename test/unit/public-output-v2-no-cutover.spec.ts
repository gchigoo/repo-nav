import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { readdirSync, readFileSync } from 'node:fs';

import {
  buildTypeScriptImportGraph,
  findForbiddenReachability,
  isForbiddenCanonicalBridgeRuntimeEdge,
  isForbiddenPublicOutputV2RuntimeEdge,
} from '../../testkit/contracts/public-output-v2-import-inventory.js';
import { CANONICAL_NO_CUTOVER_PRODUCTION_ROOTS_V2 } from '../../testkit/fixtures/canonical-locate-bridge-v2/runtime-reachability-v2.js';
import {
  FORBIDDEN_FUTURE_MODULE_MARKERS_V2,
  NO_CUTOVER_PRODUCTION_ROOTS_V2,
  PUBLIC_OUTPUT_SOURCE_ROOT_V2,
} from '../../testkit/fixtures/public-output-v2/no-cutover-import-inventory-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'public-output-v2',
  caseId: 'no-cutover-import-inventory',
});
const reachabilitySelected = isSelected({
  group: 'canonical-locate-bridge',
  caseId: 'canonical-transport-reachability',
});

describe.runIf(selected)('public output v2 no-cutover import inventory', () => {
  it('detects a deliberate synthetic production-to-v2 reachability mutation', () => {
    const graph = new Map<string, readonly string[]>([
      ['src/index.ts', ['src/service.ts']],
      ['src/service.ts', ['src/contracts/v2/locate-result-v2.ts']],
      ['src/contracts/v2/locate-result-v2.ts', []],
    ]);
    expect(
      findForbiddenReachability(
        graph,
        ['src/index.ts'],
        (file) =>
          file.includes('/contracts/v2/') ||
          file.includes('/evidence/public-output/'),
      ),
    ).toEqual([
      [
        'src/index.ts',
        'src/service.ts',
        'src/contracts/v2/locate-result-v2.ts',
      ],
    ]);
  });

  it(
    'after F9 cutover, production roots intentionally reach schema v2 modules',
    { timeout: 30_000 },
    () => {
      const repositoryRoot = resolve(import.meta.dirname, '..', '..');
      const graph = buildTypeScriptImportGraph(repositoryRoot);
      const paths = findForbiddenReachability(
        graph,
        NO_CUTOVER_PRODUCTION_ROOTS_V2,
        isForbiddenPublicOutputV2RuntimeEdge,
      );
      // Pre-F9 this set was empty; post-cutover v2 is the production surface.
      expect(paths.length).toBeGreaterThan(0);
    },
  );

  it('F1B-NOCUTOVER-001 keeps public-output free of F1C/F2/F6 markers', () => {
    const repositoryRoot = resolve(import.meta.dirname, '..', '..');
    const directory = resolve(repositoryRoot, PUBLIC_OUTPUT_SOURCE_ROOT_V2);
    const sources = readdirSync(directory)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => readFileSync(resolve(directory, name), 'utf8'));
    const joined = sources.join('\n');
    for (const marker of FORBIDDEN_FUTURE_MODULE_MARKERS_V2) {
      expect(joined.includes(marker), marker).toBe(false);
    }
  });
});

describe.runIf(reachabilitySelected)(
  'F1C-REACHABILITY-001 transport reachability',
  () => {
    it('keeps production roots free of shadow/composer/schema runtime edges', () => {
      const repositoryRoot = resolve(import.meta.dirname, '..', '..');
      const graph = buildTypeScriptImportGraph(repositoryRoot);
      expect(
        findForbiddenReachability(
          graph,
          CANONICAL_NO_CUTOVER_PRODUCTION_ROOTS_V2,
          isForbiddenCanonicalBridgeRuntimeEdge,
        ),
      ).toEqual([]);
    });

    it('detects deliberate service→shadow→composer mutation path', () => {
      const graph = new Map<string, readonly string[]>([
        [
          'src/evidence/repository-evidence-engine.ts',
          ['src/evidence/canonical/v2-shadow-locate-projector.ts'],
        ],
        [
          'src/evidence/canonical/v2-shadow-locate-projector.ts',
          [
            'src/evidence/canonical/materialized-locate-result-composer-v2.ts',
          ],
        ],
        [
          'src/evidence/canonical/materialized-locate-result-composer-v2.ts',
          [],
        ],
      ]);
      expect(
        findForbiddenReachability(
          graph,
          ['src/evidence/repository-evidence-engine.ts'],
          isForbiddenCanonicalBridgeRuntimeEdge,
        ),
      ).toEqual([
        [
          'src/evidence/repository-evidence-engine.ts',
          'src/evidence/canonical/v2-shadow-locate-projector.ts',
        ],
      ]);
    });
  },
);
