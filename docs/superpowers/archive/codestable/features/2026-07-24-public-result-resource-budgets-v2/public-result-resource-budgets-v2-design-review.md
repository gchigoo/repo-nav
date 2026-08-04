---
doc_type: feature-design-review
feature: 2026-07-24-public-result-resource-budgets-v2
status: passed
review_state: passed
review_reason: round 6 full independent review passed with no remaining findings
reviewer_id: /root/review_f4_f9_current
reviewed: 2026-07-27
round: 6
---

# public-result-resource-budgets-v2 feature design 审查报告

## 1. Scope And Inputs

- Design：`.codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-design.md`
- Checklist：`.codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-checklist.yaml`
- Design SHA-256：`45FBEC5630A819E857E7129D9FED40B79A0F992D36F3D4265578A2DE74824188`
- Checklist SHA-256：`1DBB92D90314254EFB4901653C9C91C4D8628635360DD7F0241C06F19C25F4F8`
- Roadmap / contract：public-beta roadmap、items、public contract、compatibility、threat model、roadmap review
- Requirement / architecture：`source-of-truth-evidence`、`system-repo-nav-foundation`
- 相邻设计：F1A span/corpus、F1C canonical bridge、F2 ranking/materialization、F6 request outcome
- 当前代码事实：`locate-result-v2.ts`、`public-result-assembler-v2.ts`、`sensitive-value-policy-v2.ts`、`synthetic-locate-projection-v2.ts`

### Independent Review

- Status：passed
- Detection：independent-agent
- Provider / agent：`/root/review_f4_f9_current`
- Review mode：Round 6 full independent read-only re-review
- Raw verdict：PASSED；Blocking `0` / Important `0` / Nit `0`
- Merge policy：逐项以当前 design/checklist、横向契约、相邻设计和源码事实复核
- Hash drift：none
- Gate effect：feature design review gate satisfied；不等于 design owner approval，也不授权 implementation

## 2. Design Summary

- F1B 当前交付只包含无依赖 budget contract leaf、bounded compact JSON guard、current source/public schema refinements，以及 dormant assembler 的 source/corpus/public-field/serialized 四层接入。
- 当前顺序冻结为 shallow count/type → raw field/segment → source 4 MiB → current strict source parse → F1A corpus/aggregate → single materialization → public-field budgets → current composition/public strict parse → serialized 1 MiB；aggregate failure 只影响 dormant v2 shadow。
- `guardCompactJsonDataV2` 是唯一允许后续 deep module 复用的参数化 internal guard；private counter、partial bytes 和 traversal state 不对 caller 暴露。
- 单字段 N+1 使用 whole-field replacement；source、corpus 和 serialized aggregate N+1 统一映射固定 safe `INTERNAL_ERROR`，禁止截断、删尾、重排或重新分配 ordinal。
- production package/service/MCP/CLI/docs 在 F9 前继续只输出 schema v1。

## 3. Findings

### blocking

none

### important

none

### nit

none

### suggestion

- bounded counter 的 accepted subset 保持当前最小闭合集；若实现需要扩大 Proxy、exotic object 或自定义 serialization 支持，必须返回 design/design-review，不在 implementation 中静默放宽。

### learning

- forward ABI 应冻结“谁在何阶段调用已验收 guard”，而不是由 guard owner预先创建未来 stage、caller 或业务 proof。这样既能复用安全算法，也不会把 DAG 的下游 owner 反向拉入当前 source graph。

### praise

- current dormant integration 与未来 real execution 调用边已明确分离，避免 F1B 因 forward ABI 形成 F1C/F2/F6 反向依赖。
- maximum fixture、poison tail、derived total、whole-field replacement、legacy isolation与no-cutover均有可证伪场景和exact owner。

## 4. Forward ABI、DAG And Ownership Closure

### 4.1 Forward ABI ownership

- **F2 owns real source stage**：F2 从 ranking 与 F3 proof 构造 real `UnsafePublicMaterializationSourceV2`，在只允许的opaque token/container identity检查后，把 F1B shallow count/type、raw field/segment、4 MiB guard作为第一项 element-aware preflight；通过后由 F2 自己执行 strict source schema 与 exact ranking pairing。
- **F6 owns request raw / outcome**：F6 的 raw request boundary调用
  `guardCompactJsonDataV2(input, 16 * 1024)`，并独占 backend/request-outcome 聚合；aggregator只接收已经由 F8 exact wrapper经 F2 no-source accessor验证的 materialized core，F6 不导入 materialization token或core accessor。
- **F1C owns neutral/public tail seam**：F1C只登记 neutral source/materialization/aggregation token，并在 owner complete 后执行 materialized composition、public strict parse和 F1B serialized guard seam；F1C不拥有或实现 real source、source preflight、source schema或strict source pairing。
- **F1B remains dormant-only in this delivery**：design/checklist不创建 F2/F1C/F6 caller、owner文件、case、runner、token、runtime/type import或canonical envelope；未来符号只存在于非可执行 ownership ledger。

以上分工与 public contract、F1C/F2/F6 相邻设计逐项一致；没有第二 source/preflight/schema owner，也没有让 F6 接受未验证 raw materialization。

### 4.2 DAG

