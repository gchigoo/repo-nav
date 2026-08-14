## Task P0: Freeze public contracts, registries, and version authorities

**Depends on:** none

**Files:**

- Create: `testkit/fixtures/repository-hardening-v2/public-root-api-v2.ts`
- Create: `testkit/fixtures/repository-hardening-v2/legacy-v1-api-map-v2.ts`
- Create: `testkit/fixtures/repository-hardening-v2/weak-registry-disposition-v2.ts`
- Create: `testkit/fixtures/repository-hardening-v2/version-authorities-v2.ts`
- Create: `test/unit/repository-hardening-inventory-v2.spec.ts`
- Modify: `test/unit/public-root-export-snapshot.spec.ts`
- Modify: `testkit/runners/runner-registry.ts`

**Interfaces:**

```ts
export interface WeakRegistryDispositionV2 {
  readonly module: string;
  readonly binding: string;
  readonly carries: 'runtime-capability' | 'ordinary-data' | 'identity-cache';
  readonly action: 'retain' | 'remove-c2' | 'remove-c3' | 'remove-c5';
  readonly rationale: string;
}
export const WEAK_REGISTRY_DISPOSITIONS_V2: readonly WeakRegistryDispositionV2[];

export interface LegacyV1ApiReplacementV2 {
  readonly legacy: string;
  readonly replacement: string | null;
  readonly disposition: 'replace' | 'removed-internal-only' | 'retained-root';
}
export const LEGACY_V1_API_REPLACEMENTS_V2: readonly LegacyV1ApiReplacementV2[];
```

固定 API mapping 至少包含：`repo-nav/legacy-v1`→`repo-nav`；`LocateResult/LocateToolOutput`→`LocateResultV2`；`LocateResultSchema/LocateToolOutputSchema`→`LocateResultV2Schema`；`EvidencePack`→`EvidencePackV2`；`RepoNavToolError`→`RepoNavToolErrorV2`；`LocateRequest` 保留 root import；`PackageMetadataV1`→C5 的 `PackageMetadata`；`SafeProcess*` 与 `RepositorySearchBackend` 标记为 removed-internal-only；root concrete backends 的 `probe/search` 在 2.0 保留兼容，但 canonical locate 不再调用 `search`。

- [ ] **Step 1: Add exact inventory tests**

使用 TypeScript compiler API 枚举 `src/index.ts` runtime/type exports、`src/legacy-v1.ts` 传递 exports，以及 `src/**/*.ts` 中所有 `new WeakMap`/`new WeakSet` binding。断言 fixture 与源码 deep-exact，未知 registry、重复 row、空 rationale、ordinary-data+retain 均失败。版本权威 inventory 固定包含 package/shrinkwrap root、runtime metadata、CLI `--version`、MCP `serverInfo.version`、tarball、installed package、SBOM root 和 real-consumer confirmation。

- [ ] **Step 2: Confirm mutation sensitivity**

Run: `npm test -- --group public-beta-release --case repository-hardening-inventory`

先对 fixture clone 分别删除一个 root export、增加一个 synthetic WeakMap、把 ordinary-data action 改为 retain、删除 MCP version authority，断言 evaluator 对每个 mutation fail；当前真实 inventory pass。本任务是 characterization-only，不修改 production。

- [ ] **Step 3: Move root export expectation into the shared fixture**

`public-root-export-snapshot.spec.ts` 从 `public-root-api-v2.ts` 导入现有 exact root keys；inventory test 同时验证 legacy symbol mapping 和 registry disposition，后续 C2/C3/C5 只更新同一事实源。

- [ ] **Step 4: Verify and review**

```bash
npm test -- --group public-beta-release --case repository-hardening-inventory
npm test -- --group public-beta-release --case package-metadata
npm run typecheck
npm run lint
npm run format:check
```

运行 independent review；reviewer 检查 inventory 不是从被测 package/version 动态推导、所有 current WeakMap/WeakSet site 均有 row、migration mapping 无占位符。

- [ ] **Step 5: Commit**

```bash
git add testkit/fixtures/repository-hardening-v2/public-root-api-v2.ts testkit/fixtures/repository-hardening-v2/legacy-v1-api-map-v2.ts testkit/fixtures/repository-hardening-v2/weak-registry-disposition-v2.ts testkit/fixtures/repository-hardening-v2/version-authorities-v2.ts test/unit/repository-hardening-inventory-v2.spec.ts test/unit/public-root-export-snapshot.spec.ts testkit/runners/runner-registry.ts
git diff --cached --check
git commit -m "test(hardening): freeze public and authority inventories"
```

