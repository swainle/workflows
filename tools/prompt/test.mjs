import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "test", stageId: "08-test", stageName: "测试",
  template: "test.prompt.md",
  roles: [
    "测试架构师：制定覆盖策略、风险优先级和必要回归范围。",
    "产品经理：检查测试是否证明验收条件和业务目标成立。",
    "前端专家：检查用户交互、页面状态、兼容性和可访问性。",
    "后端与安全专家：检查接口、数据、并发、权限和失败恢复。",
  ],
  globals: ["docs/architecture/product.md", "docs/architecture/process", "docs/contracts/openapi.json", "docs/contracts/asyncapi.json", "docs/contracts/schema.dbml", "docs/contracts/authorization.fga"],
  maxRequirementPrefix: 8,
});
