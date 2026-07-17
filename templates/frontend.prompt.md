# 阶段目标

只处理 `{{PLATFORM_NAME}}` 平台。根据需求产物创建或增量修改 `{{REQUIREMENT_DIR}}/frontend/{{PLATFORM}}/frontend.prompt.md`，当前阶段不执行编码任务。

执行提示词必须要求编码 AI阅读当前需求产物和现有源码，直接修改该平台完成需求所需的源码、测试和文字资源，复用现有组件与 Tokens，并运行项目已有验证命令。需要改变契约或其他平台时停止并询问。

# 允许修改

- `{{REQUIREMENT_DIR}}/frontend/{{PLATFORM}}/frontend.prompt.md`
- `{{REQUIREMENT_DIR}}/frontend/{{PLATFORM}}/design-tokens.json`
- `{{REQUIREMENT_DIR}}/frontend/{{PLATFORM}}/*.md`

当前阶段不得直接修改源码、其他平台或全局文件。
