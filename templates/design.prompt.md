# 阶段目标

从当前 GitHub Issue 的初步想法开始，通过对话补齐产品决策，再由不同专家 Agent 共同完成需求、流程、平台体验、架构、权限、API、事件、数据、样式和三套环境的 Docker 编排设计。当前阶段只生成设计阶段产物 Patch，不修改源码或全局产物。

这是统一设计阶段；不再把 issue、process、permission、c4、api 和 database 拆成独立阶段。

# 关联 Issue

输入上下文可能包含当前 Issue 明确引用的其他需求 `design/` 根层稳定产物。它们只能作为参考：

- 不读取关联需求的时间戳目录、Prompt、Patch 或 Patch 分析；
- 不扫描没有被当前 Issue 明确引用的需求；
- 当前对话确认、当前 Issue 和当前需求已有设计优先；
- 关联设计与当前需求冲突时必须对话确认，不得静默沿用。

# 对话式需求发现

使用者不需要填写模板。开始时先判断当前输入是新功能、修改、删除还是修复，并按类型分析：新增确认最小业务闭环；修改对比当前、目标与必须保持不变的行为；删除确认替代能力、存量数据和下线方式；修复记录触发条件、实际行为、期望行为、影响范围和回归边界。再动态确认真正影响产品结果的信息：

- 用户、问题和期望结果；
- 包含范围与明确不做事项；
- 目标平台：`web`、`mini-program`、`desktop`、`mobile`；
- 与已有能力的新增、替换、删除或兼容关系；
- 关键业务规则、权限、隐私和敏感数据边界；
- 关键失败行为和可验证完成标准。

先从 Issue、现有阶段产物和项目事实中区分“已有事实”“本轮确认”“暂时假设”和“未决问题”。暂时假设不得写成正式需求、业务规则或验收条件；会改变产品结果的假设必须对话确认。修改、删除和修复必须明确记录当前行为、目标行为和必须保持不变的行为。

对每个端到端场景判断是否影响 Backend、目标平台、数据、API、事件、权限、迁移、部署和用户通知；只展开实际受影响项，不因检查清单扩大范围。业务规则必须说明适用主体、前置条件、输入、判断、结果和失败结果；核心业务对象必须说明初始状态、允许与禁止转换、终态及触发者。

不要询问代码组织、API URL、索引实现、组件拆分或图表排版等可由专家依据项目事实决定的事项。

## 需求可设计门禁

只有以下条件全部满足才结束需求对话：

- 用户、问题、目标和范围明确；
- 目标平台明确，不默认生成所有平台；
- 关键规则、权限和兼容关系明确；
- 可以形成稳定编号的业务规则和验收条件；
- 当前、目标和不变行为已明确，每条功能需求均有流程、验收条件和测试用例；
- 所有影响产品结果的假设已确认，验收条件可以直接测试；
- 没有阻塞整体设计的产品问题。

达到门禁后先展示一份简短的“需求确认摘要”，包含用户、问题、目标、平台、包含、不包含、关键规则、权限、兼容性和验收结果，只询问“以上是否准确？确认后我将开始完整设计。”使用者确认前不得生成最终 Patch。

# 多专家 Agent 协作

如果环境支持子 Agent，必须按专业组分配；并发受限时分批执行。专家只分析和评审，只有主 Agent 生成统一 Patch，不得把各组内容未经检查直接拼接。

## 第一轮：需求、流程和体验

- 需求与流程组：产品经理、业务分析师、领域专家、测试专家；
- 每个目标平台独立专家组：平台 UX、平台开发架构师、可访问性或平台性能专家。

共同确定需求编号、业务规则、验收条件、流程、状态、页面、交互、异常和平台差异。

## 第二轮：架构与契约

- 架构与权限组：解决方案架构师、安全架构师、权限专家、SRE；
- API 与事件组：API 架构师、后端架构师、安全专家；
- 数据组：数据架构师、后端架构师、数据库性能专家。

第二轮必须以第一轮统一结论为输入，并互查模块边界、数据所有权、字段、状态、标识、权限、事务和兼容性。

## 第三轮：交叉评审

各组只报告冲突、遗漏、不成立的假设和必须修改的内容。能够依据事实解决的分歧直接解决；涉及范围、权限、删除能力、数据兼容性或不可逆迁移而没有依据时，返回通用对话确认。

## 第四轮：集成门禁

由首席架构师、产品负责人和测试负责人形成唯一修改清单，不引入新业务规则，并执行本文“一致性检查”。

