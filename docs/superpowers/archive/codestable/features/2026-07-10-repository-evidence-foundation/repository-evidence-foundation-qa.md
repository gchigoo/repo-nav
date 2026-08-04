---
doc_type: feature-qa
feature: 2026-07-10-repository-evidence-foundation
status: passed
tested: 2026-07-13
round: 1
---

# repository-evidence-foundation QA 报告

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-10-repository-evidence-foundation/repository-evidence-foundation-design.md`
- Checklist: 5 个 steps `done`，checks 仍待 acceptance
- Review: round 3 `status=passed`、`reviewer=subagent`，无 unresolved blocking/important
- Evidence pack / gate / DoD: 最新 implementation.before_review 产物均存在且 `passed`
- Diff basis: 当前全部 F1 tracked/untracked diff，与 passed review 相同
- Baseline dirty files: none
- Feature type: non-functional foundation；新增公共类型/schema、DI skeleton、验证 runners 与测试基础设施，但 design 明确没有真实 reader/backend/engine/MCP tool 或用户/API 路径
- Core evidence gate: 不需要 browser/API/e2e，因为本 feature 明确没有这些 production surface；用真实 build/typecheck、Nest application-context DI tests、Golden evaluator、synthetic stdio child/harness、负例 runner 和函数探针作为适配的运行证据

## 2. Verification Matrix

| ID | 来源 | 核心性 | 场景 / 风险 | 证据类型 | 命令或动作 | 期望 | 结果 |
|---|---|---|---|---|---|---|---|
| QA-001 | design S1 / DoD | non-functional core | 工程可构建且严格类型通过 | build/typecheck | `npm run build && npm run typecheck` | exit 0 | pass |
| QA-002 | design S2/S3 | non-functional core | schema/normalization/ID/sort、scope process safety、DI fail-closed/override | unit/integration | `npm test -- --group runner-smoke --group contract --group di` | 全部执行并通过 | pass，4 files / 17 tests |
| QA-003 | design S4 | non-functional core | Golden success/error schema、required/forbidden/exclusion 与 success/error parity | function | `npm run test:golden -- --case runner-smoke --case manifest-schema --case evaluator-smoke` | 全部执行并通过 | pass，2 files / 6 tests |
| QA-004 | design S5 | non-functional core | MCP frames-only、graceful shutdown、timeout、JSON/文本污染负例 | child-process integration | `npm run test:mcp -- --case runner-smoke --case lifecycle-manifest-schema` | 全部执行并通过 | pass，2 files / 6 tests |
| QA-005 | review focus | supporting | Unicode/标点完整排序；file escape 与非 file literal | function probe | `node --import tsx C:\tmp\repo-nav-f1-qa.ts` | 断言完成并打印 marker | pass，`F1_QA_FUNCTION_PROBES_OK` |
| QA-006 | design S1 | non-functional core | 未知 group/case 不得假成功 | CLI negative | unit 与 MCP runner 使用不存在选择器 | 两者非零 | pass，exit 1 / 1 |
| QA-007 | gate warnings / review | supporting | Windows 元字符按 argv literal 传入；非 Git 目录 fail closed | integration | contract group 中 `scope-gate.spec.ts` | 2 tests pass | pass |
| QA-008 | cleanliness | supporting | 无 debug/TODO/FIXME/死 import/反向依赖/whitespace error | diff/static | `git diff --check` + targeted scans | 无命中 | pass |

## 3. Command Results

- `npm run build` → exit 0。
- `npm run typecheck` → exit 0。
- `npm test -- --group runner-smoke --group contract --group di` → exit 0；17 tests passed，其中 contract 12 tests。
- `npm run test:golden -- --case runner-smoke --case manifest-schema --case evaluator-smoke` → exit 0；6 tests passed。
- `npm run test:mcp -- --case runner-smoke --case lifecycle-manifest-schema` → exit 0；6 tests passed。
- `node --import tsx C:\tmp\repo-nav-f1-qa.ts` → exit 0；`F1_QA_FUNCTION_PROBES_OK`。
- 未知 unit group / MCP case → exit 1 / 1，runner 正确传播失败。
- `git diff --check`、清洁度与 production→testkit 反向依赖扫描 → pass。
- 未运行 browser/API/e2e：F1 明确不提供 UI、HTTP、真实 MCP host/tool 或 search runtime；这些验证在本 feature 没有可触发对象，因此不构成核心缺口。

## 4. Scenario Results

- [x] QA-001 五个稳定入口：pass。
  - Evidence: build/typecheck + unit/Golden/MCP 实际命令全部 exit 0。
- [x] QA-002 schema v1 与 normalization：pass。
  - Evidence: NFKC/byte/smart case、BackendHealth、ID、六级 comparator、absolute/drive/UNC/escape 和 literal tests。
- [x] QA-003 DI fail closed 与 override：pass。
  - Evidence: application context create/close、empty frozen collection、reader/service exception、MCP token absent、三个 override seams。
- [x] QA-004 Golden contract：pass。
  - Evidence: success/error manifests、共享 evaluator、required/forbidden/exclusion、success/error parity 负例。
- [x] QA-005 MCP lifecycle：pass。
  - Evidence: synthetic child frames、shutdown、timeout、JSON debug/text/blank-line rejection。
- [x] QA-006 review QA focus：pass。
  - Evidence: Unicode/标点排序、完整数组 sort、`a/../../b` 与单反斜杠 root rejection、`a/../b` canonicalization、symbol 反斜杠保留。

## 5. Findings

### failed

none

### blocked

none

### residual-risk

- REV-006：F1 frozen empty backend `useValue` 满足空 seam；F2/F3 首个真实 backend 接入必须切换 factory、有序/frozen assembly并加顺序 tests。
- scope gate 在 git executable 本身无法 spawn 时尚未把 OSError 结构化为 blocked JSON，但会非零 fail closed；不影响当前 Git 可用环境。
- MCP timeout kill 后无第二重 close deadline；F2 process safety 必须继续覆盖顽固 child cleanup。
- archguard、meta-cc、OCR endpoint unavailable；核心证据由独立 Task review、实际 commands 与负例 tests 提供。

## 6. Cleanliness

- Debug output: pass
- Temporary TODO/FIXME/XXX: pass；scope gate 的三条 warning 来自其 `CLEAN_PATTERNS` 自身字面量，不是临时标记
- Commented-out code: pass
- Unused imports / dead code from this feature: pass（strict typecheck）
- Out-of-scope files: pass（scope gate）

## 7. Verdict

- Status: passed
- Next: `cs-feat-accept`
