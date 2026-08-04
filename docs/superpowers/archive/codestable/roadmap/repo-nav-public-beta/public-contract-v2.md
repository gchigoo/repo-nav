---
doc_type: roadmap-contract
roadmap: repo-nav-public-beta
status: draft
created: 2026-07-23
---

# RepoNav public contract v2

## 1. 目标与切换策略

v2 把“内部用于检索、核验和去重的原始身份”与“外部 Agent 可以安全消费的公共身份”彻底分开。公共契约继续提供可定位证据、confirmed/candidate、coverage 和 next actions，但不暴露绝对仓库根、Git object ID 或由原始内容派生的稳定 hash。

v2 按以下顺序实现，禁止用虚构或占位 coverage 提前切换：

1. F1 已在当前 v1 public surface 后建立 internal/public assembler、字段级脱敏、response-local ID 和严格 v2 schema 的测试 seam；生产 MCP/CLI 仍返回 v1。
2. F1A/F1B 先把 F1 收敛为真正有界的安全边界：span-based 单次 materialization、低熵 corpus policy、raw/public/aggregate resource budgets。
3. F1C 建立真实执行管线的 typed fact envelope、required-owner finalizer 与 v1 projector；production transport 仍只选择 v1，v2 projector 只允许 test/shadow harness 调用。
4. F3/F2/F5/F6/F7/F8 分别提供真实 snapshot、ranking、backend、request outcome、scope 和 capability fragments；每项都从真实 service envelope 验证自己的 fragment，并保持 v1 regression。
5. F8 补齐最后一个 required owner 后，首次允许真实 pipeline 产生完整 v2 shadow result；该 result 仍不可从 MCP/CLI transport 到达。
6. F9 在所有字段 owner 的 contract tests 通过后，只切换 projector binding，原子地把 `RepositoryEvidenceService.locate()`、MCP locate 和 debug CLI locate 切换为 v2。
7. 切换前不允许给缺失事实填空数组、`unknown` 或假 completeness；切换后不再双写 v1。

public-beta runtime support 同步冻结为 Node.js `^22.0.0 || ^24.0.0`；Node 20 不属于 `0.2.0-beta.1` 支持矩阵，F4 必须先建立两个 major × 三个 OS 的 blocking evidence，F9 再更新 package metadata。

## 2. LocateRequest v2

```ts
interface LocateRequestV2 {
  readonly repoPath: string;
  readonly question?: string;
  readonly terms: readonly string[];
  readonly termCase?: 'sensitive' | 'insensitive' | 'smart';
  readonly anchors?: readonly LocateAnchor[];
  readonly layers?: readonly RepoLayer[];
  readonly negativeTerms?: readonly string[];
  readonly limits?: LocateLimits;
}

interface LocateAnchor {
  readonly kind: 'symbol' | 'file' | 'table' | 'route' | 'term';
  readonly value: string;
}

interface LocateLimits {
  readonly maxFiles?: number;      // integer 1..20, default 8
  readonly maxConfirmed?: number;  // integer 1..20, default 8
  readonly maxCandidates?: number; // integer 0..20, default 8
  readonly timeoutMs?: number;     // integer 1000..30000, default 10000
}
```

### 字段语义

- `repoPath`：本地文件系统输入，支持平台绝对路径或相对当前进程工作目录的路径。保留调用方原值，不做 NFKC 或 trim；拒绝 NUL 和超出 UTF-8 byte budget 的值，再解析 realpath root 并验证为可读目录。它不得进入公共结果。
- `question`：可选说明文本。可以做 NFKC、trim 和输入预算校验，但不得进入 production search plan、classification 或 ranking。
- `terms` / `negativeTerms`：语义搜索文本，继续 NFKC、trim、smart case 和去重；`terms` 至少一项。
- `anchors[kind=file].value`：repository-root relative POSIX locator；不做 NFKC 或 trim，拒绝反斜杠、NUL、绝对路径、root escape 和超出 byte budget 的值。
- `symbol | table | route | term` anchor value：按 search term 规则归一化。
- `terms` 1..16 项、`anchors` 最多 16 项、`layers` 最多 7 项；单 term 最大 128 UTF-8 bytes、term 总和最大 1024 bytes、anchor 最大 512 bytes、`repoPath/question` 各最大 4096 bytes，完整 request 最大 16 KiB。

file anchor 从 v1 的反斜杠自动转换改为拒绝，是有意的不兼容变化。

## 3. LocateResult v2

以下 TypeScript 结构全部映射为 strict Zod object；未知字段、不符合约束的空数组、反向行号和不符合 pattern 的 ID 都必须解析失败。`reasonCodes`、`promotionRequirements`、`discoveredBy` 和 `operations` 必须是非空唯一数组；行号为正整数；confirmed/candidate 内部及两类之间的 ID 必须唯一。

```ts
type LocateResultV2 =
  | Readonly<{ ok: true; evidence: EvidencePackV2 }>
  | Readonly<{ ok: false; error: RepoNavToolErrorV2 }>;

interface EvidencePackV2 {
  readonly schemaVersion: '2.0';
  readonly status: LocateStatus;
  readonly repositoryRef: 'local-repository';
  readonly normalizedTerms: readonly PublicSearchTerm[];
  readonly confirmed: readonly ConfirmedEvidenceV2[];
  readonly candidates: readonly CandidateEvidenceV2[];
  readonly coverage: CoverageReportV2;
  readonly nextActions: readonly NextActionCode[];
}
```

```ts
type LocateStatus =
  | 'ok'
  | 'partial'
  | 'no_result'
  | 'backend_unavailable'
  | 'cancelled'
  | 'timeout';

type RepoLayer =
  | 'client'
  | 'server'
  | 'db'
  | 'test'
  | 'docs'
  | 'config'
  | 'unknown';

type AnchorKind = 'symbol' | 'file' | 'table' | 'route' | 'term';

type NextActionCode =
  | 'ADD_TERM'
  | 'ADD_SYMBOL_ANCHOR'
  | 'CONFIRM_CANDIDATE'
  | 'INITIALIZE_CODEGRAPH'
  | 'RETRY_WITH_HIGHER_LIMIT';
```

### repositoryRef

- v2 固定为 `local-repository`。
- 不根据目录名、绝对路径、Git revision/remote、用户名或工作区名称生成。
- 如果未来需要多 repository ref，由新的显式调用方字段提供并另行设计；本路线不提前增加。

### PublicSearchTerm

```ts
interface PublicSearchTerm {
  readonly value: string;
  readonly caseSensitive: boolean;
  readonly redaction?: FieldRedaction;
}

interface FieldRedaction {
  readonly applied: true;
  readonly reasonCodes: readonly RedactionReasonCode[];
}
```

搜索使用内部 normalized term；公共副本使用和 excerpt 相同的 sensitive-token policy。调用方不得从公共 value 反推实际搜索值。

## 4. Evidence、定位与字段级脱敏

