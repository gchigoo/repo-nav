---
doc_type: roadmap
slug: repo-nav-mvp
status: active
created: 2026-07-10
last_reviewed: 2026-07-10
tags: [repository-retrieval, mcp, evidence, mvp]
related_requirements: [source-of-truth-evidence]
related_architecture: []
---

# RepoNav source-of-truth 证据定位 MVP

## 1. 背景

RepoNav 的第一阶段目标，是让 Codex、Claude Code、Cursor 等外部编码 Agent 面对大型仓库问题时，不再只返回一批“相关代码”，而能给出少量、可定位、可核验的当前代码事实，并把仍需用户判断的相关线索单独列为 candidate evidence。

当前仓库还没有实现代码、包配置或测试基线，只有已确认的 requirement、brainstorm 决策和迁移后的旧立项材料。因此本 roadmap 同时承担最小工程基线、核心证据闭环、MCP 产品表面、外部检索后端接入及可重复评测五部分建设。

MVP 遵循已经确认的产品边界：**LLM-native，但不是 LLM-powered**。RepoNav 不内置模型，不生成业务判断；宿主 Agent 负责把用户问题整理为结构化提示、解释证据并与用户完成最终裁决。

## 2. 范围与明确不做

### 本 roadmap 覆盖

- 建立 NestJS 11 standalone application context + TypeScript 5.8 严格模式下的可构建、可测试工程基线，不启动 HTTP listener。
- 定义 `repo_nav_locate` 的 MCP 输入、输出和错误契约。
- 建立只接受结构化提示的确定性 source-of-truth 检索引擎。
- 通过当前文件系统内容核验证据，严格区分 confirmed 与 candidate evidence。
- 接入 ripgrep 文本检索，并在目标仓库有 `.codegraph/` 时优先使用 CodeGraph 的结构化命令输出。
- 在 CodeGraph 缺失、失败或无结果时执行明确、可观察的 ripgrep fallback。
- 为路径边界、敏感内容、超时、结果预算和停止条件提供 guardrails。
- 建立合成 fixture、golden-case 自动化和最小调试 CLI。
- 以本地 stdio transport 交付 MCP-first MVP。

### 明确不做

- 不内置 LLM、embedding、向量数据库或模型 provider。
- 不判断业务规则正确与否，不把 candidate 自动升级为修复建议。
- 不实现长期 Query Session、alias store 或跨对话记忆。
- 不实现完整 component → API → controller → service → entity 调用链追踪。
- 不实现修改影响分析、自动代码修改、修复方案或 commit。
- 不建设 Angular/NestJS/TypeORM/Java/Go 等 framework-aware AST 索引平台。
- 不接入 git history 作为 MVP candidate 来源；git adapter 留待后续 roadmap。
- 不提供 Web UI、HTTP MCP transport 或远程多租户服务。
- 不修改或包装 CodeGraph 自身索引逻辑。
- CLI 不承诺与 MCP 完整对等，只用于测试、诊断和 fixture 回放。

### Granularity Gate

| 判断项 | 结论 |
|---|---|
| 为什么不是 single feature | 需要工程基线、证据引擎、两个检索后端、MCP transport、candidate policy、安全 guardrails 和 golden suite；存在明确跨模块契约与依赖 DAG。 |
| 为什么不是 brainstorm | 产品主轴、首个 golden case、证据边界、推理归属和交付表面均已由 owner 确认，剩余问题可以通过接口契约和子 feature 逐步验证。 |
| roadmap 边界 | 只交付 source-of-truth 证据定位 MVP；session、完整 trace、impact、AST 平台和业务判断明确排除。 |
| 最小闭环 | 完成 `candidate-evidence-policy` 后，宿主 Agent 可通过 stdio MCP 调用 `repo_nav_locate`，在合成报税导出 fixture 上同时获得精确 confirmed mapping 与独立 candidate sibling。 |

## 3. 模块拆分（概设）

```text
RepoNav MVP
├── Evidence Engine：Nest provider，执行确定性检索、核验、分类、预算和停止策略
├── Repository Backends：Nest providers，隔离文件系统、ripgrep 与 CodeGraph 外部依赖
├── MCP Surface：Nest module，把稳定应用契约暴露为 repo_nav_locate 工具
└── Verification Kit：维护合成 fixture、golden cases 与最小调试 CLI
```

### Evidence Engine · 证据引擎

- **职责**：接收结构化 `LocateRequest`，编排后端探测与检索；从当前文件内容核验命中；按确定性规则分类为 confirmed/candidate；生成有预算、有覆盖说明的 `EvidencePack`。不负责 MCP transport、外部命令细节或业务语义裁决。
- **承载的子 feature**：`repository-evidence-foundation`、`text-source-evidence-engine`、`candidate-evidence-policy`、`evidence-output-guardrails`。
- **触碰的现有代码 / 模块**：全新模块；当前无代码。
- **Depth 判断**：deep。调用方只有一个 `locate()` 用例，不需要知道后端顺序、直接文件核验、候选扩展、去重、排序与停止策略；这些复杂度集中在模块内部。

### Repository Backends · 仓库后端端口与适配器

- **职责**：把外部进程和本地文件系统差异收口为结构化端口；提供 CodeGraph、ripgrep 与 RepositoryReader 实现。它只返回可核验原始命中与健康状态，不决定 confirmed/candidate。
- **承载的子 feature**：`repository-access-process-safety`、`text-source-evidence-engine`、`codegraph-fallback-orchestration`。
- **触碰的现有代码 / 模块**：全新模块；依赖本机 `rg`，可选依赖 `codegraph`。
- **Depth 判断**：deep。删除该模块会使命令探测、参数转义、JSON 解析、版本差异、超时和路径处理散回 Evidence Engine；CodeGraph 与 ripgrep 两个 production adapter 证明这不是单实现假 seam。

### MCP Surface · MCP 产品表面

- **职责**：通过 NestJS standalone application context 启动本地 stdio transport，注册 `repo_nav_locate`，执行运行时 schema 校验，把 application result 同时返回为 `structuredContent` 与 JSON text fallback。它不包含检索策略，也不创建 HTTP controller/listener。
- **承载的子 feature**：`mcp-locate-surface`、`evidence-output-guardrails`、`debug-cli-mcp-guide`。
- **触碰的现有代码 / 模块**：全新模块；计划使用 NestJS 11、稳定版 `@modelcontextprotocol/sdk` 与 Zod runtime schema。
- **Depth 判断**：边界 adapter，刻意保持 shallow。它的价值是隔离 MCP 协议、transport 和工具错误语义；业务测试必须穿过 `RepositoryEvidenceService`，MCP integration test 再覆盖 transport seam。

### Verification Kit · 验证与诊断工具

- **职责**：维护不包含真实业务代码的合成仓库 fixture、golden-case manifest、结构化断言、snapshot 归一化和最小 debug CLI。生产 MCP server 不依赖该模块。
- **承载的子 feature**：`repository-evidence-foundation`、`candidate-evidence-policy`、`mvp-golden-regression-suite`、`debug-cli-mcp-guide`。
- **触碰的现有代码 / 模块**：全新测试与开发工具目录。
- **Depth 判断**：独立 test surface。它把仓库演进、路径差异和易变字段从验收断言中隔离，避免测试散落在每个 adapter 内。

