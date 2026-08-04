---
doc_type: roadmap-goal-plan
roadmap: repo-nav-public-beta
status: ready
created: 2026-07-27
baseline_ref: 9d7b0e237e3cd9245d1f057a2ad504b1d1028d7d
---

# RepoNav public-beta Goal 执行总览

## 1. Inputs And Authorization

- Roadmap：`.codestable/roadmap/repo-nav-public-beta/repo-nav-public-beta-roadmap.md`
- Items：`.codestable/roadmap/repo-nav-public-beta/repo-nav-public-beta-items.yaml`
- State：`.codestable/roadmap/repo-nav-public-beta/goal-state.yaml`
- Approval：`.codestable/roadmap/repo-nav-public-beta/approval-report.md`
- Owner 已确认 roadmap（`roadmap-update-2026-07-23`）与全部 child designs（`all-child-designs-current-revision`）。
- 11 份待执行 design 均为 `approved`，design-review `passed`；F1 历史 `accepted`/`done`。
- Git implementation baseline：`9d7b0e237e3cd9245d1f057a2ad504b1d1028d7d`。
- Goal acceptance 授权：`approval-report.md#goal-acceptance`（首次落盘为 pending，启动确认后 approved）。
- Feature scoped-commit 授权：`approval-report.md#goal-commits`（首次落盘为 pending，启动确认后 approved）。

## 2. Feature Execution Order

按 items DAG 的 topological_order（单执行流）：

1. `public-output-boundary-v2` — dormant v2 raw/public boundary、response-local ID 与 no-cutover gate（已验收）（`mixed`，已 accepted，跳过）
2. `span-redaction-corpus-policy-v2` — span-based 单次物化、传播资格 corpus 与 placeholder 永不二次扫描（`mixed`）
3. `cross-platform-ci-baseline` — Node 22/24 × Windows/Linux/macOS blocking CI 矩阵与 engines 收窄（`non-functional`）
4. `public-result-resource-budgets-v2` — raw/corpus/public/serialized 数量与 UTF-8 字节硬上限及 N/N+1 fail-closed（`mixed`，唯一 minimal loop）
5. `canonical-locate-facts-bridge` — typed partial fact envelope、four-prerequisite admission、v1 projector 与不可达 v2 shadow（`mixed`）
6. `request-snapshot-cache` — 请求级 snapshot/cache、safe pool 与公共组装前 stale purge（`mixed`）
7. `relevance-ranking-budget` — 确定性相关性排序、anchor 预留、collision-atomic 预算与 round-robin 多样性（`mixed`）
8. `streaming-ripgrep` — 流式 ripgrep JSON、bounded telemetry-only incomplete 与 BackendExecutionOutcomeV2（`mixed`）
9. `input-abort-contract-v2` — 可选 question、路径/语义归一化分离与 abort/status aggregation seam（`mixed`）
10. `repository-scope-policy` — 统一 scope decision（basename/extension/segment/prefix）及 confirmed/candidate 共用（`mixed`）
11. `language-capability-boundary` — TS/JS/SQL adapters、unsupported 保守降级与首个 complete real-v2 shadow（`mixed`）
12. `public-beta-release` — 原子切换 production locate schema v2、发布元数据与 beta release gate（`mixed`）

`goal-state.yaml` 的 `current_feature_index` 从第一个 `pending`（F1A）开始。实现前依赖必须 acceptance `done`。

## 3. Roadmap Core Acceptance Paths

1. Security dormant boundary：hostile low-entropy corpus、placeholder amplification、phone/date negatives、Unicode span；full projection forbidden scan；v1 no-cutover。
2. Resource budgets：raw count/field/4MiB、corpus、public-field 与 serialized 1MiB 的 N/N+1 fail-closed。
3. Canonical bridge：four-prerequisite admission、aggregation fresh owners、finalizer completion-token-only、production 仍 v1。
4. Snapshot/ranking：request-local decode-once、stale purge、anchor priority、collision-atomic budget、diversity。
5. Backend streaming：incomplete hits telemetry-only；cleanup/timeout/abort/nonzero exit outcomes。
6. Scope/capability：confirmed/candidate 共用 scope；unsupported language 保守 candidate。
7. Platform：Node 22/24 × Windows/Linux/macOS blocking matrix。
8. Release candidate：仅 F9 在独立授权下切换 v2 transport；本 goal 不自动 publish/cutover。

## 4. Key Assumptions

- production MCP/CLI/service 在 F9 前始终输出 schema v1。
- 不内置 LLM；`question` 不参与检索语义。
- Node support 收窄为 `^22.0.0 || ^24.0.0`。
- incomplete backend retained hits 不得进入 F3 safe pool / F2 selector / public evidence。
- license 选择、移除 `private: true`、merge、push、publish、release 均需额外授权。

## 5. Top 3 Risks And Mitigations

1. 低熵 corpus / placeholder 放大：F1A span materialization + 传播资格；hostile fixtures。
2. 半迁移/错误切换 v2：no-cutover import 检查贯穿 F1A–F8；F9 原子切换且可 revert。
3. 跨平台与大结果不确定性：F4 blocking matrix + F5 streaming/cleanup 真实证据。

## 6. Mandatory Validation Commands By Feature

每个 feature 以对应 design/checklist 与 `goal-features/<slug>.md` 为准；公共基线：

- `npm run build`
- `npm run typecheck`
- `npm test`
- 相关 `npm run test:golden` / `npm run test:mcp` / docs smoke（按 feature design）
- F9 前：production import / v1 no-cutover 检查

## 7. Final Aggregate Commands

roadmap 完成前最终审计必须重跑：

- `npm run build`
- `npm run typecheck`
- `npm test`
- `npm run test:golden`
- `npm run test:mcp`
- docs smoke / package dry-run（按 F9 design）
- `python C:/Users/steven.guo/.agents/skills/cs-onboard/tools/codestable-goal-consistency-gate.py --roadmap .codestable/roadmap/repo-nav-public-beta`

## 8. Preflight Policy

- 每个 feature 开始前确认 design `approved`、design-review `passed`、依赖 items `done`。
- 工作树在 scoped-commit 边界必须干净（允许 goal 状态文件按协议纳入 commit）。
- baseline_ref=`9d7b0e237e3cd9245d1f057a2ad504b1d1028d7d`；不得在未授权时改写 public contract / threat model。

## 9. DoD Policy / Gate Policy / Provider Policy

- DoD：checklist steps done + scope-gate + dod-runner + evidence-pack + independent review + QA + acceptance。
- Gate：以 `goal-protocol-gates.md` 为权威；脚本缺失必须重装 CodeStable，不得伪造成功。
- Provider：archguard / meta-cc unavailable 记录 fallback warning，不自动阻塞；由 review/QA/audit 解释。

## 10. Missing Tool Recovery

只能补正式测试依赖、lockfile 或既有 runner 配置；禁止新增同名 shim 或伪造验证结果。

## 11. Final Audit Deliverable Types

- 每 feature review / QA / acceptance / evidence pack / gate+dod results
- goal-evidence-summary、provider warnings、E/C/H summary、H-only core checks
- architecture / requirement / roadmap 写回
- `goal-audit.md` + consistency gate 结果

## 12. Non-Automatic Actions

本 goal 即使完成也不自动 remote push、merge、publish、release、deploy、promotion 或 production cutover。
