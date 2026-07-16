---
stage: flow
requirement: {{REQUIREMENT}}
from: {{FROM_STAGE}}
to: {{TO_STAGE}}
created_at: {{CREATED_AT}}
---

# 修改需求

{{REQUEST}}

# 执行范围

按以下顺序逐阶段执行，不得预先生成后续阶段 Prompt：

{{STAGE_COMMANDS}}

# 执行规则

1. 这是连续工作流的总控提示词。修改需求首先交给起始阶段；后续阶段必须基于前一阶段已经确认并应用的最新项目事实判断影响。
2. 每次只运行当前阶段命令，读取命令输出的 Prompt 并完整遵守。不要一次生成全部阶段 Prompt，否则后续上下文会过期。
3. 每个阶段先整理当前理解；存在不清楚的需求时，每次只询问使用者一个最关键的问题并等待回答，直到理解达到至少 95%。
4. 当前阶段生成 AI 结果后，向使用者说明外层 Git Patch 的影响并等待明确批准。批准后依次执行 `git apply --check` 和 `git apply`；检查或应用失败时停止，不得跳过或强行应用。
5. 外层 Patch 创建或更新阶段级全局 Patch 时，再单独展示其影响并等待批准，然后依次执行 `git apply --check` 和 `git apply`。完成后才能进入下一阶段。
6. 当前阶段没有变化时，按阶段 Prompt 生成 `result: no-changes` 的分析文件，然后继续下一阶段，不得创建空 Patch。
7. 执行到 backend 且它不是最后阶段时，应用外层 Patch 后读取并执行 `{{REQUIREMENT_DIR}}/06-backend.prompt.md`，直接修改源码并完成其中的验证；向使用者展示实际 Git 差异并确认后再继续。backend 是最后阶段时，只生成并应用 `06-backend.prompt.md` 后停止，不执行其中的编码任务。
8. 不覆盖已有 Prompt 或 AI 结果，不修改 `docs/workflows/`，不替使用者批准 Patch，不在失败状态下继续。

# 完成条件

- 已执行到 `{{TO_STAGE}}`。
- 每个阶段的 Prompt、AI 结果和批准记录都保存在原阶段目录。
- 最终说明实际执行、跳过、失败和待人工处理的内容。