```ts
type EvidenceRole =
  | 'execution-site'
  | 'value-mapping'
  | 'definition'
  | 'reference'
  | 'related';

type EvidenceSource = 'codegraph' | 'ripgrep' | 'filesystem';

type EvidenceOperationCode =
  | 'CODEGRAPH_QUERY'
  | 'RIPGREP_SEARCH'
  | 'FILESYSTEM_READ_RANGE'
  | 'FILESYSTEM_FIND_MATCHES';

type RedactionReasonCode =
  | 'SECRET_LIKE_VALUE'
  | 'CONNECTION_STRING'
  | 'PERSONAL_DATA'
  | 'BINARY_OR_OVERSIZED_CONTENT'
  | 'UNTRUSTED_CONTROL_CHARACTERS';

interface EvidenceLocationV2 {
  readonly file: string;
  readonly resolvable: boolean;
  readonly symbol?: string;
  readonly lines: readonly [number, number];
  readonly excerpt: string;
  readonly redaction?: Readonly<{
    applied: true;
    fields: readonly RedactedField[];
  }>;
}

interface RedactedField {
  readonly field: 'file' | 'symbol' | 'excerpt';
  readonly reasonCodes: readonly RedactionReasonCode[];
}

interface EvidenceProvenanceV2 {
  readonly discoveredBy: readonly EvidenceSource[];
  readonly verifiedBy: 'filesystem';
  readonly operations: readonly EvidenceOperationCode[];
}
```

```ts
type ConfirmedReasonCode =
  | 'EXACT_TERM_MATCH'
  | 'EXACT_SYMBOL_ANCHOR'
  | 'DIRECT_ALIAS_MAPPING';

type CandidateReasonCode =
  | 'EXACT_TERM_WITHOUT_DIRECT_MAPPING'
  | 'SYMBOL_REFERENCE_ONLY'
  | 'SAME_SCOPE_SIMILAR_IDENTIFIER'
  | 'SAME_ENTITY_SIBLING'
  | 'ALIAS_SOURCE_NEIGHBOR'
  | 'SECONDARY_BACKEND_HIT'
  | 'UNSUPPORTED_LANGUAGE_LITERAL';

type PromotionRequirementCode =
  | 'USER_SEMANTIC_CONFIRMATION'
  | 'DIRECT_REFERENCE_REQUIRED'
  | 'CALL_PATH_REQUIRED'
  | 'SUPPORTED_LANGUAGE_ADAPTER_REQUIRED';

interface ConfirmedEvidenceV2 {
  readonly evidenceClass: 'confirmed';
  readonly id: PublicEvidenceId;
  readonly role: EvidenceRole;
  readonly location: EvidenceLocationV2;
  readonly provenance: EvidenceProvenanceV2;
  readonly reasonCodes: readonly ConfirmedReasonCode[];
}

interface CandidateEvidenceV2 {
  readonly evidenceClass: 'candidate';
  readonly id: PublicEvidenceId;
  readonly role: EvidenceRole;
  readonly location: EvidenceLocationV2;
  readonly provenance: EvidenceProvenanceV2;
  readonly reasonCodes: readonly CandidateReasonCode[];
  readonly promotionRequirements: readonly PromotionRequirementCode[];
}

type PublicEvidenceId = `evidence:v2:${string}`; // exact regex: ^evidence:v2:\d{4,}$
```

### 定位规则

- 安全时，`file` 是 repository-relative POSIX locator，`resolvable=true`。
- path 任一 segment/token 命中 sensitive policy 时，不返回部分真实路径；`file='[REDACTED_PATH]'`、`resolvable=false`，并为 `file` 写 redaction metadata，同时增加 `LOCATION_REDACTED` degradation。
- 路径被隐藏时，行号仍表示核验时的原始文件位置，但公共定位有意不可解析；文档和 next action 不得宣称其可导航。
- `symbol` 只替换命中策略的完整或分段 token。
- `excerpt` 保留 quote-aware secret、connection、personal-data、oversized 处理。
- `_`、`-` 和驼峰都参与 identifier 分词：`MY_API_KEY`、`databasePassword`、`SERVICE-AUTH-TOKEN` 必须命中。
- C0 控制字符、ESC/ANSI 和 bidi controls 在所有公共字符串中转义或替换，换行与制表符只在 excerpt 的既有格式约束内允许。
- repository 内容永远作为不可信 evidence，而不是给 Agent/MCP host 的指令。
- 字面量 `[REDACTED]` 只有在同时存在对应 redaction metadata 时才表示 policy replacement；没有 metadata 时按普通仓库内容处理，避免 placeholder collision。
- 所有 matcher 只在原始字段值上产生 `{start,end,reasonCodes}`；重叠 span 合并后一次性 materialize。已经生成的 placeholder 或中间输出不得再次进入 matcher/corpus loop。
- response-wide corpus 使用 `Map<string, Set<RedactionReasonCode>>` 语义，同一值的多个 reason 合并后按枚举顺序输出，不允许由遍历顺序覆盖。
- 通用 assignment value 只有在 8–512 UTF-8 bytes、至少 4 个不同 code point、非纯数字、非 low-information literal/sentinel 时才允许跨字段传播；不满足传播资格不影响其原字段内的 local redaction。
- fixed credential、connection secret、email 和通过电话 truth table 的 PII 可进入 corpus，但仍受条目数、累计 bytes 与单项 bytes 限制。
- 文本字段的 corpus token 使用完整 token/boundary span；file 只接受完整 POSIX segment 等值匹配。任何 path arbitrary-substring match 都是 contract violation。
- 电话在规范化后必须包含 10–15 个数字，并排除 ISO date、version/build number、timestamp、UUID fragment 和短横线短数字组。

### Span 坐标、eligibility 与 matcher truth table

- span 使用 detector 收到的精确原始 JavaScript string 的 0-based UTF-16 code-unit 坐标，区间为 half-open `[start,end)`。起止必须是 Unicode code-point boundary，禁止切开 surrogate pair；不得在检测前 NFKC、case-fold、转换换行或插入 placeholder。
- CRLF 保留两个 code unit；sanitizer span 触及其中一个时扩展覆盖整对。span 按 `(start,end,reason enum order)` 排序，重叠或直接相邻的 span 合并，reason 做 canonical set union。emoji、combining mark、孤立 surrogate、LF/CRLF 都是 blocking fixtures。
- assignment extractor 只移除语法引号。跨字段匹配对原始值 case-sensitive 且不 normalization；eligibility 单独使用 `value.normalize('NFKC').trim().toLowerCase()` comparison key，并按 Unicode code point 计算 distinct count。
- canonical low-information/sentinel set 为 `{true,false,null,undefined,none,nil,yes,no,on,off,n/a,na,unknown,default,test,example,sample,dummy,changeme,redacted,[redacted],[redacted_path]}`；通用 assignment 还必须满足原值 8–512 UTF-8 bytes、至少 4 个不同 comparison-key code point、非纯数字。集合变化属于 roadmap contract change。
- exact-text 先找原始 code-unit 序列；若首/尾 code point 属于 Unicode `Letter|Number|Mark|Connector_Punctuation`，对应外侧不得紧邻同类 code point。path corpus 仅按 POSIX `/` 分段后的完整 segment、case-sensitive 等值匹配。
- phone classifier 只允许 `+ - ( ) . space` 作为数字间标点并要求 10–15 位数字；排除 ISO date/datetime、SemVer/点分版本、canonical UUID/片段、`YYYYMMDD[HHMMSS]`、带 `version|ver|build|release|timestamp|epoch` cue 的数字和非 `3-3-4`/可选 country-code 结构的短横线组。落入 2000-01-01..2099-12-31 Unix seconds/milliseconds 范围的裸 10/13 位数字是 ambiguous/local-only；没有 `phone|tel|mobile|contact` cue 时不得进入 response-wide corpus。下表 reject 只表示不得成为 phone corpus entry，本地 detector 仍可按上下文隐藏。

