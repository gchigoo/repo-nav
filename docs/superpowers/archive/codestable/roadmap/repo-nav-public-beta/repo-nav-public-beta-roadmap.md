---
doc_type: roadmap
slug: repo-nav-public-beta
status: active
created: 2026-07-23
last_reviewed: 2026-07-24
tags: [repository-retrieval, mcp, evidence, security, public-beta]
related_requirements: [source-of-truth-evidence]
related_architecture: [repo-nav-foundation]
---

# RepoNav public-beta 安全与可靠性硬化

## 1. 背景

RepoNav MVP 已经实现并验收了只读、确定性的 `repo_nav_locate`：外部 Agent 提供结构化搜索词与锚点，RepoNav 通过 CodeGraph-primary、ripgrep-fallback 和当前文件系统核验返回 confirmed、candidate、coverage 与 next actions。

2026-07-22 的外部静态 review 认可了这一产品边界，同时指出：当前公开脱敏只覆盖 excerpt；Evidence ID 仍由脱敏前内容派生；结果预算按字典序截断；CodeGraph fallback 会重复验证；ripgrep 完整缓冲大结果；scope、语言能力和取消语义没有在公共契约中完整表达。这些问题不会让现有回归测试失败，但会限制外部用户对安全性、相关性、确定性和大仓库行为的信任。

F1 `public-output-boundary-v2` 随后以 dormant internal/test seam 建立了 raw/public allowlist、response-local ID 和 no-cutover gate。2026-07-23 的 public-beta 复审进一步证明：F1 的方向正确，但 response-wide corpus 会传播单字符或低熵 assignment value，`replaceAll` 会再次改写 placeholder，电话模式会吸收日期，reason provenance 受遍历顺序覆盖；同时 excerpt 只限制单个 token，raw/public/aggregate 还没有真正的资源边界。现有 build、typecheck 和 46 个 v2 unit 仍通过，说明这些属于测试 oracle 与设计边界缺口，而不是基线已红。

本 roadmap 不扩张 RepoNav 的核心产品定位，而是把现有 MVP 硬化为可公开标记 beta 的本地工具。既有 `repo-nav-mvp` roadmap 保持完成态，不回写或改写其历史契约；本路线通过 EvidencePack schema v2 明确承接不兼容变化。

## 2. 范围与明确不做

### 本 roadmap 覆盖

- 建立原始内部证据与公共 DTO 之间的单一、强制输出边界。
- 阻断 secret、连接串、个人数据、绝对本机路径和原始内容 hash 通过任意公共字段或旁路输出。
- 把公共字段脱敏改为基于原始输入 span 的单次物化；对跨字段 corpus 实施传播资格、匹配边界、reason union 和硬容量限制。
- 对 raw contract、corpus、脱敏后公共字段和完整序列化响应实施数量与 UTF-8 byte budget。
- 建立 canonical internal facts + v1 projection bridge，使真实 producer 能逐项落地而 production transport 仍保持 v1；只有 F9 切换 projection edge。
- 以确定性的相关性层级替换纯字典序预算，优先满足显式 file/symbol anchors，并保持跨文件多样性。
- 在一次 locate 请求内复用文件快照和 CodeGraph 预验证记录，检测已读文件在请求期间发生的变化，并在公共组装前丢弃变化文件的 stale evidence。
- 为 ripgrep 增加流式 JSON 消费和有界提前停止；所有 incomplete 前缀只保留为 bounded attempt telemetry，只有 `complete-safe-set` 或完整 fallback 才能进入 F3/F2 evidence。
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
| 最小价值闭环 | 已完成的 `public-output-boundary-v2` 在不切换 production v1 的前提下建立 dormant v2 assembler；复审后的最小安全闭环还要求 `span-redaction-corpus-policy-v2` 与 `public-result-resource-budgets-v2` 关闭低熵传播、placeholder 放大和无界扫描。 |
| 完成边界 | 只有脱敏算法、资源上限、相关性、快照一致性、流式大结果、能力诚实报告和跨平台矩阵全部通过，才允许标记 `0.2.0-beta.1` 候选。 |

## 3. 模块拆分

```text
LocateRequestParser
        ↓
RequestExecutionContext + RepositorySnapshotResolver
        ↓
SearchPlanBuilder
        ↓
BackendExecutor → BackendExecutionOutcomeV2
        ↓
RepositoryScopeObservation + SafeGroupFold
（path safety 后、anchor/file budget 前只决定 expanded eligibility）
        ↓
DiscoveryHitSelector（只做 expanded anchor/file 预留；legacy 保留旧 lane）
        ↓
EvidenceVerifier + RequestFileCache
        ↓
RepositoryScopePolicy consumers + LanguageEvidenceAdapter
        ↓
CandidateExpander
        ↓
FinalSnapshotCheck（先 purge stale evidence）
        ↓
RepositoryScopeCoverage + LanguageCapabilityCount
（基于 stable eligible pool 计算 matched/unmatched/unsupported）
        ↓
EvidenceRanker + EvidenceBudget
        ↓
CanonicalLocateExecution + LocateFactEnvelope
        ├────────→ V1LocateResultProjector（F9 前唯一 production edge）
        └────────→ UnsafePublicMaterializationSourceV2（F2/F3 trusted proofs）
                            ↓
                 F1B source count/field/4 MiB guard
                            ↓
                 F1 corpus guard + single span materialization
                 + public-field budgets
                            ↓
                 Four-prerequisite token（snapshot/ranking/scope/capability）
                            ↓
                 RequestOutcomeAggregatorV2（F6；F8 production caller）
                            ↓
                 F1C aggregation registrar fresh-adds backend/request-outcome
                 and freezes completion-bearing token
                            ↓
                 RequiredOwnerFinalizerV2 → TrustedFinalizedLocateFactsV2
                            ↓
                 MaterializedLocateResultComposerV2
                            ↓
                 Strict public schema + F1B compact 1 MiB serializer
                 （F8 形成完整真实 shadow；F9 才接 transport）
```

### Public Result Boundary

- **职责**：把trusted source、materialized evidence core与typed owner facts经唯一受控链路物化为locate公共DTO；在任何递归corpus扫描前执行source count/field/byte contract，协调单次span脱敏、public-field budget、owner aggregation、公共ID、strict schema、serialized response budget及structured/text/debug-locate parity。
- **不负责**：检索、分类、排序、文件读取或 diagnostic stderr policy。
- **删除测试**：v2 cutover 后，绕过该边界的 MCP/debug-locate success 或 error output 必须被架构/导入检查阻止；probe/golden/help 继续使用自己的版本化 schema。
- **Depth / locality**：`source → materialization → aggregation → finalizer → composer → schema → serializer`是唯一public-output seam；caller不能提交完整raw result、corpus或stage callback，也不知道matcher、span合并、placeholder或byte-accounting细节。安全策略变化集中在boundary内，不向Evidence Engine、MCP和CLI散播。

### Span Redaction And Corpus Policy

- **职责**：所有 detector 只读取原始字段并返回 `{start,end,reasonCodes}`；合并重叠 span 后一次性物化输出。跨字段 corpus 只接受满足传播资格的高置信 token，并按 exact text boundary 或完整 path segment 匹配。
- **不负责**：决定 evidence 是否 confirmed/candidate、重新排序结果或读取仓库文件。
- **关键约束**：本地 assignment value 始终隐藏；通用 assignment 的跨字段传播要求 8–512 UTF-8 bytes、至少 4 个不同 code point、非纯数字且不属于 low-information literal/sentinel；placeholder 不进入 corpus，也不再扫描已经物化的输出。
- **删除测试**：删除该模块会迫使 term/file/symbol/excerpt 各自重新实现 secret、PII、边界和 reason 规则，属于真实 deep module，不是 pass-through seam。

### Result Resource Budget

