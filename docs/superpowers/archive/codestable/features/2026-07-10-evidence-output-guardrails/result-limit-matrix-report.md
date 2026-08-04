---
doc_type: feature-evidence
feature: 2026-07-10-evidence-output-guardrails
status: current
---

# Result limit / nextAction matrix 证据

| Limit | 触发证据 | Status | Retry |
|---|---|---|---|
| maxFiles | stable file order 后确有额外 eligible file | partial | 当前值 < 20 |
| maxConfirmed | stable confirmed selection 后确有截断 | partial | 当前值 < 20 |
| maxCandidates | existing/derived candidate 确有截断；0 合法 | partial | 当前值 < 20 |
| maxFileBytes | reader typed failure + UNVERIFIED exclusion | partial | never |
| maxExcerptBytes/Lines | reader typed failure + UNVERIFIED exclusion | partial | never |
| timeoutMs | first-writer-wins engine deadline/abort source | timeout | internal deadline 且当前值 < 30000 |

- `ResultBudgetSelector` 在截断前按 canonical public key 排序；backend hit 与 filesystem arrival permutation 不改变 retained evidence/ID/order。
- caller 主动传小值但没有 eligible overflow 时不产生 `MAX_*_REACHED`。
- backend incomplete 不再冒充 maxFiles；只形成 coverage gap。
- backend 的固定 10 秒 process timeout 与 request `timeoutMs` 分层：前者不是 caller-adjustable limit，不建议提高 request limit。
- 验证：CMD-LIMITS → 3 passed；另有 unit 对 adjustable schema maxima 与 fixed caps 的 exact no-retry 断言。
