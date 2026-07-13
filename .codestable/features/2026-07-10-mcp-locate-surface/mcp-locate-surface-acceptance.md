---
doc_type: feature-acceptance
feature: 2026-07-10-mcp-locate-surface
status: passed
accepted: 2026-07-13
round: 1
---

# mcp-locate-surface 验收报告

> 阶段：阶段 3（验收闭环）
> 关联方案：`mcp-locate-surface-design.md`

## 1. 接口契约核对

- [x] `McpStdioHost` 以 connect-once、close-idempotent 方式承载 SDK stdio transport，并向 lifecycle owner 提供无 raw detail 的 transport error notification。
- [x] low-level MCP server 声明 tools capability，`tools/list` 只返回只读 `repo_nav_locate`；unknown tool 在 input parse 和 service 调用前停在 SDK JSON-RPC boundary。
- [x] envelope-valid arguments 由共享 `LocateRequestSchema` 手工 parse；输入和输出 public schema 均是 JSON Schema 2020-12 exact object surface。
- [x] `LocateToolOutputSchema` 是 success/error 的共享 runtime boundary；同一 serializer 生成 `structuredContent` 与 JSON text，解析后严格等值。
- [x] `McpModule` 只依赖 `REPOSITORY_EVIDENCE_SERVICE`；handler 未直连 reader/backend/classifier，application context 未启动 HTTP listener。
- [x] 真实路径为 compiled `dist/main.js` → lifecycle handlers/coordinator → `McpStdioHost` → low-level SDK handlers → `RepositoryEvidenceService.locate()`。

## 2. 行为与决策核对

- [x] SDK v1.29.0 由 lockfile 固定；使用 low-level list/call handlers，避免高层 helper 抢先校验并破坏 typed `INVALID_INPUT` 边界。
- [x] JSON Schema 精确表达 tuple arity、closed items 与 unique arrays；NFKC、UTF-8 byte budget、line order和跨集合 refine 以 public comment/description 说明并继续由 runtime Zod执行。
- [x] `ok/no_result/partial/backend_unavailable/timeout` 均为 `isError=false`；`INVALID_INPUT/INVALID_REPOSITORY/PATH_OUTSIDE_ROOT/INTERNAL_ERROR` 均为 `isError=true`。
- [x] tool message/stdout 不含 stack、绝对敏感路径、raw stderr 或临时日志；protocol-invalid envelope 不伪装为 RepoNav structured error。
- [x] SDK request、host shutdown与deadline signals合并进入 `LocateExecutionContext.signal`；already-aborted、late cancellation与EOF in-flight均能触发协作清理。
- [x] handlers在首次await前安装；startup shutdown intent可排队，connect-close race、重复shutdown和server/host/app close faults均保持幂等、best-effort清理。
- [x] 正常EOF/受支持signal返回exit 0；fatal transport/parser/bootstrap failure返回exit 1且不污染stdout。
- [x] 拔除沙盘：移除`src/mcp/`、`src/main.ts`、MCP module挂载、bin配置及MCP tests即可回到F3内部evidence service；F1-F3 contracts/engine不依赖MCP lifecycle实现。

## 3. 验收场景核对

- [x] S1 schema surface：initialize/list/单工具/unknown guard通过；runtime Zod、独立Ajv2020和committed snapshot交叉验证public schema。
- [x] S2 output mapping：success与5种recoverable status经真实stdio调用均保持`isError=false`与structured/text parity。
- [x] S3 errors：schema-invalid、3类service error、internal error与protocol-invalid分别落入正确typed或SDK boundary，且无敏感细节泄露。
- [x] S4 lifecycle：pre/late cancellation、EOF in-flight、compiled package bin、malformed frame、connect-close race和close fault matrix全部通过。
- [x] 独立代码审查Round 4通过，blocking/important均为none；QA Round 1通过，failed/blocked均为none。
- [x] Fresh QA：build/typecheck、84/84 unit、25 active Golden加1 conditional skip、30/30 MCP全部exit 0。
- [x] Evidence/DoD/Gate：scope、6条core commands、evidence pack和lifecycle artifacts均passed。
- [x] Feature性质：functional；真实MCP client和compiled raw stdio child均穿过production protocol/process路径，不以静态schema检查代替核心行为。

