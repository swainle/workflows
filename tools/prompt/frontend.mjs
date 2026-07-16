import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "frontend", stageId: "03-frontend", stageName: "前端设计与实现",
  template: "frontend.prompt.md",
  globalPatch: "03-frontend.git.patch",
  globals: ["docs/architecture/product.md", "docs/architecture/process", "docs/architecture/c4.puml", "packages/design-tokens/tokens"],
  maxRequirementPrefix: 3,
});
