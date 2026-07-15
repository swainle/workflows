import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "deployment", stageId: "09-deployment", stageName: "部署",
  targetKind: "prd", template: "deployment.prompt.md",
  globals: ["docs/architecture/product.md", "docs/architecture/c4.puml", "docs/operations/deployment.md", "package.json", "pnpm-workspace.yaml", "turbo.json"],
  maxRequirementPrefix: 9,
});
