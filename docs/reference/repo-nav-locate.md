# `repo_nav_locate` API Reference

当前 `repo-nav@2.0.0` 的 production locate contract 只有 schema version `2.0`；已删除的 `repo-nav/legacy-v1` package subpath 不属于 MCP 工具输出或公开 package surface。`question` 是可选展示字段，不进入检索计划。MCP 宿主收到的 `structuredContent` 仍是下方 schema `2.0` 结果；`content` 文本是精简 agent view（`schemaVersion: "2.0-agent"`），其中 `nextActions` 带建议 term、symbol、candidate id 或更高 limit。下方 machine-readable 区块由当前 Zod/JSON Schema 投影校验，包含输入字段、required、枚举、输出字段和类型化错误示例。项目版本、package export 与 release evidence 状态见 [`../project-status.md`](../project-status.md)。

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
    "required": ["repoPath", "terms"],
    "enums": {
      "anchorKinds": ["symbol", "file", "table", "route", "term"],
      "layers": ["client", "server", "db", "test", "docs", "config", "unknown"],
      "termCase": ["sensitive", "insensitive", "smart"]
    },
    "example": {
      "repoPath": "/workspace/repository",
      "question": "Where is the value mapping implemented?",
      "terms": ["external_id", "internalId"],
      "anchors": [
        {
          "kind": "symbol",
          "value": "mapIdentifier"
        }
      ],
      "layers": ["server"]
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
