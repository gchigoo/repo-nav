---
doc_type: feature-implementation
feature: 2026-07-10-repository-evidence-foundation
status: completed
---

# repository-evidence-foundation 实现记录

## Step 证据

- S1：建立精确版本 lockfile、严格 TypeScript 配置和由 Vitest 驱动的 unit / Golden / MCP runners；未知 case 返回非零退出码。
- S2：实现 schema v1 的 Zod 契约、NFKC/UTF-8 budget/smart-case 归一化、封闭枚举、Evidence ID 与排序优先级；6 个契约断言通过。
- S3：实现四个 runtime tokens、standalone AppModule、空 backend collection、fail-closed reader/service 与 TestingModule overrides；2 个 DI 集成断言通过。
- S4：实现独立的 Golden success/error 判别联合、两份 YAML manifest 和共享 evaluator；required/forbidden/exclusion/parity 断言均有负向验证。
- S5：实现独立 McpLifecycleCase、两份 lifecycle manifest、合成 stdio child 与超时/退出码/frames-only harness；4 个生命周期断言通过。

## 验证结果

- `npm run build`：通过。
- `npm run typecheck`：通过。
- `npm test -- --group runner-smoke --group contract --group di`：3 files / 9 tests 通过。
- `npm run test:golden -- --case runner-smoke --case manifest-schema --case evaluator-smoke`：2 files / 5 tests 通过。
- `npm run test:mcp -- --case runner-smoke --case lifecycle-manifest-schema`：2 files / 5 tests 通过。
- `npm run test:golden -- --case does-not-exist`：退出码 1，证明未知 case 不会伪成功。

## 交付物索引

- 工程入口：`package.json`、`package-lock.json`、`tsconfig*.json`、`vitest.config.ts`。
- 公共契约：`src/contracts/`、`src/runtime/`。
- Standalone DI：`src/app/`、`src/evidence/`、`src/repository/`。
- Verification Kit：`testkit/contracts/`、`testkit/manifests/`、`testkit/runners/`、`testkit/fixtures/`。
- 测试：`test/unit/`、`test/golden/`、`test/mcp/`。

## 范围与清洁度

- 未实现真实 reader、search backend、Evidence Engine、MCP tool、HTTP、LLM、数据库或持久化。
- `src/**` 不依赖 `testkit/**`、`test/**` 或 `@nestjs/testing`。
- 未发现调试输出、临时 TODO/FIXME/XXX、注释掉代码或未使用 import。
- S2 的两次窄修复已记录在 `repository-evidence-foundation-step-2-fix.md`。
- `implementation.before_review` 首次运行暴露 Windows `cmd.exe` 不识别 POSIX 单引号，导致 scope gate 漏报全部 changed files；已对 `.codestable/tools/codestable-scope-gate.py` 做跨平台 shell quoting 窄修复并重跑 gate。

## 知识候选

- Windows 环境变量不能包含 NUL；runner 的多值筛选使用 JSON string array，而不是 NUL 分隔。
- NestJS `overrideProvider(...).useValue(...)` 不应被用于证明 useValue 对象的生命周期 hook；本 feature 只证明 context 可关闭与 seam 可替换。


## Review-fix round 1

- REV-001：`BackendHealthSchema` 补齐 `possibleStaleIndex` 与 `reasonCode`，新增 strict schema 正反断言。
- REV-002：MCP lifecycle harness 改用最小 JSON-RPC request / notification / response 判别联合，拒绝 JSON 诊断、普通文本与内嵌空行。
- REV-003：scope gate 改为 `shell=False` argv 调用；git status 失败返回 `blocked`；新增 Windows 合法 shell 元字符路径和非 Git 目录失败测试。
- REV-004：Golden evaluator 对 success/error 统一执行 `mcpIsError` 与 structured/text/result deep parity，新增 success 四类负例。
- 首次验证发现一个未使用 type import 和一个 Windows 非法测试文件名；窄修复后定向 typecheck、contract（9 tests）、Golden（5 tests）和 MCP（5 tests）全部通过。


## Review-fix round 2

- REV-005：最终排序改用确定性的 UTF-16 code-unit 比较，不再依赖 ICU locale；12 个 contract tests 覆盖 class、role、file、start、end、id、相等与反对称。
- REV-007：仅 file anchor 执行 POSIX lexical canonicalization；拒绝 absolute、drive-qualified、UNC 与 root escape；symbol 等其他 anchor 保留反斜杠 literal。
- 首次 typecheck 发现 UNC test literal 转义错误；窄修复后 `npm run typecheck` 与 `npm test -- --group contract --case term-case-parity` 通过（12 tests）。