| phone accept | phone reject |
|---|---|
| `+1 (415) 555-2671` | `2026-07-23` |
| `415-555-2671` | `v1.20.260723` |
| `13800138000` | `timestamp=1690000000` |
| `phone=2125551234` | bare `1690000000` / `1690000000000` |
| `+86 138 0013 8000` | `550e8400-e29b-41d4-a716-446655440000` |
|  | `20260723153000` |
|  | `123-45-678` |

### Redaction 与 ID cross-field invariant

以下规则由 strict schema 的 `superRefine` 和 assembler unit tests 同时拥有：

1. `redaction.fields` 非空，每个 field 最多一次，固定顺序为 `file, symbol, excerpt`；每项 `reasonCodes` 非空、唯一并按枚举顺序。
2. `resolvable=false` 当且仅当 `file='[REDACTED_PATH]'` 且 metadata 包含 `field=file`；`resolvable=true` 时禁止 file redaction metadata。仓库中真实名为 `[REDACTED_PATH]` 的安全路径以 `resolvable=true` 且无 metadata 表示。
3. location redaction metadata 必须与 F1 materializer本次实际替换以及F1B whole-field replacement后的字段集合精确相等；没有替换时整个 `redaction` 字段省略。symbol/excerpt 的 literal placeholder 无 metadata 时仍按源码文本处理。
4. `PublicSearchTerm.redaction` 只在公共 value 实际被替换时出现；其 `reasonCodes` 非空、唯一、canonical order。
5. 令 `N=confirmed.length+candidates.length`；按 confirmed 后 candidate 的数组顺序，ID 必须严格等于 `evidence:v2:${String(index + 1).padStart(4, '0')}`，形成无空洞的 `0001..N` 连续序列。
6. `nextActions` 唯一并按 `NextActionCode` 的契约枚举顺序输出。

### Internal fact envelope 与 projection edge

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

- issuer同时创建无own-property projection capability与private `LocateExecutionTokenV2`。canonical executor接收capability，在任何owner work前取得同一token，并在返回前把exact terminal input、capability、token原子绑定；`requireCanonicalLocateExecutionTokenV2`只在三者exact匹配时返回token。input/capability/token clone、swap、stale或cross-execution在facts/value暴露前失败。F8可调用该internal accessor；F9只能消费F8 accepted façade，不得import它。
- F1C base冻结唯一 lifecycle：`four-prerequisite admission → source → materialization → aggregation completion → owner finalization`。pre-stage inspector只要求`snapshot/ranking/scope/capability`且拒绝base envelope预置`backend/request-outcome`，success只返回绑定exact input/execution/base的opaque prerequisite token；缺任一prerequisite或预置generated owner时所有stage/registrar为0。source registration只含opaque identity并必须消费prerequisite token；materialization registration只含public terms与按class分开的`{identity,value}`；aggregation registration含opaque identity、public-neutral `statusV2`及exact `backend/request-outcome` fragments。第三registrar从prerequisite registry恢复base，以fresh builder各add一次generated owner、freeze new complete envelope并把它私有绑定进completion-bearing aggregation token；caller不得提交complete envelope。finalizer只消费该token与execution，不读取原始partial input envelope。source/materialization registrar只允许F2 stage与test synthetic导入；aggregation registrar只允许F8 exact wrapper与test synthetic导入，F9不得导入。
- F2在F3 proof可用后的child revision拥有real `UnsafePublicMaterializationSourceV2` stage与direct harness。F2-stage real shadow已有snapshot/ranking但仍缺scope/capability两个prerequisite，因此两段不运行；backend/request-outcome缺失不是pre-stage blocker，必须由future aggregation产生。F8补齐四prerequisite后才第一次取得factory；`createSource(prerequisites,input,execution)`先验证opaque prerequisite token及F2/F3 provenance，第一项element-aware操作必须是F1B shallow count/type gate，使N+1在任何element getter/iterator之前失败，随后才执行field/segment、4MiB compact gate、strict source schema与exact ranking pairing。
- F2 real materialization adapter调用F1 `materializePublicEvidenceV2(source, execution)`；该API不得接收caller提供的corpus，必须从source中的exact normalized terms + confirmed + candidates内部构建唯一corpus，经F1B corpus guard后一次性产生span-materialized fields，再逐字段执行F1B public-field budgets。只有全部whole-field replacement完成后才能冻结`TrustedMaterializedEvidenceCoreV2`与`PublicMaterializationContributionV2`；raw/materialized wrapper object必须distinct，evidence只按private stable record identity/class/order/count配对，term按source provenance/index配对。core保留F2顺序与private record refs，但只含最终已脱敏且已过字段预算的terms/evidence、metadata、contribution与proof，不含coverage/status/ID。contribution的`locationRedacted`必须同时覆盖敏感路径整段隐藏和oversized file replacement；F1C materialization registration只收到按class分开的`{identity,value}`，F1C不反射identity。
- pre-stage missing按four-prerequisite顺序返回；finalizer final completeness按六owner enum顺序检查第三registrar私有绑定的新complete envelope。两者缺失使用`reason='missing-owner'`，互相矛盾使用`invalid-facts`，都不能用空值/假completeness补齐。F6 acceptance只以direct integration harness证明aggregator exact产生`backend/request-outcome/status/proof`，不声称real envelope mount，且F2 core accessor production importer仍为0。F8 exact aggregation wrapper是该accessor与第三registrar的唯一production caller：它把core交给F6，再把F6 exact双fragment/status提交registrar；F6不得导入materialization token/accessor或F1C registrar。F5 trace accessor先移除internal fields，F6只构造public-neutral attempts；composer exact复制该数组与registered status，不得接收/strip internal outcome、重算backend、构建corpus、redact或derive status。
- F1C 的 mandatory facts 只有 `repositoryRoot + NormalizedSearchTerm[] + legacyV1Projection`；`NormalizedSearchTerm` 保留 `{value,caseSensitive}`，sensitive/insensitive/smart 都必须有 v1 projector parity。F1C 不伪造 snapshot/stable evidence。
- F3 才填 snapshot fragment；其中 `finalStableEvidence` 是 final check/purge 后的稳定未预算池。ranking confirmed/candidates 必须按 internal discovery key 是该池的互斥子集，anchor ledger 与 evidence limits 来自同一池。缺 snapshot、池外、重复或 changed-file record 使 finalizer fail closed。
- F1C 把现有 `RepositoryEvidenceEngine.locate()` 执行体移到 canonical executor；production service只issue一次capability、以其执行executor并把同一capability传给v1 projector，shadow harness直接复用同一executor/input/capability/internal token，不复制backend/verification pipeline。
- `legacyV1Projection` 是同一次 execution state 生成的唯一临时 compatibility payload；owner fragments 不能从已脱敏 legacy result 反推，也不能触发第二次 backend/reader execution。v1 projector必须先恢复same internal token再返回该exact对象引用；source/materialization/aggregation/owner-finalization/composition/schema/serialization任一v2 shadow failure不得阻断或改写production v1。F9 删除该字段和 v1 projector。
- 上述 `LocateRequest` / `LocateExecutionContext` 是 F1C 复用的现有 internal ports；F6 在同一个 executor port 上迁移为本文件第 2 节 input semantics，并把v2 composition seam从“unsafe full result后redact”收敛为“trusted source → materialized evidence core → request outcome → materialized composer”，但不改变canonical executor/v1 projector的production选择边界。
- contribution tuple按child revision原子演进且绝不预留optional slot：F6 acceptance exact为
  `[materialization,snapshot]`；F7 acceptance改为`[materialization,snapshot,scope]`并明确无index 3；
  F8 implementation再原子改为`[materialization,snapshot,scope,capability]`，index 0..3固定，F6
  aggregator按序调用四个owner accessor各exact一次。每一revision都拒绝上一版tuple、missing/extra/
  duplicate/reorder/clone/cross-execution/proof swap，不能把future tuple计入较早feature acceptance。
