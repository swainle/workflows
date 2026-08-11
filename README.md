# AI 项目工作流

通过安装到宿主项目根目录的 `AGENTS.md`，将文档、开发、测试和 Docker 任务路由到独立阶段，并限制每个阶段的文件权限。

## 文档组件

`docs/` 下除 `docs/workflows/` 外，每个一级目录都是一个组件，入口为 `docs/<组件>/README.md`。
需要开发或组件测试时，在组件 README 中声明：

```md
应用目录：`apps/api/`
开发模板：`backend`
```

## 指令

```text
<doc 组件> [tmp require|frontend|backend|docker] [req 需求组件 [issue 编号]] [issue 编号] [draft M-001:P-001|opt 文件] 任务
<dev 组件> [opt 文件] 任务
<test 组件> [opt 文件] 任务
<docker 组件> [opt 文件] 任务
<test> [opt 文件] 全局验收任务
<docker> [opt 文件] 全局容器编排任务
<docker update> [opt 文件] 升级方案任务
```

示例：

```text
<doc require> tmp require issue 1 初始化系统需求和全局设计
<doc api> tmp backend req require issue 1 设计初始化接口
<doc browser> tmp frontend req require draft M-001:P-001 创建登录页 Draft
<dev api> 实现手机号接口
<test api> 验证手机号接口
<docker update> 升级遥测镜像
```

- `tmp` 选择模板，`req` 加载需求组件，`issue` 限定任务来源和范围。
- `draft M-001:P-001` 仅用于 Frontend，按 Require、`DESIGN.md` 和页面设计生成可运行的 QML/WASM Draft。
- `opt <文件>` 只创建或更新阶段内的一个文件。
- `<test>`、`<docker>` 和 `<docker update>` 是全局指令。

结尾控制：`?` 只回答，`,` 每次澄清一个问题，`.` 修改并验证，`!` 修改、验证、提交并推送；中英文符号等价。

## Frontend Draft 页面转换

页面 `draft/src/M-001/P-001/index.html` 是可内嵌 HTML、CSS 和 JavaScript 的只读设计输入，公共资产放在 `draft/src/assets/`。

```text
<doc browser> tmp frontend req require draft M-001:P-001
- 按 index.html 一比一转换为 QML，提取 Layout 与 Component，构建 WASM 并验证
```

转换规则由 `templates/frontend-draft.template.md` 定义；信息不确定时 Agent 通过对话确认。

## 安装

工作流应作为子模块挂载到宿主项目的 `docs/workflows`：

```bash
git submodule add -b develop <repository-url> docs/workflows
node docs/workflows/install.mjs
```

切换并更新分支：

```bash
node docs/workflows/install.mjs --branch develop
```

安装器保留宿主 `AGENTS.md` 托管区块外的内容，并记录当前工作流 Git SHA。

## 文件

| 路径 | 作用 |
|---|---|
| `templates/AGENTS.template.md` | 指令解析、组件发现、版本门禁和阶段路由 |
| `templates/require.template.md`、`templates/require/*` | 统一需求、Issue 分析与全局架构模板 |
| `templates/*-design.template.md` | Frontend 文件规范、Backend 设计、Docker 文档模板 |
| `stages/*.md` | doc、dev、组件测试、全局测试和 Docker 权限 |
| `install.mjs` | 安装或更新宿主 `AGENTS.md` 托管区块 |
| `validate.mjs` | 校验提示词、路由、README 映射和安装器行为 |

## 验证

```bash
node validate.mjs
```

验证宿主项目所有文档组件及应用目录映射：

```bash
node docs/workflows/validate.mjs --project-root .
```

## 许可证

[MIT](LICENSE)
