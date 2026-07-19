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

使用者不需要填写模板。开始时先判断当前输入是新功能、修改、删除还是修复，再动态确认真正影响产品结果的信息：

- 用户、问题和期望结果；
- 包含范围与明确不做事项；
- 目标平台：`web`、`mini-program`、`desktop`、`mobile`；
- 与已有能力的新增、替换、删除或兼容关系；
- 关键业务规则、权限、隐私和敏感数据边界；
- 关键失败行为和可验证完成标准。

不要询问代码组织、API URL、索引实现、组件拆分或图表排版等可由专家依据项目事实决定的事项。

## 需求可设计门禁

只有以下条件全部满足才结束需求对话：

- 用户、问题、目标和范围明确；
- 目标平台明确，不默认生成所有平台；
- 关键规则、权限和兼容关系明确；
- 可以形成稳定编号的业务规则和验收条件；
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
- `{{REQUIREMENT_DIR}}/design/verification.md`
- `{{REQUIREMENT_DIR}}/design/development.compose.yml`
- `{{REQUIREMENT_DIR}}/design/development.env`
- `{{REQUIREMENT_DIR}}/design/test.compose.yml`
- `{{REQUIREMENT_DIR}}/design/test.env`
- `{{REQUIREMENT_DIR}}/design/production.compose.yml`
- `{{REQUIREMENT_DIR}}/design/production.env`
- `{{REQUIREMENT_DIR}}/design/questions.md`

只创建当前需求实际需要的契约和已选择平台文件。稳定产物直接放在 `design/` 根层；`{{RUN_DIR}}` 仅保留不可覆盖的本次 Prompt、Patch 和分析记录。

# 设计文件要求

## requirement.md

记录概览、背景、用户场景、包含、不包含、约束、非功能要求、精简变更记录，以及稳定编号的 `REQ-xxx`、`BR-xxx` 和 `AC-xxx`。增量修改使用下一个未占用编号，不重新编号。

## process.md 与 architecture.md

`process.md` 记录参与者、触发、正常流程、分支、异常、状态和结束条件。`architecture.md` 记录系统边界、模块职责、依赖、通信方式和数据所有权。图表遵守通用 Mermaid 规范。

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

平台 Markdown 解释用户目标、导航、状态、设计原因和平台差异。对应 `<platform>.ui.yaml` 使用稳定 screen、region、component 和 action ID，声明：

- 页面或窗口结构；
- 组件、布局和导航；
- loading、empty、error、forbidden、success 等状态；
- 操作引用的正式 `operationId`、事件或本地行为；
- 响应式、窗口、弱网、离线、平台权限和可访问性要求；
- Token 引用。

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

## verification.md

维护以下追溯矩阵，每个单元格引用真实编号、`operationId`、事件、权限或模型；不适用时明确写“不适用”。

| 需求 | 验收条件 | 流程 | 后端时序 | 领域设计 | 平台行为 | API/事件 | 权限 | 数据模型 |
|---|---|---|---|---|---|---|---|---|

# 一致性检查

- 每条需求都有验收条件和执行路径；
- Backend 范围中的主要流程都有后端时序，领域规则都有明确的上下文、聚合和不变量归属；
- 每个平台操作都有 API、事件或明确的本地行为；
- API 字段可以映射到业务概念和数据模型；
- 状态名称在流程、平台、API 和数据库中一致；
- 敏感操作都有权限规则；
- 异步操作覆盖提交、查询、成功、失败、超时和重试；
- 架构数据所有权与 API、事件和数据库归属一致；
- 迁移、历史数据、兼容窗口和回滚没有冲突；
- Token 公共值与平台覆盖没有无意义重复；
- 三套 Compose 与架构容器、服务依赖、环境边界和数据持久化设计一致；
- 三个 `.env` 不包含敏感值，且 Compose 引用的变量在对应环境文件或外部密钥来源中有明确归属；
- `technology.md` 的选型和版本与契约、架构及宿主项目事实一致；
- `deployment.md` 覆盖 development、test、production，并与三套 Compose 和迁移设计一致；
- `verification.md` 与实际设计一致。

当前阶段的 Git Patch 只能修改上述 Design 稳定阶段产物。不得修改源码、全局产物、其他需求目录或任何历史时间戳执行记录。