## 4. 模块间接口契约 / 共享协议（架构层详设）

### 4.1 `repo_nav_locate` MCP 工具契约

**方向**：宿主 Agent → MCP Surface → Evidence Engine
**形式**：MCP tool over local stdio

**输入契约**：

```ts
export type RepoLayer =
  | 'client'
  | 'server'
  | 'db'
  | 'test'
  | 'docs'
  | 'config'
  | 'unknown';

export type AnchorKind = 'symbol' | 'file' | 'table' | 'route' | 'term';

export interface LocateAnchor {
  readonly kind: AnchorKind;
  readonly value: string;
}

export interface LocateLimits {
  readonly maxFiles?: number;       // default 8, range 1..20
  readonly maxConfirmed?: number;   // default 8, range 1..20
  readonly maxCandidates?: number;  // default 8, range 0..20
  readonly timeoutMs?: number;      // default 10_000, range 1_000..30_000
}

export type TermCaseMode = 'sensitive' | 'insensitive' | 'smart';

export interface NormalizedSearchTerm {
  readonly value: string;
  readonly caseSensitive: boolean;
}

export interface NormalizedLocateAnchor {
  readonly kind: AnchorKind;
  readonly value: string;
  readonly caseSensitive: boolean;
}

export interface LocateRequest {
  readonly repoPath: string;                 // 必填；trim 后 1..4096 UTF-8 bytes
  readonly question: string;                 // 必填；trim 后 1..4096 UTF-8 bytes
  readonly terms: readonly string[];         // 必填；1..16，每项 1..128、合计 <=1024 UTF-8 bytes
  readonly termCase?: TermCaseMode;           // default 'smart'
  readonly anchors?: readonly LocateAnchor[];// 最多 16 个；value 每项 <=512 UTF-8 bytes
  readonly layers?: readonly RepoLayer[];
  readonly negativeTerms?: readonly string[];// 最多 16 个；与 terms 相同 literal 语义
  readonly limits?: LocateLimits;
}
```

`question` 不得作为唯一检索输入。RepoNav 不内置 LLM，因此宿主 Agent 必须至少提供一项 `terms`；不满足时返回 `INVALID_INPUT`，而不是在核心层猜测分词和意图。

**字符串与检索语义**：

- 所有文本先做 Unicode NFKC、trim 和 UTF-8 byte budget 校验；整个 tool input 的 JSON UTF-8 大小不得超过 16 KiB。
- `terms`、`negativeTerms` 和 anchor values 按 NFKC + `termCase` 做稳定去重，保留第一次出现的 display value；归一化后为空则 `INVALID_INPUT`。
- MVP 中 term/anchor 永远是 literal，不接受 regex 或 glob。`RipgrepBackend` 必须使用 `--fixed-strings --json`（或完全等价的 argv），不得把 `.`、`[` 等字符解释为正则。
- `termCase='smart'` 的固定规则：包含 Unicode 大写字母的 term 大小写敏感，否则大小写不敏感；每个 term 独立执行该规则，不能因数组中另一项改变。
- 输入校验后立即生成 `NormalizedSearchTerm { value, caseSensitive }`；terms/negativeTerms 在 backend search 与 file verification 全程传递同一结构。term/symbol/table/route anchors 生成 `NormalizedLocateAnchor`，由 backend search 和 Evidence Engine merge 阶段按 case metadata 比较；命中后传给 reader 的是 canonical BackendHit symbol，不是原始 anchor。file anchor 先规范化为 root-relative POSIX path 并固定 `caseSensitive=true`，最终存在性仍由 RepositoryReader 按真实文件系统核验。adapter 与 reader 均不得重新解释大小写模式。
- `repoPath` 只用于解析 repository root，不参与 shell 拼接；所有外部进程都使用 argv 数组和独立 cwd。

**输出契约**：成功调用返回 `LocateToolOutput`。`status=no_result|partial|backend_unavailable|timeout` 仍属于可恢复的正常检索结果，`ok` 保持 `true`；只有无效输入、无效仓库、越界路径或内部异常使用 MCP `isError: true`。

