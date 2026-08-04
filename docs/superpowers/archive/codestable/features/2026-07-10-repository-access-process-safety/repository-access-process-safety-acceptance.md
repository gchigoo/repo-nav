---
doc_type: feature-acceptance
feature: 2026-07-10-repository-access-process-safety
status: passed
accepted: 2026-07-13
round: 1
---

# repository-access-process-safety 验收报告

> 阶段：阶段 3（验收闭环）
> 关联方案：`repository-access-process-safety-design.md`

## 1. 接口契约核对

- [x] `RepositoryAccessErrorCode` 10 个封闭 codes、固定非敏感 message与 optional relativeFile和 design 2.1一致。
- [x] `RepositoryReader` 保持 roadmap/F1 Promise port；`NodeRepositoryReader` 由 `REPOSITORY_READER` 的 `useExisting` 挂载。
- [x] `SafeProcessRequest/Result/Runner` 与 design 示例一致；数值/字符串/argv/env budgets由 Zod在 spawn前校验。
- [x] invalid-request/spawn-error固定 null exit/signal与空 outputs；其他 spawned failures保留 bounded raw bytes。
- [x] 流程图的 resolve→realpath→containment→open/fstat→bounded read→close，以及 validate→spawn→capture→terminate tree→close均有代码落点。

## 2. 行为与决策核对

- [x] root/path/file-type防线：absolute/parent/non-normalized/junction escape被 typed rejection；root内 `..foo` 不误判。
- [x] reader limits：file bytes独立 code，excerpt bytes/lines统一折叠，binary/malformed UTF-8/range/abort可区分，handle settle前关闭。
- [x] process安全：`shell:false`、controlled env、argv boundary、独立 stdout/stderr pipes与 exact raw-byte caps。
- [x] cleanup：abort/timeout/stdout/stderr cap清理 direct+descendant；termination API全失败有固定 deadline invariant rejection；一次 settle与迟到 events有证据。
- [x] 下游 failure ownership无冲突：F2 实现 source-side typed emission；service/engine动作仍属于后续 feature，不在本轮伪造未存在的 engine。
- [x] 明确不做：未新增 search backend、classification/status/redaction、MCP/HTTP/LLM/persistence。
- [x] 挂载点反查：公共 contract exports、EvidenceModule reader provider、RepositoryBackendsModule runner class token、test registry/fixtures均在 design 2.3清单范围。
- [x] 拔除沙盘：移除上述 exports/providers/tests即可卸载 F2；fail-closed evidence service与 frozen empty backend collection仍可独立存在。

## 3. 验收场景核对

- [x] S1 repository safety：QA 5 filesystem tests passed。
- [x] S2 reader resources/failures：QA 4 reader tests + abort cleanup passed。
- [x] S3 process contract/isolation：QA 6 helper-process tests passed。
- [x] S4 cancellation/tree cleanup：QA 6 cleanup tests passed，含真实 PID inventory与 synthetic all-denied invariant。
- [x] Review Test And QA Focus：REV-001..003全部 resolved；exact caps、合法点前缀、termination failure/late events均覆盖。
- [x] QA evidence：`repository-access-process-safety-qa.md` status passed；failed/blocked none。
- [x] Evidence/DoD/Gate：scope、5 core commands、evidence pack均 passed；provider unavailable 已解释。
- [x] Feature性质：非用户可感 safety foundation；无 browser/API入口，真实 filesystem/process integration是直接且充分的替代证据。

## 4. 术语一致性

- Repository root / RepositoryReader / SafeProcessRunner / typed failure在 design、代码与 architecture中一致。
- 代码未引入与第 0/2.1节冲突的第二套 reader/process/error概念。
- `PATH_OUTSIDE_ROOT`、limit codes与 process failure kinds均由唯一公开 contract导出。

## 5. 领域影响盘点

- [x] `.codestable/architecture/system-repo-nav-foundation.md` 已更新为 F2 当前状态：真实 reader、process runner、providers、resource lifecycle与跨平台支持模型。
- [x] 新术语已进入 architecture 术语节；如需长期领域 glossary，roadmap收尾建议 `cs-domain` 统一归并。
- [x] 结构性选择候选：canonical containment、所有 CLI 统一 SafeProcessRunner、termination invariant deadline。符合 ADR候选价值，但 acceptance不代写 ADR；建议 roadmap收尾用 `cs-decide/cs-domain` 归档。

## 6. requirement delta / clarification 回写

- Requirement `source-of-truth-evidence` 保持 `draft`。
- F2 是 non-functional safety foundation，没有完成 requirement 的用户故事、pitch或 capability boundary；不存在 owner-approved req delta，不把 draft虚假升级为 current。
- 真实 locate capability落地并有 approved delta后再登记 `implemented_by`。

## 7. roadmap 回写

- [x] `repo-nav-mvp-items.yaml` 的 F2 状态已由 `in-progress` 改为 `done`。
- [x] roadmap主文档 F2 状态已同步 `done`，Acceptance Coverage Matrix命令已同步为实际 runner groups/case。
- [x] `goal-state.yaml` F2 为 `accepted`，`current_feature_index: 2`。
- [x] `goal-features/repository-access-process-safety.md` frontmatter为 `accepted`。

## 8. attention.md 候选盘点

- 候选：Windows ESM `--import` 的绝对 loader path必须转为 `file://` URL；后续 helper fixtures可能重复踩到。
- 本轮不直接改 attention；roadmap文档整理阶段由 owner决定是否通过 `cs-note` 收录。
- 其他知识出口：Node ChildProcess spawn/error/close时序、tree kill failure deadline与Windows taskkill/POSIX process-group约束适合 `cs-keep/cs-decide`。

## 9. 遗留

- POSIX detached process-group/negative PID/EPERM未在当前 Windows环境实机验证。
- Reparse swap TOCTOU依赖 local stable filesystem支持模型；Windows ADS与真实 unreadable/special device fixture有限。
- SafeProcessFailureSchema后续可收紧 invalid-request/spawn-error 的 kind-specific runtime invariants。
- 首个真实 backend仍需把 frozen empty `useValue`演进为 factory、有序/frozen assembly并加顺序 tests。

## 10. 最终审计

- 验证来源：passed review round 3、passed QA round 1、evidence pack、DoD results与scope gate。
- 聚合命令：build/typecheck、38 unit、6 Golden、6 MCP及3组精确DoD全部 exit 0。
- 场景复核：re-verified 12 / trust-prior-verify 0。
- 交付物：typed contracts、reader/runner adapters、Nest providers、filesystem/process fixtures/tests、review/QA/evidence、architecture、roadmap/goal-state均真实落盘。
- 完整工作区：tracked/untracked/staged均纳入scope；staged none；无feature外dirty归因。
- 清洁度：scope gate无blocking/warnings；`git diff --check`通过；临时 marker命中仅为spec中的规则文字。
- 知识出口：architecture已机械回填；ADR/attention/learning候选已登记但未越权写入长期决策或用户记忆。
- 结论：通过；C1-C12全部 `passed`，无核心 residual gap。
