# `[<组件>]` 组件规范

## 职责

通过对话确认当前组件的长期行为、边界、领域模型、流程、状态、时序、界面、平台约束及其提供的契约。

不负责需求分析、全局技术选型、其他组件契约、源码实现、测试实现或部署。

## 操作权限

| 路径模式 | 创建 | 读取 | 修改 | 删除 |
|---|---|---|---|---|
| `**` | 禁止 | 禁止 | 禁止 | 禁止 |
| `docs/requirements/**` | 禁止 | 允许 | 禁止 | 禁止 |
| `docs/system/**` | 禁止 | 允许 | 禁止 | 禁止 |
| `<组件设计目录>/**` | 允许 | 允许 | 允许 | 允许 |

## 越界处理

需要新增或拆分组件、修改全局规范时切换 `[system]`；需要源码时切换 `[<组件> dev]`。

## 专家

按实际需要选择领域、API、数据、安全、平台 UX、平台工程、可访问性和测试专家，不生成独立专家报告。

## 文件作用

```text
<组件设计目录>/
├─ component.md
├─ c3.md
├─ c4.md
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
| `component.md` | 组件概述和主要目录结构 | 始终 | 当前组件的职责边界、使用者和稳定目录 |
| `c3.md` | 组件内部结构和依赖关系图 | 始终 | 当前组件的 C3 Mermaid 图 |
| `c4.md` | 关键代码单元和依赖关系 | 存在需要长期维护的代码结构 | 当前组件的主要代码结构 |
| `ddd.md` | 领域语义、聚合规则和建模决策 | 存在领域模型 | 当前组件的统一语言、不变量、事务边界、一致性和领域事件 |
| `process.md` | 组件内部业务、用户或任务流程 | 存在稳定流程 | 当前组件流程 |
| `state.md` | 页面、领域对象或任务状态转换 | 存在稳定状态模型 | 当前组件状态 |
| `sequence.md` | 多方交互时序 | 存在多方调用 | 当前组件时序 |
| `<组件>.design-token.json` | 当前组件的语义 Design Token | 存在界面且需要 Token | 当前组件的颜色、间距、字体、圆角和动效等语义变量 |
| `*.ui.yml` | 稳定页面或视图的交互契约 | 存在页面规范 | 当前组件页面结构、动作和状态 |
| `openapi.json` | 同步 HTTP API 契约 | 当前组件提供同步接口 | 路径、操作、Schema、错误和示例 |
| `asyncapi.json` | 异步事件契约 | 当前组件提供事件 | Channel、Message、生产者和消费者 |
| `schema.dbml` | 持久化数据结构和关系 | 当前组件拥有持久化数据模型 | 表、字段、索引和关系 |
| `authorization.fga` | 授权关系模型 | 当前组件存在非公开操作 | 类型、关系和权限 |

只创建项目实际需要的文件。一个事实只由一个文件维护，其他文件通过稳定名称引用，不复制字段、关系或规则。契约由提供它的组件维护，消费方只能引用。

## `component.md` 文件格式

````md
# <组件>

## 概述

<用一至三段说明组件是什么、负责什么、不负责什么以及主要使用者。>

## 目录结构

```text
<组件应用目录>/
├─ src/
│  ├─ <稳定一级目录>/    <职责>
│  └─ <稳定一级目录>/    <职责>
└─ test/                  自动化测试
```
````

- `component.md` 不保存领域模型、流程、状态、时序或契约内容。
- 目录结构只列稳定的一级目录和必要的二级目录，不逐个罗列源码文件。
- 目录中的职责与 C3 模块保持一致；具体代码单元及依赖放入 `c4.md`。

## C3 和 C4 文件格式

`c3.md` 使用 `C4Component` 描述当前组件内部的长期结构：

````md
# C3 组件图

```mermaid
C4Component
    title <组件> 组件图

    Container_Ext(caller, "上游调用方", "调用当前组件")

    Container_Boundary(component, "<组件>") {
        Boundary(entry_layer, "接入层") {
            Component(entry, "组件入口", "技术", "接收并分发请求、事件或用户操作")
        }

        Boundary(capability_layer, "核心能力层") {
            Component(capability_a, "核心能力 A", "技术", "承担一类稳定职责")
            Component(capability_b, "核心能力 B", "技术", "承担另一类稳定职责")
            Component(capability_c, "核心能力 C", "技术", "承担第三类稳定职责")
            Component(capability_d, "核心能力 D", "技术", "承担第四类稳定职责")
        }

        Boundary(adapter_layer, "适配层") {
            Component(storage_adapter, "数据适配器", "技术", "访问持久化数据")
            Component(policy_adapter, "策略适配器", "技术", "访问外部策略服务")
            Component(message_adapter, "消息适配器", "技术", "发布异步任务或事件")
        }
    }

    Boundary(infrastructure, "基础设施") {
        Container_Ext(policy_engine, "授权引擎", "外部授权服务")
        ContainerDb_Ext(database, "数据库", "持久化数据")
        ContainerDb_Ext(queue, "队列或缓存", "异步任务与缓存")
        Container_Ext(consumer, "下游消费者", "消费异步任务")
    }

    Rel_D(caller, entry, "调用", "协议")
    Rel_D(entry, capability_a, "分发")
    Rel_D(entry, capability_b, "分发")
    Rel_D(entry, capability_c, "分发")
    Rel_D(entry, capability_d, "分发")
    Rel_D(capability_a, storage_adapter, "调用")
    Rel_D(capability_b, policy_adapter, "调用")
    Rel_D(capability_c, message_adapter, "调用")
    Rel_D(storage_adapter, database, "读写", "数据库协议")
    Rel_D(policy_adapter, policy_engine, "调用", "协议")
    Rel_D(message_adapter, queue, "生产任务", "消息协议")
    Rel_D(queue, consumer, "交付任务", "消息协议")

    UpdateLayoutConfig($c4ShapeInRow="5", $c4BoundaryInRow="1")
