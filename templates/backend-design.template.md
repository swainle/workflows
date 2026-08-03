# Backend 组件设计流程与文档模板

## AI-BACKEND-001

- **Who**：处理 `<组件> backend <任务>` 的组件设计 Agent。
- **When**：Backend 模式被启用并准备选择设计强度和适用文件时。
- **Where**：当前 Backend 组件设计目录与本模式模板。
- **What**：提供“使用规则”功能；具体规则、格式和约束如下。
- **Why**：以最少文件完整表达 Backend 设计，避免空文档和重复事实。

- 始终创建 `component.md`、`interface.md` 和 `engineering.md`。
- `domain.md` 仅在完整 DDD 模式创建；`security.md`、`data.md`、`jobs.md` 和 `operations.md` 仅在对应关注点真实存在时创建。
- `openapi.json`、`asyncapi.json`、`authorization.fga` 和 `schema.dbml` 是按需创建的机器可读事实源，不合并进 Markdown。
- 每个 Markdown 文件都在一级标题下用一句简短正文说明该文件的职责，再开始后续章节或图表。
- 不适用的可选文件和章节直接删除，不创建空文件，不填写“无”“不适用”或占位正文。
- 一个事实只由一个文件维护；其他文件使用稳定设计标识或机器文件引用，不复制字段、规则、流程和关系。
- 需要引用前置文件的信息时，在所属二级或三级标题后、正文前使用独立引用行 `> Ref: <文件名>:<二级标题>:<三级标题或编号>`，例如 `> Ref: process:xx:xx`；多个引用各占一行，不创建引用列、引用表或递归展开上游引用。
- 仅当以下条件全部成立时使用轻量 Backend：任务是简单 CRUD、纯查询或数据转换，且没有领域不变量、业务状态生命周期、跨实体强一致事务、并发竞争、补偿、领域事件或多个统一语言边界。
- 上述任一复杂度信号存在时使用完整 DDD；证据不足时先确认，不得通过选择轻量模式规避设计。
- 轻量 Backend 不创建 `domain.md`，只在 `component.md` 概述记录业务词汇、边界、设计强度和判断事实。
- 本文件中的图、表、目录、名称和技术全部是格式与表达示例，不是待复制的默认设计。必须根据已确认的实际需求逐项替换、增删和重组；禁止因示例中出现认证、资源、预约、Outbox、Redis、Prisma 或 BullMQ 就创建对应内容。
- 每个具体范例都必须就近包含单行提示 `> - 范例适配声明：<具体调整范围>`；尖括号占位符和具体示例名称不得原样进入最终文档。
- Backend Markdown 最多使用三级标题，不得出现四级及更深标题。设计标识按“文件名 → 二级标题 → 三级标题 → 可选编号”生成；表格“编号”列或 `- **001**：` 编号项追加三位编号，找不到三级标题或编号时停在已经识别到的二级或三级标题。
- 生产代码以 `@design <设计标识>` 标记唯一主实现，协作代码使用 `@design-ref <设计标识>`；测试代码使用 `@verifies <设计标识>`。

## AI-BACKEND-002

- **Who**：处理 `<组件> backend <任务>` 的组件设计 Agent。
- **When**：Backend 需要确定业务边界、代码组织、运行单元或条件性技术约定时。
- **Where**：当前 Backend 组件设计目录与系统设计、需求和机器契约。
- **What**：提供“架构、代码与运行约定”功能；具体规则、格式和约束如下。
- **Why**：确保合并文件后仍保持清晰的业务边界和依赖方向。

