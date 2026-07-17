# Web

## 快速开发

先完成 `design`，再生成 Web 编码提示词。

## 命令

- `pnpm -s work:frontend:web`：生成 Web 阶段 Prompt。
- `pnpm -s work:frontend:web --list`：查看默认配置。

## 作用

生成需求目录内的 `frontend/web/frontend.prompt.md`，交给编码 AI 实现 Web 页面和测试。

## 例子

```bash
pnpm -s work:frontend:web --require "使用现有组件库"
```
