# 产品分析

通过主 Issue URL 阅读完整内容，按需查看相关 Issues，并结合现有需求文件和产品架构进行产品分析，创建或完善 `issue/issue.md`。不能只按关键词归类；必须判断用户、场景、目标、流程、异常、约束和完成标准。

# 分析要求

- 需求目录使用四位编号并与主 Issue 对应，例如 Issue `#36` 对应 `REQ-0036-*`。
- 使用 GitHub 页面或 `gh issue list`、`gh issue view` 查找关联内容；“相关 Issues”表格只列与主 Issue 的用户目标、业务场景、流程、数据或约束有直接关系的 Issue，并附 URL；无关 Issue 不得列入。
- 逐个判断相关 Issue 是新建、合并至主 Issue、保留、待处理还是排除，并说明具体原因。
- 重复或属于同一用户目标的需求可以合并；仍需独立交付的需求必须保留。
- 发现影响需求范围、业务规则、流程或验收标准的信息不足时，先暂停生成 Git Patch 和分析文件，与使用者逐条确认。
- 每次只问一个最关键的问题，等待使用者回答后再判断下一个问题；不要一次提出多个问题，也不要重复询问已经明确的内容。
- 每次回答后更新需求理解和信心，直到对使用者真实需求至少有 95% 的把握，才能继续生成 Git Patch 和分析文件。
- 无法从 Issue、已有文档或使用者回答确认的内容，不得擅自写成确定规则。
- 已有 `issue/issue.md` 代表人工确认过的最新需求和工作流，只能增量完善，不能无理由删除或改写。
- 只有旧版 `00-issue.md` 或 `01-prd.md` 时，把其中已经确认的内容完整迁移到 `issue/issue.md`，补充本次工作流，并在同一个外层 Patch 中删除旧文件；不得丢失人工确认内容。
- `issue/issue.md` 至少说明目标用户、目标、范围、业务规则、异常情况、成功指标、验收标准、待确认问题和本需求唯一的执行工作流；不适用的部分说明原因。
- 只有本次需求改变长期有效的产品目标、用户角色、产品范围或全局业务规则时，才生成 `{{GLOBAL_PATCH_FILE}}`；没有全局产品变化时不得创建。
- 全局产品 Patch 只允许修改 `docs/architecture/product.md`，不得包含 Issue 来源、实现细节、单次验收条件或待确认问题。已有文件可能经过人工修改，必须在现有内容上增量完善。
- “概要”必须根据本次产品分析结果组织，准确预览 Patch 中 `issue/issue.md` 的实际结构、结论和选定工作流，不能套用固定章节或只列空标题。
- “人工检查”必须根据本次相关 Issue、影响文件、产品结论和待确认事项生成可执行检查项，不能照抄固定清单。
- 每个业务结论必须能追溯到 Issue 或已有文档。没有依据时明确标记待确认，禁止编造业务规则。

# 候选工作流

必须逐项分析以下全部候选阶段，只把本需求实际需要的阶段写入最终工作流：

| 阶段 | 何时需要 | 常见依赖 |
|---|---|---|
| `issue` | 所有需求；确认价值、范围、指标和执行计划 | 无 |
| `process` | 业务流程、状态、规则或异常发生变化 | `issue` |
| `permission` | 身份、角色、资源关系、数据可见性或授权发生变化 | `issue` 或 `process` |
| `design` | 信息架构、页面结构、交互、状态反馈或跨平台体验需要设计 | `process`、`permission`（按影响选择） |
| `c4` | 系统边界、容器职责、外部系统或通信方式发生变化 | `process`、`permission`（按影响选择） |
| `api` | API、事件、错误或客户端契约发生变化 | `process`、`permission`、`c4`（按影响选择） |
| `database` | 实体、字段、约束、索引或迁移发生变化 | `api` 或 `process` |
| `backend` | 服务端行为、用例或集成需要实现 | `api`、`database`、`permission`（按影响选择） |
| `frontend:web` | Web 页面、交互或客户端状态需要实现 | `design`、`api`、`permission`、`process`（按影响选择） |
| `frontend:mobile` | iOS/Android 或跨端移动应用需要实现 | `design`、`api`、`permission`、`process`（按影响选择） |
| `frontend:mini-program` | 小程序页面、交互或平台能力需要实现 | `design`、`api`、`permission`、`process`（按影响选择） |
| `frontend:desktop` | Windows/macOS/Linux 桌面应用需要实现 | `design`、`api`、`permission`、`process`（按影响选择） |
| `test` | 验证需求和受影响能力；除纯文档需求外通常需要 | 所有本次实现阶段 |
| `deployment` | 发布配置、迁移、监控、容量或回滚发生变化 | `test` 以及受影响的实现阶段 |

