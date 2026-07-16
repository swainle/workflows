import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "frontend", stageId: "08-frontend", stageName: "前端设计与实现",
  template: "frontend.prompt.md",
  roles: [
    "产品与体验专家：确认用户目标、信息结构、交互路径和文案。",
    "UI 与无障碍专家：检查视觉层级、响应式、Design Tokens 和可访问性。",
    "前端专家：完成最小实现并检查状态管理、错误恢复和性能。",
    "API 与安全专家：检查契约使用、权限一致性和客户端信任边界。",
  ],
  globalPatch: "08-frontend.git.patch",
  globals: ["docs/architecture/product.md", "docs/architecture/process", "docs/architecture/c4.puml", "docs/contracts/openapi.json", "docs/contracts/asyncapi.json", "docs/contracts/authorization.fga", "packages/design-tokens/tokens"],
  maxRequirementPrefix: 8,
});
