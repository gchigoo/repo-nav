---
doc_type: feature-qa
feature: 2026-07-24-public-beta-release
status: passed
qa_runner: local
reviewed: 2026-07-29
---

# public-beta-release QA 报告

## 1. Scope And Inputs

- Design: `public-beta-release-design.md`（approved）
- Checklist: S1–S5 `done`；C* 仍由 acceptance 翻转
- Review: round 3 `status: passed`，blocking=0；REV-001/002/003 closed
- Feature 性质: Mixed（production cutover + package/release governance）
- Baseline dirty: F9 工作树大面积未提交改动，全部归因本 feature

## 2. Verification Matrix

| Command / Case | Result | Notes |
|---|---|---|
| `npm run typecheck` | pass | exit 0 |
| `npm run build` | pass | exit 0 |
| `npm run lint` | pass | exit 0 |
| `npm run format:check` | pass | exit 0 |
| `npm test -- --group public-beta-release` | pass | 25 passed |
| `node tools/release/run-public-beta-release-contracts.mjs --all` | pass | 21 ID；path/ownership 前置校验 |
| `npm run test:golden -- --group public-beta-release --case large-release-boundaries` | pass | F9-LARGE |
| `npm run package:metadata:check` | pass | |
| `npm run package:lock:check` | pass | |
| `npm run package:emit:check` | pass | sourceCount=175 |
| `npm run package:closure:check` | pass | nodes=112 edges=182 |
| `npm run security:sbom:check` | pass | CycloneDX 1.5 |
| `npm run security:audit` | pass | high=0 critical=0（moderate/low dispositions owner residual） |
| `node tools/release/assert-production-runtime-boundary.mjs` | pass | |
| `node tools/release/create-release-readiness.mjs` | pass | private:true publishPerformed:false |
| `npm run release:owner-actions:check` | owner-block | exit 2；缺 candidate-bound owner-actions / confirmation |
| `node tools/release/run-real-consumer-e2e.mjs` | owner-block | exit 2；confirmation missing（设计预期） |
| remote six-cell / `assert-public-beta-package-evidence --require-six-cell` | residual | local-schema-only |

## 3. Review Focus Coverage

- REV-001..003：已在 review round3 closed；本轮复跑 unit + aggregate 仍绿
- cutover DI / no-v1：boundary CMD + F9-NO-V1 unit 覆盖
- ownership path deep-exact：aggregate 执行前 fail-closed
- residual（不阻断本 QA）：owner confirmation / owner-actions / remote six-cell / pack smoke 全量 / REV-005 redactor 文件仍在树内但非 public export

## 4. Cleanliness

- `private: true` 保持
- 无 publish/push/tag 脚本
- production 无 v1 projector 文件
- format/lint 零 warning

## 5. Verdict

- Status: passed
- Next: 进入 acceptance；acceptance 前 owner 必须补齐：
  1. candidate-bound owner-actions JSON
  2. RealConsumerConfirmationV1（若跑 CMD-REAL-CONSUMER）
  3. advisory dispositions（若 audit 有 moderate/low）
  4. remote six-cell safe reports（F9-PACK-001 完整六格）
- 上述 owner 输入缺失不得伪造；保持 `block-owner-*` 退出语义
