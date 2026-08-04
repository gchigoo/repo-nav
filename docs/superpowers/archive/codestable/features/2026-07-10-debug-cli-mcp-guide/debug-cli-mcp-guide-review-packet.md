# debug-cli-mcp-guide review packet

## Baseline / scope

- Baseline：`cdc86f48a2edf42fb7f1bbb4bb03921992a03f7d`（F8 accepted）。
- Approved design/checklist：同 feature 目录。
- Scope owner：`implementation-scope.txt`。

## Blocking review questions

1. locate 是否只经 application token 并与 MCP 共用 output policy，未复制分类/fallback/status/error/redaction？
2. probe 是否严格限于 root resolution + ordered `BackendHealth` diagnostics，无 EvidencePack/事实判断/索引写入？
3. golden 是否真实复用 F8 registry/runner，usage/test failure/abort mapping 是否正确？
4. usage 是否在 bootstrap 前；context success/error/abort/exception 是否可靠 close；stdout 是否保持单一完整 formal output？
5. `test:docs` 是否真实启动 production MCP/CLI，而非 file/help-only shim；schema/acceptance drift gate 是否能阻断？
6. MCP output tuple compatibility 修复是否保持 JSON Schema 2020 tuple constraints与 versioned snapshot一致？

## Validation evidence

- DoD runner：7/7 passed。
- Unit：168/168；Golden：64 active + 1 conditional skip；MCP：39/39；docs smoke passed。
- Runtime docs report：`test-artifacts/docs/docs-smoke-v1.json`。
- Full log：`aggregate-verification.log`。
