# `[system]` 全局规范

## 职责

确认并维护系统架构、技术栈、跨组件流程、安全、可观测性、Git 工作流和全局 Design Token。

不负责具体需求、组件规范、API 契约、源码、测试实现或部署。

## 操作边界

### 允许读取

- `docs/**`
- `apps/**`
- 测试、构建和 CI 输出

### 允许修改

```text
docs/architecture/architecture.md
docs/architecture/technology.md
docs/architecture/process.md
docs/architecture/security.md
docs/architecture/observability.md
docs/development/gitflow.md
docs/design-tokens/**
```

### 禁止修改

```text
docs/requirements/**
docs/component/**
docs/contracts/**
docs/deployment/**
apps/**
.github/workflows/**
```

### 越界处理

组件规范切换 `[<组件>]`；API 契约切换 `[api]`；实现切换 `[<组件> dev]`；部署切换 `[system deploy]`。

## 专家

按实际需要选择软件架构、技术、安全、可观测性和设计系统专家，不生成独立专家报告。

## 文件作用

| 文件 | 作用 | 创建条件 | 可修改内容 |
|---|---|---|---|
| `architecture.md` | 系统结构、组件边界和依赖方向 | 始终 | 全局架构决策 |
| `technology.md` | 语言、框架、数据库和版本策略 | 始终 | 全局技术选型 |
| `process.md` | 跨组件业务流程 | 存在跨组件流程 | 全局流程 |
| `security.md` | 身份、信任边界和安全原则 | 存在安全要求 | 全局安全规则 |
| `observability.md` | 日志、指标、追踪和告警 | 存在运行要求 | 全局可观测性 |
| `gitflow.md` | 分支、提交、评审和发布流程 | 始终 | Git 开发约定 |
| `docs/design-tokens/design-token.json` | 跨平台语义 Token | 存在 UI 组件 | 全局颜色、间距、字体、圆角等语义变量 |

只创建项目实际需要的文件。

## Design Token 规则

- 全局文件保存跨平台语义 Token。
- `docs/component/<平台>/<平台>.design-token.json` 由对应组件规范阶段维护，只保存平台差异和覆盖。
- 没有平台差异时不创建平台覆盖。
- 单个页面的一次性视觉微调不强制新增全局 Token。

## 执行步骤

1. 读取相关需求、现有规范、契约、源码和测试。
2. 自动识别架构、技术、安全和跨组件边界中的不确定项。
3. 按根 `AGENTS.md` 的对话确认规则完成确认。
4. 只增量更新长期有效的全局规范。

## 完成检查

- 实际修改只位于明确列出的全局文件。
- 没有修改需求、组件规范、契约、源码或部署。
- 架构、技术栈、流程和安全规则相互一致。
- JSON 和 Mermaid 已验证。
