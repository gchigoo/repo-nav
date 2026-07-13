# Debug CLI command contract matrix

| Command | Production/test seam | stdout owner | Exit mapping | Cleanup evidence |
|---|---|---|---|---|
| `debug locate` | `createRepoNavApplicationContext` + `REPOSITORY_EVIDENCE_SERVICE` | `createLocateToolOutput` | help/success 0, unexpected 1, usage 2, tool error 3 | `executeCli` context `finally`; lifecycle unit cases |
| `debug probe` | `REPOSITORY_READER.resolveRoot` + ordered `REPOSITORY_SEARCH_BACKENDS.probe` | `ProbeOutputSchema` | success/unavailable 0, unexpected 1, usage 2, invalid repo 3 | `executeCli` context `finally`; real docs snippet |
| `debug golden` | F8 runner registry + `runVitestSurfaceSummary` | `GoldenOutputSchema` | passed 0, failed/unexpected 1, usage/unknown selection 2 | abort signal terminates runner child; no Nest context |

Parser 在任何 application context 创建之前完成严格 flag/JSON/Zod 校验。CLI 只在完整 output 通过 schema 后由 `main.ts` 一次写入 stdout；安全诊断单独写 stderr。
