---
doc_type: feature-acceptance
feature: 2026-07-23-public-output-boundary-v2
status: passed
audit_state: completed
audit_reason: ""
auditor_id: /root/f1_goal_driver/f1_acceptance_auditor
acceptance_authorization_ref: approval-report.md#goal-acceptance
accepted: 2026-07-23
round: 1
---

# public-output-boundary-v2 验收报告

> 阶段：阶段 3（验收闭环）
> 验收日期：2026-07-23
> 关联方案 doc：`.codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-design.md`

## 1. 接口契约核对

- [x] `LocateResultV2`：strict public success/error、coverage/status、continuous
  ordinal ID 与 `public-contract-v2.md` 一致；完整 public positive owner strict parse。
- [x] `FinalizedUnsafeLocateResultV2`：禁止 schemaVersion、repositoryRef、status、
  public ID、resolvable、redaction metadata、`LOCATION_REDACTED` 与任意 extra
  field；contradictory mutation fail-closed。
- [x] `assemblePublicLocateResultV2`：入口 strict raw parse，字段逐项 allowlist，
  输出再次 strict public parse；programmer contract violation 固定映射
  `INTERNAL_ERROR`。
- [x] `SensitiveValuePolicyV2`：term/file/symbol/excerpt truth table、fixed
  placeholder、exact metadata 与 response-local corpus propagation 均有正反 owner。
- [x] 流程图真实落点：
  `raw parse → corpus → field policy → derived degradation/status → allowlist +
  ordinal IDs → public parse → synthetic projections`。

名词实现使用 `assemblePublicLocateResultV2`、`collectSensitiveCorpusV2`、
`redactPublicFieldV2`，与 design 的模块级名词一致，没有把 v1/v2 contract 混为一体。

## 2. 行为与决策核对

- [x] 成功标准：raw root、Git/discovery/content hash、hostile token/control 不穿过
  public v2 boundary；unit/Golden forbidden scan 通过。
- [x] safe error：四 code 固定 message/recoverability；仅 `INVALID_INPUT` 可带
  `ADD_TERM`，unsafe detail/throwable 不输出。
- [x] status/degradation：assembler 独占 `LOCATION_REDACTED` 和最终 status；
  backend/snapshot/scope/capability/abort facts 由 strict raw contract 守护。
- [x] determinism：upstream array order 保留；canonical collections 与 nested
  summary 固定；confirmed 后 candidate 分配 `0001..N`。
- [x] 明确不做：没有 production v2 cutover、ranking/cache/backend/scope/language
  producer、默认 coverage helper、Nest/DI/provider/adapter、HTTP、持久化、logger
  或 stderr policy。
- [x] v1 仍是唯一 service/MCP/CLI/docs contract；`package.json private:true`
  保持不变，F9 独占真实 transport parity、package export 与原子切换。

**挂载点反向核对**

- [x] runtime v2 引用只位于 `src/contracts/v2/**`、
  `src/evidence/public-output/**`、synthetic fixture 与 v2 unit/Golden。
- [x] `src/index.ts`、`src/contracts/index.ts`、Repository Evidence Engine、MCP、
  CLI 与 docs 无 v2 import/export。
- [x] registered no-cutover gate 同时证明 deliberate synthetic reachability
  mutation 可被检测，当前 production roots 的真实可达路径为零。

**拔除沙盘**

删除 v2 contract/policy/assembler/projection、对应 tests/fixtures/import inventory、
runner registry 的 v2 entries 与 feature artifacts 后，production v1 graph 无残留；
因此 design 2.3 的“无 production 挂载点”清单完整且可卸载。

## 3. 验收场景核对

| 场景 | 结果 | 可观察证据 |
|---|---|---|
| F1-SCHEMA-001 | passed | contract 25 cases；raw/public success/error 与 cross-field contradictions |
| F1-REDACTION-001 | passed | field policy 8 cases；identifier/credential/connection/PII/malformed/oversized |
| F1-LOCATION-001 / STATUS | passed | assembler 7 cases；safe/sensitive/literal placeholder、0/1/多 hidden path |
| F1-PATH-INVARIANT-001 | passed | absolute/drive/UNC/backslash/dot/root escape/NUL fail-closed；newline path hidden |
| F1-CONTROL-001 | passed | C0/DEL/ESC/ANSI/bidi 与 public text/path schema mutations |
| F1-PLACEHOLDER-001 | passed | `[REDACTED]` / `[REDACTED_PATH]` 无 metadata 保持普通内容 |
| F1-ID-001 / ALLOWLIST | passed | continuous `0001..N`，raw extra/root/remote/hash/detail fail-closed |
| F1-ERROR-001 | passed | safe error/projection 4 cases |
| F1-PARITY-001 | passed | service/structured/text/debug synthetic projections parse 后严格等值 |
| F1-NOCUTOVER-001 | passed | import inventory 2 cases + full MCP/docs v1 regression |
| F1-DETERMINISM-001 | passed | repeat、input/nested key insertion order bytes stable |

