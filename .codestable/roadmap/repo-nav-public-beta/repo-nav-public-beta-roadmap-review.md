---
doc_type: roadmap-review
roadmap: repo-nav-public-beta
status: passed
reviewed: 2026-07-23
round: 3
---

# repo-nav-public-beta roadmap 审查状态

## 1. Round 1 Scope And Inputs

- Independent reviewer：Task agent `/root/public_beta_roadmap_review`。
- Verdict：`changes-requested`。
- Roadmap SHA-256：`ADE68257B41EAC1938DA4509DB59E542E11F5245C52DC246BEC7F5DB66E8F991`
- Items SHA-256：`7A3F132E6179B72DE8B53C75A3EE23280C48B4BDAFC106FE92B0A97F746763A4`
- Public contract SHA-256：`1E7B7C4BF4C79C25AEE96547B5E384AD85CE25AF7311703589AAA454B288D447`
- Compatibility SHA-256：`5AC6E8B05066DC8F33CF52AA3960F386278691444622D46F607AF0F675E97051`
- Threat model SHA-256：`69D76561F83642B6F15BFE31845FFDD87DAC399AD1F4A3222F16F979DF8E56C5`
- Related current architecture：`.codestable/architecture/system-repo-nav-foundation.md`
- Related requirement：`.codestable/requirements/source-of-truth-evidence.md`
- Review input：2026-07-22 外部静态 review 与当前 `fd1d528` 源码/测试基线。

## 2. Round 1 Findings

### Blocking

1. v2 strict schema 未闭合，多个类型、reason/status transition 未定义；F1 又被要求在后续 field owner 前切换 v2，无法诚实交付。
2. public snapshot 暴露 Git object ID，与“禁止稳定内容/仓库指纹”冲突。
3. snapshot changed 只降级 status，仍可能返回变化文件的 stale confirmed。
4. status、degradation、request abort、backend termination 和 unsatisfied anchor 缺少统一 precedence truth table。

### Important

1. 敏感路径被部分替换后不能继续承诺可导航。
2. ranking 未覆盖 table/route/term、anchor satisfaction、分 class round-robin 与 permutation 边界。
3. scope 未报告 effective policy，默认/显式 test/docs 规则未冻结。
4. streaming-ripgrep 缺少 ranking/public-contract 依赖。
5. compatibility 未列出 file-anchor backslash 等 breaking changes。
6. forbidden scan 的“不得包含原始 term”会错误禁止普通 normalized term。
7. safe error union、MCP `isError` 和 CLI error parity 未闭合。
8. “所有 CLI 输出共用 locate assembler”范围过宽。
9. language extension mapping 与 unsupported hit count 时点未定义。

### Additional

- approval report 需要限定为 PR-00 启动授权。
- threat model 应覆盖 prompt injection、control/bidi/ANSI、恶意路径和 redaction placeholder collision。
- 后续 feature design 需要稳定 case ID 与 fixture owner。

## 3. Main-Agent Verification And Revision

主 agent 对照当前 strict Zod v1 contract、safe public error policy 和 roadmap DAG 逐项复核，接受上述 findings，并完成以下修订：

- F1 改为 internal/test v2 assembler 安全最小闭环；F9 在所有真实 field producer 就绪后原子 cutover，禁止 placeholder coverage。
- `public-contract-v2.md` 定义完整 request/success/error/evidence/coverage 枚举和结构，以及 status precedence。
- 删除 public Git revision/object ID；snapshot 只报告粗粒度 `gitState`。
- final snapshot check 在公共 ID 分配前执行；变化文件的 confirmed/candidate 全部丢弃且不重读。
- request-level `abortSource` 收窄为 `none|caller|deadline`；backend termination 进入 attempt ledger。
- 敏感 path 整体替换为 `[REDACTED_PATH]` 并设置 `resolvable=false`。
- 冻结五类 anchor tier/satisfaction、anchor reservation、分 class round-robin 和 permutation 规则。
- 冻结 `repo-scope-v1` 映射、默认 effective scope、test/docs candidate-only 规则。
- F5 依赖改为 `cross-platform-ci-baseline + relevance-ranking-budget`。
- compatibility 增补 input/output/error/transport breaking changes。
- language mapping 固定 TS/JS/SQL extensions，并定义 unsupported count 的过滤与预算时点。
- threat model 增补 untrusted evidence、control/bidi/ANSI、恶意路径和 placeholder collision。
- approval report 增加 `approval_scope: start-pr00-contract-planning-only`。

## 4. Round 2 Reviewed Hashes

- Roadmap SHA-256：`4E4B8CE162EF492D0164AED4E918C3CF0F45C862A4B60616DD0C9A0006E5BF20`
- Items SHA-256：`661787C263AEE7E5F65B4DF3B78359DCDC775EA679D2BF91C8589A438E7CE197`
- Public contract SHA-256：`CD560BDEB42E3D2080CB5D278DA2E09816111169E2FEE261C425ED8E0294A62E`
- Compatibility SHA-256：`0C1D5DE5FA9237049EEF29CDD40F68E6AA6CB87E640FCA3B12ADEDC7C0BEA6A8`
- Threat model SHA-256：`739044951ACB61FBAC2860F90B36F52EED08FF2232D91992F4987BBD90939D33`

