---
doc_type: roadmap-goal-feature
roadmap: repo-nav-mvp
feature: 2026-07-10-codegraph-fallback-orchestration
roadmap_item: codegraph-fallback-orchestration
status: pending
---

# codegraph-fallback-orchestration Goal ????

## 1. Identity And Inputs

- ???6/9
- Roadmap item?`codegraph-fallback-orchestration`
- ???text-source-evidence-engine
- ???`mixed`
- Design?`.codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-design.md`
- Checklist?`.codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-checklist.yaml`
- Design review?`.codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-design-review.md`
- Implementation review?`.codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-review.md`
- QA?`.codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-qa.md`
- Acceptance?`.codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-acceptance.md`
- Evidence pack?`.codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-evidence-pack.md`
- Gate results?`.codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-gate-results.json`
- DoD results?`.codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-dod-results.json`
- DoD contract results?`.codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-dod-contract-results.json`

## 2. Delivery And Core Path

- ????????? CodeGraph probe/query?conservative completeness ? ripgrep fallback?
- ???????fake transition Golden cases + ?? temp indexed CodeGraph success/cleanup smoke?
- Roadmap contract?design frontmatter ?? `repo-nav-mvp` / `codegraph-fallback-orchestration`???????????? interface?status/reason?ordering?failure mode ????????

## 3. Mandatory Commands

- `npm run build`
- `npm run typecheck`
- `npm test -- --group codegraph-probe --group codegraph-parser`
- `npm test -- --group codegraph-query-plan`
- `npm run test:golden -- --case codegraph-missing --case codegraph-no-result --case codegraph-failed --case codegraph-incomplete --case codegraph-global-abort-no-fallback --case codegraph-local-timeout-fallback --case codegraph-hit-unverified --case codegraph-symbol-complete-no-fallback --case codegraph-secondary-provenance-table --case backend-unavailable`
- `npm test -- --group codegraph-live-smoke --case indexed-temp-repo`

?? core ??????? runner ????? DoD/evidence artifacts???????????????? feature ????? package dependency?lockfile ? runner ????????? shim/?????

## 4. Feature DoD

- Design ?? `status: approved`?design-review ?? `status: passed`?
- Checklist steps ??? `pending` ??? `done`?acceptance ?? checks?C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12???? `passed`?
- implementation.before_review ? scope-gate?dod-runner?evidence-pack ?? passed?
- ?? Task agent code review `status: passed`?? unresolved blocking?
- QA `status: passed`??? design Acceptance Matrix?DoD commands?review focus ? residual risks?
- Acceptance `status: passed`?roadmap item ??? done???? architecture/requirement/roadmap ???
- scoped commit ???????????????? feature?

## 5. Stage Gates And Inputs

1. **Implementation**??? `cs-feat-impl`??? design/checklist/current code/baseline??? step evidence?DoD results?gate results?evidence pack?
2. **Review**??? `cs-code-review` ????? Task agent??? current diff?evidence pack?gate results??? `codegraph-fallback-orchestration-review.md`?
3. **QA**??? `cs-feat-qa`??? design/checklist/review/evidence??? `codegraph-fallback-orchestration-qa.md` ??? command logs?
4. **Acceptance**??? `cs-feat-accept`??? passed review/QA?evidence/DoD/gates??? `codegraph-fallback-orchestration-acceptance.md` ??? checks/items?

Gate runtime ? `.codestable/roadmap/repo-nav-mvp/goal-protocol-gates.md` ? `.codestable/gates/roadmap-goal-gates.yaml` ???protocol-only gate ?????????????????

## 6. Acceptance Evidence

- Mandatory command outputs ? exit codes?
- design Acceptance Coverage Matrix ?? core ???????????/false-positive ???
- diff summary?artifact inventory?scope/cleanliness result?
- provider warnings?E/C/H summary ? H-only core checks?????? owner ??????
- ?? nature/core path ?????????????????????

## 7. Deliverables And Cleanliness

- ???? design ? 1/3 ??checklist artifacts ????????????????
- ???? stdout/debug???? TODO/FIXME/XXX???????unused imports??? runner shim????/??/`__pycache__`?
- ?? scope ?????? evidence pack ???????? scope-gate failed?

## 8. Failure Recovery Boundary

- impl command/gate failed?? approved design ????????????? design/roadmap/interface??? handoff????????
- review blocking??? review-fix???????? implementation gates ??? code review?
- QA failed/blocked??? qa-fix?????? code review ? QA?
- ?? blocking ?????????? reviewer ??????????/???????`CS_ROADMAP_GOAL_HANDOFF`?
- ????? core command??? output??? assertion ??? residual-risk ??????
