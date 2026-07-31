---
doc_type: feature-review
feature: 2026-07-24-public-beta-release
status: passed
reviewer: subagent
reviewer_id: independent-task-agent-f9-public-beta-release-r2
round: 3
reviewed: 2026-07-29
lane_a_state: completed
lane_a_ref: ""
lane_a_reason: ""
lane_b_state: unavailable
lane_b_ref: ""
lane_b_reason: "lane_b unavailable (ocr LLM endpoint unconfigured / not runnable this round)"
---

# public-beta-release 代码审查报告（round 3 / focused closure）

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-24-public-beta-release/public-beta-release-design.md`（`status: approved`）
- Prior review: `public-beta-release-review.md` round 2，`status: changes-requested`，唯一 blocking REV-002 still open
- Review mode: focused closure（只核验 REV-002 是否关闭；REV-001/003 沿用 round 2 closed）
- Diff basis（归因本轮 fix）:
  - `testkit/manifests/coverage/fixture-ownership.yaml` 新增 `publicBetaRelease` 21 ID
  - `testkit/manifests/release-v2/release-case-manifest-v2.json` 每 case 含 fixture/assertion/runner/contractOwners
  - design 表缺失 contract owner 文件已落地（见 Findings）
  - `tools/release/run-public-beta-release-contracts.mjs` 执行前 path + ownership deep-exact
  - F9-LARGE assertion → `test/golden/large-synthetic-repository.spec.ts`
- Verification（只读，短）:
  - `node -e` manifest path 校验 → caseCount 21 / incomplete none / missing none / exit 0
  - ownership `publicBetaRelease` → 21 ID，与 REQUIRED_IDS 一致 / exit 0
  - `node tools/release/assert-production-runtime-boundary.mjs` → `{"ok":true,"deleted":4,"scanned":5}` / exit 0
  - 抽查 aggregate：`assertPathsExist` + ownership ID set 校验均在 `spawnSync` 执行循环之前；缺失 `fail()` → exit 1
- Lane B: `unavailable`（与 round 1/2 相同）

### Independent Review

- Detection: 本报告为独立 Task agent Lane A（round 3 focused closure）
- Merge policy: 仅 Lane A；保留首次/完整复审 `reviewer: subagent`；不得伪装 `subagent+ocr`
- Gate effect: blocking=0 → `passed`

## 2. Diff Summary（相对 round 2 REV-002）

| 焦点 | round 2 | round 3 |
|---|---|---|
| `fixture-ownership.yaml` `publicBetaRelease` | 零命中 | 21 F9-* 已登记 |
| manifest `fixture/assertion/runner/contractOwners` | 仅 id/group/case/surface | 四字段齐全且路径存在 |
| design contract owner 文件 | 多份缺失 | 6 个目标路径均存在 |
| aggregate path deep-exact | 无 | 执行前校验，缺失非 0 |
| F9-LARGE assertion | `public-beta-release-large.spec.ts` 漂移 | `test/golden/large-synthetic-repository.spec.ts` |

## 3. Adversarial Pass

- 攻击目标：ownership 仍可伪绿（文件落地但未登记 / 路径虚挂 / aggregate 不校验）
- 反例结果:
  1. ownership 21 ID 与 manifest / `REQUIRED_IDS` 集合一致
  2. 全量 path 扫描：四类字段无 incomplete、无 missing
  3. design 表 6 个缺失 owner：`Test-Path` 全 true
  4. aggregate 源码：path 校验 + ownership 校验均在 case 执行前；`fail` → `process.exit(1)`
  5. F9-LARGE-001 `assertion[0]` = `test/golden/large-synthetic-repository.spec.ts`（文件存在且含 `F9-LARGE-001` 用例）
- 结论：REV-002 五项关闭标准全部满足

## 4. Findings

### blocking

none

### important

- [x] REV-001 Stable ID stub / 假阳性 — **closed**（round 2；本轮未重开）
- [x] REV-002 `fixture-ownership.yaml` + design §3.2 ownership / contract owner exact 路径 — **closed**
  - Evidence:
    1. `fixture-ownership.yaml` 含 `publicBetaRelease`，覆盖 21 个 F9-* ID（与 REQUIRED_IDS 完全一致）
    2. `release-case-manifest-v2.json` 21 case 均有非空 `fixture`/`assertion`/`runner`/`contractOwners`；`node -e` 校验全部路径存在
    3. design 表缺失文件均存在：`tools/release/assert-production-runtime-boundary.mjs`、`tools/ci/assert-public-beta-package-evidence.mjs`、`tools/release/build-package-candidate.mjs`、`tools/release/create-release-readiness.mjs`、`test/docs/public-beta-release.spec.ts`、`testkit/manifests/performance/large-synthetic-repository-v2.yaml`
    4. `run-public-beta-release-contracts.mjs` L173-214：执行前 `assertPathsExist` + `publicBetaRelease` ID set deep-exact；缺失调用 `fail` → 非 0
    5. F9-LARGE assertion owner = `test/golden/large-synthetic-repository.spec.ts`
  - Residual（不升级 blocking）: REV-008 深度 / multi-command 仍属 acceptance 关注点
- [x] REV-003 release CMD placeholder / aggregate skeleton / real-consumer wiring — **closed**（round 2；本轮未重开）
- [ ] REV-004 owner-only gates 文件缺失（residual）
- [ ] REV-005 v1 redactor / error policy 符号仍在树内（residual）
- [x] REV-006 `tsconfig.cli.json` — **closed**（round 2）
- [ ] REV-008 design §3.1 深度 / aggregate multi-command 缺口（residual；非 stub）

### nit

- [ ] REV-007 `serializeLocateToolOutput` 旁路风险（沿用 round 2）

### suggestion

none

### learning

- ownership 闭环 = yaml 登记 + manifest 四路径字段存在 + aggregate 执行前 fail-closed；三者缺一即可伪绿。

### praise

- aggregate 将 path/ownership 校验前置到 spawn 之前，缺失即非 0，符合 REV-002 expected fix。

## 5. Test And QA Focus

- QA：实际 tgz→clean install、remote six-cell、owner confirmation 后的 full real-consumer
- 可选：故意删一个 ownership path 后跑 aggregate，确认 exit≠0（本轮未跑完整 `--all`）
- 不能靠 review 确认：foreign-repo consumer、远程 workflow six-cell

## 6. Residual Risk

- Lane B OCR unavailable
- REV-004 / REV-005 / REV-008：acceptance 前建议清或显式 residual
- 本轮未跑完整 `--all`（约 10min）；路径存在性与 boundary CMD 已短校验通过

## 7. Verdict

- Status: passed
- Blocking count: 0
- REV-001: closed
- REV-002: closed
- REV-003: closed
- Next: 进入 Goal lane QA / acceptance（`cs-feat`）；不得再以 REV-002 阻塞 review-fix

## 8. Focused Closure

| ID | State | Evidence |
|---|---|---|
| REV-001 | closed | 沿用 round 2；本轮无回退证据 |
| REV-002 | closed | ownership 21 ID + manifest 四字段路径全在 + 6 contract owner 文件存在 + aggregate 执行前 path/ownership fail-closed + F9-LARGE assertion 指向 `large-synthetic-repository.spec.ts` |
| REV-003 | closed | 沿用 round 2；本轮无回退证据 |

- Attributed delta: ownership yaml / release-case-manifest-v2 / aggregate runner / 6 个 design contract owner 路径 / LARGE assertion 对齐
- Targeted verification: manifest path `node -e` exit 0；ownership 21 ID exit 0；`assert-production-runtime-boundary.mjs` exit 0；aggregate 源码 path 校验前置已抽查
- Classification: test/docs/type/metadata/nit-only ownership 闭环；未改变生产 locate 行为或公开 API 语义
