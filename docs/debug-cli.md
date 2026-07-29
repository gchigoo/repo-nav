# RepoNav Debug CLI

Debug CLI 是本地诊断入口，不是第二套业务语义。`locate` 复用生产 Evidence Service（schema `2.0`），`probe` 只报告基础设施健康。正式 JSON 写 stdout，安全诊断写 stderr。Public Golden 命令已移除；源码仓使用 `npm run test:golden`。

## 帮助

```json docs-smoke:cli-help
{ "args": ["--help"], "expectedExit": 0, "schema": "help" }
```

## `debug locate`

必需参数为 `--repo`、`--question` 和至少一个可重复 `--term`。还可使用可重复的 `--anchor kind:value`、`--layer`、`--negative-term`，以及 `--term-case`、`--max-files`、`--max-confirmed`、`--max-candidates`、`--timeout-ms`。也可用 `--request <json>` 提供完整请求。

```json docs-smoke:cli-locate
{
  "args": [
    "debug",
    "locate",
    "--repo",
    "{{REPO_ROOT}}",
    "--question",
    "Where is the repository evidence service token used?",
    "--term",
    "REPOSITORY_EVIDENCE_SERVICE",
    "--anchor",
    "symbol:REPOSITORY_EVIDENCE_SERVICE"
  ],
  "expectedExit": 0,
  "schema": "locate"
}
```

`ok=true`（包括 `partial`、`no_result`、`backend_unavailable`、`timeout`、`cancelled`）退出 0；CLI 参数错误退出 2；`ok=false` 工具错误退出 3；启动或意外错误退出 1。Request schema 错误返回 v2 `INVALID_INPUT`（退出 3），不是 CLI 私有 error。

## `debug probe`

```json docs-smoke:cli-probe
{
  "args": ["debug", "probe", "--repo", "{{REPO_ROOT}}"],
  "expectedExit": 0,
  "schema": "probe"
}
```

输出只包含脱敏后的 repository root 标记和按配置顺序排列的 backend health。backend 不可用也是完成的诊断，退出 0；它不会输出 EvidencePack、判断源码事实或修改索引。

## Exit code 一览

| Exit | 含义                                 |
| ---: | ------------------------------------ |
|    0 | help、成功/可恢复 locate、完成 probe |
|    1 | 意外失败或 transport 失败            |
|    2 | 命令/参数用法错误                    |
|    3 | locate 工具错误或 probe 仓库无效     |
