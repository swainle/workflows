# 阶段目标

根据需求产物整理用户目标、信息结构、关键路径、状态、反馈和平台差异。只为工作流选中的平台生成内容。

# Patch 允许包含的文件

- `{{REQUIREMENT_DIR}}/design/design.md`
- `{{REQUIREMENT_DIR}}/design/<platform>.md`
- `{{REQUIREMENT_DIR}}/design/mock.json`
- `{{REQUIREMENT_DIR}}/design/*.json`

不得修改源码、接口、数据库、权限或全局文件。能用一个文件说清楚时不要拆分。

仅在正式接口尚未定义且界面设计确实需要数据时创建 `mock.json`。它是临时设计输入，不是 API 契约；使用稳定 `id` 描述操作目的、输入、成功数据和界面场景，不得确定 URL、HTTP Method、鉴权或正式错误码。

```json
{
  "version": 1,
  "status": "provisional",
  "operations": [
    {
      "id": "<stable-id>",
      "purpose": "<界面目的>",
      "input": {},
      "success": {},
      "scenarios": {}
    }
  ]
}
```
