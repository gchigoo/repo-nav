import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildVitestSurfaceInvocation,
  RunnerUsageError,
} from '../../testkit/runners/run-vitest-surface.js';
import {
  RUNNER_GROUP_ALIASES,
  RUNNER_IDENTITY_REGISTRY,
  hasRunnerIdentity,
  type RunnerGroupAliasRegistry,
  type RunnerIdentityRegistration,
  type RunnerSurface,
} from '../../testkit/runners/runner-registry.js';
import {
  PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1,
  createFilesystemPlatformContractRepository,
  ensureRunnerSelectionsCoverPlatformCases,
  validateProductionPlatformContractSnapshotV1,
} from '../../testkit/contracts/platform-contract.js';
import {
  assertRunnerIdentityRegistryMatchesInventory,
  projectRunnerIdentityRegistry,
  scanRunnerIdentityInventory,
  scanRunnerIdentityInventoryFromSources,
  type RunnerIdentityInventoryRow,
} from '../../testkit/testing/runner-identity-inventory.js';
import { isSelected } from '../../testkit/testing/selection.js';

const identity = {
  group: 'runner-smoke',
  caseId: 'runner-registry-contract',
} as const;

const repositoryRoot = resolve(import.meta.dirname, '..', '..');

function productionInventory(): readonly RunnerIdentityInventoryRow[] {
  return scanRunnerIdentityInventory(repositoryRoot);
}

function firstRegistration(): RunnerIdentityRegistration {
  const first = RUNNER_IDENTITY_REGISTRY[0];
  if (first === undefined) {
    throw new Error('RUNNER_IDENTITY_REGISTRY must not be empty');
  }
  return first;
}

function syntheticRegistration(
  group: string,
  caseId: string,
): RunnerIdentityRegistration {
  return {
    surface: 'unit',
    identity: { group, caseId },
    ownerFiles: ['test/unit/synthetic-runner-registry-owner.spec.ts'],
  };
}

function expectRunnerUsageError(
  surface: RunnerSurface,
  args: readonly string[],
  pattern: RegExp,
): void {
  const build = () => buildVitestSurfaceInvocation(surface, args);
  expect(build).toThrow(RunnerUsageError);
  expect(build).toThrow(pattern);
}

function selectedIdentities(
  surface: RunnerSurface,
  args: readonly string[],
): unknown {
  const invocation = buildVitestSurfaceInvocation(surface, args);
  return JSON.parse(invocation.environment['REPO_NAV_TEST_IDENTITIES'] ?? '[]');
}

function assertAliasesResolve(
  aliases: RunnerGroupAliasRegistry,
  registry: readonly RunnerIdentityRegistration[],
): void {
  const registeredGroups = new Map<RunnerSurface, Set<string>>([
    ['unit', new Set<string>()],
    ['golden', new Set<string>()],
    ['mcp', new Set<string>()],
  ]);
  for (const registration of registry) {
    registeredGroups
      .get(registration.surface)
      ?.add(registration.identity.group);
  }

  for (const [surface, surfaceAliases] of Object.entries(aliases) as Array<
    [RunnerSurface, Readonly<Record<string, readonly string[]>>]
  >) {
    const groups = registeredGroups.get(surface);
    if (groups === undefined) {
      throw new Error(`unknown alias surface ${surface}`);
    }
    for (const [alias, expandedGroups] of Object.entries(surfaceAliases)) {
      expect(expandedGroups.length, `${surface}/${alias}`).toBeGreaterThan(0);
      for (const group of expandedGroups) {
        if (!groups.has(group)) {
          throw new Error(
            `alias ${surface}/${alias} expands to unregistered group ${group}`,
          );
        }
      }
    }
  }
}

