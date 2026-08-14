---
doc_type: feature-evidence
feature: 2026-07-10-evidence-output-guardrails
status: current
---

# RepoNavToolError parity 证据

| Code | recoverable | suggestedAction | Safe message |
|---|---:|---|---|
| INVALID_INPUT | true | 仅缺/空 terms 时 ADD_TERM | Locate request does not match the required schema. |
| INVALID_REPOSITORY | true | none | Repository root is invalid or unavailable. |
| PATH_OUTSIDE_ROOT | false | none | Repository path is outside the configured root. |
| INTERNAL_ERROR | false | none | Repository evidence request failed. |

- `createPublicErrorResult` 是 application 与 MCP 共用的 typed factory；Engine 不再返回 RepositoryAccessError/raw exception message。
- factory/policy 按 code 白名单归一化 action：只有 `INVALID_INPUT + ADD_TERM` 可公开，后三类 code 即使 service 注入非法 action 也会被删除。
- `ADD_TERM` 仅用于 terms 缺失或空数组；错误类型、非法成员、空字符串成员和其他 schema 错误不再误报该 action。
- `serializeLocateToolOutput` 重新应用 safe error policy，再以同一 parsed object生成 structuredContent、JSON text 与 `isError=true`。
- 测试输入含绝对路径、stack、raw stderr marker 及所有 code/action 负向组合；四表面只保留 exact code/recoverable/action/safe message。
- 验证：CMD-ERRORS → 4 error cases + 1 selected schema-surface guard passed。
