---
doc_type: feature-qa
feature: 2026-07-10-mvp-golden-regression-suite
status: passed
tested: 2026-07-13
round: 1
---

# mvp-golden-regression-suite QA 报告

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-design.md`
- Checklist: `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-checklist.yaml`
- Review: `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-review.md`，round 3 `passed`
- Evidence pack: `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-evidence-pack.md`
- Gate results: scope gate `passed`
- DoD results: 7/7 `passed`
- Diff basis: review-fix 后当前 F8 完整 diff；QA 前仅新增/刷新 review 与 evidence 文档，无实现代码变化
- Baseline dirty files: none
- Feature type: non-functional
- Core evidence gate: 本 feature 只增强 test/testkit/runner/evidence，不修改 production `src` 行为，因此无需 browser/API/user e2e。替代证据为 build/typecheck、shared evaluator mutation、真实 MCP stdio/lifecycle integration、full unit/Golden/MCP、schema/snapshot/completeness、synthetic correctness/performance 与 scope/cleanliness gates。

## 2. Verification Matrix

| ID | 来源 | 核心性 | 场景 / 风险 | 证据类型 | 命令或动作 | 期望 | 结果 |
|---|---|---|---|---|---|---|---|
| QA-001 | DoD CMD-BUILD/TYPECHECK | non-functional | TypeScript/build 可消费新增 contracts/runners | build/typecheck | `npm run build`; `npm run typecheck` | exit 0 | pass |
| QA-002 | design S1/C1-C4 | non-functional | shared evaluator 精确捕获 projection 与 deliberate mutations | function | evaluator DoD command | success/error 共用；8 tests passed | pass |
| QA-003 | design S2/S3/S5/C5-C6 | non-functional | family/code completeness 不能名称自证 | integration/schema | families + completeness + unrelated owner mutation | families 46；无关 owner 必须失败 | pass |
| QA-004 | design S4/C2/C7 + review focus | supporting | production protocol 与真实 Nest/process-tree shutdown | integration | MCP protocol+lifecycle | 37 active passed；context/PID/timeout/nonzero 清理通过 | pass |
| QA-005 | design S5/C12 | non-functional | 聚合入口没有漏注册或交叉回归 | regression | unit/Golden/MCP `--all` | 158/158；64+1 intentional skip；39/39 | pass |
| QA-006 | design S6/C8-C10 | non-functional | fixed synthetic corpus correctness、趋势报告、cleanup | performance/function | performance DoD command + report inspection | config/hash/5 runs stable；cleanup true；timing non-blocking | pass |
| QA-007 | checklist cleanliness/C11 | non-functional | 无 debug/TODO/方案外文件 | diff/gate | scope gate、`git diff --check`、marker scan | 无 blocking/warnings/hits | pass |
| QA-008 | design C3/C9/C12 | non-functional | snapshots/baseline/runtime artifacts 可追溯且不互相覆盖 | schema/diff/manual | inventory + hash + paths inspection | 23/23 pairs；runtime gitignored；baseline committed path unchanged | pass |

## 3. Command Results

- `npm run build` → exit 0：build passed。
- `npm run typecheck` → exit 0：strict typecheck passed。
- `npm run test:golden -- --case manifest-evaluator --case evaluator-negative-self-test` → exit 0：8 passed。
- `npm run test:golden -- --group classification --group candidate --group backend-transitions --group security --group final-status` → exit 0：46 passed，19 selection/conditional skips。
- `npm run test:mcp -- --group protocol --group lifecycle` → exit 0：37 passed，2 selection skips；含 5 个 cleanup probe cases。
- `npm run test:golden -- --case fixture-completeness && npm run test:golden -- --all && npm run test:mcp -- --all` → exit 0：completeness 2 targeted passed；full Golden 64 passed + 1 intentional case guard skip；full MCP 39 passed。
- `npm run test:golden -- --case large-synthetic-repository --report-performance` → exit 0：5 个 projection hash 一致，runtime report schema-valid。
- `npm test -- --all` → exit 0：158/158 unit passed，含 process cleanup 6/6。
- `git diff --check` + TypeScript marker scan → exit 0：无 whitespace error、TODO/FIXME/XXX/debugger/console.log。
- `codestable-scope-gate.py` / `codestable-dod-runner.py` / `codestable-evidence-pack.py` → exit 0：三项 gate 均 passed。
- 未运行 browser/API：本 feature 不改变用户界面、公开 API 或 production runtime 语义；真实 MCP stdio integration 已覆盖受影响的测试基础设施路径，因此不阻塞。

## 4. Scenario Results

- [x] QA-001 build/typecheck：pass
  - Evidence: fresh exit 0；无 unused import/type error。
- [x] QA-002 evaluator exactness：pass
  - Evidence: root-only normalization、43 public field mutations、逐 reason-code false-positive、order/ID/action/promotion/provenance/parity failure tests。
- [x] QA-003 completeness/families：pass
  - Evidence: 79 owners；actual companion/schema/mutation probes；unrelated registered owner mutation 被拒绝。
- [x] QA-004 MCP lifecycle：pass
  - Evidence: production case 未观测字段为 `null`；instrumented probe context/children 为 true；skip/leak/timeout/nonzero 均按预期失败并完成 PID/temp cleanup。
- [x] QA-005 full suites：pass
  - Evidence: 158 unit、64 active Golden、39 MCP；Golden 唯一 skip 是 `exclusion-summary` 不适用 forbidden-ID guard 的显式 `runIf`，不是环境缺口。
- [x] QA-006 synthetic report：pass
  - Evidence: seed 20260710；1000/50/10/200；5 次 hash `8d5a229c...`；runtime median 67.83 ms / p95 82.15 ms，仅作 trend。
- [x] QA-007 scope/cleanliness：pass
  - Evidence: scope gate 无 blocking/warnings；无 production `src` diff；marker/diff checks passed。
- [x] QA-008 artifacts：pass
  - Evidence: 23 success manifests 与 23 companion snapshots exact pairing；committed baseline 与 gitignored runtime report 分目录。

## 5. Findings

### failed

none

### blocked

none

### residual-risk

- PID 文件极端截断/PID reuse窗口未完全消除；正常、leak、timeout、nonzero 已有真实运行证据，不影响本轮非功能性验收。
- synthetic timing 不代表真实 monorepo SLA；本契约明确只把 correctness/hash/cleanup 作为 blocking。
- archguard/meta-cc 与 OCR endpoint 不可用；本 feature 无 production 语义改动，独立 Task agent、全量 suites 与 exact diff 作为替代证据。

## 6. Cleanliness

- Debug output: pass
- Temporary TODO/FIXME/XXX: pass
- Commented-out code: pass（当前人写 diff 逐文件复核，无临时禁用实现）
- Unused imports / dead code from this feature: pass（strict typecheck/build）
- Out-of-scope files: pass（scope gate）

## 7. Verdict

- Status: passed
- Next: `cs-feat-accept`
