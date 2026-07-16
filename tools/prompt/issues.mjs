import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "issues", stageId: "00-issues", stageName: "GitHub Issues 整理",
  template: "issues.prompt.md",
  globalPatch: "01-product.git.patch",
  globals: ["docs/architecture/product.md"], maxRequirementPrefix: 1, githubIssues: true,
});
