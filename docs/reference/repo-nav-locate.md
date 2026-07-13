# `repo_nav_locate` API Reference

Schema version：`1.0`。下方 machine-readable 区块由当前 Zod/JSON Schema 投影校验，包含输入字段、required、枚举、输出字段和类型化错误示例。

```json docs-smoke:schema-reference
{
  "toolName": "repo_nav_locate",
  "schemaVersion": "1.0",
  "input": {
    "fields": ["anchors", "layers", "limits", "negativeTerms", "question", "repoPath", "termCase", "terms"],
    "required": ["question", "repoPath", "terms"],
    "enums": {
      "anchorKinds": ["symbol", "file", "table", "route", "term"],
      "layers": ["client", "server", "db", "test", "docs", "config", "unknown"],
      "termCase": ["sensitive", "insensitive", "smart"]
    },
    "example": {
      "repoPath": "/workspace/repository",
      "question": "Where is the value mapping implemented?",
      "terms": ["external_id", "internalId"],
      "anchors": [{"kind": "symbol", "value": "mapIdentifier"}],
      "layers": ["server"]
    }
  },
  "output": {
    "fields": ["applied", "backend", "backends", "candidates", "caseSensitive", "code", "confirmed", "coverage", "discoveredBy", "error", "evidence", "evidenceClass", "excerpt", "exclusionSummary", "fallbackChecked", "file", "hitCount", "id", "indexFreshness", "indexState", "limitsReached", "lines", "location", "message", "nextActions", "normalizedTerms", "ok", "operations", "promotionRequirements", "provenance", "reasonCode", "reasonCodes", "recoverable", "redaction", "repositoryRoot", "role", "schemaVersion", "status", "suggestedAction", "symbol", "value", "verifiedBy"],
    "enums": {
      "statuses": ["ok", "partial", "no_result", "backend_unavailable", "timeout"],
      "roles": ["execution-site", "value-mapping", "definition", "reference", "related"],
      "confirmedReasons": ["EXACT_TERM_MATCH", "EXACT_SYMBOL_ANCHOR", "DIRECT_ALIAS_MAPPING"],
      "candidateReasons": ["EXACT_TERM_WITHOUT_DIRECT_MAPPING", "SYMBOL_REFERENCE_ONLY", "SAME_SCOPE_SIMILAR_IDENTIFIER", "SAME_ENTITY_SIBLING", "ALIAS_SOURCE_NEIGHBOR", "SECONDARY_BACKEND_HIT"],
      "promotionRequirements": ["USER_SEMANTIC_CONFIRMATION", "DIRECT_REFERENCE_REQUIRED", "CALL_PATH_REQUIRED"],
      "nextActions": ["ADD_TERM", "ADD_SYMBOL_ANCHOR", "CONFIRM_CANDIDATE", "INITIALIZE_CODEGRAPH", "RETRY_WITH_HIGHER_LIMIT"],
      "operations": ["CODEGRAPH_QUERY", "RIPGREP_SEARCH", "FILESYSTEM_READ_RANGE", "FILESYSTEM_FIND_MATCHES"],
      "backendReasons": ["CODEGRAPH_INDEX_MISSING", "CODEGRAPH_UNAVAILABLE", "CODEGRAPH_NO_RESULT", "RIPGREP_UNAVAILABLE", "RIPGREP_NO_RESULT", "BACKEND_PROCESS_FAILED", "BACKEND_ABORTED"],
      "limitReasons": ["MAX_FILES_REACHED", "MAX_CONFIRMED_REACHED", "MAX_CANDIDATES_REACHED", "MAX_FILE_BYTES_REACHED", "MAX_EXCERPT_BYTES_REACHED", "TIMEOUT_REACHED"],
      "exclusionReasons": ["NEGATIVE_TERM_MATCH", "OUTSIDE_LAYER_HINT", "DUPLICATE_LOCATION", "UNVERIFIED_FILE_CONTENT"],
      "redactionReasons": ["SECRET_LIKE_VALUE", "CONNECTION_STRING", "PERSONAL_DATA", "BINARY_OR_OVERSIZED_CONTENT"],
      "toolErrors": ["INVALID_INPUT", "INVALID_REPOSITORY", "PATH_OUTSIDE_ROOT", "INTERNAL_ERROR"]
    },
    "errorExample": {
      "ok": false,
      "error": {
        "code": "INVALID_INPUT",
        "message": "Locate request does not match the required schema.",
        "recoverable": true,
        "suggestedAction": "ADD_TERM"
      }
    }
  }
}
```

## 结果语义

- `ok=true` 表示工具完成；`status` 可为 `ok`、`partial`、`no_result`、`backend_unavailable` 或 `timeout`。
- `confirmed` 仅包含 filesystem-verified evidence；`candidates` 必须携带 promotion requirements。
- `coverage` 解释 backend、fallback、limits 与 exclusions；`nextActions` 给出有限、枚举化的下一步。
- `ok=false` 使用稳定错误 code、安全 message、recoverable 标记和可选 suggested action。
