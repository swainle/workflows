export default {
  command: "api", stageName: "API 契约",
  template: "api.prompt.md",
  globals: ["docs/architecture/product.md", "docs/architecture/c4.puml", "docs/contracts/openapi.json", "docs/contracts/asyncapi.json"],
};
