---
doc_type: approval-report
unit: repo-nav-public-beta
status: approved
reason: review-authorization
approvals:
  start-pr00-contract-planning-only: approved
  roadmap-update-2026-07-23: approved
  all-child-designs-current-revision: approved
  goal-acceptance: approved
  goal-commits: approved
  f4-remote-ci-evidence: approved
approval_groups:
  goal-execution:
    status: approved
    confirmation_id: "ge-6e44d402368a"
    decisions: [goal-acceptance, goal-commits]
created_at: 2026-07-23
---

# Approval Report

## Decision History

- 2026-07-23：owner 回复“按计划开始推进”，批准 `start-pr00-contract-planning-only`，授权创建隔离 worktree、冻结第一版 v2 契约并完成 F1；该回答不等于批准本次复审后的 roadmap 更新。
- 2026-07-23：`reviewForBeta.md` 证明 F1 dormant v2 仍有低熵 corpus/placeholder amplification 与 raw-public-aggregate resource boundary 两个切换阻断项；planning 因此新增 corrective/bridge items 并重排 DAG。
- 2026-07-23：独立 Task agent Round 4/5 两次要求修订；Round 6 对最终候选给出 `passed`，blocking=0、important=0。
- 2026-07-24：owner 回复“批准当前修订稿”，批准命名决策 `roadmap-update-2026-07-23`，选择选项 1，并确认 F1A/F1B/F1C、12-item DAG、Node 22/24 支持范围及 F9 原子切换边界。
- 2026-07-24：F1A 独立 design review 发现“每项基础验证”一句把尚未由 F1C 创建的真实 envelope 误套到 F1A/F1B。现已按 owner 已批准的 F1C 边界做一致性澄清：F1A/F1B 只验证 dormant assembler，真实 envelope integration 从 F1C 起；不改变 DAG、budget、public contract、Node 支持或 cutover 决策。
- 2026-07-24：F2 Round 1 独立 design review 发现“按最终 response-wide materialization 排序”会形成 corpus 与 budget selection 的循环依赖。ChildDesignBatch 已起草 pre-ID conservative `PublicSafeRankingKeyV2` 澄清：key 可比最终 display 更保守、assembler 保序、opaque canonical identity 只用于 file bucket membership。该项修改了 public-contract 文字，**不由既有 `roadmap-update-2026-07-23` 自动授权**，必须进入本批全部 child designs 的统一 owner 确认；确认前 F2 implementation 保持阻塞。
- 2026-07-24：F1A/F3/F2 下一轮独立复审进一步发现 branded canonical path、raw expanded cap/selector 与 content-derived `discoveryKey` tie-break 仍会形成 membership/order side channel。候选契约因此继续收紧：F3 在任何 expanded cap 前产生 F1A public-safe candidate view；pre-safe backend truncation 不向 selector 暴露 raw prefix；opaque file/record identity 改为无 payload object token + private WeakMap；safe-key collision 只能整组纳入/排除，最终 distinct record collision 全组 `selection-ambiguous`；`unobserved` completeness 只能由 F3 proof API 派生。该实质 delta 同样等待全部 child designs 统一 owner 确认，且必须先通过新的独立复审。
- 2026-07-24：同轮跨feature复审证明普通 ripgrep raw prefix 无法同时保证
  public-safe等价类原子性。候选契约新增
  `selectionEligibility='complete-safe-set'|'telemetry-only'`：maxHits、output-limit、
  timeout、abort、process error 等 incomplete outcomes 的 retained hits 只作为 bounded
  attempt telemetry，不能进入 F3 safe pool、F2 selector 或 public evidence；只有完整
  backend/fallback safe set 可选。该安全优先 tradeoff 实质替换了既有“bounded partial
  evidence”表述，同样不由历史批准自动授权，须在全部 child designs 独立复审后统一
  owner 确认。
- 2026-07-27：roadmap Round 9、F1C Round 8与F2 Round 6独立复审均为
  `changes-requested`。当前候选已修复F6-owned public-neutral backend attempts与trusted
  status registration、case-aware anchor `value/comparisonValue`、priority-descending
  comparator、collision-anchor proof、F2 importer 0→F8 importer 1时序，并补齐roadmap职责、
  admission与rollback矩阵。上述均为实质契约delta，等待新一轮独立复审与本批统一确认。
