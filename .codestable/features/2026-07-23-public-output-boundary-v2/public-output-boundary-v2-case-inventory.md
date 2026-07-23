---
doc_type: feature-case-inventory
feature: 2026-07-23-public-output-boundary-v2
status: complete
---

# F1 case 与 artifact inventory

## 1. Runner identity

| Surface | Group | Case | Owner |
|---|---|---|---|
| unit | `public-output-v2` | `schema-contract-families` | `test/unit/public-output-v2-contract.spec.ts` |
| unit | `public-output-v2` | `field-redaction` | `test/unit/public-output-v2-redaction.spec.ts` |
| unit | `public-output-v2` | `location-redaction` | `test/unit/public-output-v2-redaction.spec.ts` |
| unit | `public-output-v2` | `assembler-allowlist` | `test/unit/public-result-assembler-v2.spec.ts` |
| unit | `public-output-v2` | `ordinal-ids` | `test/unit/public-result-assembler-v2.spec.ts` |
| unit | `public-output-v2` | `derived-status` | `test/unit/public-result-assembler-v2.spec.ts` |
| unit | `public-output-v2` | `safe-errors` | `test/unit/public-output-v2-errors-projection.spec.ts` |
| unit | `public-output-v2` | `synthetic-parity` | `test/unit/public-output-v2-errors-projection.spec.ts` |
| unit | `public-output-v2` | `no-cutover-import-inventory` | `test/unit/public-output-v2-no-cutover.spec.ts` |
| Golden | `public-output-v2` | `public-output-v2-projection` | `test/golden/public-output-v2.spec.ts` |
| Golden | `public-output-v2` | `public-output-v2-determinism` | `test/golden/public-output-v2.spec.ts` |

## 2. Schema family ownership

`test/unit/public-output-v2-contract.spec.ts` 同时覆盖正例和 deliberate mutation：

1. raw/public boundary；
2. backend ledger；
3. canonical collections；
4. snapshot；
5. scope；
6. capability；
7. abort/status；
8. backend/status；
9. anchor/status；
10. location/degradation；
11. evidence/ID；
12. safe error。

其中 backend family 逐项覆盖 complete/no-result、early-stop、output-limit、aborted、
process timeout、process error、unavailable、incomplete + complete fallback，以及
backend-specific reason、hitCount、limit/degradation、strategyComplete 的反向组合；
snapshot family 额外核对 discarded/exclusion count；public location family直接攻击
absolute/drive/UNC/backslash/root escape/NUL/display controls，并拥有 literal
`[REDACTED_PATH]` + `resolvable=true` 的 placeholder-collision 正例。

字段 hostile matrix 直接拥有 uppercase、underscore、hyphen、camel、Pascal、quoted
JSON/JS key、bare/truncated ESC、DEL、bidi；Golden 对相同值执行完整 projection forbidden
scan。AWS/GitHub/JWT fixed credential、phone PII、unterminated quote/template 有 direct
policy owners；credential + phone + malformed template 组合进入 service/structured/text/
debug synthetic projections。Golden 同时对 nested `exclusionSummary` key order 做 byte
determinism。

## 3. Runtime artifacts

- strict contract：`src/contracts/v2/locate-result-v2.ts`
- field policy：`src/evidence/public-output/sensitive-value-policy-v2.ts`
- assembler：`src/evidence/public-output/public-result-assembler-v2.ts`
- synthetic projection：`src/evidence/public-output/synthetic-locate-projection-v2.ts`
- synthetic fixture：`testkit/fixtures/public-output-v2/synthetic-locate-v2.ts`
- import inventory：`testkit/contracts/public-output-v2-import-inventory.ts`

上述 module 没有从 package barrel、production Evidence Engine、MCP 或 CLI 导出。
