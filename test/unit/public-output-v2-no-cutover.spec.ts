import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildTypeScriptImportGraph,
  findForbiddenReachability,
} from '../../testkit/contracts/public-output-v2-import-inventory.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'public-output-v2',
  caseId: 'no-cutover-import-inventory',
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

  it('proves package barrels, engine, MCP and CLI cannot reach dormant v2 modules', () => {
    const repositoryRoot = resolve(import.meta.dirname, '..', '..');
    const roots = [
      'src/index.ts',
      'src/contracts/index.ts',
      'src/evidence/repository-evidence-engine.ts',
      'src/mcp/locate-tool-output.ts',
      'src/mcp/repo-nav-mcp-server.ts',
      'tools/cli/main.ts',
      'tools/cli/execute.ts',
    ] as const;
    const graph = buildTypeScriptImportGraph(repositoryRoot);
    expect(
      findForbiddenReachability(
        graph,
        roots,
        (file) =>
          file.includes('/contracts/v2/') ||
          file.includes('/evidence/public-output/'),
      ),
    ).toEqual([]);
  });
});
