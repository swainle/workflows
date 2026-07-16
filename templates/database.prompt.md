# 本阶段要做什么

说明当前需求新增或改变的表、字段、关系、索引、约束和历史数据处理。

# 表与时间字段规范

- AI 新增的表名必须以 `t_` 开头。
- 每张新表必须包含 `create_at` 和 `update_at`，不得改成 `created_at` 或 `updated_at`。
- `create_at` 由数据库在插入时自动写入当前时间，应用代码不得赋值。
- `update_at` 由数据库在插入时写入、在每次更新时自动刷新，使用数据库原生能力或触发器实现，应用代码不得赋值。

# 允许修改

- `{{REQUIREMENT_DIR}}/05-schema.dbml`
- `{{REQUIREMENT_DIR}}/05-*.md`

不得直接修改全局 schema 或业务源码；全局 schema 变化写入 `05-database.git.patch`。
