---
stage: {{STAGE}}
stage_name: {{STAGE_NAME}}
requirement: {{REQUIREMENT}}
issue: {{ISSUE_NUMBER}}
issue_url: {{ISSUE_URL}}
requirement_file: {{REQUIREMENT_PATH}}
questions_file: {{QUESTIONS_FILE}}
created_at: {{CREATED_AT}}
---

# 通用规范

当前磁盘中的需求层规范、阶段结果和源码是最新事实，不要求已有 Commit，也不得用 Git 历史覆盖当前文件。信息冲突时依次服从：Patch 与安全边界、本次对话确认及附加要求、当前主 Issue、当前需求文件、明确关联需求、全局文件和阶段默认配置。同级事实冲突时按“对话确认信息”处理。

只做当前阶段目标需要的最小修改。人工可能已经修改文件，必须保留无关内容、稳定编号、名称和契约，不重置、不清理、不顺手重构或升级依赖。

## Mermaid 图表规范

需要图表时，只能在 `.md` 文件中使用 fenced `mermaid` 代码块，不得创建 `.puml` 文件或输出 PlantUML 语法。根据要回答的问题选择最小且最合适的图：

| 目的 | Mermaid 声明 | 适用阶段 | 回答的问题 |
|---|---|---|---|
| 架构图 | `architecture-beta`，渲染器不支持时用 `flowchart` | 系统设计 | 系统由哪些模块组成？ |
| 流程图 | `flowchart` | 需求分析、业务设计 | 业务流程是什么？ |
| 时序图 | `sequenceDiagram` | 接口设计、详细设计 | 谁先调用谁？ |
| 状态图 | `stateDiagram-v2` | 状态机设计 | 对象有哪些状态？ |
| 类图 | `classDiagram` | OO 设计 | 类之间如何组织？ |
| ER 图 | `erDiagram` | 数据库设计 | 数据表关系是什么？ |
| Git 图 | `gitGraph` | Git 流程说明 | 分支如何演进？ |
| Journey 图 | `journey` | 用户体验设计 | 用户经历了哪些步骤？ |
| C4 图 | `C4Context`、`C4Container`、`C4Component` 或 `C4Deployment` | 软件架构 | 系统边界和不同层级的职责是什么？ |

一个图只回答一个主要问题。优先使用当前文档渲染环境已经支持的 Mermaid 稳定语法；图前用一句话说明目的，图后补充图中无法表达的约束。

## 对话确认信息

生成结果前检查目标、范围、业务规则、验收、权限、兼容性、外部费用、账号依赖和不可逆操作。无法从执行上下文唯一确定且会改变产品结果时必须询问：

- 先穷尽已注入上下文；能由事实确定或不影响语义的排版选择不得提问。
- 每次只问一个影响最大的问题，说明原因和影响，提供一至三个有依据的参考答案，等待回答后继续同一阶段。
- 全部确认后立即继续，不要求使用者重新执行命令。
- 只把已经回答且可复用的确认追加到 `{{QUESTIONS_FILE}}`；不保存未回答问题，不删除仍有效记录。

确认记录使用：

```md
# 确认记录

- 问题：<不确定事项>
  - 原因：<影响及为什么必须确认>
  - 参考：<推荐> / <备选>
  - 确认：<使用者答案>
```

## 专家协作规范

- 专家只依据执行上下文分析，不读取其他需求或历史时间戳目录。
- 每名专家从专业正确性、可实现性、风险和边界提出结论，再交叉检查冲突、遗漏和假设。
- 能由事实解决的分歧直接解决；不能解决时遵守“对话确认信息”。
- 只有主 Agent 统一生成修改，不拼接未经检查的专家草稿，不输出内部讨论过程。

## Status 规范

需求根层 `status.json` 是唯一执行状态与追踪文件。编号格式为 `<需求号>-<类型>-<三位序号>`，已使用编号不得改号、复用或重排：

| 前缀 | 类型 |
|---|---|
| `FR` | `functional-requirement` |
| `NFR` | `non-functional-requirement` |
| `BR` | `business-rule` |
| `FLOW` | `flow` |
| `AC` | `acceptance-criterion` |
| `TC` | `test-case` |
| `PERM` | `permission-rule` |
| `UI` | `platform-behavior` |
| `MIG` | `migration` |

