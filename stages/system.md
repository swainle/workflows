# `[system]` 全局规范

## 职责

确认并维护系统架构、组件清单、技术栈、跨组件业务与工程流程、安全、可观测性和 Git 工作流。

不负责具体需求、设计规范、组件规范、组件契约、源码、测试实现或部署。

## 操作边界

### 允许读取

- `docs/**`
- `apps/**`
- 测试、构建和 CI 输出

### 允许修改

```text
docs/system/architecture.md
docs/system/technology.md
docs/system/process.md
docs/system/security.md
docs/system/observability.md
docs/system/gitflow.md
```

### 禁止修改

```text
docs/requirements/**
docs/component/**
docs/deployment/**
apps/**
.github/workflows/**
```

### 越界处理

整体风格和全局 Token 切换 `[design]`；组件规范及其契约切换 `[<组件>]`；实现切换 `[<组件> dev]`；部署切换 `[system deploy]`。

## 专家

按实际需要选择软件架构、技术、安全和可观测性专家，不生成独立专家报告。

## 文件作用

| 文件 | 作用 | 创建条件 | 可修改内容 |
|---|---|---|---|
| `architecture.md` | 系统结构、组件清单、组件边界和依赖方向 | 始终 | 全局架构决策和组件设立 |
| `technology.md` | 语言、框架、数据库和版本策略 | 始终 | 全局技术选型 |
| `process.md` | 分类维护跨组件业务与工程流程 | 存在跨组件流程 | 全局流程及组件协作关系 |
| `security.md` | 身份、信任边界和安全原则 | 存在安全要求 | 全局安全规则 |
| `observability.md` | 日志、指标、追踪和告警 | 存在运行要求 | 全局可观测性 |
| `gitflow.md` | 分支、提交、评审和发布流程 | 始终 | Git 开发约定 |

只创建项目实际需要的文件。

## 组件清单

`architecture.md` 使用稳定的组件名称和目录登记系统实际需要的前端、后端、任务处理器和其他部署单元：

```md
## 组件清单

| 组件 | 组件应用目录 | 组件设计目录 |
|---|---|---|
| `booking-api` | `apps/booking-api/` | `docs/component/booking-api/` |
| `billing-api` | `apps/billing-api/` | `docs/component/billing-api/` |
| `web` | `apps/web/` | `docs/component/web/` |
```

“组件”对应 `[<组件>]` 指令。组件应用目录必须位于 `apps/`，组件设计目录必须位于
`docs/component/`；路径使用仓库相对路径，不包含 `..`，各组件之间不得重复。
一次 `[system]` 可以设立多个组件，但只登记架构中真实需要的组件。

## 流程分类

`process.md` 按流程性质使用二级标题分类，只创建实际需要的分类：

```md
## 业务流程

### <跨组件业务流程>

## 构建流程

### 手动构建

### CI/CD
```

其他稳定的跨组件流程可以增加同级分类。这里只记录目标、参与组件、触发条件、顺序、
产物和失败处理；具体命令、脚本、流水线配置和部署步骤仍由源码或 `[system deploy]` 维护。

## 执行步骤

1. 读取相关需求、现有规范、契约、源码和测试。
2. 自动识别组件划分、架构、技术、安全和跨组件边界中的不确定项。
3. 按根 `AGENTS.md` 的对话确认规则完成确认。
4. 只增量更新长期有效的全局规范。

## 完成检查

- 实际修改只位于明确列出的全局文件。
- 没有修改需求、组件规范、契约、源码或部署。
- 组件清单只包含“组件”“组件应用目录”“组件设计目录”，路径合法且不重复。
- 架构、技术栈、流程分类和安全规则相互一致。
- JSON 和 Mermaid 已验证。
