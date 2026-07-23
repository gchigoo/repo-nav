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

1. F1 在当前 v1 public surface 后建立 internal/public assembler、字段级脱敏、response-local ID 和严格 v2 schema 的测试 seam；生产 MCP/CLI 仍返回 v1。
2. F2/F3/F5/F6/F7/F8 分别提供真实 ranking、snapshot、backend、abort、scope 和 capability facts。
3. F9 在所有字段 owner 的 contract tests 通过后，原子地把 `RepositoryEvidenceService.locate()`、MCP locate 和 debug CLI locate 切换为 v2。
4. 切换前不允许给缺失事实填空数组、`unknown` 或假 completeness；切换后不再双写 v1。

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

### Redaction 与 ID cross-field invariant

以下规则由 strict schema 的 `superRefine` 和 assembler unit tests 同时拥有：

1. `redaction.fields` 非空，每个 field 最多一次，固定顺序为 `file, symbol, excerpt`；每项 `reasonCodes` 非空、唯一并按枚举顺序。
2. `resolvable=false` 当且仅当 `file='[REDACTED_PATH]'` 且 metadata 包含 `field=file`；`resolvable=true` 时禁止 file redaction metadata。仓库中真实名为 `[REDACTED_PATH]` 的安全路径以 `resolvable=true` 且无 metadata 表示。
3. location redaction metadata 必须与 assembler 本次实际替换的字段集合精确相等；没有替换时整个 `redaction` 字段省略。symbol/excerpt 的 literal placeholder 无 metadata 时仍按源码文本处理。
4. `PublicSearchTerm.redaction` 只在公共 value 实际被替换时出现；其 `reasonCodes` 非空、唯一、canonical order。
5. 令 `N=confirmed.length+candidates.length`；按 confirmed 后 candidate 的数组顺序，ID 必须严格等于 `evidence:v2:${String(index + 1).padStart(4, '0')}`，形成无空洞的 `0001..N` 连续序列。
6. `nextActions` 唯一并按 `NextActionCode` 的契约枚举顺序输出。

## 5. Internal identity 与 public ID

内部允许：

```text
discoveryKey = hash(raw relative file + lines + raw excerpt)
```

它只用于同一请求内 merge、classification 和 confirmed/candidate mutual exclusion，不得写入 public result、coverage、diagnostic、snapshot 或测试 artifact。

公共 ID 在完成公共安全排序后按 response 顺序生成：

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

1. anchors 先按 `(kind, normalized value)` 去重，但保留首次 `requestIndex`。
2. `maxFiles` 阶段每个 anchor 最多预留一个文件；同一文件可满足多个 anchor。
3. anchors 数量不超过 `maxFiles` 时，anchor 输入排列不改变最终集合；超过时按调用方请求顺序决定哪些 anchor 获得预留，这是唯一有意的 anchor-permutation 差异，并通过 coverage 报告其余 `BUDGET_EXCEEDED`。
4. 未占用预算的 hits 按 tier，再按 public-safe file、lines、symbol、source 稳定排序；完全相同的 public-safe key 才允许 internal discovery key 作为最终 tie-break，且不输出该 key。
5. confirmed 与 candidate 分开执行跨文件 round-robin；每轮每个文件各取一个，文件内保持 tier、line、symbol、source 顺序。
6. 一个 anchor 的额外 hits 在预留一条后回到普通 round-robin，不得独占容量。
7. backend records 在 merge 前按 canonical discovery tuple 排序，因此 backend 返回排列不改变结果。
8. regular terms 先按 normalized value/case 去重并稳定排序，因此非 anchor term 输入排列不改变结果。

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

### Backend attempt ledger

