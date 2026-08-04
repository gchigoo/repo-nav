---
doc_type: roadmap
slug: repo-nav-ga
status: active
created: 2026-07-31
last_reviewed: 2026-07-31
tags: [repository-retrieval, mcp, ga, post-beta]
related_requirements: [source-of-truth-evidence]
related_architecture: [repo-nav-foundation]
predecessor: repo-nav-public-beta
---

# RepoNav post-beta → GA 路线图

## 1. 背景

`0.2.0-beta.1` 已合入 `main`、打 tag 并完成 npm 发布；生产路径已切换 schema v2，适合真实试用，但 review 仍指出：双选择通道（expanded selector 与 legacy selector 并行）、legacy completeness 语义失真、根导出仍暴露 v1、README/CI 未 npm-first、snapshot git 探测粗糙，以及 canonical executor 体积过大。本 roadmap 承接 public-beta 之后到 `1.0.0` GA 的收敛工作，不扩张产品定位。

`repo-nav-public-beta` 保持完成态；本路线只处理 post-beta 正确性、发布工程与 GA 验收，不回写或改写 public-beta 历史契约。

## 2. 版本阶段

| 阶段 | 包版本 | 主题 | 退出标准 |
|---|---|---|---|
| beta.2 | `0.2.0-beta.2` | 正确性 + 公共 API 收口 | authoritative selector 接线、legacy completeness 修复、根导出 v2-only；tag + `npm publish --tag beta` |
| beta.3 | `0.2.0-beta.3` | 发布体验 + CI 门禁 | npm-first 文档、package/release gate、git snapshot 硬化；tag + `npm publish --tag beta` |
| 1.0 | `1.0.0` | 真实仓库基准 + GA | executor 行为等价拆分、基准门槛通过、GA checklist 满足；评估 `latest` 与 `beta` 分 tag |

```text
beta.1 (done)
    ↓
beta.2 ── authoritative-expanded-selection
    │    legacy-completeness-fix (可并行)
    │    npm-root-export-v2-only
    ↓
beta.3 ── docs-npm-first-readme
    │    package-release-ci-gate
    │    snapshot-git-probe-hardening
    ↓
1.0  ── executor-module-split
         real-repo-benchmark-gate
         ga-publish
```

## 3. 收敛原则

**单一权威选择源（one authoritative selector）**

- 生产 verify 输入只能有一个 authoritative source：`DiscoveryHitSelectorV2` 经 scope-fold 与 public-safe 等价类选中的 locator refs → exact `BackendHit[]` → `verifyAndMergeBackendHits`。
- `selectAndFreezeLegacyBackendHitsV1` 不得再决定 verify 输入；legacy lane 仅允许写入 coverage/telemetry/compat，不得与 expanded lane 竞争同一 verify 集合。
- 任何新改动不得引入第二个“可决定 evidence 输入”的选择通道；排序、预算、snapshot purge 仍消费同一 stable pool。

## 4. 本 roadmap 覆盖

- beta.2：修复 review P1 锚点被字典序截断、legacy `complete` 在 slice 后恒 true、根 `export *` 同时暴露 v1/v2。
- beta.3：README/getting-started npm-first、独立 package/release CI gate、git dirty 探测与 `snapshotRef` 硬化。
- 1.0：canonical executor 行为等价模块拆分、固定真实仓库基准指标门禁、GA 发布与 tag 策略。

## 5. 明确不做（non-goals）

- **不新增 proof layer / contract family**：不在主开发路径继续堆叠过渡架构的证明层、owner token 族或新的 six-owner admission 变体。
- 不把大型生成式 acceptance pack 继续膨胀入主开发视图；归档到 release artifact 或旁路目录。
- 不把 macOS ARM 六格矩阵化作为 beta.2 阻塞项。
- 不在未修 authoritative selector 前宣称 `1.0.0` 或切换 `latest`。
- 不内置 LLM、embedding、远程检索或多租户；不扩未证明需求的新语言语义分类器。
- 不以 acceptance pack 体积或文档堆叠替代真实仓库基准门槛。

## 6. 子 feature 清单

| Slug | 阶段 | 一句话 |
|---|---|---|
| authoritative-expanded-selection | beta.2 | expanded selector 成为 verify 唯一权威输入 |
| legacy-completeness-fix | beta.2 | 修复 slice 后 legacy complete 语义 |
| npm-root-export-v2-only | beta.2 | 根 exports 收口到 v2 + 稳定 client API |
| docs-npm-first-readme | beta.3 | README 与入门文档 npm-first、Node ^22\|\|^24 |
| package-release-ci-gate | beta.3 | lint/pack/smoke/audit/SBOM release gate |
| snapshot-git-probe-hardening | beta.3 | 流式 git dirty 探测与安全 snapshotRef |
| executor-module-split | 1.0 | 行为等价拆分 search/select/verify/classify/project |
| real-repo-benchmark-gate | 1.0 | 10–20 个真实仓库基准指标门禁 |
| ga-publish | 1.0 | `1.0.0` 发布与 GA checklist |

## 7. 依赖与执行顺序

默认 critical path：

`authoritative-expanded-selection` → (`legacy-completeness-fix` 可并行) → `npm-root-export-v2-only` → beta.2 发版 → `docs-npm-first-readme` / `package-release-ci-gate` / `snapshot-git-probe-hardening`（beta.3 内可并行）→ beta.3 发版 → `executor-module-split` → `real-repo-benchmark-gate` → `ga-publish`。

`legacy-completeness-fix` 对 `authoritative-expanded-selection` 为软依赖：可并行实施，但 beta.2 发版前两者均需 acceptance done。

## 8. 完成信号

- items.yaml 9/9 `done`（或明确 deferred 的非 GA 项有 owner 记录）。
- beta.2/beta.3 各有一次 tag + npm beta 发布证据。
- 1.0 基准门槛、根导出收口、release gate 与 GA checklist 全部通过。
- merge/push/tag/publish/`latest`  promotion 仍各自需要 owner 授权，不因 roadmap 完成而自动发生。

## 9. 变更日志

- 2026-07-31：自 public-beta review 与 post-beta 计划落盘 `repo-nav-ga`；9 items、三阶段版本与收敛原则冻结。
