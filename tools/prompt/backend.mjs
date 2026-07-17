export default {
  command: "backend", stageName: "后端编码提示词",
  template: "backend.prompt.md",
  artifacts: ["backend/backend.prompt.md", "backend/*.md"],
  globals: ["docs/architecture/product.md", "docs/architecture/c4.puml", "docs/architecture/process", "docs/contracts/openapi.json", "docs/contracts/asyncapi.json", "docs/contracts/schema.dbml"],
};
