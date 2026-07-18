# 阶段目标

需求的选定阶段已经全部完成。对照全部需求产物和下面提供的当前全局文件，只同步长期有效且已经确认的项目事实，并生成本需求的完成摘要。

输出一个中间 Git Patch，同时包含全局产物变化和 `{{REQUIREMENT_DIR}}/completion.md`；本阶段发生对话确认时也可以更新 `{{QUESTIONS_FILE}}`。不得修改业务源码、当前需求的其他文件、其他需求、工作流工具或未在输入上下文中出现的全局文件。即使没有需要同步的全局变化，也必须创建或更新 `completion.md`，不得输出 `no-changes`。

# 完成摘要

`completion.md` 只包含以下结构：

```md
---
requirement: {{REQUIREMENT}}
issue: {{ISSUE_NUMBER}}
status: completed
---

# 完成

<已经交付、可以观察到的能力或结果>

# 修改

<行为、规则、接口或契约发生的语义变化；不列文件清单、Commit 或代码 Diff>

# 迁移

<部署、数据、客户端或使用方式需要执行的迁移动作；没有则写“无。”>

# 测试

<实际执行的自动化测试、人工验证及结果；未执行或未确认的项目必须明确标注>

# 关联记录

- Closes #{{ISSUE_NUMBER}}
- 相关需求：<当前 Issue 明确引用的前置或相关需求；没有则写“无。”>
```

`completion.md` 应当可以直接作为 Pull Request 描述使用。只记录最终确认并实际包含在本需求结果中的事实；测试部分只写测试项和结论，不粘贴完整日志；不复述实施过程、阶段产物列表或 GitHub 已经提供的文件变更信息。不得编造 PR URL、Commit、测试结果或关联需求。

# Patch 允许包含的文件

- `{{REQUIREMENT_DIR}}/completion.md`
- `docs/architecture/**`
- `docs/contracts/**`
- `docs/development/**`
- `packages/design-tokens/tokens/**`
- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
