---
doc_type: feature-review
feature: 2026-07-23-public-output-boundary-v2
status: passed
reviewer: subagent
reviewed: 2026-07-23
round: 6
lane_a_state: completed
lane_a_ref: /root/f1_goal_driver/f1_code_rereview_6
lane_a_reason: passed with zero blocking important or nit findings
lane_b_state: unavailable
lane_b_ref: ""
lane_b_reason: ocr CLI is installed but no valid LLM endpoint is configured
---

# public-output-boundary-v2 代码审查报告

## 1. Scope And Inputs

- Design / checklist / evidence pack / gate / DoD / implementation record：同 feature 目录 canonical artifacts。
- Diff basis：baseline `fd1d528` 到当前 unstaged/untracked implementation scope。
- Review mode：完整 re-review round 6。
- 环节 A：独立 Task agent `/root/f1_goal_driver/f1_code_review`，completed。
- 环节 A round 2：独立 Task agent
  `/root/f1_goal_driver/f1_code_rereview`，completed / changes-requested。
- 环节 A round 3：独立 Task agent
  `/root/f1_goal_driver/f1_code_rereview_3`，completed / changes-requested。
- 环节 A round 4：独立 Task agent
  `/root/f1_goal_driver/f1_code_rereview_4`，completed / changes-requested。
- 环节 A round 5：独立 Task agent
  `/root/f1_goal_driver/f1_code_rereview_5`，completed / changes-requested。
- 环节 A round 6：独立 Task agent
  `/root/f1_goal_driver/f1_code_rereview_6`，pending。
- 环节 B：OCR CLI 未配置 LLM endpoint，unavailable。
- Findings 已由主 agent 对照源码、design 和可复现反例核验。

## 2. Diff Summary

- 新增：v2 strict contract、field policy、assembler、synthetic projection、import inventory、unit/Golden tests。
- 修改：runner registry。
- 删除：none。
- 风险热点：安全输出边界、coverage cross-field truth、determinism、no-cutover。

## 3. Adversarial Pass

独立 reviewer 主动攻击 uppercase/camel/quoted secret、裸 ESC、backend ledger
contradiction、nested key insertion order、public path 和 evidence 假阳性。round 1
的 B1-B3/I1-I2 已修复；round 2 继续发现 snapshot retained-file count、
early-stop/fallback/abort truth、public display control path 与 scope inventory 漏记，
均已关闭。round 3 继续发现 public text controls、canonical ordering、
public snapshot/metadata truth 与报告计数漂移，均已进入第三轮 review-fix。
round 4 继续发现 placeholder collision 与 hostile owner evidence 缺口，均已进入
第四轮 review-fix。
round 5 继续发现 malformed secret dangling escape，可复现后进入第五轮
review-fix。

## 4. Findings

### blocking

- [x] REV-001 `src/evidence/public-output/sensitive-value-policy-v2.ts`
  identifier 分词大小写、JSON quoted key 与裸 ESC 不符合字段安全 truth table。
  - Evidence：`MY_API_KEY`、`SERVICE-AUTH-TOKEN`、`apiKey`、`ApiKey`、
    `{"password":"json-do-not-publish"}` 和裸 ESC 可原样穿过。
  - Impact：term/file/symbol/excerpt 可泄露 secret 或控制字符。
  - Expected fix scope：仅 v2 sensitive policy、assembler projection hostile tests。

- [x] REV-002 `src/contracts/v2/locate-result-v2.ts`
  backend ledger 只做粗粒度校验，矛盾 attempt 可被发布为 `ok`。
  - Evidence：`used/incomplete/output-limit` + `strategyComplete=true` 且无
    limit/degradation 可 parse 并派生 `ok`；backend/reason、unavailable/hitCount、
    snapshot count 也存在矛盾组合。
  - Impact：截断/失败 coverage 可被误报完整。
  - Expected fix scope：补 termination/reason/limit/degradation/hitCount/backend/
    fallback/snapshot truth table 与正反 mutation。

- [x] REV-003 `src/contracts/v2/locate-result-v2.ts`
  `exclusionSummary` 没有 canonical 重建。
  - Evidence：相同 key/value 不同插入顺序产生不同 JSON bytes。
  - Impact：违反 F1-DETERMINISM-001。
  - Expected fix scope：按冻结 enum 重建 object 并增加 nested permutation test。

