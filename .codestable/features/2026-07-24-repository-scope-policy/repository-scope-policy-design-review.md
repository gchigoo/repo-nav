---
doc_type: feature-design-review
feature: 2026-07-24-repository-scope-policy
status: passed
review_state: passed
review_reason: round 2 full independent review passed with no remaining findings
reviewer_id: /root/review_f4_f9_current
reviewed: 2026-07-27
round: 2
---

# repository-scope-policy feature design 审查报告

## 1. Scope And Inputs

- Design：`.codestable/features/2026-07-24-repository-scope-policy/repository-scope-policy-design.md`
- Checklist：`.codestable/features/2026-07-24-repository-scope-policy/repository-scope-policy-checklist.yaml`
- Design SHA-256：`12F70D7044F7CBFFAFBDCDEA6FD000B8C4C6AC8754736CA7CEDC20E0EE736BF7`
- Checklist SHA-256：`C62AC314ACA9E3C81CD02405DEB3272D8AD239BDBC4BEF450A3DD8B3802AE7C7`

### Independent Review

- Status：passed
- Detection：independent-agent
- Provider / agent：`/root/review_f4_f9_current`
- Review mode：Round 2 full independent re-review
- Raw verdict：PASSED；Blocking `0` / Important `0` / Nit `0`
- Hash drift：none
- Gate effect：feature design review gate satisfied

## 2. Design Summary

F7 在 F4 admission 之后建立 repository scope policy：冻结 scope precedence、filesystem/repository eligibility、typed scope outcome，并把 scope contribution 纳入 F6 request-outcome 聚合。F7 不切换 public v2，不依赖 F8 的任何 concrete capability case。

## 3. Findings And Closure

### blocking

Round 1 曾有 2 项，Round 2 均确认关闭：

1. F7 revision 后的 F6 current tuple 已精确冻结为
   `[PublicMaterializationContributionV2, SnapshotOutcomeContributionV2, ScopeOutcomeContributionV2]`。
   owner/order/index 分别为 `public-materialization/0`、`snapshot-observation/1`、`scope/2`；
   missing、extra、duplicate、reorder、clone、cross-execution 与 source-proof swap 都在读取值前拒绝。
2. 19 个 Stable ID 均有唯一 exact group/case、fixture、assertion、runner/manifest 与 contract/Golden owner；
   scenario/owner/case 均为 `19/19` unique，missing、extra、ambiguous 均为 `0`。

### important

Round 1 曾有 1 项，Round 2 确认关闭：

1. 当前批次已移除未来 F8 concrete case/type/accessor/import/fixture/check/artifact/placeholder。
   仅保留非可执行 forward ABI ledger；未来 index `3` 当前没有可调用 slot。

### nit

none

### suggestion

none

### learning

- 未来 contribution slot 只能以非可执行 ledger 表达；一旦出现 concrete case/type/owner，就已经越过子功能边界。

### praise

- scope fold 的 precedence、identity、source proof 与 failure order 同时冻结，避免了只锁类型却未锁真实贡献来源。

## 4. Cross-Cutting Review

- scope precedence：`test > docs > longest explicit prefix > leftmost ordinary segment > unknown`
- F4 admission/revision binding：passed
- F3/F2/F6/F8 typed seam and ownership：passed
- atomic scope fold / coverage / failure order / fail-closed：passed
- production v1 / no-cutover until F9：passed
- roadmap / public contract / compatibility / threat model consistency：passed
- F7 acceptance 时同步 contract/architecture：已列为 blocking required action

## 5. Mechanical Evidence

- strict checklist YAML validation：passed
- literal DoD gate：passed，blocking/warnings 均为空
- spec governance：`OK: True`
- checklist command parity：`16/16`
- Stable owner inventory：`19/19`
- checklist IDs：`91/91` unique
- future concrete F8 symbol scan：`0`
- `git diff --check`：passed

## 6. User Review Focus

- F7 只修订 F6 current 三项 tuple；未来 capability index `3` 仍是不可执行 ledger。
- scope policy 只产生 typed contribution，不绕过 F4 admission，不直接投影 public v2。
- production 继续 v1；真正的 projector edge 切换只属于 F9。

## 7. Evidence Confidence Ledger

- `confirmed`：Round 1 的 2 blocking + 1 important 全部关闭。
- `confirmed`：独立 reviewer 以当前哈希完成完整横切复审，文件无漂移。
- `confirmed`：所有机械门禁通过。

## 8. Residual Risk

- exact contract paths 尚未实现；实现阶段仍需按 owner inventory 落地并运行对应 evidence。
- F7 acceptance revision 必须同步 roadmap/public contract/architecture 中的 current tuple 描述。

## 9. Verdict

- Status：passed
- Blocking：0
- Important：0
- Nit：0
- Next：允许 ChildDesignBatch workflow 将该 child 标记为设计通过；不得据此提前进入 runtime implementation

## 10. Focused Closure

not applicable；Round 2 已完成 full independent re-review。
