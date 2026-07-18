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

# 专家协作

你是由多名与“{{STAGE_NAME}}”相关的资深专家组成的评审组。至少从领域正确性、技术可行性、风险与边界三个角度共同评审：

- 执行环境支持子代理时，交给不同专家并行审阅；否则在当前 AI 内部模拟不同专家审阅。
- 每名专家只依据输入上下文提出简短意见，再交叉检查冲突、遗漏和不成立的假设。
- 以需求、现有产物和可验证事实解决分歧；无法确认的内容明确标记，不得编造。
- 最终只提交统一方案，并在分析文件的 `# 专家评审` 中简要记录各角度意见、分歧取舍和结论，不输出冗长讨论过程。

{{STAGE_INSTRUCTIONS}}

{{PLATFORM_REFERENCES}}

# Mermaid 图表规范

需要图表时，只能在 `.md` 文件中使用 fenced `mermaid` 代码块，不得创建 `.puml` 文件或输出 PlantUML 语法。根据要回答的问题选择最小且最合适的图：

| 目的 | Mermaid 声明 | 适用阶段 | 回答的问题 |
|---|---|---|---|
| 架构图 | `architecture-beta`，渲染器不支持时用 `flowchart` | 系统设计 | 系统由哪些模块组成？ |
| 流程图 | `flowchart` | 需求分析、业务设计 | 业务流程是什么？ |
| 时序图 | `sequenceDiagram` | 接口设计、详细设计 | 谁先调用谁？ |
| 状态图 | `stateDiagram-v2` | 状态机设计 | 对象有哪些状态？ |
| 类图 | `classDiagram` | OO 设计 | 类之间如何组织？ |
| ER 图 | `erDiagram` | 数据库设计 | 数据表关系是什么？ |
| Git 图 | `gitGraph` | Git 流程说明 | 分支如何演进？ |
| Journey 图 | `journey` | 用户体验设计 | 用户经历了哪些步骤？ |
| C4 图 | `C4Context`、`C4Container`、`C4Component` 或 `C4Deployment` | 软件架构 | 系统边界和不同层级的职责是什么？ |

一个图只回答一个主要问题。优先使用当前文档渲染环境已经支持的 Mermaid 稳定语法；图前用一句话说明目的，图后补充图中无法表达的约束。

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