增量设计只启动受影响的专家组，但集成门禁始终执行。保留已有稳定编号、命名、`operationId` 和无关内容；未经确认不得删除能力、扩大权限或作出不兼容修改。

# Patch 允许包含的稳定产物

- `{{REQUIREMENT_DIR}}/design/requirement.md`
- `{{REQUIREMENT_DIR}}/design/process.md`
- `{{REQUIREMENT_DIR}}/design/backend.process.md`
- `{{REQUIREMENT_DIR}}/design/backend.ddd.md`
- `{{REQUIREMENT_DIR}}/design/architecture.md`
- `{{REQUIREMENT_DIR}}/design/technology.md`
- `{{REQUIREMENT_DIR}}/design/deployment.md`
- `{{REQUIREMENT_DIR}}/design/authorization.fga`
- `{{REQUIREMENT_DIR}}/design/openapi.json`
- `{{REQUIREMENT_DIR}}/design/asyncapi.json`
- `{{REQUIREMENT_DIR}}/design/schema.dbml`
- `{{REQUIREMENT_DIR}}/design/design.token.json`
- `{{REQUIREMENT_DIR}}/design/web.design.token.json`
- `{{REQUIREMENT_DIR}}/design/mini-program.design.token.json`
- `{{REQUIREMENT_DIR}}/design/desktop.design.token.json`
- `{{REQUIREMENT_DIR}}/design/mobile.design.token.json`
- `{{REQUIREMENT_DIR}}/design/web.md`
- `{{REQUIREMENT_DIR}}/design/web.ui.yaml`
- `{{REQUIREMENT_DIR}}/design/mini-program.md`
- `{{REQUIREMENT_DIR}}/design/mini-program.ui.yaml`
- `{{REQUIREMENT_DIR}}/design/desktop.md`
- `{{REQUIREMENT_DIR}}/design/desktop.ui.yaml`
- `{{REQUIREMENT_DIR}}/design/mobile.md`
- `{{REQUIREMENT_DIR}}/design/mobile.ui.yaml`
- `{{REQUIREMENT_DIR}}/design/test-cases.md`
- `{{REQUIREMENT_DIR}}/design/development.compose.yml`
- `{{REQUIREMENT_DIR}}/design/development.env`
- `{{REQUIREMENT_DIR}}/design/test.compose.yml`
- `{{REQUIREMENT_DIR}}/design/test.env`
- `{{REQUIREMENT_DIR}}/design/production.compose.yml`
- `{{REQUIREMENT_DIR}}/design/production.env`
- `{{REQUIREMENT_DIR}}/design/questions.md`
- `{{REQUIREMENT_DIR}}/status.json`

只创建当前需求实际需要的契约和已选择平台文件。稳定产物直接放在 `design/` 根层；`{{RUN_DIR}}` 仅保留不可覆盖的本次 Prompt、Patch 和分析记录。

# 设计文件要求

## requirement.md

记录概览、事实与确认、背景、用户与参与者、当前行为、目标行为、必须保持不变、用户场景、包含、不包含、核心对象与状态、失败与边界、兼容与迁移、约束、可量化的非功能要求及精简变更记录。功能需求、非功能需求、业务规则和验收条件分别使用本文“统一编号与状态”规定的 `FR`、`NFR`、`BR` 和 `AC` 编号。验收条件只验证一个可观察行为，引用对应需求和规则，并覆盖实际适用的正常、失败、边界和无权限场景，不写内部实现。

## process.md 与 architecture.md

`process.md` 中每个业务流程使用 `FLOW` 编号，记录关联需求、参与者、触发、前置条件、正常步骤、分支、异常、状态变化和结束条件；每一步映射真实编号或契约。`architecture.md` 记录系统边界、模块职责、依赖、通信方式和数据所有权。图表遵守通用 Mermaid 规范。

## 统一编号与 status.json

从需求目录名取得需求号，例如目录 `REQ-0010-booking` 的需求号是 `REQ-0010`。所有可跟踪设计项使用全需求唯一编号：

| 前缀 | 类型 | 产物 |
|---|---|---|
| `FR` | 功能需求 | `requirement.md` |
| `NFR` | 非功能需求 | `requirement.md` |
| `BR` | 业务规则 | `requirement.md` |
| `FLOW` | 业务流程 | `process.md` |
| `AC` | 验收条件 | `requirement.md` |
| `TC` | 测试用例 | `test-cases.md` |
| `PERM` | 权限规则 | `requirement.md` 与 `authorization.fga` |
| `UI` | 需要独立跟踪的平台行为 | 平台 Markdown 与 UI YAML |
| `MIG` | 数据、权限或客户端迁移 | `deployment.md` |

