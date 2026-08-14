---
doc_type: feature-evidence
feature: 2026-07-10-evidence-output-guardrails
status: current
---

# Redaction / forbidden-value scan 证据

- `EvidenceRedactor` 只在 canonical ID 与 stable order 已确定后处理 public location；ID、file、symbol、lines 保持，raw discovery/hash material 不公开。
- `SECRET_LIKE_VALUE`：已知 key assignment 与固定 credential；`CONNECTION_STRING`：URI userinfo/query secret；`PERSONAL_DATA`：email/phone-like token，不猜人名；`BINARY_OR_OVERSIZED_CONTENT`：完整 UTF-8 read 后单 token > 2048 bytes 使用整段 placeholder。
- 跨 evidence token propagation 防止 secret assignment seed 已遮盖但 alias/source derived candidate 仍泄露同一 raw value。
- quoted assignment 会完整消费单/双引号/backtick 内含空格、逗号、分号和转义引号的 value；template literal 含 `${...}` 或引号畸形且无法安全切片时整段替换为 placeholder。
- malformed quoted tail 的边界可确定时会进入跨 evidence sensitive-token propagation；真实 Engine 与 MCP fixture 均证明 seed 整段遮盖、derived candidate 同值遮盖。
- 真正 `BINARY_FILE`/reader cap failure 不产生 evidence/redaction，只记录 UNVERIFIED 与相应 fixed limit。
- MCP serializer 再次对任意 service success 执行同一 redaction，随后 schema validate 并生成 structured/text parity；正式 stderr 经 `DiagnosticScrubber` 删除 stack、绝对路径和敏感 token，stdout 保持协议 frames-only。
- Forbidden scan values 覆盖普通/单引号/双引号/backtick/malformed/escaped source secret、malformed-derived 同值、DSN password/query token、email、phone、diagnostic secret 与 absolute path；真实 Engine service JSON、MCP structured/text/protocol result 与 captured stderr 均无原值。
- 验证：CMD-REDACTION → 5 Golden + 1 real stdio MCP passed；redaction unit 7 passed 中覆盖四 reason、ID stability、template fail-closed、malformed propagation、PERSONAL_DATA 边界与 diagnostic scrubber。
