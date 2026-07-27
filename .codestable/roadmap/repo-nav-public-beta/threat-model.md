---
doc_type: threat-model
roadmap: repo-nav-public-beta
status: draft
created: 2026-07-23
---

# RepoNav public-beta 威胁模型

## 1. 保护目标

- 目标仓库中的 secret、连接串、个人数据和未公开业务标识。
- 本机用户名、客户/项目目录、Git remote 等环境身份。
- evidence 的完整性：confirmed 不能来自未核验、变化中或不支持的语义推断。
- MCP stdout 协议纯净性和 stderr diagnostic 安全。
- 本机进程、文件描述符、CPU、内存与超时预算。
- target repository 只读边界。

## 2. 信任边界

| 边界 | 信任假设 |
|---|---|
| MCP/CLI request | 不可信；可能包含路径逃逸、超长文本、secret 搜索词或取消竞态 |
| 目标仓库 | 内容不可信；可能包含二进制、大文件、恶意 symlink、prompt injection、ANSI/bidi/control characters、换行路径、特殊 Unicode、超长 token |
| CodeGraph/ripgrep | 外部本地进程；stdout/stderr、exit、版本、完整性和延迟均不可信 |
| RepositoryReader | 安全内核；负责 realpath、handle、文件类型、byte/UTF-8 和 snapshot 核验 |
| Evidence Engine internal model | 可持有 raw data，但不得直接序列化 |
| PublicResultAssembler | 唯一公共成功输出边界 |
| MCP stdout/stderr | stdout 仅协议 frame；stderr 只允许 scrubbed diagnostic |

## 3. 主要威胁与控制

### T1：secret 从非 excerpt 字段泄露

**路径**：`normalizedTerms`、repository root、relative file、symbol、coverage detail、diagnostic。

**控制**：

- 公共 DTO allowlist，不使用 raw object spread 穿越边界。
- 所有公共字符串经过字段适配的 redaction；敏感路径整体替换为不可解析 placeholder，不承诺部分脱敏路径仍可导航。
- detector 只在原始字段上产 span，合并后一次性 materialize；placeholder 和中间输出不再进入 matcher。
- span 使用原始 JavaScript string 的 0-based UTF-16 half-open 坐标且不得切开 surrogate pair；重叠/相邻合并、CRLF 扩展与 Unicode fixtures 固定，避免不同 detector 对同一文本产生错位替换。
- response-wide corpus 只接受满足传播资格的 token，使用 reason set、完整文本边界或完整 path segment 匹配，并受条目/累计 byte budget 约束。
- absolute repository root 永不进入 public DTO。
- structuredContent、text、CLI、stdout、stderr 共用 forbidden corpus scan。

### T2：Evidence ID 形成低熵内容 oracle

**路径**：攻击者构造已知 file/line/excerpt 候选，对公开 SHA-256 ID 离线枚举。

**控制**：

- internal discovery key 永不公开。
- public ID 使用 response-local deterministic ordinal。
- public schema 明确禁止跨请求持久化 ID。
- Git object ID、branch、remote 和内容 hash 同样不得作为 public snapshot identity。

### T3：敏感键分词漏检

**路径**：`MY_API_KEY`、`DATABASE_PASSWORD`、`serviceAuthToken` 因 `\b`/underscore/camel 语义漏过。

**控制**：

- 解析赋值左侧完整标识符。
- 按 underscore、hyphen、camelCase、PascalCase 分段。
- 用敏感 token 组合策略识别 `api+key`、`auth+token`、`client+secret`。
- 对 malformed quote 和 oversized token 保持 fail-closed。

### T4：路径逃逸、替换和 TOCTOU

**路径**：绝对 file anchor、`..`、symlink/reparse、open 前后 target 替换、请求期间文件变化。

**控制**：

