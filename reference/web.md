# Web

## 快速开始

先在 `design` 中选择 Web，再通过 Dev 对话确认实现 Backend、Web 或两者。

```bash
pnpm -s work:dev --require "实现 Backend 和 Web，使用现有组件库"
```

## 命令

- `pnpm -s work:dev`：生成统一开发阶段 Prompt并在对话中选择 Web。
- `pnpm -s work:dev --list`：查看 Dev 默认配置。

## 作用

让开发 AI 读取 `design/web.md`、`design/web.ui.yaml`、公共和 Web Token，直接修改源码并验证。
