---
doc_type: feature-design-review
feature: 2026-07-10-mcp-locate-surface
status: passed
reviewed: 2026-07-10
round: 3
---

# mcp-locate-surface feature design ????

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-design.md`
- Checklist: `.codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-checklist.yaml`
- Intent / brainstorm: none
- Roadmap: `.codestable/roadmap/repo-nav-mvp/repo-nav-mvp-roadmap.md`
- Related docs: `.codestable/requirements/source-of-truth-evidence.md`?roadmap items?`.codestable/attention.md`
- Code facts checked: baseline commit `04b04f7a1314f322e82157363ced505e2199cfc8`????? no-code baseline

### Independent Review

- Status: completed
- Detection: native-agent
- Provider / agent: `/root/design_review_core_surfaces`
- Raw output: ???? reviewer ????????? Round 3 ? blocking / important finding
- Merge policy: ? agent ???????? design/checklist??? YAML/cross-doc ??????? reviewer ??
- Gate effect: none

## 2. Design Summary

- Goal: ?? Nest standalone + stdio ???? repo_nav_locate???? schema?typed errors?cancellation ? shutdown?
- Key contracts: SDK v1.29.0 low-level tools capability/list/call?manual Zod parse/self-validation?one serializer?idempotent host lifecycle?
- Steps: 4 ???? pending???? yes/no exit signal ???????
- Checks: 14 ??????? design ???roadmap contract ? artifact
- Baseline / validation: no-code Git baseline?build/typecheck ? feature-specific unit/Golden/MCP/docs ????? DoD

## 3. Findings

### resolved

- registerTool pre-validation?schema-invalid typed error?unknown tool?SDK request cancellation?output parity ? close ownership?????

### blocking

- none

### important

- none

### nit

- none

### suggestion

- ?????? table-driven contract ? artifact inventory?????????? interface?status/reason ????????? design review?

### learning

- Roadmap ???????? feature ?????? seam?typed error?ordering ? failure-mode????????????

### praise

- MCP adapter ?? shallow????????? RepositoryEvidenceService?

## 4. User Review Focus

- ???????????? low-level SDK Server ?? registerTool helper???? envelope-valid schema-invalid ? typed structured error?protocol-invalid/unknown-tool ?? JSON-RPC boundary?
- implement ???????SDK v1.29.0 low-level tools capability/list/call?manual Zod parse/self-validation?one serializer?idempotent host lifecycle?
- code review / QA / acceptance ??????????????????????negative fixtures ? required artifacts

## 5. Evidence Confidence Ledger

| Check | Verdict | Evidence Class | Basis | Follow-up |
|---|---|---|---|---|
| Acceptance Coverage Matrix | pass | E+C | ???????? step???? evidence type | implementation ???? |
| DoD Contract | pass | E | Design / Implementation / Review / QA / Acceptance?commands?artifacts ?? | none |
| Steps and checks traceability | pass | E | steps/checks ?? pending ????? | none |
| Roadmap contract compliance | pass | E+C | ??? roadmap 4.x hard contracts | none |
| Module interface design | pass | E+C | depth?seam?ordering?error mode ? dependency strategy ??? | code review ???? |
| Validation and artifacts | pass | E | ??? artifacts ????YAML/cross-doc ??? | QA ???? |

Summary: E=6?C=3?H=0?H-only core checks=none?

## 6. Residual Risk

- Windows EOF/SIGINT/abrupt pipe close??? cancellation ? shutdown ?????? single-cleanup ???? stdio QA?
- ???????????? review???? implementation?code review?QA ? acceptance ????????

## 7. Verdict

- Status: passed
- Next: ?????? review?owner ??????? design ? `draft` ?? `approved`
