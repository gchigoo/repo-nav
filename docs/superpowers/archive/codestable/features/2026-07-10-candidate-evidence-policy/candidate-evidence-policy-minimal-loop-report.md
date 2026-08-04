---
doc_type: feature-evidence
feature: 2026-07-10-candidate-evidence-policy
status: passed
---

# Candidate 最小闭环证据

## Fixture path

`testkit/fixtures/candidate-policy/server/mapping.fixture`由与生产ripgrep一致的single-line seed hit进入真实`RepositoryEvidenceEngine`；engine通过reader另取bounded verified window：

```text
ripgrep-shaped single-line structured hit
  -> NodeRepositoryReader current-file verification
  -> DiscoveryRecord merge
  -> direct-mapping classifier
  -> NodeRepositoryReader centered 12-line/4 KiB candidate window
  -> CandidatePolicy verified context scan
  -> public ID/sort/budget
  -> LocateResult
  -> repo_nav_locate structuredContent/text
```

## Public observation

- confirmed：`hcpId: row.hcp_id`，`value-mapping`，`DIRECT_ALIAS_MAPPING + EXACT_TERM_MATCH`。
- alias candidate：`sourceAlias`，`related`，`ALIAS_SOURCE_NEIGHBOR`。
- sibling candidate：`hcpName`，`related`，`SAME_SCOPE_SIMILAR_IDENTIFIER + SAME_ENTITY_SIBLING`。
- 完整exact candidate序列：`sourceAlias`、`hcp_name`、`hcpName`、`hcpEmail`、`hcp_email`；Golden与MCP都逐条断言symbol、role与reason ordered set，不允许额外candidate。
- derived provenance：`filesystem / FILESYSTEM_FIND_MATCHES / verifiedBy=filesystem`；未复制seed的ripgrep source。
- decoy：object container外的`unrelatedToken`不在上述exact set；primitive/custom/generic type、function parameter、nested object/block与unclosed outer delimiter另有unit negative断言。
- F6边界：全部candidate均不含`SECONDARY_BACKEND_HIT`。

## Transport evidence

- `sibling-candidate`、`alias-candidate`、`sibling-false-positive`三个Golden manifests通过。
- `candidate-minimal-loop`经真实stdio MCP client/server与fixture child运行；`isError=false`，structuredContent与text parse严格等值。
- unit integration另以真实`RipgrepBackend + NodeSafeProcessRunner`扫描fixture root，production engine确认`server/mapping.fixture`输出`hcpName/SAME_ENTITY_SIBLING`，避免fixture backend掩盖真实hit粒度。
- 同一single-line hit分别使用centered window与focus-only window时，confirmed evidence的`id/location/excerpt`完整深等；只有derived sibling召回随window变化。
- 本闭环只证明受控fixture的candidate policy，不代表F7 guardrails或F8发布级回归完成。