编号格式为 `<需求号>-<类型>-<三位序号>`，例如 `REQ-0010-FR-001`。同一类型使用下一个未占用序号；编号一经使用不得改号、复用或因排序变化重新编号。被替代或取消的项保留记录并将 `lifecycle` 改为 `superseded` 或 `cancelled`。

在需求根目录创建 `status.json`，作为唯一进度与追溯状态文件；`verification.md` 不再创建。JSON 必须有效且结构固定：

```json
{
  "version": 1,
  "requirement": "REQ-0010",
  "items": [
    {
      "id": "REQ-0010-NFR-001",
      "type": "non-functional-requirement",
      "title": "沿用现有平台兼容范围",
      "source": "design/requirement.md#REQ-0010-NFR-001",
      "links": [],
      "lifecycle": "active",
      "stages": {
        "design": "done",
        "dev": "pending",
        "test": "pending",
        "deployment": "not-applicable",
        "patch": "pending"
      },
      "evidence": {
        "design": ["design/requirement.md#REQ-0010-FR-001"],
        "dev": [],
        "test": [],
        "deployment": ["不涉及部署变化：沿用现有服务"],
        "patch": []
      }
    }
  ]
}
```

`type` 只能是 `functional-requirement`、`non-functional-requirement`、`business-rule`、`flow`、`acceptance-criterion`、`test-case`、`permission-rule`、`platform-behavior` 或 `migration`，并必须与编号前缀一致。`links` 只能引用同一 `status.json` 中存在的编号。Design 创建、增量更新设计项，并只更新 `design` 状态与证据；未来阶段初始为 `pending`，确实不适用时可设为 `not-applicable`，但必须写明依据。不得预先填写未来阶段已经完成。

Design、Dev、Deployment 和 Patch 状态只能使用 `pending`、`in-progress`、`done`、`blocked`、`not-applicable`；Test 使用 `pending`、`in-progress`、`passed`、`failed`、`blocked`、`not-applicable`。`done`、`passed` 和 `not-applicable` 必须有真实证据。后续阶段只能修改自己的状态和证据；发现缺少、错误或需要拆分的设计项时返回 Design，不得自行新增、删除、改号或改写设计语义。

## test-cases.md

Design 阶段即形成可执行语义的测试用例。每个 `TC` 引用至少一个 `AC`，并记录优先级、风险、前置条件、测试数据、Given、When、Then 和适用平台。覆盖正常路径以及实际适用的失败、边界、无权限、重复提交、并发、弱网、迁移和兼容场景；不得声称尚未执行的用例已经通过。Test 阶段负责补充必要回归、真实执行和记录结果，不复制或重新编号这些用例。

## backend.process.md

当前需求包含 Backend 时创建或增量更新；纯前端且不改变后端行为时不创建空文件。它只描述后端实现主要业务流程的技术时序，不复制 `process.md` 的业务流程正文：

- 每个主要时序使用稳定编号 `BSEQ-xxx` 和一个 Mermaid `sequenceDiagram`；
- 引用对应业务流程、`AC-xxx`、`operationId` 和领域事件；
- 表达 API、应用服务、领域对象、Repository、数据库、消息和外部服务的协作；
- 明确事务边界、幂等、并发、重试、补偿和关键失败路径；
- 一个时序图只表达一个主要流程。

最终由 patch 阶段把长期有效的变化增量同步到 `docs/architecture/process/backend.process.md`。

## backend.ddd.md

当前需求包含 Backend 时创建或增量更新；纯前端且不改变领域规则时不创建空文件。记录统一语言、Bounded Context、Context Map、Aggregate Root、Entity、Value Object、领域不变量、Domain Service、Application Service、Domain Event、Repository 端口、防腐层和依赖方向，并映射 OpenAPI、AsyncAPI、DBML 与 OpenFGA。不得把每张数据库表机械映射为领域实体，也不得在技术选型尚未确认时编造类名和目录。

最终由 patch 阶段把长期有效的变化增量同步到 `docs/architecture/backend.ddd.md`。

## technology.md

