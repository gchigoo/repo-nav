import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  RealRepoBenchmarkCatalogSchema,
} from '../../tools/benchmark/real-repo-benchmark-runner.js';
import { isSelected } from '../../testkit/testing/selection.js';

const root = resolve(import.meta.dirname, '../..');
const catalogPath = resolve(
  root,
  'testkit/fixtures/benchmark-repos/catalog.json',
);

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'package-metadata' }),
)('real-repo benchmark gate catalog', () => {
  it('lists at least ten benchmark repos with required schema fields', () => {
    const raw: unknown = JSON.parse(readFileSync(catalogPath, 'utf8'));
    const catalog = RealRepoBenchmarkCatalogSchema.parse(raw);

    expect(catalog.repos.length).toBeGreaterThanOrEqual(10);
    for (const entry of catalog.repos) {
      expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.path.length).toBeGreaterThan(0);
      expect(entry.request.terms.length).toBeGreaterThan(0);
      expect(entry.expectations.minConfirmed).toBeGreaterThanOrEqual(0);
      expect(entry.expectations.maxP95Ms).toBeGreaterThan(0);
      expect(entry.expectations.forbidPublicAbsolutePath).toBe(true);
    }
  });
});

describe('real-repo benchmark gate catalog (ungated smoke)', () => {
  it('keeps catalog.json parseable when release gate is not selected', () => {
    const raw: unknown = JSON.parse(readFileSync(catalogPath, 'utf8'));
    const catalog = RealRepoBenchmarkCatalogSchema.parse(raw);
    expect(catalog.schemaVersion).toBe('1.0');
    expect(catalog.repos.length).toBeGreaterThanOrEqual(10);
  });
});
