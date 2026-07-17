# 阶段目标

阅读主 Issue，必要时逐条向使用者确认，创建或增量修改 `{{REQUIREMENT_PATH}}`。只记录有来源或已经确认的结论，不得编造规则。

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

# 允许修改

- `{{REQUIREMENT_DIR}}/issue/issue.md`
- `{{REQUIREMENT_DIR}}/issue/*.md`

不得修改 GitHub Issue、源码、全局文件或其他需求目录。
