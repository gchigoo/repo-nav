# S2 narrow fix record

- Failed exit signal: `npm run typecheck` and the targeted contract suite must pass.
- Actual failure: `NormalizedLocateAnchorSchema` remained in `BackendSearchRequestSchema` after its import was removed during the cleanliness pass.
- Root cause: an over-broad unused-import cleanup removed a runtime schema import that is still required.
- Allowed scope: restore the single import in `src/contracts/ports.ts`; do not change schema behavior.
- Required revalidation: `npm run typecheck` and `npm test -- --group contract --case term-case-parity`.
