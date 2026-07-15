import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "prd", stageId: "01-prd", stageName: "PRD 整理",
  targetKind: "prd", template: "prd.prompt.md",
  globals: ["docs/architecture/product.md"], maxRequirementPrefix: 1,
});
