---
doc_type: feature-code-review
feature: 2026-07-24-cross-platform-ci-baseline
status: passed
reviewer: subagent
round: 1
reviewed: 2026-07-28
---

# cross-platform-ci-baseline 代码审查报告

## 1. Scope

- Design: `.codestable/features/2026-07-24-cross-platform-ci-baseline/cross-platform-ci-baseline-design.md`（`status: approved`）
- Checklist: `cross-platform-ci-baseline-checklist.yaml`（S1–S5 全 `done`；C1–C45 仍 `pending`，留给 QA/acceptance）
- Evidence pack / gate / DoD: `cross-platform-ci-baseline-evidence-pack.md`、`*-gate-results.json`、`*-dod-results.json`、`*-scope-gate.json`（`implementation.before_review` 均为 `passed`，blocking 空）
- Remote: `remote-evidence/`（同 run 绿、ruleset sanitized、失败 PR 负向）；缺口文档已声明齐备
- 实现范围：`.github/workflows/cross-platform-ci.yml`、`tools/ci/*`、`testkit/contracts/platform-*`、`testkit/testing/platform-contract*`、`testkit/fixtures/platform/*`、platform/MCP specs、`package.json` 的 `test:platform`
- Review mode: initial（Lane A independent subagent）
- Baseline dirty：工作区另有 `dist/`、部分 `.codestable` 门禁产物等；结论仅针对 F4 可归因实现与证据，不把无关 dirty 当本轮缺陷

## 2. Spec Compliance

- 六格 matrix（Node 22/24 × ubuntu-24.04 / windows-2025 / macos-15-intel）、`fail-fast: false`、稳定 aggregate `cross-platform-required`（`needs` + `if: always()` + success-only）与 registry/assert 深比对一致
- triggers：`pull_request` / `merge_group.checks_requested` / `main`+`repo-nav-public-beta` push / `workflow_dispatch`；`permissions.contents: read`；checkout `persist-credentials: false` + `ref: github.sha`；action 全 SHA pin（含 setup-python）
- 九项 core step id、`test:platform` → `run-platform-contracts.mjs`、OS applicability（PATH-002 POSIX / PATH-003 win32）、marker/owner provenance、safe report forbidden-key、F4 base evidence 空集均落地
- production `src/**` 未 import testkit/tools/ci；`package.json` 仅增 `test:platform`，`private`/`engines` 未越界改 F9 元数据
- F4-REMOTE-001：同 run `30323465951` / SHA `865fcf0` 六格+aggregate 绿；ruleset `main-cross-platform-required` required check=`cross-platform-required`；失败 PR `#1` `mergeStateStatus=BLOCKED`；merge queue disabled 已记录
- 明确不做边界：未改 production runner 语义；未用 `*-latest` / `continue-on-error` / secrets / write 权限

## 3. Code Quality

- registry 作为单一真相源 + workflow deep-exact mutation + closed-set validator/synthetic extension 协议，结构清晰，扩展面可控
- orchestrator `shell:false` + 经 node 调 npm-cli，避开 Windows `*.cmd` EINVAL；private result 先对账 owner 再剥离 path，符合 design fail-closed
- platform helper 不接收 owner 参数；Vitest setup 从 task file 签发 `actualOwner`，与 binding 声明对账
- 真实 path/process fixture 与 OS `runIf` 双闸；非适用 binding 由 orchestrator 跳过且不写假 marker
- 维护性瑕疵见 Findings（host tools 双份、report `actual` 与 probe 解耦），均不构成功能阻断

## 4. Gate / Provider / Remote Warnings

- **CMD-WORKFLOW-YAML**：design 原文为 `npm exec -- yaml <file>`；yaml CLI 期望 stdin、不能当路径参数。已改为 `node tools/ci/validate-workflow-yaml.mjs`（`yaml` 包 `parse` 单文档）。DoD 已用新命令 exit 0。**非 blocking**——与“workflow 可解析”意图等价；建议 acceptance 保留 checklist 现行命令以免再跑坏命令
- scope-gate warning：checklist C33 文案含字面 `TODO`（“不保留临时TODO”）触发 cleanliness 误报，非实现残留 TODO
- providers：`archguard` / `meta_cc` unavailable（环境缺工具），不阻塞本轮
- remote gap：已 cleared；QA 仍应抽样核对 artifact 内 marker 集合与同 run family，而非只看 run conclusion

## 5. Findings

### blocking

none

### important

- [ ] REV-001 `tools/ci/install-host-tools.mjs` vs `.github/workflows/cross-platform-ci.yml:74-96`
  - Evidence: workflow 内联安装 `@vscode/ripgrep@1.15.9` / `@colbymchenry/codegraph@1.1.6`；`install-host-tools.mjs` 含同版本逻辑但仓库内无引用
  - Impact: 版本 bump 时易只改一处导致漂移；host CLI 也不在 package-lock 内
  - Expected fix scope: 单一入口（workflow 调脚本或删除未用脚本），并固定版本出处

### nit

- [ ] REV-002 `tools/ci/write-platform-report.mjs`：`actual` 直接取 registry cell，未写入 probe 实测字段；运行时身份仍依赖独立 `runtime` step + assert success。报告层对 actual 近乎同义反复，可读性弱
- [ ] REV-003 checklist C1–C45 仍 `pending`：实现 step 已 done，但验收勾选未关——属流程状态，非代码缺陷

### suggestion

- [ ] REV-004 将 host tool 规格抽到 registry 或单一 JSON，供 workflow/assert 同源校验

### learning

- Windows CI 需要显式 pin `setup-python` 与 host PATH（rg/codegraph）；仅靠 runner 预装不可复现

### praise

- aggregate 无 checkout/install、artifact 单 JSON + forbidden-key、PATH OS 反向覆盖与 synthetic extension 负向 corpus 设计扎实

### residual-risk

- host tools 版本在 lockfile 外；依赖远程六格持续绿证明
- architecture-check 状态为 `update-needed-minimal`，acceptance 需回写 architecture 现状
- 本地 Windows `test:platform` 合法跳过 PATH-002；POSIX 四格覆盖只能以远程证据为准

## 6. Test And QA Focus

- 必核：同 run 六格 artifact 的 `passedAssertionMarkers` / `requiredCaseIds` / `run.workflowRunId`+`runAttempt` / `revision` 与 registry applicable 集合 exact
- 必核：ruleset 仍只要 `cross-platform-required`；失败路径仍 BLOCKED
- 抽核：Linux/macOS cell 含 PATH-002、Windows cell 含 PATH-003 且互不污染
- 抽核：PROC-003/004 仍为 exact-N limit 基线（勿被 F5 语义提前改写）
- 关单前：关闭或明确推迟 C1–C45；architecture 最小回写；确认 CMD-WORKFLOW-YAML 以 `validate-workflow-yaml.mjs` 为准
- 建议：统一 host-tools 入口后跑一次 `CMD-WORKFLOW-CONTRACT` + 单格 matrix 冒烟

## 7. Verdict

- Status: **passed**
- blocking: **0** / important: **1** / nit: **2**
- Next: Goal lane → `cs-feat` QA（Inline/Goal 验收）；important REV-001 可延后但须记入 QA residual risk
- Gate effect: Lane A `reviewer: subagent` 完成；OCR 未在本子代理范围执行