记录本需求确认的技术选型、准确版本或型号、用途、选择理由、兼容约束和事实来源。已有实现和锁定版本优先；无法从项目事实或用户确认确定时明确标注待确认，不得填写 `latest` 或猜测版本。最终由 patch 阶段把长期有效的变化增量同步到 `docs/architecture/technology.md`。

## deployment.md

分别记录 development、test、production 的部署拓扑、对应 Compose 与环境文件、构建和发布方式、配置与密钥来源、数据和权限迁移、健康检查、监控、备份、恢复与回滚约束。它是部署设计，不代替 Deployment 阶段基于真实实现和测试结果形成的执行验证记录。最终由 patch 阶段把长期有效的变化增量同步到 `docs/architecture/deployment.md`。

## 平台 Markdown 与 UI YAML

平台 Markdown 解释页面清单、用户目标、入口、出口、导航、状态转换、设计原因和平台差异；每个需要独立验收的平台行为使用 `UI` 编号。对应 `<platform>.ui.yaml` 是结构化实现契约，Markdown 与其冲突时以 UI YAML 为准。UI YAML 使用稳定且不得无故改名的 screen、region、component、action 和 state ID，声明：

- 页面或窗口结构；
- 组件、布局和导航；
- loading、empty、error、forbidden、success 等状态；
- 操作引用的正式 `operationId`、事件或本地行为；
- 响应式、窗口、弱网、离线、平台权限和可访问性要求；
- Token 引用。

每个 screen 必须引用 `FR`、`AC` 和适用的 `UI`/`PERM`，并声明 route 或平台入口、访问条件、布局区域、组件、数据来源、全部适用状态和 action。每个 action 必须声明触发方式、输入来源、`operationId`/事件/本地行为、权限、提交状态、成功结果和失败恢复。表单字段声明数据来源、必填、默认值、客户端校验、服务端错误映射和敏感性；远程操作说明重复提交、刷新、重试和乐观更新失败行为。

先读取现有组件与 Tokens，记录复用、扩展或新增的最小选择，不编造源码类名和目录。多个平台使用同一业务名称和规则，但明确导航、输入方式、系统权限、窗口或屏幕、离线和深链接的真实差异，不复制一份通用设计冒充平台设计。响应式优先引用项目已有断点；没有事实时描述布局切换条件，不猜测像素值。

可访问性至少覆盖核心流程键盘操作、焦点顺序与恢复、控件标签、非颜色错误提示、动态状态播报、文本缩放和平台触控目标。UI 权限只控制展示体验，不能替代服务端鉴权；说明无权限时隐藏、禁用、只读或 forbidden 的具体行为。

UI YAML 固定使用以下层级；不适用字段省略，不另造同义键：

```yaml
# 示例中的 REQ-0010 必须替换为当前需求号。
version: 1
platform: web
tokens:
  common: ./design.token.json
  platform: ./web.design.token.json
screens:
  - id: order-list
    title: 订单列表
    requirementRefs: [REQ-0010-FR-001]
    acceptanceRefs: [REQ-0010-AC-001]
    behaviorRefs: [REQ-0010-UI-001]
    route: /orders
    access:
      permissionRef: REQ-0010-PERM-001
    regions: []
    states: []
    actions: []
```

平台 UI YAML 的 Token 引用示例：

```yaml
tokens:
  common: ./design.token.json
  platform: ./web.design.token.json
```

## Design Tokens

- `design.token.json` 只放所有目标平台共用的 Token；
- `<platform>.design.token.json` 只放该平台新增或覆盖项；
- 平台文件不得复制公共 Token；
- 平台最终值按公共文件、平台文件的顺序合并；
- 当前阶段 Token 是需求阶段产物，不得直接修改 `packages/design-tokens/tokens/**`；
- 最终由 patch 阶段把已确认的变化合并到全局 `token.json` 和 `<platform>.token.json`。

## Docker 编排

- 在 `design/` 根层创建 `development.compose.yml`、`test.compose.yml`、`production.compose.yml` 及各自同名 `.env`；
- 三套 Compose 分别声明本环境实际需要的服务、网络、Volume、端口、健康检查、启动依赖、构建或镜像策略；
- Compose 中的相对路径以宿主项目根目录为基准，后续统一通过 `docker compose --project-directory .` 执行；
- `.env` 只保存可提交的非敏感配置和变量名，不得写入密码、Token、证书、真实凭据或其他密钥；敏感值通过宿主环境、CI/CD 或 Docker Secrets 注入；
- Dev、Test 和 Deployment 只读取对应环境文件；发现编排设计错误时必须返回 Design 修正，不得在后续阶段直接修改；
- 当前阶段不修改宿主项目 `docker/`；最终仅由 patch 阶段把确认后的六个文件同步到该目录。

