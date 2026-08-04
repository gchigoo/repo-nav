---
doc_type: feature-acceptance
feature: 2026-07-24-public-beta-release
status: passed
audit_state: completed
audit_reason: ""
auditor_id: ""
acceptance_authorization_ref: approval-report.md#goal-acceptance
accepted: 2026-07-31
round: 1
---

# public-beta-release 验收报告

> Goal 授权：`ResumeGoalAcceptance approval-report.md#goal-acceptance`（F9 owner-stop 已覆盖 cutover / license / private 保留；不推导 publish/tag/merge）

## 1. 契约核对
- [x] F1A–F8 current-revision acceptance 全部 done；F8 accepted complete-real shadow 为 F9 唯一 success 依赖
- [x] `LOCATE_RESULT_PROJECTOR` 唯一 production binding 原子切为 `V2LocateResultProjector`；EvidenceModule 注入 F8 `ACCEPTED_COMPLETE_REAL_LOCATE_SHADOW_ORCHESTRATOR_V2` ready singleton；无 env/request/backend/transport 条件选择
- [x] legacy v1 lane 删除：`legacyV1Projection`、V1 projector/redactor/error mapper 从 production runtime/DI/package root 不可达
- [x] service/MCP/debug CLI 共享 same-execution trusted transport receipt；exact value + compact JSON + F1B proof + capability 绑定 opaque receipt
- [x] `0.2.0-beta.1`、`private:true` 保留；MIT LICENSE + SECURITY.md；Node `^22 || ^24`；single shrinkwrap + fresh source-to-emit CLI closure
- [x] `F9-PACK-001` 进 `PLATFORM_CONTRACT_IDS_V1` 与 production snapshot；五 marker + candidate/semantic/closure 三 hash 六格
- [x] ReleaseCandidateIdentityV1（acceptance freeze）：`candidateIdSha256=37655261e01ad6b554773ab67af61966b0a99f5c8cdccfc0b32f70addc578339`；`designRevisionSha256=7753006032fa60b7574cb25c722f8ead3670e3cea6117060e8966c54adf70893`；`sourceTreeSha256=5d262d5b41bed2d87be1c6ec44c8e5702b5cfc6bf7b155197ad7c776736f96bc`
- [x] owner gates：license/security final actions + advisory dispositions（GHSA-frvp-7c67-39w9、mcp→hono unreachable/accept-beta-risk）re-signed `2026-07-31T01:34:45.919Z`（checklist C* flip 后 designRevision 重算）；`release:owner-actions:check` residuals `[]`
- [x] 明确未执行：`private:false`、npm publish、git tag、merge to main、GitHub Release

## 2. 场景证据
| 场景 | 结果 | 证据 |
|---|---|---|
| projector-cutover / transport-receipt / single-execution / no-v1 | passed | F9 unit 25 + boundary CMD |
| version-sources / CLI closure / package-api / metadata | passed | package:* checks + unit |
| lint / format / design-revision / owner-preflight | passed | S3 CMD + MIT LICENSE |
| pack / install / closure / audit / SBOM / large | passed | S4 + F9-LARGE |
| F9-PACK-001 platform + six-cell | passed | push CI run `30506332626` success；`sixCellEvidenceSha256=75e52c99990411b3370c410bd4e3aefad0ae133db65dd870da7dc692e4f5875e` |
| 21-ID aggregate | passed | `run-public-beta-release-contracts.mjs --all` |
| real-consumer E2E | passed | consumer `D:/Personal/ctxline`；`decisionSha256=d757bfa098b0f3e045f263cc3b48510c5c7719838ebdd5af644e7d8335d5713a`；`evidenceSha256=56e4368ab7c50fda102031223ec3d6d709f7b83246e27f0b2117b5338fd14c4b` |
| unit-all / golden-all / mcp-all / docs / platform | passed | QA + HEAD `9babeaf` push CI |
| DoD / gate / evidence pack | passed | dod-runner passed（CMD-UPSTREAM-UNIT Windows EPERM 加固后复验）；scope-gate / evidence-pack passed；CMD-DOCTOR 非 core warning（历史 review P1） |

## 3. Checklist / Gates
S1–S5 done；C1–C68 passed；scope/dod/evidence-pack passed；review passed（round 3，blocking 0）；QA passed（round 1）。

## 4. 回写
- `repo-nav-public-beta-items.yaml` → `public-beta-release` done
- architecture：`system-repo-nav-foundation.md` 记 F9 production v2 cutover / private:true / F9-PACK-001 六格 / owner gates
- `goal-features/public-beta-release.md` → accepted
- goal-state：`public-beta-release` → accepted；goal complete（12/12）

## 5. Residual
- REV-004 owner-only gates 文件曾缺失（round 3 residual）；runtime owner-actions/advisory/confirmation 已补齐并校验，acceptance 记 closed-at-evidence
- REV-005 v1 redactor/error policy 符号仍可能在 testkit/legacy test corpus 树内但 production 不可达
- REV-008 design §3.1 深度 / aggregate multi-command 断言强度（important/nit）
- REV-007 `serializeLocateToolOutput` 旁路风险（nit，沿用 review）
- F5–F8 远程六格同 revision marker 仍为各 feature deferred；F9 六格已由 push run `30506332626` 归档
- npm name ownership / live authenticated publish identity 未验证；`private:true` 保留至独立 owner 授权

## 6. Governance 边界
- 本验收 **不** 移除 `private:true`、**不** `npm publish`、**不** 创建 tag、**不** merge/push main
- runtime JSON（`.codestable/runtime/*`）保持 untracked，不进 artifact
- 下一动作需独立 owner 授权：private 移除、publish、tag、GitHub Release

## 10. 最终审计
- 验证证据来源：`public-beta-release-qa.md` + acceptance freeze re-verify
- Evidence：`public-beta-release-evidence-pack.md` / `*-dod-results.json` / `*-gate-results.json`
- 聚合命令：DoD core 全绿；six-cell assert ok（run `30506332626`）；owner-actions check ok；real-consumer E2E ok
- 场景复核：re-verified 核心 CMD；trust-prior-verify=远程六格/F5–F8 deferred marker
- 交付物 / roadmap / architecture：已落盘
- 完整工作区：acceptance 产物 + format/flake 修复在 scope allow 内
- 结论：通过

## Verdict
Acceptance **passed**（`ResumeGoalAcceptance approval-report.md#goal-acceptance`）。F9 production v2 cutover 与 `0.2.0-beta.1` release candidate 证据闭环；publish/tag/merge/`private:false` 不在 scope，需独立 owner 授权。
