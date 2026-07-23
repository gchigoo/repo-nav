---
doc_type: feature-qa
feature: 2026-07-23-public-output-boundary-v2
status: passed
runner_state: completed
runner_reason: ""
runner_id: /root/f1_goal_driver/f1_qa_runner
tested: 2026-07-23
round: 1
---

# public-output-boundary-v2 QA 报告

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-design.md`
- Checklist: `.codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-checklist.yaml`
- Review: `.codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-review.md`
- Evidence pack / gate / DoD: 同 feature 目录 canonical artifacts。
- Diff basis: baseline `fd1d528` 到当前 unstaged/untracked implementation scope。
- Baseline dirty files: roadmap planning artifacts 与 feature artifacts 均属于当前 approved
  goal 输入；实现归因由 `implementation-scope.txt` 和 scope gate 逐项列出。
- Feature type: functional（dormant in-process public-output contract seam）。
- Core evidence gate: raw strict parse → field policy → assembler → service/structured/text/
  debug synthetic projections，以及 safe error、determinism、no-cutover。F1 明确禁止
  production cutover，因此不需要 browser/API/MCP v2 真实链路；真实 transport parity
  属 F9，F1 使用实际函数、unit、Golden 与现有 MCP 回归作为核心运行证据。

## 2. Verification Matrix

| ID | 来源 | 核心性 | 场景 / 风险 | 证据类型 | 命令或动作 | 期望 | 结果 |
|---|---|---|---|---|---|---|---|
| QA-001 | design S1/C1-C5 | core-functional | raw/public strict schema 与 cross-field contradiction | unit | `npm test -- --group public-output-v2` | deliberate mutations fail-closed | pass |
| QA-002 | design S2/C6-C9 | core-functional | hostile corpus、controls、placeholder collision | unit/Golden | v2 unit + Golden | 原值不在 public projections | pass |
| QA-003 | review QA focus | core-functional | dangling escape、metadata、snapshot/backend truth | unit/Golden | targeted groups | 正反 owner 全绿 | pass |
| QA-004 | design C10-C13 | core-functional | allowlist、ordinal ID、status/error parity | unit | v2 unit | fixed public output / safe error | pass |
| QA-005 | design C14-C16 | core-functional | deterministic bytes 与四 projection parity | Golden | v2 Golden | bytes/parity 稳定 | pass |
| QA-006 | design C17-C19 | supporting | dormant boundary / no production cutover | unit/diff | no-cutover + import scan | production roots 不可达 v2 | pass |
| QA-007 | DoD | supporting | build/type/full regressions | build/test | DoD commands | core commands exit 0 | pass |
| QA-008 | protocol | non-functional | scope 与清洁度 | diff/static | scope gate / `git diff --check` | 无越界或临时残留 | pass |

## 3. Command Results

- `npm.cmd run build` → exit 0：TypeScript build passed。
- `npm.cmd run typecheck` → exit 0：strict typecheck passed。
- `npm.cmd test -- --group public-output-v2` → exit 0：46 passed。
- `npm.cmd run test:golden -- --group public-output-v2` → exit 0：7 passed。
- `npm.cmd test -- --group public-output-v2 --case no-cutover-import-inventory`
  → exit 0：2 passed。
- `npm.cmd test` → exit 0：214 passed。
- `npm.cmd run test:golden -- --all` → exit 0：71 passed / 1 existing approved skip。
- `npm.cmd run test:mcp -- --all` → exit 0：39 passed。
- `npm.cmd run test:docs` → exit 0：docs smoke passed。
- `git diff --check` → exit 0。
- `codestable-doctor` → exit 1：仅剩既有 debug-cli Task-agent-review P1；
  当前 F1 不在 finding 中。

## 4. Scenario Results

- [x] QA-001 strict raw/public schema：contract 25 cases pass。
- [x] QA-002 hostile corpus 与 controls：redaction 8 + Golden 7 pass。
- [x] QA-003 review focus：dangling escape、placeholder、metadata、snapshot/backend
  truth 全部 pass。
- [x] QA-004 assembler/status/error：assembler 7 + safe error/projection 4 pass。
- [x] QA-005 determinism/parity：repeat、key order 与四 projection parity pass。
- [x] QA-006 dormant no-cutover：import mutation gate 2 + independent scan pass。
- [x] QA-007 full regressions：unit 214、Golden 71 + 1 skip、MCP 39、docs pass。
- [x] QA-008 scope/cleanliness：scope gate 与 `git diff --check` pass。

## 5. Findings

### failed

- none。

### blocked

- none。

### residual-risk

- F1 保持 dormant synthetic seam；真实 MCP/CLI/stderr v2 parity 由 F9 cutover gate
  负责。
- no-cutover graph 基于当前相对 ESM import/export 形式，不等同完整 TypeScript module
  resolution。
- Archguard、meta-cc 与 OCR provider unavailable，但不影响核心功能证据。
- Doctor 的 debug-cli P1 是既有 baseline，不属于本 feature diff。

## 6. Cleanliness

- Debug output: pass
- Temporary TODO/FIXME/XXX: pass
- Commented-out code: pass
- Unused imports / dead code from this feature: pass
- Out-of-scope files: pass

## 7. Verdict

- Status: passed
- Next: `cs-feat` acceptance 阶段。
