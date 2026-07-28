---
doc_type: roadmap-goal-feature
roadmap: repo-nav-public-beta
feature: 2026-07-24-public-result-resource-budgets-v2
roadmap_item: public-result-resource-budgets-v2
status: accepted
---

# public-result-resource-budgets-v2 Goal 执行规格

## 1. Identity And Inputs

- 顺序：4/12
- Roadmap item：`public-result-resource-budgets-v2`
- 依赖：`span-redaction-corpus-policy-v2`
- 性质：`mixed`
- Design：`.codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-design.md`
- Checklist：`.codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-checklist.yaml`
- Design review：`.codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-design-review.md`
- Implementation review：`.codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-review.md`
- QA：`.codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-qa.md`
- Acceptance：`.codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-acceptance.md`
- Evidence pack：`.codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-evidence-pack.md`
- Gate results：`.codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-gate-results.json`
- DoD results：`.codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-dod-results.json`

## 2. Delivery And Core Path

- 一句话交付物：raw/corpus/public/serialized 数量与 UTF-8 字节硬上限及 N/N+1 fail-closed
- 核心运行路径：dormant/internal seam 或 production v1 保持路径的真实命令证据；F9 前不得切换 production v2 transport。
- 不得改变 approved design、roadmap item、接口契约或 feature 范围。
- implementation-ready 要求依赖项 acceptance `done`；仅 design-review passed 不得开工。

## 3. Mandatory Commands

- `npm run typecheck`
- `npm test -- --group public-output-v2 --case raw-resource-budgets`
- `npm test -- --group public-output-v2 --case resource-budget-primitives --case raw-resource-budgets`
- `npm test -- --group public-output-v2 --case corpus-resource-budgets`
- `npm test -- --group public-output-v2 --case public-field-resource-budgets`
- `npm test -- --group public-output-v2 --case serialized-resource-budget`
- `npm test -- --group public-output-v2 --case maximum-structure-budget && npm run test:golden -- --group public-output-v2`
- `npm test -- --group public-output-v2 --case resource-budget-ordering`
- `npm test -- --group public-output-v2 --case resource-budget-projection && npm run test:golden -- --group public-output-v2`
- `npm test -- --group public-output-v2 --case resource-budget-legacy-isolation`
- `npm test -- --group public-output-v2 --case no-cutover-import-inventory && npm run test:mcp -- --all && npm run test:docs`
- `npm test && npm run test:golden -- --all`
- `npm run build`

所有 core 命令必须由真实 runner 执行。依赖或 runner 尚不存在时，只能补正式 dependency、lockfile 或配置，禁止同名 shim、空壳脚本和伪造结果。F9 前每次功能验收必须保留 v1 no-cutover / production import 检查。

## 4. Feature DoD

- Design approved、design-review passed。
- Checklist steps 全部 done；acceptance 才把 checks 改为 passed。
- scope-gate、dod-runner、evidence-pack passed。
- 独立 Task agent code review passed，无 unresolved blocking。
- QA passed，覆盖 Acceptance Matrix、DoD commands、review focus 和 residual risks。
- Acceptance passed，roadmap / architecture / requirement 写回完成。
- Scoped commit 成功且工作树干净后才进入下一 feature。

## 5. Stage Gates And Inputs

1. Implementation：加载 `cs-feat` impl，输出 step evidence、DoD/gate results 与 evidence pack。
2. Review：加载 `cs-code-review` 并使用独立 Task agent，输出 `public-result-resource-budgets-v2-review.md`。
3. QA：加载 `cs-feat` QA，输出 `public-result-resource-budgets-v2-qa.md` 与真实运行证据。
4. Acceptance：加载 `cs-feat` accept，输出 `public-result-resource-budgets-v2-acceptance.md` 并更新 checks/items。

运行时 gate 以 `goal-protocol-gates.md` 和 `.codestable/gates/roadmap-goal-gates.yaml` 为准；protocol-only gate 不得伪造脚本结果。

## 6. Acceptance Evidence

- Mandatory command outputs、exit codes、diff summary、artifact inventory。
- Acceptance Matrix 的正常、边界、错误/false-positive 证据。
- Scope/cleanliness、provider warnings、E/C/H summary 与 H-only core checks。
- 功能路径的真实运行证据，或本文件声明的非功能性替代证据。
- F9 前 v1 production surface 无 v2 cutover 泄漏。

## 7. Deliverables And Cleanliness

- 交付物是 design、checklist artifacts 与本文件交付物的并集。
- 禁止临时 stdout/debug、无来源 TODO/FIXME/XXX、注释掉代码、unused import、同名 shim、临时包和 `__pycache__`。
- 任何 scope 外文件必须在 evidence pack 解释，否则 scope-gate failed。

## 8. Failure Recovery Boundary

- Impl gate 失败：在 approved design 内修复并重跑；需要改契约则 handoff。
- Review blocking：review-fix 后重跑 implementation gates 和独立 review。
- QA failed/blocked：qa-fix 后重跑 review 和 QA。
- 同一 blocking 三轮失败、独立 reviewer 不可用、核心环境不可验证：打印 `CS_ROADMAP_GOAL_HANDOFF`。