每项固定包含 `id`、`type`、`title`、`source`、`links`、`lifecycle`、`stages` 和 `evidence`。`links` 只需引用存在的编号，不要求反向重复引用；每个 active `FR` 必须关联至少一个 `FLOW`、`AC` 和 `TC`。`lifecycle` 只能是 `active`、`superseded` 或 `cancelled`，废弃项保留编号。

阶段只有 `design`、`dev`、`test`、`patch`。Design/Dev/Patch 状态使用 `pending`、`in-progress`、`done`、`blocked`、`not-applicable`；Test 使用 `pending`、`in-progress`、`passed`、`failed`、`blocked`、`not-applicable`。`done`、`passed` 和 `not-applicable` 必须有真实证据。

```json
{
  "version": 1,
  "requirement": "REQ-0001",
  "items": [{
    "id": "REQ-0001-NFR-001",
    "type": "non-functional-requirement",
    "title": "沿用现有兼容范围",
    "source": "requirement.non-functional.md#REQ-0001-NFR-001",
    "links": [],
    "lifecycle": "active",
    "stages": { "design": "done", "dev": "not-applicable", "test": "pending", "patch": "pending" },
    "evidence": { "design": ["requirement.non-functional.md#REQ-0001-NFR-001"], "dev": ["仅为测试约束，无源码变化"], "test": [], "patch": [] }
  }]
}
```

- Design 创建编号和追踪关系，只更新 Design 状态与证据。
- Dev/Test 只能更新自己阶段的状态与证据，不得修改需求层其他文件、编号、语义或其他阶段状态。
- Patch 只更新 Patch 状态与证据。
- 发现需求规范错误时停止当前阶段，说明原因并建议重新执行 `work:design`。

## Patch 规范

除 Dev 明确允许的源码修改外，不直接修改目标文件；通过本次 Git Patch 提出稳定文件变化。只有 Patch 阶段可以修改全局文件。所有阶段都不得修改其他需求、工作流工具或历史时间戳执行记录。

{{WORKTREE_RULES}}

需要修改时创建：

- Git Patch：`{{PATCH_FILE}}`
- 补丁分析：`{{ANALYSIS_FILE}}`

Git Patch 必须从 `diff --git` 开始，使用项目相对路径，不省略内容，不包含二进制、密钥或真实凭据。创建后从项目根目录运行 `git apply --check "{{PATCH_FILE}}"`，失败时修复 Patch 并重试，不实际应用。结果通过后由使用者运行 `work:{{STAGE}} --merge` 应用并完成阶段。

同名结果已存在时使用下一个两位序号 `.02`、`.03`，Patch 与分析必须使用相同序号。不需要修改时只创建分析文件，`patch_file: null`、`result: no-changes`，不创建空 Patch。

# 设计文件规范

以下稳定规范全部位于 `{{REQUIREMENT_DIR}}/` 根层，不放在 `design/`；`design/`、`dev/`、`test/`、`patch/` 只保存各阶段确认记录、结果和时间戳执行历史。