- **职责**：冻结 raw collection/field、corpus、public field 和 serialized response 四层预算；提供 UTF-8 byte accounting、N/N+1 校验和固定 fail-closed 映射。
- **不负责**：通过排序选择 evidence；数量预算必须与 LocateLimits 对齐，aggregate budget 不得偷偷丢尾部结果或重排 ID。
- **关键约束**：raw 输入在 corpus 收集前有界；脱敏后再次逐字段检查；corpus 超限或最终序列化结果超限返回固定安全 `INTERNAL_ERROR`，不截断 corpus 后继续输出。
- **删除测试**：删除该模块后 assembler 无法证明 CPU/内存/响应大小上界，公共安全边界不成立。

### Canonical Locate Facts Bridge

- **职责**：让真实执行管线产出内部`LocateFactEnvelopeV2`，把`snapshot`、`ranking`、`backend`、`request-outcome`、`scope`与`capability`作为有明确owner的typed fragments；`RequiredOwnerFinalizerV2`只有在全部required fragments存在且一致时才签发opaque `TrustedFinalizedLocateFactsV2`，随后由独立composer/schema/serializer完成公共结果。F9前production service只选择`V1LocateResultProjector`，同一envelope的v2 projection只能由test/shadow harness调用。
- **不负责**：填造尚未交付的 coverage 值、改变 v1 公共 schema，或在 F9 前让 MCP/CLI transport 选择 v2。
- **过渡 invariant**：缺失 owner 使用类型化 absence，不能用空数组或假complete。F3/F2/F7证明
  base owner，F5证明trace，F6用direct harness证明aggregator owner/status seam但不声称mount；F8必须证明
  four-prerequisite gate、唯一production core accessor、fresh complete-envelope registration与finalization。
  “owner seam accepted”不等于“real envelope mounted”。F9只替换transport projector edge。
- **no-cutover gate 演进**：F1 的“production 文件不得 import v2”门禁由本 item 改成更精确的 transport reachability gate：production 可以依赖 internal facts/types，但 `McpStdioHost`、debug CLI 和 `RepositoryEvidenceService.locate()` 在 F9 前不得调用 `PublicResultAssemblerV2`，不得返回 schema v2。
- **Depth / locality**：envelope 隐藏各 producer 的组装顺序，projector 隐藏 v1/v2 表示差异；不是双写 transport，也不是把同一结果串行转换两次。

### Discovery Selection And Evidence Ranker

- **职责**：F3 在单一 canonical execution 内同时维护 legacy-compatible lane 与 expanded-v2 lane，拥有 raw locator/legacy adapter、canonical scope universe/fold、任何cap前的public-safe等价类selector、请求级snapshot/cache、final purge、typed trust pool与neutral language carrier；`DiscoveryHitSelector` 在文件读取前只按显式 anchor 与 file budget 保留待核验文件。F2 `EvidenceRanker`只消费F3 final snapshot check后仍稳定的records，执行离散优先级、collision-atomic budget与round-robin，并通过唯一two-stage factory把ranking outcome接入F1B source preflight、F1 materialization和F1C source/materialization registrars。
- **不负责**：概率相关性、自然语言 question 解释或 candidate promotion。
- **约束**：pre-verification selector不生成最终anchor satisfaction；不完整backend prefix只保留telemetry，不进入F3 safe pool。final snapshot check先purge变化文件，随后F2从剩余稳定集合一次性计算retained set、anchor ledger与budget；F2 current acceptance的future F8 accessors runtime importer均为0，F8 acceptance才按exact allowlist装配。评分只作为内部枚举/整数序位，不进入public confidence。

### Request Snapshot

- **职责**：在一次请求内持有resolved root、canonical file snapshot、双lane discovery/trust state、已核验records和粗粒度Git state；同一canonical file最多解码一次。F3还负责把raw locator与legacy adapter结果收敛为scope-folded public-safe selector view、stable pool与proof-bound completeness，禁止raw prefix或private locator越过trust boundary。
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

### 4.3 过渡 projection 协议

F1C 冻结以下内部 seam；它不属于 public schema：

```ts
const LOCATE_FACT_OWNER_ORDER_V2 = [
  'snapshot',
  'ranking',
  'backend',
  'request-outcome',
  'scope',
  'capability',
] as const;

type LocateFactOwnerV2 = (typeof LOCATE_FACT_OWNER_ORDER_V2)[number];

type FinalizedUnsafeSuccessPackV2 = Extract<
  FinalizedUnsafeLocateResultV2,
  Readonly<{ ok: true }>
>['evidence'];

type UnsafeEvidenceDraftV2 =
  | FinalizedUnsafeSuccessPackV2['confirmed'][number]
  | FinalizedUnsafeSuccessPackV2['candidates'][number];

interface RankedEvidenceFactsV2 {
  readonly confirmed: FinalizedUnsafeSuccessPackV2['confirmed'];
  readonly candidates: FinalizedUnsafeSuccessPackV2['candidates'];
  readonly unsatisfiedAnchors: readonly UnsatisfiedAnchor[];
}

interface SnapshotFactsV2 {
  readonly coverage: RepositorySnapshotCoverage;
  readonly finalStableEvidence: readonly UnsafeEvidenceDraftV2[];
}

interface BackendFactsV2 {
  readonly outcomes: readonly BackendAttemptV2[];
  readonly indexState: IndexState;
  readonly indexFreshness: IndexFreshness;
}

interface RequestOutcomeFactsV2 {
  readonly strategyComplete: boolean;
  readonly fallbackChecked: boolean;
  readonly abortSource: 'none' | 'caller' | 'deadline';
  readonly limitsReached: readonly LimitReasonCode[];
  readonly degradations: readonly CoverageDegradationCode[];
  readonly exclusionSummary: Readonly<Partial<Record<ExclusionReasonCode, number>>>;
  readonly nextActions: readonly NextActionCode[];
}

interface LocateFactPayloadsV2 {
  readonly snapshot: SnapshotFactsV2;
  readonly ranking: RankedEvidenceFactsV2;
  readonly backend: BackendFactsV2;
  readonly 'request-outcome': RequestOutcomeFactsV2;
  readonly scope: ScopeCoverage;
  readonly capability: CapabilityCoverage;
}

type LocateFactFragmentsV2 = Readonly<{
  [K in LocateFactOwnerV2]?: Readonly<{ owner: K; value: LocateFactPayloadsV2[K] }>;
}>;

interface LocateFactEnvelopeV2 {
  readonly repositoryRoot: string;
  readonly normalizedTerms: readonly NormalizedSearchTerm[];
  readonly fragments: LocateFactFragmentsV2;
}

declare const TRUSTED_FINALIZED_LOCATE_FACTS_V2: unique symbol;
type TrustedFinalizedLocateFactsV2 = Readonly<{
  readonly [TRUSTED_FINALIZED_LOCATE_FACTS_V2]: never;
}>;

type FinalizeLocateFactsV2Result =
  | Readonly<{ ok: true; value: TrustedFinalizedLocateFactsV2 }>
  | Readonly<{
      ok: false;
      reason: 'missing-owner';
      missingOwners: readonly LocateFactOwnerV2[];
    }>
  | Readonly<{
      ok: false;
      reason: 'invalid-facts';
      missingOwners: readonly [];
    }>;

type UnsafeToolErrorFactsV2 = Extract<
  FinalizedUnsafeLocateResultV2,
  Readonly<{ ok: false }>
>['error'];

type LegacyV1LocateSuccess = Extract<LocateResult, Readonly<{ ok: true }>>;
type LegacyV1LocateFailure = Extract<LocateResult, Readonly<{ ok: false }>>;

type CanonicalLocateExecutionV2 =
  | Readonly<{
      ok: true;
      envelope: LocateFactEnvelopeV2;
      legacyV1Projection: LegacyV1LocateSuccess;
    }>
  | Readonly<{
      ok: false;
      error: UnsafeToolErrorFactsV2;
      legacyV1Projection: LegacyV1LocateFailure;
    }>;

declare const LOCATE_PROJECTION_EXECUTION_CAPABILITY_V2: unique symbol;
type LocateProjectionExecutionCapabilityV2 = Readonly<{
  readonly [LOCATE_PROJECTION_EXECUTION_CAPABILITY_V2]: never;
}>;

declare const LOCATE_EXECUTION_TOKEN_V2: unique symbol;
type LocateExecutionTokenV2 = Readonly<{
  readonly [LOCATE_EXECUTION_TOKEN_V2]: never;
}>;

function issueLocateProjectionExecutionCapabilityV2():
  LocateProjectionExecutionCapabilityV2;

interface CanonicalLocateExecutorV2 {
  execute(
    request: LocateRequest,
    context: LocateExecutionContext,
    projectionExecution: LocateProjectionExecutionCapabilityV2,
  ): Promise<CanonicalLocateExecutionV2>;
}

function requireCanonicalLocateExecutionTokenV2(
  input: CanonicalLocateExecutionV2,
  projectionExecution: LocateProjectionExecutionCapabilityV2,
): LocateExecutionTokenV2;

interface LocateResultProjector<TOutput> {
  project(
    input: CanonicalLocateExecutionV2,
    projectionExecution: LocateProjectionExecutionCapabilityV2,
  ): TOutput;
}
```

