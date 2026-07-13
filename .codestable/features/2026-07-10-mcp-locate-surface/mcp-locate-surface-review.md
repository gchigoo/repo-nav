---
doc_type: feature-review
feature: 2026-07-10-mcp-locate-surface
status: passed
reviewer: subagent
reviewed: 2026-07-13
round: 4
---

# mcp-locate-surface 代码审查报告

## 1. Scope And Inputs

- Design / checklist: F4 approved design与全`done`steps checklist。
- Evidence: 最新`implementation.before_review` scope gate、DoD runner、evidence pack均passed；实现记录包含三轮review-fix。
- Diff basis: 当前全部F4 tracked/untracked diff；复审schema、error/parity、pre-abort、bootstrap/connect/shutdown、SDK onerror、compiled package bin和测试假阳性。
- Baseline dirty files: none。

### Independent Review

- Detection: 原生Task agent `f4_review_fast`完成Round 4隔离全量复审；OCR因无有效LLM endpoint为not-available。
- 环节 A 独立隔离 Task agent: native-agent + completed。
- 环节 B OCR CLI: not-available。
- Merge policy: 独立结论经主agent对照当前SDK 1.29.0边界、源码、snapshot、strict Ajv2020、compiled-bin harness和fresh DoD证据核验。
- Gate effect: none；blocking/important均为none，`reviewer: subagent`满足下游gate。

## 2. Diff Summary

- 新增：MCP low-level server/host/module/schema/serializer/process coordinator与production bin；真实stdio fixtures/harness；surface/output/error/cancellation/lifecycle tests；F4 evidence artifacts。
- 修改：package/lock、AppModule/contract/index、DI/lifecycle runner和roadmap goal状态。
- 删除：none。
- 未跟踪 / staged：F4新增文件尚未跟踪；无staged diff。
- 风险热点：公共JSON Schema 2020-12、typed error边界、取消竞态、transport/parser failure、shutdown幂等和compiled entry。

### Previous Findings Disposition

- Round 1：draft/schema弱化、already-aborted丢失、close failure短路均已修复。
- Round 2：output tuple/unique constraints、connect-close/early startup intent、actual package bin均已修复。
- Round 3：SDK `server.onerror`现以无raw detail通知接入startup shutdown controller；compiled malformed-frame case证明exit 1、零stdout污染。

## 3. Adversarial Pass

- 假设的生产 bug：客户端在极端时序取消、connect未完成即close、SDK parser失败或某个close reject，导致迟到调用、状态回写、资源泄漏或stdout污染。
- 主动攻击：pre-aborted signal、deferred connect-close、server/host/app close faults、malformed frame、短/长tuple、重复数组、runtime-only refine、真实dist/bin freshness。
- 结果：可复现问题均已修复并由异源测试覆盖；剩余不确定性进入residual risk/QA focus，不构成blocking或important。

## 4. Findings

### blocking

none。

### important

none。

### nit

none。

### suggestion

- `test/mcp/request-cancellation.spec.ts:38-56` 的early-cancel测试允许请求完全未到server并使用固定100ms窗口。当前production already-aborted修复正确且不阻塞；后续可用可控raw/in-memory transport或fixture ack把“未进入或入口即aborted”变成确定性断言。

### learning

- Node stream error与SDK transport/protocol `server.onerror`必须分别接入同一lifecycle owner；当前实现选择fail-closed且不透传raw detail。
- Zod→JSON Schema精确性应由runtime Zod、独立Ajv2020和异源无效样例三方交叉验证。

### praise

- schema发布2020-12并补齐tuple arity、closed items、unique arrays，runtime-only约束诚实注解，snapshot与真实tools/list严格同值。
- SDK/host/deadline signal合并、already-aborted检查、tracked settle和host/app best-effort cleanup的owner清晰。
- production handlers在首次await前安装；early intent排队、connect-close race、SDK parser failure、compiled `dist/main.js`均有真实证据。
- unknown tool、protocol-invalid、tool-invalid与application typed errors四条边界没有串线；structured/text由单一serializer保证parity。

## 5. Test And QA Focus

- QA重点复跑CMD-SCHEMA/CMD-LIFECYCLE和MCP全量30/30；核对compiled bin三帧、typed INVALID_INPUT、malformed frame exit1/零stdout。
- 保留fault matrix：server/host/app close、deferred connect-close、pre-abort/late abort、EOF in-flight。
- 人工核对schema-invalid object与non-object arguments分别落在RepoNav structured error与SDK JSON-RPC error。
- 非Windows CI验证真实SIGINT/SIGTERM exit0；Windows按design继续EOF。

## 6. Residual Risk

- SDK `server.onerror`也可能承载peer protocol anomaly；当前明确fail-closed exit1。未来若需容忍客户端噪声，应把transport failure与可恢复diagnostic分流。
- shutdown依赖service/child协作响应AbortSignal；未来非协作实现可能让tracked settle无限等待，需重新决策进程内hard deadline。
- Windows当前未真实执行SIGINT/SIGTERM；由非Windows CI覆盖。
- NFKC、UTF-8 byte budget、line order和跨集合refine无法完整表达为标准JSON Schema，已用comment+runtime Zod明确边界。

## 7. Verdict

- Status: passed
- Next: 进入`cs-feat-qa`，用fresh compiled-bin、strict schema、typed errors、cancellation与lifecycle fault matrix执行最终QA。
