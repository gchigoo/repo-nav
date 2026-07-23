---
doc_type: roadmap
slug: repo-nav-public-beta
status: active
created: 2026-07-23
last_reviewed: 2026-07-23
tags: [repository-retrieval, mcp, evidence, security, public-beta]
related_requirements: [source-of-truth-evidence]
related_architecture: [repo-nav-foundation]
---

# RepoNav public-beta 安全与可靠性硬化

## 1. 背景

RepoNav MVP 已经实现并验收了只读、确定性的 `repo_nav_locate`：外部 Agent 提供结构化搜索词与锚点，RepoNav 通过 CodeGraph-primary、ripgrep-fallback 和当前文件系统核验返回 confirmed、candidate、coverage 与 next actions。

2026-07-22 的外部静态 review 认可了这一产品边界，同时指出：当前公开脱敏只覆盖 excerpt；Evidence ID 仍由脱敏前内容派生；结果预算按字典序截断；CodeGraph fallback 会重复验证；ripgrep 完整缓冲大结果；scope、语言能力和取消语义没有在公共契约中完整表达。这些问题不会让现有回归测试失败，但会限制外部用户对安全性、相关性、确定性和大仓库行为的信任。

本 roadmap 不扩张 RepoNav 的核心产品定位，而是把现有 MVP 硬化为可公开标记 beta 的本地工具。既有 `repo-nav-mvp` roadmap 保持完成态，不回写或改写其历史契约；本路线通过 EvidencePack schema v2 明确承接不兼容变化。

## 2. 范围与明确不做

### 本 roadmap 覆盖

- 建立原始内部证据与公共 DTO 之间的单一、强制输出边界。
- 阻断 secret、连接串、个人数据、绝对本机路径和原始内容 hash 通过任意公共字段或旁路输出。
- 以确定性的相关性层级替换纯字典序预算，优先满足显式 file/symbol anchors，并保持跨文件多样性。
- 在一次 locate 请求内复用文件快照和 CodeGraph 预验证记录，检测已读文件在请求期间发生的变化，并在公共组装前丢弃变化文件的 stale evidence。
- 为 ripgrep 增加流式 JSON 消费和有界提前停止，保留达到上限前的 partial evidence。
- 把 `question` 定义为可选说明文本；拆分语义文本、搜索词和文件系统路径的归一化规则。
- 统一 RepositoryScopePolicy，保证 confirmed 与 candidate 使用同一个 scope decision。
- 明确 text search 与 semantic classification 的能力差异；不支持的语言保守降级为 candidate。
- 建立 Node 22/24、Windows/Linux/macOS 的持续验证，并补齐 beta 发布所需的维护文档和包元数据。

### 明确不做

- 不内置 LLM，不从 `question` 推导不确定的自然语言意图。
- 不引入 embedding、向量数据库、远程检索服务或多租户模型。
- 不实现完整调用链、修改影响分析、自动修复或代码写入。
- 不为 public-beta 一次性增加 Python、Go、Rust、Java 等语义适配器。
- 不把内部相关性层级公开为概率、confidence 或业务正确性分数。
- 不把 Git history 作为 evidence 来源；公共 coverage 只允许报告粗粒度 `gitState`，不返回 Git object ID、branch 或 remote。
- 不提供 HTTP transport、远程认证或 Web UI。
- 不在本路线完成前移除 `private: true` 或发布稳定版。

### Granularity Gate

| 判断项 | 结论 |
|---|---|
| 为什么不是单个 feature | 涉及公共 schema、安全边界、排序、文件快照、进程流式处理、scope/language policy、跨平台 CI 与发布治理，存在多个可独立验收的模块和依赖关系。 |
| 为什么不是重写 MVP | 现有 backend、reader、classifier、candidate policy、MCP 和 Verification Kit 都继续复用；新模块按输出边界、ranker、request context 和 adapter seam 渐进引入。 |
| 最小价值闭环 | `public-output-boundary-v2` 在不切换生产 v1 surface 的前提下，建立可独立验证的 v2 public assembler、安全策略和全字段 forbidden scan；生产切换由 F9 在所有真实 coverage producer 就绪后原子完成。 |
| 完成边界 | 只有安全、相关性、快照一致性、流式大结果、能力诚实报告和跨平台矩阵全部通过，才允许标记 `0.2.0-beta.1` 候选。 |

## 3. 模块拆分

```text
LocateRequestParser
        ↓
RepositorySnapshotResolver
        ↓
SearchPlanBuilder
        ↓
BackendExecutor
        ↓
HitRanker
        ↓
EvidenceVerifier + RequestFileCache
        ↓
RepositoryScopePolicy + LanguageEvidenceAdapter
        ↓
CandidateExpander
        ↓
PublicResultAssembler
```

### Public Result Boundary

- **职责**：把内部 raw result 物化为唯一 locate 公共 DTO；处理 repository ref、term/location 字段级脱敏、公共 ID、success/error schema 自校验和 structured/text/debug-locate parity。
- **不负责**：检索、分类、排序、文件读取或 diagnostic stderr policy。
- **删除测试**：v2 cutover 后，绕过该边界的 MCP/debug-locate success 或 error output 必须被架构/导入检查阻止；probe/golden/help 继续使用自己的版本化 schema。