- repo root 与 target 均 realpath。
- 只通过打开后的 handle 读取，并检查 regular file。
- cache 绑定 canonical path 与 `dev/ino/size/mtimeMs`。
- PublicResultAssembler 分配 ID 前复核已读文件；变化、消失、不可读或 identity/stat 复核失败文件的 confirmed/candidate 全部丢弃，只有复核成功且稳定文件的 evidence 能保留。
- 任一复核失败都使用 fail-closed `snapshot.consistency=changed`、记录 discard count 和 degradation，结果至少 partial；`unknown` 仅用于零已读文件且零 evidence；不重读受影响文件。
- cache 只在单次请求存在。

### T5：外部命令注入或环境泄露

**路径**：terms/anchors 进入 shell、继承敏感 env、stdout/stderr 注入协议。

**控制**：

- 保持 `shell: false` 和 argv array。
- 继续使用显式环境 allowlist。
- stdout 捕获不写父进程 stdout。
- stderr 仅通过 DiagnosticScrubber。

### T6：仓库文本诱导下游 Agent 或污染终端

**路径**：excerpt/path/symbol 中的 prompt injection、ESC/ANSI、C0、bidi control、换行文件名或与 `[REDACTED]` 相同的字面量。

**控制**：

- 契约明确 repository 内容是 untrusted evidence，不是指令。
- 公共字符串转义或替换 C0、ESC/ANSI 和 bidi controls；path 中的换行不得原样进入 stdout/stderr。
- replacement 必须带字段级 redaction metadata；无 metadata 的 `[REDACTED]` 只是普通源码文本。
- structured/text/CLI parity tests 使用同一 control-character corpus。

### T7：大结果集或公共组装导致内存/延迟拒绝服务

**路径**：高频 term 让 `rg --json` 超过 8 MiB；raw evidence/corpus 数量无界；大量短 token 构成超长 excerpt；组装后 response 超过合理传输大小。

**控制**：

- shallow raw count/type guard 与 abort-at-N+1 byte counter 在 deep Zod traversal、完整 JSON stringify 和 corpus 扫描前生效；不能为了检查 4 MiB cap 先物化无界 JSON。
- corpus 限制为 128 entries / 32 KiB；public field 在脱敏后复核，完整 JSON 限制为 1 MiB。
- corpus 或 aggregate 超限返回固定 safe `INTERNAL_ERROR`，不截断安全词典后继续输出。
- JSON line streaming parser。
- 正确处理跨 chunk UTF-8 和尾部不完整行。
- 达到 `maxHits` 主动、安全终止。
- byte cap 使用 N+1 语义。
- 保留已解析 hits，并明确 `complete=false`。

### T8：排序和预算隐藏显式目标

**路径**：大量字典序更早文件挤出 file/symbol anchor；或者raw file/symbol虽在最终响应被隐藏，仍通过数组顺序和ordinal ID泄漏字典序。

**控制**：

- expanded backend保留query seed与matched anchor identity；F3在任何expanded cap前把raw hit投影成public-safe candidate view，selector不读取raw file/symbol/matchedText，也不从reason/display猜origin。
- backend 和 engine 两层 anchor reservation；selected opaque hit/file ref通过snapshot proof解析与读取，F2不可取得raw locator。
- 离散相关性层级。
- pre-ID `PublicSafeRankingKeyV2`对任意合法corpus target做保守superset；raw file/symbol不得参与comparator。
- 未满足 anchor 进入 coverage。
- opaque file identity是无payload的同次execution object token；canonical/discovery strings与identity-bearing structures只留在F3 private trust domain，opaque token→metadata映射由private WeakMap拥有；跨文件 round-robin只用object identity判断bucket membership。
- expanded/file/evidence cap遇到distinct refs的完整public-safe key collision时整组纳入或整组排除并记incomplete/budget，禁止raw/discoveryKey/hash破平局；assembler保留ranker顺序。
- 普通ripgrep raw prefix在maxHits、output-limit、timeout、abort或process failure后无法证明safe-key等价类完整；这些retained hits只作为bounded attempt telemetry，只有完整backend/fallback safe set可进入F3/F2 evidence。
- 请求/结果 permutation regression。

### T9：不支持语言产生 false confirmed

