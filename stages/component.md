# `[<组件>]` 组件规范

## 职责

通过对话确认当前组件的长期行为、边界、领域模型、流程、状态、时序、界面、平台约束及其提供的契约。

不负责需求分析、全局技术选型、其他组件契约、源码实现、测试实现或部署。

## 操作边界

### 允许读取

- `docs/**`
- `<组件应用目录>/**`
- 当前组件测试和 CI 输出

### 允许修改

```text
<组件设计目录>/**
```

### 禁止修改

```text
docs/requirements/**
docs/system/**
docs/deployment/**
apps/**
.github/workflows/**
<其他组件设计目录>/**
```

### 越界处理

需要新增或拆分组件、修改全局规范时切换 `[system]`；需要整体风格或全局 Token 时切换 `[design]`；需要源码时切换 `[<组件> dev]`。

## 专家

按实际需要选择领域、API、数据、安全、平台 UX、平台工程、可访问性和测试专家，不生成独立专家报告。

## 文件作用

```text
<组件设计目录>/
├─ component.md
├─ ddd.md
├─ process.md
├─ state.md
├─ sequence.md
├─ openapi.json
├─ asyncapi.json
├─ schema.dbml
├─ authorization.fga
├─ <组件>.design-token.json
└─ *.ui.yml
```

| 文件 | 作用 | 创建条件 | 可修改内容 |
|---|---|---|---|
| `component.md` | 组件职责、边界和公共行为 | 始终 | 当前组件长期规范 |
| `ddd.md` | 领域、聚合、实体和值对象 | 存在领域模型 | 当前组件领域设计 |
| `process.md` | 组件内部业务流程 | 存在稳定流程 | 当前组件流程 |
| `state.md` | 页面或组件状态转换 | 存在稳定状态模型 | 当前组件状态 |
| `sequence.md` | 多方交互时序 | 存在多方调用 | 当前组件时序 |
| `<组件>.design-token.json` | 平台差异和全局 Token 覆盖 | 存在平台差异 | 当前组件差异，不复制 `docs/component/design/design-token.json` 中的全局值 |
| `*.ui.yml` | 稳定页面或视图的交互契约 | 存在页面规范 | 当前组件页面结构、动作和状态 |
| `openapi.json` | 同步 HTTP API 契约 | 当前组件提供同步接口 | 路径、操作、Schema、错误和示例 |
| `asyncapi.json` | 异步事件契约 | 当前组件提供事件 | Channel、Message、生产者和消费者 |
| `schema.dbml` | 数据结构和关系 | 当前组件数据模型变化 | 表、字段、索引和关系 |
| `authorization.fga` | 授权关系模型 | 当前组件存在非公开操作 | 类型、关系和权限 |

只创建项目实际需要的文件。契约由提供它的组件维护，消费方只能引用。

## 契约规则

- OpenAPI 使用稳定 `operationId`，Schema、示例和实际接口保持一致。
- 没有异步事件不创建 AsyncAPI。
- 没有非公开操作不创建 OpenFGA。
- 没有数据模型变化不创建 DBML。
- 契约说明适用的错误、权限、事务、并发、幂等、兼容和迁移。
- JSON 使用标准解析器验证；其他契约使用项目已有工具验证。

## UI YAML 格式

```yaml
id: booking-create
title: 创建预约
platform: web
route: /bookings/new

requirements:
  - REQ-001-FR-001
  - REQ-001-AC-001

permissions:
  - REQ-001-PERM-001

layout:
  type: page
  regions:
    - id: booking-form
      component: Form

actions:
  submit:
    trigger: booking-form.submit
    operationId: createBooking
    permission: REQ-001-PERM-001
    success: booking-detail
    failure: show-submit-error

states:
  loading:
    description: 正在加载
  empty:
    description: 没有数据
  error:
    description: 请求失败
  forbidden:
    description: 没有权限

accessibility:
  keyboard: true
  screenReader: true
```

- 页面至少关联一个 FR 和 AC。
- 非公开操作关联 PERM。
- 每个 action 关联 API `operationId`、本地行为或外部跳转。
- 检查 loading、empty、error、forbidden、offline、submitting 和 success 中的适用状态。
- `.ui.yml` 是交互契约，不复制特定框架源码。
- `.ui.yml` 引用 Token，不保存可复用的颜色、间距、字体和圆角常量。

## 执行步骤

1. 从 `docs/system/architecture.md` 组件清单解析当前组件的应用目录和设计目录。
2. 读取相关需求、当前组件规范、契约、源码和测试。
3. 自动识别需要确认的组件边界、行为、契约和平台限制。
4. 按根 `AGENTS.md` 的对话确认规则完成确认。
5. 只增量更新当前组件的长期规范及其提供的契约。

## 完成检查

- 实际修改全部位于组件清单声明的当前组件设计目录。
- 没有修改源码、其他组件、需求、系统规范或部署文件。
- 引用的需求编号、权限编号、`operationId` 和 Token 均存在。
- JSON、YAML、DBML、FGA 和 Mermaid 使用项目已有工具或标准解析器验证。
