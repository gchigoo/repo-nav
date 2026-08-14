---
doc_type: feature-code-review
feature: 2026-07-24-span-redaction-corpus-policy-v2
status: passed
reviewer: subagent
round: 1
reviewed: 2026-07-27
lane_a_state: completed
lane_a_ref: ""
lane_a_reason: ""
lane_b_state: unavailable
lane_b_ref: ""
lane_b_reason: "ocr CLI not invoked in this Lane A subagent review"
---

# span-redaction-corpus-policy-v2 代码审查报告

## 1. Scope

- Design: `.codestable/features/2026-07-24-span-redaction-corpus-policy-v2/span-redaction-corpus-policy-v2-design.md`（`status: approved`）
- Checklist: `.../span-redaction-corpus-policy-v2-checklist.yaml`（S1–S5 全 `done`；C1–C33 仍 `pending`，符合 review 前状态）
- Evidence / Gate / DoD / Scope: evidence-pack、gate-results、dod-results、scope-gate 均已读；`implementation.before_review` 为 `passed`，无 blocking
- Architecture check: `span-redaction-corpus-policy-v2-architecture-check.md`（`no-change`）
- Diff basis: F1A 可归因改动为 `src/evidence/public-output/*`（façade 拆分 + 新内部模块）、`public-result-assembler-v2.ts`、相关 unit/Golden/fixtures、`testkit/runners/runner-registry.ts`
- Baseline / ambient: 大量 `.codestable/features/*`、roadmap/reference、`runtime-manifest.json` 等为 ambient / goal 包基线，不计入 F1A 实现结论
- Review mode: initial（Lane A independent subagent）

## 2. Spec Compliance

对照 approved design 的核心契约：

| 契约 | 结论 | 证据 |
|---|---|---|
| 原始 UTF-16 half-open span，不切开 surrogate | 满足 | `createSensitiveSpanV2` / `isCodePointBoundary` / `validateSensitiveSpansV2` |
| CRLF 触及则整对覆盖；merge overlap/adjacent；reason canonical | 满足 | `expandCrlfSpan`、`mergeSensitiveSpansV2`、`orderedReasons` |
| 单次 materialization；detector/corpus 只读原值 | 满足 | `redactText` 先收集 spans 再 `materializeSensitiveSpansV2`；无二次 `replaceAll` 扫描 placeholder |
| local assignment 始终隐藏；低熵不进 corpus | 满足 | `detectAssignmentSpansV2` 与 `isGenericAssignmentEligibleV2` 分离；LOCAL-001 测试 |
| eligibility：8–512 bytes、comparison key 仅用于资格 | 满足 | `comparisonKeyV2` 仅在 eligibility；matcher 用原值 `indexOf` |
| exact-text Unicode 边界；path 完整 POSIX segment | 满足 | `\p{L}|\p{N}|\p{M}|\p{Pc}`；`path.split('/').includes(segment)`（非路径子串 `includes`） |
| phone accept/reject/local-only truth table | 满足 | `sensitive-phone-v2.ts` + phone fixtures/tests；bare Unix 无 cue → `local-only` 不传播 |
| ranking key 保守 superset；无 corpus/retained/matchedText | 满足 | `projectPublicSafeRankingKeyV2` 仅 file/symbol；≥8-byte segment/symbol 折叠 |
| dormant assembler 内部建 corpus；无 caller corpus | 满足 | `assembleSuccessV2` → `collectSensitiveCorpusV2(input)` + `redactPublicFieldForSourceV2`；clone/foreign 拒绝 |
| 无 F1B/F1C/F2/F6 import；无 forward ABI 预占 | 满足 | no-cutover marker 扫描；source graph 仅 public-output 内部 |
| no-cutover / 不改 schema·placeholder·reason enum | 满足 | package 不可达 v2；contract 常量未扩 enum |
| 同一 value 展开 exact-text + path-segment；bytes 计两次 | 满足 | `PROPAGATION_MODES` 展开与 `totalUtf8Bytes` |

未发现与 design「明确不做」冲突的扩范围实现（无 budgets、无 production cutover、无第三方扫描库）。

## 3. Code Quality

- 正确性：span→merge→materialize 主路径清晰；assembler 异常归一 `INTERNAL_ERROR`；corpus provenance 用 WeakSet/WeakMap 绑定同次 source，符合 dormant seam
- 安全：跨字段传播与 local 分离；path 禁止任意子串；placeholder 不回扫；hostile 值均为合成 fixture
- 可维护性：原 500+ 行 façade 拆为 contract/span/detector/corpus/phone/materializer/ranking-key，导出仍集中在 `sensitive-value-policy-v2.ts`，符合 design §2.5
- 测试：runner 已登记 7 个 F1A case；核心 truth table / boundary / provenance / no-cutover / Golden projection 有覆盖；见 Findings important 中的薄覆盖点
- 清洁度：F1A `src/evidence/public-output` 无 TODO/FIXME/debug 输出/真实凭证

## 4. Gate / Provider Warnings

必须解释的三项：

1. **cleanliness TODO（ambient）**  
   scope-gate warning：`cleanliness marker TODO in .codestable/features/2026-07-24-cross-platform-ci-baseline/cross-platform-ci-baseline-checklist.yaml`。  
   命中点是该 ambient checklist 条目文案中的「临时TODO」字样，**不是 F1A 源码/测试**。属 baseline 噪声，不构成 F1A blocking。

