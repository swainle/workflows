# 桌面端

## 快速开始

先在 `design` 中选择 Desktop，再通过 Dev 对话确认开发范围。

```bash
pnpm -s work:dev --require "实现 Desktop，沿用现有 Tauri 壳层"
```

## 命令

- `pnpm -s work:dev`：生成统一开发阶段 Prompt并在对话中选择 Desktop。
- `pnpm -s work:dev --list`：查看 Dev 默认配置。

## 作用

让开发 AI 读取桌面设计、UI YAML、公共和桌面 Token，直接修改源码并验证。
