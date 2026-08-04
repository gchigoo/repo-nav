---
doc_type: feature-qa
feature: 2026-07-10-mcp-locate-surface
status: passed
tested: 2026-07-13
round: 1
---

# mcp-locate-surface QA 报告

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-design.md`
- Checklist: `.codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-checklist.yaml`
- Review: `.codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-review.md`（Round 4，passed，subagent）
- Evidence pack: `.codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-evidence-pack.md`
- Gate / DoD: 最新`implementation.before_review`结果均passed。
- Diff basis: 当前F4完整tracked/untracked diff；review后未修改production/test代码，仅写本QA报告。
- Baseline dirty files: none；当前dirty均归因于F4和roadmap goal状态。
- Feature type: functional。新增本地MCP/CLI runtime surface、错误语义和进程lifecycle，必须用真实协议与进程证据，不可只靠typecheck。
- Core evidence gate: tools/list/call/error/cancellation/lifecycle均通过真实MCP client或compiled raw stdio child；schema另由runtime Zod + strict Ajv2020交叉验证。

## 2. Verification Matrix

| ID | 来源 | 核心性 | 场景 / 风险 | 证据类型 | 命令或动作 | 期望 | 结果 |
|---|---|---|---|---|---|---|---|
| QA-001 | design S1 / review | core-functional | initialize、单工具、2020-12 input/output、unknown guard、无HTTP | integration + schema | `npm run test:mcp`中的tool-surface 8 tests | 一个只读工具；snapshot同值；Ajv2020/Zod反例一致；unknown不调用service | pass |
| QA-002 | design S2 | core-functional | success及5种recoverable status mapping | real stdio integration | tool-output-parity 2 tests | `isError=false`且structured/text严格同值 | pass |
| QA-003 | design S3 | core-functional | schema-invalid、3类application error、protocol-invalid | real stdio integration | tool-error-parity 4 tests + tool-surface boundary | typed code/parity正确，无stack/path/raw stderr；SDK边界不串线 | pass |
| QA-004 | design S4 / review | core-functional | pre/late cancellation、EOF in-flight abort | real stdio integration | request-cancellation 3 tests | service/child观察abort，无迟到completion | pass |
| QA-005 | design S4 / review | core-functional | compiled bin、clean stdout、EOF/signal、malformed transport、close faults与connect race | process integration + fault tests | lifecycle-contract 12 tests | actual `dist/main.js` initialize/list/call；normal exit0；malformed exit1零stdout；cleanup幂等 | pass |
| QA-006 | DoD / regression | supporting | build、strict types、F1-F3回归 | build + unit + Golden | `npm run build && npm run typecheck && npm test && npm run test:golden` | 无编译/类型/既有行为回归 | pass |
| QA-007 | design反向核对 | supporting | 无debug/TODO、无reader/backend/classifier/HTTP反向依赖、scope可归因 | diff + static | `git diff --check`与定向扫描 | 清洁且无方案外依赖 | pass |

## 3. Command Results

- `npm run build` → exit 0：TypeScript production build通过，生成fresh `dist/main.js`。
- `npm run typecheck` → exit 0：strict TypeScript 5.8检查通过。
- `npm test` → exit 0：11 files，84/84 tests通过。
- `npm run test:golden` → exit 0：4 files，25 active tests通过，1个按既有case选择条件skipped。
- `npm run test:mcp` → exit 0：先fresh build；6 files，30/30 tests通过。compiled lifecycle分别观察initialize/list/call三帧、malformed frame exit1零stdout、graceful shutdown在5秒预算内。
- 最新DoD的CMD-BUILD、CMD-TYPECHECK、CMD-SCHEMA、CMD-SUCCESS、CMD-ERROR、CMD-LIFECYCLE全部exit 0。
- `git diff --check`、production清洁度/反向import扫描 → exit 0：输出`QA_CLEANLINESS_PASS`、`QA_IMPORT_BOUNDARY_PASS`。
- 未运行：Windows真实SIGINT/SIGTERM。approved design明确Windows用stdin EOF，signal由支持signal的平台/非Windows CI覆盖，因此不阻塞当前平台QA。

## 4. Scenario Results

- [x] QA-001 capability/registry/schema：pass。
  - Evidence: 真实SDK tools/list只有`repo_nav_locate`；input/output均声明2020-12并等于committed snapshot；strict Ajv2020拒绝空字符串、短/长tuple和重复unique array，runtime Zod同步拒绝。
- [x] QA-002 success/recoverable parity：pass。
  - Evidence: source mapping和`ok/no_result/partial/backend_unavailable/timeout`经真实stdio均为`isError=false`且文本/structured严格相等。
- [x] QA-003 typed/protocol errors：pass。
  - Evidence: `INVALID_INPUT/INVALID_REPOSITORY/PATH_OUTSIDE_ROOT/INTERNAL_ERROR`字段与安全message符合contract；unknown与non-object envelope停在SDK JSON-RPC通道。
- [x] QA-004 cancellation：pass。
  - Evidence: 背靠背early cancel、service started后cancel、EOF in-flight三条均在预算内观察到abort/cleanup。
- [x] QA-005 lifecycle：pass。
  - Evidence: package bin解析到`dist/main.js`并直接由Node运行；normal EOF当前平台exit0/stderr空/3 frames；malformed SDK transport frame约0.63秒exit1、stdout空、stderr无raw error；server/host/app close failure仍执行其余cleanup，application close once。
- [x] QA-006/007 regression与反向核对：pass。
  - Evidence: build/typecheck/unit/Golden/MCP全绿；无HTTP listener、第二工具、production debug或handler直连deep implementations。

## 5. Findings

### failed

none。

### blocked

none。

### residual-risk

- SDK `server.onerror`当前统一fail-closed exit1；未来若产品要求容忍peer protocol噪声，需要重新区分fatal transport failure与可恢复diagnostic。
- shutdown依赖service/child协作响应AbortSignal；未来非协作实现可能需要进程内hard deadline。当前F2/F3 contract与30条MCP测试均按协作取消成立。
- Windows当前按design使用EOF；真实SIGINT/SIGTERM exit0由非Windows CI复核。
- NFKC、UTF-8 byte budget、line order和跨集合refine不能完整映射到标准JSON Schema，已由public `$comment`/description与runtime Zod共同约束。

## 6. Cleanliness

- Debug output: pass；production无console/debug，fixture markers只写测试stderr。
- Temporary TODO/FIXME/XXX: pass。
- Commented-out code: pass。
- Unused imports / dead code from this feature: pass（build/typecheck全绿）。
- Out-of-scope files: pass（scope gate无blocking/warning）。

## 7. Verdict

- Status: passed
- Next: `cs-feat-accept`。
