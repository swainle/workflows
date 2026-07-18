# AI Project Workflows

把一个需求拆成可检查的阶段产物。阶段可读取全局事实和依赖链产物，但只能修改本阶段产物；编码阶段生成代码 Patch；需求完成后再统一同步全局项目文件。

## 安装

```bash
git submodule add -b main https://github.com/swainle/workflows.git docs/workflows
node docs/workflows/install.mjs
```

安装器会写入 `work:*` scripts，并创建缺失的全局示例文件，不覆盖已有文档。架构和流程图使用 Markdown 中的 Mermaid 代码块。平台说明见 [`reference/`](reference/)，详细安装说明见 [`install.md`](install.md)。

## 开始需求

```bash
pnpm -s work:req --issue 36
pnpm -s work:issue
```

当前需求记录在 Git metadata 中。阶段产物保存在 `docs/requirements/REQ-<编号>-<名称>/`；每次生成的 Prompt 和 AI 结果保存在阶段下的时间戳目录。

## 阶段命令

```bash
pnpm -s work:status
pnpm -s work:api
pnpm -s work:backend --require "使用现有框架"
pnpm -s work:backend --list
pnpm -s work:backend --merge
pnpm -s work:next frontend:web --require "复用现有组件库"
```

`--require` 可选，只影响本次 Prompt，并优先于 `config/stages/` 中的阶段默认配置。它不能突破安全规则、输出格式和允许修改范围。`--list` 查看该阶段默认配置、只读全局输入清单和稳定阶段产物；时间戳执行记录与 `.git.patch` 不属于阶段产物。

阶段读取配置的全局产物、`issue/issue.md`、依赖阶段产物和当前阶段产物，不读取源码、其他需求目录或未提供的项目文件。阶段生成的外层 Git Patch 只能修改本阶段目录。`work:issue` 可以读取当前主 Issue；`reference/*.md` 只提供快速开发、命令、作用和例子。

## 编码提示词

需要修改代码的阶段先生成需求产物，例如：

```text
backend/backend.prompt.md
frontend/web/frontend.prompt.md
deployment/deployment.prompt.md
```

把这些文件交给具备本地文件能力的编码 AI，由它阅读需求产物和现有源码，在该阶段最新时间戳目录生成下一个未占用的 `prompt.NN.git.patch`。工作流阶段本身不直接修改源码。

人工检查代码 Patch 后执行：

```bash
pnpm -s work:backend --merge
```

命令只选择最新时间戳目录中最新且尚未应用的 `prompt.NN.git.patch`，然后检查路径、执行 `git apply --check`、展示统计，并在确认后合并代码。`work:next` 已应用的 Patch 会被跳过，因此不会重复合并。代码 Patch 不得修改需求目录、工作流工具或全局架构与契约产物。

也可以在阶段仍为 `active` 时先执行 `work:<阶段> --merge`。它只应用并记录当前阶段结果，不完成阶段；随后执行 `work:next` 时会跳过已应用的 Patch，只完成状态更新并继续。

## 重做阶段

已完成阶段可以直接重新执行：

```bash
pnpm -s work:backend --require "调整实现约束"
```

该阶段切换为 `active`，自身及所有传递依赖它的后续阶段从 `completed` 移除；无关并行阶段保持完成。旧产物和已应用 Patch 保留。`work:status` 显示新的 `active`、`ready` 和 `blocked` 状态。

当前已经是 `active` 的阶段也可以再次执行同一命令；工作流生成新的时间戳 Prompt，并把 active 指向最新记录。存在其他 active 阶段时仍会拒绝切换。

## 同步全局数据

全部选定阶段完成后执行：

```bash
pnpm -s work:patch
pnpm -s work:next
```

`work:patch` 读取本需求当前产物和允许的全局文件，在 `patch/<时间戳>/` 生成一个中间 Git Patch。`work:next` 检查 Patch 路径、执行 `git apply --check`、展示统计，并在人工确认后应用。

最终 Patch 还必须创建或更新需求根目录的 `completion.md`。该文件只保留元信息、完成结果、语义修改、迁移要求、测试结论和关联记录，可以直接作为 Pull Request 描述；不重复 GitHub 已有的文件清单、Commit、代码 Diff 或完整测试日志。即使没有全局文件需要同步，也必须生成完成摘要。

全局 Patch 只允许修改：

- `docs/architecture/**`
- `docs/contracts/**`
- `packages/design-tokens/tokens/**`
- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`

## 结果文件

```text
<stage>/<timestamp>/
├─ prompt.md
├─ prompt.01.git.patch
└─ prompt.01.git.patch.md
```

再次尝试时使用 `.02`、`.03`，不得覆盖旧结果。没有修改时只生成分析文件，并记录 `patch_file: null` 与 `result: no-changes`。