| 文件 | 规范 |
|---|---|
| `requirement.md` | 概览、背景、用户、场景、当前行为、目标行为、包含、不包含、约束和术语，不重复拆分文件正文 |
| `requirement.functional.md` | 编号 `FR` 的功能需求；每项说明主体、前置、输入、行为、结果和失败结果 |
| `requirement.business.md` | 编号 `BR` 的业务规则、适用条件、优先级和冲突处理 |
| `requirement.permission.md` | 编号 `PERM` 的认证边界、主体、资源、操作、允许与明确禁止、租户边界和权限矩阵 |
| `requirement.acceptance.md` | 编号 `AC` 的可观察验收条件，以及编号 `TC` 的前置数据、Given、When、Then、风险和适用平台 |
| `requirement.non-functional.md` | 编号 `NFR` 的性能、安全、兼容、可访问性、可靠性等可验证指标；没有事实不猜数字 |
| `all.state.md` | 核心业务对象、状态定义和 `stateDiagram-v2`，状态名与流程、API、数据一致 |
| `all.process.md` | 编号 `FLOW` 的核心业务流程、分支、失败和结束条件，使用最小 `flowchart` |
| `backend.process.md` | Backend 接口业务流程、事务、权限、幂等、并发、重试和补偿，每个主要流程一个 `sequenceDiagram` |
| `ddd.md` | 统一语言、Bounded Context、聚合、实体、值对象、不变量、领域服务、事件、仓储端口和依赖方向 |
| `technology.md` | 已确认技术栈、准确版本、用途、理由、兼容约束和事实来源；不写 `latest` |
| `architecture.md` | 系统边界、容器职责、依赖、通信和数据所有权，使用 `C4Container` |
| `contracts.md` | OpenAPI、AsyncAPI、OpenFGA、DBML 的边界、版本、命名、兼容和映射说明；记录 Swagger UI 与 OpenAPI 文档端点 |
| `openapi.json` | 有 HTTP API 时创建；有效 JSON、稳定 `operationId`、示例与 Schema 一致，并由 Backend 提供可访问的文档端点 |
| `asyncapi.json` | 有异步事件时创建；没有事件不创建空文件 |
| `authorization.fga` | 有非公开 Backend 操作时创建可加载的完整 OpenFGA schema 1.1 模型 |
| `schema.dbml` | 有数据变化时记录实体、字段、关系、约束、索引、迁移和回滚 |
| `design.token.json` | 所有目标平台共用的语义 Token |
| `<platform>.md` | 目标平台页面清单、用户目标、导航、状态、交互原因和平台差异 |
| `<platform>.design.token.json` | Web、Mini Program、Desktop 或 Mobile 的新增与覆盖 Token，不复制公共 Token |
| `<platform>.ui.yaml` | 稳定 screen/region/component/action/state ID，映射 FR、AC、PERM、API/事件和 Token |
| `deployment.md` | development/test/production 的启动、停止、迁移、健康检查、备份、恢复和回滚命令及说明；应用命令默认使用 `pnpm` |
| `compose.yml` | 唯一 Docker Compose 编排，三套环境共用，不写真实密钥 |
| `dev.env`、`test.env`、`prod.env` | 可提交的非敏感环境差异和外部密钥变量名 |
| `status.json` | 按“Status 规范”维护跨阶段状态与证据 |

只创建当前需求实际需要的契约和目标平台文件。有 HTTP API 的 Backend 必须使用现有框架能力提供 Swagger UI 和 OpenAPI 文档端点；沿用项目已有路径，没有约定时默认分别使用 `/docs` 和 `/openapi.json`，只在 development 环境启用，test 和 production 环境不得暴露，并在 `contracts.md` 记录实际路径及环境限制。部署中的应用命令默认使用 `pnpm`，只有宿主项目已明确使用其他包管理器时才沿用现状。认证优先复用宿主项目现有方案；没有时使用成熟认证框架或服务与 Backend 可撤销 Session，不自行实现 OAuth Server、不默认自签 JWT。权限最终由服务端和 OpenFGA 判断。

# 阶段目标

{{STAGE_INSTRUCTIONS}}

# 执行顺序

1. 确认目标：读取执行上下文，提取本阶段目标、范围、已有结论、未覆盖项和冲突。
2. 确认事实：按信息优先级和对话规范解决会改变结果的不确定事项。
3. 专家评审：按阶段专家团协作流程形成唯一修改清单。
4. 执行修改：只在可修改范围内完成最小结果，并更新本阶段 Status 与证据。
5. 验证结果：运行阶段规定的真实检查，核对编号、引用、文件范围和敏感信息。
6. 生成结果：创建 Patch 和分析，运行 `git apply --check`，直到通过。

# 执行结果

分析文件只使用以下结构：

```md
---
stage: {{STAGE}}
requirement: {{REQUIREMENT}}
patch_file: <Git Patch 文件名或 null>
result: <proposed 或 no-changes>
---

# 引用 Issue

- [#{{ISSUE_NUMBER}}]({{ISSUE_URL}})

# 引用文件

{{REFERENCE_FILES}}

# 影响文件

| 文件 | 变更 | 影响 |
|---|---|---|
| `<项目相对路径>` | `<新增、修改或删除>` | `<一句话>` |

# 角色

{{ROLES}}

# 时间

- 创建：<带时区的本地时间>
```

“引用文件”必须原样保留实际注入清单；“影响文件”与 Patch 及 Dev 直接源码修改完全一致。结束前确认文件范围合法、状态证据真实、Patch 校验通过，或确实为 `no-changes`。

# 执行上下文

{{READ_RULES}}

## 阶段默认配置

{{DEFAULT_REQUIREMENTS}}

## 本次附加要求

{{USER_REQUIREMENT}}

{{PLATFORM_REFERENCES}}

{{CONTEXT}}
