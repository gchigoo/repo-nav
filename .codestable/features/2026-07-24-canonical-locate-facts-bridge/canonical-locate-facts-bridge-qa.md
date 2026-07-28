---
doc_type: feature-qa
feature: 2026-07-24-canonical-locate-facts-bridge
status: passed
runner: subagent
reviewed: 2026-07-28
---

# canonical-locate-facts-bridge QA 报告

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-24-canonical-locate-facts-bridge/canonical-locate-facts-bridge-design.md`
- Checklist: `canonical-locate-facts-bridge-checklist.yaml`（S1–S5 done）
- Review: `canonical-locate-facts-bridge-review.md`（status=passed，reviewer=subagent，blocking=0）
- Evidence pack / gate / DoD: 均已 passed（implementation.before_review）
- Diff basis: F1C 核心路径（fact envelope、canonical/、locate-execution/、engine façade、EvidenceModule、package index、F1C tests/testkit）
- Baseline dirty: 工作区另有跨平台 CI、F1B budgets、dist 等 ambient；本 QA 只跑指定命令，不扩大全仓回归
- Feature type: functional（migration-seam）
- Core evidence gate: 单一 canonical execution、typed absence/finalizer、v1 projector parity、shadow no-cutover、package/DI/reachability、docs smoke

## 2. Verification Matrix

| ID | 来源 | 核心性 | 场景 / 风险 | 证据类型 | 命令或动作 | 期望 | 结果 |
|---|---|---|---|---|---|---|---|
| QA-001 | DoD CMD-BUILD/TYPECHECK | core | 编译与严格类型 | build/typecheck | `npm run build && npm run typecheck` | exit 0 | pass |
| QA-002 | F1C-CONTRACT/FINALIZER/MATERIALIZATION/SINGLE/V1/TERM/SHADOW/SAFE/DI/REACH | core | F1C 12 个 targeted unit cases | unit | `npm test -- --group canonical-locate-bridge --case ...`（12 cases） | exit 0，20 tests passed | pass |
| QA-003 | F1C-V1-GOLDEN-001 | core | dedicated v1 bridge Golden | golden | `npm run test:golden -- --group canonical-locate-bridge --case canonical-v1-bridge-parity` | exit 0 | pass |
| QA-004 | F1C-PACKAGE-001 | core | package declaration 不泄露 private bridge | unit | `npm test -- --group canonical-locate-bridge --case canonical-package-declaration-boundary` | exit 0 | pass |
| QA-005 | CMD-DOCS | core | public v1 docs/schema smoke | docs | `npm run test:docs` | exit 0 | pass |
| QA-006 | review REV-001/002 | supporting | 错误文案双份、DI shadow 断言偏弱 | review residual | 代码审阅已记录 | 不阻塞 | pass（residual） |

## 3. Command Results

- `npm run build && npm run typecheck` → exit 0：tsc build + typecheck 通过
- `npm test -- --group canonical-locate-bridge --case canonical-fact-contract --case canonical-required-owner-finalizer --case canonical-materialization-seam --case canonical-single-execution --case canonical-v1-projector-parity --case canonical-v1-shadow-isolation --case canonical-term-case-parity --case canonical-real-shadow-no-cutover --case canonical-synthetic-shadow-serialization --case canonical-safe-error-serialization --case canonical-di-wiring --case canonical-transport-reachability` → exit 0：Test Files 5 passed / Tests 20 passed | 256 skipped
- `npm run test:golden -- --group canonical-locate-bridge --case canonical-v1-bridge-parity` → exit 0：1 passed
- `npm test -- --group canonical-locate-bridge --case canonical-package-declaration-boundary` → exit 0：1 passed（依赖既有 dist；本轮先前已 build）
- `npm run test:docs` → exit 0：Docs smoke passed: test-artifacts/docs/docs-smoke-v1.json

## 4. Scenario Results

- [x] QA-001 build/typecheck：pass
- [x] QA-002 F1C targeted units（contract/finalizer/materialization/single-exec/v1 parity/isolation/term/real-shadow/synthetic/safe-error/DI/reachability）：pass
- [x] QA-003 v1 bridge Golden：pass
- [x] QA-004 package declaration boundary：pass
- [x] QA-005 docs smoke：pass
- [x] QA-006 review residual 已转入 residual-risk：pass

## 5. Findings

### failed

none

### blocked

none

### residual-risk

- REV-001：fixed-safe error 文案与 public-result-assembler 双份维护，F9 前建议抽共享 factory
- REV-002：DI case 对 shadow 缺席的 inventory 断言偏弱；当前 EvidenceModule 源码与 v1 projector binding 已人工复核
- synthetic complete 仅证明 neutral seam，不代表 F2–F8 real owner readiness
- 本 QA 按任务范围未重跑 full `npm test` / full Golden / MCP all；implementation DoD 已有通过证据，acceptance 可按需抽检
- 跨平台 matrix 仍依赖后续 F4，本机不能替代

## 6. Cleanliness

- F1C 核心路径未见 TODO/FIXME/debug 输出
- package root 无 concrete engine / private bridge export
- production DI 无 shadow provider

## 7. Verdict

- Status: passed
- Next: Goal lane acceptance / owner 确认