- 工作流组件按业务和所有权边界划分，不按进程划分。一个 Backend 可以包含 API、内嵌后台任务和独立 Worker 入口。
- 一个组件默认对应一个限界上下文；只有存在不同统一语言和模型边界时才建立多个上下文。
- 领域层不得依赖框架、ORM、HTTP、JWT、授权引擎或消息队列；跨上下文通过稳定应用接口或 Port 协作，不导入另一上下文的领域对象。
- 简单 CRUD、查询和数据转换不机械创建 Command、Handler、Factory、Domain Service 或 Domain Event。
- 数据库事务不得跨越远程调用。可靠消息发布使用同一 Unit of Work 原子写入业务数据和 Outbox，再由现有 API 或 Worker 进程托管 Relay 投递。
- Relay 不是独立进程；独立 Worker 使用 Inbox 或等价机制保证幂等，并区分可重试与不可重试错误。
- `shared/` 只保存多个上下文真实复用且没有业务语义的技术能力，不创建含义模糊的全局 `lib/`、`services/`、`utils/` 或 `schemas/`。
- 技术约定只在实际技术栈采用对应工具时启用。TypeScript 普通职责文件使用 `<subject>.<role>.ts`，技术 Adapter 使用 `<subject>.<technology>.<role>.ts`。
- Command、Handler、Query、Aggregate、Entity、Value Object、Domain Event、Port、Repository 和 Adapter 仅在有真实职责和调用方时创建。
- 框架固定文件名优先；Prisma 迁移使用 `prisma/migrations/<timestamp_name>/migration.sql`；独立 Worker 入口按项目约定启动，不为 Outbox Relay 创建独立入口。
- 精确生产与测试文件树只由 `component.md` 维护；`engineering.md` 只维护长期有效的目录、命名和测试规则。

## AI-BACKEND-003

- **Who**：处理 `<组件> backend <任务>` 的组件设计 Agent。
- **When**：Backend 需要确定文件关系和设计顺序时。
- **Where**：当前 Backend 组件设计目录与本模式模板。
- **What**：提供“文件关系与设计顺序”功能；具体规则、格式和约束如下。
- **Why**：确保上游定义事实、下游落实事实，且没有双向依赖。

> - 范例适配声明：以下关系图只保留当前组件实际存在的可选文件和机器契约；依赖方向不得反转。

```mermaid
flowchart LR
    source["需求与系统规范"]
    domain["domain.md<br/>领域设计"]
    interface["interface.md<br/>接口、校验与错误"]
    security["security.md<br/>认证与授权"]
    data["data.md<br/>数据与一致性"]
    contracts["机器契约<br/>OpenAPI · AsyncAPI · FGA · DBML"]
    engineering["engineering.md<br/>编码与测试"]
    jobs["jobs.md<br/>后台与异步任务"]
    operations["operations.md<br/>运行与交付"]
    component["component.md<br/>架构、索引与文件树"]

    source --> domain
    source --> interface
    domain --> interface
    domain --> data
    interface --> security
    interface --> contracts
    security --> contracts
    data --> contracts
    domain --> engineering
    interface --> engineering
    security --> engineering
    data --> engineering
    contracts --> engineering
    engineering --> jobs
    data --> jobs
    contracts --> jobs
    engineering --> operations
    jobs --> operations
    data --> operations
    engineering --> component
    jobs --> component
    operations --> component
```

1. 从需求与系统规范判断轻量或完整 DDD；完整 DDD 先完成 `domain.md`。
2. 完成 `interface.md`，再按需完成 `security.md` 和 `data.md`。
3. 从 Markdown 设计生成或更新适用的机器契约，并以机器契约作为字段和关系的唯一事实源。
4. 用 `engineering.md` 落实架构映射、代码规则和测试规划。
5. 按需用 `jobs.md` 设计后台与异步任务，再用 `operations.md` 汇总运行和部署交付要求。
6. 最后更新 `component.md` 开头的文件关系、组件图、代码结构、设计索引和完整文件树。

## AI-BACKEND-004

- **Who**：处理 `<组件> backend <任务>` 的组件设计 Agent。
- **When**：Backend 需要创建或更新最终组件入口文档时。
- **Where**：当前 Backend 组件设计目录与全部已完成设计文件。
- **What**：提供“`component.md`”功能；具体规则、格式和约束如下。
- **Why**：在一个入口文件中集中呈现文件关系、架构、代码结构和完整索引。

> - 范例适配声明：以下文件关系、架构元素、代码分层、索引和目录必须替换为当前组件的实际内容。

````md
# <组件名称>

汇总当前 Backend 的文件关系、职责边界、架构、设计索引和完整文件结构。

## 文件关系

```mermaid
flowchart LR
    requirement["需求与系统规范"] --> interface["interface.md"]
    domain["domain.md"] --> interface
    domain --> data["data.md"]
    interface --> security["security.md"]
    interface --> contracts["机器契约"]
    data --> contracts
    interface --> engineering["engineering.md"]
    data --> engineering
    engineering --> jobs["jobs.md"]
    engineering --> operations["operations.md"]
    jobs --> operations
    engineering --> component["component.md"]
    operations --> component
```

