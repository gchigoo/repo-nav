---
doc_type: feature-acceptance
feature: 2026-07-10-text-source-evidence-engine
status: passed
accepted: 2026-07-13
round: 1
---

# text-source-evidence-engine 验收报告

> 阶段：阶段 3（验收闭环）
> 关联方案：`text-source-evidence-engine-design.md`

## 1. 接口契约核对

- [x] `RipgrepBackend` 实现 `RepositorySearchBackend`，只返回 `BackendHit/BackendHealth` discovery facts，不直接构造 confirmed/candidate evidence。
- [x] `RepositoryEvidenceEngine` 实现 `RepositoryEvidenceService.locate()`；`EvidenceModule` 用 `useExisting` 挂载真实 engine 与 reader。
- [x] `RepositoryBackendsModule` 通过 factory 输出有序、冻结的 `[RipgrepBackend]` collection，替代 F2 empty backend seam。
- [x] `LocateRequest` normalization、case metadata、anchors与 resolved limits沿用 F1 contract；public result继续通过 schema v1、full SHA-256 ID和稳定排序契约。
- [x] 设计流程 normalize → literal rg → current-file verification → discovery merge → classify once → role → ID → sort → status/coverage均有唯一代码落点。

## 2. 行为与决策核对

- [x] rg adapter 使用 `--fixed-strings --json`、per-term/anchor case groups与 `shell:false` SafeProcessRunner；actual submatch symbol逐事实保留并稳定排序。
- [x] backend hits必须由 `RepositoryReader` 对当前内容核验；logical window严格不超过12行/4 KiB，fatal path error不降级吞掉。
- [x] 相同 discovery key先合并全部 provenance/reasons/operations/terms/canonical symbols，再对 record分类一次；permutation不改变class/role/ID/order。
- [x] assignment、可执行 object mapping、受支持 SQL alias和exact symbol implementation/definition可confirmed；declaration/DTO/test/docs/comment/string/regex/call-site/未知syntax不得误confirmed。
- [x] negative/layer/duplicate/unverified facts进入exclusion summary；exact-term与symbol-reference candidate promotion requirements保持设计固定集合与顺序。
- [x] ripgrep-only `ok/no_result/backend_unavailable/partial/timeout`、coverage/index字段和fixed-vs-adjustable next actions符合设计状态表。
- [x] 明确不做：未加入sibling expansion、CodeGraph、MCP transport、numeric confidence或F7 redaction。
- [x] 拔除沙盘：移除engine/backend providers、新增实现与对应tests即可回到F2 fail-closed能力边界；F1/F2 contracts、reader和runner不依赖F3 classifier细节。

## 3. 验收场景核对

- [x] S1 adapter：6个unit cases通过；`rg 15.1.0`真实fixed-string JSON chain通过。
- [x] S2 verification/merge：6个merge cases通过；重复/permuted hits、fatal path与current-file核验可判定。
- [x] S3 classifier：34个classifier cases及5个active classifier Golden通过；正例、decoys、exclusions、ID/order全部锁定。
- [x] S4 service baseline：ok/no-result/unavailable/failed/incomplete/timeout manifests通过。
- [x] Review focus：2/12/13行、4096/4097 bytes、Zeta/Alpha多symbol、1/2/充足budget、internal/caller abort均有真实或定向自动化证据。
- [x] QA evidence：84/84 unit tests；25 active Golden通过，1个按case选择条件测试skipped；failed/blocked none。
- [x] Evidence/DoD/Gate：scope、6条core commands、evidence pack均passed。
- [x] Feature性质：functional；真实ripgrep → SafeProcessRunner → RepositoryReader → merge → classifier → LocateResult链已运行，不以静态检查代替核心行为。

## 4. 术语一致性

- Discovery hit、DiscoveryRecord、Direct mapping recognizer、EvidencePack与ripgrep-only baseline在design、实现、QA和architecture中一致。
- 代码未引入与第0/2.1节冲突的第二套backend hit、classification或status概念。
- `merge → classify once → primary role → ID → sort` 是唯一证据形成顺序；backend discovery不越权决定public class。

## 5. 领域影响盘点

- [x] `.codestable/architecture/system-repo-nav-foundation.md` 已更新为F3当前状态：真实Evidence Engine、Ripgrep adapter、DiscoveryRecord merge、classification policy与module assembly。
- [x] `ARCHITECTURE.md` 索引摘要已同步，不再把系统描述为只有F2 seams。
- [x] 结构性选择候选：封闭direct-mapping truth table、merge-before-classify、multi-symbol facts全保留、所有CLI统一SafeProcessRunner。符合ADR/constraint候选价值，但acceptance不代写ADR；建议roadmap收尾通过`cs-decide/cs-domain`归档。

## 6. requirement delta / clarification 回写

- Requirement `source-of-truth-evidence` 保持 `draft`，本轮不修改requirement文件。
- F3交付的是内部可运行evidence service baseline；production MCP/public用户入口、candidate/CodeGraph分支与完整guardrails尚未闭环，因此未完成requirement的完整用户故事或capability boundary。
- 不存在owner-approved req delta；完整MVP通过并获得approved delta后再升级状态与登记`implemented_by`。

## 7. roadmap 回写

- [x] `repo-nav-mvp-items.yaml` 的F3状态由`in-progress`改为`done`。
- [x] roadmap主文档F3状态同步为`done`。
- [x] `goal-state.yaml` F3为`accepted`，`current_feature_index: 3`。
- [x] `goal-features/text-source-evidence-engine.md` frontmatter为`accepted`。

## 8. attention.md 候选盘点

- 候选：Windows PowerShell execution policy可能阻止`npm.ps1`，本项目验证命令使用`cmd /c npm ...`可稳定执行。
- 本轮不直接改attention；roadmap文档整理阶段由owner决定是否通过`cs-note`收录。
- 其他知识出口：lexical slash/member-access边界与同location多symbol全事实保留适合`cs-keep/cs-decide`。

## 9. 遗留

- `RipgrepBackend` process timeout固定10秒，而LocateRequest允许最高30秒；状态/abort已自动验证，故意超过10秒的真实慢仓库墙钟路径尚未实测。
- 轻量recognizer不是AST；dynamic/computed/cross-window/生成式未知syntax必须继续降为candidate。
- Windows `rg 15.1.0`与process-tree已有实机证据；POSIX process-group、其他rg minor version、reparse TOCTOU未在当前环境复核。
- Sensitive excerpt redaction、CodeGraph fallback、sibling candidate和MCP parity属于后续feature。

## 10. 最终审计

- 验证来源：passed review round 5、passed QA round 1、evidence pack、DoD results与scope gate。
- 聚合命令：build/typecheck、84 unit、25 active Golden及6组精确DoD全部exit 0；真实`rg --version`为15.1.0。
- 场景复核：re-verified 12 / trust-prior-verify 0。
- 交付物：Ripgrep adapter、DiscoveryRecord verification/merge、conservative classifier、engine/provider assembly、fixtures/tests、review/QA/evidence、architecture与roadmap/goal-state均真实落盘。
- 完整工作区：tracked/untracked/staged由feature scope盘点；staged none；无feature外dirty归因。
- 清洁度：scope gate passed；`git diff --check`无whitespace error；source marker scan无TODO/FIXME/XXX/debug output。
- 知识出口：architecture已机械回填；ADR/attention/learning候选已登记但未越权写入长期决策或用户记忆。
- 结论：通过；C1-C12全部`passed`，无核心residual gap。
