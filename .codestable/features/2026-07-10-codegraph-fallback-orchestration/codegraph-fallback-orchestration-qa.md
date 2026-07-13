---
doc_type: feature-qa
feature: 2026-07-10-codegraph-fallback-orchestration
status: passed
tested: 2026-07-13
round: 1
---

# codegraph-fallback-orchestration QA 报告

## 1. Scope And Inputs

- Design/checklist：approved；S1-S4=`done`。
- Review：`codegraph-fallback-orchestration-review.md`（Round 2，passed）。
- Evidence pack / scope gate / DoD：passed；DoD 6/6 core commands。
- Feature type：mixed。核心行为是 structured CodeGraph probe/query、保守 completeness 与可观察 fallback；真实外部 CLI success/cleanup 必须运行，不能只靠 fake adapter。
- Diff basis：F6 完整未提交工作区；dirty 文件均在 implementation scope 内，`git diff --check` 无 whitespace error。

## 2. Verification Matrix

| ID | 来源 | 核心性 | 场景 / 风险 | 命令或动作 | 期望 | 结果 |
|---|---|---|---|---|---|---|
| QA-001 | design CMD-BUILD/TYPECHECK | supporting | production/tests 严格编译 | `npm run build`; `npm run typecheck` | exit 0 | pass |
| QA-002 | S1/C2-C3/C9 | core | probe/version/status/query parser 与 query failure mapping | probe/parser groups | 唯一 health/reason；required fail closed | pass，8 tests |
| QA-003 | S2/C4-C6 | core | stable multi-input plan、shared budget、unsupported dimensions、single-symbol skip | query-plan group | argv/remaining/completeness exact | pass，6 tests |
| QA-004 | S3/C1/C7-C8 | core | missing/no-result/failed/incomplete、global/local abort、unverified/skip/provenance | ten named Golden cases | attempt/fallback/status/provenance exact | pass，11 tests |
| QA-005 | review focus | core | 多 symbol 部分核验不得跳 fallback；query error 必须为 failed/index error | QA-002/004 assertions | ripgrep calls=1；failed/error | pass |
| QA-006 | S4/C10 | core | 真实 1.1.6 temp index/query/cleanup | indexed-temp-repo | success 且无工作 repo mutation/child/daemon/index 残留 | pass，1 test |
| QA-007 | regression | supporting | MCP surface/lifecycle/parity 不回归 | `npm run test:mcp` | 全部通过 | pass，31 tests |
| QA-008 | C11/C12/cleanliness | non-functional | 无 production init/update/delete、human text parser、debug/TODO/越界文件 | source/diff/scope scan | 无命中或越界 | pass |

## 3. Command Results

- `npm run build` → exit 0。
- `npm run typecheck` → exit 0。
- `npm test -- --group codegraph-probe --group codegraph-parser` → 8 passed。
- `npm test -- --group codegraph-query-plan` → 6 passed。
- ten-case `npm run test:golden ...` → 11 passed（包含多 symbol integration guard）。
- `npm test -- --group codegraph-live-smoke --case indexed-temp-repo` → 1 passed；真实 temp index/query/cleanup 完成。
- `npm run test:mcp` → 31 passed。
- 最近完整回归：138/138 unit、39 active Golden + 1 conditional skip、31/31 MCP。
- `git diff --check` → exit 0；仅 Windows line-ending 提示。

## 4. Scenario Results

- [x] Probe/query compatibility：1.1.6 clean/missing/stale、future extra fields、required malformed、spawn/timeout 均有结构化断言。
- [x] Query completeness：symbol anchors 优先、Unicode identifier、stable dedup、remaining 3→2、limit=1 stop 与 fuzzy raw budget 均通过。
- [x] Fallback state machine：global abort ripgrep=0；local timeout、failed、no-result、incomplete、unverified 均 ripgrep=1；两 backend unavailable 不伪装 no_result。
- [x] Conservative skip：单一 explicit symbol 可在当前文件核验后跳过；多 symbol 只确认一项仍 fallback。
- [x] Provenance：primary-only、secondary-only、merged 三格 reason/public evidence count 符合 F5 truth table。
- [x] Real smoke：观测 CodeGraph 1.1.6；只初始化系统 temp synthetic repo；工作 repo 前后无 `.codegraph/`。

## 5. Findings

### failed

none

### blocked

none

### residual-risk

- 当前 Windows npm shim 已真实验证；其他 portable/native 安装布局需要未来环境矩阵扩展。
- 未知未来 CodeGraph JSON version 会 fail closed 并 fallback，兼容需通过新 fixture/live smoke 显式加入。
- clean status 与随后文件核验之间存在竞态，因此 freshness 保持 unknown；可能保守 fallback，不会放宽 confirmed。

## 6. Cleanliness

- Debug output / TODO/FIXME/XXX / commented-out production path：pass。
- Production index init/update/delete 与 explore/node/stderr parser 禁令：pass。
- Unused imports/dead code：pass（build/typecheck + review）。
- Out-of-scope files：pass（scope gate）。

## 7. Verdict

- Status：passed。
- Blocking QA items：none；fake transition 与真实 indexed temp-repo 两条核心证据链均已运行。
- Next：`cs-feat-accept`。