## 概述

<说明组件是什么、负责什么、不负责什么、主要使用者、业务边界和设计强度。>

## 组件架构

```mermaid
C4Component
    title <组件名称> 组件图
    Container_Boundary(caller_layout, "<调用方>") {
        System_Ext(caller, "<调用方组件>", "<职责>")
    }
    Container_Boundary(context_layout, "上下文") {
        Component(entry, "<入口>", "<技术>", "<职责>")
        Component(capability, "<业务能力>", "<架构>", "<职责>")
    }
    Container_Boundary(infra_layout, "基础设施") {
        System_Ext(infrastructure, "<外部基础设施>", "<用途>")
    }
    UpdateLayoutConfig($c4ShapeInRow="5", $c4BoundaryInRow="1")
```

## 代码结构

```mermaid
flowchart LR
    interface_layer["接口层"] --> application_layer["应用层"]
    application_layer --> domain_layer["领域或核心层"]
    application_layer --> ports["端口"]
    ports -.-> adapters["适配器"]
```

## 设计索引

| 文件 | 作用 |
|---|---|
| `component.md` | 文件关系、组件与代码架构、设计索引和完整文件树 |
| `interface.md` | 接口、输入校验、错误、幂等和兼容策略 |
| `engineering.md` | 编码规则与测试规划 |
| `<实际可选文件>` | <唯一职责> |

## 目录结构

```text
<组件应用目录>/
├─ <目录>/
│  └─ <文件>  <简短职责>
└─ <配置文件>  <简短职责>
```
````

- `文件关系` 必须是一级标题后的第一个二级章节，只展示实际存在的文件和机器契约。
- `组件架构` 使用一个无关系连线的 `C4Component` 图展示稳定模块、运行单元与必要外部对象，不展开代码分层。
- `代码结构` 使用 `flowchart LR` 展示主要代码单元和依赖方向，不复制业务规则或契约字段。
- `设计索引` 逐个列出设计目录内全部实际文件及唯一作用；`目录结构` 递归列出全部应受版本控制的生产、测试和配置文件。
- 文件树不得使用通配符、省略号或“同上”，不得列出依赖目录、构建产物、缓存、日志、密钥和运行时生成内容。

## AI-BACKEND-005

- **Who**：处理 `<组件> backend <任务>` 的组件设计 Agent。
- **When**：Backend 存在需要长期维护的领域语言、规则、状态或事务边界时。
- **Where**：当前 Backend 组件设计目录与需求、系统流程和组件边界。
- **What**：提供“`domain.md`”功能；具体规则、格式和约束如下。
- **Why**：集中维护业务语义和一致性，不混入代码、协议或存储细节。

> - 范例适配声明：以下上下文、命令、术语、规则、事件和图必须按当前业务事实调整；可选章节无内容时删除。

````md
# 领域设计

定义当前 Backend 的领域语言、业务规则、状态变化和一致性边界。

## <限界上下文>

### 领域模型

| 类型 | 名称 | 职责 | 承担的领域命令 |
|---|---|---|---|
| <模型类型> | `<DomainModel>` | <拥有的业务行为与不变量> | `<Command>` |

### 统一语言

| 对象 | 术语 | 定义 |
|---|---|---|
| <对象> | <术语> | <业务定义> |

### 业务规则

| 编号 | 类型 | 对象或范围 | 规则 | 违反结果 |
|---|---|---|---|---|
| 001 | <规则类型> | <对象或业务范围> | <业务规则> | <业务结果> |

### 领域事件

| 事件 | 触发条件 | 字段 |
|---|---|---|
| `<EventPastTense>` | <成功发生的业务事实> | <最小字段> |

### 状态图

```mermaid
stateDiagram-v2
    [*] --> <状态>
```

### 业务一致性

| 编号 | 必须同时成立的业务事实 |
|---|---|
| 001 | <必须同时成功或失败的业务状态和事件> |

### 时序图

- **<流程>**

> Ref: process:<角色>:BP-001

```mermaid
sequenceDiagram
    participant Caller
    participant Domain
    Caller->>Domain: <业务命令>
    Domain-->>Caller: <业务结果>
```
````