- [x] Review 第 5 节重点已覆盖：dangling escape、credentials/phone/malformed、
  controls、placeholder/metadata、snapshot/backend/fallback/abort、canonical arrays、
  determinism、safe errors 与 no-cutover。
- [x] Review residual risks 均为 F1 dormant/F9 cutover 或 static import graph
  局限，不承载核心缺口。
- [x] QA 报告 `status=passed`，failed/blocked 为 none；functional dormant seam 的
  核心路径已有实际 unit/function/Golden projection 证据。
- [x] Gate、evidence pack、DoD 均 passed；full unit 214、Golden 71 + 1
  approved skip、MCP 39、docs smoke passed。

## 4. 术语一致性

- `LocateResultV2` / `FinalizedUnsafeLocateResultV2` /
  `PublicResultAssemblerV2` / `SensitiveValuePolicyV2`：代码、design、roadmap、
  architecture 使用一致。
- `response-local ordinal ID`：固定 `evidence:v2:0001..N`；未与 v1 hash ID
  或 internal discovery hash 混用。
- `synthetic projection`：只用于 F1 test seam；未表述为 production parity。
- 禁用冲突：production package barrels、MCP、CLI、docs 无 v2 名词或 schemaVersion
  切换。

## 5. 领域影响盘点（提示而非代写）

- 新名词已作为当前架构事实回填
  `.codestable/architecture/system-repo-nav-foundation.md`。
- Requirement `source-of-truth-evidence` 的用户故事、pitch、confirmed/candidate/
  coverage 产品边界未变，不需要 CONTEXT 或 requirement delta。
- 本实现没有偏离 approved roadmap/public contract/threat model，因此无需阻塞性
  ADR delta。
- 可选候选：若未来要把“单一 public assembler + no-cutover 至 F9”提升为独立长期
  ADR，可另走 `cs-domain`；本次 acceptance 不代写。

## 6. requirement delta / clarification 回写

- `requirement: source-of-truth-evidence` 未变。
- F1 未新增用户可见 production capability，也未修改 requirement 愿景；没有
  owner-approved req delta，按 L3 governance 不自由重写 requirement。
- 结论：无 requirement delta / clarification writeback。

## 7. roadmap 回写

- [x] `.codestable/roadmap/repo-nav-public-beta/repo-nav-public-beta-items.yaml`
  中 `public-output-boundary-v2` 由 `in-progress` 更新为 `done`，feature ref 保留。
- [x] `repo-nav-public-beta-roadmap.md` F1 节同步标记 `done`。
- [x] F2–F9 状态和 F9 cutover ownership 未改变。
- [x] `validate-yaml.py` 校验通过。

## 8. attention.md 候选盘点

- 无新 attention 候选。OCR/provider 与 Windows npm shim 不是本 feature 新发现的
  通用规则。
- 可选 `cs-keep` 候选：
  1. strict object 不能替代 cross-field truth table；
  2. hostile corpus 报告必须有逐项真实 owner；
  3. dormant contract 应有可执行 no-cutover reachability gate。
- production public surface 未变，因此无需用户指南或 API 参考更新。

## 9. 遗留

- 已知限制：F1 是 dormant synthetic seam；真实 v2 MCP/CLI/stderr parity 由 F9
  atomic cutover gate 验证。
- 已知限制：no-cutover inventory 对当前相对 ESM import/export graph 有效，不等同
  完整 TypeScript module resolution。
- 环境非阻塞项：Archguard、meta-cc、OCR provider unavailable；核心 evidence
  不依赖这些 provider。
- 既有 baseline：CodeStable Doctor 仍报告 debug-cli Task-agent-review P1，
  当前 F1 已不在 finding 中。

## 10. 最终审计

- ApprovalRef：goal-state 与 feature approval report 均机械匹配
  `approval-report.md#goal-acceptance`，`approvals.goal-acceptance: approved`。
- Independent auditor：`/root/f1_goal_driver/f1_acceptance_auditor`，verdict
  `passed`，C1–C19 全部可通过。
- Re-verified：build、typecheck、v2 unit 46、v2 Golden 7、no-cutover 2、
  `git diff --check`、scope gate、package `private:true`。
- Trust-prior-verify：独立 QA / latest DoD 的 full unit 214、Golden 71 + 1
  approved skip、MCP 39、docs smoke。
- Artifact inventory：contract/policy/assembler/projection、5 个 unit owners、
  Golden、fixture/import inventory、case/forbidden/no-cutover reports、review、QA、
  acceptance、roadmap 与 architecture writeback 均在 final scope。
- Cleanliness：0 out-of-scope、0 conflict marker、0 whitespace error；无新增
  TODO/FIXME/XXX、debugger、console debug、`ts-ignore`、真实 credential、
  commit/merge/push/release/private removal。
- Knowledge writeback：architecture 与 roadmap 已同步；requirement/ADR/attention/
  public docs 均判定无需本轮写回。
- 最终 verdict：passed。