- issuer在private registry中同时创建无own-property的projection capability与internal
  `LocateExecutionTokenV2`。canonical executor必须接收该capability，在任何owner工作前取得同一token，
  并在返回前把exact terminal `CanonicalLocateExecutionV2`、capability与token原子绑定；
  `requireCanonicalLocateExecutionTokenV2(input, capability)`只在三者exact匹配时返回该token。
  input/capability/token clone、swap或cross-execution必须在任何facts/value暴露前失败。
- F1C冻结`four-prerequisite admission → source → materialization → aggregation completion →
  finalizer`唯一生命周期。pre-stage inspector只要求snapshot/ranking/scope/capability且拒绝base预置
  backend/request-outcome，success只签opaque prerequisite token；缺任一prerequisite时所有stage为0。
  F2 source消费该token；F8 aggregation把F6 exact双fragment/status交给F1C registrar，registrar以fresh
  builder补齐后两owner、冻结new complete envelope并把它私有绑定进aggregation token；finalizer不读
  original partial envelope，只消费该completion-bearing token。`createRequiredOwnerFinalizerV2()`与
  `createMaterializedLocateResultComposerV2()`是各自exact deep module唯一zero-argument runtime
  acquisition ABI，返回窄接口实例且不导出concrete class、service locator或package-barrel symbol。
- pre-stage missing按four-prerequisite顺序；`RequiredOwnerFinalizerV2`则从completion-bearing aggregation
  registry恢复new complete envelope并按六owner顺序检查final completeness、交叉invariant与evidence状态。
  两个gate都不能填默认值；finalizer成功只签opaque `TrustedFinalizedLocateFactsV2`，不调用后续层。
- complete path的层次固定为required-owner finalizer签
  `TrustedFinalizedLocateFactsV2` → materialized composer → strict public schema validator → F1B compact
  1 MiB serializer；四层必须独立调用、计数与fail closed，不能折叠为单个callback。
- F1C 只要求 `repositoryRoot + NormalizedSearchTerm[] + legacyV1Projection`，不宣称拥有 F3 facts；`caseSensitive` 原样保留，F1C 必须覆盖 sensitive/insensitive/smart 三种 normalization 的 v1 projector parity。
- F3 才提供 snapshot fragment：`finalStableEvidence` 是 final check/purge 后的稳定、未预算池。ranking fragment 的 confirmed/candidates 必须按 discovery key 是该池的互斥子集，anchor ledger 与 limits 必须由同一池计算；finalizer 发现缺 snapshot、池外、重复或 changed-file record 时 fail closed。
- F1C 把现有 `RepositoryEvidenceEngine.locate()` 的执行逻辑移入 `CanonicalLocateExecutorV2.execute()`；production `RepositoryEvidenceService.locate()` 只issue一次capability、调用一次executor并把同一capability传给`V1LocateResultProjector`。v2 shadow harness直接复用同一个executor/input/capability/token，不复制backend/verification pipeline。
- `legacyV1Projection` 是过渡期唯一 v1 compatibility payload，由同一次 execution state 生成；owner fragments 不得从已脱敏的 legacy result 反向推导，也不得另跑一次 backend/reader。F9 切换后删除该字段和 v1 projector。
- F1C 的 `LocateRequest` / `LocateExecutionContext` 指当前 internal ports；F6 在同一 executor port 上迁移到 v2 input semantics，不改变 canonical result/projection seam。
- F6 current compile-time contribution tuple严格只有
  `[PublicMaterializationContributionV2, SnapshotOutcomeContributionV2]`；F7 scope与F8 capability
  contribution只属于各自child-owned non-executable forward revision，当前F6不得预留optional slot、
  import其type/accessor/fixture或用placeholder补齐。
- F9 前唯一production projector仍只绑定 `V1LocateResultProjector`。F8 acceptance可在
  `EvidenceModule`用internal
  `ACCEPTED_COMPLETE_REAL_LOCATE_SHADOW_ORCHESTRATOR_V2`唯一登记已装配ready façade，但不得export
  token，且service/projector/MCP/CLI没有consumer或DI edge到该token；不得注册第二个MCP/CLI output，
  也不得在一次请求中双写。
- F3/F2/F7 acceptance各自证明base owner fragment；F5证明trusted trace；F6证明aggregator
  backend/request-outcome/status direct seam且production core-accessor/registrar importer仍为0，不把future
  mount计作本项证据；F8统一证明capability、four-prerequisite admission、F2两段、F6 aggregation、
  F1C complete-envelope mount/finalization与v1 no-cutover。
- F8提供最后一个required fragment后，accepted façade必须先以
  `requireCanonicalLocateExecutionTokenV2(input, capability)`恢复同次internal token，再按固定stage顺序
  完成真实shadow。F8 exact owner独占internal DI token、orchestrator interface/attempt/accessor、
  zero-argument factory与七个private wrapper，`EvidenceModule`只登记一个non-exported provider。
  F9只能注入该token并调用ready façade/accessor处理success，或调用F1C fixed-safe error
  serializer/common accessor处理failure，不得import F8 factory/provider descriptor、F1C
  `createRequiredOwnerFinalizerV2`、`createMaterializedLocateResultComposerV2`、internal token accessor或
  任一stage owner。F9只切换projector binding、移除v1 transport path并执行公共E2E。

### 4.4 Span redaction 协议

跨 feature 共享的内部接口冻结为：

```ts
type CorpusPropagationModeV2 = 'exact-text' | 'path-segment';

interface SensitiveSpanV2 {
  readonly start: number;
  readonly end: number;
  readonly reasonCodes: readonly RedactionReasonCodeV2[];
}

interface SensitiveCorpusEntryV2 {
  readonly value: string;
  readonly reasonCodes: readonly RedactionReasonCodeV2[];
  readonly propagation: CorpusPropagationModeV2;
}

interface SensitiveCorpusV2 {
  readonly entries: readonly SensitiveCorpusEntryV2[];
  readonly totalUtf8Bytes: number;
}
```

