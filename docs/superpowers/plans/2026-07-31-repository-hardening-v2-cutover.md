# Repository Hardening and v2 Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 RepoNav 的正确性、发布门禁、快照一致性与跨平台测试缺陷，收敛到单一 canonical v2 facts 权威，删除公开 `repo-nav/legacy-v1`，并准备不发布、不打 tag 的 `2.0.0` release candidate。

**Architecture:** 先以可独立回滚的小 PR 修复 CLI、release evidence、backend trace、spawn 分类、snapshot digest、hermetic CI 与依赖安全；再精简 runner、质量门禁与 CLI fast path。随后引入唯一不可变 `LocateExecutionFactsV2` 和纯 finalizer，删除 schema-1.0 内部决策链及普通数据 WeakMap 投影流水线；verified-file 路径则在 A5 后独立合并。最终单独移除 public legacy subpath，并在最后一个 PR 统一切换到 `2.0.0`。

**Tech Stack:** TypeScript 5.8、ESM/NodeNext、Node.js `^22.0.0 || ^24.0.0`、NestJS 11、MCP SDK 1.30.0、Zod 4、Vitest 4、ESLint 9、Prettier 3、npm shrinkwrap、GitHub Actions。

## Global Constraints

- 以已批准设计 `docs/superpowers/specs/2026-07-31-repository-hardening-v2-cutover-design.md` 和本地提交 `6604880` 为基线。
- 每个任务是一个可独立 review、revert、验证的 PR；每个 PR 只使用文中给出的 commit message。
- 所有行为修复遵循 TDD：先新增最小回归测试并确认预期失败，再实现，再跑目标面与静态门禁。
- Phases A/B 不改变 public v2 MCP tool name、input schema、output schema、CLI JSON shape 或 recoverable-error channel；A3 只允许纠正已证明错误的 status、backend coverage、fallback 与 index observation。
- 不弱化 root containment、symlink/reparse 防御、read-only handle、fatal UTF-8、N+1 byte budget、脱敏、稳定排序、进程树清理与 deadline/caller abort 语义。
- 并发只能用于互相独立的 probe/runner 进程；输出仍按注册顺序确定性组装。
- MCP SDK 仅升级到精确版本 `1.30.0`；不引入更大依赖迁移。
- A7 仍处于 1.x corrective line，安装文档写精确 `repo-nav@1.0.6`；只有 C5 将全部版本权威改为 `2.0.0`。
- C4 删除 `repo-nav/legacy-v1` 是 breaking API PR；C5 才更新 major version。
- 不执行 `git push`、npm publish、dist-tag 修改、tag 创建或远端状态变更。
- `release:owner-actions:check` 缺少 owner 文件时保留 exit 2/owner residual，不伪造 owner evidence。
- 每个 PR 在提交前至少运行：目标测试、受影响测试面、`npm run typecheck`、`npm run lint`、`npm run format:check`；公共输出、process、snapshot、release 或 package PR 还要运行本文列出的 Golden/MCP/package/security gates。

---

## PR DAG 与集成顺序

```text
Phase A independent roots
A1 ──► A2
A3 ──► C1.1 ─► C1.2 ─► C1.3 ─► C2.1 ─► C2.2 ─┬─► C3.1 ─► C3.2 ─┐
A4                                                        └─► C4 ──────────┼─► C5
A5 ──► D1 ─► D2                                                           │
A6 ──► B1.1 ─► B1.2 ─► B1.3 ─► B1.4                                      │
A7                                                                         │
A1 ──► B3.1 ─► B3.2                                                       │
                                                                           │
Phase A + B1.4 + B3.2 ─► B2.1 ─► B2.2 ─► B2.3 ─► B2.4 ───────────────────┘
```

- **硬依赖：** A1→A2、A3→C1、A5→D1→D2、A6→B1、C1→C2→C3、C2.2→C4、C3.2+C4→C5。
- **冲突规避顺序：** B2 formatting/lint 栈在 Phase A、B1、B3 合并后执行，避免 142 个现有未格式化 test/testkit 文件与前序测试改动反复冲突。
- **可并行分支：** A1/A3/A4/A5/A6/A7；A5 后的 D 分支可与 C 分支并行；C4 可与 C3.1/C3.2 并行，C5 为 join point。

## Phase A — Correctness and release blockers

### Task A1: CLI closed-stdin lifecycle

**Depends on:** none

**Files:**

- Modify: `src/cli/main.ts`
- Create: `test/mcp/cli-closed-stdin.spec.ts`
- Modify: `testkit/runners/runner-registry.ts`
- Modify: `tools/release/pack-candidate.mjs`

**Interfaces:** No public interface changes. `executeCli(args, signal, dependencies?)` remains unchanged.

- [ ] **Step 1: Write the compiled-bin regression**

```ts
const locate = spawnSync(
  process.execPath,
  [
    resolve(root, 'dist/cli/main.js'),
    'debug',
    'locate',
    '--repo',
    fixtureRoot,
    '--term',
    'repo_nav_closed_stdin_absent_marker_7f9c',
  ],
  {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
expect(locate.status).toBe(0);
expect(locate.stderr).toBe('');
const result = LocateResultV2Schema.parse(JSON.parse(locate.stdout));
expect(result.ok).toBe(true);
if (result.ok) {
  expect(result.evidence.status).not.toBe('cancelled');
  expect(result.evidence.status).not.toBe('timeout');
  expect(result.evidence.coverage.abortSource).toBe('none');
}
```

同文件再以 closed stdin 运行 `debug probe --repo <fixtureRoot>`，用 `ProbeOutputSchema` 验证成功。

- [ ] **Step 2: Confirm the failure**

Run: `npm run test:mcp -- --group debug-cli-lifecycle --case closed-stdin-bin`

Expected before fix: locate 返回 `status: cancelled` 或 `coverage.abortSource: caller`；probe 可能在 EOF 后被 abort。

- [ ] **Step 3: Remove EOF as a cancellation protocol**

从 `src/cli/main.ts` 删除 `watchingStdin`、context-command 检测、`stdin.once('end', abort)`、`stdin.resume()`、`stdin.pause()` 与 end-listener cleanup；只保留 SIGINT、SIGTERM 和显式 caller/deadline signal。

在 `tools/release/pack-candidate.mjs` 的 installed tarball smoke 中新增 closed-stdin probe/locate；locate 允许 `no_result`、`partial` 或 `backend_unavailable`，但禁止 `cancelled`、`timeout` 和非空 stderr。

- [ ] **Step 4: Verify**

Run:

```bash
npm run test:mcp -- --group debug-cli-lifecycle --case closed-stdin-bin
npm run test:mcp -- --all
npm run package:smoke
npm run typecheck
npm run lint
npm run format:check
```

Expected: all pass; signal-driven cancellation tests remain unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/cli/main.ts test/mcp/cli-closed-stdin.spec.ts testkit/runners/runner-registry.ts tools/release/pack-candidate.mjs
git commit -m "fix(cli): ignore stdin EOF for one-shot commands"
```

### Task A2: Fail-closed real-consumer evidence

**Depends on:** A1

**Files:**

- Create: `tools/release/real-consumer-evaluator.mjs`
- Modify: `tools/release/run-real-consumer-e2e.mjs`
- Modify: `tools/release/real-consumer-contracts.mjs`
- Modify: `tools/release/real-consumer-snapshot.mjs`
- Create: `testkit/fixtures/release-v2/real-consumer-observations-v2.ts`
- Modify: `testkit/fixtures/release-v2/real-consumer-confirmation-schema-v2.ts`
- Modify: `test/unit/public-beta-real-consumer-gate.spec.ts`
- Modify: `testkit/manifests/release-v2/release-case-manifest-v2.json`

**Interfaces:**

```js
export const REAL_CONSUMER_FAILURE_CODES = Object.freeze([
  'cli-nonzero-exit',
  'cli-signal-exit',
  'cli-stderr-not-empty',
  'cli-json-invalid',
  'locate-ok-false',
  'locate-schema-mismatch',
  'locate-cancelled',
  'locate-timeout',
  'locate-evidence-insufficient',
  'mcp-result-invalid',
  'mcp-cli-parity-mismatch',
  'forbidden-output-detected',
  'repository-state-changed',
]);
export function evaluateRealConsumerObservation(input) {}
export function assertRealConsumerObservation(input) {}
```

```js
export function captureGitState(repositoryRoot) {}
export function captureRepositoryState(repositoryRoot) {}
export function assertRepositoryStateUnchanged(before, after) {}
```

- [ ] **Step 1: Add negative mutation tests**

以一个 valid observation fixture 为基线，逐项变异并断言失败码：nonzero exit、signal exit、nonempty stderr、`ok:false`、schema 非 `2.0`、`cancelled`、`timeout`、incomplete empty `no_result`、MCP parity mismatch、forbidden output、branch/HEAD/index/worktree mutation。

```ts
it.each([
  ['nonzero', mutate({ cliStatus: 3 }), 'cli-nonzero-exit'],
  ['ok false', mutate({ locateOk: false }), 'locate-ok-false'],
  ['schema', mutate({ schemaVersion: '1.0' }), 'locate-schema-mismatch'],
  ['cancelled', mutate({ status: 'cancelled' }), 'locate-cancelled'],
  ['timeout', mutate({ status: 'timeout' }), 'locate-timeout'],
  [
    'parity',
    mutate({ mcpResult: differentValidResult }),
    'mcp-cli-parity-mismatch',
  ],
])('%s fails closed', (_name, observation, code) => {
  const result = evaluateRealConsumerObservation(observation);
  expect(result.ok).toBe(false);
  expect(result.failures).toContain(code);
});
```

- [ ] **Step 2: Confirm the failure**

Run: `npm test -- --group public-beta-release --case real-consumer-read-only`

Expected before fix: evaluator module missing；当前 runner 仍可接受 `ok:false`、cancelled、nonzero exit，并输出硬编码 attestations。

- [ ] **Step 3: Implement measured evaluation and installed-candidate execution**

`evaluateRealConsumerObservation` 必须要求：CLI exit 0、无 signal、stderr empty、strict parse、`ok:true`、`evidence.schemaVersion === '2.0'`、非 cancelled/timeout、已保留 `package.json` evidence 或 complete `no_result`、MCP structured content 与 CLI deep-exact、forbidden scan 通过、repository state deep-exact。

`run-real-consumer-e2e.mjs` 必须 build/pack/install exact tarball 到临时 consumer，以 closed stdin 运行 installed CLI，再用 installed MCP server 调用同一 request；before/after 捕获 worktree hashes、branch、HEAD、absolute index path 与 index SHA-256。删除 `untrackedCount`、`ignoredCount`、`codegraphEntryCount`、`serviceMcpCliParity: true`、`strictForbiddenScanPassed: true` 等未测量字段，只输出 evaluator 的 measured booleans 和实际 hashes/counts。

`confirmation.candidate` 精确验证 `{ name: 'repo-nav'; version: string; tarballSha256: 64 lowercase hex }`。

- [ ] **Step 4: Verify**

```bash
npm test -- --group public-beta-release --case real-consumer-read-only
node tools/release/run-real-consumer-e2e.mjs --confirmation does-not-exist.json; test $? -eq 2
npm run package:smoke
npm run package:closure:check
npm run typecheck
npm run lint
npm run format:check
```

Expected: synthetic negative matrix pass；missing confirmation 仍结构化 owner-block；有 owner confirmation 时只有 installed CLI/MCP parity 与 repository unchanged 才 exit 0。

- [ ] **Step 5: Commit**

```bash
git add tools/release/real-consumer-evaluator.mjs tools/release/run-real-consumer-e2e.mjs tools/release/real-consumer-contracts.mjs tools/release/real-consumer-snapshot.mjs testkit/fixtures/release-v2/real-consumer-observations-v2.ts testkit/fixtures/release-v2/real-consumer-confirmation-schema-v2.ts test/unit/public-beta-real-consumer-gate.spec.ts testkit/manifests/release-v2/release-case-manifest-v2.json
git commit -m "fix(release): fail closed on real-consumer evidence"
```

### Task A3: Mandatory backend trace and derived fallback coverage

**Depends on:** none

**Files:**

- Create: `src/contracts/v2/traceable-repository-search-backend-v2.ts`
- Modify: `src/repository/codegraph-backend.ts`
- Modify: `src/repository/ripgrep-backend.ts`
- Modify: `src/repository/repository-backends.module.ts`
- Modify: `src/evidence/request-snapshot/pre-f5-multi-view-search-v2.ts`
- Modify: `src/process/backend-execution-context-v2.ts`
- Modify: `src/evidence/request-outcome/trusted-fallback-decision-v2.ts`
- Modify: `src/evidence/request-outcome/request-outcome-aggregator-v2.ts`
- Modify: `src/evidence/locate-execution/register-production-accepted-projection-seams-v2.ts`
- Modify: `src/evidence/locate-execution/canonical-locate-executor-v2.ts`
- Create: `test/unit/canonical-backend-trace-wiring-v2.spec.ts`
- Modify: `test/unit/backend-execution-trace-v2.spec.ts`
- Modify: `test/unit/codegraph-backend.spec.ts`
- Modify: `test/golden/codegraph-fallback.spec.ts`
- Modify: `testkit/testing/create-canonical-locate-engine-harness-v2.ts`
- Modify: `testkit/runners/runner-registry.ts`

**Interfaces:**

```ts
export interface TraceableRepositorySearchBackendV2 {
  readonly id: SearchBackendId;
  searchViews(
    request: MultiViewBackendSearchRequestV2,
    signal: AbortSignal,
    context: BackendExecutionContextV2,
    execution: LocateExecutionTokenV2,
  ): Promise<TrustedBackendDiscoveryHandoffV2>;
}
```

```ts
export async function searchBackendMultiViewV2(
  backend: TraceableRepositorySearchBackendV2,
  multiView: MultiViewBackendSearchRequestV2,
  signal: AbortSignal,
  context: BackendExecutionContextV2,
  execution: LocateExecutionTokenV2,
): Promise<PreF5MultiViewLaneResultsV2>;
```

```ts
export function finalizeBackendExecutionTraceV2(
  context: BackendExecutionContextV2,
  execution: LocateExecutionTokenV2,
): BackendExecutionTraceV2;

