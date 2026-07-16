import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "test", stageId: "08-test", stageName: "测试",
  template: "test.prompt.md",
  globals: ["docs/architecture/product.md", "docs/architecture/process", "docs/contracts/openapi.json", "docs/contracts/asyncapi.json", "docs/contracts/schema.dbml", "docs/contracts/authorization.fga"],
  maxRequirementPrefix: 8,
});
