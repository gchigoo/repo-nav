---
doc_type: feature-qa
feature: 2026-07-10-text-source-evidence-engine
status: passed
tested: 2026-07-13
round: 1
---

# text-source-evidence-engine QA 报告

## 1. Scope And Inputs

- Design：`text-source-evidence-engine-design.md`，approved。
- Checklist：S1-S4 全部 `done`。
- Review：`text-source-evidence-engine-review.md`，round 5 / `passed` / `reviewer: subagent`。
- Evidence pack / gate results / DoD results：均存在且 `passed`。
- Diff basis：scope gate 记录的完整 F3 changed-files；baseline dirty files none；staged none。
- Feature type：functional。
- Core evidence gate：必须实际运行 literal rg→safe process→reader→merge→classifier→LocateResult 链、truth-table正反例、fatal/status/limit/timeout与多 symbol预算路径；本轮由真实 ripgrep Golden integration、unit fault suites及全量 build/typecheck/tests提供运行证据，不以静态检查代替。

## 2. Verification Matrix

| ID | 来源 | 核心性 | 场景 / 风险 | 证据类型 | 命令或动作 | 期望 | 结果 |
|---|---|---|---|---|---|---|---|
| QA-001 | design commands | supporting | build与严格类型 | build/typecheck | `npm run build && npm run typecheck` | exit 0 | pass |
| QA-002 | S1 / review | core-functional | fixed literal argv、case groups、actual symbol、真实 rg seam | unit/integration | `npm test` 中 `ripgrep-backend` + `rg --version` | adapter 6 cases通过；真实 rg可用 | pass |
| QA-003 | S2 / review | core-functional | current-file核验、merge、fatal path、window limit fact | unit | `evidence-merge` / repository suites | merge 6 cases及path safety通过 | pass |
| QA-004 | S3 / REV-001 | core-functional | assignment/object/SQL/symbol正例与 declaration/string/regex/comment/call-site/member-division反例 | unit/Golden | classifier 34 cases + classifier Golden | 不误confirmed；支持形式confirmed | pass |
| QA-005 | REV-003 | core-functional | 2/12/13行与4096/4097-byte真实链 | integration | `text-evidence-engine` Golden | 边界内confirmed；边界外candidate/partial/limit | pass |
| QA-006 | S4 | core-functional | ok/no-result/unavailable/failed/incomplete/timeout状态与coverage | Golden integration | `npm run test:golden` | 版本化manifest与字段断言通过 | pass |
| QA-007 | REV-004 | core-functional | Zeta/Alpha多 symbol、anchor permutation、1/2/充足budget | real rg integration | `text-evidence-engine` Golden | facts不丢、role priority正确、budget可恢复 | pass |
| QA-008 | review focus | core-functional | fixed-vs-adjustable actions、internal/caller abort | unit/Golden | process/engine timeout cases | fixed 4KiB无retry；可调budget与internal timeout按契约 | pass |
| QA-009 | cleanliness | supporting | 施工痕迹与scope | diff/static/gate | `git diff --check`、`rg TODO...`、scope gate | 无错误/临时痕迹/越界 | pass |
| QA-010 | residual risk | supporting | adapter 10秒与request 30秒预算 | static/runtime evidence | 复核 `PROCESS_LIMITS` 与timeout Golden | 当前语义稳定但未做10秒墙钟慢仓库实测 | pass with residual risk |

## 3. Command Results

- `npm run build` → exit 0。
- `npm run typecheck` → exit 0。
- `npm test` → exit 0：11 files、84/84 tests通过。
- `npm run test:golden` → exit 0：4 files、25 active tests通过；1个按case选择设计的条件测试 skipped。
- `rg --version` → exit 0：`ripgrep 15.1.0`。
- `git diff --check` → exit 0；仅既有工作树line-ending提示，无whitespace error。
- `rg -n "TODO|FIXME|XXX|console..." src/evidence src/repository/ripgrep-backend.ts` → 无匹配。
- DoD runner → 6条core command exit code 0；scope gate / evidence pack passed。

## 4. Scenario Results

- [x] QA-001 构建与严格类型：pass。
- [x] QA-002 literal adapter与真实rg：pass。
- [x] QA-003 核验/merge/fatal ownership：pass。
- [x] QA-004 保守truth table及对抗decoys：pass。
- [x] QA-005 logical-window hard boundaries：pass。
- [x] QA-006 status/coverage/nextActions baseline：pass。
- [x] QA-007 multi-symbol全事实与primary role：pass。
- [x] QA-008 timeout/abort/fixed-vs-adjustable actions：pass。
- [x] QA-009 scope与清洁度：pass。
- [x] QA-010 deadline一致性：核心已实现路径无失败；保留非阻塞墙钟风险。

## 5. Findings

### failed

- none。

### blocked

- none。

### residual-risk

- `RipgrepBackend` process timeout固定10秒，而 LocateRequest允许30秒；现有status/abort路径有自动化证据，但未用故意运行超过10秒的真实慢仓库做墙钟验证。
- Windows `rg 15.1.0`与process-tree已有实机证据；POSIX process-group、其他rg minor version、reparse TOCTOU未在本机复核。
- F7 redaction/guardrail明确不属于F3。

## 6. Cleanliness

- Debug output: pass。
- Temporary TODO/FIXME/XXX: pass。
- Commented-out code: pass。
- Unused imports / dead code from this feature: pass（typecheck/build通过）。
- Out-of-scope files: pass（scope gate passed）。

## 7. Verdict

- Status: passed
- Next: `cs-feat-accept`
