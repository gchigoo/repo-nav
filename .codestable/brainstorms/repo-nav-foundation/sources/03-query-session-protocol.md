# 03. ??????? EvidencePack

## ????? session

??????????????????????

- ??????????
- ??????????
- ???????????? server / controller / service?
- ?????? CodeGraph????? fallback?
- ????????????

RepoNav ??????????????? session?

## Query Session

```ts
export interface QuerySession {
  readonly id: string;
  readonly repoPath: string;
  readonly originalQuestion: string;
  readonly currentQuestion: string;
  readonly status: QuerySessionStatus;
  readonly selectedAnchors: readonly EvidenceAnchor[];
  readonly excludedCandidates: readonly ExcludedCandidate[];
  readonly events: readonly QuerySessionEvent[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type QuerySessionStatus =
  | 'planning'
  | 'need_anchor'
  | 'searching'
  | 'narrowing'
  | 'ready'
  | 'blocked';
```

## Query Status

```ts
export type RetrievalStatus =
  | 'ok'
  | 'too_broad'
  | 'off_topic'
  | 'need_layer'
  | 'need_symbol'
  | 'need_anchor'
  | 'stale_index'
  | 'no_edge'
  | 'no_result';
```

?????

| ?? | ?? | LLM ??? |
|---|---|---|
| `ok` | ???????? | ?? EvidencePack ?? |
| `too_broad` | ???? | ?? layer/module/symbol facet |
| `off_topic` | ?????????? | ??????? negative constraint |
| `need_layer` | ???? client/server/db/test | ???? LLM ??? |
| `need_symbol` | ??????/?? anchor | ? locate anchor |
| `need_anchor` | ??????? | ? suggestedAnchors ??? |
| `stale_index` | ??????? | ?? fallback ??????? |
| `no_edge` | ?????????? | ? rg/AST ?? |
| `no_result` | ??????? | ???????????? |

## EvidencePack

```ts
export interface EvidencePack {
  readonly status: RetrievalStatus;
  readonly sessionId: string;
  readonly summary: string;
  readonly confidence: number;
  readonly anchors: readonly EvidenceAnchor[];
  readonly relationPaths: readonly RelationPath[];
  readonly excluded: readonly ExcludedCandidate[];
  readonly facets: readonly RetrievalFacet[];
  readonly nextQueries: readonly SuggestedQuery[];
  readonly indexHealth: IndexHealth;
}

export interface EvidenceAnchor {
  readonly file: string;
  readonly symbol?: string;
  readonly lines?: readonly [number, number];
  readonly layer: RepoLayer;
  readonly reason: string;
  readonly source: EvidenceSource;
  readonly confidence: number;
}

export type EvidenceSource =
  | 'codegraph'
  | 'ripgrep'
  | 'git'
  | 'ast-index'
  | 'alias-store'
  | 'manual';

export interface RelationPath {
  readonly kind:
    | 'api_to_service'
    | 'component_to_service'
    | 'service_to_entity'
    | 'caller_chain'
    | 'test_to_source'
    | 'migration_to_entity';
  readonly confidence: number;
  readonly nodes: readonly RelationNode[];
}

export interface RelationNode {
  readonly file: string;
  readonly symbol?: string;
  readonly lines?: readonly [number, number];
  readonly reason: string;
}

export interface ExcludedCandidate {
  readonly file: string;
  readonly symbol?: string;
  readonly reason: string;
  readonly excludedBy: 'user' | 'llm' | 'rule' | 'low_confidence';
}

export interface RetrievalFacet {
  readonly kind: 'layer' | 'module' | 'symbol' | 'route' | 'entity' | 'term';
  readonly label: string;
  readonly value: string;
  readonly hitCount: number;
  readonly recommended: boolean;
}

export interface SuggestedQuery {
  readonly mode: 'locate' | 'trace' | 'impact' | 'verify' | 'compare';
  readonly question: string;
  readonly reason: string;
}

export interface IndexHealth {
  readonly codegraphAvailable: boolean;
  readonly codegraphIndexFound: boolean;
  readonly fallbackChecked: boolean;
  readonly possibleStaleIndex: boolean;
  readonly notes: readonly string[];
}
```

## too_broad ??

```json
{
  "status": "too_broad",
  "summary": "?? 142 ? confirm/permission ?????????? meeting confirm ?? speaker confirm?",
  "facets": [
    { "kind": "module", "label": "speaker", "value": "speaker", "hitCount": 31, "recommended": true },
    { "kind": "module", "label": "meeting", "value": "meeting", "hitCount": 58, "recommended": false },
    { "kind": "layer", "label": "server", "value": "server", "hitCount": 74, "recommended": true }
  ],
  "nextQueries": [
    {
      "mode": "trace",
      "question": "trace speaker confirmation permission from server controller",
      "reason": "????????????"
    }
  ]
}
```

## off_topic ??

```json
{
  "status": "off_topic",
  "summary": "???? meeting approval???????? speaker confirmation?",
  "excluded": [
    {
      "file": "server/src/modules/meeting/approval/meeting-approval.service.ts",
      "symbol": "MeetingApprovalService",
      "reason": "??????????????",
      "excludedBy": "llm"
    }
  ],
  "nextQueries": [
    {
      "mode": "locate",
      "question": "locate speaker confirmation controller or service",
      "reason": "??????????"
    }
  ]
}
```

## no-caller ????

? CodeGraph ???? caller / ? references???RepoNav ?????? fallback?

1. `rg` ? symbol ???
2. `rg` ??? basename?
3. AST import/reference ???
4. ? fallback ??????? `stale_index` ? `no_edge`?????????????

## ????

?????

- anchors??? 8 ??
- relation paths??? 5 ??
- ?? path ????? 8 ??
- ?????????? 40 ??
- excluded??? 10 ??
- nextQueries??? 5 ??

???? LLM ???????????????