**路径**：Python `#` 注释、Rust/Go raw string、YAML/Shell 文本被 JS/SQL classifier 当执行代码。

**控制**：

- adapter 先判语言，再允许 semantic classification。
- unsupported fallback 只能输出 verified literal candidate。
- coverage 明确列出 semantic adapter 与 unsupported hit count。
- layer policy 先识别 `.spec/.test` basename、fixture/test segments 和 docs extensions，再识别 production prefix/segment，避免受支持语言的测试文件被提升为 confirmed。

### T10：取消、deadline 和 backend timeout 混淆

**路径**：虚构 backend attempt；用户取消被解释为系统超时；backend process timeout 被解释为 caller。

**控制**：

- first-writer-wins abort coordinator 继续保留。
- 增量 attempt ledger 只记录真实 started backend。
- F5 只产生 `BackendExecutionOutcomeV2`，F6 独占 request-level ledger/status/abort/next-action 聚合，避免两个 feature 以不同规则解释同一个 process event。
- coverage 顶层 `abortSource` 只区分 caller/deadline/none；backend timeout、output limit、early stop 和 abort 记录在对应 attempt 的 termination。
- backend 局部失败后若完整 fallback 满足策略，可以返回完整状态，但 attempt ledger 必须保留失败事实。
- caller cancellation 派生顶层 `status=cancelled`；整体 deadline 才派生 `status=timeout` 和 `TIMEOUT_REACHED`。backend 局部 timeout 不改变顶层 abortSource。
- 最后一次异步 snapshot check 后关闭 finalization latch：关闭时冻结 first-writer-wins abortSource 并清 timer，关闭后的 abort 不反向改写已冻结 response。

### T11：stale CodeGraph 或脏工作区制造伪确定性

**路径**：index 与 filesystem 不一致；请求期间 repository 被修改。

**控制**：

- public evidence 继续要求 current filesystem verification。
- coverage 保留 index freshness。
- `gitState` 只是粗粒度 coverage，不作为 evidence truth；公共输出不返回 Git revision/object ID。
- snapshot、unsupported language、backend early-stop 和 process output limit 使用机器可读 degradation codes。
- 确定性承诺限定为同一结构化输入、backend facts 与已读文件 snapshot。

### T12：低熵 corpus、placeholder 与误识别造成输出放大

**路径**：恶意仓库写入 `password=a`、`token=1`、`password=R` 或日期/构建号；单字符通过任意子串传播到 term/path；已经生成的 `[REDACTED]` 被下一轮 `replaceAll` 再次改写，形成输出膨胀或大面积误脱敏。

**控制**：

- generic assignment 的 local value 始终隐藏，但只有满足 8–512 bytes、最小 distinct-code-point、非纯数字/低信息 literal 的值才能跨字段传播。
- fixed credential、connection secret、email 与经过 10–15 digit truth table 的 phone 使用独立高置信 detector；ISO date、version/build、timestamp、UUID fragment 是 blocking negative fixtures。
- corpus reasons 使用 set union；遍历顺序不能改变 provenance。
- text matcher 使用原始字段的完整 token/boundary span，path matcher只允许完整 segment；禁止 arbitrary substring。
- span 合并后一次性 materialize，placeholder/sentinel 永不重新扫描。
- 回归必须包含 `password=a`、`token=1`、`password=true`、`password=R`、`password=[`、`cat`/`src/catalog.ts`、literal placeholder + non-empty corpus 和跨字段长 secret。

### T13：no-cutover 过渡期形成双 schema 或假 coverage

**路径**：F2–F8 为了接入真实 producer 提前让 production import/call v2 assembler，或用 `unknown`、空数组和假 completeness 补齐未实现 fragments；MCP/CLI 因 wiring 差异同时暴露 v1/v2。

**控制**：

- F1C pre-stage inspector只允许`snapshot/ranking/scope/capability`四prerequisite，拒绝base预置
  `backend/request-outcome`；缺任一prerequisite时所有stage/finalizer为0。