- `start/end` 是针对 detector 收到的**精确原始 JavaScript string**的 0-based UTF-16 code-unit offset，区间为 half-open `[start,end)`；检测前不得 NFKC、大小写折叠、换行转换或插入 placeholder。
- `0 <= start < end <= original.length`，起止必须落在 Unicode code-point 边界，禁止切开 surrogate pair。CRLF 保留为两个 code unit；任何 sanitizer span 若触及其中一个必须扩展覆盖整对。fixtures 必须包含 emoji、组合字符、孤立 surrogate、LF 与 CRLF。
- span 按 `(start,end,reason enum order)` 稳定排序；重叠或直接相邻（`next.start <= current.end`）的 span 合并为一个，reasonCodes 做集合并按契约枚举顺序输出。
- detector、corpus matcher 和 control-character matcher 全部在原始字段上产生 span；输出只 materialize 一次。
- local assignment redaction 不依赖 corpus eligibility；低熵值即使不能传播，也必须在其原字段内隐藏。
- assignment extractor 只去掉语法引号，不改变捕获值；跨字段匹配使用原值、case-sensitive 且不做 Unicode normalization。eligibility 另用 `value.normalize('NFKC').trim().toLowerCase()` 的 comparison key：要求原值 8–512 UTF-8 bytes、comparison key 至少 4 个不同 Unicode code point、非纯数字，并且不在 canonical low-information set `{true,false,null,undefined,none,nil,yes,no,on,off,n/a,na,unknown,default,test,example,sample,dummy,changeme,redacted,[redacted],[redacted_path]}`。该集合只能通过 roadmap update 改变。
- exact-text matcher 先找原值的精确 code-unit 序列；若首/尾 code point 属于 Unicode `Letter|Number|Mark|Connector_Punctuation`，对应外侧不得紧邻同类 code point。这样 `cat` 不命中 `catalog`，而带标点的长 secret 仍可完整匹配。
- path 的 inherited corpus 只允许 POSIX `/` 分段后的完整 segment case-sensitive 等值匹配；固定 credential/PII 仍可由 path 自身 detector 命中。禁止 `path.includes(corpusValue)`。
- phone classifier 先提取允许 `+ - ( ) . space` 的完整片段并统计 10–15 位数字；随后排除 ISO date/datetime、SemVer/点分版本、canonical UUID 及其片段、`YYYYMMDD[HHMMSS]`、带 `version|ver|build|release|timestamp|epoch` cue 的数字，以及不符合 `3-3-4` 或可选 1–3 位 country-code 结构的短横线数字组。落入 2000-01-01..2099-12-31 Unix seconds/milliseconds 范围的裸 10/13 位数字是 ambiguous/local-only，除非同字段有 `phone|tel|mobile|contact` cue，否则不得进入 response-wide corpus。下表的 reject 表示不得作为 phone corpus entry；local detector 是否隐藏由上下文 rule 决定。

| accept | reject |
|---|---|
| `+1 (415) 555-2671` | `2026-07-23` |
| `415-555-2671` | `v1.20.260723` |
| `13800138000` | `1690000000` with `timestamp=` cue |
| `phone=2125551234` | bare `1690000000` / `1690000000000` |
| `+86 138 0013 8000` | `550e8400-e29b-41d4-a716-446655440000` |
|  | `20260723153000` |
|  | `123-45-678` |

**Interface 设计检查**：这是 in-process pure module，不引入 adapter。PublicResultAssembler 和 unit/Golden tests 都必须穿过同一接口；生产与测试不允许维护两套 matcher。

### 4.5 资源预算协议

```ts
const LOCATE_RESULT_V2_BUDGETS = {
  normalizedTermCount: 16,
  normalizedTermBytes: 128,
  normalizedTermsTotalBytes: 1024,
  confirmedCount: 20,
  candidateCount: 20,
  evidenceTotalCount: 40,
  rawFileBytes: 4096,
  rawPathSegments: 128,
  rawSymbolBytes: 2048,
  rawExcerptBytes: 16 * 1024,
  rawResultBytes: 4 * 1024 * 1024,
  corpusEntries: 128,
  corpusTotalBytes: 32 * 1024,
  corpusEntryBytesMin: 8,
  corpusEntryBytesMax: 512,
  publicTermBytes: 128,
  publicFileBytes: 2048,
  publicSymbolBytes: 2048,
  publicExcerptBytes: 2048,
  publicResultBytes: 1024 * 1024,
} as const;
```

- raw 输入先经过 shallow count/type guard 与 abort-at-N+1 UTF-8 byte counter，再进入 deep Zod parse、`JSON.stringify` 或 `collectSensitiveCorpusV2`；`confirmed/candidates` 上限与 public request 的最大 limits 对齐。
- corpus 超过条目数或累计 bytes 时不允许截断后继续；assembler 返回固定 safe `INTERNAL_ERROR`。
- term/file/symbol/excerpt 在 span materialization 后重新检查 UTF-8 bytes。单字段超限用固定 oversized placeholder 与 redaction metadata；path 变为不可解析。
- public result 完成 allowlist、ID 和 strict parse 后检查 JSON UTF-8 bytes；超过 1 MiB 返回固定 safe `INTERNAL_ERROR`，不得向 error 暴露原始大小或字段内容。
- 所有边界必须有 N、N+1、multi-byte Unicode 和 array count mutation；性能断言以有界操作数/输出长度为主，不依赖脆弱墙钟阈值。
- 40 条 evidence 的未转义 raw field payload 约低于 1 MiB，4 MiB raw cap 为 JSON escaping 与 metadata 留出余量；三个 2 KiB public location fields 的未转义上界约 240 KiB，1 MiB public cap 为 escaping、coverage 和 provenance 留出余量。若真实 fixture 证明余量不足，必须在 F1B design 用测量证据调整常量并重跑 roadmap review，不能静默放宽。

### 4.6 Backend outcome、取消与 next-action 协议

F5 只产出以下 backend/process 事实；F6 独占 request 聚合：

```ts
interface BackendExecutionOutcomeV2 {
  readonly backend: 'codegraph' | 'ripgrep';
  readonly status: 'used' | 'unavailable' | 'failed';
  readonly completion: 'complete' | 'incomplete';
  readonly selectionEligibility: 'complete-safe-set' | 'telemetry-only';
  readonly termination:
    | 'none'
    | 'timeout'
    | 'output-limit'
    | 'early-stop'
    | 'aborted'
    | 'process-error';
  readonly reasonCode?: BackendReasonCode;
  readonly hitCount: number;
  readonly retainedHits: readonly BackendHit[];
}
```

- `complete-safe-set` 只允许 `used/complete/none`；所有 incomplete、timeout、
  output-limit、early-stop、aborted、failed 与 unavailable outcomes 都是
  `telemetry-only`。
- incomplete outcome 的 `retainedHits` 只用于 F5 内部有界诊断并派生 `hitCount`；
  F6 只接收移除 `retainedHits/selectionEligibility` 后的 public-neutral telemetry。
  internal retained hits 不进入 F3 safe candidate pool、F2 selector 或 public evidence；
  普通 ripgrep raw prefix 无法证明 safe-key 等价类完整。只有独立完成的 backend 或
  完整 fallback outcome 可以贡献 evidence。
- `abortSource=caller` 唯一派生 `status='cancelled'`。
- `abortSource=deadline` 唯一派生 `status='timeout'`，并要求 `TIMEOUT_REACHED`。
- backend 自身 timeout 只写 attempt `termination='timeout'`；完整 fallback 满足策略时仍可得到 `ok/no_result`。
- caller/deadline 前已经完成 final snapshot check 的 stable evidence 可以保留，但顶层状态仍分别为 `cancelled/timeout`。
- F6 的 finalization latch 位于最后一次异步 snapshot check 返回之后、purge/rank/budget/ID/assembler 这段同步 finalize 之前。latch 关闭前 caller/deadline 采用 first-writer-wins；关闭时一次性冻结 `abortSource` 并清除 deadline timer，关闭后新到达的 abort 不再改变当前 response。latch 关闭时已 abort 必须得到 `cancelled/timeout`，关闭后才 abort 则按已经冻结的非 abort facts 完成。
- `nextActions` truth table：

