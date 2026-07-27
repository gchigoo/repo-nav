---
doc_type: feature-qa
feature: 2026-07-24-span-redaction-corpus-policy-v2
status: passed
runner: subagent
reviewed: 2026-07-27
---

# span-redaction-corpus-policy-v2 QA 报告

## 1. Scope / Feature Kind

- Feature: `2026-07-24-span-redaction-corpus-policy-v2`（F1A）
- Kind: mixed / security-hardened functional path（dormant assembler + policy façade）
- Design: `span-redaction-corpus-policy-v2-design.md` §3 验收矩阵
- Checklist / Review / Evidence / Gate / DoD / Goal feature: 同目录与 roadmap `goal-features/span-redaction-corpus-policy-v2.md`
- Diff basis: `src/evidence/public-output/*`、相关 unit/Golden/fixtures、`runner-registry.ts`；大量 `.codestable/*` 为 ambient/goal 基线
- Core path: span validate/merge/materialize、corpus eligibility/matcher、phone truth table、dormant assembler 同次 internal corpus、public-safe ranking key、no-cutover；F9 前无 production v2 transport

## 2. Verification Matrix

| ID | 来源 | 核心性 | 场景 | 证据 | 命令 | 结果 |
|---|---|---|---|---|---|---|
| F1A-SPAN-001 | design §3.1/§3.4 | core | emoji/CRLF/empty-reason；combining/孤立 surrogate/LF | unit + 聚焦断言 | `span-redaction` + focused REV-001 | pass |
| F1A-LOCAL-001 / ELIGIBILITY-001 | design §3.4 | core | 低熵 local-only；8–512/sentinel | unit | `corpus-policy` | pass |
| F1A-TEXT-BOUNDARY / PATH-SEGMENT | design §3.4 | core | exact-text 边界；整 segment 整路径 | unit | `corpus-boundaries` | pass |
| F1A-REASON / PLACEHOLDER | design §3.4 | core | reason union；literal 不回扫 | unit + Golden | v2 unit/Golden | pass |
| F1A-AMPLIFICATION-001 | design §3.4 | core | 线性上界；单 placeholder | unit + Golden | `redaction-amplification` + Golden | pass |
| F1A-PHONE-001 / NEG-001 | design §3.4 | core | accept/reject/local-only | unit | `phone-corpus-policy` | pass |
| F1A-RANKKEY-001 | design §3.4 + REV-002 | core | 7/8/512/513 + mutation/collision | unit + 聚焦断言 | `public-safe-ranking-key` + focused REV-002 | pass |
| F1A-PROJECTION-001 | design §3.4 | core | forbidden + over-redaction | Golden | `test:golden --group public-output-v2` | pass |
| F1A-NOCUTOVER-001 | design §3.4 | core | production 无 v2 edge | unit + MCP + docs | no-cutover + mcp + docs | pass |
| REV-001 | review focus | supporting→已补证 | combining / isolated / LF fixture | 聚焦 tsx 断言 exit 0 | 见 §3 focused | pass（稳定 case 仍薄，见 residual） |
| REV-002 | review focus | supporting→已补证 | ranking-key mutation 深度 | 聚焦 insert/delete/permute/collision | 见 §3 focused | pass（稳定 case 仍薄，见 residual） |
| DoD build/type/F1A/v2 | checklist dod | core | 编译与核心回归 | command | 见 §3 | pass |
| Cleanliness / scope | review + gate | supporting | ambient TODO；EOF blank | gate 快照 + 复核 `git diff --check` | 见 §5 | 无 F1A blocking |

## 3. Command Evidence

| # | 命令 | exit | 摘要 |
|---|---|---|---|
| 1 | `npm run build` | 0 | tsc build/cli 通过 |
| 2 | `npm run typecheck` | 0 | strict `--noEmit` 通过 |
| 3 | `npm test -- --group public-output-v2 --case span-redaction --case corpus-policy --case corpus-boundaries --case phone-corpus-policy --case redaction-amplification --case public-safe-ranking-key` | 0 | 11 passed / 215 skipped |
| 4 | `npm test -- --group public-output-v2` | 0 | 58 passed / 168 skipped（5 files） |
| 5 | `npm run test:golden -- --group public-output-v2` | 0 | 7 passed / 65 skipped |
| 6 | `npm test -- --group public-output-v2 --case no-cutover-import-inventory` | 0 | 3 passed / 223 skipped |
| 7 | `npm run test:mcp -- --all` | 0 | 39 passed（9 files） |
| 8 | `npm run test:docs` | 0 | Docs smoke passed |

