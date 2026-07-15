import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "issues", stageId: "00-issues", stageName: "GitHub Issues 整理",
  targetKind: "requirement-directory", template: "issues.prompt.md",
  globals: ["docs/architecture/product.md"], maxRequirementPrefix: 1, githubIssues: true,
});