- F9 前 production DI只绑定v1 projector。F8 acceptance可在`EvidenceModule`以internal `ACCEPTED_COMPLETE_REAL_LOCATE_SHADOW_ORCHESTRATOR_V2`唯一登记已装配ready façade，但token不export且service/projector/MCP/CLI没有consumer/DI edge；不能注册MCP/CLI v2 transport。reachability test必须证明`McpStdioHost`、debug CLI和`RepositoryEvidenceService.locate()`无schema-v2 output edge。
- F3/F2/F7各自 acceptance证明其真实base owner fragment；F5证明trusted trace；F6证明aggregator/双owner/status direct seam但不证明mount；F8统一证明capability owner、four-prerequisite admission、F2两段、F6 aggregation、F1C complete-envelope mount/finalization及v1 no-cutover。`implemented owner seam`与`mounted complete envelope`是独立gate，不得把future F8行为计入F6 acceptance。
- F8 exact owner独占internal DI token、accepted orchestrator interface/attempt/accessor、zero-argument factory与七个private wrapper；outer factory调用F2 stage factory及F1C finalizer/composer factory各一次。source wrapper原样传opaque prerequisite token，materialization pure delegate；aggregation wrapper是F2 core accessor唯一runtime caller，把F6 exact `backend/requestOutcome/statusV2`提交F1C registrar；owner-finalization只调用`finalize(aggregation,execution)`，不得读取old input envelope。`EvidenceModule`只登记一个non-exported provider。F9 success projector只注入ready interface，不得import factory、acquisition symbols、prerequisite inspector、registrars或任一stage owner。

### Raw、corpus 与 public resource budgets

| 边界 | 上限 |
|---|---:|
| normalized terms | 16 项；单项 128 bytes；累计 1024 bytes |
| confirmed / candidates / total evidence | 20 / 20 / 40 |
| raw file / path segments | 4096 bytes / 128 segments |
| raw symbol / excerpt | 2048 bytes / 16 KiB |
| unsafe public materialization source compact JSON | 4 MiB |
| sensitive corpus | 128 entries；累计 32 KiB；单项 8–512 bytes |
| public term / file / symbol / excerpt | 128 / 2048 / 2048 / 2048 bytes |
| serialized public result JSON | 1 MiB |

预算依据：request 最大只允许 20 confirmed + 20 candidates；source收纳全部可能携带未受信字符串的normalized terms与40条raw evidence drafts，未转义payload约低于1 MiB，4 MiB cap为JSON escaping与private source metadata留余量；后续snapshot/backend/request-outcome/scope/capability只允许strict bounded enums、booleans与safe integers，不能引入新的任意字符串。40 条各三个 2 KiB public location fields 的未转义上界约 240 KiB，1 MiB public cap 为 escaping、coverage 和 provenance 留余量。F1B 必须用最大结构 fixture验证source与最终public估算；如果fixture超出，只能通过roadmap update调整，不能在实现中静默放宽。

约束顺序：

1. F2 real source stage在preflight前只验证F3/F2 opaque owner tokens、execution与source container/array identity descriptor，不得读取`length`或任一element；第一项element-aware操作是F1B shallow count/type gate，使N+1在getter/iterator调用0时失败，再做raw field/segment与bounded compact guard并在4MiB+1短路。只有全部preflight通过后才允许deep `UnsafePublicMaterializationSourceV2Schema`、逐项ranking pairing或corpus扫描。F1C base只有neutral opaque port/registrar，不得提前import或伪造该real stage；不得先构建corpus或物化无界JSON再比较4MiB。
2. F1只从exact trusted source内部构建corpus；API不接受`SensitiveCorpusV2`参数。corpus只收集满足传播资格的token；超过条目数或累计bytes时fail closed为固定safe `INTERNAL_ERROR`，不得截断、删项、用空corpus或跨execution corpus继续。
3. redaction span一次materialize后，在F1 core/contribution冻结前重新检查public field UTF-8 bytes；public term上限与raw normalized term相同，均为128 bytes。超限term/symbol/excerpt使用`[REDACTED:BINARY_OR_OVERSIZED_CONTENT]`与精确metadata；超限file使用`[REDACTED_PATH]`、`resolvable=false`并使F1 contribution的`locationRedacted=true`。
4. F6聚合完成后，F1C composer只合并已经通过public-field budgets的materialized fields与bounded owner facts并分配ID/ordinal；不得再次替换字段。public strict parse完成后，compact序列化结果不得超过1MiB。超限返回固定safe `INTERNAL_ERROR`，error不包含原始大小、字段或内容。
5. byte budget 统一使用 `Buffer.byteLength(value, 'utf8')`；UTF-16 length、字符数和“单个非空白 token”都不是等价计量。
6. 每个预算必须有 N/N+1、multi-byte Unicode 和 array count mutation owner；corpus还必须有caller传空、删项、clone、cross-execution/source-proof swap owner；`"x ".repeat(200_000)` 必须被判为 oversized，不能因单 token 短而通过。

## 5. Internal identity 与 public ID

内部允许：

```text
discoveryKey = hash(raw relative file + lines + raw excerpt)
```

它只用于同一请求内 merge、classification 和 confirmed/candidate mutual exclusion，不得写入 public result、coverage、diagnostic、snapshot 或测试 artifact，也不得参与任何会改变 public membership、数组顺序、预算或 ordinal ID 的比较。

公共 ID 在完成 pre-ID 公共安全排序后按 response 顺序生成：

```text
evidence:v2:0001
evidence:v2:0002
...
```

规则：

1. confirmed 与 candidate 共用连续序列；先按 confirmed 最终顺序，再按 candidate 最终顺序。
2. ID 只在当前 response 内唯一。
3. 相同结构化请求、已读文件 snapshot 和 backend facts 产生相同顺序与 ID。
4. 查询、预算、仓库内容或 evidence 集合改变时，ID 可以改变。
5. 客户端不得把 v2 ID 用作跨请求数据库主键。
6. Git object ID、raw content hash 和绝对路径不得作为 public ID、snapshot 或 tie-break 的公共表示。

### Pre-ID public-safe ranking key

`public-safe file/symbol`专指 F1A `SensitiveValuePolicyV2` 提供的
`PublicSafeRankingKeyV2`，不是最终 response-wide corpus materialization 的回读结果。
该 key 必须在 expanded discovery cap、读取前 `maxFiles` 选择、任何 evidence
budget、数组顺序或 ID 分配之前产生，并满足：

