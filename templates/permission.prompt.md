# 阶段目标

根据需求产物说明主体、资源、动作、关系、允许和拒绝条件。需要代码实现时，同时生成一份可交给编码 AI 执行的 `permission/permission.prompt.md`。

执行提示词必须要求编码 AI 阅读当前需求产物和现有源码，把授权实现与测试修改生成到 `{{CODE_PATCH_FILE}}`，不得直接应用；遇到文档冲突时停止并询问。

# 允许修改

- `{{REQUIREMENT_DIR}}/permission/authorization.fga`
- `{{REQUIREMENT_DIR}}/permission/*.md`
- `{{REQUIREMENT_DIR}}/permission/permission.prompt.md`

当前阶段的外层 Git Patch 只能修改上述权限阶段产物。
