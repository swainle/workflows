# 阶段目标

根据需求产物创建或增量修改 `{{REQUIREMENT_DIR}}/backend/backend.prompt.md`。当前阶段只整理执行提示词，不执行编码任务。

执行提示词必须要求编码 AI：

- 阅读当前需求产物和现有源码，识别实际技术栈与命令；
- 直接修改完成需求所需的后端源码、迁移和测试，不生成 Git Patch；
- 处理输入边界、错误、事务、并发、权限和数据一致性；
- 运行项目已有的 lint、类型检查、测试和构建命令；
- 发现需求冲突或需要改变契约时停止并询问。

# 允许修改

- `{{REQUIREMENT_DIR}}/backend/backend.prompt.md`
- `{{REQUIREMENT_DIR}}/backend/*.md`

当前阶段不得直接修改源码或全局文件。生成外层 Git Patch 和分析文件后立即停止。