export function deriveTrustedFallbackDecisionV2(input: {
  readonly execution: LocateExecutionTokenV2;
  readonly backendTrace: BackendExecutionTraceV2;
}): TrustedFallbackDecisionV2;
```

- [ ] **Step 1: Add a production-wiring regression without fixture wrapping**

实际实例化 `CodeGraphBackend` 与 `RipgrepBackend`；只对 process runner 注入 CodeGraph ENOENT，禁止 `wrapFixtureBackendsSearchViewsV2`。

```ts
expect(result.evidence.status).toBe('no_result');
expect(result.evidence.coverage.backends).toEqual([
  expect.objectContaining({
    backend: 'codegraph',
    status: 'unavailable',
    reasonCode: 'CODEGRAPH_UNAVAILABLE',
  }),
  expect.objectContaining({
    backend: 'ripgrep',
    status: 'used',
    completion: 'complete',
    reasonCode: 'RIPGREP_NO_RESULT',
    hitCount: 0,
  }),
]);
expect(result.evidence.coverage.fallbackChecked).toBe(true);
expect(result.evidence.coverage.strategyComplete).toBe(true);
expect(result.evidence.coverage.indexState).toBe('unavailable');
```

再加 source-inventory 断言，禁止 `hasSearchViews`、`'searchViews' in backend` 和 optional context/execution 参数。

- [ ] **Step 2: Confirm the failure**

```bash
npm test -- --group streaming-ripgrep --case canonical-backend-trace-wiring
npm run test:golden -- --group codegraph-fallback
```

Expected before fix: production result 为 `partial`，trace 缺 CodeGraph，index observation 为 unknown/not-observed。

- [ ] **Step 3: Implement trace ownership and fallback derivation**

`CodeGraphBackend.searchViews` 使用 `BackendExecutionContextV2` 的 physical executor 运行 status 与 query plan，创建唯一 status receipt、logical attempt 和 trusted handoff；compatibility `probe/search` 暂时保留。

context 在 status receipt 创建时记录 CodeGraph observation；finalization 不再接受 caller-supplied observation。无 CodeGraph start→`not-observed`；有 start 但无/冲突 receipt→固定 internal invariant failure。

删除 `ProductionAcceptedProjectionSeamInputV2` 的 `fallbackChecked`、`fallbackRequired`、`completeEquivalentFallback`。fallback facts 只从 ordered trace outcomes 推导：required fallback 实际运行且 Ripgrep `used/complete` 才是 complete equivalent。

Nest provider 返回 `readonly TraceableRepositorySearchBackendV2[]`；canonical path 不再调用普通 `search()`。

- [ ] **Step 4: Verify**

```bash
npm test -- --group streaming-ripgrep --case canonical-backend-trace-wiring
npm test -- --group streaming-ripgrep --case codegraph-outcome-trace
npm test -- --group input-abort-contract-v2 --case strategy-completeness
npm run test:golden -- --group codegraph-fallback
npm run test:golden -- --all
npm run test:mcp -- --all
npm run test:docs
npm run build
npm run typecheck
npm run lint
npm run format:check
```

- [ ] **Step 5: Commit**

```bash
git add src/contracts/v2/traceable-repository-search-backend-v2.ts src/repository/codegraph-backend.ts src/repository/ripgrep-backend.ts src/repository/repository-backends.module.ts src/evidence/request-snapshot/pre-f5-multi-view-search-v2.ts src/process/backend-execution-context-v2.ts src/evidence/request-outcome/trusted-fallback-decision-v2.ts src/evidence/request-outcome/request-outcome-aggregator-v2.ts src/evidence/locate-execution/register-production-accepted-projection-seams-v2.ts src/evidence/locate-execution/canonical-locate-executor-v2.ts test/unit/canonical-backend-trace-wiring-v2.spec.ts test/unit/backend-execution-trace-v2.spec.ts test/unit/codegraph-backend.spec.ts test/golden/codegraph-fallback.spec.ts testkit/testing/create-canonical-locate-engine-harness-v2.ts testkit/runners/runner-registry.ts
git commit -m "fix(execution): make backend trace mandatory in canonical locate"
```

### Task A4: Sanitized spawn-failure classification

**Depends on:** none

**Files:**

- Create: `src/process/spawn-failure-reason-v2.ts`
- Modify: `src/contracts/safe-process.ts`
- Modify: `src/process/safe-process-execution-kernel-v2.ts`
- Modify: `src/process/buffered-compatibility-projection-v2.ts`
- Modify: `src/process/backend-physical-attempt-executor-v2.ts`
- Create: `test/unit/spawn-failure-classification-v2.spec.ts`
- Modify: `testkit/runners/runner-registry.ts`

**Interfaces:**

```ts
export type SpawnFailureReasonV2 = 'not-found' | 'permission-denied' | 'other';
export function classifySpawnFailureReasonV2(
  error: unknown,
): SpawnFailureReasonV2;
export function registerBufferedSpawnFailureReasonV2(
  result: SafeProcessResult,
  reason: SpawnFailureReasonV2,
): void;
export function readBufferedSpawnFailureReasonV2(
  result: SafeProcessResult,
): SpawnFailureReasonV2 | undefined;
```

- [ ] **Step 1: Add error-code and leakage tests**

```ts
it.each([
  ['ENOENT', 'not-found'],
  ['EACCES', 'permission-denied'],
  ['EPERM', 'permission-denied'],
  ['EMFILE', 'other'],
] as const)('classifies %s', async (code, expected) => {
  const result = await runKernelWithSpawnThrow(
    Object.assign(new Error('secret /private/bin'), { code }),
  );
  expect(result).toMatchObject({
    ok: false,
    kind: 'other-spawn-error',
    startState: 'no-child',
    spawnFailureReason: expected,
  });
  expect(JSON.stringify(result)).not.toContain('secret');
  expect(JSON.stringify(result)).not.toContain('/private/bin');
});
```

再断言 availability：ENOENT→`executable-not-found`；EACCES/EPERM/other→`other-spawn-error` 与 backend `BACKEND_PROCESS_FAILED`。buffered public-compatible enumerable shape 不增加 `spawnFailureReason`。

- [ ] **Step 2: Confirm the failure**

Run: `npm test -- --group streaming-ripgrep --case spawn-failure-classification`

Expected before fix: 所有 code 都变成 executable-not-found；新 sanitized reason 不存在。

- [ ] **Step 3: Implement normalization**

kernel 在同步 `spawn()` throw 和 child pre-spawn `error` 两条路径立即分类并丢弃 raw Error。streaming no-child result 内部携带 sanitized reason；buffered projection 用 WeakMap 关联 reason，保持现有 enumerable `SafeProcessResult` deep shape。删除 `ENOENT ? executable-not-found : executable-not-found` 分支。

- [ ] **Step 4: Verify**

```bash
npm test -- --group streaming-ripgrep --case spawn-failure-classification
npm test -- --group streaming-ripgrep --case buffered-compatibility-projection
npm test -- --group streaming-ripgrep --case physical-start-authority
npm test -- --group streaming-ripgrep --case exit-outcome-table
npm run test:golden -- --group codegraph-fallback
npm run test:platform
npm run typecheck
npm run lint
npm run format:check
```

- [ ] **Step 5: Commit**

```bash
git add src/process/spawn-failure-reason-v2.ts src/contracts/safe-process.ts src/process/safe-process-execution-kernel-v2.ts src/process/buffered-compatibility-projection-v2.ts src/process/backend-physical-attempt-executor-v2.ts test/unit/spawn-failure-classification-v2.spec.ts testkit/runners/runner-registry.ts
git commit -m "fix(process): distinguish missing and denied executable spawns"
```

### Task A5: Bind snapshot identity to exact bytes

**Depends on:** none

**Files:**

- Create: `src/repository/verified-file-snapshot-v2.ts`
- Modify: `src/repository/verified-text-file-source-v2.ts`
- Modify: `src/evidence/request-snapshot/canonical-file-identity-v2.ts`
- Modify: `src/evidence/request-snapshot/request-file-cache-v2.ts`
- Modify: `src/evidence/request-snapshot/final-snapshot-check-v2.ts`
- Modify: `src/evidence/request-snapshot/request-repository-snapshot-v2.ts`
- Modify: `src/evidence/request-snapshot/index.ts`
- Create: `test/unit/snapshot-content-identity-v2.spec.ts`
- Modify: `test/unit/final-snapshot-check.spec.ts`
- Modify: `test/unit/request-snapshot-cache.spec.ts`
- Modify: `test/golden/request-snapshot-cache.spec.ts`
- Modify: `testkit/runners/runner-registry.ts`

**Interfaces:**

```ts
export interface VerifiedFileSnapshotV2 {
  readonly locator: string;
  readonly canonicalFileKey: CanonicalFileKeyV2;
  readonly identity: {
    readonly dev: bigint;
    readonly ino: bigint;
    readonly size: bigint;
    readonly mtimeNs: bigint;
    readonly ctimeNs: bigint;
  };
  readonly contentSha256: string;
}
```

`VerifiedTextFileV2` 变为 `{ readonly snapshot: VerifiedFileSnapshotV2; readonly lines: readonly string[] }`；cache/final-check 只保存并比较该 snapshot。

- [ ] **Step 1: Add restored-mtime and handle-race regressions**

```ts
writeFileSync(file, 'const value = 1;\n');
const before = statSync(file);
await snapshot.readRange(root, relative, [1, 1], limits, signal);
writeFileSync(file, 'const value = 2;\n');
utimesSync(file, before.atime, before.mtime);
expect(statSync(file).size).toBe(before.size);
const checked = await snapshot.finalCheck(
  signal,
  evidencePool,
  eligiblePool,
  'dirty',
);
expect(checked.facts.coverage.consistency).toBe('changed');
expect(checked.retainedEvidence).toEqual([]);
expect(checked.discardedEvidenceCount).toBe(1);
```

再用 test seam 在初始 canonical resolve 与 verified read 之间替换目标，断言 `FILE_UNREADABLE` 且 cache 不记录 loaded canonical file。

- [ ] **Step 2: Confirm the failure**

```bash
npm test -- --group request-snapshot-cache --case snapshot-content-identity
npm test -- --group request-snapshot-cache --case snapshot-mutation-purge
```

Expected before fix: same inode/size/restored millisecond mtime 被判定 stable。

- [ ] **Step 3: Implement same-handle identity and SHA-256**

`VerifiedTextFileSourceV2` 在读取 bytes 的同一 read-only handle 上执行 `stat({ bigint: true })`，使用 `mtimeNs/ctimeNs`，对 bounded exact bytes 计算 SHA-256 后再 fatal UTF-8 decode。A5 仍保留初始 canonical resolution 作为 alias binding，但必须验证其 identity 与 verified handle identity 一致；snapshot 采用 verified handle 的 identity+digest。

final revalidation 重新 verified-read 并比较 canonical key、dev、ino、size、mtimeNs、ctimeNs、contentSha256；任何 mismatch、read error、required-check abort 都标记 changed 并 purge whole canonical-file evidence/eligible records。digest/identity 不进入 public output。

- [ ] **Step 4: Verify**

```bash
npm test -- --group request-snapshot-cache --case snapshot-content-identity
npm test -- --group request-snapshot-cache --case snapshot-mutation-purge
npm test -- --group request-snapshot-cache --case snapshot-failure-and-abort-purge
npm test -- --group repository-safety
npm test -- --group cross-platform-baseline
npm run test:golden -- --group request-snapshot-cache
npm run test:platform
npm run typecheck
npm run lint
npm run format:check
```

- [ ] **Step 5: Commit**

```bash
git add src/repository/verified-file-snapshot-v2.ts src/repository/verified-text-file-source-v2.ts src/evidence/request-snapshot/canonical-file-identity-v2.ts src/evidence/request-snapshot/request-file-cache-v2.ts src/evidence/request-snapshot/final-snapshot-check-v2.ts src/evidence/request-snapshot/request-repository-snapshot-v2.ts src/evidence/request-snapshot/index.ts test/unit/snapshot-content-identity-v2.spec.ts test/unit/final-snapshot-check.spec.ts test/unit/request-snapshot-cache.spec.ts test/golden/request-snapshot-cache.spec.ts testkit/runners/runner-registry.ts
git commit -m "fix(snapshot): bind file identity to content digest"
```

### Task A6: Hermetic unit surface and macOS ARM coverage

**Depends on:** none

**Files:**

- Move: `test/unit/codegraph-live-smoke.spec.ts` → `test/integration/codegraph-live-smoke.spec.ts`
- Create: `vitest.integration-codegraph.config.ts`
- Modify: `package.json`
- Modify: `testkit/runners/runner-registry.ts`
- Modify: `testkit/contracts/platform-contract.ts`
- Modify: `test/unit/cross-platform-ci-contract.spec.ts`
- Create: `test/unit/hermetic-test-surface.spec.ts`
- Modify: `.github/workflows/cross-platform-ci.yml`
- Modify: `.github/workflows/package-release-ci.yml`

**Interfaces:** `export type PlatformArch = 'x64' | 'arm64';`

- [ ] **Step 1: Add hermetic/workflow assertions**

```ts
expect(
  existsSync(resolve(root, 'test/unit/codegraph-live-smoke.spec.ts')),
).toBe(false);
expect(
  existsSync(resolve(root, 'test/integration/codegraph-live-smoke.spec.ts')),
).toBe(true);
expect(pkg.scripts['test:integration:codegraph']).toBe(
  'vitest run --config vitest.integration-codegraph.config.ts',
);
expect(['x64', 'arm64']).toContain(probeRuntimeIdentity().arch);
expect(workflowRaw).toContain('macos-arm-unit:');
expect(workflowRaw).toContain('runs-on: macos-14');
expect(workflowRaw).toContain('npm test');
expect(workflowRaw).toContain('codegraph-integration:');
```

- [ ] **Step 2: Confirm current failures**

Run with CodeGraph absent: `PATH="$(dirname "$(command -v node)"):/usr/bin:/bin" npm test`

Expected before fix: live CodeGraph smoke fails；在 macOS arm64 上 runtime test fails at `arch === x64`。

- [ ] **Step 3: Isolate integration and add PR/push ARM job**

新增专用 Vitest config，只 include live CodeGraph file；unit registry 删除 `codegraph-live-smoke/indexed-temp-repo`。普通 runtime unit test 只验证 supported OS、`x64|arm64`、Node 22|24；exact CI cell 仍由 `--runtime-probe --cell` 验证。

cross-platform workflow 新增：

- `codegraph-integration`：ubuntu-24.04/Node22，安装 pinned CodeGraph 1.1.6，运行 `npm run test:integration:codegraph`；
- `macos-arm-unit`：macos-14/Node22，`npm ci`、typecheck、plain `npm test`，不安装 CodeGraph；
- aggregate job 同时 require matrix、ARM unit、CodeGraph integration success。

删除 package-release workflow 中无法由 schedule 触发且不跑 unit 的 `macos-arm-smoke`，避免重复/误导覆盖。

- [ ] **Step 4: Verify**

```bash
npm test
npm run test:integration:codegraph
npm test -- --group cross-platform-ci-contract --case workflow-matrix-contract
npm test -- --group cross-platform-ci-contract --case runtime-cell-contract
npm run typecheck
npm run lint
npm run format:check
```

Expected: plain unit 不依赖 CodeGraph/arch；explicit integration 在安装 1.1.6 后 pass；workflow contract 要求 PR/push ARM unit job。

- [ ] **Step 5: Commit**

```bash
git add test/integration/codegraph-live-smoke.spec.ts vitest.integration-codegraph.config.ts package.json testkit/runners/runner-registry.ts testkit/contracts/platform-contract.ts test/unit/cross-platform-ci-contract.spec.ts test/unit/hermetic-test-surface.spec.ts .github/workflows/cross-platform-ci.yml .github/workflows/package-release-ci.yml
git rm test/unit/codegraph-live-smoke.spec.ts
git commit -m "test(ci): isolate CodeGraph integration and add macOS ARM unit coverage"
```

### Task A7: SDK, installed audit policy, and release metadata

**Depends on:** none

**Files:**

- Modify: `package.json`
- Regenerate: `npm-shrinkwrap.json`
- Create: `tools/release/production-audit-policy.json`
- Create: `tools/release/production-audit-policy.mjs`
- Modify: `tools/release/audit-installed-closure.mjs`
- Modify: `tools/release/check-package-metadata.mjs`
- Modify: `README.md`
- Modify: `SECURITY.md`
- Modify: `docs/getting-started-mcp.md`
- Modify: `docs/migration-v1-to-v2.md`
- Modify: `test/unit/public-beta-release-security.spec.ts`
- Modify: `test/unit/public-beta-release-metadata.spec.ts`
- Modify: `test/unit/public-beta-release-docs.spec.ts`
- Modify: `test/docs/public-beta-release.spec.ts`
- Modify: `testkit/fixtures/release-v2/dependency-closure-v2.ts`
- Modify: `testkit/fixtures/release-v2/security-metadata-v2.ts`

**Interfaces:**

```js
export function validateProductionAuditPolicy(policy) {}
export function evaluateProductionAudit(report, policy, now = new Date()) {}
```

Policy file:

```json
{
  "schemaVersion": 1,
  "blockingSeverities": ["moderate", "high", "critical"],
  "dispositions": []
}
```

- [ ] **Step 1: Add SDK/audit/docs failures**

断言 SDK pin/shrinkwrap 为 1.30.0；synthetic moderate finding 无 disposition 时 `ok:false`；high/critical 永不可 disposition；expired/duplicate/unused disposition fail；README/getting-started/migration 包含 `npm i -g repo-nav@1.0.6` 且不含 `@beta`；SECURITY 支持 `1.x`。

- [ ] **Step 2: Confirm the failure**

```bash
npm test -- --group public-beta-release --case installed-audit
npm test -- --group public-beta-release --case package-metadata
npm run security:audit
```

Expected before fix: SDK 1.29.0；audit 对 moderate 放行并输出 residual；docs/security 仍指向 beta line。

- [ ] **Step 3: Upgrade and enforce explicit policy**

将 dependency 精确改为 `1.30.0`，用 npm 11.12.1 regenerate shrinkwrap。installed audit 必须 pack/install candidate，在临时 consumer 执行 `npm audit --omit=dev --audit-level=moderate --json`，即使 npm nonzero 也 parse JSON；moderate/high/critical 未处置即 fail，initial policy 要求三者全零，low 只报告。输出 actual counts、candidate version、tarball SHA-256，删除 residual。

`check-package-metadata.mjs` 独立验证 README/getting-started/migration 的 exact 1.0.6 install 文本，并拒绝 `repo-nav@beta`。SECURITY 表为 `1.x supported`、`<1.0 unsupported`。

- [ ] **Step 4: Verify**

```bash
npm ci
npm run typecheck
npm run test:mcp -- --all
npm run test:docs
npm run package:smoke
npm run package:closure:check
npm run security:audit
npm run security:sbom:check
npm run package:metadata:check
npm run package:lock:check
npm run lint
npm run format:check
```

Expected: installed closure 无 undisposed moderate/high/critical；MCP parity 在 SDK 1.30.0 上 pass；docs 与 package metadata 一致。

- [ ] **Step 5: Commit**

```bash
git add package.json npm-shrinkwrap.json tools/release/production-audit-policy.json tools/release/production-audit-policy.mjs tools/release/audit-installed-closure.mjs tools/release/check-package-metadata.mjs README.md SECURITY.md docs/getting-started-mcp.md docs/migration-v1-to-v2.md test/unit/public-beta-release-security.spec.ts test/unit/public-beta-release-metadata.spec.ts test/unit/public-beta-release-docs.spec.ts test/docs/public-beta-release.spec.ts testkit/fixtures/release-v2/dependency-closure-v2.ts testkit/fixtures/release-v2/security-metadata-v2.ts
git commit -m "chore(release): upgrade MCP SDK and enforce production audit policy"
```

## Phase B — Feedback-loop efficiency and quality boundary

### Task B1.1: Exact test identity selection semantics

**Depends on:** A6

**Files:**

- Modify: `testkit/testing/selection.ts`
- Modify: `testkit/runners/run-vitest-surface.ts`
- Create: `test/unit/runner-exact-selection.spec.ts`
- Modify: `testkit/runners/runner-registry.ts`

**Interfaces:**

```ts
export interface TestIdentity {
  readonly group: string;
  readonly caseId: string;
}
export function isSelected(identity: TestIdentity): boolean;
```

Runner accepts repeated `--identity <group>/<caseId>`；legacy `--group G --case C` 仅允许 exactly one group+one case 并转换为一个 identity；group-only 仍用于开发者运行整组。环境变量改为 `REPO_NAV_TEST_IDENTITIES` JSON object array，删除 `REPO_NAV_TEST_CASES`。

- [ ] **Step 1: Add cross-product regression**

```ts
setSelection([
  { group: 'g1', caseId: 'c1' },
  { group: 'g2', caseId: 'c2' },
]);
expect(isSelected({ group: 'g1', caseId: 'c1' })).toBe(true);
expect(isSelected({ group: 'g2', caseId: 'c2' })).toBe(true);
expect(isSelected({ group: 'g1', caseId: 'c2' })).toBe(false);
expect(isSelected({ group: 'g2', caseId: 'c1' })).toBe(false);
```

再断言 malformed identity、case without group、multi group+case legacy form、`--identity` 与 `--group` 混用都抛 `RunnerUsageError`。

- [ ] **Step 2: Confirm the failure**

Run: `npm test -- --group runner-smoke --case runner-exact-selection`

Expected before fix: independent group/case sets 选择 cross product。

- [ ] **Step 3: Implement exact env and CLI parsing**

序列化 identities 为 `[{"group":"...","caseId":"..."}]`；`isSelected` 优先 exact identities，group-only 只匹配 group；无 selection 表示 all。summary selection 输出 `identity:<group>/<caseId>`。

- [ ] **Step 4: Verify**

```bash
npm test -- --group runner-smoke --case runner-exact-selection
npm test -- --group runner-smoke
npm test -- --identity cross-platform-ci-contract/workflow-matrix-contract
npm run test:mcp -- --identity lifecycle/shutdown-cleanup-probe
npm run typecheck
npm run lint
npm run format:check
```

- [ ] **Step 5: Commit**

```bash
git add testkit/testing/selection.ts testkit/runners/run-vitest-surface.ts test/unit/runner-exact-selection.spec.ts testkit/runners/runner-registry.ts
git commit -m "fix(test): select exact runner identities"
```

### Task B1.2: Normalize the runner registry around exact identities

**Depends on:** B1.1

**Files:**

- Modify: `testkit/runners/runner-registry.ts`
- Modify: `testkit/contracts/platform-contract.ts`
- Create: `test/unit/runner-registry-contract.spec.ts`

**Interfaces:**

```ts
export interface RunnerIdentityRegistration {
  readonly surface: RunnerSurface;
  readonly identity: TestIdentity;
}
export const RUNNER_IDENTITY_REGISTRY: readonly RunnerIdentityRegistration[];
export function hasRunnerIdentity(
  surface: RunnerSurface,
  identity: TestIdentity,
): boolean;
```

`RUNNER_SELECTIONS.groups/cases` 改为从 exact registry 派生的兼容 views，不再手工维护两套 giant sets。

- [ ] **Step 1: Add registry completeness tests**

静态扫描 `test/{unit,golden,mcp}` 中 literal `isSelected({ group, caseId })` 与 `const identity = { group, caseId }`，归一化后与 `RUNNER_IDENTITY_REGISTRY` deep-exact；重复 identity、unknown surface、registry-only stale identity 全部 fail。platform bindings 必须通过 `hasRunnerIdentity(surface,{group,caseId})`。

- [ ] **Step 2: Confirm the failure**

Run: `npm test -- --identity runner-smoke/runner-registry-contract`

Expected before fix: exact registry 不存在；groups/cases 无法证明合法组合。

- [ ] **Step 3: Replace manual sets**

把当前所有 unit/golden/mcp 合法组合逐项登记为 exact identities；group aliases 展开后也必须解析到已登记 identities。`PLATFORM_CASE_OWNER_REGISTRATION` 继续提供 platform owner files，但 key 由同一 identity formatter 生成，禁止重复字符串协议。

- [ ] **Step 4: Verify**

```bash
npm test -- --identity runner-smoke/runner-registry-contract
npm test -- --all
npm run test:golden -- --all
npm run test:mcp -- --all
npm run test:platform -- --self-test
npm run typecheck
npm run lint
npm run format:check
```

- [ ] **Step 5: Commit**

```bash
git add testkit/runners/runner-registry.ts testkit/contracts/platform-contract.ts test/unit/runner-registry-contract.spec.ts
git commit -m "refactor(test): normalize the runner identity registry"
```

### Task B1.3: Validate multiple platform contracts from one result

**Depends on:** B1.2

**Files:**

- Modify: `tools/ci/run-platform-contracts.mjs`
- Modify: `testkit/testing/platform-contract-setup.ts`
- Modify: `testkit/testing/platform-contract.ts`
- Create: `test/unit/platform-batch-result.spec.ts`
- Modify: `testkit/runners/runner-registry.ts`

**Interfaces:**

```ts
export function validatePlatformBatchResult(input: {
  readonly bindings: readonly PlatformCaseBindingV1<string>[];
  readonly privateResult: PrivatePlatformRunnerResultV1;
  readonly markerOwners: readonly PlatformAssertionMarkerOwnerV1<string>[];
  readonly evidenceOwners: readonly PlatformEvidenceHashOwnerV1<string>[];
}): readonly PlatformContractSummaryV1[];
```

- [ ] **Step 1: Add multi-binding validation tests**

构造同一 unit process 的两个 contract markers/evidence；断言 validator 返回两个 summary。变异 duplicate marker、missing marker、wrong actualOwner、undeclared contract、extra evidence、registeredOwners mismatch 均 fail closed。

- [ ] **Step 2: Confirm the failure**

Run: `npm test -- --identity cross-platform-ci-contract/platform-batch-result`

Expected before fix: `executeBinding` 只验证单 binding，遇到 batch result 会把其他 contract 视为 unexpected。

- [ ] **Step 3: Extract batch validator**

private result collector 保留多 owner/marker/evidence；orchestrator validation 改为先验证 global owner union，再按 `contractId` 分组 exact compare required assertion/evidence IDs，最后拒绝任何未消费条目。结果按 contract ID 排序。

- [ ] **Step 4: Verify**

```bash
npm test -- --identity cross-platform-ci-contract/platform-batch-result
npm test -- --identity cross-platform-ci-contract/synthetic-extension-protocol
npm run test:platform -- --self-test
npm run typecheck
npm run lint
npm run format:check
```

- [ ] **Step 5: Commit**

```bash
git add tools/ci/run-platform-contracts.mjs testkit/testing/platform-contract-setup.ts testkit/testing/platform-contract.ts test/unit/platform-batch-result.spec.ts testkit/runners/runner-registry.ts
git commit -m "refactor(ci): validate batched platform contract results"
```

### Task B1.4: Build once and batch platform Vitest processes

**Depends on:** B1.3

**Files:**

- Modify: `package.json`
- Modify: `testkit/runners/run-vitest-surface.ts`
- Modify: `tools/ci/run-platform-contracts.mjs`
- Modify: `.github/workflows/cross-platform-ci.yml`
- Modify: `test/unit/cross-platform-ci-contract.spec.ts`
- Create: `test/unit/platform-process-budget.spec.ts`
- Modify: `testkit/runners/runner-registry.ts`

**Interfaces/scripts:**

```json
"test:mcp:built": "tsx testkit/runners/mcp-runner.ts",
"test:mcp": "npm run build --silent && npm run test:mcp:built --",
"test:docs:built": "tsx testkit/docs/docs-smoke-runner.ts",
"test:docs": "npm run build --silent && npm run test:docs:built"
```

- [ ] **Step 1: Add process-budget regression**

注入 command runner spy，选择多个 unit 与 MCP bindings，断言：build invocation 0（platform command assumes built dist）、unit Vitest ≤1、MCP Vitest ≤1；identity argv 包含所有 applicable exact identities。workflow source 断言每 matrix cell 只有一个 `npm run build`，后续使用 `test:mcp:built`/`test:docs:built`。

- [ ] **Step 2: Confirm the failure**

Run: `npm test -- --identity cross-platform-ci-contract/platform-process-budget`

Expected before fix: `run-platform-contracts` 每 binding 启一个 subprocess；`test:mcp` 与 `test:docs` 重建 dist。

- [ ] **Step 3: Batch by surface and consume built scripts**

`run-platform-contracts` 过滤 applicable bindings 后按 surface 分成 unit/mcp 两组，各创建一个 result path 与 repeated `--identity` argv，运行一次 runner，再用 B1.3 validator 产生 summaries。CI build step 后：unit/golden 正常；MCP 用 `test:mcp:built -- --all`；docs 用 `test:docs:built`；platform 不触发 build。

- [ ] **Step 4: Verify and measure**

```bash
npm test -- --identity cross-platform-ci-contract/platform-process-budget
npm run build
npm run test:mcp:built -- --all
npm run test:docs:built
npm run test:platform
npm test -- --identity cross-platform-ci-contract/workflow-matrix-contract
npm run typecheck
npm run lint
npm run format:check
```

Expected: 每 cell production build 一次；platform start 最多一 unit + 一 MCP Vitest process；safe summary deep-exact。

- [ ] **Step 5: Commit**

```bash
git add package.json testkit/runners/run-vitest-surface.ts tools/ci/run-platform-contracts.mjs .github/workflows/cross-platform-ci.yml test/unit/cross-platform-ci-contract.spec.ts test/unit/platform-process-budget.spec.ts testkit/runners/runner-registry.ts
git commit -m "perf(ci): batch platform tests after one build"
```

### Task B3.1: Split CLI lightweight and application adapters

**Depends on:** A1

**Files:**

- Create: `src/cli/application-adapter.ts`
- Modify: `src/cli/execute.ts`
- Modify: `src/cli/main.ts`
- Modify: `test/unit/debug-cli-shell.spec.ts`
- Modify: `test/unit/public-beta-release-cli-closure.spec.ts`
- Modify: `testkit/fixtures/release-v2/cli-closure-v2.ts`

**Interfaces:**

```ts
export interface CliApplicationAdapter {
  executeLocate(
    command: Extract<CliCommand, { readonly kind: 'locate' }>,
    signal: AbortSignal,
  ): Promise<CliExecutionResult>;
  executeProbe(
    command: Extract<CliCommand, { readonly kind: 'probe' }>,
    signal: AbortSignal,
  ): Promise<CliExecutionResult>;
}
export interface CliExecutionDependencies {
  readonly loadApplicationAdapter: () => Promise<CliApplicationAdapter>;
}
```

Default loader is `() => import('./application-adapter.js').then(m => m.createCliApplicationAdapter())`。

- [ ] **Step 1: Add import-boundary tests**

help/version/usage tests 注入 `loadApplicationAdapter: vi.fn()` 并断言 never called。source/import graph 断言 `src/cli/execute.ts` 与 `main.ts` 不静态 import `create-application-context`、Nest、MCP、evidence engine、repository backends；heavy imports 只出现在 `application-adapter.ts`。

- [ ] **Step 2: Confirm the failure**

Run: `npm test -- --identity debug-cli-shell/debug-cli-shell`

Expected before fix: load abstraction 不存在，`execute.ts` 静态 import full application graph。

- [ ] **Step 3: Move heavy execution**

argument parsing、help、version、safe CLI errors 留在 lightweight `execute.ts`；locate/probe parse 成功后才 dynamic import adapter。adapter 内创建/close application context，并保留现有 error redaction 与 exit mapping。

- [ ] **Step 4: Verify**

```bash
npm test -- --identity debug-cli-shell/debug-cli-shell
npm test -- --identity public-beta-release/cli-runtime-closure
npm run build
node dist/cli/main.js --help
node dist/cli/main.js --version
npm run test:mcp:built -- --identity debug-cli-lifecycle/closed-stdin-bin
npm run typecheck
npm run lint
npm run format:check
```

- [ ] **Step 5: Commit**

```bash
git add src/cli/application-adapter.ts src/cli/execute.ts src/cli/main.ts test/unit/debug-cli-shell.spec.ts test/unit/public-beta-release-cli-closure.spec.ts testkit/fixtures/release-v2/cli-closure-v2.ts
git commit -m "perf(cli): lazy-load the application graph"
```

### Task B3.2: Concurrent ordered probe and cold-start benchmark

**Depends on:** B3.1

**Files:**

- Modify: `src/cli/application-adapter.ts`
- Modify: `test/unit/debug-cli-shell.spec.ts`
- Create: `tools/benchmark/cli-cold-start.mjs`
- Create: `test/unit/cli-cold-start-benchmark.spec.ts`
- Modify: `package.json`
- Modify: `testkit/runners/runner-registry.ts`

**Interfaces/script:** `"benchmark:cli-cold-start": "node tools/benchmark/cli-cold-start.mjs"`

- [ ] **Step 1: Add concurrency/order test**

两个 deferred backend probes 都必须在任一 resolve 前被调用；以反向 resolve 顺序结束，最终 JSON backends 仍按 registration order。

```ts
const pending = executeProbe();
await vi.waitFor(() => {
  expect(codegraphProbe).toHaveBeenCalledTimes(1);
  expect(ripgrepProbe).toHaveBeenCalledTimes(1);
});
ripgrepResolve(availableRg);
codegraphResolve(availableCg);
expect((await pending).backends.map((x) => x.backend)).toEqual([
  'codegraph',
  'ripgrep',
]);
```

- [ ] **Step 2: Confirm the failure**

Run: `npm test -- --identity debug-cli-probe/debug-cli-probe`

Expected before fix: 第二个 probe 在第一个 settle 后才开始。

- [ ] **Step 3: Implement `Promise.all` and benchmark report**

用 `Promise.all(backends.map(async (backend, index) => ...))` 并按 original index 组装。benchmark script build 后分别测 bare node、help、version 各 20 次，报告 median/p90；另用 child import/call 记录 `process.resourceUsage().maxRSS`，并记录 package dry-run packed/unpacked bytes。写入 `test-artifacts/benchmark/cli-cold-start-v1.json`；unit test 只验证 schema、finite positive samples、help/version application-loader count 0，不设置跨主机脆弱毫秒阈值。

- [ ] **Step 4: Verify**

```bash
npm test -- --identity debug-cli-probe/debug-cli-probe
npm test -- --identity debug-cli-shell/cli-cold-start-benchmark
npm run build
npm run benchmark:cli-cold-start
npm run test:docs:built
npm run typecheck
npm run lint
npm run format:check
```

- [ ] **Step 5: Commit**

```bash
git add src/cli/application-adapter.ts test/unit/debug-cli-shell.spec.ts tools/benchmark/cli-cold-start.mjs test/unit/cli-cold-start-benchmark.spec.ts package.json testkit/runners/runner-registry.ts
git commit -m "perf(cli): probe concurrently and measure fast paths"
```

### Task B2.1: Extend Prettier to test and testkit

**Depends on:** Phase A, B1.4, B3.2

**Files:**

- Modify: `package.json`
- Format: `test/**/*.{ts,json,md,mjs}`
- Format: `testkit/**/*.{ts,json,md,mjs,yaml,yml}`

- [ ] **Step 1: Prove the existing formatting gap**

Run: `npx prettier --check "test/**/*.{ts,json,md,mjs}" "testkit/**/*.{ts,json,md,mjs,yaml,yml}"`

Expected before fix: fail；2026-07-31 baseline 检出 142 个文件。

- [ ] **Step 2: Expand the project format command**

`format:check` 精确覆盖 `src`、`tools`、`scripts`、`test`、`testkit`、docs、root configs；继续尊重 `.prettierignore`，不格式化 benchmark repo contents 以外的 ignored artifacts。

- [ ] **Step 3: Apply formatting only**

Run: `npx prettier --write "test/**/*.{ts,json,md,mjs}" "testkit/**/*.{ts,json,md,mjs,yaml,yml}" package.json`

本 PR 不做语义编辑；review 使用 `git diff --word-diff=porcelain` 与 test pass 证明纯格式。

- [ ] **Step 4: Verify**

```bash
npm run format:check
npm run typecheck
npm test -- --all
npm run test:golden -- --all
npm run test:mcp:built -- --all
```

- [ ] **Step 5: Commit**

```bash
git add package.json test testkit
git commit -m "style(test): format test and testkit sources"
```

### Task B2.2: Add baseline typed ESLint for test and testkit

**Depends on:** B2.1

**Files:**

- Modify: `eslint.config.mjs`
- Create: `test/unit/quality-config.spec.ts`
- Modify: all test/testkit TypeScript files reported by the new baseline rules
- Modify: `testkit/runners/runner-registry.ts`

**Configuration:** remove whole-tree `test/**` and `testkit/**` ignores。新增 typed override for `test/**/*.ts` and `testkit/**/*.ts`，启用 `recommendedTypeChecked`、unused vars、unused disable directives；test-specific config 明确关闭 `no-explicit-any`、unsafe-*、unbound-method、no-non-null-assertion。`no-floating-promises` 与 `no-misused-promises` 本 PR 保持 off，交给 B2.3/B2.4。

- [ ] **Step 1: Add quality-config source assertions**

断言 ignores 不含 test/testkit；typed files glob 包含两者；promise 两条规则仍为 off；`reportUnusedDisableDirectives === 'error'`。

- [ ] **Step 2: Confirm the failure**

Run: `npm test -- --identity public-beta-release/quality-gates && npm run lint`

Expected before fix: quality-config assertion fails；新增 config 后 lint 暴露 finite baseline findings。

- [ ] **Step 3: Fix baseline findings without inline blanket disables**

修复 unused imports/vars、prefer-const、empty blocks、invalid regex/control chars、Node globals 与 type-only imports；test-specific永久例外只写在 ESLint override，不新增 file-wide disable comments。

- [ ] **Step 4: Verify**

```bash
npm run lint
npm test -- --identity public-beta-release/quality-gates
npm run typecheck
npm run format:check
npm test -- --all
```

- [ ] **Step 5: Commit**

```bash
git add eslint.config.mjs test testkit
git commit -m "chore(test): lint test and testkit sources"
```

### Task B2.3: Enable `no-floating-promises`

**Depends on:** B2.2

**Files:**

- Modify: `eslint.config.mjs`
- Modify: all `src`, `tools`, `test`, `testkit` files reported by `@typescript-eslint/no-floating-promises`
- Modify: `test/unit/quality-config.spec.ts`

- [ ] **Step 1: Turn the rule on and capture red output**

Set `@typescript-eslint/no-floating-promises: 'error'` for production and test typed overrides, then run `npm run lint` and save the finite file/line inventory in the PR description.

Expected: lint fails on intentionally detached promises, event callbacks and test observation promises.

- [ ] **Step 2: Fix every finding by ownership rule**

- awaited lifecycle work → `await`；
- deliberately detached work → `void promise.catch(recordFailure)`，不得裸 `void promise`；
- test settlement observers → `void runPromise.then(onFulfilled, onRejected)`；
- top-level runner calls → existing `main().catch(...)` 或 `try/await`。

- [ ] **Step 3: Add rule contract assertion**

```ts
expect(source).toContain("'@typescript-eslint/no-floating-promises': 'error'");
```

并新增一个 RuleTester/fixture case，证明裸 promise expression 被拒绝而 handled detached promise 通过。

- [ ] **Step 4: Verify**

```bash
npm run lint
npm run typecheck
npm test -- --all
npm run test:golden -- --all
npm run test:mcp:built -- --all
npm run format:check
```

- [ ] **Step 5: Commit**

```bash
git add eslint.config.mjs src tools test testkit
git commit -m "chore(lint): reject floating promises"
```

### Task B2.4: Enable `no-misused-promises`

**Depends on:** B2.3

**Files:**

- Modify: `eslint.config.mjs`
- Modify: all `src`, `tools`, `test`, `testkit` files reported by `@typescript-eslint/no-misused-promises`
- Modify: `test/unit/quality-config.spec.ts`

- [ ] **Step 1: Turn the rule on and confirm red**

Set `@typescript-eslint/no-misused-promises: ['error', { checksVoidReturn: true }]` in both typed overrides；run `npm run lint`。

Expected: async event listeners/callbacks used in void-return positions fail。

- [ ] **Step 2: Wrap async callbacks explicitly**

把 `emitter.on('event', async () => ...)` 改为同步 wrapper：

```ts
emitter.on('event', (...args) => {
  void handleEvent(...args).catch(recordFailure);
});
```

对 Vitest test bodies 保留 Promise-returning callback；只修真正 void-return APIs。禁止用 `checksVoidReturn: false` 规避迁移。

- [ ] **Step 3: Extend config contract**

断言 rule 为 error 且 `checksVoidReturn: true`；fixture 证明 async void callback 被拒绝、sync wrapper 通过。

- [ ] **Step 4: Verify**

```bash
npm run lint
npm run typecheck
npm run format:check
npm test -- --all
npm run test:golden -- --all
npm run test:mcp:built -- --all
npm run test:docs:built
npm run test:platform
```

- [ ] **Step 5: Commit**

```bash
git add eslint.config.mjs src tools test testkit
git commit -m "chore(lint): reject misused promises"
```

## Phase D — Verified-file consolidation

### Task D1: One verified-open implementation

**Depends on:** A5

**Files:**

- Modify: `src/repository/verified-file-snapshot-v2.ts`
- Modify: `src/repository/verified-text-file-source-v2.ts`
- Reduce to type re-export: `src/evidence/request-snapshot/canonical-file-identity-v2.ts`
- Modify: `src/evidence/request-snapshot/request-file-cache-v2.ts`
- Modify: `src/evidence/request-snapshot/final-snapshot-check-v2.ts`
- Modify: `src/evidence/request-snapshot/request-repository-snapshot-v2.ts`
- Modify: `src/evidence/request-snapshot/index.ts`
- Create: `test/unit/verified-file-snapshot-v2.spec.ts`
- Modify: repository safety/cache tests and runner registry

**Interfaces:**

```ts
export interface VerifiedFileReadV2 {
  readonly snapshot: VerifiedFileSnapshotV2;
  readonly bytes: Uint8Array;
}
export interface ReadVerifiedFileInputV2 {
  readonly repositoryRoot: string;
  readonly locator: string;
  readonly maxFileBytes: number;
  readonly signal: AbortSignal;
}
export async function readVerifiedFileV2(
  input: ReadVerifiedFileInputV2,
): Promise<VerifiedFileReadV2>;
```

- [ ] **Step 1: Add unified primitive tests**

alias 与 real locator 返回同 canonical key/identity/digest/bytes；N bytes pass、N+1 fail；result 不暴露 absolute resolved root/target；symlink/reparse escape、non-regular、binary/fatal UTF-8 tests 保持。

- [ ] **Step 2: Confirm the structural failure**

新增 source inventory 断言 `RequestFileCacheV2` 每首次 load 只调用 `readVerifiedFileV2`，且 `resolveCanonicalTargetV2` 无实现。当前因两套 resolve/open 路径而 fail。

- [ ] **Step 3: Implement exact operation order**

单次 primitive：validate relative locator→root realpath→target realpath→containment→read-only open→same-handle bigint stat→regular file→post-open realpath+containment+unchanged target→bounded N+1 read→SHA-256→close in finally。`VerifiedTextFileSourceV2` 只负责 NUL/binary、fatal UTF-8、newline normalization 与 line split。

cache 不再预先 `resolveCanonicalTargetV2`；首次 read 得到 alias→canonical binding。并发未知 aliases 若发生两次 open，只接受 identity+digest 相同并 collapse；mismatch fail closed。final check 复用同一 primitive。

- [ ] **Step 4: Verify**

```bash
npm test -- --identity request-snapshot-cache/verified-file-snapshot
npm test -- --identity request-snapshot-cache/request-file-cache-canonical-alias
npm test -- --group repository-safety
npm test -- --group cross-platform-baseline
npm run test:golden -- --group request-snapshot-cache
npm run test:mcp:built -- --all
npm run test:platform
npm run typecheck
npm run lint
npm run format:check
```

- [ ] **Step 5: Commit**

```bash
git add src/repository/verified-file-snapshot-v2.ts src/repository/verified-text-file-source-v2.ts src/evidence/request-snapshot/canonical-file-identity-v2.ts src/evidence/request-snapshot/request-file-cache-v2.ts src/evidence/request-snapshot/final-snapshot-check-v2.ts src/evidence/request-snapshot/request-repository-snapshot-v2.ts src/evidence/request-snapshot/index.ts test/unit/verified-file-snapshot-v2.spec.ts test/unit/request-snapshot-cache.spec.ts test/unit/final-snapshot-check.spec.ts test/unit/repository-safety.spec.ts testkit/runners/runner-registry.ts
git commit -m "refactor(repository): unify verified file open and snapshot reads"
```

### Task D2: Benchmark and select revalidation policy

**Depends on:** D1

**Files:**

- Create: `src/evidence/request-snapshot/snapshot-revalidation-policy-v2.ts`
- Create: `src/evidence/request-snapshot/selected-snapshot-revalidation-policy-v2.ts`
- Modify: `src/evidence/request-snapshot/final-snapshot-check-v2.ts`
- Modify: `src/evidence/request-snapshot/request-repository-snapshot-v2.ts`
- Modify: `tools/benchmark/real-repo-benchmark-runner.ts`
- Modify: `tools/benchmark/real-repo-benchmark-gate.mjs`
- Create: `testkit/baselines/performance/snapshot-revalidation-v1.json`
- Create: `test/unit/snapshot-revalidation-policy-v2.spec.ts`
- Modify: `test/unit/real-repo-benchmark-gate.spec.ts`
- Modify: `testkit/runners/runner-registry.ts`

**Interfaces:**

```ts
export type SnapshotRevalidationPolicyV2 =
  'all-loaded-digest' | 'retained-digest' | 'conditional-digest';
