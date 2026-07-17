# AI Project Workflows v0.1.0

把需求、架构、接口、数据库、权限、测试和部署交给 AI 分阶段分析，同时保留人工检查和 Git 历史。

## 安装

```bash
git submodule add -b main https://github.com/swainle/workflows.git docs/workflows
node docs/workflows/install.mjs
```

安装器会：

- 自动切换并快进更新指定分支，默认使用 `main`；
- 下载 PlantUML 到不纳入 Git 管理的 `packages/`；
- 把 `work:*` 命令写入宿主项目 `package.json`；
- 创建缺失的全局示例文件；
- 不覆盖已有项目文档。

详细说明：

- [通用安装](install.md)
- [Web](reference/web.md)
- [移动端](reference/mobile.md)
- [小程序](reference/mini-program.md)
- [桌面端](reference/desktop.md)
- [Turborepo](reference/turborepo.md)

## 开始一个需求

```bash
pnpm -s work:req --issue 36
# 首次创建时按提示输入英文短名称，例如 booking fixture
pnpm -s work:issue
```

每次执行在对应阶段下创建 `{时间戳}/`，其中 `prompt.md` 是提示词，AI 结果依次保存为 `prompt.01.git.patch`、分析记录 `prompt.01.git.patch.md` 和可选的 `prompt.01.<global>.git.patch`；再次尝试时序号递增且不得覆盖已有结果。

`work:req --issue 36` 会读取 GitHub Issue 的标题和 URL。没有对应目录时，它会提示输入英文短名称，把空格转换为 `-`，并创建例如 `REQ-0036-booking-fixture` 的目录；已有唯一对应目录时直接选中。REQ 路径和 Issue 信息保存在当前 Git worktree 的元数据中，供后续命令使用。

不带参数运行 `pnpm -s work:req` 可以查看当前 REQ、目录、Issue 标题和 URL。

`work:issue` 生成的 Prompt 包含全部候选阶段、常见流程方案和依赖规则。AI 分析并与使用者确认后，通过外层 Patch 创建 `issue/issue.md`；其中只保存本需求实际选择的一份工作流。工作流允许分支与汇合，不按阶段编号机械执行。

## 设计与多平台前端

界面需求先选择一次共享的 `design` 阶段，再为实际交付的平台分别选择前端阶段：

```bash
pnpm -s work:design
pnpm -s work:frontend:web
pnpm -s work:frontend:mobile
pnpm -s work:frontend:mini-program
pnpm -s work:frontend:desktop
```

`issue/issue.md` 不需要把所有平台都写入工作流，只选择本需求真正交付的平台。`design` 统一定义用户目标、信息架构、主流程、状态和跨平台一致性；各 `frontend:<platform>` 读取同一设计产物以及对应的 `reference/*.md`，在独立目录中生成 Prompt 和结果。多个平台可以在依赖满足后分别执行，最终由 `test` 汇合。

例如 Web 与移动端共同开发时，两个实现阶段都依赖 `design` 和所需契约，`test` 同时依赖 `frontend:web` 与 `frontend:mobile`。完成当前阶段并直接进入某个平台可执行：

```bash
pnpm -s work:next frontend:web
```

## 推进工作流

```bash
pnpm -s work:status
pnpm -s work:next process
```

`work:status` 显示每个选定阶段的状态：

- `completed`：外层 Patch 已应用；
- `active`：Prompt 已生成，等待 AI 结果；
- `ready`：依赖均已完成，可以直接执行；
- `blocked`：仍在等待依赖阶段。

`work:next process` 会定位当前活动阶段最新的局部 Patch和可选全局 Patch，逐个执行 `git apply --check` 并展示修改，等待人工确认后依次应用；全部成功后才将当前阶段标记为完成，并验证 `process` 的依赖后生成它的 Prompt。

最后一个阶段使用不带下一阶段的命令完成：

```bash
pnpm -s work:next
```

也可以直接执行 `work:status` 列出的 ready 阶段，例如 `pnpm -s work:api`。存在尚未处理的 active 阶段，或依赖没有完成时，命令会拒绝生成新的 Prompt。每个阶段只读取 `issue/issue.md`、依赖阶段目录中的当前产物、当前阶段产物、配置的全局文件和显式 `--include`；不会把旧时间戳执行记录重新加入上下文。

每个阶段都由该领域的多名专业人员共同分析。AI 会先整理当前理解，对不清楚的需求每次只询问一个问题并等待回答，逐条确认到理解达到至少 95% 后才形成一致结论并生成文件。应用外层 AI Patch 和本阶段全局 Patch 后，再进入下一阶段，确保后续 Prompt 读取到最新事实。

阶段产物确认并按需同步到远程仓库后，分析文件会提供一段 Issue 评论建议。由人工补充远程产物链接并填写到主 Issue；工作流不会自动创建评论。

## 阶段目录和全局 Patch

需求产物、Prompt 和结果都存放在语义阶段目录，不依赖连续编号：

```text
REQ-0036-booking-fixture/
├─ issue/issue.md
├─ issue/20260717103000/
│  ├─ prompt.md
│  ├─ prompt.01.git.patch
│  ├─ prompt.01.git.patch.md
│  └─ prompt.01.product.git.patch
├─ process/process.puml
├─ backend/backend.prompt.md
└─ frontend/web/
```

全局 Patch 与局部 Patch 位于同一个时间戳目录，例如 `prompt.01.product.git.patch`、`prompt.01.process.git.patch`。它只修改长期有效的全局架构、契约或配置；没有全局变化时不创建。`work:next` 会把它与局部 Patch 分别检查和应用。

全局流程按业务模块存放在 `docs/architecture/process/`。需求级流程文件使用 `process/process.puml` 或 `process/<topic>.puml`，对应执行目录中的 `prompt.NN.process.git.patch` 负责修改全局流程模块。

## 规则

- 全局文件表示项目当前事实。
- 需求目录名使用四位编号，例如 `REQ-0010-booking`。
- 阶段目录保存该阶段当前确认的需求产物。
- 阶段下的十四位时间戳目录保存一次 Prompt 和所有 AI 尝试记录。
- `.git.patch.md` 固定表示分析记录，不参与 `git apply`。
- 待确认的 Issue 本次不动，留到下次需求流程。
- 不记录 `base_commit`，不提供 `save` 和 `review` 命令。