## 5. Round 2 Findings And Revision

Round 2 独立 verdict 仍为 `changes-requested`，但确认 Round 1 的四个 blocking 与九个 important findings 均已关闭。新 findings：

1. **Blocking**：`repo-scope-v1` 遗漏 `.spec/.test` basename、fixture/spec segments、docs extensions 和 multi-layer 冲突优先级，可能把 test fixture 重新提升为 production confirmed。
2. **Blocking**：snapshot `unknown` 未 fail-closed；final check 失败、消失或不可读仍可能保留 stale evidence。
3. **Important**：F1 redaction metadata、`resolvable`、response ID 连续性和 canonical collection order 缺少 cross-field invariant。
4. **Important**：F5 的 maxHits/output cap/backend timeout/request abort/non-zero exit 没有完整映射到 termination、limit、degradation 和 strategy completeness。

主 agent 接受并完成以下修订：

- scope 冲突顺序冻结为 `test > docs > longest explicit prefix > leftmost ordinary segment > unknown`，恢复现有 basename、fixture/spec segment 和 docs extension 边界，并列出 blocking fixtures。
- retained evidence 只能来自 final check 成功且未变化文件；变化、消失、不可读和 identity/stat 失败全部丢弃并强制 partial；`unknown` 只允许零已读文件且零 evidence。
- 增加 redaction fields、placeholder/resolvable、metadata exactness、term redaction、ID `0001..N` 连续性和 nextActions canonical order 的 `superRefine` invariant。
- 增加 termination mapping table，冻结六类 process event 及完整 fallback 对 provisional degradation/strategy 的影响。

## 6. Round 3 Candidate Hashes

- Roadmap SHA-256：`A8C3278E1DDAF74D9A9E177C0669A7024839485F0C15DF30E5F04F81E6075525`
- Items SHA-256：`7BC7DC36AC21EBF20616490A0B4310C93E88F858B005CDA96CF2598BD6AA8441`
- Public contract SHA-256：`2CB77858AC46BFD091D19A47E56566102A75A5B7AFCBB307264FB46A5E0636FA`
- Compatibility SHA-256：`C5E58D5BA2BD3C95BB1B4754E57388F41C6225596AF3EF5F83EF97EB3756BB02`
- Threat model SHA-256：`8E8EFD5812E0603EA82403C2BC85D8A3CFCAD7CA52C76E33F298063635069C2A`

## 7. Deterministic Checks

- Markdown/YAML UTF-8、frontmatter、尾随空白和 code fence 检查通过。
- items.yaml：9 条唯一 item、状态均为 `planned`、依赖均存在、DAG 无环。
- 唯一 minimal loop：`public-output-boundary-v2`，但只交付可测试的内部 v2 安全边界，不提前切换生产。
- Roadmap、contract、compatibility、threat model 本地链接检查通过。
- `validate-yaml` 通过。
- `codestable-spec-governance inventory/analyze` 通过且无 finding。
- 上一轮 `codestable-doctor` 对本 roadmap 无 finding；全仓一个既有 P1 位于 `.codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-review.md`，不属于本次 diff。

## 8. Round 3 Independent Verdict

- Reviewer：Task agent `/root/public_beta_roadmap_review`。
- Verdict：`passed`。
- Blocking：无。
- Important：无仍会阻断 F1 design 的问题。
- Reviewer 确认 Round 3 五份 candidate hash 与本报告完全匹配，F1 internal/test seam 与 F9 atomic cutover 闭合。
- 本次通过只结束 roadmap review gate，允许进入 `public-output-boundary-v2` feature design；不自动授权 implementation、commit、merge、push 或发布。

## 9. Activation Record

- 2026-07-23：owner 已通过“按计划开始推进”授权 PR-00，round 3 独立审查通过后激活 roadmap。
- 激活动作仅把主文档 `status: draft` 改为 `status: active`；正文、contract、threat model 与 items DAG 未改变，因此无需重跑独立语义 review。
- Active roadmap SHA-256：`DCB4EA863C43E7A3FC32FD07197409DAD8358225B31C96E6F72ECE94F92AC797`
- Items SHA-256：`7BC7DC36AC21EBF20616490A0B4310C93E88F858B005CDA96CF2598BD6AA8441`
- Public contract SHA-256：`2CB77858AC46BFD091D19A47E56566102A75A5B7AFCBB307264FB46A5E0636FA`
- Compatibility SHA-256：`C5E58D5BA2BD3C95BB1B4754E57388F41C6225596AF3EF5F83EF97EB3756BB02`
- Threat model SHA-256：`8E8EFD5812E0603EA82403C2BC85D8A3CFCAD7CA52C76E33F298063635069C2A`
