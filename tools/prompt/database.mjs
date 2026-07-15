import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "database", stageId: "05-database", stageName: "数据库设计",
  targetKind: "prd", template: "database.prompt.md",
  globals: ["docs/architecture/product.md", "docs/architecture/c4.puml", "docs/contracts/openapi.json", "docs/contracts/schema.dbml"],
  maxRequirementPrefix: 5,
});
