import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "frontend", stageId: "03-frontend", stageName: "前端设计与实现",
  targetKind: "prd", template: "frontend.prompt.md",
  globals: ["docs/architecture/product.md", "docs/architecture/process.puml", "docs/architecture/c4.puml", "packages/design-tokens/tokens"],
  maxRequirementPrefix: 3,
});
