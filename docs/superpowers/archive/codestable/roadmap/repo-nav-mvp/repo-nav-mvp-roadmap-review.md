---
doc_type: roadmap-review
roadmap: repo-nav-mvp
status: passed
reviewed: 2026-07-10
round: 4
---

# repo-nav-mvp roadmap 审查报告

## 1. Scope And Inputs

- Roadmap: `.codestable/roadmap/repo-nav-mvp/repo-nav-mvp-roadmap.md`
  - SHA-256: `EBE63460BC41136D4ED8B4B59FCCBBB13B8C02ED3C265D1B09D79EC752CBA919`
- Items: `.codestable/roadmap/repo-nav-mvp/repo-nav-mvp-items.yaml`
  - SHA-256: `3212BC040616B7E4D344EC22F24FB257DB1B13E48C3CF8CFE7A0C04FFAD16D62`
- Related docs:
  - `.codestable/requirements/VISION.md`
  - `.codestable/requirements/source-of-truth-evidence.md`
  - `.codestable/brainstorms/repo-nav-foundation/brainstorm.md`
  - `.codestable/brainstorms/repo-nav-foundation/approval-report.md`
  - `.codestable/brainstorms/repo-nav-foundation/migration-index.md`
- Code facts checked: none。当前没有 package、实现代码或 Git baseline。
- Environment facts checked: Node.js 24.15.0、npm 11.12.1、ripgrep 15.1.0、CodeGraph 1.1.6、Git 2.55.0；CodeGraph CLI 当前提供 `status --json` 与 `query --json`。
- Current documentation checked: MCP TypeScript SDK v1.29.0 的 tool schema、structuredContent/text fallback、isError、stdio transport；NestJS 11.1.16 standalone application context 与 close lifecycle。

### Independent Review

- Status: completed
- Detection: native-agent
- Provider / agent: `/root/repo_nav_roadmap_review`
- Raw output: 四轮独立只读审查；Round 1/2/3 均为 `changes-requested`，Round 4 为 `passed`。独立 agent 未修改文件。
- Merge policy: 主 agent 对每条 finding 做了文档、items、schema、DAG 和环境事实核验；修订后每轮重新读取并复审。
- Gate effect: none。最终 round 已完成且无 blocking/important finding。
- Residual independence risk: 使用当前宿主原生同类 agent，没有异构 provider 保证；通过独立上下文、只读边界和多轮重新复读降低偏差。

## 2. Roadmap Summary

- Goal completion signal: 外部 Agent 可通过本地 stdio MCP 调用 `repo_nav_locate`，获得当前代码事实、独立 candidate、完整 coverage，并在缺索引、失败、超时、路径越界和敏感内容场景保持可核验语义。
- Module split: Evidence Engine、Repository Backends、MCP Surface、Verification Kit 四块；engine 为 deep module，MCP 是刻意保持 shallow 的 transport adapter。
- Interface contracts: MCP success/error、LocateResult、backend/reader ports、Nest runtime DI、golden success/error/lifecycle、classification truth table、状态转换、ID/merge/sort 均已定义。
- Items: 9 条；唯一最小闭环 `candidate-evidence-policy`；F2 安全前置，F3 后 MCP/candidate 与 CodeGraph 分支并行，F7 汇合，F8/F9 收口回归与可用性。
- Dependency shape: DAG，已通过 YAML 和自定义环检测；无未知依赖、自指或循环。

## 3. Findings

### blocking

none

### important

none

### nit

none

### suggestion

none。此前关于 confirmed 门槛、状态转换、DI tokens、DAG、安全顺序、输入语义、ID、feature 原子性、reader cancellation、Golden error contract 等建议均已吸收进最终候选稿。

### learning

- 当前文件系统核验只证明 excerpt 新鲜度，不等于证明该位置决定行为；discovery、filesystem verification、classification 必须分层。
- Nest standalone application context 可用于 stdio MCP，但 TypeScript interface 必须配 runtime token，多 backend 需要显式有序 factory assembly。
- 最小闭环是受控 fixture 的价值证明，不等于可发布里程碑；状态 guardrails 和完整回归必须单独完成。

### praise

