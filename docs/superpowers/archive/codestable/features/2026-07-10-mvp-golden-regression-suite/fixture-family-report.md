# Fixture Family Report

| Family | Positive / boundary coverage | False-positive / failure guard | Runner |
|---|---|---|---|
| classification | assignment、object、SQL、symbol、exact role/reasons | comment、DTO/interface、string、quoted SQL | Golden + unit classifier |
| candidate | sibling、alias、secondary、promotion exact order | unrelated/forbidden ID、budget/permutation | Golden + MCP minimal loop |
| layer/path/security | layer、negative term、redaction 四类、binary/oversized | root escape、unsafe backend path、forbidden scan | Golden + MCP |
| backend transitions | CodeGraph missing/no-result/failed/incomplete/local-timeout、ripgrep unavailable/failed、both unavailable、hit-unverified | global abort no fallback、fixed timeout semantics | Golden |
| final status/limits | ok、partial、no_result、backend_unavailable、timeout；六类 limits owner | empty/evidence variants、exact nextActions | Golden + unit transition matrix |
| protocol/errors | tools/list/schema、success/error parity、四类 typed errors | invalid schema、unsafe detail scrub | MCP |
| lifecycle | production frames-only/EOF/signal/exit/budget；instrumented real Nest context close + in-flight direct/descendant cleanup；idempotence | malformed frames、over-budget、真实跳过 close marker、真实遗留 child tree、forced timeout/nonzero 后 PID 与 temp 清理 | independent lifecycle runner |

运行时 JSON：`test-artifacts/families/mvp-fixture-family-v1.json`。
