---
doc_type: feature-design-review
feature: 2026-07-24-span-redaction-corpus-policy-v2
status: passed
review_state: passed
review_reason: current revision round 7 independent full review passed
reviewer_id: /root/review_f4_f9_current
reviewed: 2026-07-24
round: 7
---

# span-redaction-corpus-policy-v2 feature design 审查报告

## 1. Scope And Inputs

- Design：`.codestable/features/2026-07-24-span-redaction-corpus-policy-v2/span-redaction-corpus-policy-v2-design.md`
- Checklist：`.codestable/features/2026-07-24-span-redaction-corpus-policy-v2/span-redaction-corpus-policy-v2-checklist.yaml`
- Roadmap / contract：public-beta roadmap、items、public contract、threat model
- Upstream：已完成的 F1 dormant public-output boundary
- Downstream boundary：F1B/F1C/F2/F6 只作为 forward ABI owner，不属于当前 executable seam
- Final design SHA-256：`7BCEE9CAB5146B0103DE53A22467C6E7C3F6483D05B9ADD544C8BC1F85D3D0AC`
- Final checklist SHA-256：`8493DD5060AA96CFF7A6F8DEF8577AC41C82D98A0B23740BB878E531506DF5C2`

### Independent Review

- Provider：Task agent `/root/review_f4_f9_current`
- Mode：full independent read-only review
- Result：PASSED；blocking=0、important=0、nit=0
- Validation：YAML、DoD、spec governance、14/14 command parity、7/7 exact unique stable owners、`git diff --check`全部通过

## 2. Design Summary

- 当前可执行面只包含原值 span、canonical reason merge、传播资格、双 mode corpus、single materialization 与 private public-safe ranking-key。
- dormant assembler只从同次 synthetic raw input内部构建 immutable corpus；caller不能注入、删除、重排、clone或跨输入替换 corpus。
- ranking-key 是 F1A 自有 pure façade；当前只用 synthetic caller views验证，F3/F2 actual callsite明确为下游 N/A。
- forward ABI ledger仅冻结F1B guard、F1C neutral port、F2 real source/materialization adapter与F6 aggregation的后续边界。
- production v1、MCP、CLI、docs保持不可达 schema v2。

## 3. Findings

### blocking

none

### important

none

### nit

none

### suggestion

- implementation review继续把`source/runtime/type import inventory`保留为独立机读断言，防止forward ledger中的符号被当前feature误创建；该证据已在design/checklist中登记，不新增gate。

### praise

- current executable seam、stable owner table与forward ABI ledger已明确分层。
- F1B/F1C/F2/F6 future files、calls、runner与DoD均被当前source graph排除。
- Unicode、低熵传播、phone negative、placeholder稳定性和放大上界都有可证伪owner。

## 4. DAG And Ownership Closure

- items DAG：F1A只依赖F1；F1B依赖F1A；F1C依赖F1B。
- 当前stable inventory共7个group/case，fixture、assertion、runner/manifest、contract/Golden owner均为exact path、唯一且无抽象占位。
- `materialization-provenance`未来真实source/core case已从F1A当前owner、runner、命令和Required Artifacts移除。
- F3/F2 ranking callsite未被预占；当前只验收F1A投影函数本身。

## 5. Evidence Confidence Ledger

| Check | Verdict | Evidence Class | Basis |
|---|---|---|---|
| Roadmap DAG | pass | E | items依赖与current/forward分层逐项一致 |
| Span/corpus contract | pass | E | Unicode、eligibility、path/text、reason与single materialization矩阵 |
| Owner exactness | pass | E | 7/7 stable rows exact、unique、无placeholder |
| DoD commands | pass | E | design/checklist 14/14 exact |
| No-cutover | pass | C | current dormant seam与transport reverse-scope |

## 6. Residual Risk

- F1B acceptance前仍没有aggregate resource guard，因此F1A只能保持dormant/no-cutover。
- Unicode只承诺code-point boundary，不承诺grapheme-cluster segmentation。
- F4 acceptance前尚无远程跨平台blocking证据。

## 7. Verdict

- Status：passed
- Next：由`cs-epic`继续child-design batch；不进入implementation。