export function createSnapshotRevalidationPlanV2(
  policy: SnapshotRevalidationPolicyV2,
  input: SnapshotRevalidationPlanInputV2,
): SnapshotRevalidationPlanV2;
```

- [ ] **Step 1: Add correctness-floor tests**

所有 policy 对 retained public evidence 必须 digest；dirty/unknown 的 decision-relevant eligible files 在 conditional policy 也 digest；keys canonical-sorted/deduped；abort/unreadable required check purge。selected policy 下 restored-mtime retained mutation 必须 changed。

- [ ] **Step 2: Confirm missing policy/evidence**

Run: `npm test -- --identity request-snapshot-cache/snapshot-revalidation-policy`

Expected before fix: policy module/baseline missing；final check 固定 all-loaded behavior。

- [ ] **Step 3: Measure three policies and commit deterministic selection**

benchmark 每 policy warm-up 1 次、measured 5 次，记录 loaded/retained/eligible counts、metadata/digest counts、digest bytes、p50/p95。baseline JSON 包含 catalog digest、Node major、platform/arch informational fields、三 policy rows、correctness probes 和 selected policy。

选择规则：`retained-digest` 仅在不影响 decision-relevant completeness 且 p95 至少比 all-loaded 低 15% 时选；否则若 conditional 保留 retained unconditional digest 且 materially cheaper，选 `conditional-digest`；否则选 `all-loaded-digest`。把实际结果写成 `SELECTED_SNAPSHOT_REVALIDATION_POLICY_V2` 常量，运行时不按主机速度自选。

- [ ] **Step 4: Verify**

```bash
npm test -- --identity request-snapshot-cache/snapshot-revalidation-policy
npm run benchmark:real-repos
node tools/benchmark/real-repo-benchmark-gate.mjs
npm run test:golden -- --group request-snapshot-cache
npm run test:platform
npm run typecheck
npm run lint
npm run format:check
```

- [ ] **Step 5: Commit**

```bash
git add src/evidence/request-snapshot/snapshot-revalidation-policy-v2.ts src/evidence/request-snapshot/selected-snapshot-revalidation-policy-v2.ts src/evidence/request-snapshot/final-snapshot-check-v2.ts src/evidence/request-snapshot/request-repository-snapshot-v2.ts tools/benchmark/real-repo-benchmark-runner.ts tools/benchmark/real-repo-benchmark-gate.mjs testkit/baselines/performance/snapshot-revalidation-v1.json test/unit/snapshot-revalidation-policy-v2.spec.ts test/unit/real-repo-benchmark-gate.spec.ts testkit/runners/runner-registry.ts
git commit -m "perf(snapshot): select digest revalidation policy from benchmarks"
```

## Phase C — Canonical v2 authority and breaking cutover

### Task C1.1: Characterize all public decision families

**Depends on:** A3

**Files:**

- Create: `test/unit/locate-execution-characterization-v2.spec.ts`
- Create: `testkit/fixtures/locate-execution-v2/characterization-matrix-v2.ts`
- Create: `testkit/fixtures/locate-execution-v2/authority-inventory-v2.ts`
- Modify: `test/unit/canonical-locate-execution.spec.ts`
- Modify: `test/unit/request-outcome-aggregator-v2.spec.ts`
- Modify: `test/golden/codegraph-fallback.spec.ts`
- Modify: `testkit/runners/runner-registry.ts`

- [ ] **Step 1: Encode a deep-exact matrix**

覆盖 complete hit/no-hit、CodeGraph unavailable/incomplete fallback、verified primary skip、both unavailable、output limit、caller/deadline abort、snapshot mutation、unsupported language、location redaction、safe errors、evidence IDs 与 backend ordering。

- [ ] **Step 2: Prove mutation sensitivity**

对 fixture clone 依次反转 backend order、改变 strategyComplete、给 caller abort 加 TIMEOUT_REACHED、保留 changed evidence、插入 extra schema field；每个 mutated fixture 必须被 evaluator/deep assertion 拒绝。原 production observation 应 pass。

- [ ] **Step 3: Add authority inventory**

记录当前并行 authorities：schema-1.0 result、fact envelope、backend trace、request outcome、projection registries；该 inventory 作为后续 source-removal assertions 的基线，不改变 production。

- [ ] **Step 4: Verify**

```bash
npm test -- --identity input-abort-contract-v2/locate-execution-characterization
npm test -- --identity input-abort-contract-v2/status-priority
npm test -- --identity input-abort-contract-v2/strategy-completeness
npm run test:golden -- --group final-status
npm run test:golden -- --group codegraph-fallback
npm run test:mcp:built -- --all
npm run typecheck
npm run lint
npm run format:check
```

- [ ] **Step 5: Commit**

```bash
git add test/unit/locate-execution-characterization-v2.spec.ts testkit/fixtures/locate-execution-v2/characterization-matrix-v2.ts testkit/fixtures/locate-execution-v2/authority-inventory-v2.ts test/unit/canonical-locate-execution.spec.ts test/unit/request-outcome-aggregator-v2.spec.ts test/golden/codegraph-fallback.spec.ts testkit/runners/runner-registry.ts
git commit -m "test(execution): characterize canonical v2 locate decisions"
```

### Task C1.2: Introduce immutable canonical execution facts

**Depends on:** C1.1

**Files:**

- Create: `src/contracts/v2/locate-execution-facts-v2.ts`
- Create: `src/evidence/locate-execution/locate-execution-facts-builder-v2.ts`
- Modify: `src/contracts/v2/locate-fact-envelope-v2.ts`
- Modify: `src/evidence/abort-source.ts`
- Modify: backend/snapshot/ranking/scope/capability builders and mounts
- Modify: `src/evidence/locate-execution/canonical-locate-executor-v2.ts`
- Create: `test/unit/locate-execution-facts-v2.spec.ts`
- Modify: `testkit/runners/runner-registry.ts`

**Interfaces:**

```ts
export interface OutcomeContributionFactsV2 {
  readonly limitsReached: CoverageReportV2['limitsReached'];
  readonly degradations: CoverageReportV2['degradations'];
  readonly exclusionSummary: CoverageReportV2['exclusionSummary'];
}
export interface ScopeFactsV2 {
  readonly coverage: CoverageReportV2['scope'];
  readonly contribution: OutcomeContributionFactsV2;
}
export interface CapabilityFactsV2 {
  readonly coverage: CoverageReportV2['capabilities'];
  readonly contribution: OutcomeContributionFactsV2;
}
export interface LocateExecutionFactsV2 {
  readonly backend: BackendExecutionTraceViewV2;
  readonly snapshot: SnapshotFactsV2;
  readonly ranking: RankedEvidenceFactsV2;
  readonly scope: ScopeFactsV2;
  readonly capability: CapabilityFactsV2;
  readonly abort: FinalizedAbortDecisionV2;
}
```

`FinalizedAbortDecisionV2` 改为 frozen ordinary value `{ readonly source: 'none'|'caller'|'deadline' }`；first-writer/coordinator close invariants 仍由 coordinator 保证。

- [ ] **Step 1: Add immutability/completeness tests**

断言 deep freeze、source arrays mutation 不影响 facts、每 family exactly once、missing/duplicate family fail。model source 禁止 `LocateResult`、status、strategyComplete、nextActions、fallbackChecked、schemaVersion 与 projection registry imports。

- [ ] **Step 2: Confirm the failure**

Run: `npm test -- --identity input-abort-contract-v2/locate-execution-facts`

Expected before fix: model/builder missing；abort decision 仍是 WeakMap token。

- [ ] **Step 3: Build facts in shadow**

各 subsystem 在其 trusted proof/mount 被验证后贡献一次 plain readonly facts；aggregate builder clone/freeze arrays，输出 exact six-field object。canonical executor 暂时继续旧 authority，但在同 request shadow 构建 facts 供 C1.3 parity 使用。

- [ ] **Step 4: Verify**

```bash
npm test -- --identity input-abort-contract-v2/locate-execution-facts
npm test -- --identity streaming-ripgrep/backend-trace-closure
npm test -- --identity request-snapshot-cache/snapshot-trust-finalizer
npm test -- --identity language-capability-boundary/stable-eligible-count
npm run typecheck
npm run lint
npm run format:check
```

- [ ] **Step 5: Commit**

```bash
git add src/contracts/v2/locate-execution-facts-v2.ts src/evidence/locate-execution/locate-execution-facts-builder-v2.ts src/contracts/v2/locate-fact-envelope-v2.ts src/evidence/abort-source.ts src/evidence/locate-execution/canonical-locate-executor-v2.ts src/evidence/request-snapshot src/evidence/ranking src/evidence/scope src/evidence/language test/unit/locate-execution-facts-v2.spec.ts testkit/runners/runner-registry.ts
git commit -m "feat(execution): add immutable v2 locate execution facts"
```

### Task C1.3: Add one pure v2 finalizer in shadow

**Depends on:** C1.2

**Files:**

- Create: `src/evidence/locate-execution/finalize-locate-result-v2.ts`
- Modify: `src/evidence/public-output/public-result-assembler-v2.ts`
- Modify: `src/evidence/public-output/materialized-evidence-core-v2.ts`
- Modify: `src/evidence/request-outcome/locate-status-v2.ts`
- Modify: `src/evidence/request-outcome/next-action-policy-v2.ts`
- Create: `test/unit/pure-locate-result-finalizer-v2.spec.ts`
- Create: `testkit/fixtures/locate-execution-v2/finalizer-matrix-v2.ts`
- Modify: `src/evidence/locate-execution/canonical-locate-executor-v2.ts`
- Modify: `testkit/runners/runner-registry.ts`

**Interfaces:**

```ts
export interface FinalizeLocateResultInputV2 {
  readonly normalizedTerms: readonly PublicSearchTermV2[];
  readonly resolvedLimits: ResolvedLocateLimits;
  readonly facts: LocateExecutionFactsV2;
}
export function finalizeLocateResultV2(
  input: FinalizeLocateResultInputV2,
): LocateResultV2;
```

- [ ] **Step 1: Add pure finalizer matrix**

相同 facts repeated calls deep-equal；input unchanged；module 无 async/fs/child_process/Nest/registry/`requireTrusted*` imports；完整 no-hit→no_result；caller→cancelled；deadline→timeout；snapshot mutation precedence；LOCATION_REDACTED dedupe；IDs/codes canonical order；strict schema pass。

- [ ] **Step 2: Confirm the failure**

Run: `npm test -- --identity input-abort-contract-v2/pure-locate-result-finalizer`

Expected before fix: finalizer missing；status/coverage/nextActions 分散在 executor/aggregator/composer。

- [ ] **Step 3: Implement one derivation point and shadow parity**

finalizer 从 backend ordered outcomes 推导 attempts/index/fallback/strategyComplete，合并四 subsystem contributions，materialize evidence/IDs，derive status 和 nextActions，canonicalize coverage，最后构造唯一 `schemaVersion:'2.0'` result。executor shadow 路径把结果与 C1.1 current output deep-exact 比较；parity mismatch 固定 fail closed in tests，不切 production transport。

- [ ] **Step 4: Verify**

```bash
npm test -- --identity input-abort-contract-v2/pure-locate-result-finalizer
npm test -- --identity input-abort-contract-v2/locate-execution-characterization
npm test -- --identity public-output-v2/derived-status
npm run test:golden -- --group final-status
npm run test:mcp:built -- --all
npm run typecheck
npm run lint
npm run format:check
```

- [ ] **Step 5: Commit**

```bash
git add src/evidence/locate-execution/finalize-locate-result-v2.ts src/evidence/public-output/public-result-assembler-v2.ts src/evidence/public-output/materialized-evidence-core-v2.ts src/evidence/request-outcome/locate-status-v2.ts src/evidence/request-outcome/next-action-policy-v2.ts test/unit/pure-locate-result-finalizer-v2.spec.ts testkit/fixtures/locate-execution-v2/finalizer-matrix-v2.ts src/evidence/locate-execution/canonical-locate-executor-v2.ts testkit/runners/runner-registry.ts
git commit -m "feat(output): add pure v2 locate result finalizer"
```

### Task C2.1: Cut production authority over to canonical facts

**Depends on:** C1.3

**Files:**

- Modify: `src/contracts/v2/locate-fact-envelope-v2.ts`
- Modify: `src/evidence/locate-execution/canonical-locate-executor-v2.ts`
- Modify: `src/evidence/locate-execution/v2-locate-result-projector.ts`
- Modify: `src/evidence/locate-execution/public-locate-execution-application-v2.ts`
- Modify: `src/evidence/evidence.module.ts`
- Modify: `testkit/testing/create-canonical-locate-engine-harness-v2.ts`
- Create: `test/unit/canonical-facts-authority-cutover-v2.spec.ts`
- Modify: canonical/DI/cutover tests and runner registry

**Interfaces:**

```ts
export type CanonicalLocateExecutionV2 =
  | Readonly<{
      ok: true;
      normalizedTerms: readonly PublicSearchTermV2[];
      resolvedLimits: ResolvedLocateLimits;
      facts: LocateExecutionFactsV2;
    }>
  | Readonly<{ ok: false; error: UnsafeToolErrorFactsV2 }>;