- 每个二级标题表示一个限界上下文；领域模型、统一语言、业务规则和业务一致性必须保留，事件和图按需保留。
- 领域模型的“类型”只使用：`聚合根（Aggregate Root）`、`实体（Entity）`、`值对象（Value Object）`、`领域服务（Domain Service）` 或 `领域策略（Domain Policy）`；只创建当前业务确实需要的类型。
- “承担的领域命令”表示该模型拥有命令触发的业务行为和不变量，不是调用方或 Application Handler；多个命令使用顿号分隔，没有直接承担命令的模型不虚构命令。调用方由 `interface.md` 记录，Handler 映射由 `engineering.md` 记录。
- 业务规则的“类型”只使用：`不变量`（事务提交后必须成立）、`前置条件`（执行命令前必须满足）、`资格规则`（判断主体或对象是否符合条件）、
  `计算规则`（产生业务数值或结果）、`业务策略`（在多个合法方案中作出业务选择）或 `跨聚合规则`（约束多个聚合间的业务关系）。
- 领域事件使用过去时表示成功发生的业务事实，不等同于命令、集成事件或队列运行状态。
- 状态图和时序图放在对应上下文，不创建独立 `state.md`、`sequence.md` 或组件级 `process.md`；每个时序图先使用 `- **<流程>**` 简短说明引用对象，再使用 `> Ref: process:<角色>:<BP 编号>` 引用实际系统流程，最后绘制 Mermaid，不复制跨组件调用顺序。存在多个流程时按相同结构依次记录。
- 数据字段由机器契约维护；代码映射由 `engineering.md` 和 `component.md` 维护。

## AI-BACKEND-006

- **Who**：处理 `<组件> backend <任务>` 的组件设计 Agent。
- **When**：Backend 提供同步接口、异步消息、RPC、任务入口或其他稳定操作边界时。
- **Where**：当前 Backend 组件设计目录与领域设计、需求和系统契约。
- **What**：提供“`interface.md`”功能；具体规则、格式和约束如下。
- **Why**：集中维护接口原则、输入处理和稳定错误语义。

> - 范例适配声明：以下入口、操作、校验、错误和契约引用必须按当前组件真实协议调整。

```md
# 接口设计

定义当前 Backend 的操作边界、输入处理、错误语义、幂等、兼容和契约索引。

## 入口清单

| 入口 | 协议 | 操作 | 调用方 | 契约 |
|---|---|---|---|---|
| <入口> | <协议> | <稳定操作名> | <调用方> | <机器契约引用> |

## 协议与版本

## 操作定义

### <操作名称>

## 输入处理

### 标准化
### 格式校验
### 领域校验

## 错误处理

### 错误分类
### 稳定错误码

| 错误码 | 含义 | 产生位置 | 是否可重试 |
|---|---|---|---|
| `<ERROR_CODE>` | <稳定含义> | <位置> | <是或否> |

### 协议映射

| 错误码 | 协议 | Code | 对外含义 |
|---|---|---|---|
| `<ERROR_CODE>` | HTTP | `4xx` | <稳定对外含义> |

### 重试与脱敏

## 幂等策略
## 兼容策略
## 契约索引
```

- 格式校验只验证结构，领域校验调用领域规则；同一规则不得在两处重复定义。
- 稳定错误码不泄漏框架异常、SQL、堆栈、密钥或内部拓扑；`Code` 是当前协议状态码，例如 HTTP `403`。
- HTTP 响应和消息 Schema 由机器契约维护，Markdown 只维护稳定语义和引用。

## AI-BACKEND-007

- **Who**：处理 `<组件> backend <任务>` 的组件设计 Agent。
- **When**：Backend 负责身份认证、凭据、会话或非公开操作授权时。
- **Where**：当前 Backend 组件设计目录与系统安全基线、接口和领域设计。
- **What**：提供“`security.md`”功能；具体规则、格式和约束如下。
- **Why**：在一个文件中维护组件级认证与授权落实，不复制系统基线。

> - 范例适配声明：以下身份、凭据、主体、资源和权限必须按当前组件真实安全边界调整。

