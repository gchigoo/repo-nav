# RepoNav 后续开发重规划（2026-08-12）

> **执行状态（2026-08-15）：** `1.1.0` hardening checkpoint 已通过 [PR #2](https://github.com/gchigoo/repo-nav/pull/2) 合入 `main`，merge commit 为 `3da72f8c38c11eeab9b5480d5d6435efa72a3f53`。原集成分支、其他无用分支和集成 worktree 已清理。当前剩余主线只有 `S2`、`C2`、`C3`、`C4` 与原子 `V2` cutover。项目现状摘要见 [`../../project-status.md`](../../project-status.md)。

## 目标

以 `1.1.0` 为 1.x 基线形成可审查、可回滚、通过完整门禁的 hardening checkpoint，再完成 canonical v2 authority 与 snapshot policy，最后在一个原子变更中切换到 `2.0.0` 并仅移除 `repo-nav/legacy-v1`。第一个 checkpoint 已完成并合入；当前计划从 `S2` 与 `C2` 继续。

本计划本身不授权 publish、tag、release 或其他远端写入。此前 integration push、PR 与 merge 均在单独授权后完成；后续远端或发布动作仍需单独明确授权。

## 当前执行边界

| 阶段    | 状态   | 当前事实                                                                                                  |
| ------- | ------ | --------------------------------------------------------------------------------------------------------- |
| `R0–R1` | 完成   | 已吸收 `1.1.0` 上游基线并冻结 root/subpath/version authority。                                            |
| `H1–H6` | 完成   | Real-consumer、backend trace、spawn classification、verified snapshot、hermetic CI、SDK/audit 已合入。    |
| `T1–T2` | 完成   | Exact identity registry 与 batched platform execution 已合入。                                            |
| `F1–F2` | 完成   | CLI lazy application adapter、并发有序 probe 与 cold-start benchmark 已合入。                             |
| `S1`    | 完成   | Candidate benchmark、authoritative CI job 与 provenance artifact 生成已合入。                             |
| `S2`    | 阻塞   | 尚未导入并验证 authoritative artifact，也没有 committed selected policy constant。                        |
| `C1`    | 完成   | Characterization matrix 与 authority inventory 已合入；production authority 尚未切换。                    |
| `C2–C4` | 未开始 | Immutable facts/finalizer、production cutover、legacy decision removal 与 transport flattening 仍待实现。 |
| `Q1–Q4` | 完成   | Formatting、typed lint、`no-floating-promises` 与 `no-misused-promises` 已覆盖 source/test/testkit。      |
| `V2`    | 未开始 | 当前仍为 `1.1.0` 且 `repo-nav/legacy-v1` 仍公开；`2.0.0` 必须保持原子变更。                               |

## 规划时事实基线（历史）

### 已提交

- `P0` public/legacy/registry/version inventory：`b29e421`
- production audit 高危依赖修复：`399b731`
- CLI closed-stdin 修复 `A1`：`8dd36f0`
- RoleKit 文档与 host bridge 已提交。

### 规划时原工作区已有实现证据，但尚未形成可接受提交

- `A2` real-consumer fail-closed evidence
- `A3` mandatory backend trace 与 fallback 推导
- `A4` sanitized spawn-failure classification
- `A5` snapshot content digest
- `A6` hermetic unit / CodeGraph integration / macOS ARM CI
- `A7` MCP SDK 1.30.0 与 installed audit policy
- `B1.1–B1.4` exact test identity、registry、platform batch、process budget
- `D1` 仅部分完成：仍有重复 verified-open 路径

### 规划时 fresh checks

- `A2/A7` focused identities：479 passed，exit 0
- `A3/A4` focused identities：30 passed，exit 0
- `A5/A6` focused identities：11 passed，exit 0
- `B1.1–B1.4` focused identities：36 passed，exit 0
- `npm run typecheck`：PASS
- `npm run lint`：PASS
- `npm run format:check`：PASS
- `git diff --check`：FAIL，仅 `test/unit/backend-physical-attempt-executor-v2.spec.ts` 文件末尾多一个空行

这些结果在规划时只证明原脏工作区的 focused/static 状态；当时尚未运行 build、全量 unit、Golden、MCP、docs、platform、CodeGraph integration 和完整 package gates。

### 规划时新的上游约束

`origin/main` 比本地多一个 `d34a08e` 提交，带来：

- package version `1.1.0`
- 新公开 subpath：`repo-nav/backends`、`repo-nav/node`、`repo-nav/advanced`
- root 兼容 re-export 与 `PackageMetadata` alias
- expanded/truncated hit authoritative-selection 修复
- nightly benchmark 和 release-tag workflows

远端改动与当前未提交工作重叠 16 个路径，包括 package/workflow、canonical executor、snapshot、runner registry 和 release tooling。禁止把当前 diff 直接整体套到远端基线，否则容易回退 1.1.0 行为或删除新增公开 API/workflow。

## 总体策略（已执行的集成策略）

以下步骤记录 2026-08-12 至 2026-08-14 已完成的安全集成过程，不再是当前 worktree 操作指令。

1. **保持当时的脏工作区不动，把它当作只读实现来源。**
2. 在 sibling worktree 创建 clean integration branch，从当时已提交的 `HEAD` 开始，以 merge 方式吸收 `origin/main`；不 rebase、不改写当时的 main 历史。
3. 在 integration worktree 按任务语义重放原工作区改动，不整包复制，不把多个任务混成一个 WIP 提交。
4. 将旧计划保留为历史输入；新建 `docs/superpowers/plans/2026-08-12-repository-hardening-v2-replan.md` 作为后续唯一执行计划，避免覆盖当前用户修改过的旧计划。
5. 每个任务先 focused tests，再 affected suites，再 static gates；process、snapshot、release、breaking cutover 使用独立 reviewer。
6. 最终回到 `main`、push、创建 PR 或触发远程 CI 都是单独授权动作；计划执行本身不默认获得这些权限。

## 新依赖主线

```text
R0 clean integration baseline
  └─ R1 re-freeze 1.1.0 public/version authorities
      ├─ H1 real-consumer evidence
      ├─ H2 backend trace
      ├─ H3 spawn classification
      ├─ H4 unified verified snapshot (A5 + D1)
      ├─ H5 hermetic CI
      └─ H6 release SDK/audit
           └─ T1 exact identity registry
                └─ T2 batched platform execution
                     ├─ F1 CLI fast path ─► F2 CLI benchmark
                     ├─ S1 snapshot benchmark ─► S2 selected policy
                     └─ C1 characterization ─► C2 facts/finalizer
                                           ─► C3 authority cutover/removal
                                           ─► C4 transport flatten/cutover prep

F2 + S2 + C4 + Q4 ─► V2 atomic 2.0.0 cutover

Q1 format tests ─► Q2 typed lint ─► Q3 floating promises ─► Q4 misused promises
```

`S1` 的 authoritative CI artifact 可以与 `C1–C4` 并行等待，但 `S2` 必须在最终 V2 前完成。

---

## 阶段 R — 恢复候选边界并吸收 1.1.0

### R0：创建不破坏当前工作区的 integration worktree

**操作原则**

- 当前 `/Users/steven/repo-nav` 不 stash、不 reset、不 clean、不删除未跟踪文件。
- 从 `8dd36f0` 创建 sibling worktree 和 integration branch。
- 在新 worktree merge `origin/main`；不用 rebase。
- merge 冲突遵循：
  - 版本、公有 exports、新 workflow 和 authoritative-selection 修复以 `origin/main` 为基线；
  - 保留本地已提交的 audit overrides、P0、A1 和 RoleKit 文档；
  - 不在 merge 冲突中偷偷引入当前未提交的 A2–B1 实现。

**必须保留的上游文件/行为**

- `src/advanced.ts`、`src/backends.ts`、`src/node.ts`
- package exports `./advanced`、`./backends`、`./node`
- `src/evidence/request-snapshot/resolve-verification-hits-v2.ts`
- expanded/truncated hit regressions
- `.github/workflows/nightly-real-repo-benchmark.yml`
- `.github/workflows/release-tag-ci.yml`

**验收**

- integration worktree clean
- `git merge-base --is-ancestor 8dd36f0 HEAD`
- `git merge-base --is-ancestor d34a08e HEAD`
- package version 为 `1.1.0`
- 新 subpath exports 存在
- 不触发 release-tag workflow，不 push

> 创建 branch/worktree 和 merge commit 是本地 Git 写入；实际执行前按用户规则取得明确授权。

### R1：在 1.1.0 上重新冻结 public/version authority

**目的**

原 P0 inventory 基于 1.0.6，远端新增公开 subpath 后必须先更新，否则后续 C5 无可靠基线。

**改动**

- 更新 public root fixture，纳入 `PackageMetadata`，并保留 deprecated root compatibility exports。
- 新增 package subpath inventory：`.`, `./legacy-v1`, `./backends`, `./node`, `./advanced`, `./package.json`。
- 更新 version authority 的 1.x checkpoint 为 `1.1.0`。
- 更新 legacy replacement map：C5 只删除 `./legacy-v1`；其余新 subpath 在 2.0.0 保留。
- 为 nightly/release-tag workflow 增加结构 contract，防止后续 A6/B1 移植时被误删。
- 将远端 authoritative-selection 回归纳入必须保留的 characterization。

**验收**

- P0 mutation-sensitive inventory tests PASS
- root/subpath runtime 和 type inventory exact
- remote `resolve-verification-hits-v2` tests PASS
- `npm run typecheck && npm run lint && npm run format:check`

**建议提交边界**

`test(hardening): rebaseline inventories on 1.1.0`

---

## 阶段 H — 重放并收敛现有 hardening 实现

当前工作区仅作为参考。每项都在 integration worktree 重新形成最小 diff，禁止复制整个 26k-line working diff。

### H1：Real-consumer fail-closed evidence（原 A2）

**实现范围**

- strict observation/confirmation schema
- installed tarball CLI + MCP 原始 transcript
- repository branch/HEAD/index/worktree 前后状态
- unknown attestation fail closed
- missing owner confirmation 保持结构化 exit 2
- candidate process-tree cleanup

**重构约束**

当前单个测试文件约 10k 行。移植时按职责拆分 evaluator、schema authority、repository state、process cleanup 和 E2E gate 测试；不要把测试规模原样复制为一个不可审查文件。生产模块若继续超过单一职责，也应提取纯 evaluator/schema loader/process cleanup helper，但不扩大行为范围。

**focused gates**

- `public-beta-release/real-consumer-read-only`
- missing confirmation exit 2
- installed CLI/MCP parity
- repository unchanged

**review**

独立 security/release reviewer 检查：未测量 attestation、raw stdout/stderr framing、candidate hash binding、process cleanup 和路径泄漏。

**提交**

`fix(release): fail closed on real-consumer evidence`

### H2：Mandatory backend trace（原 A3）

**实现范围**

- production backends 实现 mandatory `searchViews`
- CodeGraph status/query receipt、index observation 和 fallback 全部从 ordered trace 推导
- canonical locate 不再 duck-type 或回退到普通 `search()`
- 保留 1.1.0 expanded/truncated authoritative-selection 行为

**focused/affected gates**

- `streaming-ripgrep/canonical-backend-trace-wiring`
- `streaming-ripgrep/codegraph-outcome-trace`
- `streaming-ripgrep/trusted-fallback-derivation`
- all codegraph-fallback Golden
- all MCP 与 docs smoke

**提交**

`fix(execution): make backend trace mandatory in canonical locate`

### H3：Sanitized spawn classification（原 A4）

**实现范围**

- ENOENT、EACCES/EPERM、other 的 internal enum
- raw Error 在 kernel 边界立即丢弃
- public buffered shape 不变化
- EACCES/EPERM 生产 wiring 映射为 backend failed，而非 unavailable

**focused/affected gates**

- spawn classification
- production wiring
- buffered compatibility
- process cancellation/lifecycle MCP
- platform contracts

**review**

独立 reviewer 检查 raw path/message 泄漏、no-child result shape 和 process-tree semantics。

**提交**

`fix(process): distinguish missing and denied executable spawns`

### H4：统一 verified snapshot primitive（合并原 A5 + D1）

**重新规划原因**

当前工作区的 A5 已增加 digest，但 `canonical-file-identity-v2.ts` 仍保留第二套 open/realpath/stat 路径。不要先接受双实现再做 D1；直接完成唯一 primitive。

**目标接口**

- `readVerifiedFileV2(input): { snapshot, bytes }`
- 同一 read-only handle 完成 bigint stat、regular-file 校验、N+1 bounded read 和 SHA-256
- alias collapse 使用 canonical key；public evidence 继续使用 caller locator
- `canonical-file-identity-v2.ts` 仅保留 type/re-export，不再拥有 I/O
- cache、final check、reader 全部复用同一 primitive

**必测场景**

- restored mtime + same size + digest changed
- initial resolve 与 verified open 间 target replacement
- N bytes / N+1 bytes
- symlink/reparse escape
- unreadable/abort 全文件 purge
- alias concurrency collapse

**focused/affected gates**

- snapshot-content-identity
- verified-file-snapshot
- request snapshot cache/final check
- repository safety/reader limits
- request-snapshot Golden
- MCP/platform

**review**

独立 reviewer 检查 exact operation order、same-handle binding、containment 和 public path 不泄漏。

**提交**

`refactor(repository): unify verified content snapshots`

### H5：Hermetic unit 与真实 CodeGraph integration（原 A6）

**实现范围**

- live CodeGraph 只在 `test/integration`
- plain unit deny network、无 dist、无 CodeGraph、支持 arm64
- cross-platform CI 保留六格矩阵，并增加/保留 macOS ARM 与 live CodeGraph job
- 合并时保留 origin 的 nightly/release-tag workflows

**focused/affected gates**

- hermetic three identities
- package-boundary declaration-only emit
- workflow mutation contracts
- clean/no-network full unit
- pinned CodeGraph 1.1.6 live integration

**提交**

`test(ci): isolate CodeGraph integration and add macOS ARM unit coverage`

### H6：SDK 1.30.0、installed audit policy 和 1.1.0 文档（原 A7）

**基线修正**

原 A7 文档写死 1.0.6；新计划在 C5 前统一使用 `repo-nav@1.1.0`。只有 V2 原子任务改成 2.0.0。

**实现范围**

- MCP SDK 精确 `1.30.0`
- security overrides 与 shrinkwrap 一致
- installed production audit：moderate/high/critical fail closed
- README/getting-started/migration/security 与 1.1.0 corrective line 一致
- 保留 origin 新 package subpaths 和 release workflows

**focused/affected gates**

- installed-audit、package-metadata、security/migration docs
- package lock/metadata/smoke/closure/audit/SBOM
- all MCP/docs

**review**

独立 security/release reviewer。

**提交**

`chore(release): upgrade MCP SDK and enforce production audit policy`

---

## 阶段 T — Runner 与平台反馈循环

### T1：Exact identity + normalized registry（合并原 B1.1/B1.2）

将 exact selection 和单一 registry 作为一个不可分割的 contract 变更，避免先引入新 CLI 协议却仍维护两套 group/case authority。

**要求**

- repeated `--identity group/case`
- legacy 单 group+case 只转换为一个 exact identity
- 禁止 cross product
- `RUNNER_IDENTITY_REGISTRY` 是唯一组合 authority
- static source inventory 与 owner files deep-exact
- unknown/dynamic/stale identity fail closed

**提交**

`refactor(test): adopt one exact runner identity registry`

### T2：Platform batch validator + build/process budget（合并原 B1.3/B1.4）

**要求**

- 一个 private result 验证多个 contract
- 每 surface 最多一个 Vitest child
- platform command 不隐式 build
- CI 每 cell 只 build 一次
- MCP/docs 使用 built scripts
- deterministic result/order

**提交**

`perf(ci): batch platform contracts after one build`

### H/T aggregate checkpoint

在进入新功能前，必须在 clean integration worktree fresh 运行：

```bash
npm ci
npm run build
npm run typecheck
npm run lint
npm run format:check
npm test -- --all
npm run test:golden -- --all
npm run test:mcp:built -- --all
npm run test:docs:built
npm run test:platform -- --self-test
npm run test:platform
npm run package:metadata:check
npm run package:lock:check
npm run package:emit:check
npm run package:dry-run
npm run package:smoke
npm run package:closure:check
npm run security:audit
npm run security:sbom:check
npm run benchmark:real-repos
git diff --check
```

CodeGraph integration需显式安装 pinned `@colbymchenry/codegraph@1.1.6` 后运行。

`release:owner-actions:check` 在没有 candidate-bound owner files 时应保持 exit 2；这不是失败修复目标，也不得伪造证据。

此 checkpoint 达成后，形成 **1.1.0 hardening checkpoint**。若后续 2.0 工作暂停，这里是安全回滚点。

---

## 阶段 F — CLI fast path

### F1：轻量 CLI 与 application adapter 分层（原 B3.1）

- help/version/usage 不加载 Nest、MCP、evidence engine 或 backends
- locate/probe 参数通过后才 dynamic import application adapter
- 保持错误脱敏、exit code、closed stdin 和 signal cancellation

提交：`perf(cli): lazy-load the application graph`

### F2：并发有序 probe + cold-start benchmark（原 B3.2）

- 独立 backend probes 并发启动
- 输出仍按 registration order
- CodeGraph query-plan entries 继续串行
- 建立可重复 CLI help/version/probe cold-start baseline 和回归阈值

提交：`perf(cli): run ordered probes concurrently`

---

## 阶段 S — Snapshot revalidation policy

### S1：候选策略与 authoritative benchmark（原 D2.1）

- production 暂不切策略
- 比较 all-loaded baseline、retained-digest、conditional-digest
- correctness probes 必须覆盖 retained mutation、eligible decision mutation、abort/unreadable
- authoritative job 固定 ubuntu-24.04 / Node 22 / linux x64
- artifact 与 provenance 绑定 workflow/job/head SHA/catalog digest

提交：`perf(snapshot): measure digest revalidation policies`

### S2：导入 artifact 并选择策略（原 D2.2）

入口条件：S1 对应 commit 的成功 authoritative artifact 和 owner 提供的 run ID。

- importer strict parse GitHub run、provenance、report
- 只从 correctness-safe candidate 中按 deterministic selector 选取
- exact tie 选择 conditional-digest
- committed baseline、selected constant 和文档可 byte-exact 重建

提交：`perf(snapshot): select verified digest revalidation policy`

如果 artifact 尚未就绪，可继续 Phase C；S2 只阻塞最终 V2。

---

## 阶段 C — Canonical v2 authority

### C1：Characterization 和 field ownership

先冻结 complete/no-hit、fallback、abort、snapshot mutation、redaction、evidence ID、backend order、1.1.0 expanded-hit 行为。建立 one-owner-per-public-field 表和当前 authority inventory。

提交：`test(v2): characterize locate decision families`

### C2：唯一 immutable facts + pure finalizer（原 C1.2/C1.3）

- 引入唯一 `LocateExecutionFactsV2`
- builder 只汇总 immutable facts，不 materialize public output
- pure finalizer 负责 status、fallback、strategy completeness、next actions 和 schema assembly
- shadow parity 必须覆盖 C1 全矩阵

拆成两个提交：

- `refactor(v2): introduce immutable locate execution facts`
- `refactor(v2): add pure locate result finalizer`

### C3：生产 authority cutover + 删除 schema-1.0 decision paths（原 C2.1/C2.2）

- production 只消费 canonical facts/finalizer
- 删除旧 status/next-action/legacy reservation/bridge/projection decision authorities
- public schema 除已批准的 status/coverage 修正外 deep-exact

拆成两个提交：

- `refactor(v2): cut production over to canonical facts`
- `refactor(v2): remove internal schema-1 decision paths`

### C4：Flatten materialization/transport 并准备 breaking cutover（原 C3/C4）

- 删除普通数据 WeakMap projection/materialization/serialization registries
- 保留仅有非伪造能力理由的 identity/capability registry
- flatten evidence materialization、serialization 和 MCP/CLI transport
- 新增 legacy-subpath absence checker，但此阶段仍保留实际 `./legacy-v1`
- migration 和 package contracts准备 2.0 expected state

拆成三个提交：

- `refactor(v2): flatten evidence materialization`
- `refactor(v2): flatten locate serialization and transport`
- `chore(v2): prepare atomic legacy subpath removal`

每个 C 阶段提交都运行 characterization、all Golden、all MCP、docs 和 package smoke；authority cutover/删除任务必须独立 review。

---

## 阶段 Q — 扩展质量边界（原 B2）

在功能和测试文件结构稳定后执行，避免大规模格式 diff 与 H/C/S 冲突。

1. **Q1**：Prettier 覆盖 `test/**`、`testkit/**`、全部 workflow/benchmark/release tooling。
2. **Q2**：typed ESLint 覆盖 test/testkit，并提交 baseline inventory。
3. **Q3**：启用 `no-floating-promises`，修复所有真实异步遗漏。
4. **Q4**：启用 `no-misused-promises`，修复 callback/handler 类型问题。

每一步单独提交；suppressions 仅允许有具体外部 API 约束和窄范围理由，不能替代修复。

---

## 阶段 V2 — 原子 `2.0.0` cutover

### 唯一 breaking 变更

同一个提交中完成：

- package/shrinkwrap/runtime/CLI/MCP/tarball/installed package/SBOM/confirmation authorities全部切到 `2.0.0`
- 删除 package export `./legacy-v1`
- 删除 `src/legacy-v1.ts`
- 保留 `.`, `./backends`, `./node`, `./advanced`, `./package.json`
- 保留 1.1.0 引入的 root compatibility exports，除非另有单独批准的 API 设计；本计划不扩大 breaking scope
- README、getting-started、migration、security、package fixtures 和 release manifest 同步切换
- runtime/type negative tests证明 `repo-nav/legacy-v1` 不可导入
- repository inventory 和 version authority inventory 更新到 final expected state

建议提交：`feat!: remove legacy-v1 and cut over to 2.0.0`

### 本地最终门禁

除 H/T aggregate 全部命令外，还必须运行：

```bash
node tools/release/check-legacy-subpath-absence.mjs --workspace .
node tools/release/run-public-beta-release-contracts.mjs
node tools/benchmark/real-repo-benchmark-gate.mjs
npm run benchmark:cli-cold-start
npm test -- --identity public-beta-release/repository-hardening-inventory
npm run release:owner-actions:check
```

在 owner files 尚未绑定 final tarball 前，最后一项应 exit 2。只有 exact `2.0.0` tarball SHA 固定后，才允许 owner 生成 candidate-bound actions 和 real-consumer confirmation。

### 外部门禁和最终证据

需要单独授权 push/CI 后：

1. 对同一 candidate SHA 运行 cross-platform 和 package-release workflows。
2. 六格：Linux/Windows/macOS Intel × Node 22/24 全绿。
3. macOS ARM Node 22 unit 全绿。
4. pinned CodeGraph live integration 全绿。
5. 下载同一 run/attempt 的 safe reports，并用 `--require-six-cell` 校验。
6. fresh installed `npm audit`、SBOM、pack/install gates全绿。
7. 在受支持的 POSIX owner host 运行 foreign-repository real-consumer E2E。
8. Windows 继续由六格 package/runtime gate 覆盖；Windows real-consumer 进程树清理在没有 Job Object authority 前不列为 2.0 blocker，若要强制则另立任务。
9. independent reviewer 和 security/release reviewer 对 final diff、tarball hash、owner evidence、CI、audit、SBOM 和 real-consumer evidence给出 PASS。
10. readiness 必须明确 `publishPerformed: false`。

publish、tag、push 或 GitHub Release 始终需要另行明确授权。

---

## 关键风险与控制

| 风险                                            | 控制                                                          |
| ----------------------------------------------- | ------------------------------------------------------------- |
| 当前 dirty work 被同步覆盖                      | 原工作区保持只读；在 sibling worktree 重放                    |
| 1.1.0 新 API 被旧 diff 回退                     | R1 先冻结 root/subpath inventories；逐任务语义移植            |
| 远端 expanded-hit 修复被 A3 覆盖                | H2 明确保留并运行远端回归                                     |
| package/workflow merge 删除 nightly/release-tag | R1 workflow structural contract                               |
| A2 超大实现不可审查                             | 移植时按职责拆分测试/helper；独立 security review             |
| A5 接受后仍有双 verified-open                   | H4 合并 A5+D1，一次完成唯一 primitive                         |
| 本地 pass 被误当跨平台/发布证据                 | 六格、CodeGraph、audit、real-consumer 均绑定 final SHA        |
| 提前形成 1.x + legacy removed 状态              | 只有 V2 单提交删除 legacy 并切版本                            |
| owner evidence 被伪造或过早生成                 | final tarball hash前 owner gate必须 exit 2                    |
| 原 `main` 与 integration branch 再次分叉        | 最终合入 main 前 read-back branch/status/diff，并单独取得授权 |

## 完成定义

### 已达到的 `1.1.0` checkpoint

- [x] 当前实现已按计划边界重放到包含上游 `1.1.0` 的 integration history，并通过普通 PR merge 合入 `main`。
- [x] `repo-nav/backends`、`repo-nav/node`、`repo-nav/advanced`、nightly/release-tag workflow 与 authoritative-selection 行为无回退。
- [x] `H`、`T`、`F`、`S1`、`C1`、`Q` 验收已通过；main-branch cross-platform 与 package/release workflow 在 merge commit 上通过。
- [x] 当前 package/version authority 仍为 `1.1.0`，`repo-nav/legacy-v1` 仍公开。

### 最终 `2.0.0` 完成条件

- [ ] `S2` 导入 authoritative snapshot artifact 并提交可重建的 selected policy。
- [ ] `C2–C4` 完成 immutable facts/finalizer、production authority cutover、schema-1 decision removal 与 materialization/transport flattening。
- [ ] `V2` 原子提交只移除 `repo-nav/legacy-v1`，并把全部版本权威一致切换到 `2.0.0`。
- [ ] build、typecheck、lint、format、unit、Golden、MCP、docs、platform、CodeGraph、package、audit、SBOM、benchmarks、六格和 real-consumer 证据均绑定 final candidate SHA。
- [ ] owner/reviewer evidence 完整，readiness 明确 `publishPerformed: false`。
- [ ] 未经单独授权不 push、不 tag、不 publish，也不执行其他远端或 owner-only 动作。
