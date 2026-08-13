import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

import { isSelected } from '../../testkit/testing/selection.js';

const repositoryRoot = resolve(import.meta.dirname, '../..');

function eslintConfigSource(): string {
  return readFileSync(resolve(repositoryRoot, 'eslint.config.mjs'), 'utf8');
}

function extractIgnoredPatterns(source: string): string {
  const match = /ignores:\s*\[(?<patterns>[\s\S]*?)\n\s*\],/u.exec(source);
  if (match?.groups?.['patterns'] === undefined) {
    throw new Error('ESLint ignore configuration was not found.');
  }
  return match.groups['patterns'];
}

function extractProductionTypedOverride(source: string): string {
  const start = source.indexOf(
    "files: ['src/**/*.{ts,tsx}', 'tools/**/*.{ts,tsx}', 'vitest*.config.ts']",
  );
  const end = source.indexOf(
    "files: ['test/**/*.ts', 'testkit/**/*.ts']",
    start,
  );
  if (start === -1 || end === -1) {
    throw new Error('Typed production ESLint override was not found.');
  }
  return source.slice(start, end);
}

function extractTestTypedOverride(source: string): string {
  const start = source.indexOf("files: ['test/**/*.ts', 'testkit/**/*.ts']");
  if (start === -1) {
    throw new Error('Typed test/testkit ESLint override was not found.');
  }
  return source.slice(start);
}

async function lintFloatingPromiseFixture(source: string): Promise<string[]> {
  const eslint = new ESLint({
    cwd: repositoryRoot,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.ts'],
        languageOptions: {
          parser: tseslint.parser,
          parserOptions: {
            projectService: {
              allowDefaultProject: ['promise-rule-fixture.ts'],
            },
            tsconfigRootDir: repositoryRoot,
          },
        },
        plugins: { '@typescript-eslint': tseslint.plugin },
        rules: {
          '@typescript-eslint/no-floating-promises': [
            'error',
            { ignoreVoid: false },
          ],
        },
      },
    ],
  });
  const [result] = await eslint.lintText(source, {
    filePath: resolve(repositoryRoot, 'promise-rule-fixture.ts'),
  });
  if (result === undefined) {
    throw new Error('ESLint returned no floating-promise fixture result.');
  }
  const fatalMessage = result.messages.find(({ fatal }) => fatal === true);
  if (fatalMessage !== undefined) {
    throw new Error(`ESLint fixture parsing failed: ${fatalMessage.message}`);
  }
  return result.messages.flatMap(({ ruleId }) =>
    ruleId === null ? [] : [ruleId],
  );
}

async function lintMisusedPromiseFixture(source: string): Promise<string[]> {
  const eslint = new ESLint({
    cwd: repositoryRoot,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.ts'],
        languageOptions: {
          parser: tseslint.parser,
          parserOptions: {
            projectService: {
              allowDefaultProject: ['promise-rule-fixture.ts'],
            },
            tsconfigRootDir: repositoryRoot,
          },
        },
        plugins: { '@typescript-eslint': tseslint.plugin },
        rules: {
          '@typescript-eslint/no-misused-promises': [
            'error',
            { checksVoidReturn: true },
          ],
        },
      },
    ],
  });
  const [result] = await eslint.lintText(source, {
    filePath: resolve(repositoryRoot, 'promise-rule-fixture.ts'),
  });
  if (result === undefined) {
    throw new Error('ESLint returned no misused-promise fixture result.');
  }
  const fatalMessage = result.messages.find(({ fatal }) => fatal === true);
  if (fatalMessage !== undefined) {
    throw new Error(`ESLint fixture parsing failed: ${fatalMessage.message}`);
  }
  return result.messages.flatMap(({ ruleId }) =>
    ruleId === null ? [] : [ruleId],
  );
}

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'quality-gates' }),
)('typed test quality configuration', () => {
  it('enables strict promise ownership for production, test, and testkit', () => {
    const source = eslintConfigSource();
    const ignoredPatterns = extractIgnoredPatterns(source);
    const productionOverride = extractProductionTypedOverride(source);
    const testOverride = extractTestTypedOverride(source);

    expect(ignoredPatterns).not.toContain("'test/**'");
    expect(ignoredPatterns).not.toContain("'testkit/**'");
    expect(testOverride).toContain(
      'extends: [...tseslint.configs.recommendedTypeChecked]',
    );
    expect(testOverride).toContain('projectService: true');
    for (const typedOverride of [productionOverride, testOverride]) {
      expect(typedOverride).toContain(
        "'@typescript-eslint/no-floating-promises': [",
      );
      expect(typedOverride).toContain('{ ignoreVoid: false }');
      expect(typedOverride).toContain(
        "'@typescript-eslint/no-misused-promises': [",
      );
      expect(typedOverride).toContain('{ checksVoidReturn: true }');
    }
    expect(testOverride).toContain("reportUnusedDisableDirectives: 'error'");
  });

  it('rejects unobserved promises and accepts detached work with rejection handling', async () => {
    for (const expression of ['run();', 'void run();']) {
      await expect(
        lintFloatingPromiseFixture(
          `async function run(): Promise<void> {}\n${expression}\n`,
        ),
      ).resolves.toContain('@typescript-eslint/no-floating-promises');
    }
    await expect(
      lintFloatingPromiseFixture(
        'async function run(): Promise<void> {}\nvoid run().catch(() => undefined);\n',
      ),
    ).resolves.toEqual([]);
  });

  it('rejects async void callbacks and accepts synchronous rejection observers', async () => {
    const fixturePrefix =
      'declare function register(callback: () => void): void;\nasync function run(): Promise<void> {}\n';

    await expect(
      lintMisusedPromiseFixture(
        `${fixturePrefix}register(async () => run());\n`,
      ),
    ).resolves.toContain('@typescript-eslint/no-misused-promises');
    await expect(
      lintMisusedPromiseFixture(
        `${fixturePrefix}register(() => {\n  void run().catch(() => undefined);\n});\n`,
      ),
    ).resolves.toEqual([]);
  });
});
