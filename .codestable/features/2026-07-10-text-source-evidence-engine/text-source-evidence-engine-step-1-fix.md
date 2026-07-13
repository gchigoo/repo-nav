---
doc_type: feature-step-fix
feature: 2026-07-10-text-source-evidence-engine
step: S1
status: resolved
---

# S1 窄范围修复说明

## 失败的退出信号

- `npm run typecheck && npm test -- --group ripgrep-backend` 尚未通过。

## 两次失败证据

1. 生成脚本把 TypeScript 的反斜杠/换行字面量解释成真实换行，导致 parser/test 出现 unterminated literal；已仅修正 escape sequences。
2. escape 修正后 strict typecheck 发现 `SafeProcessResult` 为未使用 type import。

## 允许范围与复验

- 第三次复验发现 fixture 的 JSON 字符串中混入真实换行，parser 因此按契约拒绝并在第一个 case group 后返回；真实 `rg` 同时返回 `./literal.ts`，尚未规范化为 POSIX relative path。
- 用户在 handoff 后批准第四次窄范围修复；仅修正 versioned fixture 的 JSON escape，并在 adapter JSON 边界规范化 `rg` 输出路径，不进入下一 step。
- 修复后必须重跑 typecheck 与 `ripgrep-backend` group；仍失败则再次交还用户。

## 复验证据

- versioned JSONL fixture 逐行 `JSON.parse`：通过，共 4 行。
- `npm run typecheck && npm test -- --group ripgrep-backend`：通过，4 tests passed。
