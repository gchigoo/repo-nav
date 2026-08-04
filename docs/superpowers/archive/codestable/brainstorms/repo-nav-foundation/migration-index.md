# RepoNav 旧立项材料迁移索引

## 背景

本目录保存 RepoNav 在接入 CodeStable 之前形成的立项材料。当前项目尚无实现代码，这些内容仍是待讨论、待验证的想法，不能直接视为已经确认的需求、现状架构或正式 roadmap。

迁移时已确认：旧 Markdown 中原本的中文已经被实际写成 ASCII 问号 `?`，不是终端显示编码问题，无法通过切换字符编码恢复。迁移过程按字节原样保存现存内容，不猜测或补写已经丢失的文字。

## 来源映射

| 原路径 | 迁移后路径 | 推测性质 | 后续处理 |
|---|---|---|---|
| `README.md` | `sources/00-readme.md` | 项目入口与总体定位 | 讨论后重建新的项目入口和愿景索引 |
| `docs/01-product-brief.md` | `sources/01-product-brief.md` | 产品简述与能力设想 | 讨论后拆成 draft requirements |
| `docs/02-architecture.md` | `sources/02-architecture.md` | 目标态架构草案 | 作为 roadmap 架构方案输入，不作为现状架构 |
| `docs/03-query-session-protocol.md` | `sources/03-query-session-protocol.md` | Query Session 与 EvidencePack 协议草案 | 讨论后形成跨 feature 协议契约 |
| `docs/04-mcp-tool-contract.md` | `sources/04-mcp-tool-contract.md` | MCP 与 CLI 工具契约草案 | 讨论后形成公开接口约束 |
| `docs/05-mvp-roadmap.md` | `sources/05-mvp-roadmap.md` | MVP 分期草案 | 讨论后由 `cs-roadmap` 重建正式 roadmap |

## 治理状态

- 这些文件是历史输入材料，不是 CodeStable source of truth。
- 未经后续讨论确认，不应引用其中内容作为已拍板的产品或技术决策。
- 下一步从 `cs-brainstorm` 开始，对问题、受众、边界、成功标准和产品形态逐项重新确认。
