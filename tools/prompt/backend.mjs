import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "backend", stageId: "06-backend", stageName: "后端设计与实现",
  targetKind: "prd", template: "backend.prompt.md",
  globalPatch: "06-backend.git.patch",
  globals: ["docs/architecture/product.md", "docs/architecture/c4.puml", "docs/architecture/process", "docs/contracts/openapi.json", "docs/contracts/asyncapi.json", "docs/contracts/schema.dbml"],
  maxRequirementPrefix: 6,
});
