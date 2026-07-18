# 阶段目标

根据需求产物创建或增量修改 `{{REQUIREMENT_DIR}}/backend/backend.prompt.md`。当前阶段只整理执行提示词，不执行编码任务。

执行提示词必须要求编码 AI：

- 以本执行提示词中整理的需求信息为准，只读取现有源码以识别实际技术栈与命令；
- 把完成需求所需的后端源码、迁移和测试修改生成到 `{{RUN_DIR}}` 中下一个未占用的 `prompt.NN.git.patch`，不得直接应用；
- 处理输入边界、错误、事务、并发、权限和数据一致性；
- 在说明中列出应用 Patch 后应运行的现有 lint、类型检查、测试和构建命令；
- 发现需求冲突或需要改变契约时停止并询问。

# 允许修改

- `{{REQUIREMENT_DIR}}/backend/backend.prompt.md`
- `{{REQUIREMENT_DIR}}/backend/*.md`

当前阶段的外层 Git Patch 只能修改上述后端阶段产物。生成外层 Git Patch 和分析文件后立即停止。
