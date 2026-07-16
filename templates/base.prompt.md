---
stage: {{STAGE}}
stage_name: {{STAGE_NAME}}
requirement: {{REQUIREMENT}}
prd: {{PRD_PATH}}
created_at: {{CREATED_AT}}
---

# 任务

执行“{{STAGE_NAME}}”阶段。阅读下面提供的文件，在已有内容上补充和修正。

人工可能已经修改需求产物。已有文件代表当前最新状态，不要无理由重新生成或覆盖。

{{STAGE_INSTRUCTIONS}}

{{GLOBAL_PATCH_INSTRUCTIONS}}

# 输出文件

需要修改时，直接创建：

- Git Patch：`{{PATCH_FILE}}`
- 简单分析：`{{ANALYSIS_FILE}}`

Git Patch 必须从 `diff --git` 开始，使用项目相对路径，不得省略内容。只提出修改，不要应用 Patch。

`.01` 表示当前 Prompt 的第一次 AI 结果。如果同名结果已经存在，不得覆盖；两个输出文件同时改用下一个两位序号，例如 `.02`、`.03`，分析文件 frontmatter 中的 `patch_file` 也必须使用实际序号。

不需要修改时，只创建分析文件 `{{ANALYSIS_FILE}}`，并将 `patch_file` 写为 `null`、`result` 写为 `no-changes`。

分析文件必须让不了解项目的人也能看懂。若本阶段说明提供了专用要求，优先使用专用要求；否则使用以下简单结构：

```md
---
stage: {{STAGE}}
requirement: {{REQUIREMENT}}
patch_file: <Git Patch 文件名或 null>
result: proposed
---

# 输入
# 相关内容
# 影响范围
# 修改概要
# 本次不处理
# 需补充到文档
# 人工检查
# 记录

- 创建：<本地时间>
- 确认人：
- 确认时间：
- 补充说明：
```

不要写空话，不要使用难懂术语。必须使用术语时，紧接一句简单解释。

# 通用边界

- 不修改 `{{REQUIREMENT_DIR}}/change/` 下已有的 Prompt、AI 结果和资源。
- 不修改 `docs/workflows/` 子模块。
- 不升级未授权依赖。
- 不写入密钥、令牌或真实凭据。
- 二进制资源不写入 Git Patch。
- 只修改本阶段明确允许的文件。

# 输入上下文

{{CONTEXT}}