1. 它复用正式 local detector、Unicode/control 处理、POSIX segment 解析和传播资格常量，不维护第二套 matcher。
2. 对任意满足冻结 8–512 UTF-8 bytes 约束的合法 corpus entry，若该 entry
   可能在最终 materialization 中隐藏 `file` segment 或 `symbol` text，则对应原始
   code units 不得出现在 ranking key。实现必须以可执行 superset mutation 证明这一点，
   不能只枚举当前 fixture 中的几个 secret。
3. `symbol` 的原始 UTF-8 bytes 达到 8 时允许整体投影为固定 token；`file` 任一
   POSIX segment 达到 8 UTF-8 bytes或 local detector 命中时允许整体投影为
   `[REDACTED_PATH]`。因此 key 可以比最终展示更保守，但绝不能更少隐藏。
4. F3 暴露给 F2 的 expanded discovery candidate 只含 opaque hit/file refs、
   `querySeedKeys/matchedAnchorKeys`、lines/source 与该 safe key；raw
   file/symbol/matchedText 只能留在 F3 private resolver 中。expanded cap 与
   `maxFiles` selector 都只能读取这个 view。origin keys 只判断某 candidate
   是否属于某 anchor，不进入 selector 的排序或等价类 key；selector key 精确为
   `safe file + lines + safe symbol + canonical source enum order`。
5. opaque canonical file identity 必须是无可枚举/可序列化 payload 的同次
   execution object token。canonical/discovery strings 可以存在于 F3 private
   cache、internal records 与 trust proof，但 opaque token→metadata 映射及所有
   identity-bearing structures 必须留在 F3 private trust domain；F2 只能用 object
   identity/`sameFile` 判断 membership，不能读取 branded string、排序、记录或输出
   identity。
6. 任一会影响 membership 的 safe-key 等价类必须原子处理：若同一等价类的全部
   distinct opaque files/records 能装入对应内部 cap 或 public budget，则全部进入
   下一阶段；若不能，则整组不选并记录真实 incomplete/budget fact。禁止以 backend
   arrival order、raw tuple、canonical path、`discoveryKey` 或 hash 从等价类中挑一个。
7. F2 最终 ordering key 是结构化只读值，不是 delimiter join、`JSON.stringify`
   或其他自由字符串编码；字段精确为 priority、safe file、line start/end、safe
   symbol、canonical class/role/reason/operation/source enum vectors。比较器按上述字段
   逐项比较：priority 数值 descending，其余 scalar 按code-point/enum ascending，
   vector 先逐元素ascending、再比较长度ascending；matched anchor keys、
   regular-term count、raw request value 与 private identity 都不属于 ordering key。
   若两个 distinct stable record 的完整结构化 ordering key 仍相同，二者都标记为
   `selection-ambiguous` 并从 retained arrays 排除；这不是 dedupe，必须进入
   budget/completeness truth。private ranking proof必须保留每个collision record的
   pre-exclusion priority、ordering key与matched anchor keys，以及collision→anchor relation；
   删除、替换或cross-execution relation必须fail closed，避免把本应为`BUDGET_EXCEEDED`的
   anchor误报为`NOT_FOUND`。只有同一个 opaque record ref 的重复 observation 可以
   在 F3 合并。delimiter、多字节与 vector-boundary mutation 必须证明结构比较不会
   把不同 component tuples 合并。
8. F2 对该 key 只执行一次 rank/budget/order。F1 materializer与F1C composer必须保留 F2 顺序，
   response-wide corpus 只 materialize 字段与 metadata，不得重排、替换 retained
   evidence 或重新决定 budget；这样避免“先选结果才能建 corpus、先有 corpus 才能选结果”的循环。
9. raw file、raw symbol、raw matchedText、canonical path、absolute path、
   `discoveryKey` 与 content/Git hash 均不得
   参与 comparator、bucket 排序或 ordinal ID。相同结构化请求、snapshot facts 与
   backend facts必须得到相同保守 key 和最终顺序。

## 6. 确定性排序、锚点满足与预算

内部 `MatchPriority` 固定为：

| Tier | 命中 |
|---:|---|
| 100 | exact file anchor 的 verified location |
| 96 | exact symbol anchor definition/execution-site |
| 95 | exact route anchor definition/execution-site |
| 94 | exact table anchor definition/value-mapping |
| 92 | exact term anchor 的 verified literal location |
| 88 | symbol anchor reference candidate |
| 87 | route/table anchor 的 exact verified candidate |
| 80 | 非上述 anchor 的 CodeGraph structured hit |
| 70 | 多个 regular term 在同一 verified location 命中 |
| 60 | 单个 regular literal term |
| 40 | secondary backend candidate |

这些数值是内部顺序常量，不是 confidence。

### 锚点满足谓词

| kind | `confirmed` | `candidate` | `none` |
|---|---|---|---|
| file | exact file 中存在 retained verified evidence | 不使用 | 未发现或被预算移除 |
| symbol | exact symbol 的 definition/execution retained | 只有 reference/相关 candidate retained | 无 retained verified match |
| table | exact table definition/mapping retained | 只有 literal/reference candidate retained | 无 retained verified match |
| route | exact route definition/execution retained | 只有 literal/reference candidate retained | 无 retained verified match |
| term | exact normalized term 的 semantic confirmed retained | 只有 verified literal candidate retained | 无 retained verified match |

`unsatisfiedAnchors` 只记录未达到 `confirmed` 的锚点；candidate satisfaction 必须显式标为 `candidate`，不能冒充 fully satisfied。

### 预算算法

1. anchors 先规范化为`{value,comparisonValue,termCase}`：`value`保留首次exact normalized
   display/backend值；`comparisonValue`在case-insensitive时使用
   `value.toLocaleLowerCase('und')`，其余模式保持`value`。去重结构key为
   `kind-byte + case-byte + utf8-byte-length + comparisonValue bytes`，保留首次
   `requestIndex`与`value`；因此insensitive `Foo/foo`只保留首个`Foo`，保持现有
   legacy/backend deep-exact。
2. F3 先把 expanded hits 投影为 public-safe candidate view，并在任何 expanded cap
   前按 safe ordering key 分组；等价类按上一节原子处理。F2 不接收 raw hit tuple。
3. `maxFiles` 阶段每个 anchor 最多预留一个 opaque file ref；同一 ref 可满足多个
   anchor。origin 只过滤 candidate membership；候选按 safe file、lines、safe
   symbol 与 canonical source enum order 排序；若 distinct file
   refs 的完整 selector key 相同，则该等价类只有在剩余 file capacity 可容纳全组时
   才全部预留，否则整组 `budget-deferred`，不得 raw tie-break。
4. anchors 数量不超过 `maxFiles` 时，anchor 输入排列不改变最终集合；超过时按调用方请求顺序决定哪些 anchor 获得预留，这是唯一有意的 anchor-permutation 差异，并通过 coverage 报告其余 `BUDGET_EXCEEDED`。
5. 读取前的 `DiscoveryHitSelector` 只负责 safe candidate 的 anchor/file reservation，不产生最终 tier、satisfaction 或 public budget，也不能解析 opaque refs 取得 raw locator。
6. selector 产出绑定 exact safe pool、canonical anchor keys、selected locator refs、
   per-anchor `reserved|no-hit|budget-deferred` reservations、files-truncated 与
   safe-collision facts 的冻结 selection draft。F3 必须在任何 reader 调用前验证
   refs/membership 并通过 typed opaque `SafeDiscoverySelectionProofV2` 把 exact draft
   绑定到同次 `DiscoveryTrackingTicketV2`；clone、篡改 reservation、cross-pool、
   cross-ticket 或 untracked ref 在观察 file outcomes/records 前拒绝。