- 2026-07-27：F1C/F6/F8 下一轮独立复审发现“全部六 owner 已存在才允许 source，
  但 aggregation 又负责产生其中 backend/request-outcome”这一不可实施生命周期环。当前候选已选择
  唯一 partial-prerequisite lane：pre-stage 只要求 snapshot/ranking/scope/capability，aggregation
  exact-once 产生并 fresh-mount 后两 owner，finalizer 只消费 completion-bearing token；F6 acceptance
  降为 direct aggregator seam，real mount 由 F8 唯一证明。该实质 ABI delta 必须通过新的独立复审并
  纳入统一 owner 确认。
- 2026-07-27：上述 lifecycle/ABI 修订已完成 current-revision 独立复审。F1C Round 10、
  F2 Round 8、F6 Round 5、F8 Round 7、F5 wording focused closure、F3 scope-command
  focused closure与F9 compatibility focused closure全部 `passed`，Roadmap Round 10亦以
  blocking/important/nit=`0/0/0`通过。该结论只把候选推进到统一 owner 确认门，不自动
  将 `all-child-designs-current-revision` 改为 `approved`，也不授权实现。

- 2026-07-27：owner 回复“批准”，批准命名决策 `all-child-designs-current-revision`，确认当前候选 manifest 的 8 项统一 design 约束；11 份 child design 已标 `approved`，进入 goal package。

## Decision Applied

命名决策 `roadmap-update-2026-07-23` 已批准。当前 `repo-nav-public-beta` 修订稿成为后续 feature design 的硬约束，roadmap 从 `draft` 恢复为 `active`。

本次批准同时确认：

1. F1 历史 `done` 不回滚；F1A/F1B/F1C 分别关闭 redaction/corpus、resource budgets 和真实 producer 过渡 seam。
2. 默认执行链为 F1A → F1B → F1C → F3 → F2 → F5 → F6 → F7 → F8 → F9；F4 CI lane 可立即并行，但必须在 F5 前完成。
3. public-beta Node support 从当前 `>=20` 收窄为 `^22.0.0 || ^24.0.0`。
4. production 在 F9 前继续只输出 v1；F8 只允许不可达 transport 的真实 v2 shadow result，F9 才切换唯一 projector edge。

## Why Now

当前 F1 是方向正确但仍不具备切换条件的设计原型。若继续按旧 roadmap 推进，后续 snapshot/ranking/backend producer 缺少同一真实执行 seam，并且现有 redaction/resource 缺口会在 F9 形成安全与可用性阻断。独立 review 已把这些问题收敛为 12-item DAG 和可执行接口契约，现在需要 owner 在 child feature design 前确认。

## Context

- 当前 production MCP/CLI/service 仍为 schema v1；v2 assembler 只存在于 dormant internal/test seam。
- 本轮未修改功能代码；build、typecheck 与 `public-output-v2` 46 tests 在 planning 基线重新执行通过，但 hostile probes 仍能在当前 F1 实现复现低熵污染、placeholder 二次改写、日期 phone 误判、多 reason 覆盖及 400,000-byte excerpt 绕过。
- 最终候选包含 12 个 items，唯一 minimal loop 为 F1B；YAML、DAG、Markdown/frontmatter、spec-governance 和 `git diff --check` 均通过。

## Evidence

- Roadmap review：`.codestable/roadmap/repo-nav-public-beta/repo-nav-public-beta-roadmap-review.md`，Round 6 `passed`
- Roadmap SHA-256：`3846AF49C402499AE9270E9FDB3B65DF201D03B703834F62C25C0100B30DCB01`
- Items SHA-256：`4B326E63EED21562BEFA5FC6CF43D7143602B697042346690888822727ED7B59`
- Public contract SHA-256：`7F86F8EF1971ADFE3FD9C0879120854CDEB6655A46DB3970208FEC61F2D62250`
- Compatibility SHA-256：`B5B3300D4AA6E03F3AB31A4DD95874E0ACB121920CA3D77CAB58A57EFB4A166A`
- Threat model SHA-256：`839FFDD65CE91CCA51FF09D68DEA95C3489A32DD68ACCAE096B0DB6E91CABB42`