### Hit Ranker

- **职责**：根据结构化 terms、anchors、backend reason 和已核验 classification 计算离散优先级；执行 anchor reservation、稳定 tie-break 与跨文件 round-robin。
- **不负责**：概率相关性、自然语言 question 解释或 candidate promotion。
- **约束**：评分只作为内部枚举/整数序位，不进入 public confidence。

### Request Snapshot

- **职责**：在一次请求内持有 resolved root、canonical file snapshot、已核验 records、backend attempt ledger 和粗粒度 Git state；同一 canonical file 最多解码一次。
- **不负责**：跨请求缓存或长期索引。
- **一致性边界**：只能承诺已读取文件集合在本次请求中的一致性；不能把整个脏工作区宣称为原子快照。

### Streaming Process Boundary

- **职责**：在保持 `shell: false`、显式 argv/env、超时和进程树清理的前提下，支持有界 stdout consumer、N+1 上限语义和调用方安全提前停止。
- **不负责**：理解 ripgrep JSON 业务语义；JSON 行解析仍属于 RipgrepBackend。

### Scope And Language Policies

- **RepositoryScopePolicy**：统一层级识别、显式 layers、test/docs 默认行为和 coverage scope 报告。
- **LanguageEvidenceAdapter**：按文件语言选择 lexical masking、classification 和 derived candidate 规则。
- **Fallback adapter**：不支持语言只允许 verified literal candidate，不允许 confirmed 或 derived semantic candidate。

## 4. EvidencePack schema v2 契约

详细字段和迁移规则见：

- `public-contract-v2.md`
- `v1-to-v2-compatibility.md`
- `threat-model.md`

### 4.1 兼容策略

- `schemaVersion` 从 `1.0` 升为 `2.0`，不在相同版本下静默改变 ID、排序和 repository 字段语义。
- package 仍处于 `0.x`，目标候选为 `0.2.0-beta.1`；schema 版本和 package 版本独立演进。
- 不提供同一调用同时返回 v1/v2 的双写模式，避免公共安全边界继续保留原始路径和内容派生 ID。
- v1 文档和 snapshots 保留为历史；v2 建立新的 contract projection 和 Golden snapshots。

### 4.2 全局 invariant

1. 未经过 allowlist/redaction 的 raw excerpt、raw file/symbol、绝对 repository root、Git object ID、内部 discovery key 和 raw content hash 不得越过 PublicResultAssembler。
2. public ID 只在一次 response 内承担引用和互斥标识；不得用于跨请求确认低熵内容。
3. 排序和预算必须先满足显式锚点，再处理非锚点相关性；同分时保持稳定。
4. 同一 canonical file 在一次请求中最多解码一次；公共 ID 分配前必须检查已读文件 snapshot，并丢弃来自变化、消失、不可读或复核失败文件的全部 evidence。
5. 文件发生变化、backend 提前停止、输出达到上限或语义语言不支持时，coverage 必须明确报告，不能返回伪完整 `ok`。
6. `question` 是否存在或内容如何变化，不得改变 production search plan、classification 或 ranking。
7. unsupported language 的 literal hit 可以成为 candidate，但不得成为 confirmed。
8. MCP locate structuredContent、text fallback 与 debug CLI locate JSON 必须表示同一个 v2 public result；probe/golden/help 不属于 locate schema。
9. v2 public cutover 前，各 coverage owner 必须提供真实字段；禁止使用占位值提前发布 schema v2。

## 5. 子 feature 清单

### F1 · public-output-boundary-v2

**状态：done**

建立 raw/public 模型分离、字段级脱敏、逻辑 repository ref、请求内公共 ID、strict success/error schema 和 locate 通道 forbidden scan。该 item 通过 internal/test seam 交付安全最小闭环，不切换生产 v1 surface。

### F2 · relevance-ranking-budget

实现显式锚点预留、离散相关性层级、稳定 tie-break、跨文件 round-robin 和 unsatisfied anchor coverage。

### F3 · request-snapshot-cache

实现请求级文件快照、一次解码、CodeGraph 预验证复用、增量 hit 验证，以及公共组装前变化文件 evidence discard。

### F4 · cross-platform-ci-baseline

在进程与路径语义继续变化前，建立 Node 22/24 与 Windows/Linux/macOS 验证矩阵。

### F5 · streaming-ripgrep

修正 stdout/stderr N+1 上限语义，增加流式 JSON line consumer、maxHits 提前停止和 partial evidence 保留，并按统一 mapping 写入 attempt termination、limit、degradation 与 strategy completeness。

### F6 · input-abort-contract-v2

把 `question` 改为可选说明文本，拆分 filesystem path normalization，并提供 request-level abort source、strategy completeness 与 per-backend termination ledger。

### F7 · repository-scope-policy

统一 basename/extension/segment/prefix layer mapping 及冲突优先级、test/docs 显式请求和 candidate scope decision。

### F8 · language-capability-boundary

引入 TypeScript/JavaScript、SQL 与 unsupported fallback adapters，公开 semantic capability 和降级原因。

