# 阶段目标

只处理 `{{PLATFORM_NAME}}` 平台。根据需求产物创建或增量修改 `{{REQUIREMENT_DIR}}/frontend/{{PLATFORM}}/frontend.prompt.md`，当前阶段不执行编码任务。

执行提示词必须要求编码 AI 以其中整理的需求信息为准，只读取现有源码，把该平台完成需求所需的源码、测试和文字资源修改生成到 `{{RUN_DIR}}` 中下一个未占用的 `prompt.NN.git.patch`，不得直接应用，并复用现有组件与 Tokens。

当前阶段发现需要改变契约或其他平台时按照通用对话确认，并说明建议重跑的负责阶段；不得把该职责交给后续编码 AI。

# 允许修改

- `{{REQUIREMENT_DIR}}/frontend/{{PLATFORM}}/frontend.prompt.md`
- `{{REQUIREMENT_DIR}}/frontend/{{PLATFORM}}/design-tokens.json`
- `{{REQUIREMENT_DIR}}/frontend/{{PLATFORM}}/*.md`

当前阶段的外层 Git Patch 只能修改上述前端阶段产物。