- items 共 12 项，slug 唯一、依赖均存在、DAG 无环。
- F1B 只依赖 F1A；F1C 依赖 F1B。F1B implementation admission只等待 F1A acceptance，不等待或调用 F1C/F2/F6。
- 唯一 `minimal_loop=true` 为 F1B；完成含义仅是 F1 + F1A + F1B dormant public-boundary 最小安全闭环，不授权 real envelope或production cutover。

### 4.3 Stable case ownership

- §3.1 有 13 个唯一 Stable scenario ID；Acceptance Coverage Matrix 为 13/13，无 missing/extra。
- 13 个场景映射到 10 个唯一 executable group/case；§3.2 为 10/10 提供 exact fixture、assertion、runner/manifest与contract/Golden owner。
- 10 个 case 均唯一；所有 owner cell 都是明确 repo-relative path，无“同上”、`existing`、动态发现或抽象 placeholder。
- coverage 命令引用的 10 个 case 与 owner inventory 完全相等；unknown case failure和registry/manifest owner已冻结。

## 5. Contract And Code-Fact Consistency

- Roadmap/public contract的预算常量与本设计完全一致：16 terms、20/20/40 evidence、raw 4 MiB、corpus 128/32 KiB/8–512、public fields 128/2048/2048/2048、serialized 1 MiB。
- Threat model T7 的 guard-before-deep-Zod/full-stringify/corpus、aggregate fail-closed与N+1要求均有场景、step、check和命令 owner；T13 no-cutover由专门case及MCP/docs回归覆盖。
- Compatibility继续把 F1B 定位为cutover前预算硬化，并维持 F9 原子切换；本设计未创建第二公共输出。
- 当前源码事实与“现状”一致：assembler先执行 deep `FinalizedUnsafeLocateResultV2Schema.safeParse`再收集corpus；现有policy只有2 KiB token/field规则；synthetic projection对parsed result使用compact `JSON.stringify`。
- architecture仍只记录已落地 F1 dormant事实；design把 F1B acceptance后的architecture update/no-change核对列为blocking action，没有把未来状态提前写成现状。

## 6. Mechanical Evidence

- strict checklist YAML：passed
- Design DoD contract gate：passed；`blocking=[]`、`warnings=[]`
- spec governance：`OK: True`
- design/checklist DoD command parity：14/14 exact，包含 command、core与failure handling
- checklist：5/5 steps pending且ID唯一；33/33 checks pending且ID唯一
- DAG：12项唯一、0 cycle、F1B dependency/feature pointer/minimal-loop exact
- owner inventory：13/13 scenario coverage；10/10 unique exact executable cases；0 missing/extra/abstract owner
- concrete future caller/owner path scan：0 current-delivery hit
- `git diff --check`：passed

## 7. Evidence Confidence Ledger

| Check | Verdict | Evidence Class | Basis | Follow-up |
|---|---|---|---|---|
| Acceptance Coverage Matrix | pass | E | 13/13 Stable ID均映射到step、evidence与literal command | implementation保持case ID不漂移 |
| DoD Contract | pass | E | 五阶段DoD、14条命令、actions与artifacts完整 | 按失败处理执行 |
| Steps and checks traceability | pass | E | 5 steps、33 checks均pending且可回到design scenario/section | implementation逐项写回 |
| Roadmap contract compliance | pass | C | roadmap/items/public contract/compatibility/threat与相邻设计横向一致 | Epic统一owner确认仍是独立gate |
| Module interface design | pass | C | current guards与F2/F6/F1C forward owner边界及源码现状互证 | 下游child独立复审真实调用边 |
| Validation and artifacts | pass | E | 14/14命令、Required Actions、artifact/owner inventory完整 | F1A done后再做implementation preflight |

Summary：E=4，C=2，H=0；H-only core checks=none。

## 8. User Review Focus

- 用户统一 review 需要重点拍板：冻结预算值、aggregate fail-closed、whole-field replacement与F9前no-cutover保持不变。
- implementation必须重点遵守：F1A acceptance admission、first element-aware preflight、private counter、current-only dormant wiring，以及不得创建 F2/F1C/F6 caller。
- code review / QA / acceptance必须重点复核：maximum fixture headroom、poison tail零element-read、F1A derived-total重算、legacy exact-reference/bytes isolation和完整changed-path scope。

## 9. Residual Risk

- F1A 尚未accept前，F1B不得进入implementation；F1A实际拆分后的文件布局与corpus API需在preflight重新核对。
- 4 MiB/1 MiB headroom仍需由implementation的唯一maximum structure fixture实测；若不足只能回roadmap重新决策。
- container Proxy的必要prototype/descriptor/length traps可能执行；异常必须fail closed，当前合同不承诺零trap或支持exotic object。
- F4 acceptance前仍没有远程 Node 22/24 × Windows/Linux/macOS blocking matrix；F1B本地证据不能替代后续跨平台gate。

## 10. Verdict

- Status：passed
- Blocking：0
- Important：0
- Nit：0
- Next：保持 design `draft`，返回 `cs-epic` ChildDesignBatch 统一 owner review；本报告不批准 design、不进入 implementation、不执行 commit。

## 11. Focused Closure

none；本轮是 forward ABI ownership 实质修订后的 Round 6 完整独立复审。