| 条件 | actions |
|---|---|
| `status=no_result` | `ADD_TERM`, `ADD_SYMBOL_ANCHOR` |
| retained candidates 非空（包括 partial/cancelled/timeout） | 加 `CONFIRM_CANDIDATE` |
| `indexState=missing` 且 status 为 `no_result|backend_unavailable` | 加 `INITIALIZE_CODEGRAPH` |
| `status=partial` 且 `MAX_FILES|MAX_CONFIRMED|MAX_CANDIDATES` 中至少一项仍低于 request maximum | 加 `RETRY_WITH_HIGHER_LIMIT` |
| `status=timeout`, `abortSource=deadline`, `timeoutMs` 低于 maximum | 加 `RETRY_WITH_HIGHER_LIMIT` |
| `status=cancelled` | 禁止仅因取消添加 retry；只保留上面的 candidate action |

未命中条件时 actions 为空；最终按 enum order 去重。backend output/hit internal caps 不是 caller 可调 request limit，不能单独触发 `RETRY_WITH_HIGHER_LIMIT`。

### 4.7 Design It Twice

| 候选 | Depth / locality | Seam placement | 结论 |
|---|---|---|---|
| production v1 与 test v2 各跑一遍 backend/reader | 两套执行状态会漂移，snapshot/cancel 无法比较；测试不能证明 production facts | seam 在 transport 之后，过晚 | 拒绝；违反一次请求一次执行和 no-fake-facts |
| 单一 canonical executor + typed owner fragments + 临时 v1 projector / v2 shadow projector | executor 隐藏真实执行复杂度，projector 只承担版本表示；F9 删除 legacy edge | seam 位于 execution facts 与 public representation 之间 | **采用**；migration adapter 有明确生命周期与删除条件，不是永久 pass-through |
| F1C four-prerequisite token + three registrars → F2 two-stage factory → F8/F6 aggregation completion → F1C finalizer → F9 token-only consumer | pre-stage只要求不会由后续stage生成的四owner；aggregation registrar补齐后两owner并返回completion-bearing token；finalizer只读new complete envelope | admission、generation、final completeness分成三个显式类型边界 | **采用**；消除“六owner已存在才能生成其中两owner”的生命周期环 |
| 在现有 `replaceAll` 前增加最小长度、escape 和 placeholder 特判 | matcher 与 mutation 顺序继续耦合；每加一种 reason 都可能重新处理旧输出 | 仍散在 text/path 分支 | 拒绝；只能覆盖已知反例，不能建立一次物化 invariant |
| detector spans + bounded corpus + 独立 resource guard | detector 隐藏识别复杂度，materializer 只处理合并 span，budget guard 统一四层上限 | 全部位于唯一 PublicResultAssembler seam 内 | **采用**；pure in-process interface，测试与生产共用，无 adapter |
| streaming JSON assembler 边生成边做 aggregate budget | aggregate 内存更低，但会把 strict schema、ID 分配和 serializer 顺序绑成新状态机 | 需要替换现有 DTO/Zod 边界 | 暂不采用；1 MiB public cap 下收益不足，若未来 transport 需要增量响应再单独设计 |

### 4.8 ABI Evolution Table

| 阶段 | 新增/扩展 ABI | 当前可执行 importer | 下游演进与禁止项 |
|---|---|---|---|
| F1C | four-prerequisite token、neutral source/materialization tokens、completion-bearing aggregation token、三个registrars、finalizer/composer | test synthetic；F8前无complete real mount；production transport仍v1 | aggregation view含identity+backend+requestOutcome+status；registrar fresh-freeze complete envelope |
| F3 | snapshot contribution、dual-lane safe discovery/trust pool、scope-folded selector view | canonical executor/F3 test harness | raw locator/telemetry prefix不得进入F2 |
| F2 | ranking outcome、two-stage source/materialization factory、core/retained accessors | F2 acceptance两个future accessor runtime importer均为0 | 只冻结F8 exact allowlist；不得提前创建F8 consumer |
| F5 | trusted backend outcome/trace与public-neutral telemetry | F3 trusted handoff、F6 trace accessor | telemetry移除retainedHits/selectionEligibility；F5不写public owner |
| F6 | backend/request-outcome fragments、tuple `[materialization,snapshot]`、trusted status/proof direct seam | acceptance仅testkit direct integration；production F2 core accessor与F1C registrar importer=0 | F6不声称real mount；F8是唯一production bridge |
| F7 | tuple原子扩为`[materialization,snapshot,scope]`与producer arbitration | F7-owned registrar/materializer | 当前revision明确无index 3 |
| F8 | tuple原子扩为`[materialization,snapshot,scope,capability]`、capability owner、four-prerequisite inspector、seven-wrapper ready provider | F6按index 0..3各exact accessor一次；EvidenceModule唯一provider；F2 importer各0→1 | 旧三项/optional/reorder/proof swap拒绝；finalizer只消费completion token |
| F9 | accepted token/interface consumer与唯一projector cutover | production projector binding | 只消费ready success或fixed-safe error；不重建stage或保留v1双写 |

## 5. 子 feature 清单

### F1 · public-output-boundary-v2

**状态：done**

建立 raw/public 模型分离、字段级脱敏、逻辑 repository ref、请求内公共 ID、strict success/error schema 和 locate 通道 forbidden scan。该 item 通过 internal/test seam 交付 dormant v2 边界，不切换 production v1；其 2026-07-23 验收保持历史不变，beta 复审发现的缺口由 F1A/F1B 纠正。

### F1A · span-redaction-corpus-policy-v2

以基于原始字段 span 的单次 materialization 替换 `includes/replaceAll`；冻结低熵传播资格、完整 path segment 匹配、电话正负样本、placeholder sentinel 排除和 `Map<string, Set<ReasonCode>>` canonical union。

**状态（2026-07-27）**：acceptance `passed`；items.yaml `done`；production 仍为 v1，无 cutover。

### F1B · public-result-resource-budgets-v2

在 corpus 扫描前约束 raw counts/field/aggregate，在脱敏后约束 public fields，并在组装后约束完整序列化响应；覆盖 N/N+1、Unicode bytes、corpus entries/bytes 和 fixed safe error。

**修订后的最小安全闭环**：F1B 完成时，F1 assembler + F1A span policy + F1B resource guard 共同形成可独立验证且不会切换 production v1 的 dormant public-boundary 闭环；因此 items.yaml 的唯一 `minimal_loop=true` 位于 F1B。

**状态（2026-07-28）**：acceptance `passed`；items.yaml `done`；minimal_loop 关闭。

### F1C · canonical-locate-facts-bridge

把真实执行管线的 terminal facts 收敛进 owner-fragment envelope；现有 production 继续经 v1 projector 输出，同一 envelope 可由 test-only shadow harness 验证已完成的 v2 fragments。required-owner finalizer 禁止用假值补齐缺失事实；F8 才产生首个完整真实 v2 shadow result，F9 只切换 projector edge。

**状态（2026-07-28）**：acceptance `passed`；items.yaml `done`；production 仍 v1。

### F3 · request-snapshot-cache

在单一canonical execution中建立legacy-compatible与expanded-v2双lane，拥有raw locator/legacy adapter、canonical scope universe/fold、pre-cap public-safe等价类selector、请求级文件快照、一次解码、CodeGraph预验证复用、增量hit验证、final purge、typed stable pool/proof-bound completeness和neutral language carrier。统一invariant是：只让同次执行、scope-folded、public-safe、snapshot-trusted的stable pool进入F2，同时保持legacy lane deep-exact。

**状态（2026-07-28）**：acceptance `passed`；items.yaml `done`；production 仍 v1；Pre-F5 单 process 双视图。

### F2 · relevance-ranking-budget

在F3 trusted stable pool上实现case-aware anchor intents、显式锚点预留、priority-descending结构化排序、collision-atomic budget、跨文件round-robin和unsatisfied coverage；并独占`createF2LocateProjectionStagesV2()`，把ranked refs经F1B source preflight/strict pairing、F1 single materialization与F1C source/materialization registrars转为trusted materialized core。F2 acceptance不创建F8 consumer，只冻结future importer allowlist。

### F4 · cross-platform-ci-baseline

