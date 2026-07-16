# Turborepo

## 新建项目

```bash
pnpm dlx create-turbo@latest
cd <项目目录>
git submodule add -b main https://github.com/swainle/workflows.git docs/workflows
node docs/workflows/install.mjs
pnpm docs:workflows:check
```

安装器修改根目录 `package.json`，所以所有 workflows 命令都从仓库根目录执行。

## 已有项目

```bash
git submodule add -b main https://github.com/swainle/workflows.git docs/workflows
node docs/workflows/install.mjs
```

通过 `--include` 指定 workspace：

```bash
pnpm docs:workflows:prompt:backend docs/requirements/REQ-0036-booking-fixture/01-prd.md \
  --include apps/api/src \
  --include packages/domain/src
```

workflows 不改变 `turbo.json` 和 `pnpm-workspace.yaml`。只有 Deployment 阶段在需求明确需要时，才允许 AI提出相关 Git Patch。
