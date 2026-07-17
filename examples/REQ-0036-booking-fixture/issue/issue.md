# Issue #36：预约修复

## 来源

- 主 Issue：#36
- 合并：#14、#16、#27
- 保留不动：#12
- 待下次处理：#31

## 谁使用

- 已登录客户
- 服务人员

## 要解决什么

客户需要可靠地修改或取消已有预约，重复点击不能创建重复记录。

## 功能

1. 客户可以在允许时间内修改预约时间。
2. 客户可以取消预约。
3. 重复提交只能产生一次结果。

## 验收条件

- 修改成功后显示最新预约时间。
- 不可用时间不能被选择。
- 取消成功后预约状态变为 `cancelled`。
- 相同幂等键重复提交返回第一次结果。

## 执行工作流

<!-- WORKFLOW:START -->
```json
{
  "version": 1,
  "stages": [
    { "name": "issue", "dependsOn": [], "reason": "确认预约修复范围" },
    { "name": "process", "dependsOn": ["issue"], "reason": "修改预约状态与异常流程" },
    { "name": "api", "dependsOn": ["process"], "reason": "修改预约接口和幂等约定" },
    { "name": "database", "dependsOn": ["api"], "reason": "确认预约状态与幂等约束" },
    { "name": "backend", "dependsOn": ["api", "database"], "reason": "实现服务端预约用例" },
    { "name": "design", "dependsOn": ["process"], "reason": "设计预约修改与取消的页面、状态和异常反馈" },
    { "name": "frontend:web", "dependsOn": ["api", "design"], "reason": "在 Web 端实现修改与取消交互" },
    { "name": "test", "dependsOn": ["backend", "frontend:web"], "reason": "验证完整验收条件" }
  ]
}
```
<!-- WORKFLOW:END -->

## 需要补充

- 最晚什么时候可以修改预约？
- 取消预约是否收费？
- 服务人员能否代客户操作？
