# Evaluator Mutation Report

## 共享语义

- service observation 与真实 stdio MCP observation 都调用 `assertGoldenCase`。
- success/error 由同一 discriminated evaluator 判定；lifecycle 不进入 GoldenCase。
- manifest confirmed/candidates 按 exact length/order 匹配，companion snapshot 再锁定完整 public output。

## Deliberate Failures

`evaluator-negative-self-test` 已证明以下 mutation 非零失败：

- unexpected evidence、wrong evidence order、forbidden ID、missing coverage、low exclusion count；
- wrong nextAction、missing promotion、wrong promotion order；
- wrong discoveredBy order、wrong verifiedBy、wrong operation order；
- error structured/text parity mismatch；
- 43 个 EvidencePack public field mutation（`repositoryRoot` 为唯一有意 normalize 的字段）。

验证：7/7 selected tests passed。
