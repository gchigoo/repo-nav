---
doc_type: feature-architecture-check
feature: 2026-07-24-span-redaction-corpus-policy-v2
created: 2026-07-27
status: no-change
---

# F1A Architecture Check

## Scope
核对 `src/evidence/public-output/` 与 `.codestable/architecture/` 现状地图。

## Findings
- 本次把 `SensitiveValuePolicyV2` 拆为 façade + 内部 span/corpus/detector/materializer/ranking-key 模块，对外 dormant seam 仍是 `PublicResultAssemblerV2 → SensitiveValuePolicyV2`。
- 未新增 production MCP/CLI/service v2 edge；未引入 F1B/F1C/F2/F6 owner 文件。
- architecture 目录若尚未单独描述 span materialization 内部拆分，属于实现细化，不改变系统级边界。

## Verdict
no-change：系统级挂载点与 capability 边界未变；内部模块拆分不要求本轮 architecture update。