常见方案仅用于辅助判断，不得机械套用：

- 纯文档：`issue`
- 单平台界面：`issue → design → frontend:web → test`（平台名称按实际目标替换）
- 业务流程：`issue → process → backend`，并按需从 `process` 分支到 `design → frontend:<platform>`，最后汇合到 `test`
- 权限：`issue → process → permission`，再按影响分支到 `api`、`backend`、`design` 和 `frontend:<platform>`
- 数据能力：`issue → process → api → database → backend → test → deployment`
- 多平台产品：共享 `design`，分别进入所需的 `frontend:web`、`frontend:mobile`、`frontend:mini-program`、`frontend:desktop`，再汇合到 `test`
- 系统能力：`issue → process → c4 → api → database/backend`，按需并行执行设计与平台前端，最后进入 `test → deployment`

工作流允许分支和汇合。每个阶段必须列出本需求中真实存在的 `dependsOn`，不得因为阶段编号较小就自动依赖，也不得选择没有明确影响的阶段。涉及前端时，必须逐个平台判断并只选择实际交付的平台；多个平台共享一个 `design` 阶段，但每个平台使用独立的前端实现阶段。

# `issue/issue.md` 工作流格式

文件中必须包含且只能包含一个由以下标记包围的 JSON 工作流。`stages` 只列选中的阶段，必须包含 `issue`，名称只能使用上述阶段；依赖必须也在 `stages` 中，不得循环：

<!-- WORKFLOW:START -->
```json
{
  "version": 1,
  "stages": [
    { "name": "issue", "dependsOn": [], "reason": "所有需求必须先确认范围" },
    { "name": "process", "dependsOn": ["issue"], "reason": "本需求改变业务流程" },
    { "name": "api", "dependsOn": ["process"], "reason": "本需求新增接口" },
    { "name": "backend", "dependsOn": ["api"], "reason": "需要服务端实现" },
    { "name": "test", "dependsOn": ["backend"], "reason": "验证验收条件" }
  ]
}
```
<!-- WORKFLOW:END -->

# 分析文件格式

分析文件 `{{ANALYSIS_FILE}}` 参考以下基础结构。保留 frontmatter、“输入”和“相关 Issues”；其他章节可根据分析结果增删或调整，并用实际内容替换尖括号：

````md
---
stage: issues
requirement: {{REQUIREMENT}}
patch_file: {{PATCH_NAME}}
global_patch_file: <全局产品 Patch 文件名或 null>
result: proposed
---

# 输入

- 需求编号：#<主 Issue 编号>
- 主 Issue：<标题及 URL>
- 需求：<核心诉求>
- 需求文件：`{{REQUIREMENT_PATH}}`

# 相关 Issues

| Issue | 处理 | 原因 |
|---|---|---|
| [#<编号>](<URL>) | <新建/合并至主 Issue/保留/待处理/排除> | <关联依据和产品判断> |

# 影响范围

- `{{REQUIREMENT_PATH}}`
- `{{GLOBAL_PATCH_FILE}}`（仅有全局产品变化时）

# 概要

`{{REQUIREMENT_PATH}}`

```md
<根据本次产品分析结果，预览拟创建或修改的需求定义和唯一工作流；章节、顺序和内容必须与 Git Patch 中的 `issue/issue.md` 一致>
```

# 需补充到文档

1. <达到 95% 把握后仍需在后续阶段确认、但不影响本次需求定义的问题>

# 人工检查

1. <根据本次 Git Patch 的实际文件和内容生成检查步骤>
2. <检查关键 Issue 处理关系和产品结论>
3. <检查待确认事项没有被写成确定业务规则>

# Issue 评论建议

<供人工填写的简短评论，列出本阶段结果和生成产物；不要自动评论>

# 记录

- 创建：<本地时间>
- 同意：<待人工填写>
````

“相关 Issues”不得为了展示检索过程而列出无关 Issue。需要使用者确认时先进行对话，不得把本应询问的问题直接留给分析文件；达到 95% 把握后仍存在但不影响本次需求定义的问题，才可列入“需补充到文档”。没有此类问题时写“无”。局部和全局都没有修改时，按通用规则将 `patch_file`、`global_patch_file` 写为 `null`，将 `result` 写为 `no-changes`。

# 允许修改

- `{{REQUIREMENT_DIR}}/issue/issue.md`
- `{{REQUIREMENT_DIR}}/issue/*.md`

不得创建、修改或关闭 GitHub Issue，不得修改业务源码和全局文件。
