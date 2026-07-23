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

### T7：大结果集导致内存/延迟拒绝服务

**路径**：高频 term 让 `rg --json` 超过 8 MiB；完整缓冲后丢弃所有有效 hits。

**控制**：

- JSON line streaming parser。
- 正确处理跨 chunk UTF-8 和尾部不完整行。
- 达到 `maxHits` 主动、安全终止。
- byte cap 使用 N+1 语义。
- 保留已解析 hits，并明确 `complete=false`。

### T8：排序和预算隐藏显式目标

**路径**：大量字典序更早文件挤出 file/symbol anchor。

**控制**：

- backend 和 engine 两层 anchor reservation。
- 离散相关性层级。
- 未满足 anchor 进入 coverage。
- 跨文件 round-robin。
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
- coverage 顶层 `abortSource` 只区分 caller/deadline/none；backend timeout、output limit、early stop 和 abort 记录在对应 attempt 的 termination。
- backend 局部失败后若完整 fallback 满足策略，可以返回完整状态，但 attempt ledger 必须保留失败事实。
- 不新增顶层 cancelled status，避免无必要 schema 分叉。

### T11：stale CodeGraph 或脏工作区制造伪确定性

**路径**：index 与 filesystem 不一致；请求期间 repository 被修改。

**控制**：

- public evidence 继续要求 current filesystem verification。
- coverage 保留 index freshness。
- `gitState` 只是粗粒度 coverage，不作为 evidence truth；公共输出不返回 Git revision/object ID。
- snapshot、unsupported language、backend early-stop 和 process output limit 使用机器可读 degradation codes。
- 确定性承诺限定为同一结构化输入、backend facts 与已读文件 snapshot。

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
6. 超大 ripgrep 输出保留 bounded partial evidence。
7. snapshot mutation 会丢弃变化文件 evidence；unsupported language、unsatisfied anchor、request abort 和 backend termination 都能被 coverage 观察。
8. Windows/Linux/macOS process cleanup 和 path boundary 均为 blocking checks。
9. 威胁模型、实现、Golden、MCP parity 和 package artifact 的 forbidden corpus 使用同一组 secret、control-character、bidi 和 malicious-path 测试值。

## 6. Residual Risk

- Redaction 是规则系统，不保证识别所有业务私密字段；文档必须继续说明不要把 RepoNav 输出发送到不受信任的远程系统。
- response-local ID 会降低跨请求引用便利性；在没有真实用例前接受这一取舍。
- Git state 只能粗略表达仓库状态；已读文件之外的并发变化可能不影响当前 evidence，也不会被逐文件检测。
- text search 仍会读取不支持语言文件；安全保证来自 bounded reader 和公共 redaction，不来自语义 adapter。