以上 hashes 继续证明 owner 已批准的 roadmap 基线；ChildDesignBatch 中尚待统一确认的
`PublicSafeRankingKeyV2`、pre-safe cap、equality-only token、collision group、typed
selection proof、structured ordering key与partial-telemetry-only eligibility的
public-contract/threat-model delta 使用新的reviewed hashes记录在最终统一确认报告，
不得回写或伪装成上述历史批准hash。

## Pending Unified Design Confirmation

命名决策 `all-child-designs-current-revision` 当前为 `approved`。独立review全部通过后，
统一owner确认必须逐项展示并确认：

1. case-aware public-safe ranking key与保守safe-key折叠；
2. distinct selector/ordering collision整组排除及private collision-anchor proof；
3. incomplete backend hits只作telemetry、不得进入evidence；
4. Node support收窄为`^22.0.0 || ^24.0.0`；
5. 4 MiB source与1 MiB serialized result预算；
6. F8 complete real-v2 shadow与F9 token-only atomic cutover；
7. design-ready仅推进设计批次，implementation-ready仍要求依赖acceptance done。
8. four-prerequisite admission、F6 direct seam、F8唯一complete-envelope mount及finalizer禁止读取old partial envelope。

该pending决策不授权implementation、goal driver、commit、merge、push、publish、release或cutover。

### Current Reviewed Candidate Manifest

- Roadmap SHA-256：`0AB8DDD41F4792A9B3F24EAF1C8B42988479D3C3CDB08413147050B1169A2470`
- Items SHA-256：`449319D40886BFC3D972385ECFD45D585864ECF72266178F9C046E70C4ACE483`
- Public contract SHA-256：`6F4FAB7C2FE9F317771C6161DDA02EEC1794968908D4532AAE220B0BEE02B2BC`
- Compatibility SHA-256：`9C2AADD03DD5840CC41293E7F8A1857F3CB9551336EDD8D95943B39612130196`
- Threat model SHA-256：`AD0733DA7D5F0CF4AF2656D4C9EDBB1C1268536B5F6887771AEA6001D09F570E`
- Roadmap reviewer：`/root/review_roadmap_r10`，Round 10 `passed`
- Child review state：F1 historical acceptance保留；F1A–F9全部 current design review
  `passed`，其中F9 focused compatibility closure亦为 `passed`
- Approval state：`all-child-designs-current-revision=approved`

以上 manifest 是本次统一确认的不可变输入。任何 design/checklist、roadmap、items、
public contract、compatibility 或 threat-model 内容变化都会使对应 current-revision
review 失效，必须先完成受影响的独立复审，不能复用本报告中的 `passed`。

## Options Reviewed

1. **批准当前修订稿（已选择）**：确认上述四项决定，恢复 roadmap `active`；后续每个 child item 仍独立走 design/review/implementation/QA/acceptance。
2. **要求修改**：指出要调整的 budget、Node support、依赖顺序或接口；planning 修改后重新运行独立 roadmap review。
3. **保留旧 roadmap / 不批准更新**：不采用 F1A/F1B/F1C 与新 DAG；roadmap 保持 `draft`，不继续 child feature，因为两个 P0 cutover blocker 与 producer seam 缺口仍未关闭。

## Selected Option

已选择选项 1。该选择保留 F1 已完成的历史证据，同时把新 review 暴露的问题作为独立、可验收的 corrective work，而不是篡改旧 acceptance 或在 F9 一次性集成。

## Risks And Tradeoffs

- span/corpus 与 resource budgets 会提高 fail-closed 比例，但阻断恶意/异常 raw result 对响应的放大。
- canonical facts bridge 增加一个临时 v1 projector；它有明确删除条件，换取 F2–F8 能在真实 pipeline 上独立验收而不提前切换 public schema。
- Node 20 调用方需要先升级到 Node 22/24。
- 4 MiB raw / 1 MiB public budgets 仍要由 F1B 最大结构 fixture 测量；证据不符时必须回 roadmap 更新，不可静默放宽。
- requirement/architecture/VISION 状态索引存在既有轻微漂移；批准后单独运行 `cs-arch check/update` / 文档整理，不在 planning 中改写现状档案。

