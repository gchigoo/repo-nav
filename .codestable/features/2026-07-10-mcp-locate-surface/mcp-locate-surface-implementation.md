---
doc_type: feature-implementation
feature: 2026-07-10-mcp-locate-surface
status: completed
---

# mcp-locate-surface 实现记录

## 动了哪些文件

- Production：`package.json` / `package-lock.json`、`src/main.ts`、`src/app/app.module.ts`、`src/contracts/evidence.ts`、`src/mcp/*.ts`、`src/index.ts`。
- Tests/testkit：`test/mcp/*.spec.ts`、`test/unit/di.spec.ts`、`testkit/contracts/mcp-*.ts`、`testkit/fixtures/mcp/*.ts`、`testkit/runners/runner-registry.ts`。
- CodeStable：F4 checklist、goal state、implementation scope、schema snapshot、lifecycle report、S2 fix note及本记录。

## 改了哪些函数 / 类型（按步骤分组）

### S1：capability / registry / schema

- `src/mcp/locate-tool-schema.ts`：新增唯一`repo_nav_locate`定义、Zod→JSON Schema snapshot与read-only/non-destructive/idempotent annotations。
- `src/mcp/repo-nav-mcp-server.ts:createRepoNavMcpServer`：新增low-level tools/list与tools/call handlers，unknown name在input parse前抛SDK InvalidParams。
- `src/mcp/mcp.module.ts:McpModule`、`src/app/app.module.ts:AppModule`：挂载`MCP_STDIO_HOST`，保持standalone application context且无HTTP listener。
- `src/contracts/evidence.ts:LocateToolOutputSchema`：为已有`LocateResultSchema`增加同一runtime output schema别名，不复制业务类型。

### S2：success / recoverable parity

- `src/mcp/locate-tool-output.ts:serializeLocateToolOutput`：所有结果先经`LocateToolOutputSchema`自校验，再从同一对象生成structuredContent与JSON text；只有`ok=false`设置`isError=true`。
- `testkit/contracts/mcp-stdio-harness.ts`、`test/mcp/tool-output-parity.spec.ts`：真实stdio child/client覆盖confirmed mapping及五种recoverable statuses。
- `testkit/contracts/mcp-tool-result.ts:parseLocateToolResultParity`：统一解析并深比较structured/text，避免测试复制第二套语义。

### S3：typed errors

- `src/mcp/mcp-stdio-host.ts:handleLocate`：正确tool name下手工`LocateRequestSchema.safeParse`；terms无效时才给`ADD_TERM`，其他schema-invalid保留无action。
- `src/mcp/locate-tool-output.ts:applySafeMessagePolicy`：保留application code/recoverable/action，按code生成固定安全message；throw/stack/absolute path/raw stderr不进入tool output。
- `test/mcp/tool-error-parity.spec.ts`：schema-invalid object、invalid repository、path outside root与thrown internal exception均通过真实stdio验证。
- `test/mcp/tool-surface.spec.ts`：non-object protocol-invalid envelope保持SDK JSON-RPC error，handler call count为0。

### S4：cancellation / lifecycle

- `src/mcp/mcp-stdio-host.ts:NodeMcpStdioHost`：connect once、idempotent same-promise close、SDK/host/deadline signal merge、tracked locate registry、server/transport/调用清理。
- `src/main.ts`：`createApplicationContext`入口与EOF、SIGINT/SIGTERM、stream/bootstrap error的唯一shutdown coordinator；host close后才`app.close()`，normal EOF/signal exit 0。
- `package.json`：新增`repo-nav-mcp -> dist/main.js` bin；lockfile root metadata同步。
- `testkit/contracts/mcp-lifecycle-harness.ts`、`test/mcp/lifecycle-contract.spec.ts`：production raw stdio initialize/list/EOF或signal，验证stdout frames、stderr、exit code和budget。
- `test/mcp/request-cancellation.spec.ts`：SDK cancellation与in-flight EOF均传播到service signal并完成child/context cleanup。

## 是否触碰到方案外的文件？

否。全部文件属于approved design的MCP adapter、bootstrap、schema、testkit、package entry与CodeStable执行状态；未改Evidence Engine、reader、backend或classifier语义。

## 是否引入方案 doc 里没有的新概念 / 抽象？

否。Application contract、Tool-invalid input、Protocol-invalid request、Output parity、McpStdioHost与shutdown reason均来自design；production文件按design要求把schema、handler/registry、serializer和lifecycle分为单一owner。