```
````

`c4.md` 根据实际代码形态使用 `classDiagram` 或 `flowchart` 描述关键代码单元及依赖。面向对象或领域模型使用 `classDiagram`：

````md
# C4 代码图

```mermaid
classDiagram
    class UseCase {
        <<ApplicationService>>
        +execute(command)
    }
    class Aggregate {
        <<AggregateRoot>>
        +perform()
    }
    class Repository {
        <<Repository>>
        +save()
    }

    UseCase --> Aggregate
    UseCase --> Repository
```
````

函数、前端组件、Hook、Store 或模块依赖使用 `flowchart`：

````md
# C4 代码图

```mermaid
flowchart LR
    Page --> Feature
    Feature --> Store
    Store --> ApiClient
```
````

- `c3.md` 只包含一级标题和一个 `C4Component` Mermaid 代码块，不包含概述、正文、列表、表格或图外说明。
- C3 图只展示当前组件内部的主要模块、职责、依赖方向和必要的外部组件，不展开类和函数。
- 上游调用方声明在当前组件边界之前，使其位于图的顶部。
- 当前组件使用一个主 `Container_Boundary`；主边界内部按实际结构使用接入、核心能力和适配等嵌套 `Boundary`，名称随前端、后端、任务处理器或其他组件的真实结构确定，不存在的层级直接省略。
- 基础设施使用独立的兄弟 `Boundary`，声明在当前组件主边界之后；数据库、缓存、消息代理、授权引擎和下游消费者按实际依赖放入其中，不放入当前组件边界。
- `c4BoundaryInRow` 固定使用 `1`，使当前组件的内部分层以及主边界与基础设施边界整体垂直排列；同一层级内的组件按声明顺序水平排列。
- `c4ShapeInRow` 使用能够容纳最宽层级的值，标准示例使用 `5`；跨层关系按实际方向使用 `Rel_D` 或 `Rel_U`，同层关系使用 `Rel_R` 或 `Rel_L`。
- 异步链路按“生产者 → 队列或消息代理 → 消费者”排列；不使用 Mermaid C4 尚未支持的 `Lay_D`、`Lay_R` 等布局语句。
- `c4.md` 只有一级标题和一个 Mermaid 图；只展示理解设计所需的关键代码单元及关系，不罗列所有源码文件、字段和方法。
- C4 中按实际情况标注 `ApplicationService`、`AggregateRoot`、`Entity`、`ValueObject`、`DomainService`、`Repository` 和 `DomainEvent`，不存在的角色不创建。
- C3、C4、`component.md` 和契约中的名称及依赖方向保持一致。
- 跨组件业务调用顺序放入系统 `process.md`；组件内部业务流程和多方时序分别放入当前组件的 `process.md` 和 `sequence.md`。

## DDD 文件格式

存在领域模型时创建 `ddd.md`：

```md
# 领域设计

