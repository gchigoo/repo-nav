# Fixture Completeness Report

## 结论

- 状态：passed
- 权威输入：`src/contracts/constants.ts`、`testkit/manifests/coverage/fixture-ownership.yaml`、Golden manifests、companion snapshots、显式 executable schema probes、逐 reason-code evaluator negative probes。
- 79 个 enum/code owner 全部存在；每个 owner 不仅在 runner registry 注册，还必须由该 case 的实际 companion observation、schema parse probe 或 evaluator mutation probe 对目标 `family.code` 产生机器可验证覆盖。
- Confirmed/Candidate reason 的 positive 与 negative owner 全部存在。
- 23 个 success manifest 与 23 个 companion snapshot 一一对应；1 个 error manifest 由共享 evaluator 精确判定 error fields 与 transport parity。
- 43 个 public EvidencePack field mutation 均被 schema 或 exact projection 捕获；唯一 allowlist 是 `repositoryRoot`。
- `fixture-completeness` 禁止充当自身 owner；把任一 code 的 owner 改成无关但已注册 case 会因缺少目标 observation/probe 而失败。
- 每个 success/error manifest 还必须声明一个已注册 runner owner；每个 companion JSON 都通过 LocateResult schema 解析。
- ownership source SHA-256：`ca82eb40e6d518f04019bad512575a925c8ff4d977ee649937fa5085e3b592a0`。

## 两层完整性

1. enum/code owner：RepoLayer、AnchorKind、TermCaseMode、LocateStatus、EvidenceSource、SearchBackendId、EvidenceRole、Confirmed/Candidate/Discovery/Promotion/Operation/Backend/Limit/Exclusion/Redaction/NextAction/ToolError 均由 schema constants 驱动对账，并逐值匹配实际 observation 或 executable probe。
2. public field mutation：schemaVersion、status、normalizedTerms、confirmed/candidates 全字段、provenance、redaction、coverage、nextActions 均有 deliberate mutation；class/reason/ID/order/excerpt 不在 normalization allowlist。

运行时 JSON：`test-artifacts/completeness/mvp-fixture-completeness-v1.json`（gitignored，每次 core test 重建）。