## 第一性原则 pre-pass 核对

- 外部行为：本地stdio只暴露一个`repo_nav_locate`，accurate schema/error/parity/cancellation/lifecycle可观察。
- 不可破约束：不启动HTTP；handler只依赖application service；protocol-invalid不伪装tool error；stdout只承载MCP frames；SDK固定1.29.0。
- 最小充分改动：一个McpModule、一个low-level server factory、一个host、一个serializer、一个process entry及真实stdio harness。
- 必须不写：第二工具、HTTP controller/listener、reader/backend/classifier直连、v2 SDK、第二套output DTO、stdout diagnostics均未加入。

## 代码质量反射检查自检

- schema conversion、SDK registry、output serializer与host lifecycle承担不同职责，未继续堆入单个god file。
- S3需要再次解析parity时触发copy-paste检查，提取`mcp-tool-result.ts`共享test contract；production API未变。
- 未新增4+参数业务函数、万能util、方案外重构或特殊业务分支。

## Step 证据与失败恢复

- S1 exit signal：4个capability/schema/readonly/unknown cases通过；build/typecheck通过；标记`done`。
- S2 exit signal：真实stdio confirmed mapping和`ok/no_result/partial/backend_unavailable/timeout`均isError=false且parity通过；标记`done`。前两次typecheck因SDK compatibility union与测试helper过早收窄失败，按`mcp-locate-surface-step-2-fix.md`仅改测试runtime narrowing后通过。
- S3 exit signal：三类schema-invalid object和四种typed codes通过；unsafe fixture stack/path/stderr未出现在message；protocol-invalid保持SDK error；标记`done`。
- S4 exit signal：SDK cancellation、EOF in-flight abort、production clean stdout、graceful shutdown、same-promise close通过；标记`done`。
- final audit首次全量unit仅因F3 DI test仍期望MCP token缺失而失败；把该断言更新为F4真实host/no-listener/provider override后，定向DI与全量聚合复验通过。

## 基线预检与清洁度

- 开工前`npm run build`、`npm run typecheck`通过；`npm run test:mcp -- --all`真实失败为runner不支持`--all`，改用设计支持的无参数全量命令后baseline 6/6通过，不属于代码红灯。
- 每步`git diff --check`通过；source/testkit扫描无`console.log/error`、TODO/FIXME/XXX、注释掉实现或unused import。
- 正式process diagnostics只使用固定stderr消息；fixture cancellation markers是测试协议证据，不进入production stdout。

## 实际交付物索引

- MCP host/module：`src/mcp/mcp-stdio-host.ts`、`src/mcp/mcp.module.ts`。
- Registry/schema/serializer：`src/mcp/repo-nav-mcp-server.ts`、`locate-tool-schema.ts`、`locate-tool-output.ts`。
- Process entry：`src/main.ts`、package bin metadata。
- Schema snapshot：`mcp-locate-surface-tool-schema.json`。
- Real stdio/lifecycle evidence：`mcp-locate-surface-lifecycle-report.md`、`test/mcp/*.spec.ts`、`testkit/contracts/mcp-*.ts`、`testkit/fixtures/mcp/*.ts`。
- Provider graph：`test/unit/di.spec.ts`和`tool-surface.spec.ts`共同证明host token可解析、testing override有效且context没有HTTP `listen` surface。

## 知识回写候选

- 本项目runner无`--all`参数；全量运行直接省略selection arguments。
- MCP SDK 1.29.0 low-level `Server`使protocol-invalid arguments停在SDK error boundary，而envelope-valid object可由RepoNav手工Zod parse并返回typed structured error。

## 最后一轮本地审计

- `npm run build`、`npm run typecheck`通过。
- 全量unit：84/84通过；Golden：25 active通过、1个按case选择设计skipped；MCP：21/21通过。
- production lifecycle：raw stdio initialize/list/EOF或POSIX signal，exit 0、stderr空、stdout只有2个可解析SDK frames。
- `git diff --check`通过；SDK/package lock、bin、schema snapshot与provider graph已盘点。

## 推进顺序退出信号核对

- S1 capability/registry/schema：`done`。
- S2 success/recoverable mapping：`done`。
- S3 schema-invalid与四类tool error：`done`。
- S4 cancellation/stdio lifecycle/idempotent shutdown：`done`。
- C1-C14保持`pending`，由acceptance统一改为`passed`。

## 验收场景自检

