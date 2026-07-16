import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "deployment", stageId: "09-deployment", stageName: "部署",
  template: "deployment.prompt.md",
  globalPatch: "09-deployment.git.patch",
  globals: ["docs/architecture/product.md", "docs/architecture/c4.puml", "docs/architecture/deployment.md", "package.json", "pnpm-workspace.yaml", "turbo.json"],
  maxRequirementPrefix: 9,
});