```md
# 安全设计

定义当前 Backend 的身份认证、权限控制和安全失败处理。

## 系统基线引用

## 身份认证

### 身份来源与信任边界
### 凭据与会话
### Token 生命周期
### 轮换、撤销与防重放

## 权限控制

### 主体与资源
### 权限模型
### 权限矩阵

| 主体或角色 | 资源 | 操作 | 条件 | 数据范围 |
|---|---|---|---|---|
| <主体> | <资源> | <操作> | <条件> | <范围> |

### 权限执行点
### 数据范围

## 失败处理
## 授权模型引用
```

- `security.md` 只记录当前组件如何落实 `docs/system/security.md`，不重新定义全局身份体系、授权原则或密钥平台。
- 默认拒绝；认证失败、权限不足、策略引擎不可用和数据范围越界必须有明确且不泄漏敏感信息的结果。
- OpenFGA 模型由 `authorization.fga` 维护；本文件只引用模型并定义执行点。

## AI-BACKEND-008

- **Who**：处理 `<组件> backend <任务>` 的组件设计 Agent。
- **When**：Backend 拥有持久化数据、查询、事务、并发或迁移责任时。
- **Where**：当前 Backend 组件设计目录与领域设计、接口和数据契约。
- **What**：提供“`data.md`”功能；具体规则、格式和约束如下。
- **Why**：集中维护数据所有权、访问边界和一致性策略。

> - 范例适配声明：以下存储、事务、消息一致性、并发和迁移策略必须按实际数据责任调整。

```md
# 数据设计

定义当前 Backend 的数据所有权、持久化边界和一致性策略。

## 数据所有权
## Repository
## 查询模型

## 事务与一致性

### Unit of Work

| 编号 | Unit of Work | 入口 | 参与写入 | 原子要求 | 回滚条件 |
|---|---|---|---|---|---|
| 001 | <名称> | <入口> | <写入对象> | <原子要求> | <条件> |

### Outbox

| 生产用例 | 事务内 Writer | 集成事件 | Relay 或 Publisher | 投递语义 |
|---|---|---|---|---|
| <用例> | <代码单元> | <事件> | <投递单元> | 至少一次 |

### Inbox

| 消费入口 | 幂等键 | 原子写入 | 重复消息结果 | 保留策略 |
|---|---|---|---|---|
| <入口> | <键> | <业务写入与 Inbox> | <结果> | <策略> |

## 并发控制
## 索引策略
## 迁移策略
## 数据保留
## Schema 引用
```

- 业务写入与 Outbox 记录必须由同一 Unit of Work 原子提交；Inbox 记录与消费副作用必须原子提交。
- 同一一致性事项在 `domain.md` 的“业务一致性”和 `data.md` 的 Unit of Work 中使用相同三位编号并从 `001` 开始，不增加跨文件引用列。
- 数据库事务不得等待远程服务、Relay 或 Worker；重试和并发策略必须说明边界与失败结果。
- 表、字段、索引和关系由 `schema.dbml` 维护，本文件只维护所有权和策略。

## AI-BACKEND-009

- **Who**：处理 `<组件> backend <任务>` 的组件设计 Agent。
- **When**：Backend 需要 HTTP、异步消息、授权关系或数据结构契约时。
- **Where**：当前 Backend 组件设计目录与对应 Markdown 设计。
- **What**：提供“机器可读模型”功能；具体规则、格式和约束如下。
- **Why**：保持字段、关系和协议只有一个可验证事实源。

### `openapi.json`

- 由 `interface.md` 驱动；维护路径、稳定 `operationId`、请求响应 Schema、错误和示例。
- 只有当前组件提供同步 HTTP 接口时创建，并通过 HTTP(S) 暴露 Swagger UI 和契约。

### `asyncapi.json`

- 由 `interface.md` 驱动；维护 Channel、Message、Header、生产者、消费者和版本。
- 只有当前组件提供或消费异步消息时创建。

### `authorization.fga`

- 由 `security.md` 驱动；维护类型、关系和权限。
- 只有当前组件存在关系授权模型时创建。

### `schema.dbml`

- 由 `data.md` 驱动；维护表、字段、索引和关系。
- 只有当前组件拥有持久化数据模型时创建。

所有 JSON 使用标准解析器验证；其他模型使用项目现有工具验证。消费方引用提供方契约，不复制源文件。

## AI-BACKEND-010

