---
doc_type: feature-qa
feature: 2026-07-24-public-result-resource-budgets-v2
status: passed
runner: subagent
reviewed: 2026-07-28
---

# public-result-resource-budgets-v2 QA 报告

## 1. Scope / Feature Kind

- Feature: `2026-07-24-public-result-resource-budgets-v2`（F1B）
- Kind: mixed（dormant v2 公共边界资源预算 = 安全功能路径 + 合同/测试硬化）
- Design: `public-result-resource-budgets-v2-design.md`（`status: approved`）§3 验收场景
- Checklist: S1–S5 `done`；C1–C33 仍 `pending`（acceptance 关闭）
- Review: `status: passed`；Important REV-001/REV-002 为本轮 QA focus
- Evidence pack / gate / DoD: 已读；gate `passed`，blocking 空；providers archguard/meta_cc unavailable 不阻塞
- Diff basis: contract leaf、guards、assembler 接线、schema refine、F1B fixtures/spec、runner-registry、no-cutover inventory
- Baseline dirty: `.github/workflows/cross-platform-ci.yml`、`cross-platform-ci-baseline/*`、`dist/**` 等非 F1B ambient；结论只覆盖 F1B 可归因改动
- Core evidence gate: raw/corpus/public-field/serialized 预算、ordering/projection/legacy isolation、maximum-structure headroom、no-cutover；必须有真实命令证据。F9 前无 production v2 transport，不要求 e2e cutover

## 2. Verification Matrix

| ID | 来源 | 核心性 | 场景 / 风险 | 证据类型 | 命令或动作 | 期望 | 结果 |
|---|---|---|---|---|---|---|---|
| QA-BUILD | checklist CMD-BUILD | core | 编译 | command | `npm run build` | exit 0 | pass |
| QA-TYPE | checklist CMD-TYPECHECK | core | 类型 | command | `npm run typecheck` | exit 0 | pass |
| QA-F1B-UNIT | design §3.2 / CMD-F1B-UNIT | core | 9 个 F1B case | unit | F1B multi-case | 16 tests pass | pass |
| QA-V2-UNIT | CMD-V2-UNIT | core | public-output-v2 全组 | unit | `--group public-output-v2` | 74 pass | pass |
| QA-V2-GOLDEN | CMD-V2-GOLDEN | core | Golden 投影 | golden | `test:golden --group public-output-v2` | 7 pass | pass |
| QA-NOCUTOVER | F1B-NOCUTOVER-001 / C26 | core | production 无 v2 edge | unit | `no-cutover-import-inventory` | 3 pass | pass |
| QA-DOCS | CMD-DOCS | supporting | docs smoke | command | `npm run test:docs` | smoke passed | pass |
| QA-CORPUS | F1B-CORPUS-001 / C11 | core | entry/count/derived；双 mode 不去重 | unit | `corpus-resource-budgets` | 稳定 case pass | pass |
| QA-REV001 | review REV-001 | supporting→已补证 | corpus 总字节 32767/32768/32769 | focused assert | `npx tsx` 内联 guard 断言 | N/N+1 行为成立 | pass（稳定 case 仍薄，见 residual） |
| QA-REV002 | review REV-002 | supporting | counter array length short-circuit | unit + diff | compact N/N+1 / poison / fail-closed | fail-closed 成立；无 short-circuit | residual-risk |
| QA-ORDER | F1B-ORDERING-001 / C21 | core | poison/accessor/Proxy/permutation | unit | `resource-budget-ordering` | 含于 F1B 16 pass | pass |
| QA-PROJ | F1B-PROJECTION-001 / C18/C22 | core | fixed INTERNAL_ERROR；forbidden scan | unit | `resource-budget-projection` | 含于 F1B 16 pass | pass |
| QA-LEGACY | F1B-LEGACY-ISOLATION-001 / C33 | core | v2 failure 不改 v1 bytes | unit | `resource-budget-legacy-isolation` | 含于 F1B 16 pass | pass |
| QA-MAX | F1B-MAX-STRUCTURE-001 / C19 | core | 4MiB/1MiB headroom > 0 | unit | `maximum-structure-budget` | 含于 F1B 16 pass | pass |
| QA-CLEAN | checklist cleanliness | supporting | debug/TODO/凭证/夹带 | diff scan | F1B 源码 rg + `git diff --check` | 无命中 / exit 0 | pass |

## 3. Command Evidence

