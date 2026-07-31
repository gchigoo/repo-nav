---
doc_type: feature-design-review
feature: 2026-07-24-cross-platform-ci-baseline
status: passed
review_state: passed
review_reason: current revision round 5 independent full re-review passed
reviewer_id: /root/review_f4_f9_current
reviewed: 2026-07-24
round: 5
---

# cross-platform-ci-baseline feature design 审查报告

## 1. Scope And Inputs

- Design：`.codestable/features/2026-07-24-cross-platform-ci-baseline/cross-platform-ci-baseline-design.md`
- Checklist：`.codestable/features/2026-07-24-cross-platform-ci-baseline/cross-platform-ci-baseline-checklist.yaml`
- Roadmap / requirement：public-beta roadmap、items、public contract、source-of-truth-evidence
- Code facts：current process runner N-1/exact-N behavior、runner registry separate group/case validation、test selection intersection、MCP lifecycle cases
- External facts：GitHub Actions contexts、events、hosted runner、required checks与merge queue official documentation
- Final design SHA-256：`DC0CD6D7A044F839E66773213794F683279037FD6A509A019795835BC4A7A225`
- Final checklist SHA-256：`C35637921733064DE471D80D4B52225141FBA6DECB2693F74776E865169C3C56`

### Independent Review

- Provider：Task agent `/root/review_f4_f9_current`
- Result：PASSED；blocking=0、important=0、nit=0、suggestion=0
- Validation：YAML、DoD、spec governance、`git diff --check`均通过；design/checklist命令契约17/17一致

## 2. Design Summary

- 固定 Node 22/24 × ubuntu-24.04/windows-2025/macos-15-intel 六格matrix、immutable action pins、read-only权限与九项core gates。
- 稳定 aggregate `cross-platform-required` 固定 ubuntu-24.04、`needs + always + success-only`，不checkout/setup/install；required ruleset与失败PR negative evidence属于owner action。
- 每个platform contract拥有唯一 tuple、`applicableOs`与required assertion markers；orchestrator校验runner实际passed markers，不能以exit 0伪回填。
- task reporter只从private actual-owner registry读取实际执行owner；helper不接收caller owner，orchestrator校验expected/actual后才移除private路径并生成safe report。
- safe report冻结`workflowRunId/runAttempt`、exact passed markers与evidence hashes；六格、aggregate及后续release证据必须同run/attempt/revision，拒绝跨run拼接。
- PATH-002只在Linux/macOS四格执行，PATH-003只在Windows两格执行；非适用cell不运行、不输出假passed/skipped。
- F4冻结当前N-1成功/exact-N limit基线；N/N+1新语义由F5原子修改。
- report只证明九项core outcome；PR、merge_group、push、manual revision mapping与同run外部证据分离。

## 3. Findings

### blocking

none

### important

none

### nit

none

### Review History

| Round | Verdict | 主要问题 | Closure |
|---|---|---|---|
| 1 | changes-requested | required aggregate/ruleset、N/N+1 owner、MCP mapping、cleanup/report边界不完整 | 增加stable aggregate、owner actions、F4/F5分界、manifest与strict report |
| 2 | changes-requested | shared case不能证明assertion执行；DoD placeholder/doctor core；merge_group revision缺失 | 唯一tuple+actual marker attestation、真实命令路径/non-core doctor、四event mapping |
| 3 | passed | applicability与merge-group payload focused closure后无finding | `applicableOs`覆盖证明；冻结`sourceSha == github.sha == merge_group.head_sha` |
| 4 | changes-requested | caller可伪造actual owner，safe report缺少同run/attempt与exact hash闭合 | 加入private actual-owner registry、reporter-derived owner、safe report run/attempt与hash协议 |
| 5 | passed | none | 全量独立复审确认provenance、anti-splice、owner exactness及命令契约均闭合 |

## 4. User Review Focus

- 远程六格、main required check、失败PR不可merge与live merge-queue状态仍需owner授权后取证。
- F5 admission要求F4 acceptance真实完成；design passed本身不等于远程gate已落地。
- implementation必须保留normal/fault/harness cleanup三种保证边界，不把test-only cleanup冒充production。

## 5. Evidence Confidence Ledger

| Check | Verdict | Evidence Class | Basis |
|---|---|---|---|
| Matrix/aggregate | pass | E | deletion/relaxation mutations与required action |
| Executable mapping | pass | E | exact tuple/applicability/marker equality与private actual-owner provenance |
| Revision evidence | pass | E | workflowRunId/runAttempt/revision与evidence hashes anti-splice协议 |
| DoD commands | pass | E | real paths，doctor non-core |
| Scope | pass | C | F4不改production runner或release metadata |

## 6. Residual Risk

- Hosted runner labels/action pins会随时间需要独立升级review。
- owner未授权远程动作前只能保持design-ready，不能宣称matrix/ruleset已生效。
- 全局doctor仍有无关旧feature P1，已隔离为non-core诊断。

## 7. Verdict

- Status：passed
- Next：保持 design `draft`，返回 `cs-epic` 继续 child design batch；不进入实现。
