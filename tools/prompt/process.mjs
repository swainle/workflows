import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "process", stageId: "02-process", stageName: "业务流程",
  targetKind: "prd", template: "process.prompt.md",
  globals: ["docs/architecture/product.md", "docs/architecture/process.puml", "docs/architecture/c4.puml"],
  maxRequirementPrefix: 2,
});
