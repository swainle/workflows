# 阶段目标

阅读主 Issue，创建或增量修改 `{{REQUIREMENT_PATH}}`。不确定项写入 `# 待确认问题`，只记录有来源或已经确认的结论，不得编造规则。

如果当前主 Issue 的正文或评论明确引用了其他 Issue 或 `completion.md`，可以读取被明确引用需求的完成摘要，提取其中的“完成、修改、迁移、测试、关联记录”事实。不得扫描整个 `docs/requirements/`，不得读取未被当前 Issue 引用的历史需求；链接无法访问时要求使用者提供内容。

需求文件应包含目标、范围、约束、验收条件、待确认事项和本需求唯一工作流。工作流放在以下标记之间：

````md
<!-- WORKFLOW:START -->
```json
{
  "version": 1,
  "stages": [
    { "name": "issue", "dependsOn": [], "reason": "确认需求" }
  ]
}
```
<!-- WORKFLOW:END -->
````

可选阶段：`issue`、`process`、`permission`、`design`、`c4`、`api`、`database`、`backend`、`frontend:web`、`frontend:mobile`、`frontend:mini-program`、`frontend:desktop`、`test`、`deployment`。只选择实际需要的阶段，并准确填写 `dependsOn`；工作流可以分支和汇合。

正式接口尚未定义且设计需要先用 `design/mock.json` 表达界面数据需求时，把 `design` 放在 `api` 前，并让 `api.dependsOn` 包含 `design`。

# 允许修改

- `{{REQUIREMENT_DIR}}/issue/issue.md`
- `{{REQUIREMENT_DIR}}/issue/*.md`

不得修改 GitHub Issue、源码、全局文件或其他需求目录。
