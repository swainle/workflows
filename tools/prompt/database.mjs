export default {
  command: "database", stageName: "数据库设计",
  roles: ["数据库架构师", "后端架构师", "数据工程师"],
  template: "database.prompt.md",
  artifacts: ["database/schema.dbml", "database/*.md"],
  globals: ["docs/architecture/product.md", "docs/architecture/c4.md", "docs/contracts/openapi.json", "docs/contracts/schema.dbml"],
};