```ts
export type LocateStatus =
  | 'ok'
  | 'partial'
  | 'no_result'
  | 'backend_unavailable'
  | 'timeout';

export type EvidenceSource = 'codegraph' | 'ripgrep' | 'filesystem';
export type EvidenceRole =
  | 'execution-site'
  | 'value-mapping'
  | 'definition'
  | 'reference'
  | 'related';

export interface EvidenceLocation {
  readonly file: string; // 始终是 repoPath 下的规范化相对路径
  readonly symbol?: string;
  readonly lines: readonly [start: number, end: number];
  readonly excerpt: string;
  readonly redaction?: {
    readonly applied: true;
    readonly reasonCodes: readonly RedactionReasonCode[];
  };
}

export type RedactionReasonCode =
  | 'SECRET_LIKE_VALUE'
  | 'CONNECTION_STRING'
  | 'PERSONAL_DATA'
  | 'BINARY_OR_OVERSIZED_CONTENT';

export type ConfirmedReasonCode =
  | 'EXACT_TERM_MATCH'
  | 'EXACT_SYMBOL_ANCHOR'
  | 'DIRECT_ALIAS_MAPPING';

export type CandidateReasonCode =
  | 'EXACT_TERM_WITHOUT_DIRECT_MAPPING'
  | 'SYMBOL_REFERENCE_ONLY'
  | 'SAME_SCOPE_SIMILAR_IDENTIFIER'
  | 'SAME_ENTITY_SIBLING'
  | 'ALIAS_SOURCE_NEIGHBOR'
  | 'SECONDARY_BACKEND_HIT';

export type DiscoveryReasonCode =
  | 'LITERAL_TERM_HIT'
  | 'SYMBOL_SEARCH_HIT'
  | 'FILE_ANCHOR_HIT';

export type PromotionRequirementCode =
  | 'USER_SEMANTIC_CONFIRMATION'
  | 'DIRECT_REFERENCE_REQUIRED'
  | 'CALL_PATH_REQUIRED';

export type NextActionCode =
  | 'ADD_TERM'
  | 'ADD_SYMBOL_ANCHOR'
  | 'CONFIRM_CANDIDATE'
  | 'INITIALIZE_CODEGRAPH'
  | 'RETRY_WITH_HIGHER_LIMIT';

export type EvidenceOperationCode =
  | 'CODEGRAPH_QUERY'
  | 'RIPGREP_SEARCH'
  | 'FILESYSTEM_READ_RANGE'
  | 'FILESYSTEM_FIND_MATCHES';

export type BackendReasonCode =
  | 'CODEGRAPH_INDEX_MISSING'
  | 'CODEGRAPH_UNAVAILABLE'
  | 'CODEGRAPH_NO_RESULT'
  | 'RIPGREP_UNAVAILABLE'
  | 'RIPGREP_NO_RESULT'
  | 'BACKEND_PROCESS_FAILED'
  | 'BACKEND_ABORTED';

export type LimitReasonCode =
  | 'MAX_FILES_REACHED'
  | 'MAX_CONFIRMED_REACHED'
  | 'MAX_CANDIDATES_REACHED'
  | 'MAX_FILE_BYTES_REACHED'
  | 'MAX_EXCERPT_BYTES_REACHED'
  | 'TIMEOUT_REACHED';

export type ExclusionReasonCode =
  | 'NEGATIVE_TERM_MATCH'
  | 'OUTSIDE_LAYER_HINT'
  | 'DUPLICATE_LOCATION'
  | 'UNVERIFIED_FILE_CONTENT';

export interface EvidenceProvenance {
  readonly discoveredBy: readonly EvidenceSource[];
  readonly verifiedBy: 'filesystem';
  readonly operations: readonly EvidenceOperationCode[];
}

export interface ConfirmedEvidence {
  readonly evidenceClass: 'confirmed';
  readonly id: string;
  readonly role: EvidenceRole;
  readonly location: EvidenceLocation;
  readonly provenance: EvidenceProvenance;
  readonly reasonCodes: readonly ConfirmedReasonCode[];
}

export interface CandidateEvidence {
  readonly evidenceClass: 'candidate';
  readonly id: string;
  readonly role: EvidenceRole;
  readonly location: EvidenceLocation;
  readonly provenance: EvidenceProvenance;
  readonly reasonCodes: readonly CandidateReasonCode[];
  readonly promotionRequirements: readonly PromotionRequirementCode[];
}

export interface BackendAttempt {
  readonly backend: Exclude<EvidenceSource, 'filesystem'>;
  readonly status: 'used' | 'unavailable' | 'skipped' | 'failed';
  readonly reasonCode?: BackendReasonCode;
  readonly hitCount: number;
}

export interface CoverageReport {
  readonly backends: readonly BackendAttempt[];
  readonly fallbackChecked: boolean;
  readonly indexState: 'available' | 'missing' | 'unavailable' | 'error' | 'unknown';
  readonly indexFreshness: 'not-applicable' | 'unknown' | 'possibly-stale';
  readonly limitsReached: readonly LimitReasonCode[];
  readonly exclusionSummary: Readonly<Partial<Record<ExclusionReasonCode, number>>>;
}

export interface EvidencePack {
  readonly schemaVersion: '1.0';
  readonly status: LocateStatus;
  readonly repositoryRoot: string;
  readonly normalizedTerms: readonly NormalizedSearchTerm[];
  readonly confirmed: readonly ConfirmedEvidence[];
  readonly candidates: readonly CandidateEvidence[];
  readonly coverage: CoverageReport;
  readonly nextActions: readonly NextActionCode[];
}

export interface RepoNavToolError {
  readonly code:
    | 'INVALID_INPUT'
    | 'INVALID_REPOSITORY'
    | 'PATH_OUTSIDE_ROOT'
    | 'INTERNAL_ERROR';
  readonly message: string;
  readonly recoverable: boolean;
  readonly suggestedAction?: NextActionCode;
}

export type LocateResult =
  | { readonly ok: true; readonly evidence: EvidencePack }
  | { readonly ok: false; readonly error: RepoNavToolError };

export type LocateToolOutput = LocateResult;
```

**约束**：

- Production 入口使用 `NestFactory.createApplicationContext(AppModule)` 获取 standalone IoC context，通过 `app.get()` 解析 MCP host provider；长驻 stdio 进程启用 shutdown hooks，退出时 `app.close()` 触发生命周期清理。不得为了 DI 启动 Express 或 Fastify HTTP listener。
- `structuredContent` 必须符合 output schema；`content[0].text` 提供同一对象的 JSON fallback，不维护第二套语义。
- stdio transport 运行期间 stdout 只承载 MCP 协议帧；日志和诊断必须写 stderr，避免污染 JSON-RPC 通道。
- 不输出伪概率。confirmed/candidate 是证据等级，排序只表达确定性规则优先级，不表达业务正确率。
- reason code、promotion requirement、redaction reason 和 next action 都是 `schemaVersion` 管理的封闭枚举；不得在运行时生成任意自然语言协议值。
- 所有证据必须带当前文件系统核验过的相对路径、非空行范围和 excerpt。
- `candidate` 永远不能混入 `confirmed` 或自然语言结论。
- 输出排序必须稳定；同一仓库快照、输入和依赖版本下，除外部工具明确报告状态变化外结果可复现。

**状态与 fallback 转换表**：

| 条件 | 必须动作 | `LocateResult` / `LocateStatus` | `nextActions` |
|---|---|---|---|
| schema、字符串预算或归一化后 terms 无效 | 不启动 backend | `ok=false / INVALID_INPUT`，MCP `isError=true` | `ADD_TERM`（适用时） |
| repoPath 不存在、不可读或不是目录 | 不启动 backend | `ok=false / INVALID_REPOSITORY`，MCP `isError=true` | none |
| root 或 evidence path 发生 symlink/realpath 越界 | 立即终止本次调用 | `ok=false / PATH_OUTSIDE_ROOT`，MCP `isError=true` | none |
| CodeGraph 有已核验证据，策略完整且未触发限制 | 不强制运行 ripgrep | `ok=true / ok`，`fallbackChecked=false` | `CONFIRM_CANDIDATE`（有 candidate 时） |
| CodeGraph missing/unavailable/failed/no-result，ripgrep 完成并取得足够已核验证据 | 记录 primary failure 和 fallback attempt | `ok=true / ok`，`fallbackChecked=true` | 按 candidate 情况给出 |
| 任一 backend 有 hit，但当前文件核验全部失败 | 记录 `UNVERIFIED_FILE_CONTENT`，继续下一允许 backend | fallback 完成仍无证据则 `no_result`；fallback 不可用则 `backend_unavailable` | `ADD_SYMBOL_ANCHOR` 或 `ADD_TERM` |
| 所有策略要求的 backend 已完成且无已核验证据 | 记录每次 attempt 与 exclusions | `ok=true / no_result`，不得表述为代码不存在 | `ADD_TERM` / `ADD_SYMBOL_ANCHOR` / `INITIALIZE_CODEGRAPH` |
| 所有可用 backend 都 unavailable/failed，且无已核验证据 | 不伪造 no-result | `ok=true / backend_unavailable` | `INITIALIZE_CODEGRAPH`（适用时） |
| 无已核验证据，但 max files/file bytes/excerpt bytes 等 limit 阻止完成核验 | 记录 limit 与 exclusion，不伪造 no-result | `ok=true / partial`，evidence 可为空 | limit 可由 caller 调整时给 `RETRY_WITH_HIGHER_LIMIT`，固定安全上限则为空 |
| 已有已核验证据，但 backend `complete=false`、结果预算触顶或必要 fallback 未完成 | 保留证据并列出 limits/coverage | `ok=true / partial` | `RETRY_WITH_HIGHER_LIMIT` 或 `ADD_SYMBOL_ANCHOR` |
| 内部 deadline/AbortSignal 触发 | 终止 child processes 和 reader；只保留触发前已完成核验的证据 | `ok=true / timeout`，可携带 evidence | 仅当内部 deadline 且当前 `timeoutMs < 30_000` 时给 `RETRY_WITH_HIGHER_LIMIT`；caller 主动 abort 或已达上限时为空 |
| 未捕获内部异常 | 清理进程和 context，不输出 stack/敏感路径 | `ok=false / INTERNAL_ERROR`，MCP `isError=true` | none |