- 只记录真正启动过或执行了 availability probe 的 backend；caller 在任何 backend 启动前取消时，`backends=[]`。
- `status=used, completion=complete` 必须搭配 `termination=none`。
- `status=used, completion=incomplete` 必须搭配非 `none` termination。
- `unavailable`/`failed` 必须为 `completion=incomplete`，并提供 `reasonCode`。
- backend process timeout 记录在该 attempt 的 `termination=timeout`；如果完整 fallback 满足策略，顶层 `abortSource` 仍为 `none`，结果可为 `ok`/`no_result`。
- 只有 caller 或整体 deadline 可以设置顶层 `abortSource`；二者采用 first-writer-wins。
- `fallbackChecked` 只表示 fallback decision branch 已被求值；`strategyComplete` 表示当前 search strategy 已完整执行或由完整 fallback 等价满足。
- stdout/stderr 达到 N+1 byte 时记录 `PROCESS_OUTPUT_LIMIT_REACHED`；backend hit 达到 `maxHits` 时记录 `MAX_BACKEND_HITS_REACHED`。两者都保留上限内已解析 hits。

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
- final snapshot check 发生在所有 classification/ranking 完成之后、PublicResultAssembler 分配公共 ID 之前。
- request context 记录 final check 中变化的 canonical files。
- 来自变化、消失、不可读、identity/stat 复核失败文件的 confirmed 和 candidate 全部丢弃，不降级、不重读；只有 final check 成功且未变化文件的 verified evidence 可以保留。
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

所有 path policy 比较先只把 separator 归一为 `/` 并按 Unicode-independent ASCII lowercase 比较；不对文件名做 NFKC/trim。

1. `test` 拥有最高优先级：任一 segment 命中 `test|tests|__tests__|spec|specs|fixtures|__fixtures__|e2e`，或 basename 包含 `.spec.` / `.test.`。
2. `docs` 次高：任一 segment 命中 `doc|docs|documentation|examples`，或 extension 为 `.md|.mdx|.rst|.adoc`。因此根目录 `README.md` 也是 docs。
3. 然后匹配最长明确 prefix：`apps/web|packages/frontend|src/client` → `client`；`apps/api|packages/backend|src/server` → `server`；`db|database|migrations` → `db`；`.config|config|configs` → `config`。
4. 再从 repository root 向 basename 方向扫描普通 segment，采用第一个匹配：`client|frontend|web|ui` → `client`；`server|backend|api` → `server`；`db|database|migration|migrations` → `db`；`config|configs` → `config`。例如 `packages/foo/server/client/a.ts` → `server`。
5. 无匹配 → `unknown`。完整冲突顺序固定为 `test > docs > longest explicit prefix > leftmost ordinary segment > unknown`。
6. `layers` 省略或为空时：`requested=[]`，`effective=[client,server,db,config,unknown]`，默认排除 test/docs。
7. 显式 layers 时，`effective` 为去重后的请求值；显式 test/docs 可以检索，但即使命中也只能成为 candidate。
8. `unmatchedLayers` 是 effective 中没有任何通过 path safety、negative-term 和 discovery merge 后 eligible verified record 的 layer。
9. confirmed、candidate、anchor reservation 和 unsupported-language count 必须使用同一个 scope decision。
10. policy contract fixtures 至少覆盖 `src/server/a.spec.ts`、`packages/api/__fixtures__/a.ts`、根目录 `README.md`、`packages/foo/server/client/a.ts` 及 Windows separator 输入。

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
| 1 | `abortSource=caller|deadline` | `timeout` |
| 2 | 无 retained evidence、`strategyComplete=false`，且所有已启动/可用策略均 unavailable 或 failed | `backend_unavailable` |
| 3 | `strategyComplete=false`，或存在 degradation，或 incomplete attempt 未被完整 fallback 等价满足，或存在 `BUDGET_EXCEEDED/UNVERIFIED` anchor | `partial` |
| 4 | strategy complete、无上述缺口且存在 retained evidence | `ok` |
| 5 | strategy complete、无上述缺口且 retained evidence 为零 | `no_result` |

补充规则：

- `NOT_FOUND` 只允许在该 anchor 的相关策略完整执行后出现；它本身不表示 coverage incomplete。完整搜索无任何 evidence 时可与 `no_result` 共存，部分 anchor 找到时可与 `ok` 共存。
- candidate satisfaction 使用 `UNVERIFIED`，所以结果至少 `partial`。
- caller/deadline 可以保留取消前已经完成 snapshot final check 的稳定 verified evidence，但 status 仍为 `timeout`。
- local backend timeout/failure 后，如果完整 fallback 等价满足 search strategy，则 attempt 保留真实失败事实，但不单独强制 `partial`。
- `degradations` 非空在优先级 1/2 未命中时强制 `partial`。

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

- error object 同样使用 strict schema 和 allowlist assembler；不传递 exception message、stack、path 或 backend stderr。
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
