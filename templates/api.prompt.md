# 阶段目标

根据需求产物描述本需求新增、修改或删除的接口与事件。覆盖输入、输出、错误、认证、授权和兼容性；没有依据时按照通用对话确认。

输入上下文包含 `design/mock.json` 时，把它作为临时的界面数据需求，将其中稳定 `id` 映射为正式契约的 `operationId`。正式 OpenAPI 或 AsyncAPI 优先于 Mock；发生冲突时不得静默采用任一方，应按照通用对话确认，并建议重跑 `design`。

# 允许修改

- `{{REQUIREMENT_DIR}}/api/openapi.json`
- `{{REQUIREMENT_DIR}}/api/asyncapi.json`
- `{{REQUIREMENT_DIR}}/api/*.md`

不得修改源码或全局契约。

需要说明参与者和接口调用顺序时，在 Markdown 中使用 `sequenceDiagram`；需要说明资源状态变化时使用 `stateDiagram-v2`。