`BackendSearchResult.complete=false` 只表示该 backend 没有完成自己的预算内搜索，不能直接映射为 `partial`；最终状态由整轮 fallback、核验结果和全局 limits 共同决定。

**Interface 设计检查**：

- **Module / interface**：MCP Surface 暴露单一 `repo_nav_locate`；caller 必须知道 RepoNav 不做自然语言意图推断，必须提供 `terms`。
- **Seam placement**：协议 seam 位于 MCP handler 与 `RepositoryEvidenceService` 之间；所有 transport 都调用同一 service。
- **Depth / locality**：一个工具隐藏后端选择、fallback、核验、candidate policy 和预算；未来策略变化不扩大 MCP 参数面。
- **Dependency strategy**：MCP SDK 是 local-substitutable 的协议依赖；核心测试直接穿过 service，transport test 使用 stdio client fixture。
- **Adapter**：第一阶段只有 stdio production transport；这是外部协议边界而非业务 port，不为不存在的 HTTP transport制造假 adapter。

**Design It Twice 结论**：已比较“只收 free-form question”“完全结构化 DSL”“question + 必填 terms + 可选 anchors”。选择第三种：既保留宿主问题上下文，又保证无内置 LLM 时检索可复现。旧材料中的 `plan/trace/impact/refine` 多工具表面不进入 MVP。

### 4.2 `RepositoryEvidenceService` 应用接口

**方向**：MCP Surface / Verification Kit → Evidence Engine
**形式**：in-process TypeScript interface

```ts
export interface LocateExecutionContext {
  readonly signal: AbortSignal;
}

export interface RepositoryEvidenceService {
  locate(
    request: LocateRequest,
    context: LocateExecutionContext,
  ): Promise<LocateResult>;
}
```

**约束**：

- 引擎先解析和锁定 repository root，再探测后端；任何证据路径离开 root 立即失败。
- 输入、仓库和路径错误以 `LocateResult.ok=false` 返回；MCP Surface 只负责把该结果映射成 `isError: true`，不得重新发明错误码。未捕获异常统一映射为 `INTERNAL_ERROR`，同时避免把 stack 或本机敏感路径放进对外 message。
- backend hit 只能成为未核验命中；必须经 `RepositoryReader` 从当前文件读取成功后才能进入 EvidencePack。
- 一个检索后端无结果不能自动生成 `no_result`；只有策略要求的 fallback 已执行或明确不可用，才允许结束。
- candidate 扩展、去重、稳定排序和停止条件都在实现内部，不暴露给 transport caller。

**Classification truth table**：

任何输出 evidence 都必须由公共字段 `provenance.verifiedBy='filesystem'` 表达当前文件核验；核验只证明“这段代码当前存在”，永远不足以单独成为 confirmed。文件核验不是 ConfirmedReasonCode，candidate 与 confirmed 使用同一 provenance 约束。Repository Backends 只产出 discovery facts；下表只由 Evidence Engine 执行。

| 已核验事实组合 | 分类 | role / reason | 反例与限制 |
|---|---|---|---|
| 当前文件核验 + 精确 requested alias/term 位于同一条可执行 assignment、return、object mapping 或 SQL `source AS target` 表达式 + source/target 同时可定位 | `confirmed` | `value-mapping`; `DIRECT_ALIAS_MAPPING`, `EXACT_TERM_MATCH` | 只在 DTO 类型声明、entity column definition、test fixture、注释或文档中出现时不得 confirmed |
| 当前文件核验 + caller 显式提供 symbol anchor + 命中该 symbol 的实现/定义体 | `confirmed` | `execution-site` 或 `definition`; `EXACT_SYMBOL_ANCHOR` | 只命中 import/reference/call site 时降为 candidate；该 confirmed 只证明 symbol 位置，不声称业务规则正确 |
| 当前文件核验 + 仅 exact/normalized term hit，无直接 mapping 或明确 symbol anchor | `candidate` | `reference` 或 `related`; `EXACT_TERM_WITHOUT_DIRECT_MAPPING` | 同名 DTO、测试、文档和旁路实现属于此类，不得因排名第一升级 |
| 当前文件核验 + same-scope/same-entity sibling、alias neighbor 或 secondary backend hit | `candidate` | `related`; candidate reason + promotion requirements | sibling 永远不能仅凭名字相似成为 confirmed |
| 文件核验失败、命中 negative term、明确 layer 不匹配或路径不在 root | `excluded` / error | exclusion reason 或 `PATH_OUTSIDE_ROOT` | 不进入 confirmed/candidate；path escape 终止调用 |

**Fixture 门槛**：F3 必须覆盖 direct mapping positive + DTO/definition/test/doc false-confirmation；F5 再覆盖 sibling candidate positive + 相似但无关字段 false-positive。新增 confirmed reason code 时必须先更新本表、schema version 和对应 positive/negative fixtures。

**Interface 设计检查**：

- **Module / interface**：Evidence Engine 暴露单一 use case，caller 只理解输入和 EvidencePack invariant。
- **Seam placement**：所有 MCP、CLI 和 golden tests 都穿过此接口，避免 transport 内复制策略。
- **Depth / locality**：检索编排的复杂度集中在实现内部；删除该层会让每个 caller 重复 fallback 与证据分类。
- **Dependency strategy**：纯 in-process deep module；不为内部策略引入 adapter。
- **Adapter**：无。测试通过注入 backend ports 和 RepositoryReader 控制外部状态。

### 4.3 仓库后端与文件核验端口

**方向**：Evidence Engine → Repository Backends
**形式**：in-process ports，production 实现启动本地进程或读取文件系统

```ts
export interface BackendHealth {
  readonly state: 'available' | 'missing' | 'unavailable' | 'error';
  readonly version?: string;
  readonly indexFound?: boolean;
  readonly possibleStaleIndex?: boolean;
  readonly reasonCode?: BackendReasonCode;
}

export interface BackendSearchRequest {
  readonly repositoryRoot: string;
  readonly terms: readonly NormalizedSearchTerm[];
  readonly anchors: readonly NormalizedLocateAnchor[];
  readonly negativeTerms: readonly NormalizedSearchTerm[];
  readonly maxHits: number;
}

export interface RepositoryReadLimits {
  readonly maxFileBytes: number;    // schema v1 default 2 MiB
  readonly maxExcerptBytes: number; // schema v1 default 16 KiB
  readonly maxExcerptLines: number; // schema v1 default 80
}

export interface BackendHit {
  readonly file: string;
  readonly symbol?: string;
  readonly lines?: readonly [number, number];
  readonly matchedText?: string;
  readonly source: Exclude<EvidenceSource, 'filesystem'>;
  readonly reasonCodes: readonly (DiscoveryReasonCode | BackendReasonCode)[];
}

export interface BackendSearchResult {
  readonly health: BackendHealth;
  readonly hits: readonly BackendHit[];
  readonly complete: boolean;
}

export interface RepositorySearchBackend {
  readonly id: Exclude<EvidenceSource, 'filesystem'>;
  probe(repositoryRoot: string, signal: AbortSignal): Promise<BackendHealth>;
  search(
    request: BackendSearchRequest,
    signal: AbortSignal,
  ): Promise<BackendSearchResult>;
}

export interface RepositoryReader {
  resolveRoot(repoPath: string, signal: AbortSignal): Promise<string>;
  readRange(
    repositoryRoot: string,
    relativeFile: string,
    lines: readonly [number, number],
    limits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<EvidenceLocation>;
  findMatches(
    repositoryRoot: string,
    relativeFile: string,
    terms: readonly NormalizedSearchTerm[],
    symbol: string | undefined, // 已通过 anchor case 比较的 canonical BackendHit.symbol
    maxMatches: number,
    limits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<readonly EvidenceLocation[]>;
}
```

