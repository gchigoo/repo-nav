import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { RealRepoBenchmarkCatalogSchema } from '../../tools/benchmark/real-repo-benchmark-runner.js';
import { isSelected } from '../../testkit/testing/selection.js';

const root = resolve(import.meta.dirname, '../..');
const catalogPath = resolve(
  root,
  'testkit/fixtures/benchmark-repos/catalog.json',
);

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'package-metadata' }),
)('fixture-scenario benchmark gate catalog', () => {
  it('lists at least ten fixture scenarios with required schema fields', () => {
    const raw: unknown = JSON.parse(readFileSync(catalogPath, 'utf8'));
    const catalog = RealRepoBenchmarkCatalogSchema.parse(raw);

    expect(catalog.repos.length).toBeGreaterThanOrEqual(10);
    for (const entry of catalog.repos) {
      expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.path.length).toBeGreaterThan(0);
      expect(entry.request.terms.length).toBeGreaterThan(0);
      expect(entry.expectations.minConfirmed).toBeGreaterThanOrEqual(0);
      expect(entry.expectations.maxElapsedMs).toBeGreaterThan(0);
      expect(entry.expectations.forbidPublicAbsolutePath).toBe(true);
    }
  });
});