2. **CMD-DIFF-CHECK non-core exit 2**  
   DoD 记录：`test/unit/public-output-v2-redaction.spec.ts:658: new blank line at EOF.`（supporting / non-core）。  
   审查时复核：`git diff --check -- test/unit/public-output-v2-redaction.spec.ts` 已 exit 0，文件末尾无多余空行。视为 gate 快照时的已知瑕疵，**当前工作区已修复**；不升级为 blocking。

3. **archguard / meta-cc unavailable**  
   evidence pack providers：`archguard binary not found on PATH`；`meta-cc summary not found`。  
   二者为可选 provider，不替代本独立 code review 与已通过的 core DoD 命令；记录为环境缺口，不阻塞本轮 verdict。

其余：全部 core 命令（build/typecheck/F1A unit/v2 unit+golden/no-cutover/全量 unit+golden/mcp/docs）exit 0；scope-gate `passed`。

## 5. Findings

### blocking

none

### important

- [ ] REV-001 `test/unit/public-output-v2-redaction.spec.ts` / `testkit/fixtures/public-output-v2/span-redaction-v2.ts` F1A-SPAN-001 fixture 矩阵未完全落地到断言
  - Evidence: fixtures 定义了 `combining`、`isolatedHigh`、`isolatedLow`、`lf`，但 `span-redaction` case 实际只断言 emoji merge、CRLF 扩展与 empty-reason fail-closed
  - Impact: Unicode/孤立 surrogate/LF 的 blocking fixture 意图未在稳定 case 中证伪；不影响已覆盖的 merge/CRLF 主路径，但降低 C1/C2 验收可信度
  - Expected fix scope: 在 span-redaction（或等价稳定 case）补齐上述 fixture 的坐标/merge/fail-closed 断言；勿扩生产行为

- [ ] REV-002 `test/unit/public-output-v2-redaction.spec.ts` F1A-RANKKEY-001 mutation 覆盖偏薄
  - Evidence: 现测 7/8/512/513 bytes、本地敏感 identifier、幂等；design 还要求对合法 corpus entry 做插入/删除/排列 mutation，并验证 raw/safe 序相反与 collision 折叠
  - Impact: 实现按「≥8-byte segment/symbol 一律折叠」在构造上已是保守 superset，但 mutation 证据不足时 QA 难以反查 C29
  - Expected fix scope: 加强 ranking-key 测试矩阵；无需改 projection 算法除非测出漏洞

### nit

- [ ] REV-003 `src/evidence/public-output/sensitive-phone-v2.ts:26-29` `isStructuredPhone` 内空 `if` 分支无作用，可删以免误导
- [ ] REV-004 `detectUnpairedSurrogateSpansV2` 已导出但未挂入 `detectLocal*SpansV2`；文本/文件 unpaired 走 `containsUnpairedSurrogate` 整字段 oversized 分支。行为安全，但与「孤立 surrogate 作为 span」表述略不一致，建议在注释或测试中标明策略
- [ ] REV-005 design §3.2 将 `fixture-ownership.yaml` 列为 manifest owner，但该文件 schema 只服务 golden successCases，未登记 F1A unit case；实际登记在 `runner-registry.ts`。建议 acceptance 时确认 owner inventory 以 runner+fixture 文件为准，或回写 design inventory

### suggestion

none

### learning

- path corpus 的正确写法是「分段后 `includes(segment)`」，不是对整路径做子串 `includes`；审查时勿把 `path.split('/').includes` 误判为旧漏洞回归

### praise

- local / propagation 分离与 assembler provenance（`redactPublicFieldForSourceV2` + WeakMap）干净，直接消掉 caller 注入/clone corpus 攻击面
- façade 薄 re-export + 内部 deep module 拆分与 design §2.5 一致，后续 F1B guard 接入点清晰

## 6. Test And QA Focus

QA 必须重点复核：

- F1A-SPAN-001：combining mark、孤立 surrogate、LF/CRLF 与 empty-reason（对应 REV-001）
- F1A-RANKKEY-001：合法 corpus entry mutation 后 key 永不含可能被隐藏的 raw code units（对应 REV-002）
- F1A-LOCAL-001 / ELIGIBILITY / TEXT-BOUNDARY / PATH-SEGMENT：低熵不传播、完整 segment 整路径脱敏
- F1A-PHONE-001 / NEG：accept 表与 date/semver/uuid/timestamp/bare unix；`local-only` 可本地隐藏但不进 corpus
- F1A-PROJECTION / Golden forbidden+over-redaction scan
- F1A-NOCUTOVER：production 无 v2 edge；public-output 无 F1B/F1C/F2/F6 marker
- Gate warnings：确认 ambient TODO 与已修复的 EOF blank line 不再污染 F1A cleanliness 结论

建议加强的测试：见 REV-001、REV-002。  
不能单靠 review 完全确认的点：全量 permutation 跨 detector 顺序的生产级穷举（现有 Golden/determinism 部分覆盖，作 residual）。

## 7. Verdict

- Status: **passed**（blocking = 0）
- Important: 2（REV-001、REV-002）——作为 QA focus，不阻塞进入 Goal lane QA；若实现侧愿在 review-fix 前补测更佳
- Nit: 3
- Next: Goal feature → `cs-feat` QA 阶段；checklist checks（C1–C33）由 QA/acceptance 关闭
- Focused Closure: none
