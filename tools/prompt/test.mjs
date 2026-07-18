export default {
  command: "test", stageName: "测试",
  template: "test.prompt.md",
  artifacts: ["test/*.feature", "test/*.md"],
  globals: ["docs/architecture/product.md", "docs/architecture/process", "docs/architecture/c4.md", "docs/contracts/openapi.json", "docs/contracts/asyncapi.json", "docs/contracts/schema.dbml", "docs/contracts/authorization.fga"],
};
