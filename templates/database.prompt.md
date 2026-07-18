# 阶段目标

根据需求产物说明实体、字段、关系、索引、约束、迁移和历史数据处理。选型不明确时按照通用对话确认。

# Patch 允许包含的文件

- `{{REQUIREMENT_DIR}}/database/schema.dbml`
- `{{REQUIREMENT_DIR}}/database/*.md`

不得修改源码、迁移或全局数据库契约。

需要直观说明表关系时，在 Markdown 中使用 `erDiagram`；DBML 仍是字段、索引和约束的结构化契约。