## 统一语言

| 术语 | 定义 |
|---|---|
| <术语> | <在当前上下文中的唯一含义> |

## 聚合规则

| 聚合 | 业务不变量 | 事务边界 |
|---|---|---|
| `<聚合根>` | <始终成立的业务规则> | <一次事务允许修改的范围> |

## 一致性

- <跨聚合或跨组件的一致性、并发、幂等及补偿规则>

## 领域事件

| 事件 | 触发条件 | 业务含义 |
|---|---|---|
| `<事件>` | <已经发生的事实> | <对领域的含义> |

## 建模决策

- <关键模型边界及其原因>
```

- `ddd.md` 只保存图无法完整表达的领域语义和决策，不复制 C4 中的类清单、字段、方法或关系。
- 聚合根、实体、值对象、领域服务、仓储和领域事件的代码结构由 `c4.md` 表达；`ddd.md` 使用相同稳定名称说明不变量和业务含义。
- 数据库字段和约束、HTTP Schema、异步消息结构分别由 `schema.dbml`、`openapi.json` 和 `asyncapi.json` 维护，不写入 `ddd.md`。
- 没有领域模型的展示页面、薄网关、简单任务或 CRUD 组件不创建 `ddd.md`。

## 契约规则

- OpenAPI 使用稳定 `operationId`，Schema、示例和实际接口保持一致。
- 没有异步事件不创建 AsyncAPI。
- 没有非公开操作不创建 OpenFGA。
- 没有数据模型变化不创建 DBML。
- 对外提供的 Swagger UI、OpenAPI 和 AsyncAPI 必须通过 HTTP(S) API 暴露，并以
  完整 URL 登记在 `docs/system/c2.md` 对应组件的开发接口信息中；登记缺失或不一致时切换
  `[system]` 更新。
- `openapi.json` 和 `asyncapi.json` 是提供方维护的契约源文件；其他组件通过 C2
  登记的 URL 读取，不直接依赖提供方的仓库文件路径。
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
- `.ui.yml` 引用当前组件 Token，不保存可复用的颜色、间距、字体和圆角常量。

## 执行步骤

1. 从 `docs/system/c2.md` 组件清单的当前组件表格行解析应用目录和设计目录，并读取其开发环境端口、访问地址和接口文档。
2. 读取相关需求、系统规范、当前组件规范和契约，不读取源码、测试或部署文件。
3. 自动识别需要确认的组件边界、行为、契约和平台限制。
4. 按根 `AGENTS.md` 的对话确认规则完成确认。
5. 只增量更新当前组件的长期规范及其提供的契约。

## 完成检查

- 实际修改全部位于组件清单声明的当前组件设计目录。
- 没有修改源码、其他组件、需求、系统规范或部署文件。
- `component.md` 只包含组件概述和稳定的主要目录结构，没有复制其他专用文件的内容。
- `c3.md` 只有一级标题和一个 `C4Component` Mermaid 图，没有其他说明；图中只包含当前组件的主要内部模块和必要外部依赖，层级整体垂直排列，同层组件水平排列。
- 需要长期维护代码结构时，`c4.md` 使用适合实际代码形态的 `classDiagram` 或 `flowchart`，只包含关键代码单元和依赖。
- 存在领域模型时，`ddd.md` 只记录统一语言、聚合不变量、事务边界、一致性、领域事件语义和建模决策，不复制 C4 或契约内容。
- 引用的需求编号、权限编号、`operationId` 和 Token 均存在。
- JSON、YAML、DBML、FGA 和 Mermaid 使用项目已有工具或标准解析器验证。