describe.runIf(isSelected(identity))(
  'runner-smoke/runner-registry-contract',
  () => {
    it('matches the static source identity inventory exactly', () => {
      const inventory = productionInventory();

      expect(projectRunnerIdentityRegistry(RUNNER_IDENTITY_REGISTRY)).toEqual(
        inventory,
      );
      expect(() =>
        assertRunnerIdentityRegistryMatchesInventory(
          RUNNER_IDENTITY_REGISTRY,
          inventory,
        ),
      ).not.toThrow();
    });

    it('fails closed for source-only and registry-only stale identities', () => {
      const inventory = productionInventory();
      const sourceOnly = {
        surface: 'unit',
        group: 'runner-smoke',
        caseId: 'source-only-synthetic',
        ownerFile: 'test/unit/source-only-synthetic.spec.ts',
      } as const;
      expect(() =>
        assertRunnerIdentityRegistryMatchesInventory(RUNNER_IDENTITY_REGISTRY, [
          ...inventory,
          sourceOnly,
        ]),
      ).toThrow(/source-only runner identities/u);

      expect(() =>
        assertRunnerIdentityRegistryMatchesInventory(
          [
            ...RUNNER_IDENTITY_REGISTRY,
            syntheticRegistration('runner-smoke', 'registry-only-stale'),
          ],
          inventory,
        ),
      ).toThrow(/registry-only runner identities/u);
    });

    it('fails closed for duplicate identities, duplicate owners, and unknown surfaces', () => {
      const first = firstRegistration();
      expect(() =>
        projectRunnerIdentityRegistry([...RUNNER_IDENTITY_REGISTRY, first]),
      ).toThrow(/duplicate runner identity/u);

      const owner = first.ownerFiles[0];
      if (owner === undefined) {
        throw new Error('first runner identity must have an owner');
      }
      expect(() =>
        projectRunnerIdentityRegistry([
          {
            ...first,
            ownerFiles: [owner, owner],
          },
        ]),
      ).toThrow(/duplicate owner/u);

      expect(() =>
        projectRunnerIdentityRegistry([
          {
            surface: 'unknown' as RunnerSurface,
            identity: { group: 'runner-smoke', caseId: 'unknown-surface' },
            ownerFiles: ['test/unit/unknown-surface.spec.ts'],
          },
        ]),
      ).toThrow(/unknown runner surface/u);
    });

    it('validates explicit and legacy exact runner identities through the registry authority', () => {
      expectRunnerUsageError(
        'unit',
        ['--identity', 'di/term-case-parity'],
        /Unknown unit test identity: di\/term-case-parity/u,
      );
      expectRunnerUsageError(
        'unit',
        ['--group', 'di', '--case', 'term-case-parity'],
        /Unknown unit test identity: di\/term-case-parity/u,
      );

      expect(
        selectedIdentities('unit', ['--identity', 'di/di-assembly']),
      ).toEqual([{ group: 'di', caseId: 'di-assembly' }]);
      expect(
        selectedIdentities('unit', ['--identity', 'contract/term-case-parity']),
      ).toEqual([{ group: 'contract', caseId: 'term-case-parity' }]);
      expect(
        selectedIdentities('golden', [
          '--group',
          'classification',
          '--case',
          'classification-syntax-family',
        ]),
      ).toEqual([
        { group: 'classification', caseId: 'classification-syntax-family' },
      ]);
    });

    it('fails closed for dynamic isSelected arguments', () => {
      expect(() =>
        scanRunnerIdentityInventoryFromSources([
          {
            surface: 'unit',
            ownerFile: 'test/unit/dynamic-identity.fixture.ts',
            text: `
              import { isSelected } from '../../testkit/testing/selection.js';
              const dynamicGroup = process.env['REPO_NAV_GROUP'] ?? 'runner-smoke';
              describe.runIf(isSelected({ group: dynamicGroup, caseId: 'dynamic-case' }))('dynamic', () => {});
            `,
          },
        ]),
      ).toThrow(/could not statically resolve isSelected identity/u);
    });

    it.each([
      {
        id: 'named-import-alias',
        selector: 'selected',
        importLine:
          "import { isSelected as selected } from '../../testkit/testing/selection.js';",
      },
      {
        id: 'namespace-import',
        selector: 'selection.isSelected',
        importLine:
          "import * as selection from '../../testkit/testing/selection.js';",
      },
      {
        id: 'local-selector-alias',
        selector: 'selected',
        importLine:
          "import { isSelected } from '../../testkit/testing/selection.js'; const selected = isSelected;",
      },
      {
        id: 'destructured-namespace-alias',
        selector: 'selected',
        importLine:
          "import * as selection from '../../testkit/testing/selection.js'; const { isSelected: selected } = selection;",
      },
    ])(
      'fails closed for dynamic selector calls through $id',
      ({ selector, importLine }) => {
        expect(() =>
          scanRunnerIdentityInventoryFromSources([
            {
              surface: 'unit',
              ownerFile: 'test/unit/dynamic-selector-alias.fixture.ts',
              text: `
              ${importLine}
              const dynamicIdentity = JSON.parse(process.env['REPO_NAV_IDENTITY'] ?? '{}');
              describe.runIf(${selector}(dynamicIdentity))('dynamic-selector-alias', () => {});
            `,
            },
          ]),
        ).toThrow(/could not statically resolve isSelected identity/u);
      },
    );

    it.each([
      {
        id: 'function-local-alias',
        body: `
          const selected = isSelected;
          selected(dynamicIdentity);
        `,
      },
      {
        id: 'block-local-alias',
        body: `
          {
            const selected = isSelected;
            selected(dynamicIdentity);
          }
        `,
      },
      {
        id: 'function-local-namespace-alias',
        body: `
          const localSelection = selection;
          localSelection.isSelected(dynamicIdentity);
        `,
        namespace: true,
      },
      {
        id: 'function-local-destructured-alias',
        body: `
          const { isSelected: selected } = selection;
          selected(dynamicIdentity);
        `,
        namespace: true,
      },
    ])(
      'fails closed for nested dynamic selector calls through $id',
      ({ body, namespace }) => {
        expect(() =>
          scanRunnerIdentityInventoryFromSources([
            {
              surface: 'unit',
              ownerFile: 'test/unit/nested-dynamic-selector.fixture.ts',
              text: `
                ${
                  namespace === true
                    ? "import * as selection from '../../testkit/testing/selection.js';"
                    : "import { isSelected } from '../../testkit/testing/selection.js';"
                }
                const dynamicIdentity = JSON.parse(process.env['REPO_NAV_IDENTITY'] ?? '{}');
                function register() {
                  ${body}
                }
                register();
              `,
            },
          ]),
        ).toThrow(/could not statically resolve isSelected identity/u);
      },
    );

    it('ignores unrelated local functions named isSelected', () => {
      expect(
        scanRunnerIdentityInventoryFromSources([
          {
            surface: 'unit',
            ownerFile: 'test/unit/unrelated-selector.fixture.ts',
            text: `
              function isSelected(value: unknown): boolean { return Boolean(value); }
              describe.runIf(isSelected(process.env['IGNORED']))('unrelated', () => {});
            `,
          },
        ]),
      ).toEqual([]);
    });

    it.each([
      {
        id: 'helper-parameter',
        declaration: `
          function register(isSelected: (value: unknown) => boolean) {
            isSelected(process.env['IGNORED']);
          }
          register(Boolean);
        `,
      },
      {
        id: 'local-variable',
        declaration: `
          function register() {
            const isSelected = Boolean;
            isSelected(process.env['IGNORED']);
          }
          register();
        `,
      },
      {
        id: 'hoisted-local-variable',
        declaration: `
          function register() {
            isSelected(process.env['IGNORED']);
            var isSelected = Boolean;
          }
          register();
        `,
      },
    ])(
      'does not mistake a shadowing $id for the imported selector',
      ({ declaration }) => {
        expect(
          scanRunnerIdentityInventoryFromSources([
            {
              surface: 'unit',
              ownerFile: 'test/unit/shadowed-selector.fixture.ts',
              text: `
                import { isSelected } from '../../testkit/testing/selection.js';
                ${declaration}
              `,
            },
          ]),
        ).toEqual([]);
      },
    );

    it.each([
      {
        id: 'helper-parameter-value',
        declaration: `
          const group = 'outer-static';
          function register(group: string) {
            isSelected({ group, caseId: 'helper-parameter-value' });
          }
          register(process.env['REPO_NAV_GROUP'] ?? 'dynamic');
        `,
      },
      {
        id: 'block-local-identity',
        declaration: `
          const identity = { group: 'outer-static', caseId: 'outer-static' } as const;
          function register() {
            {
              const identity = JSON.parse(process.env['REPO_NAV_IDENTITY'] ?? '{}');
              isSelected(identity);
            }
          }
          register();
        `,
      },
    ])(
      'fails closed when a dynamic $id shadows an outer static value',
      ({ declaration }) => {
        expect(() =>
          scanRunnerIdentityInventoryFromSources([
            {
              surface: 'unit',
              ownerFile: 'test/unit/shadowed-identity-value.fixture.ts',
              text: `
                import { isSelected } from '../../testkit/testing/selection.js';
                ${declaration}
              `,
            },
          ]),
        ).toThrow(/could not statically resolve isSelected identity/u);
      },
    );

    it('recognizes a selector import throughout module scope', () => {
      expect(() =>
        scanRunnerIdentityInventoryFromSources([
          {
            surface: 'unit',
            ownerFile: 'test/unit/hoisted-selector-import.fixture.ts',
            text: `
              const dynamicIdentity = JSON.parse(process.env['REPO_NAV_IDENTITY'] ?? '{}');
              isSelected(dynamicIdentity);
              import { isSelected } from '../../testkit/testing/selection.js';
            `,
          },
        ]),
      ).toThrow(/could not statically resolve isSelected identity/u);
    });

    it('honors function-scoped selector shadowing from nested var declarations', () => {
      expect(
        scanRunnerIdentityInventoryFromSources([
          {
            surface: 'unit',
            ownerFile: 'test/unit/nested-hoisted-selector.fixture.ts',
            text: `
              import { isSelected } from '../../testkit/testing/selection.js';
              function register() {
                isSelected(process.env['IGNORED']);
                if (process.env['SHADOW']) {
                  var isSelected = Boolean;
                }
              }
              register();
            `,
          },
        ]),
      ).toEqual([]);
    });

    it('resolves static selector calls through import and local aliases', () => {
      expect(
        scanRunnerIdentityInventoryFromSources([
          {
            surface: 'unit',
            ownerFile: 'test/unit/static-selector-alias.fixture.ts',
            text: `
              import { isSelected as selected } from '../../testkit/testing/selection.js';
              describe.runIf(selected({ group: 'runner-smoke', caseId: 'named-alias' }))('named', () => {});
            `,
          },
          {
            surface: 'unit',
            ownerFile: 'test/unit/static-selector-namespace.fixture.ts',
            text: `
              import * as selection from '../../testkit/testing/selection.js';
              const localSelection = selection;
              const { isSelected: selected } = localSelection;
              describe.runIf(localSelection.isSelected({ group: 'runner-smoke', caseId: 'namespace-alias' }))('namespace', () => {});
              describe.runIf(selected({ group: 'runner-smoke', caseId: 'destructured-alias' }))('destructured', () => {});
            `,
          },
        ]),
      ).toEqual([
        {
          surface: 'unit',
          group: 'runner-smoke',
          caseId: 'destructured-alias',
          ownerFile: 'test/unit/static-selector-namespace.fixture.ts',
        },
        {
          surface: 'unit',
          group: 'runner-smoke',
          caseId: 'named-alias',
          ownerFile: 'test/unit/static-selector-alias.fixture.ts',
        },
        {
          surface: 'unit',
          group: 'runner-smoke',
          caseId: 'namespace-alias',
          ownerFile: 'test/unit/static-selector-namespace.fixture.ts',
        },
      ]);
    });

    it('fails closed for object spreads that may override runner identity fields', () => {
      expect(() =>
        scanRunnerIdentityInventoryFromSources([
          {
            surface: 'unit',
            ownerFile: 'test/unit/dynamic-spread-identity.fixture.ts',
            text: `
              import { isSelected } from '../../testkit/testing/selection.js';
              const dynamicIdentity = JSON.parse(process.env['REPO_NAV_IDENTITY'] ?? '{}');
              describe.runIf(isSelected({
                group: 'runner-smoke',
                caseId: 'spread-case',
                ...dynamicIdentity,
              }))('dynamic-spread', () => {});
            `,
          },
        ]),
      ).toThrow(/could not statically resolve isSelected identity/u);
    });

    it('fails closed for helper identities with mixed static and unresolved return paths', () => {
      expect(() =>
        scanRunnerIdentityInventoryFromSources([
          {
            surface: 'unit',
            ownerFile: 'test/unit/mixed-helper-identity.fixture.ts',
            text: `
              import { isSelected } from '../../testkit/testing/selection.js';
              function helperIdentity(flag: boolean) {
                if (flag) {
                  return { group: 'runner-smoke', caseId: 'static-helper' } as const;
                }
                return {
                  group: process.env['REPO_NAV_GROUP'] ?? 'runner-smoke',
                  caseId: 'dynamic-helper',
                } as const;
              }
              describe.runIf(isSelected(helperIdentity(true)))('mixed-helper', () => {});
            `,
          },
        ]),
      ).toThrow(/could not statically resolve isSelected identity/u);
    });

    it('fails closed for helper identities with explicit bare return paths', () => {
      expect(() =>
        scanRunnerIdentityInventoryFromSources([
          {
            surface: 'unit',
            ownerFile: 'test/unit/bare-return-helper-identity.fixture.ts',
            text: `
              import { isSelected } from '../../testkit/testing/selection.js';
              function helperIdentity(flag: boolean) {
                if (flag) {
                  return { group: 'runner-smoke', caseId: 'static-helper' } as const;
                }
                return;
              }
              describe.runIf(isSelected(helperIdentity(true)))('bare-return-helper', () => {});
            `,
          },
        ]),
      ).toThrow(/could not statically resolve isSelected identity/u);
    });

    it('fails closed for helper identities with reachable implicit fallthrough paths', () => {
      expect(() =>
        scanRunnerIdentityInventoryFromSources([
          {
            surface: 'unit',
            ownerFile: 'test/unit/fallthrough-helper-identity.fixture.ts',
            text: `
              import { isSelected } from '../../testkit/testing/selection.js';
              function helperIdentity(flag: boolean) {
                if (flag) {
                  return { group: 'runner-smoke', caseId: 'static-helper' } as const;
                }
              }
              describe.runIf(isSelected(helperIdentity(true)))('fallthrough-helper', () => {});
            `,
          },
        ]),
      ).toThrow(/could not statically resolve isSelected identity/u);
    });

    it('resolves helper-generated, arbitrary const, multiline, and loop identities', () => {
      expect(
        scanRunnerIdentityInventoryFromSources([
          {
            surface: 'unit',
            ownerFile: 'test/unit/static-positive.fixture.ts',
            text: `
              import { isSelected } from '../../testkit/testing/selection.js';
              function helperIdentity(caseId: string) {
                return { group: 'runner-smoke', caseId } as const;
              }
              const diWiringIdentity = { group: 'runner-smoke', caseId: 'const-fixture' } as const;
              const CASE_IDS = ['loop-fixture'] as const;
              describe.runIf(isSelected(helperIdentity('helper-fixture')))('helper', () => {});
              describe.runIf(isSelected(diWiringIdentity))('const', () => {});
              describe.runIf(
                isSelected({
                  group: 'runner-smoke',
                  caseId: 'multiline-fixture',
                }),
              )('multiline', () => {});
              for (const caseId of CASE_IDS) {
                describe.runIf(isSelected({ group: 'runner-smoke', caseId }))(caseId, () => {});
              }
            `,
          },
        ]),
      ).toEqual([
        {
          surface: 'unit',
          group: 'runner-smoke',
          caseId: 'const-fixture',
          ownerFile: 'test/unit/static-positive.fixture.ts',
        },
        {
          surface: 'unit',
          group: 'runner-smoke',
          caseId: 'helper-fixture',
          ownerFile: 'test/unit/static-positive.fixture.ts',
        },
        {
          surface: 'unit',
          group: 'runner-smoke',
          caseId: 'loop-fixture',
          ownerFile: 'test/unit/static-positive.fixture.ts',
        },
        {
          surface: 'unit',
          group: 'runner-smoke',
          caseId: 'multiline-fixture',
          ownerFile: 'test/unit/static-positive.fixture.ts',
        },
      ]);
    });

    it('resolves aliases only to registered identity groups', () => {
      expect(() =>
        assertAliasesResolve(RUNNER_GROUP_ALIASES, RUNNER_IDENTITY_REGISTRY),
      ).not.toThrow();

      expect(() =>
        assertAliasesResolve(
          {
            ...RUNNER_GROUP_ALIASES,
            golden: {
              ...RUNNER_GROUP_ALIASES.golden,
              synthetic: ['not-a-registered-group'],
            },
          },
          RUNNER_IDENTITY_REGISTRY,
        ),
      ).toThrow(/unregistered group/u);
    });

    it('validates platform bindings through hasRunnerIdentity', () => {
      for (const binding of PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1.bindings) {
        expect(
          hasRunnerIdentity(binding.surface, {
            group: binding.group,
            caseId: binding.executableCaseId,
          }),
        ).toBe(true);
      }
      expect(() => ensureRunnerSelectionsCoverPlatformCases()).not.toThrow();
    });

    it('makes snapshot validation fail closed on an absent exact registry identity', () => {
      const repository =
        createFilesystemPlatformContractRepository(repositoryRoot);
      expect(() =>
        validateProductionPlatformContractSnapshotV1(
          PRODUCTION_PLATFORM_CONTRACT_SNAPSHOT_V1,
          {
            ...repository,
            hasRunnerIdentity(surface, group, executableCaseId): boolean {
              return (
                executableCaseId !== 'repository-path-invalid-input' &&
                repository.hasRunnerIdentity(surface, group, executableCaseId)
              );
            },
          },
        ),
      ).toThrow(
        /runner registry missing identity unit\/cross-platform-baseline\/repository-path-invalid-input/u,
      );
    });
  },
);
