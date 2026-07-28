# AI 项目工作流

一套通过 `AGENTS.md` 驱动的项目工作流，帮助 AI 按需求、系统设计、组件规范、开发、测试和部署阶段协作，同时限制每个阶段可以操作的文件范围。

## 功能

- 用 GitHub Issue 编号启动需求整理。
- 按系统、组件、开发、测试和部署阶段路由任务。
- 每个阶段用 `**` 显式禁止所有文件，再由更具体的 CRUD 规则按需开放。
- 按“需求 → system → 组件设计 → dev → test → deploy”串行，只读前置产物，只修改当前阶段文件。
- 保留宿主项目已有的 `AGENTS.md` 规则。
- 支持通过消息结尾控制只读、澄清、修改以及提交推送行为。

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
[web dev] 调整登录按钮圆角
[web test] 验证登录页面
[deploy] 检查生产部署配置
[deploy] update 升级数据库
```

组件名必须已在宿主项目的 `docs/system/c2.md` 中声明。
`[system]` 阶段使用 `docs/system/c1.md` 维护系统上下文图，使用
`docs/system/c2.md` 维护容器图和组件清单。组件清单按类型分组，并登记应用目录、
设计目录、实际暴露的开发环境端口和地址。自研组件先使用表格，表格后的连接信息与
基础设施统一使用组件列表和缩进属性；中间件存在管理界面时，还登记管理 URL、
可直接使用的开发默认账号密码、凭据来源和对应版本的官方文档，不保留未定值。
容器图按前端、后端、基础设施自上而下分层，同层组件水平排列。
组件设计阶段在组件设计目录中使用 `component.md` 维护概述和完整文件结构，
使用 `c3.md` 维护组件图，并在存在需要长期维护的代码结构时使用 `c4.md`
以代码总览和按业务能力划分的 Flowchart 章节维护关键代码单元、依赖及关键公开函数；
图的主分层从左到右，层内从上到下。领域、流程、状态、时序、接口、数据、授权和界面规范
分别按实际能力保存在对应的专用文件中。

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