7. verification、classification、candidate expansion 完成后先执行 final snapshot check，并按 F3 private canonical file 一次性 purge 变化/消失/不可读/identity 失败文件的全部 records。
8. `EvidenceRanker` 只消费 purge 后的稳定 records，并携带 exact
   `SafeDiscoverySelectionProofV2`；`anchorCompleteness(anchorKey, proof)` 只能从该
   proof 绑定的 backend completeness、safe collision、selector reservation、
   pre-ranking truncation 与 tracked file outcomes 派生，caller 不能提交布尔完整性。
9. 未占用预算的 records 按完整 public-safe ordering key 稳定排序。distinct record key collision 按上一节整组排除，`discoveryKey` 永不破平局。
10. confirmed 与 candidate 分开执行跨文件 round-robin；每轮每个 opaque file token bucket 各取一个，文件内保持完整 public-safe ordering key 顺序；opaque token 只判断成员关系，不决定 bucket/head 的字典序。
11. 一个 anchor 的额外 records 在预留一条后回到普通 round-robin，不得独占容量。
12. purge 后从剩余稳定集合重新计算 retained set、unsatisfied anchor ledger 与所有 evidence limits；变化文件不占预算，不进行第二次文件读取或 post-ID refill。公共 ID 只在该最终数组上分配。
13. backend records 可在 private merge 阶段使用 canonical discovery tuple 合并重复 observation；在任何 cap/selection 前必须转换为 safe candidate view，因此 backend 返回排列与 raw tuple 不能改变 public membership。
14. regular terms 先按 normalized value/case 去重并稳定排序，因此非 anchor term 输入排列不改变结果。

## 7. CoverageReport v2

```ts
type SearchBackendId = 'codegraph' | 'ripgrep';

type BackendReasonCode =
  | 'CODEGRAPH_INDEX_MISSING'
  | 'CODEGRAPH_UNAVAILABLE'
  | 'CODEGRAPH_NO_RESULT'
  | 'RIPGREP_UNAVAILABLE'
  | 'RIPGREP_NO_RESULT'
  | 'BACKEND_PROCESS_FAILED'
  | 'BACKEND_ABORTED';

interface BackendAttemptV2 {
  readonly backend: SearchBackendId;
  readonly status: 'used' | 'unavailable' | 'failed';
  readonly completion: 'complete' | 'incomplete';
  readonly termination:
    | 'none'
    | 'timeout'
    | 'output-limit'
    | 'early-stop'
    | 'aborted'
    | 'process-error';
  readonly reasonCode?: BackendReasonCode;
  readonly hitCount: number;
}

type IndexState = 'available' | 'missing' | 'unavailable' | 'error' | 'unknown';
type IndexFreshness = 'not-applicable' | 'unknown' | 'possibly-stale';

type LimitReasonCode =
  | 'MAX_FILES_REACHED'
  | 'MAX_CONFIRMED_REACHED'
  | 'MAX_CANDIDATES_REACHED'
  | 'MAX_FILE_BYTES_REACHED'
  | 'MAX_EXCERPT_BYTES_REACHED'
  | 'MAX_BACKEND_HITS_REACHED'
  | 'TIMEOUT_REACHED';

type CoverageDegradationCode =
  | 'SNAPSHOT_CHANGED'
  | 'SEMANTIC_LANGUAGE_UNSUPPORTED'
  | 'BACKEND_EARLY_STOPPED'
  | 'PROCESS_OUTPUT_LIMIT_REACHED'
  | 'LOCATION_REDACTED';

type ExclusionReasonCode =
  | 'NEGATIVE_TERM_MATCH'
  | 'OUTSIDE_LAYER_HINT'
  | 'DUPLICATE_LOCATION'
  | 'UNVERIFIED_FILE_CONTENT'
  | 'SNAPSHOT_CHANGED';

interface UnsatisfiedAnchor {
  readonly requestIndex: number;
  readonly kind: AnchorKind;
  readonly satisfaction: 'candidate' | 'none';
  readonly reason: 'BUDGET_EXCEEDED' | 'NOT_FOUND' | 'UNVERIFIED';
}

interface CoverageReportV2 {
  readonly backends: readonly BackendAttemptV2[];
  readonly strategyComplete: boolean;
  readonly fallbackChecked: boolean;
  readonly indexState: IndexState;
  readonly indexFreshness: IndexFreshness;
  readonly limitsReached: readonly LimitReasonCode[];
  readonly degradations: readonly CoverageDegradationCode[];
  readonly exclusionSummary: Readonly<
    Partial<Record<ExclusionReasonCode, number>>
  >;
  readonly abortSource: 'none' | 'caller' | 'deadline';
  readonly unsatisfiedAnchors: readonly UnsatisfiedAnchor[];
  readonly snapshot: RepositorySnapshotCoverage;
  readonly scope: ScopeCoverage;
  readonly capabilities: CapabilityCoverage;
}
```

Coverage 数值均为非负整数。`backends` 每个 backend 最多一条并保持真实启动顺序；`limitsReached`、`degradations` 和 scope arrays 去重并按契约枚举顺序输出；`unsatisfiedAnchors.requestIndex` 对去重后的 anchor 唯一且升序。`exclusionSummary` 省略零值 key。

### Backend outcome ownership

F5 只负责把 process/backend 行为归一为内部 outcome；F6 才把 outcomes 聚合为 public attempt ledger、strategy、abort/status、limits 与 nextActions：