- [x] REV-006 public term/symbol/excerpt control-character schema boundary。
  - Evidence：forged public term/symbol/excerpt 可携带 ESC/ANSI/control/bidi。
  - Closure：term/symbol 使用 display-safe schema；excerpt 仅允许 canonical LF/TAB。

- [x] REV-007 canonical array ordering fail-closed。
  - Evidence：raw/public 逆序 limits/degradations 可被 schema 接受并由 assembler
    静默重排。
  - Closure：raw/public coverage 统一使用 canonical arrays；assembler 入口返回
    fixed `INTERNAL_ERROR`。

- [x] REV-008 public snapshot / redaction metadata truth。
  - Evidence：public 两个唯一 file 配 `filesChecked=1`、安全字段伪造 metadata
    均可 parse。
  - Closure：public pack 同步 unique-file bound；term/symbol/excerpt metadata
    必须对应 public replacement token。

- [x] REV-010 literal path placeholder collision。
  - Evidence：安全 raw file `[REDACTED_PATH]` 经 assembler 变成
    `INTERNAL_ERROR`，direct public positive 也被拒绝。
  - Closure：hidden semantics 由 `resolvable` + file metadata 决定；字面 placeholder
    可保持 `resolvable=true` 且无 metadata。

- [x] REV-011 hostile corpus owner evidence。
  - Evidence：报告声称 credential、phone、malformed template 已覆盖，但测试无 owner。
  - Closure：AWS/GitHub/JWT、phone、unterminated quote/template 有 direct policy
    owners；组合 hostile corpus 执行全部 synthetic projections forbidden scan。

- [x] REV-012 malformed secret dangling escape。
  - Evidence：double/single/template 末尾孤立反斜杠绕过 malformed regex 并原样输出。
  - Closure：三类 malformed pattern 接受 optional dangling escape，direct owner 与
    dangling template 全 projection case 均 GREEN。

### important

- [x] REV-004 `src/contracts/v2/locate-result-v2.ts`
  public location schema 接受 absolute/drive/UNC/backslash/root escape/NUL。
  - Evidence：`resolvable=true,file=C:/private/a.ts` parse 成功。
  - Impact：未来 projection/cutover 接线错误可绕过公共 path boundary。

- [x] REV-005 feature inventory / forbidden report 与 hostile/schema tests 的逐项覆盖。
  - Evidence：报告声称 Pascal/hyphen/quoted/DEL 等已覆盖，但现有用例没有逐项 owner。
  - Impact：30/30 绿灯不足以支撑 acceptance。

### nit

- none。

### suggestion

- raw locator validator 当前有 contract/policy 两份；后续可评估单一 owner，本 feature 不为此扩范围。

### learning

- strict object 不能替代 backend/snapshot/status cross-field truth table。
- hostile corpus 报告必须能逐项反查真实 fixture/case。

### praise

- assembler 使用显式 allowlist，连续 ordinal ID 正确。
- safe error 固定映射且 raw detail fail-closed。
- package barrel、Evidence Engine、MCP、CLI 当前没有 v2 cutover。

## 5. Test And QA Focus

- uppercase/hyphen/camel/Pascal/quoted key 与 ESC/ANSI/DEL/bidi 全字段、全 projection。
- termination/reason/limit/degradation/hitCount/fallback/snapshot contradiction matrix。
- public invalid path parse。
- public term/symbol/excerpt controls、metadata placeholder truth 与 literal
  `[REDACTED_PATH]` collision。
- malformed quote/template dangling escape、credential/phone 全 projection scan。
- snapshot retained unique-file、backend/fallback/abort 与 canonical array truth。
- nested `exclusionSummary` key-order determinism。
- full unit/Golden/MCP/docs no-cutover。

## 6. Residual Risk

- F1 是 dormant synthetic seam，真实 MCP/CLI/stderr parity 只能由 F9 证明。
- regex import graph 对当前 ESM 源码有效，不等同完整 TypeScript module resolution。

## 7. Verdict

- Status: passed
- Next: 进入独立 QA gate。

## 8. Focused Closure

### Round 1

