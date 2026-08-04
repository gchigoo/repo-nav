---
doc_type: feature-qa
feature: 2026-07-10-candidate-evidence-policy
status: passed
tested: 2026-07-13
round: 1
---

# candidate-evidence-policy QA 报告

## 1. Scope And Inputs

- Design：`.codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-design.md`
- Checklist：`.codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-checklist.yaml`
- Review：`.codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-review.md`（Round 4，passed）
- Evidence pack：`.codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-evidence-pack.md`
- Gate results：`.codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-gate-results.json`（passed）
- DoD results：`.codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-dod-results.json`（6/6 core passed）
- Diff basis：F5 未提交完整工作区；production、test/testkit 与本 feature CodeStable 产物均在 implementation scope 内，`git diff --check` 通过。
- Baseline dirty files：none；当前 dirty 项均可归因于 F5。
- Feature type：mixed（Evidence Engine/MCP 可观察运行结果和错误语义发生变化，同时包含内部 policy/reader 能力）。
- Core evidence gate：truth table 与 false-positive 边界、单次分类互斥、预算/排列稳定性、真实 reader/ripgrep 候选扩窗、Golden 与真实 stdio MCP parity 都必须有实际运行证据；本轮全部执行。

## 2. Verification Matrix

| ID | 来源 | 核心性 | 场景 / 风险 | 证据类型 | 命令或动作 | 期望 | 结果 |
|---|---|---|---|---|---|---|---|
| QA-001 | design CMD-BUILD/TYPECHECK | supporting | production 与 tests 严格编译 | build/typecheck | `npm run build`; `npm run typecheck` | exit 0 | pass |
| QA-002 | design S1/C1-C5 | core-functional | 六类 reason、promotion、context/provenance 与 lexical negative 精确匹配 | unit/integration | `npm test -- --group candidate-truth-table --group candidate-discovery --group candidate-context --case secondary-backend-provenance-table` | exact predicates；无额外 candidate | pass，29 tests |
| QA-003 | design S2/C6-C7 | core-functional | 同 discovery occurrence confirmed 优先，只产生一个 public class/role | unit | `npm test -- --group candidate-classification --case discovery-key-mutual-exclusion` | mutual exclusion | pass，2 tests |
| QA-004 | design S3/C8-C10 | core-functional | maxCandidates、queue eviction/reentry、maxFiles 与 hit/seed permutation 不改变完整结果 | property/unit | `npm test -- --group candidate-budget --group candidate-permutation` | result/ID/reason/order 深等 | pass，6 tests |
| QA-005 | design S4/C11 | core-functional | confirmed + alias/sibling candidates + decoy exclusion 的 service/Golden 闭环 | Golden | `npm run test:golden -- --case sibling-candidate --case alias-candidate --case sibling-false-positive` | 精确候选集通过 | pass，3 tests |
| QA-006 | design S4/C11 | core-functional | 同一 pack 经真实 stdio MCP 可观察且与 service parity | MCP integration | `npm run test:mcp -- --case candidate-minimal-loop` | exact parity | pass，1 test |
| QA-007 | review focus | core-functional | 真实 ripgrep 单行 hit 扩窗；angle/type、SQL、nested/unbalanced delimiters fail closed；confirmed identity 不变；二次读取错误 typed failure | unit/integration | QA-002 所含 `candidate-discovery/context` cases | 所有正反例与 error semantics 通过 | pass |
| QA-008 | review focus | supporting | `readWindow` 居中、边缘 clamp、12 行/4 KiB、UTF-8 byte shrink、focus 保留/超限、pre-abort | reader unit | `npm test -- --group reader-limits --group reader-failures` | bounded verified window；错误不静默 | pass，6 tests |
| QA-009 | design 清洁度 | non-functional | 无 debug、临时 TODO/FIXME/XXX、注释掉实现或越界文件 | diff/static | `git diff --check`；定向 `Select-String`；scope gate | 无命中/越界 | pass |

## 3. Command Results

- `npm run build` → exit 0：TypeScript build 通过。
- `npm run typecheck` → exit 0：strict no-emit typecheck 通过。
- `npm test -- --group candidate-truth-table --group candidate-discovery --group candidate-context --case secondary-backend-provenance-table` → exit 0：29 passed，94 filtered/skipped。
- `npm test -- --group candidate-classification --case discovery-key-mutual-exclusion` → exit 0：2 passed，121 filtered/skipped。
- `npm test -- --group candidate-budget --group candidate-permutation` → exit 0：6 passed，117 filtered/skipped。
- `npm run test:golden -- --case sibling-candidate --case alias-candidate --case sibling-false-positive` → exit 0：3 passed，26 filtered/skipped。
- `npm run test:mcp -- --case candidate-minimal-loop` → exit 0：1 passed，30 filtered/skipped；真实 stdio child process 返回 exact parity pack。
- `npm test -- --group reader-limits --group reader-failures` → exit 0：6 passed，117 filtered/skipped。
- `git diff --check` → exit 0；仅有 Windows line-ending 提示，无 whitespace error。
- scope gate / DoD runner → passed；archguard 与 meta-cc provider 本机 unavailable，但不替代、也不削弱上述 core runtime evidence。

## 4. Scenario Results

- [x] QA-002 truth table / lexical 边界：pass
  - Evidence：六类映射 exact assertion；primitive/custom/generic/tuple/function parameter/angle assertion、SQL quote/comment/dollar string、nested/unbalanced container 均为 exact empty；真实 ripgrep 单行命中经扩窗产生受控 sibling。
- [x] QA-003 single classification：pass
  - Evidence：engine-level 同 occurrence confirmed/candidate 互斥；public evidence 不重复。
- [x] QA-004 bounded determinism：pass
  - Evidence：0/1/超限、queue 淘汰重入 reasons 完整、`maxFiles=1` hit 正反排列完整 `LocateResult` 深等。
- [x] QA-005/006 minimal loop：pass
  - Evidence：Golden 与 stdio MCP 都精确观察 direct confirmed、alias/sibling candidates，并排除 decoy；两 surface parity。
- [x] QA-007 confirmed/error semantics：pass
  - Evidence：focus-only 与 centered-window reader 的 confirmed 数组全量深等；二次 `FILE_UNREADABLE` 返回 typed `INTERNAL_ERROR`，limit/abort 保持各自语义。
- [x] QA-008 reader bounds：pass
  - Evidence：12 行/4 KiB、UTF-8 byte shrink、focus 不裁剪、focus 自身超限与 pre-abort 均有运行测试。

## 5. Findings

### failed

none

### blocked

none

### residual-risk

- lexical angle/type recognizer 与 12 行/4 KiB window 都采取 fail-closed；复杂比较表达式、窗口外容器或 quoted SQL identifier 可能少召回，但不会放宽为 false positive，符合 F5 设计。
- focus 与 candidate window 分两次读取，周边内容存在本地并发修改的 TOCTOU 可能；focus slice 一旦变化会阻断，当前本地只读证据场景接受该非核心风险。
- F6 前无真实 secondary backend candidate；本轮只验证了 F5 truth-table 的 ripgrep-only provenance 规则，未把未来 F6 集成冒充已完成。

## 6. Cleanliness

- Debug output：pass
- Temporary TODO/FIXME/XXX：pass
- Commented-out code：pass
- Unused imports / dead code from this feature：pass（build/typecheck + diff review）
- Out-of-scope files：pass（scope gate passed；baseline dirty none）

## 7. Verdict

- Status：passed
- Blocking QA items：none；mixed feature 的所有核心运行路径均有 unit/integration/Golden/stdio MCP 证据。
- Next：`cs-feat-accept`