- **Who**：处理 `<组件> backend <任务>` 的组件设计 Agent。
- **When**：Backend 需要落实代码结构、工程规则和测试规划时。
- **Where**：当前 Backend 组件设计目录与上游业务、接口、安全、数据和机器契约。
- **What**：提供“`engineering.md`”功能；具体规则、格式和约束如下。
- **Why**：把编码规范和测试策略放在同一个工程事实文件中。

> - 范例适配声明：以下架构、目录、命名、执行管线、测试层级、路径和命令必须按实际技术栈调整。

````md
# 工程设计

约束当前 Backend 的代码架构、目录命名、执行管线、依赖方向和测试规划。

## 架构映射

| 设计对象 | 代码位置 | 命名方式 |
|---|---|---|
| <用例、领域对象、Port 或 Adapter> | `<实际目录>` | `<实际模式>` |

## 应用执行管线

### Command Bus

| Command | Handler | Middleware 顺序 | Unit of Work | Result |
|---|---|---|---|---|
| `<Command>` | `<Handler>` | <实际顺序> | <边界> | `<Result>` |

### 事务与消息代码

| 角色 | 代码单元 |
|---|---|
| Unit of Work | `<实现或 Middleware>` |
| Outbox Writer | `<代码单元>` |
| Inbox | `<代码单元>` |

## 目录约定
## 文件命名

| 角色 | 文件命名 |
|---|---|
| Command | `<action>.command.ts` |
| Handler | `<action>.handler.ts` |
| Query | `<action>.query.ts` |
| Aggregate | `<subject>.aggregate.ts` |
| Entity | `entity.ts` 或 `<subject>.entity.ts` |
| Value Object | `value-object.ts` 或 `<subject>.value-object.ts` |
| Domain Event | `<event>.event.ts` |
| Repository Adapter | `<subject>.<technology>.repository.ts` |

## 编码规范
## 依赖方向

## 测试策略

本组件使用 <语言和版本>，沿用 <构建或包管理工具>、<测试框架> 及项目现有测试工具链。

### Fixture 与测试支持
### 单元测试

- **<CONTEXT>-DOM-<CAPABILITY>-001**

> Design：`domain:<上下文>:业务规则:001`
> Src：`test/unit/domain/<capability>.test.ts`
> BR：`<需求编号>`
> AC：`<验收条件>`

| 字段 | 内容 |
| --- | --- |
| Desc | <主要行为> |
| Given | <前置状态> |
| When | <动作> |
| Then | <当前组件边界内可观察结果> |

### 集成测试
### 契约测试
### 并发测试
### 端到端测试

## 测试配置
## 测试命令

| 范围 | 命令 | 前置条件 |
|---|---|---|
| 受影响测试 | `<实际命令>` | <条件> |
| 当前组件全部测试 | `<实际命令>` | <条件> |

## 例外
````

- Command Bus 只在多个用例需要统一分派或共享 Middleware 时采用；不适用的角色和章节直接删除。
- 同一聚合或能力内只有字段、类型和简单校验的 Entity、Value Object 可以合并；出现独立行为、生命周期、复杂不变量或复用时再拆分。
- 测试按单元、集成、契约、并发和端到端分组；每个稳定用例使用 `- **<限界上下文>-<测试层级>-<对象或能力>-<三位序号>**` 编号项，例如 `- **AUTH-DOM-USER-001**`。`Src` 必须是精确测试文件路径并由 `component.md` 文件树收录。
- 不创建语言映射表或测试用例总表；Requirement TC 或验收跨组件 BP 的场景归全局 `<test>`，不在组件测试中重复规划。
- `Design` 必须是可解析设计标识；测试实现对每个标识使用 `@verifies`。组件测试不引用 Requirement TC，不声称验证跨组件 BP。
- `Desc`、`Given`、`When`、`Then` 使用“字段 / 内容”小表格连续记录且各描述一个主要行为。消息行为由集成测试验证，Schema 兼容性由契约测试验证。
- 测试工具链沿用项目现状；没有既有 JavaScript/TypeScript 测试工具链时默认使用 `pnpm` 和 Vitest。只记录真实可执行命令。
- 测试报告和覆盖率报告按需由用户手动导出，不作为默认提交文件。

## AI-BACKEND-011

