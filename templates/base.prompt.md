---
stage: {{STAGE}}
stage_name: {{STAGE_NAME}}
requirement: {{REQUIREMENT}}
issue: {{ISSUE_NUMBER}}
issue_url: {{ISSUE_URL}}
requirement_file: {{REQUIREMENT_PATH}}
created_at: {{CREATED_AT}}
---

# 任务

执行“{{STAGE_NAME}}”阶段。阅读下面提供的文件，在已有内容上补充和修正。

人工可能已经修改需求产物。已有文件代表当前最新状态，不要无理由重新生成或覆盖。

# 阶段默认配置

{{DEFAULT_REQUIREMENTS}}

# 本次附加要求

{{USER_REQUIREMENT}}

本次附加要求优先于阶段默认配置；但不得突破允许修改范围、安全边界和输出格式。

{{STAGE_INSTRUCTIONS}}

{{PLATFORM_REFERENCES}}

# 输出文件

需要修改时，直接创建：

- Git Patch：`{{PATCH_FILE}}`
- 简单分析：`{{ANALYSIS_FILE}}`

Git Patch 必须从 `diff --git` 开始，使用项目相对路径，不得省略内容。只提出修改，不要应用 Patch。

创建 Git Patch 后必须在项目根目录运行 `git apply --check "{{PATCH_FILE}}"`。检查失败时先修复 Patch，直到检查通过；不得把损坏的 Patch 作为结果提交，也不得实际应用。

`.01` 表示当前 Prompt 的第一次 AI 结果。如果同名结果已经存在，不得覆盖；本次所有输出同时改用下一个两位序号，例如 `.02`、`.03`，分析文件 frontmatter 中的文件名也必须使用实际序号。

不需要修改时，只创建分析文件 `{{ANALYSIS_FILE}}`，并将 `patch_file` 写为 `null`，将 `result` 写为 `no-changes`。

分析文件最后必须包含 `# Issue 评论建议`，简要列出阶段、结果和生成或修改的产物路径，供人工在 {{ISSUE_URL}} 填写评论。只生成建议文本，不得调用 GitHub API 或 `gh issue comment`，也不得声称尚未发生的提交或推送已经完成。

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
# Issue 评论建议
# 记录

- 创建：<本地时间>
- 确认人：
- 确认时间：
- 补充说明：
```

不要写空话，不要使用难懂术语。必须使用术语时，紧接一句简单解释。

# 通用边界

- 不修改 `{{RUN_DIR}}` 之外已有的时间戳执行目录及其中的 Prompt、AI 结果和资源。
- 不修改 `docs/workflows/` 子模块。
- 不升级未授权依赖。
- 不写入密钥、令牌或真实凭据。
- 二进制资源不写入 Git Patch。
- 只修改本阶段明确允许的文件。
- 只能参考输入上下文中的全局产物、当前阶段产物和依赖阶段产物，不得读取其他需求目录或未提供的项目文件。

# 输入上下文

{{CONTEXT}}
