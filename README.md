# AI Project Workflows

基于 Turborepo 的 AI 项目开发工作流。以一个 GitHub Issue 为一个需求，通过 `design → dev → test → deployment → patch` 推进设计、开发、验证、部署和全局项目事实。

## 环境要求

- Git
- Node.js 20+
- pnpm 9+
- GitHub CLI `gh`

登录 GitHub：

```bash
gh auth login
```

## 创建远程仓库

新项目可以先创建并克隆 GitHub 仓库：

```bash
gh repo create <仓库名称> --private --clone
cd <仓库名称>
```

将 `--private` 改为 `--public` 可创建公开仓库。已有本地或远程仓库时跳过本节。

## 初始化本地仓库

如果当前目录还不是 Git 仓库：

```bash
git init
```

如果还没有 `package.json`：

```bash
pnpm init
```

已有仓库直接进入仓库根目录，不覆盖现有的 Git 和 `package.json` 配置。

## 安装 monorepo

创建 `pnpm-workspace.yaml`：

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

创建 `turbo.json`：

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^test"]
    }
  }
}
```

安装 Turborepo：

```bash
pnpm add turbo --save-dev --workspace-root
```

在根目录 `package.json` 中添加统一命令，保留已有脚本：

```json
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test"
  }
}
```

将缓存和依赖目录加入 `.gitignore`：

```gitignore
node_modules
.turbo
```

不要在已有文件的仓库中执行 `pnpm dlx create-turbo@latest .`。当目录中已有 `docs/`、`packages/` 或 `package.json` 时，脚手架会因文件冲突停止。

## 创建子项目（可选）

根据目标平台创建应用：

- [Web](reference/web.md)
- [小程序](reference/mini-program.md)
- [桌面端](reference/desktop.md)
- [移动端](reference/mobile.md)

应用放在 `apps/<应用名>`，共享包放在 `packages/<包名>`。每个工作区项目必须包含自己的 `package.json`。

## 安装 workflows

在项目根目录执行：

```bash
git submodule add -b main https://github.com/swainle/workflows.git docs/workflows
node docs/workflows/install.mjs
pnpm -s work:check
```

需要使用 `develop` 分支时：

```bash
git submodule add -b develop https://github.com/swainle/workflows.git docs/workflows
node docs/workflows/install.mjs --branch develop
pnpm -s work:check
```

安装器会添加 `work:*` scripts，并创建缺失的架构、契约和开发约定文件；已有文件不会被覆盖。

更新 workflows：

```bash
node docs/workflows/install.mjs
```

## 提交 Issue

开始需求开发前，在 GitHub 创建 Issue：

```bash
gh issue create --title "<需求标题>" --body "<目标、范围和验收结果>"
```

也可以运行 `gh issue create` 交互式填写，或在 GitHub 网页中创建。项目初始化时可以暂不提交 Issue，但开始 workflows 需求时必须提供一个已有的 Issue 编号。

## 开始需求开发

选择 Issue 并开始设计：

```bash
pnpm -s work:req --issue <Issue 编号>
pnpm -s work:design
```

首次选择 Issue 时输入英文短名称。工作流在 `docs/requirements/REQ-<编号>-<名称>/` 创建需求目录，并按以下固定阶段执行：

```text
design → dev → test → deployment → patch
```

对应命令：

```bash
pnpm -s work:design
pnpm -s work:dev
pnpm -s work:test
pnpm -s work:deployment
pnpm -s work:patch
```

Dev 是唯一可以直接修改业务源码的阶段；其他阶段通过 Git Patch 提交结果。

Design 在需求的 `design/` 目录生成 development、test、production 各自的 `.compose.yml` 和 `.env`。Dev、Test、Deployment 只读使用对应环境文件；最终 Patch 才把确认后的文件同步到宿主项目 `docker/`。

执行阶段后，把生成的 `prompt.md` 交给 AI。AI 返回结果后，应用当前阶段并开始下一阶段：

```bash
pnpm -s work:next <下一阶段>
```

如果只想合并当前 Patch 查看效果，同时保持阶段为 `active`：

```bash
pnpm -s work:<阶段> --merge
```

合并后可以重新执行同一阶段生成新的 Prompt；确认最终结果后再运行 `work:next` 完成阶段。

例如：

```bash
pnpm -s work:next dev
pnpm -s work:next test
pnpm -s work:next deployment
```

查看当前状态和阶段配置：

```bash
pnpm -s work:status
pnpm -s work:<阶段> --list
```

执行阶段时可以添加本次约束：

```bash
pnpm -s work:<阶段> --require "<约束>"
```

所有固定阶段完成后生成并应用最终项目变更：

```bash
pnpm -s work:patch
pnpm -s work:next
```

最终结果记录在需求目录的 `completion.md`，可作为 Pull Request 描述。

| 分类 | 说明 |
|---|---|
| 全局产物 | 全项目长期有效的架构、契约、开发约定、Tokens、`docker/` 编排和项目配置 |
| 阶段产物 | 当前需求各阶段确认后的稳定结论 |
| 阶段提示词 | 某次阶段执行生成的 `prompt.md` |
| 阶段补丁 | AI 提出的阶段结果或最终项目修改 |
| 阶段补丁分析 | Patch 的引用、影响文件、角色和验证记录 |
