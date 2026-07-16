import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "process", stageId: "02-process", stageName: "业务流程",
  template: "process.prompt.md",
  globalPatch: "02-process.git.patch",
  globals: ["docs/architecture/product.md", "docs/architecture/process", "docs/architecture/c4.puml"],
  maxRequirementPrefix: 2,
});
