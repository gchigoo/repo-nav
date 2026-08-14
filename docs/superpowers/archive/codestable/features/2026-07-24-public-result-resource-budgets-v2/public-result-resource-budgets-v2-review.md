---
doc_type: feature-code-review
feature: 2026-07-24-public-result-resource-budgets-v2
status: passed
reviewer: subagent
round: 1
reviewed: 2026-07-28
lane_a_state: completed
lane_a_ref: ""
lane_a_reason: ""
lane_b_state: not-started
lane_b_ref: ""
lane_b_reason: ""
---

# public-result-resource-budgets-v2 代码审查报告

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-design.md`（`status: approved`）
- Checklist: `.codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-checklist.yaml`（S1–S5 `done`；C1–C33 仍 `pending`，留给 acceptance）
- Evidence pack: `.codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-evidence-pack.md`
- Gate results: `public-result-resource-budgets-v2-gate-results.json`（`passed`，blocking 空）
- DoD results: `public-result-resource-budgets-v2-dod-results.json`（core 命令 exit 0）
- Scope gate: `public-result-resource-budgets-v2-scope-gate.json`（`passed`）
- Architecture check: `public-result-resource-budgets-v2-architecture-check.md`（no-change）
- Implementation evidence: memory-bank `f1b-resource-budgets-impl.md` + DoD 命令日志
- Diff basis: F1B 可归因改动为 contract leaf / guards / assembler 接线 / schema refine / F1B fixtures+spec / runner-registry；工作区另有 cross-platform-ci 与 `dist/` 等 ambient dirty，不计入本轮 verdict
- Review mode: initial（Lane A independent subagent）
- Baseline dirty files: `.github/workflows/cross-platform-ci.yml`、`.codestable/features/2026-07-24-cross-platform-ci-baseline/*`、`dist/**` 等非 F1B 范围

### Independent Review

- Detection: 本报告由独立 Task agent（Lane A）产出；OCR Lane B 未在本 subagent 职责内启动
- 环节 A 独立隔离 Task agent: independent-agent + completed
- 环节 B OCR CLI: not-started
- OCR severity mapping: High→blocking/important, Medium→nit/suggestion, Low→discarded
- Merge policy: 本文件为 Lane A findings；主 agent 合并 Lane B 前不得把 OCR 未跑伪装为 `subagent+ocr`
- Gate effect: `reviewer: subagent` 满足下游默认独立审查锚点；若主流程要求 OCR，需补跑后再升格

## 2. Diff Summary

- 新增：`src/contracts/v2/locate-result-resource-budget-contract-v2.ts`；`src/evidence/public-output/result-resource-budget-guards-v2.ts`；`test/unit/public-result-resource-budgets-v2.spec.ts`；`testkit/fixtures/public-output-v2/{resource-budgets,corpus-resource-budgets,public-field-resource-budgets,serialized-resource-budget,maximum-structure,resource-budget-ordering,resource-budget-projection,resource-budget-legacy-isolation}-v2.ts`
- 修改：`src/contracts/v2/locate-result-v2.ts`（共享 leaf 常量 + UTF-8/count refine）；`src/evidence/public-output/public-result-assembler-v2.ts`（preflight→Zod→corpus→field→serialized）；`testkit/runners/runner-registry.ts`；`test/unit/public-output-v2-no-cutover.spec.ts` + no-cutover fixture
- 删除：none
- 未跟踪 / staged：上列新增文件多为 untracked；assembler/schema 为 modified
- 风险热点：UTF-8/compact-JSON 精确计量、fail-closed 顺序、detail leak、dormant 无 cutover；无 production transport 改动

## 3. Adversarial Pass

- 假设的生产 bug：预算检查自身在 abort-at-N+1 前被超大 dense array 的 ownKeys 预校验拖垮；或 corpus 总字节上限缺少边界用例导致回归静默失效
- 主动攻击过的反例：
  - design 顺序：assembler 已按 shallow preflight → deep Zod → corpus → field budget → public Zod → 1MiB serialized
  - poison/accessor：count>20 不读 element；file accessor 在 descriptor gate 拒绝且 getterCalls=0
  - 400k `"x "` excerpt：整字段 oversized，非 token 旁路
  - aggregate failure：统一 `INTERNAL_ERROR`，projection forbidden marker 覆盖
  - no-cutover：production roots 不可达 v2；public-output 无 F1C/F2/F6 owner 标记
  - corpus 32KiB N/N+1：实现有 `recomputed > maxTotal` 分支，但无 32767/32768/32769 owner 用例
  - compact counter：`countArray` 在计字节前完整扫描 ownKeys，缺 length-vs-budget short-circuit
- 结果：后两项升级为 important；其余未发现 blocking 行为错误

## 4. Findings

### blocking

none

### important

- [ ] REV-001 `test/unit/public-result-resource-budgets-v2.spec.ts`（F1B-CORPUS-001）corpus 累计 UTF-8 总预算缺少 32767/32768/32769 N/N+1 owner
  - Evidence: design §3.1 F1B-CORPUS-001 与 checklist C11 要求重算 total 的 N/N+1；`guardSensitiveCorpusBudgetV2` 含 `recomputed > maxTotalUtf8Bytes` 分支，但 unit/fixture 全库无 `32767|32768|32769` 断言；现有用例只覆盖 entry 8–512、count 128/129、derived mismatch
  - Impact: 32KiB aggregate 回归可静默丢失而 DoD 仍绿，削弱 hardened 预算合同的验收可信度
  - Expected fix scope: 补 expanded corpus 总字节 N/N+1（及可选 32767）fixture+断言；不改冻结常量

- [ ] REV-002 `src/evidence/public-output/result-resource-budget-guards-v2.ts:209-284` compact JSON counter 缺少相对 `maxUtf8Bytes` 的 array length short-circuit
  - Evidence: design §1 Top risk 写明「bounded counter、array length short-circuit」；`countArray` 先 `Reflect.ownKeys` 全量校验再 abort-at-N+1 计字节。dormant success 路径有 20/20/40 前置，但 `{ok:false}` 仅跑 4MiB compact guard，且 `guardCompactJsonDataV2` 是 F6 forward ABI
  - Impact: 超大 dense array 可使预算检查自身付出 O(n) CPU/内存，偏离 Security=hardened 对“检查器自伤”的缓解
  - Expected fix scope: 在接受的 JSON-data 子集内，按元素最小可序列化下界对 `length` 做 fail-closed short-circuit；保持 accepted subset 与 stringify parity

### nit

- [ ] REV-003 `test/unit/public-result-resource-budgets-v2.spec.ts` F1B-TERM-001 总字节矩阵用 9×114=1026 代替精确 1025；path segments 仅断言 129 失败、未显式 127/128 通过
- [ ] REV-004 public field N/N+1 用例以 ASCII `.length` 为主，design 要求的多字节 field 边界覆盖偏弱（leaf/raw 已有 CJK/emoji）
- [ ] REV-005 F1A `CORPUS_ENTRY_BYTES_MIN/MAX_V2` 与 F1B leaf `corpus.min/maxEntryUtf8Bytes` 双源同值；长期有漂移风险（本轮未改 F1A 属预期，acceptance 可记 residual）

### suggestion

- [ ] REV-006 `{ok:false}` preflight 可考虑与 success 对称的浅层 shape 上限，进一步降低仅依赖 4MiB counter 的敌对输入面（非当前 design 必达）

### learning

- dormant assembler 将 `input` 改为 `unknown` 并先 descriptor-safe shallow gate，是正确的安全边界姿势；schema refine 复用同一 leaf 形成 defense-in-depth，且 failure 不回传 `stage`。

### praise

- poison-tail / accessor getterCalls=0 / Proxy fail-closed / key permutation determinism 证据链完整
- public field oversized → PATH/BINARY placeholder、`resolvable=false`、一次 `LOCATION_REDACTED`、ordinal 不重排，与 design 语义对齐
- no-cutover import inventory 与 F1C/F2/F6 marker 扫描把 forward ABI 冻在 synthetic `guardCompactJsonDataV2(..., 16KiB)`，未提前创建未来 caller

## 5. Test And QA Focus

- QA 必须重点复核：
  - 补跑或手工构造 corpus total 32767/32768/32769（关闭 REV-001）
  - `guardCompactJsonDataV2` 对接近/超过 cap 的 dense array 的耗时与 fail-closed（关闭或接受 REV-002）
  - checklist C1–C33 逐条（尤其 C3/C4/C9/C11/C17/C18/C23/C26/C32/C33）
  - maximum-structure headroom 报告值为正且未调常量
  - legacy isolation：各 v2 failure stage 后 v1 engine bytes 不变
  - projection forbidden scan：无 stage/bytes/path/raw
- Evidence pack residual risks / gate warnings：evidence pack 写 `none`；provider archguard/meta_cc unavailable 已记录，不阻塞本 feature
- 建议新增或加强的测试：corpus aggregate N/N+1；可选 counter length short-circuit mutation；public field 多字节 N/N+1
- 不能靠 review 完全确认的点：真实 F1A collector 在极端双 mode 展开下是否能打到 32KiB 边界（需 QA fixture）；F6 将来以 16KiB 调用 forward ABI 时的敌对数组成本

## 6. Residual Risk

- F1B 仅 dormant shadow；production 无 v2 edge，REV-002 的现实利用面限于测试/未来 F6 接线前
- F1A/F1B corpus entry 常量双源（REV-005）需在后续 child 或 neat 时收敛
- 工作区存在非 F1B ambient dirty；QA/acceptance 对账时继续以 scope-allow 为准，避免夹带

## 7. Verdict

- Status: passed
- Blocking: 0
- Important: 2（REV-001, REV-002）
- Next: Goal lane → `cs-feat` QA；建议 QA 优先关闭 REV-001，并明确 REV-002 修复或写入 acceptance residual。无 blocking，不强制 review-fix

## 8. Focused Closure（无则写 none）

none
