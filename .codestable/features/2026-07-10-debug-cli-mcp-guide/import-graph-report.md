# CLI import graph report

`test:docs` 对真实 `.ts` 文件执行 import boundary scan：

- production `src/**`：39 files checked；没有指向 `tools/cli` 或 `testkit` 的 import。
- `tools/cli/**`：4 files checked；没有直接 import classifier、fallback 或 redactor internal。
- locate 只通过 application token 调 service，并通过 MCP 共用的 `createLocateToolOutput` 做 public policy/redaction serialization。
- probe 只依赖 reader/backends ports；golden 只依赖 F8 runner entrypoint。

Result：0 violations。
