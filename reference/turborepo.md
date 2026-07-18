# Turborepo

## 快速开始

在仓库根目录安装工作流并执行所有命令。

```bash
git submodule add -b main https://github.com/swainle/workflows.git docs/workflows
node docs/workflows/install.mjs
pnpm -s work:check
```

## 命令

- `node docs/workflows/install.mjs`：安装或更新命令。
- `pnpm -s work:check`：检查运行环境。

## 作用

让工作流复用根目录的 workspace、脚本和 Git 历史。
