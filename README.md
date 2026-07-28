# AI 项目工作流

一套通过 `AGENTS.md` 驱动的项目工作流，帮助 AI 按需求、系统设计、组件规范、开发、测试和部署阶段协作，同时限制每个阶段可以操作的文件范围。

## 功能

- 用 GitHub Issue 编号启动需求整理。
- 按系统、组件、开发、测试和部署阶段路由任务。
- 用阶段级 CRUD 权限表限制文件操作。
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

然后安装当前检出的分支或 Tag：

```bash
node docs/workflows/install.mjs
```

安装器会把 `templates/AGENTS.template.md` 同步到宿主项目根目录 `AGENTS.md`
的托管区块中，保留托管区块之外的宿主规则。未传 `--branch` 时不会切换或更新
子模块。

需要切换并更新到指定分支时使用：

```bash
node docs/workflows/install.mjs --branch develop
```

`--branch` 是可选参数，仅接受分支名。

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
`docs/system/c2.md` 维护组件清单和容器图。组件清单按组件分节，并登记应用目录、
设计目录以及 Swagger UI、OpenAPI、AsyncAPI 等对外文档的完整 HTTP(S) URL。
组件设计阶段在组件设计目录中使用 `c3.md` 维护组件图，使用 `c4.md`
维护关键类和接口的代码图。

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
