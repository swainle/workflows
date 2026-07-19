# 阶段目标

需求的选定阶段已经全部完成。对照全部需求产物和下面提供的当前全局文件，只同步长期有效且已经确认的项目事实，并生成本需求的完成摘要。

先以需求根层 `status.json` 为唯一完成清单。任一 active 项的 Design、Dev、Test 或 Deployment 状态不是对应的 `done`、`passed` 或 `not-applicable` 时停止，不得生成完成结果。输出一个中间 Git Patch，同时包含全局产物变化、`{{REQUIREMENT_DIR}}/completion.md` 和更新后的 `status.json`；本阶段发生对话确认时也可以更新 `{{QUESTIONS_FILE}}`。不得修改业务源码、当前需求的其他文件、其他需求、工作流工具或未在输入上下文中出现的全局文件。即使没有需要同步的全局变化，也必须创建或更新 `completion.md` 和 `status.json`，不得输出 `no-changes`。

Design Tokens 只在本阶段同步：把 `design/design.token.json` 中确认且长期有效的变化增量合并到 `packages/design-tokens/tokens/token.json`；把 `design/<platform>.design.token.json` 合并到对应 `<platform>.token.json`。平台文件只保留平台新增或覆盖项，不复制公共 Token，不用当前需求文件整体覆盖全局文件。

Design 的长期项目事实只在本阶段增量同步：`design/requirement.md` 对应 `docs/architecture/requirement.md`，`design/architecture.md` 对应 `docs/architecture/architecture.md`，`design/process.md` 的长期流程对应 `docs/architecture/process/overview.md`，`design/backend.process.md` 对应 `docs/architecture/process/backend.process.md`，`design/backend.ddd.md` 对应 `docs/architecture/backend.ddd.md`，`design/technology.md` 对应 `docs/architecture/technology.md`，`design/deployment.md` 对应 `docs/architecture/deployment.md`。不得用单个需求文件整体覆盖全局文件。

Design 契约也只在本阶段增量同步：把已经实现并通过测试的 `design/openapi.json`、`asyncapi.json`、`schema.dbml` 和 `authorization.fga` 变化分别合并到 `docs/contracts/` 对应文件。保留无关契约、稳定 `operationId`、事件、模型和权限语义，不得用当前需求文件整体覆盖全局文件；没有对应变化时不修改。

Docker 编排也只在本阶段同步：把 Design 中已经通过 Dev、Test 和 Deployment 验证的 `development.compose.yml`、`development.env`、`test.compose.yml`、`test.env`、`production.compose.yml`、`production.env` 同步到宿主项目 `docker/` 下的同名文件。不得同步包含密码、Token、证书、真实凭据或其他密钥的环境值。

# 完成摘要

`completion.md` 只包含以下结构：

```md
---
requirement: {{REQUIREMENT}}
issue: {{ISSUE_NUMBER}}
status: completed
---

# 完成

<已经交付、可以观察到的能力或结果>

# 修改

<行为、规则、接口或契约发生的语义变化；不列文件清单、Commit 或代码 Diff>

# 迁移

<部署、数据、客户端或使用方式需要执行的迁移动作；没有则写“无。”>

# 测试

<实际执行的自动化测试、人工验证及结果；未执行或未确认的项目必须明确标注>

# 关联记录

- Closes #{{ISSUE_NUMBER}}
- 相关需求：<当前 Issue 明确引用的前置或相关需求；没有则写“无。”>
```

`completion.md` 应当可以直接作为 Pull Request 描述使用。只记录最终确认并实际包含在本需求结果中的事实；测试部分只写测试项和结论，不粘贴完整日志；不复述实施过程、阶段产物列表或 GitHub 已经提供的文件变更信息。不得编造 PR URL、Commit、测试结果或关联需求。

# status.json

只更新 Patch 状态和证据。已增量同步或已纳入最终完成摘要的 active 项标记 `done`，确实没有全局同步动作的项标记 `not-applicable` 并说明原因；证据引用实际全局文件或 `completion.md`。不得修改其他阶段状态、设计项身份或追溯关系。结束时每个 active 项五个阶段均已闭环，`completion.md` 才可写 `status: completed`。

# Patch 允许包含的文件

- `{{REQUIREMENT_DIR}}/completion.md`
- `{{REQUIREMENT_DIR}}/status.json`
- `docs/architecture/**`
- `docs/contracts/**`
- `docs/development/**`
- `docker/**`
- `packages/design-tokens/tokens/**`
- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
