# 桌面端

## 快速开始

先完成 `design`，再生成桌面端编码提示词。

```bash
pnpm -s work:frontend:desktop --require "沿用现有 Tauri 壳层"
pnpm -s work:frontend:desktop --merge
```

## 命令

- `pnpm -s work:frontend:desktop`：生成桌面端阶段 Prompt。
- `pnpm -s work:frontend:desktop --list`：查看默认配置。

## 作用

生成需求目录内的 `frontend/desktop/frontend.prompt.md`，交给编码 AI 创建桌面端代码 Patch。
