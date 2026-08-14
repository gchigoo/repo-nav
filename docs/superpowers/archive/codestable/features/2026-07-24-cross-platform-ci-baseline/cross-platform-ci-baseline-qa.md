---
doc_type: feature-qa
feature: 2026-07-24-cross-platform-ci-baseline
status: passed
runner: subagent
reviewed: 2026-07-28
---

# cross-platform-ci-baseline QA 报告

## 1. Scope

- Kind: non-functional（CI/platform）
- Design / checklist / review / evidence pack / gap：已读；S1–S5 `done`；remote gap 已 cleared
- Auth: `f4-remote-ci-evidence` approved（owner 授权远程六格/aggregate/ruleset）
- 本轮只读产品代码；仅重跑本地 core 命令并落盘本报告

## 2. Local Core Commands（2026-07-28 复跑）

| ID | Command | Exit |
|---|---|---|
| CMD-BUILD | `npm run build` | 0 |
| CMD-TYPECHECK | `npm run typecheck` | 0 |
| CMD-F4-CONTRACT | `npm test -- --group cross-platform-ci-contract` | 0 |
| CMD-F4-PLATFORM | `npm test -- --group cross-platform-baseline` | 0 |
| CMD-PLATFORM | `npm run test:platform` | 0 |
| CMD-WORKFLOW-YAML | `node tools/ci/validate-workflow-yaml.mjs .github/workflows/cross-platform-ci.yml` | 0 |
| CMD-WORKFLOW-CONTRACT | `node tools/ci/assert-platform-contract.mjs --workflow .github/workflows/cross-platform-ci.yml` | 0 |
| CMD-REGISTRY-SELFTEST | `node tools/ci/run-platform-contracts.mjs --self-test` | 0 |
| CMD-REPORT-SELFTEST | `node tools/ci/write-platform-report.mjs --self-test` | 0 |

要点：

- `cross-platform-ci-contract`：4 tests passed（workflow/registry/report mutation）
- `cross-platform-baseline`：8 passed / 1 skipped（本机 Windows 合法跳过 PATH-002 POSIX symlink）
- `test:platform` 适用通过：`F4-MCP-001/002`、`F4-PATH-001/003/004`、`F4-PROC-001..005`（PATH-002 非适用，未伪回填）
- PROC-003/004 仍为 N-1 成功 + exact-N limit 基线，未被 F5 语义改写

## 3. Remote Evidence Consistency

Owner 声明 vs `remote-evidence/*.json`：

| 事实 | Owner / gap | 本地 JSON | 一致 |
|---|---|---|---|
| workflow run | `30323465951` | `same-run-green-865fcf0.json` `workflow_run_id` | 是 |
| source SHA | `865fcf0`（全 `865fcf09ff4fc7f2c2f8dc32fe0c10147ef321df`） | 同文件 `source_sha` | 是 |
| 六格 + aggregate | 全绿 / `cross-platform-required` success | `cells` 六格齐全，`aggregate_conclusion=success`，`conclusion=success` | 是 |
| ruleset | id `19864943`，required=`cross-platform-required` | `main-ruleset-sanitized.json` | 是 |
| 失败 PR 阻断 | blocked | `failing-pr-negative.json`：`mergeStateStatus=BLOCKED`，aggregate `FAILURE`，ruleset `19864943` | 是 |
| merge queue | disabled | 负向证据记录 `disabled` | 是 |

授权与缺口文档：`remote-evidence-gap.md` 结论齐备；evidence pack §8 与上表一致。

## 4. Verification Matrix

| Case / Focus | 证据 | 结果 |
|---|---|---|
| F4-MATRIX-001 | CMD-F4-CONTRACT + CMD-WORKFLOW-CONTRACT + YAML validate exit 0 | pass |
| F4-REMOTE-001 | 同 run 六格+aggregate 绿；ruleset required；失败 PR BLOCKED | pass |
| F4-PATH-001/003/004 | 本地 `test:platform` + baseline；PATH-003 本机 Windows 执行 | pass |
| F4-PATH-002 | 本机非适用跳过；远程六格含 linux/macos×Node22/24（POSIX 四格）由同 run 覆盖 | pass（远程） |
| F4-PROC-001..005 | baseline + `test:platform`：abort/timeout/exact-N/fault 全绿 | pass |
| Review：ruleset 仅要 `cross-platform-required` | sanitized ruleset 唯一 context | pass |
| Review：失败路径仍 BLOCKED | PR#1 负向 JSON | pass |
| Review：PATH OS 互不污染 | 本地无 PATH-002 marker；Windows 跑 PATH-003 | pass（本地侧） |
| Review：PROC exact-N 基线 | baseline 用例名与通过结果 | pass |
| Review：同 run family / marker 深核 | 摘要 JSON 含同 run/六格/aggregate；**未落盘六格 cell artifact JSON** | 摘要一致；marker exact 未本地深核 |

## 5. Residual Risks

1. **REV-001**：`install-host-tools.mjs` 与 workflow 内联 host CLI 版本双份，lockfile 外；依赖远程六格持续绿（review important，非本轮阻断）。
2. **六格 artifact marker**：`remote-evidence/` 仅 run/ruleset/PR 摘要，未含每格 `passedAssertionMarkers`/`requiredCaseIds` 原文；acceptance 若需闭包，应补档或从 run `30323465951` artifact 抽样。
3. **architecture**：`architecture-check` 仍为 `update-needed-minimal`，acceptance 需回写 CI 现状。
4. **checklist C1–C45** 仍 `pending`（流程勾选，非命令失败）。
5. 本机 Windows 不能单独证明 PATH-002；POSIX 覆盖以远程四格为准（设计预期）。

## 6. Verdict

- **status: passed**
- 本地 9 项 core 全绿；远程同 run / ruleset / 失败 PR 证据存在且与 owner 声明一致。
- 下一步：acceptance 关闭 C1–C45、architecture 最小回写；可选补六格 artifact marker 深核与 host-tools 单入口（REV-001）。
