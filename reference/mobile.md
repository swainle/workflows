# 移动端

## 快速开发

先完成 `design`，再生成移动端编码提示词。

## 命令

- `pnpm -s work:frontend:mobile`：生成移动端阶段 Prompt。
- `pnpm -s work:frontend:mobile --list`：查看默认配置。

## 作用

生成需求目录内的 `frontend/mobile/frontend.prompt.md`，交给编码 AI 创建移动端代码 Patch。

## 例子

```bash
pnpm -s work:frontend:mobile --require "使用项目现有 Flutter 框架"
pnpm -s work:frontend:mobile --patch
```
