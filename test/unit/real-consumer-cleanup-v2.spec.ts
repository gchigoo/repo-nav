import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isSelected } from '../../testkit/testing/selection.js';
import {
  captureControlledTree,
  removeControlledTree,
  // @ts-expect-error release helpers are plain ESM modules without declarations
} from '../../tools/release/real-consumer-cleanup.mjs';

const selected = isSelected({
  group: 'public-beta-release',
  caseId: 'real-consumer-read-only',
});

function createControlledTree(): string {
  const path = realpathSync(
    mkdtempSync(join(tmpdir(), 'repo-nav-h1-cleanup-')),
  );
  writeFileSync(join(path, 'candidate.tgz'), 'candidate\n');
  return path;
}

describe.runIf(selected)('H1 controlled consumer cleanup', () => {
  it('removes only an unchanged identity-pinned controlled tree', () => {
    const path = createControlledTree();
    const record = captureControlledTree(path);
    removeControlledTree(record);
    expect(() => realpathSync(path)).toThrow();
  });

  it('refuses to delete a tree with a late unrecorded descendant', () => {
    const path = createControlledTree();
    const record = captureControlledTree(path);
    writeFileSync(join(path, 'late-user-data.txt'), 'preserve\n');
    try {
      expect(() => removeControlledTree(record)).toThrow(
        /controlled tree topology changed/iu,
      );
      expect(realpathSync(path)).toBe(path);
    } finally {
      rmSync(path, { recursive: true, force: true });
    }
  });
});
