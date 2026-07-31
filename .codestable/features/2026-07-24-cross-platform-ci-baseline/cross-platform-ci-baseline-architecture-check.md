---
doc_type: feature-architecture-check
feature: 2026-07-24-cross-platform-ci-baseline
created: 2026-07-28
status: updated
---

# F4 Architecture Check

## Scope
核对本 feature 落地的 CI/platform 安全网与 architecture 现状地图。

## Findings
- 新增唯一 workflow `.github/workflows/cross-platform-ci.yml` 与 `tools/ci/*` orchestrator，属平台验证挂载点。
- 不改变 production MCP/CLI/service v1 输出边，不修改 `package.json.engines` / `private`。
- F5 admission 前置：本地命令 + owner-authorized remote 六格 + aggregate + required-check 已齐备。

## Verdict
updated：记录 blocking six-cell matrix（Node 22/24 × ubuntu-24.04/windows-2025/macos-15-intel）与 `main` required check `cross-platform-required` 已落地；证据 run `30323465951`。