```ts
interface BackendExecutionOutcomeV2 {
  readonly backend: SearchBackendId;
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

F5 不写 request-level `abortSource/status/limitsReached/degradations/strategyComplete/nextActions`；F6 不重新解释 stdout chunks、exit code 或进程清理，只通过execution-bound trace accessor消费expanded-v2 logical outcomes投影出的public-neutral telemetry。该telemetry逐union member移除internal `retainedHits`与`selectionEligibility`，shape exact等于`BackendAttemptV2`；selection eligibility只经F5/F3 trusted handoff/proof决定candidate membership，不进入public owner fragment。同一次adapter orchestration中仅为legacy compatibility启动的plan/group/fallback刻意只进入private legacy audit，不进入expanded-v2 trace，即使物理process真实启动；shared或expanded-related work才按首次expanded start ordinal归约。`retainedHits` 对 incomplete attempt 只是有界内部诊断/计数事实，不是 evidence 候选；只有 `selectionEligibility='complete-safe-set'` 的完整 backend/fallback outcome 才能进入 F3 safe candidate pool 与 F2 selector。因此 F6 依赖 F5，二者不能作为并行 owner 修改同一 coverage mapper。

### Backend attempt ledger

- 只记录真正启动过或执行了 availability probe 且与expanded-v2 lane相关的logical backend；legacy-only物理工作不属于该ledger。caller 在任何 expanded-related backend 启动前取消时，`backends=[]`。
- `status=used, completion=complete` 必须搭配 `termination=none`。
- `status=used, completion=incomplete` 必须搭配非 `none` termination。
- `unavailable`/`failed` 必须为 `completion=incomplete`，并提供 `reasonCode`。
- `selectionEligibility='complete-safe-set'` 只允许
  `status=used, completion=complete, termination=none`；所有 incomplete、
  unavailable、failed、timeout、output-limit、early-stop、aborted 与 process-error
  outcomes 必须为 `telemetry-only`。
- backend process timeout 记录在该 attempt 的 `termination=timeout`；如果完整 fallback 满足策略，顶层 `abortSource` 仍为 `none`，结果可为 `ok`/`no_result`。
- 只有 caller 或整体 deadline 可以设置顶层 `abortSource`；二者采用 first-writer-wins。
- `fallbackChecked` 只表示 fallback decision branch 已被求值；`strategyComplete` 表示当前 search strategy 已完整执行或由完整 fallback 等价满足。
- stdout/stderr 达到 N+1 byte 时记录 `PROCESS_OUTPUT_LIMIT_REACHED`；backend hit 达到 `maxHits` 时记录 `MAX_BACKEND_HITS_REACHED`。两者都可在 `retainedHits`
  保留上限内已解析 hits 作为 bounded attempt telemetry，但普通 ripgrep raw prefix
  无法证明 safe-key 等价类完整，绝不能进入 discovery/evidence selection。后续完整
  fallback 可以产出独立的 `complete-safe-set` outcome。

### Termination mapping

下表的 degradation/strategy 值是最终聚合语义：如果后续完整 fallback 对同一 search plan 提供等价完整覆盖，attempt 和 limit fact 保留，但 provisional degradation 可以省略，最终 `strategyComplete=true`。

| event | attempt status / completion / termination | reason | limit | final degradation | strategyComplete（无完整 fallback） |
|---|---|---|---|---|---:|
| backend 达到 `maxHits` 后主动停止 | `used / incomplete / early-stop` | 无 | `MAX_BACKEND_HITS_REACHED` | `BACKEND_EARLY_STOPPED` | false |
| stdout/stderr 接受 N+1 byte | `used / incomplete / output-limit` | 无 | 无 | `PROCESS_OUTPUT_LIMIT_REACHED` | false |
| backend 自身 process timeout | `failed / incomplete / timeout` | `BACKEND_PROCESS_FAILED` | 无 | 无；attempt 已表达缺口 | false |
| caller abort 正在运行的 backend | `used / incomplete / aborted` | `BACKEND_ABORTED` | 无 | 无 | false；顶层 `abortSource=caller` |
| request deadline 终止 backend | `used / incomplete / aborted` | `BACKEND_ABORTED` | `TIMEOUT_REACHED` | 无 | false；顶层 `abortSource=deadline` |
| non-zero exit / malformed stream | `failed / incomplete / process-error` | `BACKEND_PROCESS_FAILED` | 无 | 无；attempt 已表达缺口 | false |
| availability probe 失败 | `unavailable / incomplete / none` | 对应 `*_UNAVAILABLE` 或 `*_INDEX_MISSING` | 无 | 无；attempt 已表达缺口 | false |

### Snapshot

```ts
interface RepositorySnapshotCoverage {
  readonly gitState: 'clean' | 'dirty' | 'not-git' | 'unknown';
  readonly consistency: 'stable' | 'changed' | 'unknown';
  readonly filesChecked: number;
  readonly discardedEvidenceCount: number;
}
```

- 不返回 branch、remote、Git object ID、内容 hash、绝对路径或由它们派生的 revision。
- final snapshot check 发生在 verification、classification 和 candidate expansion 之后、最终 evidence ranking/budget/anchor ledger 与 PublicResultAssembler ID 分配之前。
- request context 记录 final check 中变化的 canonical files。
- 来自变化、消失、不可读、identity/stat 复核失败文件的 confirmed 和 candidate 全部丢弃，不降级、不重读；只有 final check 成功且未变化文件的 verified evidence 可以保留。
- purge 完成后 ranker 只从剩余稳定 records 重新计算最终集合、limits 与 anchor satisfaction；不会从变化文件补位，也不会在 ID 分配后 refill/reorder。
- `discardedEvidenceCount` 只返回被丢弃条数，不返回变化路径。
- `filesChecked` 是 final check 成功的唯一 canonical file 数量，不是尝试数量。
- `consistency=stable` 当且仅当至少读取一个文件，且所有已读文件 final check 成功并未变化。
- 任一已读文件变化、消失、不可读或复核失败时：`consistency=changed`、`SNAPSHOT_CHANGED` degradation、`exclusionSummary.SNAPSHOT_CHANGED` 计数和至少 `partial`。stale/unverified evidence 不得穿过公共边界。
- `consistency=unknown` 只允许本次请求没有读取任何文件、`filesChecked=0`、`discardedEvidenceCount=0` 且没有 retained evidence 的场景。
- non-Git 或 Git probe 失败不阻断文件核验；`gitState` 只描述环境，不参与 evidence truth。

### Scope

```ts
interface ScopeCoverage {
  readonly requested: readonly RepoLayer[];
  readonly effective: readonly RepoLayer[];
  readonly policyVersion: 'repo-scope-v1';
  readonly unmatchedLayers: readonly RepoLayer[];
}
```

默认 `repo-scope-v1`：

backend source adapter先完成path safety并只把native separator归一为`/`，签发trusted POSIX relative locator；caller file anchor中的反斜杠仍按input contract拒绝。RepositoryScopePolicy只对trusted locator做Unicode-independent ASCII lowercase比较，不再处理separator，也不对文件名做NFKC/trim。

1. `test` 拥有最高优先级：任一 segment 命中 `test|tests|__tests__|spec|specs|fixtures|__fixtures__|e2e`，或 basename 包含 `.spec.` / `.test.`。
2. `docs` 次高：任一 segment 命中 `doc|docs|documentation|examples`，或 extension 为 `.md|.mdx|.rst|.adoc`。因此根目录 `README.md` 也是 docs。
3. 然后匹配最长明确 prefix：`apps/web|packages/frontend|src/client` → `client`；`apps/api|packages/backend|src/server` → `server`；`db|database|migrations` → `db`；`.config|config|configs` → `config`。
4. 再从 repository root 向 basename 方向扫描普通 segment，采用第一个匹配：`client|frontend|web|ui` → `client`；`server|backend|api` → `server`；`db|database|migration|migrations` → `db`；`config|configs` → `config`。例如 `packages/foo/server/client/a.ts` → `server`。
5. 无匹配 → `unknown`。完整冲突顺序固定为 `test > docs > longest explicit prefix > leftmost ordinary segment > unknown`。
6. `layers` 省略或为空时：`requested=[]`，`effective=[client,server,db,config,unknown]`，默认排除 test/docs。
7. 显式 layers 时，`effective` 为去重后的请求值；显式 test/docs 可以检索，但即使命中也只能成为 candidate。
8. `unmatchedLayers` 是 effective 中没有任何通过 path safety、negative-term 和 discovery merge 后 eligible verified record 的 layer。
9. confirmed、candidate、anchor reservation 和 unsupported-language count 必须使用同一个 scope decision。
10. public-safe等价组只有在所有locator均included且confirmation mode相同时才整体进入expanded selector；任一excluded或`allowed/candidate-only`混合时整组fail closed，不占file/evidence budget并把关联anchor标为incomplete。outside计数只统计组内真实excluded的private unique discovery identities；included但因group ambiguity丢弃的identity只记collision/incomplete。
11. expanded-v2在anchor/`maxFiles`前执行上述group fold；legacy-v1保留旧selector/budget顺序并在post-read classification复用同一scope observation。
12. policy contract fixtures至少覆盖`src/server/a.spec.ts`、`packages/api/__fixtures__/a.ts`、根目录`README.md`、`packages/foo/server/client/a.ts`，以及backend Windows separator source path经safe-locator factory后的等价结果。

### Language capability

```ts
interface CapabilityCoverage {
  readonly textSearch: 'supported-text-files';
  readonly semanticClassification:
    readonly ['typescript', 'javascript', 'sql'];
  readonly unsupportedLanguageHits: number;
}
```

- TypeScript：`.ts | .tsx | .mts | .cts`。
- JavaScript：`.js | .jsx | .mjs | .cjs`。
- SQL：`.sql`。
- 其他受 bounded text reader 支持的文本文件使用 fallback adapter，只能产生带 `UNSUPPORTED_LANGUAGE_LITERAL` 的 verified literal candidate 和 `SUPPORTED_LANGUAGE_ADAPTER_REQUIRED` promotion requirement。
- `unsupportedLanguageHits` 在 path safety、scope inclusion、negative-term filter 和 discovery merge/dedupe 之后、evidence budget 之前，统计有效 scope 内需要 fallback adapter 的唯一 verified discovery records。
- 被 scope 或 negative terms 排除的 hit 不计数；计数大于零即增加 `SEMANTIC_LANGUAGE_UNSUPPORTED`，即使相关 candidate 后续因预算未保留。

## 8. Status、degradation 与 anchor truth table

状态按以下优先级唯一决定：

| 优先级 | 条件 | status |
|---:|---|---|
| 1 | `abortSource=caller` | `cancelled` |
| 2 | `abortSource=deadline` | `timeout` |
| 3 | 无 retained evidence、`strategyComplete=false`，且所有已启动/可用策略均 unavailable 或 failed | `backend_unavailable` |
| 4 | `strategyComplete=false`，或存在 degradation，或 incomplete attempt 未被完整 fallback 等价满足，或存在 `BUDGET_EXCEEDED/UNVERIFIED` anchor | `partial` |
| 5 | strategy complete、无上述缺口且存在 retained evidence | `ok` |
| 6 | strategy complete、无上述缺口且 retained evidence 为零 | `no_result` |

补充规则：

- `NOT_FOUND` 只允许在该 anchor 的相关策略完整执行后出现；它本身不表示 coverage incomplete。完整搜索无任何 evidence 时可与 `no_result` 共存，部分 anchor 找到时可与 `ok` 共存。
- candidate satisfaction 使用 `UNVERIFIED`，所以结果至少 `partial`。
- caller/deadline 可以保留取消前已经完成 snapshot final check 的稳定 verified evidence，但 status 分别为 `cancelled` / `timeout`。
- `TIMEOUT_REACHED` 只允许与 `abortSource=deadline` 共存；caller cancellation 不得伪造 timeout limit。
- local backend timeout/failure 后，如果完整 fallback 等价满足 search strategy，则 attempt 保留真实失败事实，但不单独强制 `partial`。
- `degradations` 非空在优先级 1/2/3 未命中时强制 `partial`。

### Finalization latch

- `LocateAbortCoordinator` 在 latch 关闭前继续对 caller/deadline first-writer-wins。
- latch 位于最后一次异步 final snapshot check 返回之后、同步的 purge → rank/budget/anchor ledger → unsafe materialization source 4MiB gate → internal corpus guard/single span materialization → public-field budgets → F1 core/contribution freeze → request-outcome aggregation → facts freeze/materialized composer/ID → public schema/1MiB guard之前。关闭时一次性读取并冻结 `abortSource`，随后立即清除 deadline timer；上述同步链不得await或执行I/O。
- latch 关闭时已存在 caller/deadline source，分别返回 `cancelled/timeout`；关闭后才到达的 abort 不改变当前 response，当前 response 按已冻结 facts 完成。
- snapshot check 前已经完成且最终复核稳定的 records 可以在 cancelled/timeout response 中保留；snapshot 未完成的 records 不能因 abort 绕过 final check。

### NextAction truth table

| 条件 | 必须加入 |
|---|---|
| `status=no_result` | `ADD_TERM`, `ADD_SYMBOL_ANCHOR` |
| retained candidates 非空（任意 success status） | `CONFIRM_CANDIDATE` |
| `indexState=missing` 且 `status=no_result|backend_unavailable` | `INITIALIZE_CODEGRAPH` |
| `status=partial` 且 `MAX_FILES_REACHED|MAX_CONFIRMED_REACHED|MAX_CANDIDATES_REACHED` 中至少一项对应 request limit 仍低于 maximum | `RETRY_WITH_HIGHER_LIMIT` |
| `status=timeout`, `abortSource=deadline`, `timeoutMs` 低于 maximum | `RETRY_WITH_HIGHER_LIMIT` |
| `status=cancelled` | 不因取消添加 retry；仅允许上述 candidate action |

没有命中时返回空数组；actions 去重后按 enum order。`MAX_BACKEND_HITS_REACHED`、process output cap 和 backend timeout 不是调用方可调 request limit，不能单独触发 higher-limit action。

## 9. Public tool error

```ts
type RepoNavToolErrorV2 =
  | Readonly<{
      code: 'INVALID_INPUT';
      message: 'Locate request does not match the required schema.';
      recoverable: true;
      suggestedAction?: 'ADD_TERM';
    }>
  | Readonly<{
      code: 'INVALID_REPOSITORY';
      message: 'Repository root is invalid or unavailable.';
      recoverable: true;
    }>
  | Readonly<{
      code: 'PATH_OUTSIDE_ROOT';
      message: 'Repository path is outside the configured root.';
      recoverable: false;
    }>
  | Readonly<{
      code: 'INTERNAL_ERROR';
      message: 'Repository evidence request failed.';
      recoverable: false;
    }>;
```

- error object 同样使用 strict schema 和 allowlist composer；不传递 exception message、stack、path 或 backend stderr。
- 只有 `INVALID_INPUT` 可以携带 `suggestedAction=ADD_TERM`。
- MCP 对 `ok:false` 设置 `isError=true`；structuredContent 与 JSON text fallback 是同一个 `LocateResultV2`。
- debug CLI locate 在 stdout 输出同一个 `LocateResultV2` JSON，并用既有非零 exit code 表示 tool error；stderr 只允许 scrubbed diagnostic。

## 10. 输出出口与边界

v2 cutover 后，以下 **locate** 出口复用同一 `PublicResultAssemblerV2`：

- `RepositoryEvidenceService.locate()` 最终 success/error return；
- MCP locate structuredContent；
- MCP locate JSON text fallback；
- debug CLI locate JSON；
- locate docs smoke 与 Golden public projection。

`probe`、`golden`、help 等 CLI 不是 LocateResult，不纳入 v2 assembler；它们继续使用各自版本化 schema 和 DiagnosticScrubber。F1 forbidden scan 覆盖 locate public result、locate stdout/MCP text 和相关 stderr，不笼统要求所有 CLI 文本共享 locate schema。