聚焦补充（review QA focus，非 registry case）：

| 命令 | exit | 摘要 |
|---|---|---|
| `npx tsx` 内联断言：`SPAN_UNICODE_FIXTURES_V2.combining/isolatedHigh/isolatedLow/lf` + ranking-key insert/delete/permute/collision | 0 | `FOCUSED PASS: REV-001 combining/isolated/lf + REV-002 mutation/collision` |

supporting 复核：`git diff --check`（含 `public-output-v2-redaction.spec.ts`）exit 0；DoD 快照中 EOF blank 警告已不复现。

## 4. Core Path Evidence

- Span/merge/materialize：`span-redaction` 覆盖 emoji 相邻 merge、CRLF 整对扩展、empty-reason fail-closed；聚焦命令覆盖 combining mark 合并、孤立 surrogate 字段 oversized fail-closed、lone LF 坐标与 term 脱敏；成对 surrogate 中切仍 fail-closed。
- Corpus：`corpus-policy` / `corpus-boundaries` 覆盖 local-only、eligibility、exact-text 边界、path 整 segment→`[REDACTED_PATH]`。
- Phone：`phone-corpus-policy` truth table 全绿。
- Amplification / projection：unit 上界 + Golden forbidden/over-redaction。
- Ranking key：稳定 case 覆盖 7/8/512/513 与本地敏感 identifier 幂等；聚焦命令补 insert/delete/permute/collision，折叠后无 raw eligible code units。
- Dormant assembler provenance：同组 unit（含 foreign/clone corpus 拒绝）通过。
- No-cutover：import inventory 3 + MCP 39 + docs smoke；production 仍为 v1。

## 5. Cleanliness / Scope Notes

- F1A `src/evidence/public-output` / 相关 test/testkit：无真实凭证、无 debug 临时输出、无实现 TODO/FIXME。
- Gate warning：ambient checklist 文案含「临时TODO」（`cross-platform-ci-baseline`），非 F1A 源码。
- DoD 历史 warning：`CMD-DIFF-CHECK` EOF blank；QA 复核已 exit 0。
- Providers：archguard / meta-cc unavailable（环境缺口，不替代本 QA 命令证据）。
- Checklist C1–C33 仍为 `pending`（由 acceptance 关闭）；本报告不改 checklist。

## 6. Residual Risks

- RR-001：稳定 runner `span-redaction` 仍未直接断言 `combining`/`isolatedHigh`/`isolatedLow`/`lf` fixture 字段；行为已由聚焦命令证实。孤立 unpaired surrogate 走字段 oversized，而非「半 unit 坐标 fail-closed」（与成对 surrogate 中切不同）。建议后续把聚焦断言升格进稳定 case（非本轮核心缺口）。
- RR-002：稳定 `public-safe-ranking-key` 未登记完整 design 级 insert/delete/permute 矩阵；聚焦命令已覆盖并 exit 0。建议升格进 registry（非本轮核心缺口）。
- RR-003：跨 detector 全排列穷举非生产级完备；现有 determinism/Golden 部分覆盖（review 已标 residual）。
- RR-004：dormant seam；真实 MCP/CLI v2 parity 属 F9，本 feature 明确不做 cutover。
- RR-005：optional providers（archguard/meta-cc）不可用；ambient TODO 噪声仍在 scope-gate warning。

## 7. Verdict

- Status: **passed**
- Failed items: none
- Core commands: 8/8 exit 0；聚焦 REV-001/REV-002 断言 exit 0
- Residual risks: RR-001–RR-005（均非隐藏的核心验收缺口）
- Next: `cs-feat` acceptance；关闭 C1–C33；可选将 REV 聚焦断言升格为稳定 case
