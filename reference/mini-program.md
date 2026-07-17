# 小程序

## 快速开发

先完成 `design`，再生成小程序编码提示词。

## 命令

- `pnpm -s work:frontend:mini-program`：生成小程序阶段 Prompt。
- `pnpm -s work:frontend:mini-program --list`：查看默认配置。

## 作用

生成需求目录内的 `frontend/mini-program/frontend.prompt.md`，交给编码 AI 创建小程序代码 Patch。

## 例子

```bash
pnpm -s work:frontend:mini-program --require "目标平台为微信小程序"
pnpm -s work:frontend:mini-program --merge
```