立即建立 Node 22/24 与 Windows/Linux/macOS 验证矩阵，并冻结 beta runtime 为 `^22.0.0 || ^24.0.0`；后续每个 feature 向同一 matrix 增加自己的 contract cases。它是独立 safety-net lane，F5 必须等待 blocking matrix 就绪。

**状态（2026-07-28）**：acceptance `passed`；items.yaml `done`；remote run `30323465951` 六格+`cross-platform-required` 全绿；main ruleset required check 已生效。

### F5 · streaming-ripgrep

修正 stdout/stderr N+1 上限语义，增加流式 JSON line consumer、maxHits 提前停止和 bounded attempt telemetry，并输出统一 `BackendExecutionOutcomeV2`。不完整 raw prefix 不进入 evidence；只有完成的 backend/fallback safe set 可进入 F3/F2。本 item 只拥有 process/backend termination facts 与进程树清理，不决定 request-level status、abortSource、limits 或 nextActions。

**状态（2026-07-28）**：acceptance `passed`；items.yaml `done`；architecture 已回写 kernel/stream/context/F3 handoff/F6 no-hits seam；远程六格 F5 marker 为 residual。

### F6 · input-abort-contract-v2

把`question`改为可选说明文本，拆分filesystem path normalization，并从F5 trusted trace的public-neutral `BackendAttemptV2[]`唯一聚合backend/request-outcome fragments、strategy、abort、status、limits与nextActions；F8把trusted aggregation的exact status注册到F1C。finalization latch前caller/deadline first-writer-wins，caller派生`cancelled`，deadline才派生`timeout`。

**状态（2026-07-28）**：acceptance `passed`；items.yaml `done`；architecture 已回写 raw guard / abort latch / RequestOutcomeAggregatorV2 direct seam / F8-only mount / importer=0；REV-003/013 与远程六格为 residual。

### F7 · repository-scope-policy

统一 basename/extension/segment/prefix layer mapping 及冲突优先级、test/docs 显式请求和 candidate scope decision。

**状态（2026-07-28）**：acceptance `passed`；items.yaml `done`；architecture 已回写 path-only scope policy / F3 fold+adapter / two-base-port materializer / coverage mount；REV-007..010 与远程六格 F7 marker 为 residual。

### F8 · language-capability-boundary

引入TypeScript/JavaScript、SQL与unsupported fallback adapters，公开semantic capability和降级原因；作为最后required owner，F8还独占internal ready provider、zero-argument outer factory与七个private wrappers，exact一次取得F2 two-stage factory和两个F1C runtime acquisitions，形成首个complete real-v2 shadow。F9只消费F8 accepted token/interface，不导入stage owner。

### F9 · public-beta-release

补齐版本来源、Node engines、license/security/metadata、lint/format、迁移指南和 release candidate gate；在全部 field producer 通过后原子切换生产 locate schema v2。

**状态（2026-07-31）**：acceptance 文档就绪（DoD 绿后 flip passed）；items.yaml `done`；architecture 已回写 production v2 cutover / private:true / F9-PACK-001 六格 / owner gates；REV-005/008 为 residual；不 publish/tag/merge main。

### Goal Coverage Matrix

| 完成信号 | Owner item | 可执行证据 |
|---|---|---|
| dormant v2 assembler 不暴露 root/hash，且 production 仍保持 v1 | F1 | unit + synthetic v2 projection + no-cutover import inventory |
| 低熵 assignment 不污染其他字段，placeholder 不被二次替换，日期不被当电话，Unicode span 不错位 | F1A | hostile/emoji/CRLF unit + permutation + full projection forbidden scan |
| 400,000-byte whitespace excerpt、41st evidence、129th corpus entry 和 1 MiB+1 response 均 fail closed | F1B | contract boundary mutation + N/N+1 Golden |
| 后续真实 producer 可逐项接入而 v1 transport 不变，caseSensitive 不丢失，缺 owner 时不能生成 v2 | F1C | real service envelope + three term-case v1 parity + Golden/MCP regression + transport reachability gate |
| dual-lane保持v1 deep-exact，不完整raw prefix不进safe pool，scope-folded public-safe selector与snapshot trust阻断raw locator/changed file | F3 | safe-discovery/scope-fold/trust-pool hostile cases + counting reader + request mutation + v1 parity |
| 显式锚点不再被字典序挤出，priority 100严格先于40，collision relation可证；two-stage source/materialization provenance闭合且F2时点future importer为0 | F2 | tier/comparator/collision ledger + source preflight/materialization registrar cases + small budget Golden |
| 核心路径跨 Node/OS 可复现 | F4 | CI matrix |
| 高频 ripgrep 返回 bounded attempt telemetry，且不完整 raw prefix 不进入 evidence | F5 | streaming parser + eligibility truth table + real process cleanup |
| question/path/abort契约准确；F6从no-internal-field telemetry构造BackendAttemptV2并签status，caller/deadline分别为cancelled/timeout | F6 | backend public-neutral view + aggregation/status registrar hostile matrix + v1 projection regression |
| scope 在 confirmed/candidate 一致 | F7 | `.spec/.test` + fixture segment + docs extension + multi-layer conflict fixtures |
| unsupported language不误报confirmed；F8 exact acquisitions/importer graph与七wrapper只装配一次，完整真实v2 shadow首次可finalize | F8 | language negative fixtures + acquisition/importer mutation + seven-stage counter + real shadow Golden/forbidden scan |
| v2 原子切换与 beta 发布材料闭环 | F9 | production cutover + MCP/CLI parity + package dry-run + full aggregate verification |

## 6. 排期与依赖

### 依赖形状

```text
F1(done) ─→ F1A(span redaction) → F1B(resource budgets)
    │                                  ↓
    │                         F1C(canonical facts bridge)
    │                                  ↓
    │                         F3(snapshot + final purge)
    │                                  ↓
    │                         F2(post-verify ranking) ─┐
    └→ F4(CI baseline, immediate) ────────────────────┴→ F5(backend outcomes)
                                                           ↓
                                              F6(input/request outcome)
                                                           ↓
                                                   F7(scope) → F8(language + complete shadow)
                                                                          ↓
                                                     F9(projection-edge cutover + release)
```

默认 critical path：F1A → F1B → F1C → F3 → F2 → F5 → F6 → F7 → F8 → F9。F4 是立即可启动且必须在 F5 前完成的 safety-net lane，可与 F1A/F1B/F1C/F3 并行。若采用单执行流，顺序为 F1A、F1B、F1C、F3、F2、F4、F5、F6、F7、F8、F9。F2/F3 编号保留既有 roadmap 历史，执行顺序以 items DAG 为准。

依赖理由：

- F1B 依赖 F1A：aggregate budget 不能替代会放大 placeholder 的算法修复，必须先使单字段物化复杂度有界。
- F1C 依赖 F1B：真实 pipeline 接入 dormant assembler 前，raw/corpus/public resource boundary 必须已安全闭合。
- F3 依赖 F1C：snapshot fragment 必须进入 canonical envelope，并在保持 v1 projection 的情况下由真实 service 验收。
- F2 依赖 F3：ranking 和 public ID 只能消费同一 request snapshot 的 stable records。
- F5 依赖 F2+F4：streaming outcome 的 `complete-safe-set|telemetry-only` 必须接入已冻结的 safe selector seam，且 process/path 变化必须已有跨平台门禁；不完整 raw prefix 不进入最终 rank/budget。
- F6 依赖 F5：F5 只冻结 backend outcome；F6 是 request-level ledger/status/abort/next-action 的唯一 owner，避免两个并行 feature 修改同一 mapper。
- F9 依赖 F8（items 中同时保留关键直接 gate）：F8 通过传递依赖覆盖 F1A/F1B/F1C/F2/F3/F4/F5/F6/F7，且只有它完成后 required-owner finalizer 才允许完整真实 shadow result。

### Implementation Admission Gate Matrix