**Production adapters**：

- `RipgrepBackend` 按 `caseSensitive` 分组，只使用 argv 数组启动 `rg --fixed-strings --json`；false 组显式加 `--ignore-case`，true 组不加。每组独立解析后再稳定合并，不拼 shell 字符串。
- `CodeGraphBackend` 先用 `codegraph status --json` 探测索引，再用 `codegraph query --json` 获取 symbol/file 候选。MVP 不把面向人的 `codegraph explore` 文本格式当稳定机器契约。
- `NodeRepositoryReader` 使用 realpath/relative-path 校验和当前文件内容完成最终核验。测试使用 fixture reader，不 mock Evidence Engine。
- backend hit 带有效行范围时调用 `readRange`；只有 file/symbol 而无行范围时调用 `findMatches` 在该文件内重新定位。两条路径都必须从当前文件系统生成最终 excerpt。
- 所有 reader 方法都接收同一 AbortSignal；读取前检查 `maxFileBytes`，返回 excerpt 前检查 lines/bytes。deadline 后完成的迟到读取不得进入 EvidencePack，所有文件句柄必须关闭。

**Interface 设计检查**：

- **Module / interface**：每个 backend 只需实现 probe/search；引擎知道健康、命中和完整性，不知道进程参数与 JSON 版本差异。
- **Seam placement**：外部进程与文件系统边界各有 seam；所有生产和测试调用都穿过端口。
- **Depth / locality**：CodeGraph/ripgrep 版本与输出变化集中在 adapter；引擎策略不随 CLI 细节变化。
- **Dependency strategy**：本地工具属于 local-substitutable；测试用 deterministic fake backend，integration test 使用真实 binary probe。
- **Adapter**：两个 production search adapter + fake test adapter；RepositoryReader 有 production + fixture 实现，均为真实 seam。

### 4.4 Golden-case fixture 契约

**方向**：Verification Kit → Evidence Engine / MCP Surface
**形式**：版本化 YAML manifest + 合成仓库目录

```ts
export interface GoldenCaseBase {
  readonly schemaVersion: '1.0';
  readonly id: string;
  readonly fixtureRoot: string;
}

export interface GoldenSuccessCase extends GoldenCaseBase {
  readonly kind: 'success';
  readonly request: LocateRequest;
  readonly expected: {
    readonly ok: true;
    readonly status: LocateStatus;
    readonly confirmed: readonly EvidenceExpectation[];
    readonly candidates: readonly EvidenceExpectation[];
    readonly forbiddenEvidenceIds: readonly string[];
    readonly requiredCoverageCodes: readonly (
      | BackendReasonCode
      | LimitReasonCode
    )[];
    readonly minimumExclusionCounts: Readonly<
      Partial<Record<ExclusionReasonCode, number>>
    >;
  };
}

export interface GoldenErrorCase extends GoldenCaseBase {
  readonly kind: 'error';
  readonly requestJson: unknown; // 允许表达 schema-invalid input
  readonly expected: {
    readonly ok: false;
    readonly error: {
      readonly code: RepoNavToolError['code'];
      readonly recoverable: boolean;
      readonly suggestedAction?: NextActionCode;
    };
    readonly mcpIsError: true;
    readonly structuredTextParity: true;
  };
}

export type GoldenCase = GoldenSuccessCase | GoldenErrorCase;

export interface EvidenceExpectation {
  readonly file: string;
  readonly contains: string;
  readonly role?: EvidenceRole;
  readonly reasonCodes?: readonly (
    | ConfirmedReasonCode
    | CandidateReasonCode
  )[];
}

export interface McpLifecycleCase {
  readonly schemaVersion: '1.0';
  readonly id: string;
  readonly scenario: 'stdio-clean-output' | 'graceful-shutdown';
  readonly expected: {
    readonly stdoutMode: 'mcp-frames-only';
    readonly exitCode: 0;
    readonly maxShutdownMs: number;
  };
}
```

**约束**：

- Fixture 使用合成代码重现“当前映射为 `hcp_id`、同局部存在 `m_hcp_id`”的结构，不复制真实业务仓库源码。
- 断言忽略绝对路径、临时目录和运行耗时，只比较稳定 schema、相对位置、excerpt、分类、coverage 和顺序。
- 每个核心失败模式至少有一个 positive case 和一个 false-positive guard case。
- `minimumExclusionCounts` 对每个列出的 ExclusionReasonCode 断言实际 count 大于等于 manifest 值；用于强制核验 layer/path/negative/unverified decoy 没有静默消失。
- `GoldenSuccessCase` 断言 EvidencePack；`GoldenErrorCase` 断言 tool error、MCP `isError` 与 structured/text parity。两种 case 不允许共用含糊的可选字段。
- stdio cleanliness 与 shutdown 不伪装成 locate result，使用独立 `McpLifecycleCase` runner；shutdown case 必须验证 Nest context close 与 child cleanup 在 `maxShutdownMs` 内完成。

**MVP fixture family**：

- `source-field-mapping`：direct alias mapping + same-scope sibling。
- `false-confirmation-decoys`：同名 DTO、entity definition、test fixture、docs 示例和旁路实现均存在，但只有可执行 mapping 允许 confirmed。
- `layer-and-path-decoys`：跨 client/server/test layer、negative term、相似目录与 symlink path 候选。
- `backend-transitions`：CodeGraph missing/no-result/failed、ripgrep unavailable、hit-but-unverified、partial 与 timeout-with-evidence。
- `protocol-and-lifecycle`：invalid input/repo/path/internal error parity、stdout cleanliness、graceful shutdown。
- `large-synthetic-repository`：生成受控数量的文件与 decoy，记录固定 limits 下的结果数、是否超预算和运行时间基线；只作为 MVP 性能信号，不宣称代表真实 monorepo。

**Interface 设计检查**：

- **Module / interface**：Verification Kit 按 manifest 调用 service 或 MCP，不读引擎内部状态。
- **Seam placement**：测试从公开接口观察 EvidencePack；adapter 单测另行验证解析。
- **Depth / locality**：fixture 演进与 snapshot normalization 集中在 testkit，不散落到生产模块。
- **Dependency strategy**：纯本地、可复制；不依赖真实公司仓库或网络。
- **Adapter**：service runner 与 stdio MCP runner 共用 success/error expectation evaluator；独立 lifecycle runner 只处理 stdio cleanliness 与 shutdown，不混入 LocateResult 断言。

