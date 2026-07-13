---
doc_type: roadmap-goal-feature
roadmap: repo-nav-mvp
feature: 2026-07-10-debug-cli-mcp-guide
roadmap_item: debug-cli-mcp-guide
status: accepted
---

# debug-cli-mcp-guide Goal 执行规格

## 1. Identity And Inputs

- 顺序：9/9
- Roadmap item：`debug-cli-mcp-guide`
- 依赖：mvp-golden-regression-suite
- 性质：`mixed`
- Design：`.codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-design.md`
- Checklist：`.codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-checklist.yaml`
- Design review：`.codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-design-review.md`
- Implementation review：`.codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-review.md`
- QA：`.codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-qa.md`
- Acceptance：`.codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-acceptance.md`
- Evidence pack：`.codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-evidence-pack.md`
- Gate results：`.codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-gate-results.json`
- DoD results：`.codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-dod-results.json`

## 2. Delivery And Core Path

- 一句话交付物：交付 debug CLI、可执行 docs 与 aggregate verification。
- 核心运行路径：真实 CLI/docs snippets 和最终 aggregate command。
- 不得改变 approved design、roadmap item、接口契约或 feature 范围。

## 3. Mandatory Commands

- `npm run build`
- `npm run typecheck`
- `npm test -- --group debug-cli-shell --group debug-cli-lifecycle`
- `npm test -- --group debug-cli-locate`
- `npm test -- --group debug-cli-probe --group debug-cli-golden`
- `npm run test:docs`
- `npm run build && npm run typecheck && npm test && npm run test:golden -- --all && npm run test:mcp -- --all && npm run test:docs`

所有 core 命令必须由真实 runner 执行。依赖或 runner 尚不存在时，只能补正式 dependency、lockfile 或配置，禁止同名 shim、空壳脚本和伪造结果。

## 4. Feature DoD

- Design approved、design-review passed。
- Checklist steps 全部 done；acceptance 才把 checks 改为 passed。
- scope-gate、dod-runner、evidence-pack passed。
- 独立 Task agent code review passed，无 unresolved blocking。
- QA passed，覆盖 Acceptance Matrix、DoD commands、review focus 和 residual risks。
- Acceptance passed，roadmap / architecture / requirement 写回完成。
- Scoped commit 成功且工作树干净后才进入下一 feature。

## 5. Stage Gates And Inputs

1. Implementation：加载 `cs-feat-impl`，输出 step evidence、DoD/gate results 与 evidence pack。
2. Review：加载 `cs-code-review` 并使用独立 Task agent，输出 `debug-cli-mcp-guide-review.md`。
3. QA：加载 `cs-feat-qa`，输出 `debug-cli-mcp-guide-qa.md` 与真实运行证据。
4. Acceptance：加载 `cs-feat-accept`，输出 `debug-cli-mcp-guide-acceptance.md` 并更新 checks/items。

运行时 gate 以 `goal-protocol-gates.md` 和 `.codestable/gates/roadmap-goal-gates.yaml` 为准；protocol-only gate 不得伪造脚本结果。

## 6. Acceptance Evidence

- Mandatory command outputs、exit codes、diff summary、artifact inventory。
- Acceptance Matrix 的正常、边界、错误/false-positive 证据。
- Scope/cleanliness、provider warnings、E/C/H summary 与 H-only core checks。
- 功能路径的真实运行证据，或本文件声明的非功能性替代证据。

## 7. Deliverables And Cleanliness

- 交付物是 design、checklist artifacts 与本文件交付物的并集。
- 禁止临时 stdout/debug、无来源 TODO/FIXME/XXX、注释掉代码、unused import、同名 shim、临时包和 `__pycache__`。
- 任何 scope 外文件必须在 evidence pack 解释，否则 scope-gate failed。

## 8. Failure Recovery Boundary

- Impl gate 失败：在 approved design 内修复并重跑；需要改契约则 handoff。
- Review blocking：review-fix 后重跑 implementation gates 和独立 review。
- QA failed/blocked：qa-fix 后重跑 review 和 QA。
- 同一 blocking 三轮失败、独立 reviewer 不可用、核心环境不可验证：打印 `CS_ROADMAP_GOAL_HANDOFF`。
- 不得跳过 core command、降低 assertion 或把核心缺口藏入 residual risk。