## Non-Automatic Actions

批准本报告不会自动执行 feature implementation、stage/commit、merge、push、license 选择、移除 `private: true`、npm publish、GitHub release 或 production cutover。它也不接受 F3 changed-file trust-marker residual；该项仍须在 F3 design 明确。

## Next

- `approvals.roadmap-update-2026-07-23` 与顶层 status 已记为 `approved`。
- roadmap 已恢复 `active`，planning update 完成持久化。
- 只有收到新的执行指令才进入 F1A/F4 child design 或 epic goal；本批准不自动启动实现。
- 当前已按owner“继续”进入ChildDesignBatch；全部child designs独立review完成后一次性提交统一确认，其中必须单列`PublicSafeRankingKeyV2` contract delta。

- 2026-07-27：[public-beta goal driver](06c57bbc-6ea2-4038-a133-a77038e95a06) 完成 F1A（commit `9c125e2`）后，在 F4 S5 因缺少 owner 授权的 GitHub 远程证据而 `CS_ROADMAP_GOAL_HANDOFF`；命名决策 `f4-remote-ci-evidence` 曾记为 `pending`。
- 2026-07-28：owner 批准完整远程证据路径，`f4-remote-ci-evidence` → `approved`。

## Goal Execution Authorization Applied

命名决策与 group：

- `approval_groups.goal-execution`：`approved`（confirmation_id=`ge-6e44d402368a`）
- `approvals.goal-acceptance`：`approved`
- `approvals.goal-commits`：`approved`

Owner 一次批准同一条 `/goal` 时，原子将 group 与两项 named decision 记为 approved，并同步
`goal-state.yaml` 为 `ready-to-dispatch`。该项授权允许：

1. Goal acceptance：证据通过后完成各 feature acceptance。
2. Goal commits：每个 feature accepted 后自动 scoped-commit。

### Non-Automatic Actions

不会自动执行 remote push、merge、publish、release、deploy、promotion、移除 `private: true`、
license 选择或 production cutover；这些仍需各自独立 owner authorization。

## F4 Remote CI Evidence Authorization Applied

命名决策 `f4-remote-ci-evidence` 当前为 `approved`。

- 2026-07-28：owner 回复“批准完整远程证据路径”，选择选项 1：授权 F4 本地实现 scoped-commit、push/PR、同 run 六格+aggregate、main required check=`cross-platform-required`（含失败 PR 不可 merge），完成后从 index=2 恢复 `/goal`。不包含 merge 到 main、publish 或 v2 cutover。

[public-beta goal driver](06c57bbc-6ea2-4038-a133-a77038e95a06) 已完成 F1A，并在 F4
`cross-platform-ci-baseline` 本地 S1–S4 后按协议 handoff：S5 核心路径需要 GitHub 远程证据，
而既有 `goal-commits` 不覆盖 push / PR / ruleset。

### Current Facts

- goal-state：`status: handoff`，`current_feature_index: 2`，F4=`implementing`
- F1A accepted commit：`9c125e2`
- F4 本地实现仍在工作树（未 scoped-commit）；缺口说明：
  `.codestable/features/2026-07-24-cross-platform-ci-baseline/cross-platform-ci-baseline-remote-evidence-gap.md`

### Options

1. **批准 F4 远程证据动作**：授权把当前 F4 本地实现 scoped-commit 后 push 到
   `repo-nav-public-beta`（或开 PR），跑通同 run 六格 matrix + `cross-platform-required`
   aggregate，配置 `main` required check=`cross-platform-required`（含 sanitized ruleset
   与失败 PR 不可 merge 负样本）。完成后从 index=2 恢复 `/goal`。
2. **只授权 push/PR，ruleset 另批**：先取六格+aggregate 绿证据；ruleset/负样本另开决策。
3. **拒绝 / 改设计**：保持 handoff，不 push；另指定如何关闭 S5 或修订 F4 design。

### Recommendation

选项 1。F4 design 把远程六格、aggregate 与 ruleset 都标为核心验收路径。

### Non-Automatic Actions

即使批准本决策，也不自动 merge 到 `main`、不 publish、不 cutover production v2。
