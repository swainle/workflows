# AI 项目工作流

一套通过 `AGENTS.md` 驱动的项目工作流，帮助 AI 按需求、系统设计、组件规范、开发、测试和部署阶段协作，同时限制每个阶段可以操作的文件范围。

## 功能

- 用 GitHub Issue 编号启动需求整理。
- 按系统、组件、开发、测试和部署阶段路由任务。
- 每个阶段用 `**` 显式禁止所有文件，再由更具体的 CRUD 规则按需开放。
- 按“需求 → system → 组件设计 → dev → test → deploy”串行，只读前置产物，只修改当前阶段文件。
- 保留宿主项目已有的 `AGENTS.md` 规则。
- 支持通过消息结尾控制只读、澄清、修改以及提交推送行为。
- 默认使用中文回复、编写文档和测试描述；代码标识符保持项目既有风格，
  仅为领域、事务、并发、安全和兼容性等非直观逻辑添加必要中文注释。

## 安装

将本仓库指定分支作为子模块挂载到宿主项目的 `docs/workflows`：

```bash
git submodule add -b main <repository-url> docs/workflows
```

也可以固定到 Tag：

```bash
git submodule add -b v1.0.0 <repository-url> docs/workflows
```

然后更新并安装当前检出的分支：

```bash
node docs/workflows/install.mjs
```

安装器会把 `templates/AGENTS.template.md` 同步到宿主项目根目录 `AGENTS.md`
的托管区块中，保留托管区块之外的宿主规则。未传 `--branch` 时会在工作流子模块
执行 `git pull --ff-only`，然后安装更新后的内容。

需要切换并更新到指定分支时使用：

```bash
node docs/workflows/install.mjs --branch develop
```

`--branch` 是可选参数，仅接受分支名。子模块处于 detached HEAD（例如直接检出
Tag）时无法更新“当前分支”，需要通过 `--branch` 指定要切换和更新的分支。

## 用法

在 AI 对话中使用方括号指令：

```text
[12] 增加预约改期
[system] 调整系统架构
[web] 讨论预约页面规范
[web] frontend 设计组件
[api] backend 设计组件
[web dev] 调整登录按钮圆角
[web test] 验证登录页面
[deploy] api
[deploy] 检查生产部署配置
[deploy] update 升级数据库
```

组件名必须已在宿主项目的 `docs/system/c2.md` 中声明。
`[system]` 阶段使用 `docs/system/c1.md` 维护系统上下文图，使用
`docs/system/c2.md` 维护容器图和组件清单。组件清单按类型分组，并登记应用目录、
设计目录、实际暴露的开发环境端口和地址。自研组件先使用表格，表格后的连接信息与
基础设施统一使用组件列表和缩进属性；中间件存在管理界面时，还登记管理 URL、
可直接使用的开发默认账号密码、凭据来源和对应版本的官方文档，不保留未定值。
容器图使用 Mermaid `flowchart LR`，按用户与外部系统、前端、后端、基础设施从左到右分层，
每个分层内部的组件从上到下排列。
组件设计阶段在组件设计目录中使用 `component.md` 维护概述、设计架构文件索引和完整文件结构，
使用 `c3.md` 的 Mermaid `flowchart LR` 维护组件图，主分层从左到右、分层内部从上到下；
在存在需要长期维护的代码结构时使用 `c4.md`
以代码总览和按业务能力划分的 Flowchart 章节维护关键代码单元、依赖及关键公开函数；
图的主分层从左到右，层内从上到下。跨组件业务流程由系统 `process.md` 维护；组件目录按实际
能力分别维护领域、接口、数据、授权和界面规范，不创建重复的组件流程文件。
`component.md` 的完整文件树同时规划单元、集成、契约和端到端测试中的适用层级及其
测试文件、fixture、支持代码和配置；`[<组件> test]` 按该结构实现自动化测试。
组件任务在组件名后使用 `frontend` 或 `backend` 可以启用对应的完整设计模式。
`[web] frontend 设计组件` 将信息架构、路由权限、布局、设计系统、数据请求、状态、
表单、页面状态、反馈、可访问性、性能、错误监控和测试分别写入单一职责文件；
`[api] backend 设计组件` 默认采用 DDD，按限界上下文用图表达领域模型、按需状态与关键时序，并维护领域事件列表；接口、认证、授权、领域、数据、校验、
错误、配置、密钥、可观测性、测试和运行部署要求分别写入单一职责文件。
Backend 模式完整读取 `templates/backend-design.template.md`，按“C3 → DDD（含按需状态图与关键时序图）→
接口与边界 → 机器可读模型 → C4 → 工程与运行 → 部署交付 → component.md 汇总”的顺序执行，
并使用其中的固定章节模板；不适用的可选文件和章节不创建。
`[<组件> dev]` 严格依据 `component.md` 的设计架构索引和相关设计文件开发；开始修改前
必须建立需求或设计到代码及验证方式的映射，清零会影响行为、契约、安全、数据、
兼容性或文件结构的未确认项，并验证设计与实际依赖、框架和外部契约可行。信息缺失、
设计冲突或可行性无法证明时先提问或退回相应设计阶段，不猜测实现。
`[deploy] <组件>` 维护该组件的开发基础设施配置，例如 `[deploy] api` 会更新
Runbook 中的 `### api`，并按实际需要维护 Compose、`dev.env` 和首次初始化配置；
Runbook 命令从 `docs/deploy/` 执行，JavaScript 和 TypeScript 组件默认使用 `pnpm`。

消息最后一个字符决定执行方式：

| 结尾 | 行为 |
|---|---|
| `?` 或 `？` | 只回答，不修改文件 |
| `!` 或 `！` | 修改并验证，提交并推送 |
| `,` 或 `，` | 暂不修改，每次澄清一个关键问题 |
| `.` 或 `。` | 修改并验证，不自动提交或推送 |

没有以上结尾时，按宿主项目和当前任务规则处理。

## 目录

```text
templates/AGENTS.template.md  安装到宿主项目的全局入口和阶段路由
templates/backend-design.template.md  Backend 设计流程和固定文档结构
stages/                       各阶段的职责、权限和完成检查
install.mjs                   更新子模块并安装工作流规则
test_install.mjs              安装器和规则结构测试
```

## 验证

需要 Git 和支持内置测试运行器的 Node.js：

```bash
node --test test_install.mjs
```

## 许可证

[MIT](LICENSE)