`design-ready`只表示依赖design-review已passed、允许继续ChildDesignBatch；`implementation-ready`
必须同时满足自身current design/checklist hashes通过独立review、全部child designs统一owner确认，以及
所有`depends_on` item的acceptance=`done`。任何`in-progress`或design-review passed都不得替代acceptance。

| Item | Design admission | Implementation admission | Acceptance gate | Owner / non-automatic gate |
|---|---|---|---|---|
| F1A | F1 done | unified design confirmation | targeted hostile+full suite+scope+v1 no-cutover | none |
| F1B | F1A design passed | F1A acceptance done | N/N+1+full suite+scope+v1 no-cutover | budget常量变更回owner |
| F1C | F1B design passed | F1A+F1B acceptance done | registrar/finalizer/reachability+full suite+v1 no-cutover | none |
| F3 | F1C design passed | F1C acceptance done | dual-lane/safe-discovery/snapshot+full suite+v1 no-cutover | none |
| F2 | F3 design passed | F3 acceptance done | ranking/two-stage/importer=0+full suite+v1 no-cutover | safe-key/collision tradeoff需统一确认 |
| F4 | F1 done | unified design confirmation | Node22/24×3OS blocking matrix+scope | remote workflow/ruleset change单独授权 |
| F5 | F2+F4 design passed | F2+F4 acceptance done | streaming/cleanup/telemetry+full suite+v1 no-cutover | none |
| F6 | F5 design passed | F5 acceptance done | input/abort + aggregator backend/request-outcome/status direct integration + production mount importers=0 + full suite/v1 no-cutover | real envelope mount deferred to F8 |
| F7 | F6 design passed | F6 acceptance done | scope/arbitration+full suite+v1 no-cutover | none |
| F8 | F7 design passed | F7 acceptance done | language+four-prerequisite admission+exact acquisitions/importers+F6 mount+fresh complete-envelope token+full suite/v1 no-cutover | none |
| F9 | F8 design passed | F1A-F8 current-revision acceptance done + owner preflight | v2-only transport/MCP/CLI/package/consumer aggregate gate | license/private/merge/push/tag/publish/release各自授权 |

### 本轮事实基线

- 基线 branch/commit：`repo-nav-public-beta@9d7b0e237e3cd9245d1f057a2ad504b1d1028d7d`；production v1、dormant v2 no-cutover。
- 2026-07-23 本轮重新执行：`npm run build` passed；`npm run typecheck` passed；`npm test -- --group public-output-v2` 为 46 passed / 168 skipped。
- 直接运行当前实现可复现：`password=a` 令 `database` 变成多段 `[REDACTED]` 且隐藏 `src/catalog.ts`；`password=R` 会改写已经生成的 placeholder；`2026-07-23` 被收进 `PERSONAL_DATA` corpus；同一 `shared-secret` 的 reason 随遍历顺序变化；400,000-byte 的 `"x "` excerpt 无 oversized reason 原样通过。
- F1 acceptance 曾记录 full unit 214、Golden 71 + 1 approved skip、MCP 39、docs smoke passed；本轮 planning 不把这份历史记录当成新缺口不存在的证据。
- 2026-07-27 current baseline重新执行：build、typecheck、unit 214、Golden 71 + 1 approved skip、MCP 39、docs smoke全部通过；只证明实施起点稳定，不代表上述未实现feature已通过。

### 每项基础验证

```text
npm run build
npm run typecheck
npm test
npm run test:golden -- --all
npm run test:mcp -- --all
npm run test:docs
python <cs-onboard-skill>/tools/codestable-doctor.py --root .
```

- F1A/F1B acceptance将真实 envelope integration记为dependency-gated N/A。F1C建立typed partial envelope、
  four-prerequisite inspector及completion registrar。F3/F2/F7分别提供base owners，F5提供trace，F6只
  验证aggregator owner/status direct seam；F8才将F6 fragments exact mount到fresh complete envelope并
  首次允许完整真实v2 shadow。只有F9切换production schema。
- F1A 必须证明输出不会因 placeholder/corpus 再处理而超线性放大；F1B 必须覆盖 counts/bytes/corpus/aggregate 的 N/N+1 和 multi-byte Unicode。
- F3/F5 必须运行 large synthetic repository 与真实 process-tree cleanup。
- F4 起，Windows/Linux/macOS 的 blocking contract 由 CI 共同拥有，不能以单平台本地通过替代。
- F9 必须再对既有真实消费仓库执行一次只读 MCP E2E；执行前重新确认目标仓库、分支、状态和敏感输出边界。
- 每个 feature design 必须分配稳定 case ID、fixture owner 和对应 contract/unit/Golden owner；只有 snapshot 文本变化而无 case assertion 不算验收证据。

### 完成信号

- items.yaml 12/12 `done`，没有 dropped core item。
- 所有 review 中的 P0/P1 项均有实现与回归证据；P2 延后项有明确 residual。
- 完整 Node/OS matrix 通过。
- v2 public output forbidden scan 不含 policy 判定为敏感的未脱敏 input value、测试 secret corpus、绝对 root、Git object ID、内部 hash 或未 scrub 的 diagnostic detail；普通非敏感 normalized term 允许返回。
- 单字符、短数字、布尔值和常用低信息 assignment 不得传播到其他字段；literal placeholder 与非空 corpus 组合的输出长度有明确上界。
- raw/public/aggregate resource budgets 的边界与超限行为全部由 strict schema、assembler 和 Golden owner 证明。
- `0.2.0-beta.1` package dry-run、文档 smoke 和真实 MCP E2E 通过。
- owner 单独批准 license、移除 `private: true`、发布 npm/GitHub release；这些动作不因 roadmap 完成而自动发生。

## 7. 风险与缓解

### Top 3

1. **低熵 corpus 造成可用性拒绝服务**：F1A 禁止单字符/短数字/低信息 literal 跨字段传播，所有 detector 在原始输入上产 span 并一次性物化；placeholder 永不再次进入 matcher。
2. **公共边界在扫描前仍可被大 raw result 耗尽**：F1B 以 shallow count/type preflight 和 abort-at-N+1 byte counter 先限制 raw collection/field/aggregate，再做 deep Zod/JSON/corpus；corpus 和最终 public response 超限统一 fail closed，不能截断安全词典继续输出。
3. **排序结果来自不一致文件状态**：F3 先建立 request snapshot/cache，F2 的 ranker 只能消费 stable verified records；变化文件在排序与 ID 前全部丢弃。

### 其他风险

4. **公共 schema 改动面过大**：使用独立 schema v2 和迁移矩阵；不在 v1 snapshots 上静默更新。
5. **安全脱敏降低可用性**：安全路径保留相对定位；敏感路径整体替换并显式 `resolvable=false`，不以“部分路径仍可导航”制造错误承诺；绝对 root 始终不公开。
6. **排序改变 Golden 大量漂移**：先建立 rank truth table，再更新 snapshots；禁止只为通过 snapshot 调整优先级。
7. **请求 cache 削弱 TOCTOU 安全**：缓存 verified file handle snapshot，并在请求结束复核；不引入跨请求 cache。
8. **流式终止留下子进程**：复用现有 process-tree cleanup，新增 expected early-stop outcome 和 PID cleanup tests。
9. **语言边界被误解为全面支持**：coverage 明确拆分 text search 与 semantic classification。
10. **发布治理抢跑**：F9 依赖所有 core feature；`private: true`、merge、push、release 均需要独立 owner 动作。
11. **过渡期形成双公共输出**：F1C 只允许一个 production projector binding；v2 shadow harness 不注册 transport，reachability gate 证明 F9 前 schema v2 不可从 MCP/CLI 到达。

### Rollback / Containment Matrix