### 4.5 NestJS runtime DI 与 bootstrap 契约

TypeScript interface 在运行时会被擦除，不能直接作为 Nest injection token。以下 symbol 是跨 module 的唯一 runtime token：

```ts
export const REPOSITORY_EVIDENCE_SERVICE = Symbol.for(
  'repo-nav/RepositoryEvidenceService',
);
export const REPOSITORY_SEARCH_BACKENDS = Symbol.for(
  'repo-nav/RepositorySearchBackends',
);
export const REPOSITORY_READER = Symbol.for('repo-nav/RepositoryReader');
export const MCP_STDIO_HOST = Symbol.for('repo-nav/McpStdioHost');
```

**Provider assembly**：

- `EvidenceModule` 用 `useExisting` 把 `REPOSITORY_EVIDENCE_SERVICE` 指向默认 engine provider，并只依赖 `REPOSITORY_SEARCH_BACKENDS` 与 `REPOSITORY_READER` tokens。
- `RepositoryBackendsModule` 用 factory provider 生成 `readonly RepositorySearchBackend[]`。固定顺序为可用的 `CodeGraphBackend` 在前、`RipgrepBackend` 在后；F6 之前 CodeGraph dependency 为 optional，集合只有 ripgrep。
- NestJS 11 factory provider 使用显式 optional dependency token，不依赖扫描顺序或“同 interface 自动聚合”。
- Test module 通过 `overrideProvider(REPOSITORY_SEARCH_BACKENDS).useValue([fakeBackend])` 和 `overrideProvider(REPOSITORY_READER).useValue(fixtureReader)` 替换真实外部依赖；不得 mock Evidence Engine。
- F1 创建 `AppModule`、上述 tokens、module skeleton 与 `createRepoNavApplicationContext()` 测试工厂；F2/F3 填入 reader/backend/engine providers；F4 创建 production `main.ts`，解析 `MCP_STDIO_HOST`、连接 stdio、启用 shutdown hooks 并在退出时关闭 context。
- debug CLI 复用 `createRepoNavApplicationContext()` 与 `REPOSITORY_EVIDENCE_SERVICE`，不复制另一套 provider graph。

**Interface 设计检查**：runtime tokens 是 Nest module seam；有序 backend collection 是唯一多 adapter assembly point。删除该 assembly 会让 backend priority、optional dependency 和 test replacement 散落到 bootstrap 与 engine，因此不是 pass-through provider。

### 4.6 EvidencePack 全局 invariant

1. `confirmed` 与 `candidate` 是互斥集合，相同 `id` 不得同时出现。
2. 任一 evidence 的 excerpt 必须来自本次调用期间读取的当前文件系统。
3. 相对路径规范化后必须位于 repository root 内，禁止符号链接逃逸。
4. `no_result` 只能在 coverage 明确记录所有策略要求的 backend attempt 后返回。
5. `partial`、`timeout` 可携带已核验证据，但必须列出 limits/coverage 缺口。
6. 敏感片段可以被裁剪或遮盖，但路径、行范围和 redaction reason 必须保留。
7. 结果按固定 priority → relative file → line → id 排序，不使用不透明概率分数。
8. MCP `structuredContent` 与 text fallback 必须表示同一个 `LocateToolOutput`。

### 4.7 Evidence ID、合并与排序规则

Evidence Engine 先在**分类前**为每个已核验 location 计算不含 role 的 discovery key：

```text
discovery:v1\0{POSIX-normalized-relative-file}\0{start}\0{end}\0{sha256(unredacted-normalized-excerpt)}
```

- excerpt 只把换行符规范化为 `\n`，不 trim、不改变其他空白；因此当前代码内容变化会产生新的 discovery key。
- 同一 discovery key 被多个 backend 命中时先合并为一个 discovery record；`discoveredBy` 按 `codegraph → ripgrep` 固定顺序去重，operations/discovery reasons 也按 schema 顺序去重。
- 合并后只执行一次 classification。一个 discovery record 必须选出唯一 primary role，固定优先级为 `value-mapping > execution-site > definition > reference > related`；若同一位置满足多项，使用最高优先级，其他匹配只保留为内部 classification evidence，不生成第二条 public evidence。
- classification 完成后再计算 public canonical key：`{discovery-key}\0{evidence-class}\0{primary-role}`；`id` 固定为 `evidence:v1:{sha256(public-canonical-key)}`，SHA-256 使用完整 64 位十六进制，不截断。
- 因为 evidence class 与 role 只在合并后确定，同一 discovery location 不会被不同 backend 分别生成 confirmed/candidate 或多个 role ID。未来若要一处多角色，必须升级 schema version。
- redaction 在 ID 计算之后执行；ID 不包含绝对路径，但不得输出原始 excerpt hash 以外的敏感派生信息。
- 若完整 SHA-256 ID 在同一调用中映射到两个不同 public canonical key，视为内部 invariant violation，返回 `INTERNAL_ERROR`，不得静默加随机 suffix。
- 最终排序键固定为 evidence class priority、role priority、POSIX relative file、start、end、id；priority tables 属于 schema v1 contract，F1 必须以常量和测试锁定。

## 5. 子 feature 清单

1. **`repository-evidence-foundation`** — 建立 NestJS 11 standalone、严格 TypeScript 工程、版本化 schema、输入归一化、DI tokens、fixture manifest 和统一验证脚本。
   - 所属模块：Evidence Engine、Repository Backends、Verification Kit
   - 依赖：无
   - 状态：done
   - 对应 feature：`2026-07-10-repository-evidence-foundation`
   - 备注：创建 AppModule/provider skeleton 与 build/typecheck/unit/golden/MCP test 入口；用 schema tests 锁定 literal string、byte budgets、reason codes、ID canonicalization 和排序常量，不引入 LLM 或 HTTP adapter。

2. **`repository-access-process-safety`** — 实现 root realpath、symlink escape 防线、RepositoryReader、安全 argv process runner、AbortSignal 终止和 stderr/stdout 隔离。
   - 所属模块：Repository Backends
   - 依赖：`repository-evidence-foundation`
   - 状态：done
   - 对应 feature：`2026-07-10-repository-access-process-safety`
   - 备注：任何真实仓库检索前必须先经过本条；用越界路径、symlink、特殊字符 argv、max file/excerpt、超时、无迟到 evidence 和 child/file cleanup cases 验收。

3. **`text-source-evidence-engine`** — 实现 literal ripgrep backend、当前文件核验、discovery merge 与 classification truth table 的 direct-mapping confirmed 基线。
   - 所属模块：Evidence Engine、Repository Backends
   - 依赖：`repository-access-process-safety`
   - 状态：done
   - 对应 feature：`2026-07-10-text-source-evidence-engine`
   - 备注：必须同时通过 alias mapping positive 与 DTO/definition/test/doc false-confirmation cases；尚不做 sibling candidate 扩展或 MCP transport。

4. **`mcp-locate-surface`** — 通过 Nest standalone + stdio MCP 暴露 `repo_nav_locate`，提供 Zod schema、structuredContent/text parity、typed isError 和生命周期清理。
   - 所属模块：MCP Surface
   - 依赖：`text-source-evidence-engine`
   - 状态：in-progress
   - 对应 feature：`2026-07-10-mcp-locate-surface`
   - 备注：以 MCP TypeScript SDK v1.29.0 稳定 API 为规划基线；feature-design 重新核验、lockfile 固定实际稳定版本，禁止静默切换 alpha。

