---
doc_type: feature-forbidden-scan-report
feature: 2026-07-23-public-output-boundary-v2
status: passed
---

# F1 forbidden corpus scan

## 1. 扫描面

- term、file、symbol、excerpt 字段 truth table；
- parsed service result；
- synthetic `structuredContent`；
- JSON text；
- synthetic debug-locate stdout；
- safe error success/error 分支。

## 2. Hostile corpus

测试值覆盖 secret assignment、underscore/hyphen/camel/Pascal identifier、
credential、connection userinfo/query、email、phone、malformed template、
oversized UTF-8 token、C0、DEL、ANSI、bidi、跨字段继承 token、敏感 path 和
newline path。只使用合成值，没有真实凭证或本机绝对路径。

## 3. 结果

- unit：`npm test -- --group public-output-v2`，46 passed；
- Golden：`npm run test:golden -- --group public-output-v2`，7 passed；
- hostile 原值不在任一已序列化 projection；
- literal `[REDACTED]` / `[REDACTED_PATH]` 在无 metadata 时保持普通内容；
- unsafe raw/error extra field 只产生 fixed `INTERNAL_ERROR`。
- uppercase/hyphen/camel/Pascal identifier、quoted JSON/JS key、裸/截断 ESC、
  DEL 与 bidi 均有真实 hostile case owner。
- AWS/GitHub/JWT fixed credential、phone PII、unterminated quote/template 均有
  direct policy owner；credential + phone + malformed template 组合执行全部 synthetic
  projections forbidden scan。

## 4. stderr N/A

F1 是 dormant pure in-process seam，不启动 backend/process、不写日志，也没有
production stderr producer，因此 F1 stderr scan 为 N/A。error projection 仍完整执行
forbidden scan；真实 locate stderr 归 F9 原子切换 gate，不由本 N/A 跳过。
