# `repo_nav_locate` API Reference

Schema version：`2.0`。下方 machine-readable 区块由当前 Zod/JSON Schema 投影校验，包含输入字段、required、枚举、输出字段和类型化错误示例。

```json docs-smoke:schema-reference
{
  "toolName": "repo_nav_locate",
  "schemaVersion": "2.0",
  "input": {
    "fields": [
      "anchors",
      "layers",
      "limits",
      "negativeTerms",
      "question",
      "repoPath",
      "termCase",
      "terms"
    ],
    "required": [
      "repoPath",
      "terms"
    ],
    "enums": {
      "anchorKinds": [
        "symbol",
        "file",
        "table",
        "route",
        "term"
      ],
      "layers": [
        "client",
        "server",
        "db",
        "test",
        "docs",
        "config",
        "unknown"
      ],
      "termCase": [
        "sensitive",
        "insensitive",
        "smart"
      ]
    },
    "example": {
      "repoPath": "/workspace/repository",
      "question": "Where is the value mapping implemented?",
      "terms": [
        "external_id",
        "internalId"
      ],
      "anchors": [
        {
          "kind": "symbol",
          "value": "mapIdentifier"
        }
      ],
      "layers": [
        "server"
      ]
    }
  },
  "output": {
    "fields": [
      "abortSource",
      "applied",
      "backend",
      "backends",
      "candidates",
      "capabilities",
      "caseSensitive",
      "code",
      "completion",
      "confirmed",
      "consistency",
      "coverage",
      "degradations",
      "discardedEvidenceCount",
      "discoveredBy",
      "effective",
      "error",
      "evidence",
      "evidenceClass",
      "excerpt",
      "exclusionSummary",
      "fallbackChecked",
      "field",
      "fields",
      "file",
      "filesChecked",
      "gitState",
      "hitCount",
      "id",
      "indexFreshness",
      "indexState",
      "kind",
      "limitsReached",
      "lines",
      "location",
      "message",
      "nextActions",
      "normalizedTerms",
      "ok",
      "operations",
      "policyVersion",
      "promotionRequirements",
      "provenance",
      "reason",
      "reasonCode",
      "reasonCodes",
      "recoverable",
      "redaction",
      "repositoryRef",
      "requestIndex",
      "requested",
      "resolvable",
      "role",
      "satisfaction",
      "schemaVersion",
      "scope",
      "semanticClassification",
      "snapshot",
      "snapshotRef",
      "status",
      "strategyComplete",
      "suggestedAction",
      "symbol",
      "termination",
      "textSearch",
      "unmatchedLayers",
      "unsatisfiedAnchors",
      "unsupportedLanguageHits",
      "value",
      "verifiedBy"
    ],
    "enums": {
      "statuses": [
        "ok",
        "partial",
        "no_result",
        "backend_unavailable",
        "timeout",
        "cancelled"
      ],
      "toolErrors": [
        "INVALID_INPUT",
        "INVALID_REPOSITORY",
        "PATH_OUTSIDE_ROOT",
        "INTERNAL_ERROR"
      ]
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
