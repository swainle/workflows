export default {
  command: "database", stageName: "数据库设计",
  template: "database.prompt.md",
  globals: ["docs/architecture/product.md", "docs/architecture/c4.puml", "docs/contracts/openapi.json", "docs/contracts/schema.dbml"],
};
