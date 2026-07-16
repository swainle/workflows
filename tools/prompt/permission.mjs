import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "permission", stageId: "07-permission", stageName: "权限设计与实现",
  template: "permission.prompt.md",
  globalPatch: "07-permission.git.patch",
  globals: ["docs/architecture/product.md", "docs/contracts/authorization.fga", "docs/contracts/openapi.json", "docs/architecture/process"],
  maxRequirementPrefix: 7,
});