## 正式契约

OpenAPI 和 AsyncAPI 使用有效 JSON，操作使用稳定 `operationId`，示例与 Schema 一致。权限以服务端为准。DBML 覆盖实体、字段、关系、约束、索引、迁移和回滚。没有异步事件时不创建空的 `asyncapi.json`。

## authorization.fga

有 Backend 且存在非公开操作或权限变化时，创建或增量更新可直接加载的完整 OpenFGA schema 1.1 模型，不生成无法独立验证的片段；没有权限变化时保留已有模型。先在 `requirement.md` 建立权限矩阵，每条 `PERM` 记录主体、租户或组织、资源、操作、允许条件、明确禁止、对应 `BR`/`AC` 和 `operationId`，再映射到 FGA type、relation 和 permission。

| PERM | 主体 | 租户/组织 | 资源 | 操作 | 允许条件 | 明确禁止 | BR/AC | operationId | FGA object/relation |
|---|---|---|---|---|---|---|---|---|---|

权限默认拒绝，未经确认不得发明超级管理员绕过或让 `admin` 自动拥有全部能力。明确认证与授权边界、资源所有权、对象 ID 来源、多租户隔离、跨租户共享、授权与撤权主体、自我提权限制、列表过滤、批量操作、字段脱敏以及 `401`/`403`/`404` 的信息隐藏策略。每个受保护 `operationId` 说明检查的 object、relation、object ID 来源和检查时机；UI 隐藏按钮不算权限实现。

同时设计授权 tuple 的创建、撤销、资源删除、所有权转移、失败补偿、幂等、缓存失效和审计。OpenFGA 不可用或超时时默认拒绝。权限模型变更使用 expand-contract，说明应用与 model 发布顺序、tuple 回填、兼容窗口和回滚。最终 Patch 只把确认且经实现和测试验证的增量合并到 `docs/contracts/authorization.fga`，不得用单个需求模型静默覆盖无关权限。

## 追溯关系

`status.json` 的 `links` 维护设计项之间的双向可检查关系；各设计文件直接引用真实编号、`operationId`、事件、FGA relation 或模型。每个 `FR` 必须关联 `FLOW`、`AC` 和 `TC`，并按实际范围关联 `UI`、`PERM`、`MIG`、后端时序、API/事件和数据模型；不适用项在对应阶段状态中写 `not-applicable` 及依据，不另建重复追溯矩阵。

# 一致性检查

- 每条需求都有验收条件和执行路径；
- 每个 active 的 `FR` 都关联 `FLOW`、`AC` 和 `TC`，所有编号唯一、引用存在且未重新编号；
- Backend 范围中的主要流程都有后端时序，领域规则都有明确的上下文、聚合和不变量归属；
- 每个平台操作都有 API、事件或明确的本地行为；
- API 字段可以映射到业务概念和数据模型；
- 状态名称在流程、平台、API 和数据库中一致；
- 所有非公开服务端操作都有 `PERM` 和 FGA/API 映射，并覆盖允许、拒绝和跨租户边界；
- 异步操作覆盖提交、查询、成功、失败、超时和重试；
- 架构数据所有权与 API、事件和数据库归属一致；
- 迁移、历史数据、兼容窗口和回滚没有冲突；
- Token 公共值与平台覆盖没有无意义重复；
- 三套 Compose 与架构容器、服务依赖、环境边界和数据持久化设计一致；
- 三个 `.env` 不包含敏感值，且 Compose 引用的变量在对应环境文件或外部密钥来源中有明确归属；
- `technology.md` 的选型和版本与契约、架构及宿主项目事实一致；
- `deployment.md` 覆盖 development、test、production，并与三套 Compose 和迁移设计一致；
- 每个页面能映射到流程，每个远程 action 有输入、权限、提交、成功、失败和恢复设计；
- `test-cases.md` 覆盖所有验收条件及高风险正反场景，但不虚构执行结果；
- `status.json` 是有效 JSON，所有 active 项的 Design 状态为 `done`，未来阶段没有被虚假标记完成；存在阻塞时不得结束 Design。

当前阶段的 Git Patch 只能修改上述 Design 稳定阶段产物和需求根层 `status.json`。不得修改源码、全局产物、其他需求目录或任何历史时间戳执行记录。
