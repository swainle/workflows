export default {
  command: "design", stageName: "产品与跨平台体验设计",
  template: "design.prompt.md",
  artifacts: ["design/design.md", "design/<platform>.md", "design/*.json"],
  globals: ["docs/architecture/product.md", "docs/architecture/process", "docs/contracts/openapi.json", "docs/contracts/authorization.fga", "packages/design-tokens/tokens"],
};
