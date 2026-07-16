import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "permission", stageId: "06-permission", stageName: "权限设计与实现",
  template: "permission.prompt.md",
  roles: [
    "安全架构师：定义最小权限、信任边界、授权模型和攻击面。",
    "产品经理：确认角色、业务责任和允许或禁止的操作。",
    "后端专家：检查服务端授权位置、资源关系和绕过风险。",
    "前端与测试专家：检查界面可见性、拒绝反馈和权限测试覆盖。",
  ],
  globalPatch: "06-permission.git.patch",
  globals: ["docs/architecture/product.md", "docs/contracts/authorization.fga", "docs/contracts/openapi.json", "docs/architecture/process"],
  maxRequirementPrefix: 6,
});
