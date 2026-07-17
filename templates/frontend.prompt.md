# 本阶段要做什么

只实现 `{{PLATFORM_NAME}}` 平台。根据 `issue/issue.md`、`design/*.md`、API 和权限产物，检查该平台的页面、组件、文字、交互状态、布局和 Design Tokens。已有 `frontend/{{PLATFORM}}/*` 文件可能被人工修改，必须一并优化。

先识别仓库中该平台对应的 workspace、应用入口和测试命令；不得把其他平台代码当作本阶段实现目标。确需修改跨平台共享包时，只做本平台完成需求不可缺少的最小变更，并在分析中列出对其他平台的影响。

# 允许修改

- `{{REQUIREMENT_DIR}}/frontend/{{PLATFORM}}/design-tokens.json`
- `{{REQUIREMENT_DIR}}/frontend/{{PLATFORM}}/*.md`
- 完成需求必须修改的 `{{PLATFORM_NAME}}` 平台源码、测试和文字资源

不得修改后端、数据库、部署文件或其他平台应用；全局 Design Tokens 变化写入 `{{GLOBAL_PATCH_FILE}}`。