5. **`candidate-evidence-policy`** — 实现 sibling/alias 局部扩展、confirmed/candidate 互斥分类、promotion requirements 和稳定停止策略。
   - 所属模块：Evidence Engine、Verification Kit
   - 依赖：`mcp-locate-surface`
   - 状态：in-progress
   - 对应 feature：`2026-07-10-candidate-evidence-policy`
   - 备注：本条是受控 fixture 的最小闭环，不是可发布里程碑；必须经 MCP 返回 direct mapping confirmed、sibling candidate，并拒绝相似但无关 decoy。

6. **`codegraph-fallback-orchestration`** — 接入 CodeGraph probe/query JSON adapter，并实现 missing/no-result/failure 时可观察的 ripgrep fallback 与 index health。
   - 所属模块：Repository Backends、Evidence Engine
   - 依赖：`text-source-evidence-engine`
   - 状态：in-progress
   - 对应 feature：`2026-07-10-codegraph-fallback-orchestration`
   - 备注：与 MCP/candidate 分支可并行；当前环境 CodeGraph 1.1.6 提供结构化命令，但实现以 runtime probe 和 adapter compatibility tests 为准。

7. **`evidence-output-guardrails`** — 汇合 candidate 与 CodeGraph 分支，实现完整状态转换、全局结果预算、敏感 excerpt redaction、coverage/nextActions 和错误输出 parity。
   - 所属模块：Evidence Engine、MCP Surface
   - 依赖：`candidate-evidence-policy`、`codegraph-fallback-orchestration`
   - 状态：in-progress
   - 对应 feature：`2026-07-10-evidence-output-guardrails`
   - 备注：聚焦 EvidencePack 输出治理；filesystem/process 安全已由 F2 提供。通过 partial/timeout-with-evidence、backend-unavailable、invalid/internal errors 和 redaction cases 验收。

8. **`mvp-golden-regression-suite`** — 建立完整 positive/negative/failure/lifecycle fixture family、稳定 snapshot evaluator 和受控大型合成仓库性能基线。
   - 所属模块：Verification Kit
   - 依赖：`evidence-output-guardrails`
   - 状态：in-progress
   - 对应 feature：`2026-07-10-mvp-golden-regression-suite`
   - 备注：覆盖 mapping、DTO/test/docs decoy、layer/path decoy、CodeGraph missing/no-result/failed、stdio shutdown、redaction、limits 和 false-confirmation。

9. **`debug-cli-mcp-guide`** — 增加最小 debug CLI、backend probe、fixture 回放、MCP 安装示例和 MVP API/验收指南。
   - 所属模块：Verification Kit、MCP Surface
   - 依赖：`mvp-golden-regression-suite`
   - 状态：in-progress
   - 对应 feature：`2026-07-10-debug-cli-mcp-guide`
   - 备注：CLI 只复用 application contract，不新增独立业务语义；文档明确最小闭环与可发布 MVP 的区别。

**最小闭环**：第 5 条 `candidate-evidence-policy` 完成后，外部 Agent 能通过 stdio MCP 在受控合成 fixture 上获得当前事实、独立候选及覆盖状态。只有完成 F7/F8 的全状态 guardrails 与回归套件后，才可视为可发布 MVP 候选。

### Goal Coverage Matrix

| Goal / completion signal | Covered by item(s) | Verification entry | Evidence type | Core? |
|---|---|---|---|---|
| literal 输入归一化、mixed smart/sensitive/insensitive、byte budgets、DI tokens、ID 与排序常量被锁定 | `repository-evidence-foundation` | `npm test -- --group contract --case term-case-parity` | schema/unit assertions | yes |
| root 越界、symlink escape、特殊 argv、超时、无迟到 evidence 和 child/file cleanup 在任何真实检索前被阻断 | `repository-access-process-safety` | `npm test -- --group repository-safety --group reader-limits --group reader-failures && npm test -- --group process-contract --group process-output-isolation && npm test -- --group process-cleanup --case reader-abort-no-late-completion` | filesystem + process integration tests | yes |
| direct mapping 被 confirmed，而同名 DTO/definition/test/doc 只进入 candidate/excluded，并记录 typed exclusion counts | `text-source-evidence-engine` | `npm run test:golden -- --case source-field-mapping --case false-confirmation-decoys --case exclusion-summary` | positive + negative golden assertions | yes |
| MCP 返回精确 confirmed evidence，structuredContent/text 等价、stdout 干净并可 graceful shutdown | `mcp-locate-surface` | `npm run test:mcp -- --case source-field-mapping --case output-parity --case stdio-clean-output --case stdio-graceful-shutdown` | stdio protocol integration tests | yes |
| 相似 sibling 进入 candidates 且无关 sibling 不被提升 | `candidate-evidence-policy` | `npm run test:golden -- --case sibling-candidate --case sibling-false-positive` | golden classification assertions | yes |
| CodeGraph missing/no-result/failed 都执行可观察 fallback，所有 backend unavailable 单独表达 | `codegraph-fallback-orchestration`, `evidence-output-guardrails` | `npm run test:golden -- --case codegraph-missing --case codegraph-no-result --case codegraph-failed --case backend-unavailable` | fake-adapter transitions + local binary smoke | yes |
| `no_result`、`partial`、`timeout` with evidence 和 coverage/nextActions 严格遵守转换表 | `evidence-output-guardrails` | `npm run test:golden -- --case verified-no-result --case partial-with-evidence --case timeout-with-evidence` | status/reason-code assertions | yes |
| invalid input/repo/path/internal error 在 structured/text/isError 三处保持一致且不泄露 stack | `evidence-output-guardrails`, `mcp-locate-surface` | `npm run test:mcp -- --case invalid-input --case invalid-repo --case path-outside-root --case internal-error-parity` | protocol error integration tests | yes |
| 敏感 excerpt、结果预算和 redaction metadata 均可核验 | `evidence-output-guardrails` | `npm run test:golden -- --case secret-redaction --case result-limits` | golden security assertions | yes |
| mapping、decoy、layer/path、backend failure、lifecycle 和受控大型仓库 cases 组成完整回归套件 | `mvp-golden-regression-suite` | `npm run test:golden -- --all && npm run test:mcp -- --all` | regression logs + normalized snapshots | yes |
| 核心 cases 可通过 debug CLI 回放，MCP 安装/API 指南可按步骤完成 smoke | `debug-cli-mcp-guide` | `npm run repo-nav -- debug golden --all` | command output + documentation smoke record | no |
| build、strict typecheck、unit、golden 与 MCP integration 全部通过 | 全部 items | `npm run build && npm run typecheck && npm test && npm run test:golden && npm run test:mcp` | command logs | yes |

## 6. 排期思路

### 推进顺序

```text
F1 工程 / schema / DI / fixture
  → F2 repository access + process safety
    → F3 文本检索 / 文件核验 / baseline classification
      ├→ F4 MCP 表面 → F5 candidate policy（受控 fixture 最小闭环）
      └→ F6 CodeGraph + fallback
            F5 + F6 → F7 output guardrails
                        → F8 完整 golden regression suite
                          → F9 debug CLI / MCP guide
```

