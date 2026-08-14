---
doc_type: feature-design-review
feature: 2026-07-23-public-output-boundary-v2
status: passed
review_state: passed
review_reason: round 2 independent focused closure passed
reviewer_id: /root/public_output_v2_design_review_retry
reviewed: 2026-07-23
round: 2
---

# public-output-boundary-v2 feature design 审查状态

## 1. Round 1 Scope And Inputs

- Design SHA-256：`E4E9ACB225DEBE11D6E847F0AA789ECA158382351050A259DBE22B74C2B60900`
- Checklist SHA-256：`0148EE98697A1A214A1324C52DDB8FA05AFE61B32F54DBA6628B2CB82EEF561C`
- Roadmap item：`repo-nav-public-beta/public-output-boundary-v2`
- Requirement：`source-of-truth-evidence`
- Baseline：`fd1d528a7319de734300fb906adb69adbf237639`
- Independent reviewer：Task agent `/root/public_output_v2_design_review_retry`。
- Verdict：`changes-requested`。

## 2. Round 1 Findings

### Blocking

1. raw input contract 使用未定义类型，且没有冻结 `status` 是 caller 提供还是 assembler 派生。
2. path redaction 由 assembler 决定，但 `LOCATION_REDACTED` degradation 与最终 status 没有同一 owner，可能产生“路径已隐藏但 coverage 仍 complete/ok”的矛盾。

### Important

1. term/symbol/excerpt/file 对 control、ANSI、bidi、oversized、malformed 和 unsafe path 只写“转义/替换”，实现语义未冻结。
2. strict schema/checklist 没有把 backend、snapshot、scope、capability、anchor/abort/status、canonical arrays、location degradation 和 ID continuity 拆成可反查 mutation families。
3. full MCP/docs 只能观察 production 仍是 v1，不能直接证明 package barrels、engine、MCP、CLI 没有 import/export v2，也没有闭合 synthetic success/error 全 projection forbidden scan。

### Nit

- `public-output-v2` group/case 尚未列入 closed runner registry，design/checklist 未把 registry identity 列为交付物。

## 3. Main-Agent Verification And Revision

主 agent 对照 `public-contract-v2.md` 和当前 v1 source/output chain 复核并接受全部 findings，完成：

- 完整定义 `FinalizedUnsafeLocateResultV2`、raw evidence drafts、upstream degradation 和 safe raw error shape；raw schema 逐层 strict，禁止 version/ref/status/ID/output metadata/extra fields。
- 最终 status 改为 assembler 唯一派生；assembler canonical-union 自己产生的 `LOCATION_REDACTED`，再执行 roadmap precedence。0/1/多 hidden path 与 caller 矛盾输入均有场景。
- 数据/策略/schema contract violation 统一 fail-closed 为 fixed safe `INTERNAL_ERROR`，不抛 raw detail、不写日志。
- 增加字段安全 truth table：固定 placeholder、处理顺序、identifier 分词、CR/LF/TAB、C0/DEL、ESC-led ANSI、bidi、malformed/oversized 与 unsafe path 行为。
- 增加 11 组 schema ownership/mutation families，要求每组正例和 deliberate contradiction。
- 增加 registered `no-cutover-import-inventory` case，直接覆盖 `src/index.ts`、`src/contracts/index.ts`、Evidence Engine、MCP 和 CLI reachability。
- 明确 synthetic service/structured/text/debug-locate success/error 全 projection forbidden scan；F1 无 stderr producer 的 N/A 理由必须落盘，但 error path 不得跳过。
- checklist 增加 runner registry、derived status、path invariant、import inventory 和 family owner checks。

## 4. Round 2 Candidate

- Design SHA-256：`558434C7A4D404AF123EF1EC89AB25934AEA192A9E5B36DE4DB9348E60723C99`
- Checklist SHA-256：`24DAED6228CFB7C2F1D2A87384083071B2F9AD2B60E1C6CF8DFB6E907F4B3CF5`

## 5. Baseline And Deterministic Checks

安装 lockfile dependencies 后重新执行：

- `npm run build`：passed。
- `npm run typecheck`：passed。
- `npm test`：18 files / 168 tests passed。
- `npm run test:golden -- --all`：11 files / 64 passed / 1 skipped。
- `npm run test:mcp -- --all`：9 files / 39 tests passed。
- `npm run test:docs`：passed。
- feature checklist 与 roadmap items YAML：valid。
- artifact hygiene、placeholder scan、spec-governance analyze：passed。

`npm ci` 报告 2 moderate / 1 high dependency audit finding；没有运行自动修复，本 feature 不修改 dependency manifest。`codestable-doctor` 的既有 debug-cli review P1 继续单独归因。

## 6. Round 2 Independent Verdict

- Reviewer：Task agent `/root/public_output_v2_design_review_retry`。
- Verdict：`passed`。
- Blocking：none。
- Important：none。
- Round 1 的 B1、B2、I1、I2、I3、N1 均已闭合。

Reviewer 确认：

- raw/status ownership、`LOCATION_REDACTED` 派生和 0/1/多 path cases 闭合；
- 字段 truth table 与 unsafe path fail-closed 语义可执行；
- schema mutation families、runner registry 与 owner cases 可反查；
- direct import inventory、synthetic success/error forbidden projection 和 stderr N/A/F9责任边界明确；
- F1 仍是 dormant internal/test seam，只有 F9 能切换 production。

## 7. User Review Focus

design review gate 已通过，但 design 保持 `draft`。下一步是 owner 整体确认以下三项：

1. assembler 独占最终 status，并把 path redaction 派生为 `LOCATION_REDACTED`。
2. raw contract violation 不抛 detail，而是返回 fixed safe `INTERNAL_ERROR`。
3. F1 不接入 production；只有 F9 原子切换 service/MCP/CLI/docs/package surface。

owner 显式批准后才能把 design 改为 `approved` 并进入 Goal package/implementation；本报告不自动授权 commit、merge、push 或发布。

## 8. Owner Design Approval

- 2026-07-23：owner 明确回复“批准 F1 设计，继续实现”。
- Design status 已从 `draft` 更新为 `approved`。
- 该回复批准 feature design 与进入实现准备，不等同于 Goal 最终 acceptance 的独立授权；后者由同目录 `approval-report.md` 单独记录。
