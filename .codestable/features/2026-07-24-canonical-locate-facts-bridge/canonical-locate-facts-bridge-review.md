---
doc_type: feature-code-review
feature: 2026-07-24-canonical-locate-facts-bridge
status: passed
reviewer: subagent
round: 1
reviewed: 2026-07-28
---

# canonical-locate-facts-bridge 代码审查报告

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-24-canonical-locate-facts-bridge/canonical-locate-facts-bridge-design.md`（approved）
- Checklist: `canonical-locate-facts-bridge-checklist.yaml`（S1–S5 均为 done）
- Evidence pack: `canonical-locate-facts-bridge-evidence-pack.md`（DoD/gate passed，blocking 空）
- Gate results: `canonical-locate-facts-bridge-gate-results.json`（passed）
- DoD results: `canonical-locate-facts-bridge-dod-results.json`（passed）
- Scope: `canonical-locate-facts-bridge-scope-gate.json` + `canonical-locate-facts-bridge-scope-allow.txt`（passed）
- Diff basis: F1C 核心为新增 `src/contracts/v2/locate-fact-envelope-v2.ts`、`src/evidence/canonical/*`、`src/evidence/locate-execution/*`，以及修改 `repository-evidence-engine.ts` / `evidence.module.ts` / `src/index.ts` 与对应 tests/testkit
- Review mode: initial（Lane A independent-agent）
- Baseline dirty files: 工作区另有跨平台 CI、F1B budgets、dist、其他 feature 产物等 ambient dirty；本结论仅归因 F1C 上述路径

### Independent Review

- Detection: 本报告为独立 subagent Lane A；OCR Lane B 不在本任务范围
- 环节 A: independent-agent / completed
- 环节 B: skipped（本任务仅 Lane A）
- Merge policy: Lane A 结论已基于 design/checklist/evidence 与源码逐文件核验
- Gate effect: reviewer=subagent，无 blocking

## 2. Diff Summary

- 新增：fact envelope/inspector/builder；capability/token registry；canonical executor；v1 projector；private DI tokens；neutral preparation port/registrars；finalizer/composer；trusted serialization；test-only shadow projector/harness；reachability helper；F1C fixtures/specs/harness
- 修改：`RepositoryEvidenceEngine` 薄 façade；`EvidenceModule` 唯一 v1 projector binding；`src/index.ts` 移除 concrete engine export；既有 unit/Golden 迁移至 testkit harness
- 删除：none（行为上移除 package 对 concrete engine 的公开构造面）
- 风险热点：execution/representation seam、typed absence/finalizer fail-closed、no-cutover runtime reachability、v1 deep-exact parity

## 3. Adversarial Pass

- 假设的生产 bug：第二次 backend/reader 执行，或 production 经 DI/import 触达 shadow/composer/public v2 schema
- 主动攻击过的反例：
  - façade 是否只 issue 一次 capability 并只 `execute` 一次
  - success envelope fragments 是否真 empty（非占位 owner）
  - missing-first 是否在读 value 前按四 prerequisite 停止
  - aggregation 是否 fresh-builder exact-add 后绑定 private complete envelope
  - fixed-safe error 是否未接入 production/shadow failure
  - package/DI/reachability denylist 是否覆盖 canonical + locate-result-v2 + public-output
- 结果：未升级为 blocking；错误文案双份与 DI shadow 探测偏弱记入 important/residual

## 4. Findings

### blocking

none

### important

- [ ] REV-001 `src/evidence/canonical/trusted-serialized-locate-result-v2.ts` 与 `src/evidence/public-output/public-result-assembler-v2.ts`
  - Evidence: design KD14 要求 fixed-safe error「复用 F1 strict mapping」；实现内联复制四 code 文案，assembler 侧 `createSafeErrorV2` 仍为 private，未抽共享入口
  - Impact: F9/后续改文案时可能只改一侧导致 v1/v2 safe-error 漂移；当前有 `canonical-safe-error-serialization` case，故不阻塞本轮
  - Expected fix scope: 可选抽出共享 F1 safe-error factory；可延后到 F9 projector cutover 前

- [ ] REV-002 `test/unit/di.spec.ts` F1C-DI-001
  - Evidence: shadow 缺席断言依赖 `Object.getPrototypeOf(application)` 属性名拼接，对 Nest provider inventory 几乎无证明力；真正证据仍是 `evidence.module.ts` 源码与 projector instanceof
  - Impact: 若未来误注册 shadow provider，该断言未必失败
  - Expected fix scope: 改为读取 module providers/exports 清单或 token 解析失败断言；可延后，不阻塞 QA

### nit

- [ ] REV-003 `src/evidence/locate-execution/canonical-locate-executor-v2.ts:709-731` `terminalSuccess(redactLocateResult({...` 缩进不一致，可读性差，不影响语义

### suggestion

- [ ] REV-004 多文件重复 `createOpaqueBrand()`；若后续 token 种类继续增加，可集中到 private helper，非本项必须

### learning

- no-cutover 已从「禁全部 v2 目录」升级为 AST runtime-edge denylist（`canonical/` + `locate-result-v2` + `public-output/`），同时允许 fact contract / executor / capability registry 合法可达
- synthetic complete 只证明 neutral registrar→finalizer→composer→schema→serializer 接口链，不得记为 real owner readiness

### praise

- façade / executor / v1 projector 边界清晰：projector 只恢复 token 并返回 `legacyV1Projection` 同一引用
- prerequisite inspector missing-first + 拒绝预置 backend/request-outcome；aggregation fresh complete envelope；finalizer 只读 completion token
- EvidenceModule 仅导出 service/reader，不注册 shadow；package root 已去掉 concrete engine

## 5. Test And QA Focus

- QA 必须重点复核：用户指定的 F1C unit/Golden/package/docs 命令集（含 single-execution、v1-shadow isolation、transport reachability、package declaration）
- Evidence pack residual risks：pack 记 none；本审查补充错误文案双份与 DI inventory 断言强度
- 建议加强：DI providers/exports 精确 inventory（对应 REV-002）
- 不能靠 review 完全确认：全量 MCP/跨平台矩阵（属 S5/DoD 已跑证据与后续 F4，不在本 Lane A 重跑范围）

## 6. Residual Risk

- synthetic complete ≠ F2–F8 real producer/shadow readiness；F1C base real success 仍缺四 prerequisite
- fixed-safe error 文案与 assembler 双份维护（REV-001）
- executor ~832 行，design 已声明不在本项拆分；后续 cs-refactor 风险
- 工作区存在 F1C 范围外 ambient dirty；acceptance 需继续用 scope allow 对账
- 本地不能替代后续跨平台 matrix（design 基线假设）

## 7. Verdict

- Status: passed
- Next: Goal lane → Independent QA（Task 2）

## 8. Focused Closure

none