### F9 · public-beta-release

补齐版本来源、Node engines、license/security/metadata、lint/format、迁移指南和 release candidate gate；在全部 field producer 通过后原子切换生产 locate schema v2。

### Goal Coverage Matrix

| 完成信号 | Owner item | 可执行证据 |
|---|---|---|
| v2 assembler 无已知 secret/root/hash 泄露且 strict schema 闭合 | F1 | unit + synthetic v2 projection + forbidden scan；生产仍保持 v1 |
| 显式锚点不再被字典序挤出 | F2 | permutation + small budget Golden |
| fallback 不重复解码同一文件 | F3 | counting reader + mutation integration |
| 核心路径跨 Node/OS 可复现 | F4 | CI matrix |
| 高频 ripgrep 返回 bounded partial | F5 | streaming parser + real process cleanup |
| question/path/abort 契约准确 | F6 | contract + CLI + MCP cancellation |
| scope 在 confirmed/candidate 一致 | F7 | `.spec/.test` + fixture segment + docs extension + multi-layer conflict fixtures |
| unsupported language 不误报 confirmed | F8 | Python/YAML/Shell negative fixtures |
| v2 原子切换与 beta 发布材料闭环 | F9 | production cutover + MCP/CLI parity + package dry-run + full aggregate verification |

## 6. 排期与依赖

### 依赖形状

```text
F1 → F2 → F3 ─────────────────────┐
      │                           │
F4 ───┴→ F5 ──────────────────────┤
                                  ├→ F9 (v2 cutover)
F1 → F6 → F7 → F8 ────────────────┘
```

单执行流默认顺序：F1、F2、F3、F4、F5、F6、F7、F8、F9。F4 可在 F1 设计批准后并行准备，但不得改变其他 feature 的公共契约。

### 每项基础验证

```text
npm run build
npm run typecheck
npm test
npm run test:golden -- --all
npm run test:mcp -- --all
npm run test:docs
python .codestable/tools/codestable-doctor.py --root .
```

- F1/F2/F3/F5/F6/F7/F8 涉及 schema producer 或 Golden projection，必须更新完整 contract ownership 和 companion snapshots，但只有 F9 切换 production schema。
- F3/F5 必须运行 large synthetic repository 与真实 process-tree cleanup。
- F4 起，Windows/Linux/macOS 的 blocking contract 由 CI 共同拥有，不能以单平台本地通过替代。
- F9 必须再对既有真实消费仓库执行一次只读 MCP E2E；执行前重新确认目标仓库、分支、状态和敏感输出边界。
- 每个 feature design 必须分配稳定 case ID、fixture owner 和对应 contract/unit/Golden owner；只有 snapshot 文本变化而无 case assertion 不算验收证据。

### 完成信号

- items.yaml 9/9 `done`，没有 dropped core item。
- 所有 review 中的 P0/P1 项均有实现与回归证据；P2 延后项有明确 residual。
- 完整 Node/OS matrix 通过。
- v2 public output forbidden scan 不含 policy 判定为敏感的未脱敏 input value、测试 secret corpus、绝对 root、Git object ID、内部 hash 或未 scrub 的 diagnostic detail；普通非敏感 normalized term 允许返回。
- `0.2.0-beta.1` package dry-run、文档 smoke 和真实 MCP E2E 通过。
- owner 单独批准 license、移除 `private: true`、发布 npm/GitHub release；这些动作不因 roadmap 完成而自动发生。

## 7. 风险与缓解

1. **公共 schema 改动面过大**：使用独立 schema v2 和迁移矩阵；不在 v1 snapshots 上静默更新。
2. **安全脱敏降低可用性**：安全路径保留相对定位；敏感路径整体替换并显式 `resolvable=false`，不以“部分路径仍可导航”制造错误承诺；绝对 root 始终不公开。
3. **排序改变 Golden 大量漂移**：先建立 rank truth table，再更新 snapshots；禁止只为通过 snapshot 调整优先级。
4. **请求 cache 削弱 TOCTOU 安全**：缓存 verified file handle snapshot，并在请求结束复核；不引入跨请求 cache。
5. **流式终止留下子进程**：复用现有 process-tree cleanup，新增 expected early-stop outcome 和 PID cleanup tests。
6. **语言边界被误解为全面支持**：coverage 明确拆分 text search 与 semantic classification。
7. **发布治理抢跑**：F9 依赖所有 core feature；`private: true`、merge、push、release 均需要独立 owner 动作。

## 8. 观察项

- 如果后续出现必须跨请求引用同一 evidence 的真实用例，再评估安装级 HMAC ID；public-beta 不为假设需求引入密钥生命周期。
- Git dirty 只描述仓库状态，不代表 RepoNav 可以冻结整个工作区；确定性承诺限于已读文件 snapshot。
- RepositoryScopePolicy 的用户自定义配置格式不在本路线强制交付；先通过注入式默认 policy 和 coverage 固定语义。
- Python/Go/Rust adapter 由真实使用数据决定优先级，不因 text search 可命中就宣称语义支持。
- lint/format 只对新改动建立门禁，不在发布 PR 中混入全仓无关重排。
