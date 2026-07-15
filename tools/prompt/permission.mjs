import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "permission", stageId: "07-permission", stageName: "权限设计与实现",
  targetKind: "prd", template: "permission.prompt.md",
  globals: ["docs/architecture/product.md", "docs/contracts/authorization.fga", "docs/contracts/openapi.json", "docs/architecture/process.puml"],
  maxRequirementPrefix: 7,
});
