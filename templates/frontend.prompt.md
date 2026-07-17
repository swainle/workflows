# 阶段目标

只处理 `{{PLATFORM_NAME}}` 平台。根据需求产物创建或增量修改 `{{REQUIREMENT_DIR}}/frontend/{{PLATFORM}}/frontend.prompt.md`，当前阶段不执行编码任务。

执行提示词必须要求编码 AI 阅读当前需求产物和现有源码，把该平台完成需求所需的源码、测试和文字资源修改生成到 `{{CODE_PATCH_FILE}}`，不得直接应用。复用现有组件与 Tokens；需要改变契约或其他平台时停止并询问。

# 允许修改

- `{{REQUIREMENT_DIR}}/frontend/{{PLATFORM}}/frontend.prompt.md`
- `{{REQUIREMENT_DIR}}/frontend/{{PLATFORM}}/design-tokens.json`
- `{{REQUIREMENT_DIR}}/frontend/{{PLATFORM}}/*.md`

当前阶段的外层 Git Patch 只能修改上述前端阶段产物。
