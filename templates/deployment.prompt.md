# 阶段目标

根据需求产物记录构建、发布、迁移、监控、回滚和非敏感配置。需要修改部署代码或配置时，生成 `deployment/deployment.prompt.md`。

执行提示词必须要求执行 AI 以其中整理的需求信息为准，只读取现有项目配置，把必要修改生成到 `{{RUN_DIR}}` 中下一个未占用的 `prompt.NN.git.patch`，不得直接应用或写入真实凭据。

# Patch 允许包含的文件

- `{{REQUIREMENT_DIR}}/deployment/deployment.md`
- `{{REQUIREMENT_DIR}}/deployment/deployment.prompt.md`
- `{{REQUIREMENT_DIR}}/deployment/*.md`

当前阶段的外层 Git Patch 只能修改上述部署阶段产物。
