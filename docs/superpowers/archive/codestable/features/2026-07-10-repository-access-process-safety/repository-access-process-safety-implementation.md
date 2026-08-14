---
doc_type: feature-implementation
feature: 2026-07-10-repository-access-process-safety
status: completed
---

# repository-access-process-safety 实现记录

## Step 证据

- S1：实现 repository root canonicalization、normalized relative POSIX path 校验、open 前后 realpath containment 与 open 后 fstat regular-file 防线；`repository-safety/windows-reparse-policy` 的 4 个真实 filesystem cases 通过。
- S2：实现 64 KiB 分块 bounded read、文件/摘录 bytes 与 lines 上限、UTF-8/binary 判别、inclusive range 和 literal match；`reader-limits/reader-failures` 的 4 个 cases 通过且 rename 证明 handle 已关闭。
- S3：实现 Zod `SafeProcessRequest/Result` 判别联合、受控 env、`shell:false`、独立 stdout/stderr raw-byte caps 与 Nest provider；`process-contract/process-output-isolation` 的 6 个 helper-process cases 通过。
- S4：实现 abort/timeout/output-cap 的 graceful→hard process-tree termination、一次 settle、listener/timer 清理；真实 helper 启动 direct child + descendant，3 种终止路径均证明 PID 退出；reader abort 无迟到 fulfillment 且文件可 rename。

## 验证结果

- `npm run build`：通过。
- `npm run typecheck`：通过。
- `npm test -- --group repository-safety --group reader-limits --group reader-failures`：2 files / 8 tests 通过。
- `npm test -- --group process-contract --group process-output-isolation`：1 file / 6 tests 通过。
- `npm test -- --group process-cleanup --case reader-abort-no-late-completion`：1 file / 4 tests 通过。

## 交付物索引

- Repository 契约与错误：`src/contracts/repository-access.ts`。
- Safe process 契约：`src/contracts/safe-process.ts`。
- Filesystem adapter：`src/repository/node-repository-reader.ts`。
- Process adapter：`src/repository/node-safe-process-runner.ts`。
- Nest 挂载点：`src/evidence/evidence.module.ts`、`src/repository/repository-backends.module.ts`。
- Helper fixture：`testkit/fixtures/process/process-helper.ts`。
- 验证：`test/unit/repository-*.spec.ts`、`test/unit/safe-process-runner.spec.ts`、`test/unit/process-cleanup.spec.ts`。

## 范围与清洁度

- 删除 F1 的 fail-closed `UnconfiguredRepositoryReader`，改由真实 `NodeRepositoryReader` 挂载；默认 evidence service 仍保持 fail-closed。
- 未实现检索 backend、classification、status aggregation、redaction、MCP tool 或持久化。
- 新增代码未发现调试输出、临时 TODO/FIXME/XXX、注释掉代码或无用 import。
- helper 在任意受控 cwd 下使用仓库内绝对 `tsx` loader file URL；不依赖 cwd 解析测试工具。

## 失败恢复记录

- S1 首次 typecheck 发现当前 `@types/node` 的 `FileHandle.stat()` 不接受 AbortSignal options；保持 async boundary 前后 abort 检查并改用实际类型支持的签名后通过。
- S3 首轮 helper 从临时 cwd 无法解析 bare `tsx`；改为仓库内 loader 绝对 file URL 后，类型检查和 6 个定向 cases 全部通过。
- S4 首次 typecheck 发现 range 参数与 Vitest matcher 泛型签名不符；仅修正测试调用后，4 个 cleanup cases 通过。

## 知识候选

- Windows ESM 的 `--import` 绝对路径必须转换为 `file://` URL；否则 Node 报 `ERR_UNSUPPORTED_ESM_URL_SCHEME`。
- Windows process-tree cleanup 使用 `taskkill /PID /T`，grace 后 `/F`；POSIX 使用 detached process group 和负 PID signal。
- Node 当前 FileHandle API 类型不保证所有 fs operation 都接受 AbortSignal，reader 需在每个 await 前后主动检查并在 finally 关闭 handle。


## Review-fix round 1

- REV-001：termination state machine 现在观察 taskkill exit/error；graceful 失败立即 hard kill，hard kill 后有固定 2 秒 close deadline，全部 tree/direct kill 路径失败时以 runner invariant rejection 有界结束；同时封闭初始 abort check 与 listener 注册之间的 race。
- REV-002：root containment 改为 segment-aware `..` / `..${sep}` 判定，root 内 `..notes.md` 与 `..cache/entry.ts` 正例通过，parent/junction escape 负例继续通过。
- REV-003：stdout/stderr raw bytes 达到 cap 即终止；exact 1024-byte 普通 helper 与 direct+descendant keep-alive tree 均返回对应 limit。
- 定向复核：typecheck 通过；repository-safety 5 tests、process contract/isolation 6 tests、process cleanup 6 tests 全部通过。
- 失败恢复：首次 final deadline 复用了过短 grace，误伤真实 Windows taskkill close；改为 2 秒后真实 cases 通过。第二次仅 synthetic all-denied fixture 未记录 PID 导致测试清理失败，已按窄范围说明改用 tree inventory，第三次验证通过。


## Review-fix round 2

- REV-001 error-event bypass：runner 记录 ChildProcess `spawn` 成功状态；只有 pre-spawn error 映射 `spawn-error`。termination 阶段的 child error 维持 hard-kill/final deadline，不能提前 settle；成功 spawn 后的非 termination error 作为 cleanup invariant rejection。
- Invariant settle 不移除 owned child 的 error sink；迟到 `error` 被吸收，迟到 `close` 只做 listener 收尾，不二次 settle。
- Synthetic test 现在让 tree terminator reject 且 direct kill 连续异步 emit error；结果仍在固定 deadline 内 reject invariant、不是 spawn-error，PID 由 fixture finally 清理。
- 定向复核：typecheck、6 process contract/isolation tests、6 cleanup tests 全部通过。
