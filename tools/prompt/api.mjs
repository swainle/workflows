export default {
  command: "api", stageName: "API 契约",
  template: "api.prompt.md",
  artifacts: ["api/openapi.json", "api/asyncapi.json", "api/*.md"],
  globals: ["docs/architecture/product.md", "docs/architecture/c4.md", "docs/contracts/openapi.json", "docs/contracts/asyncapi.json"],
};
