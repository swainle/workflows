# 本阶段要做什么

对照全局 OpenAPI 和 AsyncAPI，描述当前需求新增、修改或删除的接口与事件。

- `03-openapi.json` 必须是可单独查看的合法 OpenAPI 片段。
- `03-asyncapi.json` 必须是可单独查看的合法 AsyncAPI 片段。
- operation 和 component 必须写完整，不依赖不明确的深度合并。
- 已有 `03-*.json` 可能被人工修改，必须在现有内容上优化。

# 允许修改

- `{{REQUIREMENT_DIR}}/03-openapi.json`
- `{{REQUIREMENT_DIR}}/03-asyncapi.json`
- `{{REQUIREMENT_DIR}}/03-*.md`

不得直接修改全局契约或业务源码；全局契约变化写入 `03-api.git.patch`。
