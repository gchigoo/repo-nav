---
doc_type: compatibility-matrix
roadmap: repo-nav-public-beta
status: draft
created: 2026-07-23
---

# EvidencePack v1 到 v2 兼容矩阵

## 1. 迁移原则与 cutover

v2 是一次明确的不兼容升级。RepoNav 当前 package 仍是 `0.x` 且未开放 npm 稳定安装，因此选择在 public-beta 前一次性修正安全与语义边界，不长期维护会继续暴露绝对路径和内容派生 ID 的 v1 双写模式。

- F1 只建立 v2 assembler、安全策略和 strict schema 的 internal/test seam；production locate 仍返回 v1。
- F2/F3/F5/F6/F7/F8 提供真实 v2 field facts。
- F9 在全部 owner tests 通过后原子切换 service、MCP locate 和 debug CLI locate；不存在“部分字段为 v2、部分字段用占位值”的过渡输出。

## 2. 输入变化

| v1 | v2 | 兼容性 | 调用方动作 |
|---|---|---|---|
| `question` 必填 | `question` 可选、且不参与执行 | 放宽 | 可以继续发送；不要期待它改变结果 |
| `repoPath` NFKC + trim | 保留文件系统原值，不 NFKC/trim | 行为变化 | 绝对路径和相对当前进程 cwd 的路径仍可用；不要依赖静默纠错 |
| file anchor 会把 `\` 转成 `/` | file anchor 必须是 repository-relative POSIX locator，反斜杠直接拒绝 | **breaking** | Windows 调用方也必须发送 `/` |
| file anchor NFKC + trim | 保留 Unicode 和首尾字符，只做 byte/path boundary 校验 | 行为变化 | 不依赖规范化后的另一个文件名 |
| `terms` / `negativeTerms` NFKC + trim | 保持不变 | 兼容 | 无 |
| symbol/table/route/term anchor | 保持语义文本归一化 | 兼容 | 无 |

## 3. 输出变化

| v1 | v2 | 兼容性/原因 |
|---|---|---|
| `schemaVersion: "1.0"` | `schemaVersion: "2.0"` | breaking；显式声明升级 |
| `repositoryRoot: absolutePath` | `repositoryRef: "local-repository"` | breaking；阻断用户名、客户名和本机目录泄露 |
| `normalizedTerms[].value` 原样 | 敏感 value 被替换并带 redaction | breaking；搜索词本身可能是 token、邮箱或连接串 |
| location redaction 只表示 excerpt | file/symbol/excerpt 分字段 metadata；敏感 file 使用 `[REDACTED_PATH]` + `resolvable=false` | breaking；被隐藏路径不再宣称可导航 |
| `evidence:v1:{sha256}` | `evidence:v2:NNNN` | breaking；删除 raw excerpt hash 侧信道 |
| ID 可跨相同内容请求稳定 | ID 只保证当前 response 唯一 | breaking；客户端不得跨请求持久化 |
| class/role/file/line/id 固定排序 | anchor tier + 分 class round-robin + stable tie-break | breaking；数组顺序改变 |
| coverage 仅含 backend/index/limit/exclusion | 新增 strategy、degradation、anchor、snapshot、scope、capability 字段 | breaking；所有新增字段都是 required |
| backend `status/reasonCode/hitCount` | 增加 `completion` 和 `termination`；去掉未启动的 `skipped` ledger entry | breaking；只记录真实 attempt |
| 无 abort source | request-level `abortSource: none|caller|deadline` | breaking；backend timeout 在 attempt 中表达 |
| 无 snapshot | `gitState/consistency/filesChecked/discardedEvidenceCount` | breaking；不返回 Git revision/object ID |
| status 由旧 helper 决定 | 使用固定 precedence truth table | 行为变化；degradation/incomplete/unsatisfied anchor 可导致 partial |
| anchor 无 satisfaction ledger | `unsatisfiedAnchors` 带 `candidate|none` 和原因 | breaking |
| scope policy 隐式 | `requested/effective/policyVersion/unmatchedLayers` | breaking |
| language capability 隐式 | 明确 TS/JS/SQL extensions 与 unsupported count | breaking |

## 4. Error 与 transport

tool error code 保留四个值，但 v2 将完整 safe error union 纳入 strict contract：

| code | message | recoverable | suggestedAction |
|---|---|---:|---|
| `INVALID_INPUT` | `Locate request does not match the required schema.` | true | 仅可选 `ADD_TERM` |
| `INVALID_REPOSITORY` | `Repository root is invalid or unavailable.` | true | 无 |
| `PATH_OUTSIDE_ROOT` | `Repository path is outside the configured root.` | false | 无 |
| `INTERNAL_ERROR` | `Repository evidence request failed.` | false | 无 |

- MCP `ok:false` 必须 `isError=true`；structuredContent 与 JSON text fallback 等值。
- debug CLI locate stdout 使用同一个 `LocateResultV2`，tool error 使用非零 exit code；stderr 只输出 scrubbed diagnostic。
- probe、golden、help 不迁移为 LocateResultV2，它们继续使用各自 schema。

## 5. 保持不变

- `repo_nav_locate` 仍是唯一 MCP 工具。
- 工具仍为只读、local stdio、MCP-first。
- confirmed 与 candidate 严格分离且 ID 不跨两类重复。
- candidate 携带 promotion requirements。
- `no_result` 仍不能证明代码中不存在目标。
- CodeGraph 仍为 primary，ripgrep 仍为显式 fallback。
- 当前文件系统核验仍是 public evidence 的必要条件。
- 顶层 status 名称和四个 tool error code 不扩张。

## 6. 客户端迁移步骤

1. 把 output schema 判定从 `1.0` 改为 `2.0`，并拒绝未知 required 字段缺失。
2. 删除对 `repositoryRoot` 和任何 Git revision 的读取；展示使用 `repositoryRef` 与调用方自己的仓库上下文。
3. 把 evidence ID 当作单次 response 内引用，不跨请求缓存。
4. 不依赖 file 字典序；按数组顺序消费已完成 ranking 的结果。
5. `location.resolvable=false` 时不构造本地跳转。
6. 读取 `strategyComplete`、`unsatisfiedAnchors`、`degradations`、`snapshot`、`scope`、`abortSource` 和 `capabilities`。
7. 区分 request abort 与 backend attempt termination。
8. 允许公共 term、file、symbol、excerpt 包含有 metadata 的 redaction placeholder。
9. CLI automation 不再强制提供 `--question`，但继续强制至少一个 `--term`；file anchor 改用 `/`。
10. 对 MCP error 同时检查 `ok:false` 和 `isError=true`。

## 7. Snapshot 与 Golden 迁移

- v1 expected snapshots 保留在 Git history，不原地伪装为同一 contract。
- v2 snapshots 使用新的 schema owner inventory。
- final file check 失败、文件消失或不可读与内容变化同样 fail-closed：受影响 evidence 被丢弃且结果至少 partial；`snapshot.consistency=unknown` 不得与 retained evidence 共存。
- 更新 snapshot 前必须先通过：
  - sensitive input/secret/root/Git-object/internal-hash forbidden scan；
  - all-anchor priority 与 satisfaction truth table；
  - term/backend/anchor permutation stability；
  - response ID uniqueness；
  - snapshot-changed evidence discard；
  - structured/text/debug-locate parity；
  - safe error union parity。
- 不能以“新 snapshot 已生成”作为行为正确证据。

## 8. 发布标记

- 开发阶段：package `0.1.x`、production schema v1；v2 只存在于 internal/test seam。
- F9 cutover 后：package candidate `0.2.0-beta.1`、production schema v2。
- 是否去掉 `private: true`、选择何种 license、是否发布 npm/GitHub release，分别由 owner 在 release gate 单独批准。
