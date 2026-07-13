---
doc_type: feature-evidence
feature: 2026-07-10-candidate-evidence-policy
status: passed
---

# Candidate selection 与 permutation 证据

## Selection key

- 既有 F3 exact/symbol candidate 先占用 `maxCandidates`，F5 derived candidate只使用剩余容量。
- derived priority固定为 alias neighbor → entity sibling → scope similar → file → lines → discovery key。
- bounded queue容量等于剩余`maxCandidates`；扫描仍继续到所有已保留verified contexts，较优的迟到candidate可以替换当前最差项。
- 同一discovery key再次命中时合并reason和promotion ordered set，`seedDiscoveryKey`取稳定最小值；public ID只在policy返回draft后生成。
- 首轮bounded selection结束后只针对最终保留的至多`maxCandidates`个key重扫verified contexts并归并reason；因此被淘汰后以更高优先reason重入的candidate不会丢失早期reason，额外状态仍受candidate容量约束。

## Boundary evidence

- `maxCandidates=0`：发现eligible candidate但输出空，`truncated=true`；engine保留confirmed并记录`MAX_CANDIDATES_REACHED`。
- `maxCandidates=1`：只保留priority最高的`sourceAlias / ALIAS_SOURCE_NEIGHBOR`；confirmed ID和内容不变，仍记录截断。
- pre-aborted signal：不开始context scan，不接纳candidate。
- context硬边界：12行与4 KiB以内可扫描；13行、4097 bytes、未知seed、重复/重叠context或被替换的location/excerpt/provenance均作为internal invariant error拒绝。

## Permutation evidence

- `candidate-permutation`将两个verified records和contexts同时反转。
- policy内部先按seed key/file/lines排序，再执行相同bounded selection。
- forward/reversed结果对`candidates`、`truncated`、reason/promotions和draft discovery keys严格深等。
- backend hit permutation使用两个真实fixture file和`maxFiles=1`，正反hits均选择`server/alpha.fixture`，完整pack（含ID、reason、order、limit）深等。
- queue淘汰重入case令`hcpName`先以scope reason入队、被alias interloper淘汰、再以alias reason重入；最终exact reasons仍为`SAME_SCOPE_SIMILAR_IDENTIFIER + ALIAS_SOURCE_NEIGHBOR`。
- Golden/MCP observation均使用policy生成的public IDs；backend/seed输入没有参与public selection tie-break之外的隐式顺序。

## 命令

- `npm test -- --group candidate-budget --group candidate-permutation` → passed。
- `npm test -- --group candidate-classification --case discovery-key-mutual-exclusion` → passed。
