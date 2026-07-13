---
doc_type: feature-implementation
feature: 2026-07-10-text-source-evidence-engine
status: completed
---

# text-source-evidence-engine 实现记录

## Step 证据

- S1：实现 `RipgrepBackend` 的 literal `--fixed-strings --json` argv、per-term case groups、versioned JSONL parser、file-anchor fact、no-result/unavailable/abort/failure 映射与 POSIX relative path 规范化；真实 `rg 15.1.0` seam 和 4 个 adapter cases 通过。
- S2：实现当前文件 `readRange` / `findMatches` 核验、unredacted discovery key、schema-priority provenance/reason merge、duplicate/unverified accounting 与 abort 前已完成 record 保留；4 个 merge/permutation cases 通过，尚未生成 public class/ID。
- S3：实现 deterministic layer resolver、轻量 lexical segmentation、封闭 assignment/object/SQL/symbol truth table、negative/layer exclusions、promotion requirements、classification 后 full SHA-256 ID 与稳定排序；21 个 classifier/ordering cases及 3 个 versioned Golden cases 通过。
- S4：实现 ripgrep-only `RepositoryEvidenceEngine`、真实 Nest provider assembly，以及 `ok/no_result/backend_unavailable/partial/timeout` 的 coverage/nextActions baseline；5 个命名 Golden case 共 7 tests 通过，并证明 caller abort 保留 deadline 前已核验证据。

## 验证结果

- `npm run build`：通过。
- `npm run typecheck`：通过。
- `npm test -- --group ripgrep-backend`：6 tests 通过。
- `npm test -- --group evidence-merge`：6 tests 通过。
- `npm test -- --group direct-mapping-classifier --group evidence-id-order`：34 tests 通过。
- `npm run test:golden -- --case source-field-mapping --case false-confirmation-decoys --case exclusion-summary`：5 active tests 通过。
- `npm run test:golden -- --case text-engine-baseline --case ripgrep-unavailable --case ripgrep-failed --case ripgrep-incomplete --case ripgrep-timeout`：14 tests 通过。
- 全量 `npm test`：84 tests 通过；全量 `npm run test:golden`：25 active tests 通过，1 个条件性测试按 case 选择设计 skipped。

## Review Fix Round 1

- **REV-001**：`direct-mapping-classifier.ts` 将 assignment/object/SQL pair 绑定到 focus statement 与支持的 executable/object context，mask declaration、decorator、JS/SQL string/comment decoy，并要求 symbol definition/implementation body；26 个 classifier cases 覆盖 mixed type/interface、SQL literal/comment、symbol alias 与 window hard boundary。
- **REV-002**：`discovery-record.ts` 将 `PATH_OUTSIDE_ROOT`、`INVALID_RELATIVE_PATH`、`INVALID_REPOSITORY` 统一设为 verification fatal error；merge tests 覆盖三类传播，Golden engine cases覆盖 unsafe backend path 与 mid-run invalid repository 的 tool error 映射。
- **REV-003**：verification seam 在保留单行 stale check 后向前构造最多 12 行/4 KiB logical window，并保留 exact focus excerpt；真实 `RipgrepBackend → NodeRepositoryReader → RepositoryEvidenceEngine` Golden 链覆盖 2/12/13 行与 4096/4097 bytes，确认只有边界内 mapping 可进入 confirmed。
- **REV-004**：engine 把 term/table/route anchor 的 normalized case metadata纳入 filesystem verification，adapter 以 rg actual submatch形成 canonical symbol；unit/Golden cases覆盖 insensitive actual case、sensitive negative及 term/table/route anchor-only mapping。
- 修复验证：`npm run typecheck`、四组定向 unit/Golden commands、全量 `npm test`、全量 `npm run test:golden` 均通过；scope gate、DoD runner、evidence pack 已重新生成并通过。

## Review Fix Round 2

- **REV-001**：symbol method predicate 收紧为 declaration-line context，control-flow `if/while(symbol())` 保持 candidate；lexical segmentation 新增 JS regex literal 与 PostgreSQL dollar-quoted string masking。新增 2 个 mapping literal 负例与 2 个 symbol call-site 负例，28 个 classifier cases 通过。
- **REV-003**：logical-window expansion 触发 `MAX_EXCERPT_BYTES_REACHED` 时保留已核验 focus record，同时把 limit failure 传入 coverage；真实 4097-byte 全链路现为 `partial` 且含 `MAX_EXCERPT_BYTES_REACHED`，4096-byte 仍 confirmed。
- **REV-004**：Ripgrep adapter 对同一 match 的每个 canonical symbol actual submatch 生成独立 fact并稳定排序，merge 后 classification 不随 anchor 顺序变化；unit 与真实 rg→reader→engine permutation cases 均通过。
- 修复验证：`npm run typecheck`、adapter/merge/classifier/Golden 定向命令、全量 77 unit tests 与 25 active Golden tests 均通过。

