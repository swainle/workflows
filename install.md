# 通用安装

## 需要什么

- Git
- Node.js 20+
- pnpm 9+
- GitHub CLI `gh`

`gh` 需要人工安装并登录：

```bash
gh auth login
```

## 安装 workflows

在业务项目根目录执行：

```bash
git submodule add -b main https://github.com/swainle/workflows.git docs/workflows
node docs/workflows/install.mjs
pnpm -s work:check
```

## 更新 workflows

```bash
node docs/workflows/install.mjs
```

通过 `--branch <分支>` 指定 workflows 分支；省略时默认使用 `main`。安装器会先抓取远端分支，再切换并通过 fast-forward 更新，同时同步宿主项目 `.gitmodules` 中的分支设置。

第二次运行安装器不会覆盖已经修改的项目文档。

架构和流程图保存在 `.md` 文件的 `mermaid` 代码块中，可由 GitHub、支持 Mermaid 的编辑器或文档站点直接渲染，无需 Java 或额外的本地 JAR。
