import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "api", stageId: "04-api", stageName: "API 契约",
  template: "api.prompt.md",
  globalPatch: "04-api.git.patch",
  globals: ["docs/architecture/product.md", "docs/architecture/c4.puml", "docs/contracts/openapi.json", "docs/contracts/asyncapi.json"],
  maxRequirementPrefix: 4,
});