```

- [ ] **Step 1: Add source and call-count failures**

production executor source 禁止 `schemaVersion:'1.0'`、`type LocateResult`、`registerProductionAcceptedProjectionSeamsV2`、precomputed `createNextActions/evaluateLocateStatus`；spy 断言成功 request 调用 finalizer exactly once，backend/reader 仍 single execution。

- [ ] **Step 2: Confirm the failure**

Run: `npm test -- --identity canonical-locate-bridge/canonical-facts-authority-cutover`

Expected before fix: executor success ABI 仍是 envelope，旧 projection orchestrator 可达。

- [ ] **Step 3: Switch success ABI and production projector**

canonical executor 输出 normalizedTerms+limits+facts；projector success 只调用 `finalizeLocateResultV2`，再进入现有 schema/budget/transport seam。EvidenceModule 不再注册 accepted-complete shadow orchestrator 为 production provider。invalid ingress safe-error path 保持。

- [ ] **Step 4: Verify**

```bash
npm test -- --identity canonical-locate-bridge/canonical-facts-authority-cutover
npm test -- --identity canonical-locate-bridge/canonical-single-execution
npm test -- --identity language-capability-boundary/canonical-di-wiring
npm test -- --identity public-beta-release/projector-cutover
npm run test:golden -- --all
npm run test:mcp:built -- --all
npm run test:docs:built
npm run build
npm run typecheck
npm run lint
npm run format:check
```

- [ ] **Step 5: Commit**

```bash
git add src/contracts/v2/locate-fact-envelope-v2.ts src/evidence/locate-execution/canonical-locate-executor-v2.ts src/evidence/locate-execution/v2-locate-result-projector.ts src/evidence/locate-execution/public-locate-execution-application-v2.ts src/evidence/evidence.module.ts testkit/testing/create-canonical-locate-engine-harness-v2.ts test/unit/canonical-facts-authority-cutover-v2.spec.ts test/unit/canonical-locate-execution.spec.ts test/unit/public-beta-release-cutover.spec.ts test/unit/di.spec.ts testkit/runners/runner-registry.ts
git commit -m "refactor(execution): make v2 facts the canonical locate authority"
```

### Task C2.2: Delete internal schema-1.0 decision paths

**Depends on:** C2.1

**Files:**

- Modify: `src/evidence/locate-execution/canonical-locate-executor-v2.ts`
- Modify: `src/evidence/request-snapshot/index.ts`
- Modify: `src/evidence/candidate-policy/apply-candidate-policy.ts`
- Delete: `src/evidence/request-snapshot/executor-snapshot-bridge-v2.ts`
- Delete: `src/evidence/request-snapshot/legacy-scope-policy-pool-v1.ts`
- Delete: `src/evidence/request-snapshot/legacy-candidate-reservation-v1.ts`
- Delete: `src/evidence/locate-status-evaluator.ts`
- Delete: `src/evidence/next-action-policy.ts`
- Delete: `src/evidence/locate-execution/register-production-accepted-projection-seams-v2.ts`
- Create: `test/unit/no-internal-schema-v1-authority.spec.ts`
- Modify: affected snapshot/candidate/canonical tests and runner registry

- [ ] **Step 1: Add recursive source inventory**

在 `src/evidence/locate-execution`、request-snapshot decision modules 与 candidate selection 中要求零实例：`schemaVersion:'1.0'`、`LocateResult`、`LegacyCandidateReservationV1`、`selectAndFreezeLegacyBackendHitsV1`、`buildPreRankingPoolInputsFromLegacyEvidenceV2`、`purgeLegacyEvidenceByChangedKeysV2`、`applyMutationStatusPrecedenceV2`、旧 `evaluateLocateStatus/createNextActions` imports。

- [ ] **Step 2: Confirm the failure**

Run: `npm test -- --identity canonical-locate-bridge/no-internal-schema-v1-authority`

Expected before fix: inventory 列出 executor 与 bridge 中的 schema-1.0 construction/legacy selectors。

- [ ] **Step 3: Replace legacy selection/materialization directly with v2 facts**

expanded selection 始终 authoritative；candidate policy 直接处理 v2 records；pre-ranking/snapshot purge 使用 `UnsafeEvidenceDraftV2`/stable records；timeout/backend-unavailable/normal branch 都直接填 facts，不先造 public-shaped v1 result。保留 `repo-scope-v1` policy version 名称，因为它不是 locate schema v1 authority。

- [ ] **Step 4: Verify**

```bash
npm test -- --identity canonical-locate-bridge/no-internal-schema-v1-authority
npm test -- --identity streaming-ripgrep/eligibility-gate
npm test -- --identity request-snapshot-cache/pre-ranking-stable-pool
npm test -- --identity request-snapshot-cache/snapshot-v1-mutation-precedence
npm run test:golden -- --all
npm run test:mcp:built -- --all
npm run build
npm run typecheck
npm run lint
npm run format:check
```

- [ ] **Step 5: Commit**

```bash
git add -A src/evidence test/unit testkit/runners/runner-registry.ts
git commit -m "refactor(execution): remove internal schema v1 decision paths"
```

### Task C3.1: Flatten projection and materialization stages

**Depends on:** C2.2

**Files:**

- Modify: `src/evidence/locate-execution/v2-locate-result-projector.ts`
- Modify: `src/evidence/evidence.module.ts`
- Modify: `src/evidence/public-output/materialized-evidence-core-v2.ts`
- Modify: `src/evidence/request-outcome/request-outcome-aggregator-v2.ts`
- Delete: `src/evidence/canonical/accepted-complete-real-locate-shadow-orchestrator-v2.ts`
- Delete: `src/evidence/canonical/canonical-locate-shadow-harness-v2.ts`
- Delete: `src/evidence/canonical/locate-projection-preparation-port-v2.ts`
- Delete: `src/evidence/canonical/locate-projection-stage-registrar-v2.ts`
- Delete: `src/evidence/canonical/materialized-locate-result-composer-v2.ts`
- Delete: `src/evidence/canonical/required-owner-finalizer-v2.ts`
- Delete: `src/evidence/public-output/f2-locate-projection-stages-v2.ts`
- Delete listed canonical-shadow testkit helpers/fixtures
- Create: `test/unit/flat-locate-projection-v2.spec.ts`
- Modify: public-output/scope/ranking/request-outcome/DI/Golden tests and runner registry

**Interfaces:**

```ts
export interface MaterializedLocateEvidenceV2 {
  readonly confirmed: readonly ConfirmedEvidenceV2[];
  readonly candidates: readonly CandidateEvidenceV2[];
}
export function materializeLocateEvidenceV2(
  facts: LocateExecutionFactsV2,
): MaterializedLocateEvidenceV2;
```

- [ ] **Step 1: Add registry-removal inventory and exact-once test**

production source 禁止 `sourceRegistry`、`materializationRegistry`、`aggregationRegistry`、`aggregationBundleByExecution`、`sourcePayloadByToken`、`coreByMaterialization` 与 `TrustedLocateProjection*` types。successful request exactly once：facts build、materialize、finalize、schema validate、serialize。

- [ ] **Step 2: Confirm the failure**

Run: `npm test -- --identity canonical-locate-bridge/flat-locate-projection`

Expected before fix: inventory 命中所有多阶段 WeakMaps/tokens。

- [ ] **Step 3: Replace stage chain with explicit readonly values**

projector 从 canonical facts 直接调用 pure materializer/finalizer；request-outcome aggregator 若保留，只接受 plain facts/contributions，不接受 materialization/projection tokens。删除 source→materialization→aggregation→owner-finalization orchestration和对应 testkit shadow machinery。backend execution、snapshot proof、capability issuance 的真实 trust registries 保留在事实进入 builder 前。

- [ ] **Step 4: Verify**

```bash
npm test -- --identity canonical-locate-bridge/flat-locate-projection
npm test -- --identity input-abort-contract-v2/locate-execution-characterization
npm test -- --identity input-abort-contract-v2/contribution-trust
npm test -- --identity request-snapshot-cache/snapshot-trust-finalizer
npm run test:golden -- --all
npm run test:mcp:built -- --all
npm run build
npm run typecheck
npm run lint
npm run format:check
```

- [ ] **Step 5: Commit**

```bash
git add -A src/evidence test testkit
git commit -m "refactor(output): flatten canonical locate projection stages"
```

### Task C3.2: Flatten serialization and transport registries

**Depends on:** C3.1

**Files:**

- Create: `src/evidence/canonical/locate-result-serialization-v2.ts`
- Modify: `src/evidence/locate-execution/v2-locate-result-projector.ts`
- Modify: `src/evidence/locate-execution/public-locate-execution-application-v2.ts`
- Modify: `src/evidence/locate-execution/locate-projection-execution-capability-v2.ts`
- Modify: `src/mcp/locate-tool-output.ts`
- Delete: `src/evidence/canonical/trusted-serialized-locate-result-v2.ts`
- Delete: `src/evidence/locate-execution/public-locate-transport-registry-v2.ts`
- Create: `test/unit/flat-locate-transport-v2.spec.ts`
- Modify: safe-error/transport/MCP parity tests and runner registry

**Interfaces:**

```ts
export interface SerializedLocateResultV2 {
  readonly value: LocateResultV2;
  readonly compactJson: string;
  readonly utf8Bytes: number;
}
export function validateAndSerializeLocateResultV2(
  value: LocateResultV2,
): SerializedLocateResultV2;
export function createSerializedPublicToolErrorV2(
  code: RepoNavToolErrorV2['code'],
  suggestedAction?: 'ADD_TERM',
): SerializedLocateResultV2;
```

- [ ] **Step 1: Add identity-independence and inventory tests**

cloned deep-equal result 可成功 serialize；same value→same JSON/bytes；`utf8Bytes` 精确；new module 无 WeakMap。source inventory 要求零 `receiptRegistry/valueToReceipt/schemaRegistry/serializedRegistry`。

- [ ] **Step 2: Confirm the failure**

Run: `npm test -- --identity canonical-locate-bridge/flat-locate-transport`

Expected before fix: serialization/transport 依赖 object identity receipts。

- [ ] **Step 3: Return plain immutable serialized values**

strict Zod parse→public budget guard→compact JSON→byte count；PublicLocateExecutionApplicationV2 直接返回 `Promise<SerializedLocateResultV2>`。capability 仅绑定 canonical execution ownership，不再用于运输普通 value/json/bytes。safe error 仍只允许四 codes，ADD_TERM 只配 INVALID_INPUT。

- [ ] **Step 4: Verify**

```bash
npm test -- --identity canonical-locate-bridge/flat-locate-transport
npm test -- --identity canonical-locate-bridge/canonical-safe-error-serialization
npm run test:mcp:built -- --all
npm run test:docs:built
npm run build
npm run typecheck
npm run lint
npm run format:check
```

- [ ] **Step 5: Commit**

```bash
git add -A src/evidence/canonical src/evidence/locate-execution src/mcp test testkit/runners/runner-registry.ts
git commit -m "refactor(transport): replace locate registries with readonly values"
```

### Task C4: Remove the public `repo-nav/legacy-v1` subpath

**Depends on:** C2.2; may run in parallel with C3.1/C3.2

**Files:**

- Delete: `src/legacy-v1.ts`
- Modify: `package.json`
- Modify: `src/contracts/index.ts`
- Modify: `src/contracts/evidence.ts`
- Delete: `src/contracts/public-errors.ts`
- Modify: `src/evidence/evidence-redactor.ts`
- Create: `tools/release/check-legacy-subpath-absence.mjs`
- Create: `testkit/fixtures/release-v2/legacy-subpath-negative-v2.ts`
- Modify: `testkit/fixtures/release-v2/package-api-snapshot-v2.ts`
- Modify: `testkit/fixtures/release-v2/migration-v2.ts`
- Modify: package/install/docs tests and release manifests
- Modify: `docs/migration-v1-to-v2.md`, `README.md`, `docs/getting-started-mcp.md`

**Package exports:** exactly `.`, `./package.json`。

- [ ] **Step 1: Add installed runtime and NodeNext negative tests**

pack/install 到 fresh consumer；root ESM import success；`import('repo-nav/legacy-v1')` 必须 nonzero 且 code `ERR_PACKAGE_PATH_NOT_EXPORTED`。NodeNext positive root type import pass；negative legacy import fail TS2307 且 diagnostic 包含 subpath。

- [ ] **Step 2: Confirm the failure**

```bash
npm test -- --identity public-beta-release/package-api
node tools/release/check-legacy-subpath-absence.mjs
```

Expected before fix: export 存在，runtime/type import 成功。

- [ ] **Step 3: Delete export and unused schema-1.0 surface**

删除 `./legacy-v1` export/source；从 `contracts/evidence.ts` 删除 `EvidencePackSchema/LocateResultSchema/LocateToolOutputSchema` 及 types；删除已无 importer 的 `public-errors.ts`；从 evidence-redactor 删除 `redactLocateResult`，保留 `redactPublicText` 与 field helpers。clean build 确保 dist 无 legacy-v1 emit。

migration docs 明确：2.0.0 删除 subpath；root replacements；schema 1.0 不可 negotiation；需要 v1 的消费者停留 pre-2.0。此 PR 安装命令仍为 `@1.0.6`，版本只在 C5 改。

- [ ] **Step 4: Verify**

```bash
npm test -- --identity public-beta-release/package-api
npm test -- --identity public-beta-release/installed-legacy-subpath-negative
npm test -- --identity public-beta-release/migration-document
npm run build
node tools/release/check-legacy-subpath-absence.mjs
npm run package:emit:check
npm run package:dry-run
npm run package:smoke
npm run package:closure:check
npm run test:docs:built
npm run typecheck
npm run lint
npm run format:check
```

- [ ] **Step 5: Commit**

```bash
git add -A package.json src tools/release/check-legacy-subpath-absence.mjs test docs README.md testkit
git commit -m "feat(package): remove the legacy v1 export"
```

### Task C5: Exact `2.0.0` release-candidate cutover

**Depends on:** C3.2 and C4; execute after B2.4 quality stack is merged

**Files:**

- Modify: `package.json`
- Regenerate: `npm-shrinkwrap.json`
- Modify: `testkit/fixtures/release-v2/version-sources-v2.ts`
- Modify: `testkit/fixtures/release-v2/dependency-closure-v2.ts`
- Modify: `testkit/fixtures/release-v2/security-metadata-v2.ts`
- Modify: `testkit/fixtures/release-v2/migration-v2.ts`
- Modify: package metadata/lock/pack/SBOM tools
- Modify: release metadata/security/package/readiness tests
- Modify: `README.md`, `SECURITY.md`, `docs/getting-started-mcp.md`, `docs/migration-v1-to-v2.md`, `docs/debug-cli.md`, `docs/reference/repo-nav-locate.md`
- Modify: `testkit/docs/docs-smoke-runner.ts`
- Modify: release manifests

**Exact constants:**

```ts
export const EXPECTED_PACKAGE_VERSION_V2 = '2.0.0' as const;
export const EXPECTED_SBOM_ROOT_PURL_V2 = 'pkg:npm/repo-nav@2.0.0' as const;
```

- [ ] **Step 1: Make the release assertion non-tautological**

先把 fixture expected version/purl 改为 literal 2.0.0，新增 assertions：package.json、shrinkwrap root 与 packages['']、runtime metadata、CLI `--version`、tarball filename、installed package.json、SBOM root/component version、docs install、SECURITY support line。

- [ ] **Step 2: Confirm all expected red failures**

```bash
npm test -- --identity public-beta-release/version-sources
npm test -- --identity public-beta-release/package-metadata
npm test -- --identity public-beta-release/installed-sbom
npm test -- --identity public-beta-release/security-document
```

Expected before bump: actual 1.0.6 与 expected 2.0.0 mismatch；docs/security 仍为 1.x。

- [ ] **Step 3: Bump with pinned npm and update release policy**

Run: `node node_modules/npm/bin/npm-cli.js version 2.0.0 --no-git-tag-version`

确认 `package.json.version`、`npm-shrinkwrap.json.version`、`packages[''].version` 全为 2.0.0。所有 maintained docs 安装命令改为 `npm i -g repo-nav@2.0.0`；SECURITY 支持 `2.0.x` 并标记 `<2.0.0` unsupported；docs smoke client version 改为 2.0.0。migration 中 legacy path 只作为 removed historical path 出现。

release tools 独立验证 exact values，不从 package object 生成 expected。SBOM root 必须 `pkg:npm/repo-nav@2.0.0`。不 publish、不 tag。

- [ ] **Step 4: Run final release-candidate verification**

```bash
npm run build
npm run typecheck
npm run lint
npm run format:check
npm test -- --all
npm run test:golden -- --all
npm run test:mcp:built -- --all
npm run test:docs:built
npm run test:platform
npm run test:integration:codegraph
npm run package:metadata:check
npm run package:lock:check
npm run package:emit:check
npm run package:dry-run
npm run package:smoke
npm run package:closure:check
npm run security:audit
npm run security:sbom:check
npm run benchmark:real-repos
npm run benchmark:cli-cold-start
```

Then run `npm run release:owner-actions:check`; expected result is pass only when owner-provided evidence exists, otherwise documented owner-block exit without altering source candidate readiness.

- [ ] **Step 5: Commit**

```bash
git add package.json npm-shrinkwrap.json README.md SECURITY.md docs test tools testkit
git commit -m "chore(release): prepare the 2.0.0 cutover"
```

## Phase/aggregate verification checkpoints

### After Phase A

```bash
npm run build
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:golden -- --all
npm run test:mcp -- --all
npm run test:docs
npm run test:integration:codegraph
npm run package:smoke
npm run package:closure:check
npm run security:audit
npm run security:sbom:check
```

Acceptance: closed stdin is not cancellation；CodeGraph unavailable + complete Ripgrep no-hit is complete no_result with both attempts；non-ENOENT spawn is backend error；restored-mtime mutation purges evidence；plain unit is ARM/CodeGraph hermetic；installed audit has no undisposed moderate+。

### After Phase B

```bash
npm run build
npm run typecheck
npm run lint
npm run format:check
npm test -- --all
npm run test:golden -- --all
npm run test:mcp:built -- --all
npm run test:docs:built
npm run test:platform
npm run benchmark:cli-cold-start
```

Acceptance: one build/cell；≤1 unit and ≤1 MCP platform Vitest process；exact identities without cross product；test/testkit formatted/linted；promise rules enabled；help/version do not load app graph；probe concurrent but ordered。

### After Phase C + D final join

除 C5 全量命令外，再执行：

```bash
node tools/release/check-legacy-subpath-absence.mjs
node tools/benchmark/real-repo-benchmark-gate.mjs
rg -n "schemaVersion: ['\"]1\.0|type LocateResult|LegacyCandidateReservationV1|sourceRegistry|materializationRegistry|aggregationRegistry|receiptRegistry|serializedRegistry" src/evidence src/contracts/v2
```

Expected grep: no internal schema-1.0 authority or ordinary projection/transport registries；CLI probe schema `1.0` 与明确历史 docs 不在该 restricted search target/decision patterns 中。

## Independent review gates

每个 PR 实现与本地验证完成后：

1. 运行 `superpowers:requesting-code-review` 或等价 independent reviewer。
2. 对 bug finding 先用 `superpowers:receiving-code-review` 技术核验，再修改。
3. reviewer 必须检查：public schema drift、path/process safety regression、hidden fallback booleans、raw spawn error leakage、digest/identity handle binding、runner cross-product、unmeasured release attestations、版本 fixture tautology。
4. review 修复后重新运行该 PR 的 focused + affected + static gates，记录命令与 exit code。

## Rollback boundaries

- 停在 A7：可形成 1.x corrective hardening release，不包含 breaking export removal。
- 停在 C1.3：facts/finalizer 仅 shadow，production authority 未切换。
- 停在 C2.2：内部仅 v2 authority，public legacy export 仍可用。
- 停在 C3.2：架构已压平，但 package major 尚未变化。
- C4 单独回滚即可恢复 legacy subpath；不与版本 bump 混合。
- C5 只包含 version/docs/shrinkwrap/package/SBOM evidence；不包含架构重构，也不执行发布。

## Completion definition

计划完成必须同时满足：

- Phase A/B/C/D acceptance 全部通过；
- public v2 fixtures 除已批准的错误 status/coverage 修正外 deep-exact；
- installed package root import/bin/MCP pass，legacy subpath runtime 与 NodeNext type import 均明确失败；
- package/shrinkwrap/runtime/CLI/tarball/installed/SBOM version 全为独立验证的 `2.0.0`；
- build、typecheck、lint、format、unit、Golden、MCP、docs、platform、CodeGraph integration、package smoke、closure、audit、SBOM、real-repo benchmark、CLI benchmark 全通过；
- read-only operations 不改变 target repository worktree、branch、HEAD 或 index；
- 工作树只包含计划内提交，无 publish/tag/push 副作用。
