# Large Synthetic Performance Baseline

## 固定 corpus

- seed：20260710
- source files：1000
- modules：50
- direct mappings：10
- named decoys：200
- size distribution：500 small / 350 medium / 150 large
- generator config hash：`f359ff248dfb9ba073b7d36881058ff48ec240bd1e3b6660c9bcccc4194c8a86`
- corpus hash：`3a66ce5d9121dba0d833acc9a1429d70e1ee03eff9e278db60ee6015b48e8c5e`

## Blocking correctness

- warmup=1，measuredRuns=5。
- 5 次 stable projection hash 均为 `8d5a229c4ca5660e4236d4a3743a9aae930faf6e5132c9eec16af0c7e6bd969c`。
- exact result：status=`partial`、confirmed=10、candidates=10、limitsReached=`MAX_FILES_REACHED`。
- fixture cleanup：attempted/succeeded/removed 全 true。

## Non-blocking timing

- committed baseline：median 61.88 ms、p95 70.85 ms、peak RSS 128,516,096 bytes。
- 最新 DoD/QA 运行：median 67.83 ms、p95 82.15 ms、peak RSS 132,595,712 bytes。
- timing trend 仅报告，不设单次硬阈值；config/corpus/projection drift 才阻塞。

Committed baseline：`testkit/baselines/performance/large-synthetic-repository-v1.json`。运行时报告：`test-artifacts/performance/large-synthetic-repository-v1.json`（test 不覆盖 committed baseline）。