- REV-001：identifier tokenizer、quoted assignment、bare/truncated ESC hostile
  corpus 已补齐。
- REV-002：backend-specific reason、termination/limit/degradation、fallback
  compensation 与 snapshot discarded count truth 已补齐。
- REV-003：`exclusionSummary` 依 frozen enum canonical rebuild。
- REV-004：public path 增加 relative POSIX boundary。
- REV-005：报告改由真实 case inventory 反查。

### Round 2

- Snapshot：raw pack 校验 confirmed+candidates 唯一文件数不超过
  `snapshot.filesChecked`；stable/changed 正反 mutation 已 GREEN。
- Backend：`early-stop` 要求正 hit；执行多个 backend 要求
  `fallbackChecked=true`；caller/deadline 在 backend 完成后的取消不再要求伪造
  aborted attempt。
- Public path：`resolvable=true` 额外拒绝 C0、DEL、ANSI/ESC 与 bidi display
  control；raw locator 仍保留交给 policy 隐藏的输入语义。
- Evidence：`implementation-scope.txt` 改为四个精确 unit 文件；scope gate 和
  evidence pack 已重生成且逐项包含。
- RED：contract targeted 20 cases 中 4 failed / 16 passed。
- GREEN：v2 unit 38 passed，Golden 6 passed。
- VERIFY：DoD core passed；full unit 206、Golden 70 + 1 approved skip、MCP 39、
  docs smoke passed；scope/evidence-pack passed。Doctor 的当前 feature P1 是
  round 3 pending 状态，debug-cli P1 为既有 baseline。

### Round 3

- Public schema：term/symbol 拒绝 C0、DEL、ESC/ANSI、bidi；excerpt 仅允许 LF/TAB，
  CR 和其余 display control fail-closed。
- Metadata：term/symbol/excerpt 声称 redaction 时必须包含 `[REDACTED]` 或
  oversized replacement token；literal placeholder 无 metadata 仍按普通内容处理。
- Canonical ordering：raw/public `limitsReached`、`degradations` 逆序均拒绝；
  assembler 不再静默修复 programmer contract。
- Snapshot：public retained evidence 唯一 file 数不得超过 `filesChecked`。
- Evidence：forbidden scan aggregate 已从 stale 35 更新为当前 43。
- RED：targeted contract + assembler 为 5 failed / 25 passed。
- GREEN：targeted 30 passed；v2 unit 43、Golden 6 passed。
- VERIFY：DoD core passed；full unit 211、Golden 70 + 1 approved skip、MCP 39、
  docs smoke passed；scope/evidence-pack passed。Doctor 当前 feature P1 对应
  round 4 pending。

### Round 4

- Placeholder collision：public schema 不再以 sentinel 值单独判 hidden；raw→assembler
  与 direct public 均证明字面 `[REDACTED_PATH]` 保持 resolvable/no-metadata/status ok。
- Hostile owners：新增 AWS/GitHub/JWT fixed credential、phone PII、unterminated
  double/single quote 与 template direct owners；Golden 组合用例扫描 service、
  structured、text、debug 四个 synthetic projections。
- RED：targeted unit 为 2 failed / 30 passed；新增 Golden owner 初次运行因精确
  reason 断言失败，随后按 canonical 双 reason 修正测试预期。
- GREEN：targeted unit 40、Golden 7 passed；v2 unit 46 passed。
- VERIFY：DoD core passed；full unit 214、Golden 71 + 1 approved skip、MCP 39、
  docs smoke passed；scope/evidence-pack passed。Doctor 当前 feature P1 对应
  round 5 pending。

### Round 5

- Malformed：double/single/template 三类未闭合 assignment regex 允许末尾单个
  dangling escape，避免其绕过 fail-closed。
- Owner：三类 dangling escape 加入 direct policy matrix；Golden 的 malformed
  template 使用 dangling escape 并执行四个 synthetic projections。
- RED：focused field-redaction 为 1 failed / 7 passed。
- GREEN：focused 8、v2 unit 46、Golden 7 passed。
- VERIFY：DoD core passed；full unit 214、Golden 71 + 1 approved skip、MCP 39、
  docs smoke passed；scope/evidence-pack passed。Doctor 当前 feature P1 对应
  round 6 pending。