## Review Fix Round 3

- **REV-001**：slash lexical context新增 arrow 与 control-header识别，并阻止 `.return/.await` member suffix触发 keyword误判；SQL block-comment scanner按嵌套深度mask。新增 arrow/control regex、member division + 后续 mapping、nested SQL comment及 line-start/inline method正反 cases。
- **REV-003**：`nextActions` 只在 backend/file/evidence 等 caller 可调 budget 触顶时给 `RETRY_WITH_HIGHER_LIMIT`；固定 4 KiB-only partial 仅保留可执行的 `CONFIRM_CANDIDATE`，Golden 锁定 exact actions。
- **REV-004**：DiscoveryRecord 保存同 location 的全部 `canonicalSymbols`；classifier 单次执行时对所有 anchored symbols 求 definition/implementation role，按 role priority与 canonical tie-break选 public primary symbol。反向命名 `function Zeta(){ Alpha(); }`、anchor permutation及 1/2-fact budgets 全链路通过。
- 失败恢复：首次全量 Golden仅因 1-fact budget 同时触发 `MAX_CANDIDATES_REACHED` 而测试期望少列一项失败；修正 exact coverage expectation后复验通过，未改生产语义。
- 修复验证：typecheck通过；全量 83 unit tests、25 active Golden tests通过。

## Review Fix Round 4

- **REV-001**：新增共享 `endsWithStandaloneKeyword` token boundary，control-header回溯与 `do|else` prefix均排除 `.`/identifier member access；`.if/.while/.for/.with(...)` method division及 `.do/.else` property division不再吞掉后续 mapping，真实 `if/while (...) /regex/` 仍降级。
- 修复验证：typecheck、34 个 classifier/ordering cases、真实 engine Golden定向命令通过；全量 84 unit tests、25 active Golden tests通过。

## 交付物索引

- Ripgrep adapter：`src/repository/ripgrep-backend.ts` 与 `testkit/fixtures/ripgrep/`。
- Discovery merge：`src/evidence/discovery-record.ts`。
- Truth table / layer / ID pipeline：`src/evidence/direct-mapping-classifier.ts`。
- Service baseline：`src/evidence/repository-evidence-engine.ts`。
- Nest 挂载：`src/repository/repository-backends.module.ts`、`src/evidence/evidence.module.ts`。
- Unit / Golden evidence：`test/unit/*ripgrep*`、`test/unit/evidence-merge.spec.ts`、`test/unit/direct-mapping-classifier.spec.ts`、`test/golden/text-*.spec.ts`、`testkit/manifests/golden/{source-field-mapping,false-confirmation-decoys,exclusion-summary,text-engine-baseline,ripgrep-*}.yaml`。

## 范围与清洁度

- 删除 F1 的 fail-closed service/error placeholder，默认 provider 已切换为真实 engine；backend collection 固定、冻结且当前仅含 `ripgrep`。
- 未实现 CodeGraph、sibling/neighbor expansion、MCP transport、numeric confidence、redaction 或 F7 guardrails。
- 源码、测试与 fixtures 未发现 debug output、临时 TODO/FIXME/XXX、注释掉实现或 unused import。

## 失败恢复记录

- S1 前三次复验分别暴露生成脚本 escape、unused import、非法 JSONL newline 与 `./` path normalization；用户批准第四次窄修后通过，详见 `text-source-evidence-engine-step-1-fix.md`。
- S2 对 design interface 复核后把临时 `symbols/reasonCodes` 形态收敛为 `matchedTerms/canonicalSymbol/discoveryReasonCodes`，定向复验通过。
- S3 首次 classifier 定向验证捕获 decorator metadata false-confirmation，修正 object predicate 后通过；首次完整 Golden 验证发现 `.ts` 负例 fixture 被 TypeScript 编译，改用非编译 `.fixture` 后通过。
- S4 首次 typecheck 暴露 `Required<LocateLimits>` 仍携带 optional `undefined`，以显式 `ResolvedLocateLimits` 收紧返回类型后通过；最后本地审计修正 unavailable 被误记 `MAX_FILES_REACHED`、available incomplete 空结果误报 `no_result` 与 timeout 丢失已核验证据。

## 知识候选

- versioned JSONL fixture 应逐物理行 `JSON.parse`，避免生成脚本把 JSON escape 写成真实 newline。
- backend discovery 不能直接构造 public evidence；先用当前文件内容生成不含 role/class 的 discovery key，再稳定 merge 与单次 classification。
- fault status 必须同时由 backend health、completeness、limits 与 caller/internal abort 来源决定，不能把 unavailable 或 incomplete 静默降成 `no_result`。
