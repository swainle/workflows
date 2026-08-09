# AI 项目工作流

通过安装到宿主项目根目录的 `AGENTS.md`，将文档、开发、测试和 Docker 任务路由到独立阶段，并限制每个阶段的文件权限。

## 文档组件

`docs/` 下每个一级目录是一个组件，工作流自身的 `docs/workflows/` 除外：

```text
docs/
├─ workflows/
├─ require/
│  ├─ README.md
│  ├─ M-001/
│  │  ├─ FR-001.md
│  │  ├─ BR-001.md
│  │  ├─ FLOW-001.md
│  │  ├─ NFR-001.md
│  │  ├─ PERM-001.md
│  │  └─ AC-001.feature
│  ├─ system.md
│  └─ openapi.json
├─ web/
│  └─ README.md
└─ api/
   └─ README.md
```

组件入口统一为 `docs/<组件>/README.md`。没有应用目录的组件仍可维护文档和 `docker/<组件>/**`，但不支持开发和组件测试；
包含生产源码的组件必须在 README 中声明实际映射和开发模板：

```md
应用目录：`apps/api/`
开发模板：`backend`
```

组件存在性由目录和 README 决定，不再使用专用聚合目录或中央组件清单登记。

## 指令

```text
<doc 组件> [tmp require|frontend|backend|docker] [req 需求组件 [issue 编号]] [issue 编号] [ux M-001:P-001|opt 文件] 任务
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
<doc require> tmp require opt security.md 调整安全基线
<doc api> tmp backend req require issue 1 设计初始化接口
<doc api> tmp backend req require issue 2 opt domain.md 调整手机号规则
<doc web> tmp frontend req require issue 2 设计手机号页面
<doc web> tmp frontend ux M-001:P-001 创建登录页 Draft
<doc telemetry> tmp docker 设计遥测容器编排
<dev api> 实现手机号接口
<test api> 验证手机号接口
<docker telemetry> 创建遥测 Compose 和配置
<test> 验证注册流程
<docker update> 升级遥测镜像
```

- `require` 是普通组件名，不是保留字。
- `<doc require> tmp require issue 1` 总是运行需求、架构和验收专家流程；Issue 编号只标识来源和限定本次范围。
- `req require` 递归读取 `docs/require/` 的全部文件；后接 `issue 2` 时再读取该 Issue 作为当前任务输入。
- `tmp require|frontend|backend|docker` 加载对应模板。
- `ux M-001:P-001` 仅用于 `tmp frontend`，只创建或更新该 UX 页面可预览所需的 Draft 文件。
- `opt <文件>` 只创建或更新阶段内的一个文件。
- `<test>` 和 `<docker>` 是全局命令；`<docker 组件>` 固定维护根目录 `docker/<组件>/**`。

受管指令支持结尾控制：`?` 只回答，`,` 每次澄清一个问题，`.` 修改并验证，`!` 修改、验证、提交并推送。中英文符号等价；高风险操作仍需单独确认。

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

安装器保留宿主 `AGENTS.md` 托管区块外的内容，并在区块中记录当前工作流完整 Git SHA。宿主手动更新子模块后，下一条受管指令只使用本地代码刷新托管区块，不自动访问远端。

## 文件

| 路径 | 作用 |
|---|---|
| `templates/AGENTS.template.md` | 指令解析、组件发现、版本门禁和阶段路由 |
| `templates/require.template.md`、`templates/require/*` | 统一需求、Issue 分析与全局架构模板 |
| `templates/*-design.template.md` | Frontend、Backend、Docker 文档模板 |
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
