# 阶段目标

从当前 GitHub Issue 的初步想法开始，通过对话补齐产品决策，再由不同专家 Agent 共同完成需求、流程、平台体验、架构、权限、API、事件、数据和样式设计。当前阶段只生成设计阶段产物 Patch，不修改源码或全局产物。

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
- `{{REQUIREMENT_DIR}}/design/architecture.md`
- `{{REQUIREMENT_DIR}}/design/authorization.fga`
- `{{REQUIREMENT_DIR}}/design/openapi.json`
- `{{REQUIREMENT_DIR}}/design/asyncapi.json`
- `{{REQUIREMENT_DIR}}/design/schema.dbml`
- `{{REQUIREMENT_DIR}}/design/design.token.json`
- `{{REQUIREMENT_DIR}}/design/design.web.token.json`
- `{{REQUIREMENT_DIR}}/design/design.mini-program.token.json`
- `{{REQUIREMENT_DIR}}/design/design.desktop.token.json`
- `{{REQUIREMENT_DIR}}/design/design.mobile.token.json`
- `{{REQUIREMENT_DIR}}/design/web.md`
- `{{REQUIREMENT_DIR}}/design/web.ui.yaml`
- `{{REQUIREMENT_DIR}}/design/mini-program.md`
- `{{REQUIREMENT_DIR}}/design/mini-program.ui.yaml`
- `{{REQUIREMENT_DIR}}/design/desktop.md`
- `{{REQUIREMENT_DIR}}/design/desktop.ui.yaml`
- `{{REQUIREMENT_DIR}}/design/mobile.md`
- `{{REQUIREMENT_DIR}}/design/mobile.ui.yaml`
- `{{REQUIREMENT_DIR}}/design/verification.md`
- `{{REQUIREMENT_DIR}}/design/questions.md`

只创建当前需求实际需要的契约和已选择平台文件。稳定产物直接放在 `design/` 根层；`{{RUN_DIR}}` 仅保留不可覆盖的本次 Prompt、Patch 和分析记录。

# 设计文件要求

## requirement.md

记录概览、背景、用户场景、包含、不包含、约束、非功能要求、精简变更记录，以及稳定编号的 `REQ-xxx`、`BR-xxx` 和 `AC-xxx`。增量修改使用下一个未占用编号，不重新编号。

## process.md 与 architecture.md

`process.md` 记录参与者、触发、正常流程、分支、异常、状态和结束条件。`architecture.md` 记录系统边界、模块职责、依赖、通信方式和数据所有权。图表遵守通用 Mermaid 规范。

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
  platform: ./design.web.token.json
```

## Design Tokens

- `design.token.json` 只放所有目标平台共用的 Token；
- `design.<platform>.token.json` 只放该平台新增或覆盖项；
- 平台文件不得复制公共 Token；
- 平台最终值按公共文件、平台文件的顺序合并；
- 当前阶段 Token 是需求阶段产物，不得直接修改 `packages/design-tokens/tokens/**`；
- 最终由 patch 阶段把已确认的变化合并到全局 `token.json` 和 `<platform>.token.json`。

## 正式契约

OpenAPI 和 AsyncAPI 使用有效 JSON，操作使用稳定 `operationId`，示例与 Schema 一致。权限以服务端为准。DBML 覆盖实体、字段、关系、约束、索引、迁移和回滚。没有异步事件时不创建空的 `asyncapi.json`。

## verification.md

维护以下追溯矩阵，每个单元格引用真实编号、`operationId`、事件、权限或模型；不适用时明确写“不适用”。

| 需求 | 验收条件 | 流程 | 平台行为 | API/事件 | 权限 | 数据模型 |
|---|---|---|---|---|---|---|

# 一致性检查

- 每条需求都有验收条件和执行路径；
- 每个平台操作都有 API、事件或明确的本地行为；
- API 字段可以映射到业务概念和数据模型；
- 状态名称在流程、平台、API 和数据库中一致；
- 敏感操作都有权限规则；
- 异步操作覆盖提交、查询、成功、失败、超时和重试；
- 架构数据所有权与 API、事件和数据库归属一致；
- 迁移、历史数据、兼容窗口和回滚没有冲突；
- Token 公共值与平台覆盖没有无意义重复；
- `verification.md` 与实际设计一致。

当前阶段的 Git Patch 只能修改上述 Design 稳定阶段产物。不得修改源码、全局产物、其他需求目录或任何历史时间戳执行记录。