| Lane / item | Cutover前 containment | Rollback trigger | Rollback action | 恢复验证 | Owner gate |
|---|---|---|---|---|---|
| F1A-F8 | production始终v1；每项scoped commit且下游admission依赖acceptance done | targeted/full/v1 regression、scope或no-cutover任一红 | 回退当前feature scoped commit，保留已accept上游，不推进下游 | build/typecheck/unit/Golden/MCP/docs + v1 no-cutover | 无remote动作 |
| Accepted upstream ABI/contract drift or revert | current-revision hash gate绑定每个下游design-review、QA、acceptance与evidence；F9只认全部当前revision上游acceptance | 任一已accept上游的contract/ABI/hash变化或scoped revert，且已存在transitive downstream工作 | 立即使所有已开始或已accept的transitive downstream design-review、QA、acceptance与evidence hash失效并冻结其implementation admission/F9；按reverse DAG回退受影响下游commit，或原地重跑受影响独立review、实现验证与acceptance，不得保留旧通过结论 | 从变化上游起按topological DAG重建current-revision hash chain；受影响下游targeted/full/no-cutover与acceptance重新通过 | owner只能在级联closure完成后恢复下游admission；remote动作仍逐项授权 |
| F4 | remote workflow/ruleset未授权不改 | 任一Node/OS cell或required-check配置失败 | 恢复previous workflow/ruleset required checks，保留失败证据；F5不准入 | blocking matrix重新全绿 | remote change单独授权 |
| F9 pre-publish | cutover是独立可revert candidate，不使用runtime flag/双写 | v2 transport parity、consumer、package dry-run或aggregate gate失败 | revert exact cutover candidate，恢复v1 aggregate；不回退已accept F1A-F8 | full aggregate + v1 MCP/CLI parity | merge/push仍单独授权 |
| 已发布beta | 停止promotion，不假设npm/GitHub可unpublish | 已发布beta发现P0/P1或contract regression | deprecate受影响beta，从已review source发布修复beta；保留advisory/migration evidence | same-candidate package+consumer+security gate | deprecate/tag/publish/release逐项授权 |

### 关键假设与非显然依赖

- v2 仍 dormant 且没有 production consumer，因此可以在 F6 前增加 `cancelled` status，不需要兼容已发布的 v2 客户端。
- F1 的 feature/acceptance 保持历史证据；新缺口通过新 item 修正，不把已完成状态回滚或篡改为“从未通过”。
- request `maxConfirmed/maxCandidates` 最大各为 20；raw/public evidence count 上限与此一致，F9 不再允许 producer 绕过。
- Node `Buffer.byteLength` 是所有 UTF-8 budget 的单一计量口径；字符数、UTF-16 length 和单 token 长度不能替代。
- beta runtime support 从当前 `>=20` 收窄为 `^22.0.0 || ^24.0.0`；这是本轮需要 owner 随 roadmap 一并确认的 breaking support decision，F4/F9 与 compatibility matrix 必须共同落地。
- F4 需要 GitHub Actions 或等价 CI 的 Windows/Linux/macOS runners；runner queue 或平台不可用属于环境阻塞，不降低 blocking matrix。
- F9 的真实 MCP E2E 依赖 owner 指定的消费仓库和当时状态；测试只读，不把 QA 路径、remote 或凭证写进 artifact。

### 交付物与知识回写

- F1A/F1B：代码、contract mutations、hostile corpus/byte-boundary fixtures、Golden projection、forbidden scan 和 feature acceptance。
- F1C：canonical fact envelope、required-owner finalizer、v1 projector、shadow harness、transport reachability gate 和 v1 Golden/MCP regression。
- F3/F2/F7：各自产出可执行base owner；F5产trusted trace；F6产可执行aggregator direct seam；
  F8产capability与唯一real complete-envelope mount。各项均需integration/Golden evidence与items状态回写。
- F4：workflow matrix、Node/OS blocking report 和 process/path failure evidence。
- F9：migration guide、package dry-run、真实 MCP E2E、release-readiness；license/private/publish 仍是非自动动作。
- F1A 验证成立后，把“span redaction 不重扫 placeholder”和“低熵 token 不做 response-wide 传播”列为 `cs-keep` 候选；F3/F5 的 snapshot/process 坑在 acceptance 后再判断 `cs-note` 或 guide，不在 planning 阶段提前写成现状。

## 8. 观察项

- 如果后续出现必须跨请求引用同一 evidence 的真实用例，再评估安装级 HMAC ID；public-beta 不为假设需求引入密钥生命周期。
- Git dirty 只描述仓库状态，不代表 RepoNav 可以冻结整个工作区；确定性承诺限于已读文件 snapshot。
- RepositoryScopePolicy 的用户自定义配置格式不在本路线强制交付；先通过注入式默认 policy 和 coverage 固定语义。
- Python/Go/Rust adapter 由真实使用数据决定优先级，不因 text search 可命中就宣称语义支持。
- lint/format 只对新改动建立门禁，不在发布 PR 中混入全仓无关重排。
- `.codestable/architecture/system-repo-nav-foundation.md` 当前准确记录 F1 已落地的 `replaceAll`/corpus 行为，但未表达复审缺陷；待 F1A/F1B acceptance 后按现状更新，不在 roadmap planning 中提前改写 architecture。
- 同一 architecture 文档仍把 `source-of-truth-evidence` 描述为 draft，而 requirement 当前为 implemented；planning 阶段不改只记现状的 architecture，roadmap 批准后应单独运行 `cs-arch check/update` 修正。
- CodeStable Doctor 仍报告既有 `debug-cli-mcp-guide` review provenance P1；它不属于本 epic update diff，但在最终 release gate 前必须决定补做独立 review 还是形成 owner-approved historical exception。

## 9. 变更日志

- 2026-07-23：根据 `reviewForBeta.md` 更新现有 public-beta epic。保留 F1 历史完成态，新增 F1A span redaction/corpus policy、F1B raw-public-aggregate resource budgets 与 F1C canonical facts bridge；把 final snapshot purge 调整到最终 ranking/budget 之前；将 caller abort 状态冻结为 `cancelled`、deadline 保持 `timeout`；items 从 9 条扩为 12 条，并更新依赖、Goal Coverage、风险、验收与发布门禁。
- 2026-07-23：接口契约变化影响所有尚未启动的 F2–F9；已完成 F1 不返工原 feature artifact，由新的 corrective/bridge items 承接。production v1 与 no-cutover invariant 不变。
- 2026-07-23：Round 4 独立审查后把重大修订候选恢复为 `draft`；冻结 typed fact fragments + v1 projector 的过渡 seam、final snapshot purge → rank/budget → ID 顺序、UTF-16 half-open span 协议、F5/F6 单一所有权、Node 22/24 支持范围与 finalization/next-action truth table。owner 确认后才恢复 `active`。
- 2026-07-24：F2 child design Round 1 暴露“最终response-wide corpus materialization与budget selection循环依赖”。候选契约补充pre-ID conservative `PublicSafeRankingKeyV2`、F3 opaque file bucket identity与assembler保序；该delta不改变DAG/tier/budget/F9 cutover，但须随全部child designs统一owner确认，确认前不得实现F2。
- 2026-07-24：后续独立复审把上述delta收紧到所有pre-ID membership边界：expanded/raw backend结果在safe投影前截断时不得输出prefix，maxFiles与pre-ranking cap按safe等价类原子处理；F3向F2只暴露无payload object refs，canonical/discovery strings留在private WeakMap；F2禁止`discoveryKey`/hash tie-break，distinct完整safe-key collision整组排除；anchor completeness由F3 proof绑定。该候选仍待全部child designs统一owner确认。
- 2026-07-24：F1A/F3/F2 跨feature复审确认普通 ripgrep raw prefix 无法同时证明
  safe-key 等价类完整。候选契约因此把 F5 incomplete/early-stop/output-limit hits
  收窄为 bounded attempt telemetry，新增
  `selectionEligibility='complete-safe-set'|'telemetry-only'`；只有完整 backend/fallback
  safe set 可进入 F3/F2 evidence。该安全优先 tradeoff 改变了原“bounded partial
  evidence”表述，须在本批全部 child designs 后统一 owner 确认。
