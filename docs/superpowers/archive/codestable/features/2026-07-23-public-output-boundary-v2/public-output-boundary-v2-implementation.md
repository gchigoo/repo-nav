---
doc_type: feature-implementation
feature: 2026-07-23-public-output-boundary-v2
status: passed
---

# F1 implementation record

## 1. Baseline

- baseline：`fd1d528a7319de734300fb906adb69adbf237639`
- worktree start gate：passed
- design / independent design review：approved / passed
- baseline full suite 已由 design review 记录：unit 168、Golden 64 + 1 skip、
  MCP 39、docs smoke passed。

## 2. Step evidence

| Step | RED | GREEN | VERIFY |
|---|---|---|---|
| S1 | runner 未注册、contract module 缺失；raw locator mutation 对初版 schema 失败 | strict raw/public schema 与 cross-field invariant 后 13 cases passed | `schema-contract-families` 13 passed |
| S2 | field policy module 缺失 | field/path policy 6 cases passed | targeted unit 6 + Golden 2 passed |
| S3 | assembler module 缺失 | allowlist/ordinal/status 5 cases passed | targeted 5 passed |
| S4 | synthetic projection module 缺失 | safe error/parity 4 cases passed | targeted 4 passed |
| S5 | import-inventory module 缺失 | deliberate mutation owner + real graph gate 2 cases passed | v2 unit 46、Golden 7、full suites passed |

S5 的 no-cutover 属静态边界；没有通过临时 production import 制造真实 RED。替代证据是
synthetic graph mutation 必须产生 forbidden path，而真实 import graph 必须为空。

## 3. Aggregate verification

- `npm run build`：passed
- `npm run typecheck`：passed
- `npm test -- --group public-output-v2`：46 passed
- `npm run test:golden -- --group public-output-v2`：7 passed
- `npm test`：214 passed
- `npm run test:golden -- --all`：70 passed / 1 approved skip
- `npm run test:mcp -- --all`：39 passed
- `npm run test:docs`：passed
- `python .codestable/tools/codestable-doctor.py --root .`：当前 blocked by
  pre-existing debug-cli Task agent review P1，以及本 feature round 3 复审 pending；
  后者须在独立 reviewer 完成后关闭。

## 4. Cleanliness and scope

- 没有 production v2 cutover、barrel export、DI provider、adapter、persistence 或 logger；
- 没有真实 secret fixture、调试输出、临时 TODO/FIXME 或注释掉代码；
- contract/policy/assembler/projection 只存在于 dormant internal/test seam；
- artifact inventory、forbidden scan、no-cutover report 可从本目录反查。

## 5. Review-fix evidence

- REV-001：新增 uppercase/hyphen/camel/Pascal tokenizer、quoted assignment、裸/截断
  ESC hostile tests；完整 projection forbidden scan 通过。
- REV-002：补 backend-specific reason、status/completion/termination/hitCount、
  fallback compensation、limit/degradation 和 snapshot count truth table；正反 mutation
  通过。
- REV-003：`exclusionSummary` 按 frozen enum 重建，nested key permutation bytes 相等。
- REV-004：public `resolvable=true` path 必须通过 normalized relative POSIX validator。
- REV-005：case/report 已改为从真实 35 unit + 6 Golden cases 反查，不再沿用初版覆盖声称。
- Review-fix RED：新增 hostile/backend/public-path/nested-order 反例共出现 5 个失败；
  GREEN/VERIFY：targeted 35 unit + 6 Golden、DoD core full suites 全部通过。
- Round 2 review-fix：新增 retained unique-file/snapshot、early-stop zero-hit、
  fallbackChecked、post-backend abort 与 public display-control path mutation；
  targeted RED 为 4 failed / 16 passed，GREEN 为 38 unit + 6 Golden。
- Scope inventory 从无效的文件名前缀改为四个精确 unit 文件，scope gate 与 evidence
  pack 逐项列全；DoD round 2 全量为 unit 206、Golden 70 + 1 approved skip、
  MCP 39、docs smoke passed。
- Round 3 review-fix：public term/symbol/excerpt display-control schema、
  redaction placeholder metadata truth、public snapshot unique-file bound，以及 raw/public
  limits/degradations canonical ordering 均增加 deliberate mutation；assembler 对非法顺序
  返回 fixed `INTERNAL_ERROR`。
- Round 3 RED 为 targeted 5 failed / 25 passed；GREEN 为 targeted 30、v2 unit 43、
  Golden 6；DoD 全量为 unit 211、Golden 70 + 1 approved skip、MCP 39、
  docs smoke passed。
- Round 4 review-fix：placeholder hidden semantics 改由 `resolvable` + file metadata
  共同决定；安全字面 `[REDACTED_PATH]` 经 assembler/public schema 保持普通内容。
  AWS/GitHub/JWT fixed credential、phone、unterminated quote/template 增加 direct
  owner，组合 hostile case 执行四个 synthetic projections。
- Round 4 GREEN 为 targeted unit 40、v2 unit 46、Golden 7；DoD 全量为 unit 214、
  Golden 71 + 1 approved skip、MCP 39、docs smoke passed。
- Round 5 review-fix：malformed double/single/template regex 增加 dangling escape
  fail-closed；direct owner 覆盖三类末尾孤立反斜杠，Golden malformed template 同时
  通过四个 synthetic projections。
- Round 5 RED 为 focused 1 failed / 7 passed；GREEN 为 focused 8、v2 unit 46、
  Golden 7；DoD 全量为 unit 214、Golden 71 + 1 approved skip、MCP 39、
  docs smoke passed。
