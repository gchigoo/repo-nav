import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CodeGraphBackend } from '../../src/repository/codegraph-backend.js';
import { createCodeGraphProcessInvocation } from '../../src/repository/codegraph-command.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { isSelected } from '../../testkit/testing/selection.js';

const identity = {
  group: 'codegraph-live-smoke',
  caseId: 'indexed-temp-repo',
} as const;

function filesBelow(root: string): readonly string[] {
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        visit(path);
      } else {
        files.push(path.slice(root.length + 1).replaceAll('\\', '/'));
      }
    }
  };
  visit(root);
  return files.sort();
}

describe.runIf(isSelected(identity))('CodeGraph real indexed temp repository', () => {
  it('indexes, probes, queries, and removes only the temporary repository', async () => {
    const workspaceIndex = resolve(process.cwd(), '.codegraph');
    const workspaceIndexExisted = existsSync(workspaceIndex);
    const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-codegraph-'));
    const runner = new NodeSafeProcessRunner();
    try {
      writeFileSync(
        resolve(repository, 'sample.ts'),
        [
          'export function AlphaMapping(sourceId: string): string {',
          '  return sourceId;',
          '}',
          '',
        ].join('\n'),
        'utf8',
      );
      const init = await runner.run(
        {
          ...createCodeGraphProcessInvocation(['init', repository]),
          cwd: repository,
          timeoutMs: 30_000,
          maxStdoutBytes: 4 * 1024 * 1024,
          maxStderrBytes: 1024 * 1024,
          terminateGraceMs: 500,
        },
        new AbortController().signal,
      );
      expect(init.ok).toBe(true);
      expect(existsSync(resolve(repository, '.codegraph'))).toBe(true);

      const backend = new CodeGraphBackend(runner);
      const health = await backend.probe(
        repository,
        new AbortController().signal,
      );
      expect(health).toMatchObject({
        state: 'available',
        indexFound: true,
        possibleStaleIndex: false,
      });
      expect(health.version).toMatch(/^1\.1\.6$/u);

      const search = await backend.search(
        {
          repositoryRoot: repository,
          terms: [{ value: 'AlphaMapping', caseSensitive: true }],
          anchors: [
            {
              kind: 'symbol',
              value: 'AlphaMapping',
              caseSensitive: true,
            },
          ],
          negativeTerms: [],
          layers: [],
          maxHits: 5,
        },
        new AbortController().signal,
      );
      expect(search).toMatchObject({
        health: { state: 'available', version: '1.1.6' },
        complete: true,
        canSkipFallbackIfVerified: true,
      });
      expect(search.hits).toEqual([
        {
          file: 'sample.ts',
          symbol: 'AlphaMapping',
          lines: [1, 1],
          source: 'codegraph',
          reasonCodes: ['SYMBOL_SEARCH_HIT'],
        },
      ]);
      expect(
        filesBelow(resolve(repository, '.codegraph')).some((file) =>
          /(?:daemon|watcher).*\.(?:pid|lock)$/iu.test(file),
        ),
      ).toBe(false);
      expect(existsSync(workspaceIndex)).toBe(workspaceIndexExisted);
    } finally {
      const normalizedRepository = resolve(repository);
      const normalizedTemp = resolve(tmpdir());
      if (!normalizedRepository.startsWith(normalizedTemp)) {
        throw new Error('Refusing to clean a non-temporary CodeGraph fixture.');
      }
      rmSync(normalizedRepository, { recursive: true, force: true });
    }
    expect(existsSync(repository)).toBe(false);
    expect(existsSync(workspaceIndex)).toBe(workspaceIndexExisted);
  }, 60_000);
});