## 4. 术语一致性

- MCP Surface、Output parity、McpStdioHost、typed tool error与SDK protocol error在design、实现、review、QA和architecture中含义一致。
- `repo_nav_locate` 是唯一工具名；input/output均复用F1 schema v1，没有第二套application contract。
- `structuredContent`与text不是两套输出逻辑；它们由一个自校验serializer产生并按解析值比较。
- Lifecycle ownership固定为host跟踪调用、coordinator编排host/application cleanup、entrypoint只负责进程事件与exit code。

## 5. 领域影响盘点

- [x] `.codestable/architecture/system-repo-nav-foundation.md` 已更新为F4当前状态：stdio MCP surface、low-level handlers、public/runtime schema边界、output parity、cancellation和shutdown ownership。
- [x] `ARCHITECTURE.md` 索引摘要已同步，不再声明系统只有F3 evidence engine。
- [x] 结构性选择候选：low-level handler加手工Zod typed errors、JSON Schema public/runtime双边界、fail-closed transport error及host/application shutdown ownership。符合ADR/constraint候选价值，但acceptance不代写ADR；建议roadmap收尾通过`cs-decide/cs-domain`归档。

## 6. requirement delta / clarification 回写

- Requirement `source-of-truth-evidence` 保持 `draft`，本轮不修改requirement文件。
- F4已提供本地stdio MCP用户入口，但candidate sibling、CodeGraph fallback、完整output guardrails与发布级回归仍未闭环，因此尚未完成requirement的完整用户故事或capability boundary。
- 不存在owner-approved req delta；完整MVP通过并获得approved delta后再升级状态与登记`implemented_by`。

## 7. roadmap 回写

- [x] `repo-nav-mvp-items.yaml` 的F4状态由`in-progress`改为`done`。
- [x] roadmap主文档F4状态同步为`done`。
- [x] `goal-state.yaml` F4为`accepted`，`current_feature_index: 4`，整体保持`ready-to-dispatch`。
- [x] `goal-features/mcp-locate-surface.md` frontmatter为`accepted`。

## 8. attention.md 候选盘点

- 候选：SDK bundled/default Ajv不能替代JSON Schema 2020-12发布契约验证；本项目用独立Ajv2020与runtime Zod反例交叉验证。
- 候选：`npm run test:mcp`故意先fresh build，再通过package bin运行`dist/main.js`，避免lifecycle测试命中过期编译产物。
- 本轮不直接改attention；roadmap文档整理阶段由owner决定是否通过`cs-note/cs-keep`收录。

## 9. 遗留

- SDK `server.onerror`当前统一fail-closed exit 1；未来若需容忍peer protocol anomaly，必须重新区分fatal transport failure与可恢复diagnostic。
- Shutdown依赖evidence service/child协作响应AbortSignal；非协作实现可能使tracked settle无期限等待，当前没有进程内hard deadline。
- Windows按design使用stdin EOF；真实SIGINT/SIGTERM exit 0由非Windows CI复核。
- Early-cancel test允许请求未进入server并使用固定100ms窗口；production already-aborted逻辑已有覆盖，后续可用可控transport ack提升测试确定性。
- NFKC、UTF-8 byte budget、line order和跨集合refine无法完全映射到标准JSON Schema，public comment加runtime Zod是当前明确边界。

## 10. 最终审计

- 验证来源：passed独立review Round 4、passed QA Round 1、evidence pack、DoD results、scope gate和lifecycle report。
- 聚合命令：build/typecheck、84 unit、25 active Golden及30 MCP全部exit 0；compiled bin真实完成initialize/list/call。
- 场景复核：re-verified 14 / trust-prior-verify 0。
- 交付物：MCP server/host/module/schema/serializer/shutdown coordinator、production entry/bin、fixtures/harness/tests、review/QA/evidence、architecture与roadmap/goal-state均真实落盘。
- 完整工作区：tracked/untracked/staged由feature scope盘点；staged none；无feature外dirty归因。
- 清洁度：scope gate passed；`git diff --check`无whitespace error；production marker/import boundary扫描通过。
- 知识出口：architecture已机械回填；ADR/attention/learning候选已登记但未越权写入长期决策或用户记忆。
- 结论：通过；C1-C14全部`passed`，无核心residual gap。