先固定契约与 fixture，再把最低路径/process 安全前置，避免任何可调用闭环先于 root、symlink、argv 和 timeout 防线。F3 后并行验证 MCP/candidate 与 CodeGraph adapter，提前暴露外部工具风险；F7 汇合两支并完成全状态输出治理。最小闭环选择 F5 而不是最容易完成的基础条目，但只代表受控 fixture 上证明用户价值，不能等同于可发布 MVP。

### Roadmap 完成信号

- 九条 item 均为 `done` 或经 owner 明确 `dropped`。
- Goal Coverage Matrix 中所有 core 行均有可执行命令和 acceptance 证据。
- 合成 source-of-truth positive/negative/decoy cases、CodeGraph missing/no-result/failed、状态转换、生命周期及安全 cases 全部通过。
- MCP host 能通过 stdio 调用 `repo_nav_locate`；输出 schema 稳定、文本 fallback 等价。
- 没有把 session、trace、impact、AST、git history 或业务判断偷渡进 MVP。

### Top 3 风险与缓解

1. **确定性规则错误确认或错误分类 evidence**
   缓解：`provenance.verifiedBy='filesystem'` 只证明新鲜度，不单独允许 confirmed；classification truth table 是硬契约；要求宿主提供 terms/anchors；每条 confirmed/candidate reason 同时配 positive 和 false-confirmation fixture；DTO、definition、test、docs、跨 layer/path decoy 必须进入回归套件。
2. **外部 CLI 输出或版本变化破坏 adapter**
   缓解：只依赖 `rg --json`、`codegraph status --json`、`codegraph query --json` 结构化表面；运行时 probe 版本和能力；adapter 隔离解析；始终从文件系统重新核验 excerpt；CodeGraph 失败可回退。
3. **证据扩展造成噪声、token 浪费或敏感信息泄露**
   缓解：F2 前置路径/process 安全，F7 独立治理结果上限、稳定停止条件、negativeTerms、敏感模式裁剪及 coverage/limits；F8 用受控大型合成仓库记录结果数量与运行时间基线。

### 非显然依赖与关键假设

- 宿主 Agent 能把用户问题提取成至少一个 `terms`，并在已知时提供 symbol/file/table anchors。
- 目标仓库位于本机可读目录；MVP 不访问远程 Git host 或网络代码搜索。
- `rg` 是基础运行依赖；CodeGraph 是可选增强依赖，缺失时不阻塞文本检索闭环。
- 当前环境事实：Node.js 24.15.0、npm 11.12.1、ripgrep 15.1.0、CodeGraph 1.1.6；实现目标应保持 Node.js 22+ 兼容，不能只在当前机器版本上可用。
- 当前目录还不是 Git repository。进入第一条 feature-design/impl 前，owner 必须先初始化 Git、确定默认分支并建立可供 CodeStable worktree gate 使用的基线 commit；该 owner 环境动作不会由 roadmap 自动执行。
- MCP TypeScript SDK v1.29.0 的稳定文档支持 Zod input/output schema、`structuredContent` + text fallback、`isError` tool response 与 `StdioServerTransport`。每个实现 feature 启动时仍需按 Context7/官方文档复核稳定 API。
- NestJS 11 当前文档确认 `NestFactory.createApplicationContext()` 可在无网络 listener 时提供 IoC container，并通过 `app.close()` 触发生命周期清理。当前规划以 NestJS 11.1.16 文档为基线，feature-design 时重新核验并由 lockfile 固定实际稳定版本。
- 首个 golden fixture 只复刻结构性歧义，不复制真实仓库代码、表名或敏感数据。

### 基线与验证入口

当前没有 `package.json`、源代码或现成测试命令，基线不可运行。F1 是 safety-net 条目，必须先建立并实际执行以下稳定入口：

```text
npm run build
npm run typecheck
npm test
npm run test:golden
npm run test:mcp
```

F2 起每条 feature acceptance 必须至少运行 typecheck 与相关 unit/integration；F3 起运行 classification golden cases；F4 起涉及协议的 feature 额外运行 MCP integration；F6/F7 运行真实进程 smoke 与受控 fake-adapter fault cases；F8/F9 运行完整 golden/MCP suite。

### 交付物落点与知识回写

- 生产实现：package 配置、Evidence Engine、backend adapters、MCP Surface。
- 验证实现：合成 fixtures、golden manifests、test runners、debug CLI。
- 稳定协议：由 roadmap 第 4 节约束；每条 feature design 只能细化，不得静默改字段语义。
- F1 验证后的构建/测试命令应通过 `cs-note` 写入 `attention.md`。
- F2/F4/F6/F7 acceptance 若验证出 Windows 进程处理、MCP SDK、CodeGraph JSON 或 evidence policy 的稳定约束，应沉淀为 learning/decision；尚未验证前不写 ADR。
- MVP 结束时用 `cs-doc-api` 为 `repo_nav_locate` 写公开参考，用 `cs-doc-tutorial` 写宿主 Agent 安装与调用指南。

## 7. 观察项

- EvidencePack 的 `schemaVersion: '1.0'` 是 roadmap 契约；若 feature-design 需要不兼容修改，必须先更新 roadmap 并重跑 review。
- 旧材料中的 `QuerySession`、`relationPaths`、`facets`、`nextQueries` 等字段暂不迁入 MVP，避免把历史想法伪装成已批准契约。
- 数字 confidence 暂不采用。没有校准数据前，概率会制造错误确定感；MVP 使用 evidence class + reason codes + deterministic rank。
- CodeGraph `explore/node` 的人类可读输出可用于开发诊断，但不能成为 production parser 的硬依赖；若未来出现官方稳定结构化 explore API，再通过 roadmap update 评估。
- MCP Surface 采用 stdio 是当前本地 Agent 场景的计划选择；HTTP/远程部署需要新的安全模型和独立 roadmap。
- MVP 使用 NestJS standalone application context 但不启动 HTTP server，因此不需要 Express/Fastify adapter；若后续 roadmap 增加 HTTP transport，必须使用 Fastify 并重新设计认证、限流和远程路径安全。
- Zod 是 MCP tool input/output schema 与运行时校验的单一来源。feature design 核验发现 SDK v1.29.0 `registerTool` 会在 handler 前拒绝 schema-invalid arguments，无法满足本 roadmap 的 typed structured error parity；因此已批准 F4 使用稳定 low-level Server tools capability/list/call handlers，并由 RepoNav 手工 parse/self-validate。仍不引入 HTTP DTO 或 class-validator 维护第二套 schema。
- 当前 no-code 状态下没有现状 architecture 可回填。MVP 实现并验收后，再由 acceptance 把真实模块结构写入 `.codestable/architecture/`。
- Git 已初始化为 `main`，goal package baseline_ref 为 `04b04f7a1314f322e82157363ced505e2199cfc8`；若该 ref 无法解析、planning dirty set 混入 unrelated files 或无法建立干净 implementation 边界，goal 会话必须停止修复，不能绕过分支保护。