- aggregation registrar只接受same-execution materialization及F6 trusted
  `backend/request-outcome/status`，以fresh builder exact add后两owner并冻结completion-bearing token；
  preseed/duplicate/clone/swap/cross-execution均fail closed。finalizer只消费该token，不接受或读取old
  partial envelope。
- production service 在 F9 前只绑定 `V1LocateResultProjector`；v2 shadow harness 不注册 transport，不双写 response。
- F3/F2/F7 acceptance证明base owners，F5证明trusted trace；F6只证明aggregator direct seam且
  production core-accessor/registrar importer为0；F8才证明唯一production mount。所有项仍证明v1
  Golden/MCP regression与各自admission failure。
- transport reachability gate 直接证明 MCP host、debug CLI 与 `RepositoryEvidenceService.locate()` 在 F9 前没有 schema-v2 output edge。
- F8先exact add capability形成four-prerequisite base，再由aggregation fresh-add
  backend/request-outcome并跑真实shadow Golden/forbidden scan；F9只消费accepted façade并切换projector。

## 4. 不在本威胁模型内

- 远程攻击者直接连接 RepoNav；public-beta 仍只支持本地 stdio。
- 多租户隔离、网络认证、HTTP rate limiting。
- 操作系统或当前用户账户已被完全攻陷。
- 目标仓库内容静态加密或访问控制。
- 自动判断姓名、一般标识符和所有业务数据是否敏感。
- CodeGraph/ripgrep 二进制供应链签名验证。

## 5. 安全验收门槛

1. `MY_API_KEY`、`DATABASE_PASSWORD`、`SERVICE_AUTH_TOKEN`、camelCase 变体全部覆盖。
2. term 本身为 secret/email/connection string 时，所有公共通道无原值。
3. repository root 中的用户名/客户名不出现在 public result、ID、stdout 或 stderr。
4. public ID 和 snapshot 无 raw excerpt/hash/Git object ID 派生关系。
5. N bytes 输出成功，N+1 才触发 limit。
6. 超大 ripgrep 输出保留 bounded attempt telemetry，但不完整 raw prefix 不进入 public evidence；只有完整 backend/fallback safe set 可选。
7. raw count/field/aggregate、corpus entry/aggregate、脱敏后 public field 和 1 MiB serialized response 均有 N/N+1 与 multi-byte Unicode owner。
8. 低熵 assignment 不得传播；placeholder 不得被二次处理；ISO 日期/版本/构建号不得进入 phone corpus；同值多 reason 必须稳定 union。
9. emoji、combining mark、孤立 surrogate 与 CRLF fixtures 证明 span 不切开 code point，重叠/相邻 reason union 与一次性 materialization 稳定。
10. snapshot mutation 会丢弃变化文件 evidence；unsupported language、unsatisfied anchor、caller `cancelled`、deadline `timeout` 和 backend termination 都能被 coverage 观察。
11. Windows/Linux/macOS process cleanup 和 path boundary 均为 blocking checks。
12. 威胁模型、实现、Golden、MCP parity 和 package artifact 的 forbidden corpus 使用同一组 secret、control-character、bidi 和 malicious-path 测试值。
13. F9 前真实 service 仍只输出 v1；缺 owner 的 envelope 不能生成 v2，F8 完整 shadow result 也不能从 transport 到达。

## 6. Residual Risk

- Redaction 是规则系统，不保证识别所有业务私密字段；文档必须继续说明不要把 RepoNav 输出发送到不受信任的远程系统。
- 为避免低熵 DoS，少于传播阈值的短 secret 只保证在其本地上下文被隐藏，不保证无上下文的相同短文本在其他字段被跨字段传播；固定 credential/PII detector 仍独立生效。
- response-local ID 会降低跨请求引用便利性；在没有真实用例前接受这一取舍。
- Git state 只能粗略表达仓库状态；已读文件之外的并发变化可能不影响当前 evidence，也不会被逐文件检测。
- text search 仍会读取不支持语言文件；安全保证来自 bounded reader 和公共 redaction，不来自语义 adapter。
