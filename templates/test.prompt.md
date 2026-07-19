# 阶段目标

根据需求产物整理可执行的验收场景、必要回归、边界和失败路径。每个场景应能追溯到需求或受影响产物。

把 `{{REQUIREMENT_DIR}}/design/test.compose.yml` 和 `test.env` 作为测试环境编排事实，测试命令从宿主项目根目录使用 `docker compose --project-directory .`。不得直接修改这两个 Design 阶段文件或宿主项目 `docker/`；发现错误时返回 Design 修正。

# Patch 允许包含的文件

- `{{REQUIREMENT_DIR}}/test/*.feature`
- `{{REQUIREMENT_DIR}}/test/*.md`

不得修改业务实现或全局文件。