- 范围和明确不做能阻止 session、trace、impact、AST、git history 与业务判断偷渡进 MVP。
- Classification truth table 同时给出 direct mapping positive 与 DTO/test/docs 等 false-confirmation 反例。
- Success/error/lifecycle 使用不同的判别契约，没有把 MCP tool error 硬塞进 EvidencePack。
- 路径/process 安全先于可调用闭环，CodeGraph 风险通过并行分支提前验证。

## 4. User Review Focus

- 用户需要重点拍板：
  1. `repo_nav_locate` 要求宿主 Agent 同时提供 `question` 与非空 literal `terms`，RepoNav 不自己理解自由文本。
  2. confirmed 的门槛以 classification truth table 为准；同名 DTO、definition、test、docs 不能因排名高而 confirmed。
  3. F5 只代表受控 fixture 的最小闭环；完成 F7/F8 后才是可发布 MVP 候选。
  4. MVP 使用 NestJS standalone + stdio，不启动 HTTP/Fastify listener；远程 HTTP 另开 roadmap。
  5. Roadmap 有 9 条 item；F3 后允许 MCP/candidate 与 CodeGraph 分支并行。
  6. 进入 feature 实现前需要 owner 初始化 Git、确定默认分支并建立 baseline commit。
- 后续 feature-design 需要重点复核：
  - MCP/Nest/MCP SDK 当时的稳定版本与 lockfile。
  - CodeGraph runtime capability 与 JSON compatibility。
  - Windows child process 终止、symlink/realpath 和 stdio cleanliness。
  - literal case semantics、byte budgets、classification reason codes、redaction 和 public ID invariant。
- 不能靠 roadmap review 完全确认的点：
  - 大型真实 monorepo 的召回、噪声与延迟。
  - CodeGraph 不同版本的 JSON shape 和 case-search 行为。
  - 规划中的 npm commands、性能阈值和 shutdown 时间在代码落地后的真实结果。

## 5. Evidence Confidence Ledger

| Check | Verdict | Evidence Class | Basis | Follow-up |
|---|---|---|---|---|
| Granularity Gate | pass | E+C | roadmap 范围、明确不做、9 个 item 与已批准 requirement/brainstorm | 用户确认优先级 |
| Goal Coverage Matrix | pass | E | 每个 core signal 均有 item、命令入口和 evidence type | feature acceptance 产出真实命令证据 |
| DAG and minimal loop | pass | E | items.yaml 已解析，无环；安全前置、分支和汇合点明确 | none |
| Interface contract usability | pass | E+C | success/error/lifecycle、case semantics、状态转换、classification、ID 均闭合 | feature-design 按最新官方 SDK 复核语法 |
| Module interface depth | pass | E+C | Nest tokens、backend assembly、reader/process/MCP seams 与 deletion test 清楚 | 实现后 acceptance 回填 architecture |

Summary: E=6, C=4, H=0, H-only core checks=none。

## 6. Residual Risk

- 当前仍是 no-code、no-package、no-Git 状态，所有接口和命令只有规划证据，尚无运行证据。
- CodeGraph runtime compatibility、Windows process cleanup 和 MCP/Nest lifecycle 必须在对应 feature acceptance 中实测。
- 大型合成 fixture 只能提供 MVP 性能信号，不能代表真实 monorepo。
- MCP SDK 与 NestJS 版本必须在 feature-design 时重新核验并由 lockfile 固定。

## 7. Verdict

- Status: passed
- Next: 交给用户整体 review；用户造成 roadmap/items 实质变化后，必须重新校验 YAML 并重跑 `cs-roadmap-review`。

## 8. Activation Record

- 2026-07-10：owner 批准 roadmap。
- 激活动作仅把主文档 `status: draft` 改为 `status: active`；正文接口、模块、Goal Coverage 与 items.yaml 均未改变，因此不重跑 review。
- Active roadmap SHA-256: `FF902C5BB2F599ACBF9364B1F13766F3818928752451FAACDE960B4FB5D4C6CC`
- Items SHA-256 仍为：`3212BC040616B7E4D344EC22F24FB257DB1B13E48C3CF8CFE7A0C04FFAD16D62`
