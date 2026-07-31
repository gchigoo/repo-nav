---
doc_type: roadmap-goal-plan
roadmap: repo-nav-ga
status: ready
created: 2026-07-31
baseline_ref: 0.2.0-beta.1
---

# RepoNav post-beta → GA Goal 执行总览

## 1. Inputs And Authorization

- Roadmap：`.codestable/roadmap/repo-nav-ga/repo-nav-ga-roadmap.md`
- Items：`.codestable/roadmap/repo-nav-ga/repo-nav-ga-items.yaml`
- Approval：`.codestable/roadmap/repo-nav-ga/approval-report.md`
- 前置：`repo-nav-public-beta` 已完成，`0.2.0-beta.1` 已发布。
- Owner 已确认 post-beta GA roadmap 计划；`approvals.goal-acceptance: approved` 授权 listed items 的 planning/impl。

## 2. 版本与 Feature 映射

| 目标版本 | Items |
|---|---|
| `0.2.0-beta.2` | authoritative-expanded-selection, legacy-completeness-fix, npm-root-export-v2-only |
| `0.2.0-beta.3` | docs-npm-first-readme, package-release-ci-gate, snapshot-git-probe-hardening |
| `1.0.0` | executor-module-split, real-repo-benchmark-gate, ga-publish |

执行顺序见 items DAG；beta.3 三项可并行；legacy-completeness-fix 可与 authoritative-expanded-selection 并行。

## 3. 收敛约束

- 单一 authoritative selector：verify 输入只来自 expanded selection。
- 不新增 proof/contract family。
- GA 以真实仓库基准门槛为准，不以文档或 acceptance pack 体积代替。

## 4. 阶段 Exit

- **beta.2**：三项 acceptance done → tag `v0.2.0-beta.2` → `npm publish --tag beta`
- **beta.3**：三项 acceptance done → tag `v0.2.0-beta.3` → `npm publish --tag beta`
- **1.0**：基准 + 拆分 + GA checklist → tag `v1.0.0` → 评估 `latest` promotion（需 owner 授权）

## 5. Non-Automatic Actions

tag、npm publish、`latest` promotion、merge 到 main 均需各自 owner 授权；本 goal 完成不自动执行。
