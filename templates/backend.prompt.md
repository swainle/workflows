# 本阶段要做什么

根据 PRD、流程、C4 架构、接口和数据库，与使用者确认后端实现需求，并整理成一份可直接交给具备本地文件操作能力的 AI 编码的提示词。本阶段只整理提示词，不执行其中的编码任务。

当前任务与后续编码任务是两个严格分离的阶段。下面列出的源码修改、迁移、测试和命令执行要求，只能作为外层 `*_prompt.NN.git.patch` 新增或修改 `06-backend.prompt.md` 的内容，不得在当前阶段执行。即使已经具备足够上下文，也只能生成外层 Git Patch 并停止；由人工应用该 Patch 后，`06-backend.prompt.md` 才会被新增或修改。

# `06-backend.prompt.md` 要求

以下条目是目标文件的内容要求，不是当前阶段的执行指令。该文件必须脱离本次对话也能独立执行，并明确要求后续执行它的 AI：

- 先检查根目录配置、workspace 清单、现有后端源码和测试，识别实际框架、项目结构与命令，不得凭空假设或擅自更换技术栈。
- 根据已确认需求说明业务目标、验收条件、输入输出、异常、权限、事务、幂等、并发和数据一致性要求。
- 必须采用严格的 DDD 分层和面向对象实现，不能只按业务名称拆分函数文件。先识别限界上下文，并在后端源码根目录下按 `modules/<bounded-context>/{domain,application,infrastructure,interfaces}` 或项目已有的等价结构组织；现有结构不符合时，在本需求范围内完成重构，不能以“保持现状”为由继续堆积到扁平 `lib` 目录。
- Domain 层使用 class 实现聚合根、实体和值对象，通过构造、工厂和有业务含义的方法维护不变量；禁止公开可变状态、只有 getter/setter 的贫血模型，以及把核心规则留在 Route Handler、Service 工具函数或 ORM 回调中。无状态且不承载领域规则的转换工具可以使用纯函数。
- Application 层使用明确的用例或应用服务 class 编排领域对象、Repository Port、事务和外部能力，不包含 HTTP、Next.js 或 Prisma 细节；输入输出 DTO 与领域对象分离。
- Repository Port 按聚合和实际用例定义在 Domain 或 Application 层，由 Infrastructure 层实现；禁止万能 Generic Repository，也不得为了目录完整创建空接口、空仓储、空 Factory 或没有替换边界的抽象。
- Infrastructure 层集中 Prisma、数据库事务、消息、缓存和外部服务实现；Interfaces 层的 Route Handler/Controller 只负责协议解析、信任边界校验、调用用例和响应映射，不得直接访问 ORM 或承载业务规则。
- 依赖方向必须是 Interfaces → Application → Domain，Infrastructure 通过组合根注入 Port 实现。Domain 和 Application 禁止导入 Next.js、React、Prisma Client、数据库客户端或 Infrastructure 模块；不得使用全局数据库单例绕过依赖注入。
- 每个聚合的不变量必须有不连接数据库的 Domain 单元测试，每个用例必须通过替身 Port 测试成功与失败路径，Infrastructure 使用真实数据库做集成测试；增加可执行的依赖边界检查，防止禁用导入重新出现。
- 在 `06-backend.prompt.md` 中列出限界上下文、聚合、值对象、用例、Port、适配器、事务边界、目标目录和依赖方向，编码完成后逐项核对；只有目录名称符合但依赖方向或职责不符合时，视为未完成 DDD。
- 遵守 Monorepo 的 workspace 与依赖边界，复用已有包，不得使用跨 workspace 的源码相对路径，不得擅自增加依赖。
- 必须提供可在浏览器访问的 Swagger UI/API 文档页面，并以 `docs/contracts/openapi.json` 为唯一契约来源；不得根据实现另行生成一套不一致的 OpenAPI。发现实现与契约冲突时停止并返回 API 阶段。
- 实现前逐条确认文档页面路径、OpenAPI JSON 路径、启用环境以及匿名访问或鉴权策略。优先使用现有框架能力；确需新增 Swagger/OpenAPI 依赖时，说明原因并获得使用者确认。
- 为 API 文档增加必要验证，至少检查页面可访问、OpenAPI JSON 可加载、访问策略生效且响应不暴露密钥或内部配置。
- 直接修改完成需求所需的后端源码、迁移和单元测试，不生成 Git Patch；完成后运行项目已有的 lint、类型检查、测试和构建命令。
- 编码时发现需求不明确、文档冲突或需要改变架构与契约时，立即暂停，每次只向使用者确认一个问题，理解达到至少 95% 后再继续，不得自行假设。
- 不修改前端源码、全局 C4、全局流程或全局契约；需要改变这些内容时停止并返回对应阶段。

# 允许修改

- `{{REQUIREMENT_DIR}}/06-backend.prompt.md`

本阶段生成的外层 Git Patch 只能创建或更新上述文件，不得修改任何源码、迁移、测试或全局文件。

生成外层 Git Patch 和分析文件后立即停止。当前阶段不得绕过外层 Git Patch 直接新增或修改 `06-backend.prompt.md`，不得执行该文件中的编码任务，也不得以验证提示词为由修改源码。
