# 阶段目标

根据需求产物描述本需求新增、修改或删除的接口与事件。覆盖输入、输出、错误、认证、授权和兼容性；没有依据时先询问。

# 允许修改

- `{{REQUIREMENT_DIR}}/api/openapi.json`
- `{{REQUIREMENT_DIR}}/api/asyncapi.json`
- `{{REQUIREMENT_DIR}}/api/*.md`

不得修改源码或全局契约。

需要说明参与者和接口调用顺序时，在 Markdown 中使用 `sequenceDiagram`；需要说明资源状态变化时使用 `stateDiagram-v2`。