- **Who**：处理 `<组件> backend <任务>` 的组件设计 Agent。
- **When**：Backend 存在由现有进程托管的后台任务或独立 Worker 异步任务时。
- **Where**：当前 Backend 组件设计目录与工程、数据和异步契约。
- **What**：提供“`jobs.md`”功能；具体规则、格式和约束如下。
- **Why**：在一个文件中区分后台任务和独立 Worker，同时共享任务表达格式。

> - 范例适配声明：以下任务类型、元信息、功能点、时序、投递和幂等要求必须按实际任务调整。

````md
# 任务设计

定义当前 Backend 的后台任务与独立 Worker 异步任务。

## 后台任务

### <任务名称>

> Src：`<精确生产文件路径>`
> Host：`<现有 API 或 Worker 进程>`
> 触发方式：<定时、启动或内部事件>
> Test：`engineering.md#<测试用例>`

- **001**：<动词 + 业务对象>

<简短描述>

运行方式：

```mermaid
sequenceDiagram
    participant Trigger
    participant Task
    participant Application
    Trigger->>Task: <触发>
    Task->>Application: <调用用例>
```

## 异步任务

### <任务名称>

> Src：`<精确生产文件路径>`
> Runtime：`<Worker 运行单元>`
> AsyncAPI：`asyncapi.json#/channels/<channel>`
> Topic：`<topic>`
> 投递语义：至少一次
> 幂等键：`<key>`
> Test：`engineering.md#<测试用例>`

- **001**：<动词 + 业务对象>

<简短描述>

运行方式：

```mermaid
sequenceDiagram
    participant Broker
    participant Worker
    participant Inbox
    participant Application
    Broker->>Worker: <消息>
    Worker->>Inbox: <幂等判断>
    Worker->>Application: <调用用例>
    Worker-->>Broker: <确认或重试>
```
````

- 后台任务随宿主进程启动和停止，不拥有独立启动命令、健康检查、部署或扩缩容单元。
- 异步任务必须引用实际 AsyncAPI Channel，声明独立 Runtime、投递语义、幂等键、确认、重试和终止失败策略。
- 每个三级标题表示一个任务，每个 `- **001**：` 编号项表示一个“动词 + 业务对象”的功能点。
- `jobs.md` 只维护任务功能、消费约束和运行时序；事务语义引用 `data.md`，进程生命周期引用 `operations.md`。

## AI-BACKEND-012

- **Who**：处理 `<组件> backend <任务>` 的组件设计 Agent。
- **When**：Backend 存在配置、密钥、可观测性、运行进程或部署交付要求时。
- **Where**：当前 Backend 组件设计目录与工程、任务、系统基线和部署阶段。
- **What**：提供“`operations.md`”功能；具体规则、格式和约束如下。
- **Why**：在一个文件中维护运行和交付要求，避免五份相互引用的运维文档。

> - 范例适配声明：以下配置、密钥、信号、进程和交付内容必须按实际运行环境和部署边界调整。

```md
# 运行与交付

定义当前 Backend 的配置、密钥、可观测性、运行生命周期和部署交付要求。

## 配置

### 配置清单

| 配置项 | 用途 | 来源 | 默认值 | 必需 | 敏感性 |
|---|---|---|---|---|---|
| `<配置项>` | <用途> | <来源> | <默认值> | <是或否> | <级别> |

### 来源与覆盖优先级
### 启动校验

## 密钥

### 密钥清单
### 注入与轮换
### 泄漏处理

## 可观测性

### 日志与审计
### 指标与追踪
### 健康检查
### 告警与脱敏

## 运行要求

### 进程模型
### 运行依赖
### 启动与关闭
### 资源要求
### 故障恢复

## 部署交付

### 交付物与镜像
### 初始化与迁移
### 发布顺序
### 回滚要求
```

- `operations.md` 只记录当前组件如何落实 `docs/system/security.md` 和 `docs/system/observability.md`，不复制系统基线。
- 不保存密钥值、环境值、Compose、部署脚本或具体平台配置；这些由 `<组件 deploy>` 维护。
- 后台任务记录在宿主进程中；`jobs.md` 声明的每个 Worker Runtime 必须在进程模型中有对应运行单元。
- 健康检查、资源、故障恢复、迁移、发布和回滚必须可由部署阶段直接落实和验证。