- initialize/list/one exact tool/object schemas/unknown/no HTTP：in-memory SDK + standalone provider tests。
- success/recoverable parity：真实stdio Client/Server integration。
- schema-invalid + four typed errors：真实stdio error fixtures，message forbidden patterns断言。
- stdout/lifecycle/cleanup：production raw child harness、SDK cancellation与EOF in-flight tests。
- 反向核对：无第二工具、无HTTP、MCP imports不直连reader/backend/classifier；non-object envelope无RepoNav structuredContent。

## Review-fix Round 1（2026-07-13）

- REV-001：`locate-tool-schema.ts`改为发布JSON Schema 2020-12；对非空字符串补`minLength`，并用标准`description`/`$comment`盘点NFKC、UTF-8 byte budget、file-anchor与跨字段runtime-only约束。schema test现在独立读取committed snapshot、由SDK AJV provider编译并执行有效/无效样例；snapshot已刷新。
- REV-002：tracked locate注册SDK/host listeners后立即检查already-aborted state，避免cancel早于listener时丢失；新增call/cancel背靠背真实stdio回归，证明service若进入则同步观察abort。
- REV-003：host关闭即使SDK server close失败也等待tracked calls并进入closed state；新增`McpShutdownCoordinator`使host/application close独立best-effort执行、失败统一固定reporter与exit 1。fault tests覆盖server close、host close和application close失败及same-promise/app-close-once。
- 定向验证：`npm run build`、`npm run typecheck`、CMD-SCHEMA、CMD-LIFECYCLE均通过。
- 全量回归：unit 84/84、Golden 25 active + 1 conditional skipped、MCP 26/26通过。
- 清洁度：无新增production debug、TODO/FIXME/XXX、注释掉代码或unused import；修复范围仅覆盖REV-001～REV-003及其证据。

## Review-fix Round 2（2026-07-13）

- R2-001：output schema生成层递归补齐2020-12 tuple `minItems/maxItems/items:false`和runtime unique arrays的`uniqueItems:true`；`start <= end`与跨集合refine保留明确`$comment`。移除`unrepresentable: any`，刷新committed snapshot。新增直接dev dependency `ajv@8.20.0`的唯一原因是测试必须使用真正`Ajv2020`异源编译input/output，不能继续依赖SDK默认draft-07 provider；完整合法success output、短/长tuple和重复reasonCodes均与runtime Zod对照通过。
- R2-002：host记录connect promise，close等待connecting settle后再关server；connect恢复时只有state仍为connecting才转running。process entry在第一次await前安装handlers，`McpStartupShutdownController`把context ready前的shutdown intent排队给唯一app coordinator。deferred connect-close race与startup-before-bind intent测试通过。
- R2-003：`test:mcp`先fresh build；production lifecycle harness从`package.json`解析`repo-nav-mcp` bin并直接启动`node dist/main.js`，完成initialize/list/tool-invalid call/EOF或signal，验证3个纯MCP frames、typed `INVALID_INPUT`、stderr空与exit 0。
- 定向验证：strict typecheck、tool-list-schema、stdio-clean-output、stdio-graceful-shutdown通过；首次lifecycle重试仅因读取完整package.json时误用`strictObject`失败，改为只投影验证`bin`字段后通过，未扩大修复范围。
- 全量回归：build/typecheck通过；unit 84/84、Golden 25 active + 1 conditional skipped、MCP 29/29通过。
- 清洁度：修复只触及R2-001～R2-003声明的schema/lifecycle/package-test边界；无production debug、临时TODO/FIXME/XXX、注释掉实现或unused import。

## Review-fix Round 3（2026-07-13）

- R3-001：`McpStdioHost`新增单次transport-error handler挂载点，`NodeMcpStdioHost`把SDK `server.onerror`转换为无raw error detail的固定通知；production main在connect前注册handler并转发给已支持排队的startup shutdown controller，统一执行`shutdown('transport-error', 1)`。
- compiled package-bin harness新增malformed JSON frame case，保持stdin打开以避免EOF竞态；真实`dist/main.js`通过SDK parser error触发host→app cleanup，约0.59秒exit 1，stdout零frames、stderr空，无普通文本/stack/raw input污染。
- 定向`stdio-graceful-shutdown`通过；全量build/typecheck、unit 84/84、Golden 25 active + 1 conditional skipped、MCP 30/30通过。
- 清洁度：仅修改R3-001的host/main transport error接线、compiled harness和对应证据；未改service/engine或协议output。
