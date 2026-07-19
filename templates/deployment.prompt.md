# 阶段目标

根据 Design 契约、Dev 实际实现和 Test 结论，记录当前需求的构建、发布、迁移、监控、恢复和回滚方案。复用项目现有工具，不重新定义业务行为，不直接修改部署源码或全局产物。

把 `{{REQUIREMENT_DIR}}/design/production.compose.yml` 和 `production.env` 作为生产环境编排事实，验证命令从宿主项目根目录使用 `docker compose --project-directory .`。不得直接修改这两个 Design 阶段文件或宿主项目 `docker/`；发现错误时返回 Design 修正。

覆盖：

- 需要构建和发布的服务与平台；
- 非敏感配置、依赖、网络、Volume、健康检查和启动顺序；
- 新旧版本兼容窗口与流量切换；
- 数据库和权限数据的 expand-contract 迁移；
- 备份、恢复、保留策略和恢复演练；
- 日志、指标、告警和发布后验证；
- 失败条件、回滚步骤和不可逆风险；
- Dev 或 Test 尚未完成、尚未确认的阻塞项。

需要后续修改部署代码或配置时，只在阶段产物中列出明确的目标、约束和验证方式，不在当前阶段直接执行。

# status.json

通过阶段 Patch 只更新需求根层 `status.json` 中 Deployment 的状态和证据，不修改编号、设计关系或其他阶段状态。每个 active 项必须为 `done` 或有 Design 依据的 `not-applicable`；`done` 证据引用 `deployment/deployment.md` 中真实验证的构建、迁移、健康检查、恢复或回滚记录。Dev/Test 未通过、生产编排无效、迁移或回滚不可验证时标记 `blocked` 并返回负责阶段，不得放行。

# Patch 允许包含的文件

- `{{REQUIREMENT_DIR}}/deployment/deployment.md`
- `{{REQUIREMENT_DIR}}/deployment/questions.md`
- `{{REQUIREMENT_DIR}}/status.json`

当前阶段 Git Patch 只能修改上述部署稳定阶段产物和状态文件。