| # | 命令 | exit | 摘要 |
|---|---|---|---|
| 1 | `npm run build` | 0 | tsc build/cli 通过 |
| 2 | `npm run typecheck` | 0 | `--noEmit` 通过 |
| 3 | `npm test -- --group public-output-v2 --case resource-budget-primitives --case raw-resource-budgets --case corpus-resource-budgets --case public-field-resource-budgets --case serialized-resource-budget --case maximum-structure-budget --case resource-budget-ordering --case resource-budget-projection --case resource-budget-legacy-isolation` | 0 | 16 passed / 239 skipped |
| 4 | `npm test -- --group public-output-v2` | 0 | 74 passed / 181 skipped（6 files） |
| 5 | `npm run test:golden -- --group public-output-v2` | 0 | 7 passed / 65 skipped |
| 6 | `npm test -- --group public-output-v2 --case no-cutover-import-inventory` | 0 | 3 passed / 252 skipped |
| 7 | `npm run test:docs` | 0 | Docs smoke passed |

聚焦补充（review QA focus，非 registry case）：

| 命令 | exit | 摘要 |
|---|---|---|
| `npx tsx` 临时脚本：`guardSensitiveCorpusBudgetV2` 对 total 32767/32768/32769 | 0 | `FOCUSED PASS: REV-001 corpus total 32767/32768/32769` → `{"32767":{"ok":true},"32768":{"ok":true},"32769":{"ok":false,"stage":"corpus"},"entryCounts":[64,64,65]}` |

未运行（本轮用户指定 QA 命令集之外；DoD 历史已绿，不阻塞本报告）：

- `npm test` / `npm run test:golden -- --all` / `npm run test:mcp -- --all` → 记为 DoD 既有证据；acceptance 可复跑

## 4. Core Path Evidence

- Primitives / raw：UTF-8 leaf、compact JSON accepted-subset parity、terms/evidence/file/symbol/excerpt N/N+1、400k spaced excerpt 整字段 oversized（F1B unit）
- Corpus：稳定 case 覆盖 128/129、entry 7/8/512/513、derived match/mismatch、双 mode 不去重；聚焦命令补证 aggregate 32767 pass / 32768 pass / 32769 fail-closed
- Public field：placeholder、`resolvable=false`、LOCATION_REDACTED 一次派生、ordinal 不重排（public-field case）
- Serialized / max structure：1MiB N/N+1 + headroom 为正且未调常量
- Ordering：poison-tail 不读超限 element；accessor getterCalls=0；Proxy fail-closed；key permutation 等值
- Projection / legacy：各 stage 固定 safe INTERNAL_ERROR；forbidden 无 stage/bytes/path/raw；v1 engine bytes 不变
- No-cutover：import inventory + docs smoke；production 仍为 v1

## 5. Findings

### failed

none

### blocked

none

### residual-risk

- RR-001（REV-001）：稳定 runner `corpus-resource-budgets` 仍无 32767/32768/32769 owner 断言；行为已由 QA 聚焦命令证实且其余 corpus 预算 case 全绿。建议后续把聚焦断言升格进稳定 fixture/case（非本轮核心缺口）
- RR-002（REV-002）：`countArray` 仍先 `Reflect.ownKeys` 全量校验再 abort-at-N+1，缺相对 `maxUtf8Bytes` 的 length short-circuit。现有 compact N/N+1、poison、rejected-graph 证明 fail-closed 仍成立；dormant + 无 production v2 edge，现实利用面限于测试/未来 F6 接线前。acceptance 可接受或排后续 hardening
- RR-003（REV-003/004/005）：term 总字节矩阵近似值、public field 多字节边界偏弱、F1A/F1B corpus entry 常量双源——review nit，不阻塞
- RR-004：工作区 ambient dirty（cross-platform-ci / dist）继续按 scope-allow 对账，避免夹带

## 6. Cleanliness

- Debug output: pass
- Temporary TODO/FIXME/XXX: pass（F1B 源码无命中）
- Commented-out code: pass
- Unused imports / dead code from this feature: pass（目视）
- Out-of-scope files: pass（ambient 已隔离记录）
- `git diff --check`（F1B 关键路径）: pass

## 7. Verdict

- Status: passed
- Residuals: RR-001（稳定 case 缺 32KiB N/N+1 owner）、RR-002（counter length short-circuit）、RR-003（nits）、RR-004（ambient dirty）
- Next: `cs-feat` acceptance 阶段
