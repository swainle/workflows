# AI 项目工作流

通过安装到宿主项目根目录的 `AGENTS.md`，将文档、开发、测试和部署任务路由到独立阶段，并限制每个阶段的文件权限。

## 文档组件

`docs/` 下每个一级目录是一个组件，工作流自身的 `docs/workflows/` 除外：

```text
docs/
├─ workflows/
├─ require/
│  ├─ README.md
│  ├─ system.md
│  ├─ process.md
│  ├─ openapi.json
│  ├─ REQ-001-init-system/
│  └─ REQ-002-add-tel/
├─ web/
│  └─ README.md
└─ api/
   └─ README.md
```

组件入口统一为 `docs/<组件>/README.md`。没有应用目录的是纯文档组件；其他组件必须在 README 中声明实际映射和开发模板：

```md
应用目录：`apps/api/`
开发模板：`backend`
```

组件存在性由目录和 README 决定，不再使用专用聚合目录或中央组件清单登记。

## 指令

```text
<doc 组件> [tmp arch|frontend|backend] [req 需求组件 [issue 编号]] [issue 编号] [opt 文件] 任务
<dev 组件> [opt 文件] 任务
<test 组件> [opt 文件] 任务
<deploy 组件> [opt 文件] 任务
<test> [opt 文件] 全局验收任务
<deploy> [opt 文件] 全局部署任务
<deploy update> [opt 文件] 升级方案任务
```

示例：

```text
<doc require> tmp arch issue 1 初始化系统需求和全局设计
<doc require> tmp arch opt security.md 调整安全基线
<doc api> tmp backend req require issue 1 设计初始化接口
<doc api> tmp backend req require issue 2 opt domain.md 调整手机号规则
<doc web> tmp frontend req require issue 2 设计手机号页面
<dev api> 实现手机号接口
<test api> 验证手机号接口
<deploy api> 更新开发环境
<test> 验证注册流程
<deploy update> 升级注册服务
```

- `require` 是普通组件名，不是保留字。
- `<doc require> tmp arch issue 1` 同时加载全局设计和 Issue 模板；维护组件根文件及
  `docs/require/REQ-001-*/`。
- `req require` 读取 `docs/require/` 的直属文件；后接 `issue 2` 时再读取唯一的 `REQ-002-*` 目录。
- `tmp arch|frontend|backend` 加载对应设计模板。
- `opt <文件>` 只创建或更新阶段内的一个文件。
- `<test>` 和 `<deploy>` 是全局命令；带组件名时分别处理组件测试和组件部署。

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
| `templates/issue.template.md` | Issue 需求目录与内容规则 |
| `templates/*-design.template.md` | Arch、Frontend、Backend 文档模板 |
| `stages/*.md` | doc、dev、组件测试、全局测试和部署权限 |
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
