---
doc_type: feature-implementation
feature: 2026-07-10-codegraph-fallback-orchestration
status: completed
---

# codegraph-fallback-orchestration 实现记录

## 第一性原则 pre-pass

- 外部行为：`repo_nav_locate` 优先观察 CodeGraph status/query，在保守条件外显式执行 ripgrep fallback，并公开 attempt/index/fallback coverage。
- 不可破约束：所有 CLI 经 SafeProcessRunner；CodeGraph hit 必须由当前文件核验；global abort 不启动 fallback；binary/index missing 不能从 provider collection 消失。
- 最小充分改动：新增 CodeGraph command/parser/planner/backend，扩展内部 backend request/result metadata，在既有 Evidence Engine seam 编排两个 backend；不新增 tool/schema version。
- 必须不写：index init/update/delete production path、explore/node/stderr parser、callers/impact、shell 拼接或业务判断。

## 基线预检

- 基线 commit：`8a691264e2aca2689bbd3f8ff35ca87af9ca83f8`（F5 accepted）。
- 开工前最终 F5 基线：build/typecheck、123 unit、28 active Golden + 1 conditional skip、31 MCP 全部通过；工作树 clean。
- F6 start gate：passed，linked worktree/branch 合规。

## 按步骤实现与证据

### S1：probe 与 versioned JSON parser

- 新增 `codegraph-json.ts` 与 1.1.6 status/query fixtures；required `initialized/version` 与 hit `file/name/lines` wrong/missing fail closed，additional fields 宽容。
- `CodeGraphBackend.probe()` 使用 structured stdout；spawn/missing/index/error/abort/stale mapping 固定，stderr/ANSI 不参与协议值。
- Evidence：CMD-PARSER 8 passed；`codegraph-health-mapping-report.md`。

### S2：query planner / completeness / argv

- 新增 Unicode identifier planner：symbol anchors 优先、terms 后置、stable dedup；unsupported anchors/negative/layers/case/non-identifier 明确标记 incomplete。
- 每 entry 单独 query，共享 total maxHits；remaining=0 不 spawn；只有 sensitive symbol-only exact intent 声明可进入 skip gate。
- Windows npm/portable `.cmd` 不可由 `shell:false` 直接 spawn，新增 `codegraph-command.ts` 解析为 `node.exe + JS entry + logical argv`；POSIX 仍直接 executable。
- Evidence：CMD-PLAN 6 passed；argv 3→2/limit=1 stop/fuzzy raw budget snapshots；`codegraph-query-plan-report.md`。

### S3：fallback orchestration

- `RepositoryBackendsModule` 现在冻结 `[CodeGraphBackend, RipgrepBackend]`。
- Engine 对 primary hit 做当前文件预核验；只有 complete + sensitive exact symbol intent + verified implementation/definition + 无 verification failure 才跳过 fallback。
- 其余 missing/no-result/failed/incomplete/local timeout/hit-unverified 都运行 ripgrep；global signal abort 立即返回且 ripgrep calls=0。
- 最终对稳定合并后的两 backend hits 重新核验/merge/classify；fallback 完整可关闭 primary incomplete，不直接制造 partial。
- direct classifier 在 `primaryAttempted` 且 record 为 ripgrep-only、无更高 reason 时生成唯一 secondary candidate；merged provenance 不生成 secondary。
- Evidence：CMD-FALLBACK 11 passed；`codegraph-transition-report.md` 与 10 个 Golden manifests。

### S4：真实 indexed temp repo

- 真实 `codegraph 1.1.6` 在系统 temp 初始化单文件 synthetic repo；production parser/runner 成功 probe/query `AlphaMapping`。
- owned child settled、无 daemon/watcher pid/lock artifact、temp tree 可删除；工作 repo `.codegraph/` 前后均不存在。
- Evidence：CMD-SMOKE 1 passed；`codegraph-live-smoke-record.md`。

## 实际交付物

- Production：`codegraph-command.ts`、`codegraph-json.ts`、`codegraph-query-planner.ts`、`codegraph-backend.ts`；backend module/engine/classifier/ports/index 挂载。
- Verification：3 个 CodeGraph unit specs、1 个 10-case Golden transition spec、versioned JSON/temporary repository fixtures、10 个 Golden manifests、runner registry。
- Artifacts：health mapping、query plan/argv、transition、live smoke/cleanup reports 与本实现记录。

## 最后一轮本地审计

- 全量：build/typecheck、138/138 unit、39 active Golden + 1 conditional skip、31/31 MCP 全部通过。
- DoD：6/6 core commands passed；scope gate `implementation.before_review` passed；`git diff --check` 无 whitespace error。
- 清洁度：production/test/testkit 无 debug output、TODO/FIXME/XXX、注释掉实现或 unused import；无工作仓库 `.codegraph/` mutation。
- Checklist：S1-S4=`done`；C1-C12 保持 `pending`，由 acceptance 统一核对。

## 独立 review Round 1 修复

- 收紧 skip gate：只有单一 explicit symbol intent 可声明 `canSkipFallbackIfVerified=true`；多 symbol 即使只核验其中一个，也必须执行 ripgrep fallback。
- 拆分 probe 与 query failure mapping：probe spawn error 仍代表 provider unavailable；已进入 query 后的 spawn/nonzero/malformed/timeout/abort 都是 failed attempt，health 为 `error`。
- 新增 query spawn/timeout 的 exact health reason 断言，以及 local/global abort 的 `coverage.backends[0].status=failed`、`indexState=error` 与多 symbol integration fallback 断言。

## 知识候选

- Windows 上 npm `.cmd` 不能在 Node `spawn(shell:false)` 下直接作为 executable；CodeGraph adapter 必须解析到 Node JS entry，而不是打开 shell。
- `BackendSearchResult.complete=false` 是 backend 局部状态；fallback 完整后不能机械映射为全局 `partial`。
- CodeGraph 1.1.6 status/query optional fields需 forward-compatible，但决定 initialized/current-file hit 的 required fields必须 fail closed。
