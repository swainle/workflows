# 小程序

## 快速开始

先在 `design` 中选择小程序，再通过 Dev 对话确认开发范围。

```bash
pnpm -s work:dev --require "实现 Backend 和微信小程序"
```

## 命令

- `pnpm -s work:dev`：生成统一开发阶段 Prompt并在对话中选择 Mini Program。
- `pnpm -s work:dev --list`：查看 Dev 默认配置。

## 作用

让开发 AI 读取小程序设计、UI YAML、公共和小程序 Token，直接修改源码并验证。
