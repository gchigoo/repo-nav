---
doc_type: feature-review
feature: 2026-07-10-candidate-evidence-policy
status: passed
reviewer: subagent
reviewed: 2026-07-13
round: 4
---

# candidate-evidence-policy 代码审查报告

## 1. Scope And Inputs

- 独立 reviewer：原生 Task agent `/root/f2_code_review`；Round 1 另有 `/root/f4_review_fast` 交叉审查。reviewers 全程只读，没有修改实现或报告。
- 输入：approved design/checklist、implementation/evidence pack/gate/DoD、最新 review packet、production policy/engine/classifier/reader、unit/Golden/MCP tests 与 F5 完整 diff。
- 当前证据：scope gate、DoD 6/6、`npm run build`、`npm run typecheck`、123 unit、28 active Golden（1 个条件性 skip）、31 MCP 与 `git diff --check` 均通过。
- OCR：`ocr llm test` 无有效 LLM endpoint，因此 OCR reviewer 为 `not-available`；本轮采用原生独立 subagent review，不以主线程自评替代。

## 2. Findings And Closure History

### Round 1：changes-requested，已关闭

- alias 在类型/参数位置误报；nested scope/entity 与未闭合 outer container 没有严格 fail-closed。
- `maxFiles` 在稳定排序前截断；F3 direct-mapping 的候选 role 与 truth table 不一致。
- secondary provenance 边界过宽；Golden/MCP 只验证 subset；mutual exclusion 与 bounded queue reason completeness 证据不足。
- 关闭证据：innermost owner + balanced scanner、类型位置过滤、backend hit 稳定排序、统一 `reference` role、ripgrep-only secondary、exact Golden/MCP、engine-level 互斥、eviction/reentry reason merge tests。

### Round 2：changes-requested，已关闭

- production ripgrep 单行 hit 无法取得闭合容器；fake backend 的整文件 excerpt 掩盖了问题。
- type position、SQL comment/dollar string 与 `[]`/`()` 平衡覆盖不足。
- 关闭证据：新增有界 `RepositoryReader.readWindow`，候选分类使用 engine 验证的 12 行/4 KiB window；real `RipgrepBackend` 集成用例；SQL masker、统一 delimiter stack 与扩展后的 exact negative cases。

### Round 3：changes-requested，已关闭

- `<HcpName>hcpId`、`factory<HcpName>(hcpId)` 与嵌套 `Record` 等 angle type 仍可能误报。
- candidate 二次读取的非 limit/abort 错误可能被静默跳过。
- 关闭证据：`isInsideAngleType` 保守过滤及三组 exact-empty 测试；二次读取仅对 `ABORTED`、`MAX_FILE_BYTES`、`MAX_EXCERPT_BYTES` 作明确分支，其余 repository error 重新抛出并由 engine 返回 typed failure；扩窗与 focus-only reader 的 confirmed 全量深等测试。

### Round 4：passed

- Angle type、二次读取错误语义、confirmed identity、`readWindow` 居中/clamp/UTF-8 byte shrink/focus 保留/超限/abort 均复核通过。
- 未发现 blocking、important 或由修复引入的高严重度回归。

## 3. Praise / Learning

- confirmed 与 candidate window 分离得当：扩窗只用于 `VerifiedCandidateContext`，confirmed 的 record/location/key/ID/provenance 保持 F3 语义。
- selection 先稳定化 backend hits，再执行文件与候选预算；eviction/reentry 后二次受控合并恢复完整 reasons，结果不依赖输入排列。
- 测试同时覆盖 policy、真实 reader/ripgrep 集成、Golden 与 stdio MCP surface，且 negative cases 使用 exact set，能阻断额外候选回归。

## 4. Test And QA Focus

- 真实 `RipgrepBackend` 单行命中经 `readWindow` 扩窗后产生 `hcpName/SAME_ENTITY_SIBLING`，而 confirmed identity 不变。
- primitive/custom/generic/tuple/function-parameter/angle assertion、SQL quote/comment/dollar string、nested/unbalanced delimiter 均不得产生额外 candidate。
- `maxFiles=1` 的 hit 正反排列、candidate queue eviction/reentry、confirmed/candidate 同 occurrence 互斥应保持完整 result 深等。
- candidate 二次读取的 limit、abort 与不可读错误必须分别保持 limit/停止/typed failure 语义。
- Golden 与 MCP 必须精确验证 confirmed + alias/sibling candidates + decoy exclusion 及 parity。

## 5. Residual Risk

- 类型识别仍是保守 lexical heuristic；关系比较/三元表达式可能被当作类型区间而少召回，但符合 F5 fail-closed、宁缺毋滥的边界。
- 12 行/4 KiB centered window 之外的容器无法参与判定，按设计只会造成 false negative。
- SQL quoted identifiers 被保守 mask；可能少召回，不会放宽为跨字符串候选。
- focus 与 candidate window 是两次本地读取，存在周边内容并发修改的 TOCTOU 窗口；focus slice 不一致会阻断，当前只读证据场景可接受。
- `SECONDARY_BACKEND_HIT` 仅完成 F5 的精确生产规则，真正 secondary backend 接入仍属于 F6。

## 6. Verdict

- Status：passed。
- Blocking findings：none。
- Next：进入 `cs-feat-qa`，按第 4 节复核核心运行路径与 residual risks。
