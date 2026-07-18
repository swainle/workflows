export default {
  command: "design", stageName: "产品与跨平台体验设计",
  roles: ["产品设计师", "用户体验设计师", "前端架构师"],
  template: "design.prompt.md",
  artifacts: ["design/design.md", "design/<platform>.md", "design/mock.json", "design/*.json"],
  globals: ["docs/architecture/product.md", "docs/architecture/technology.md", "docs/architecture/process", "docs/contracts/openapi.json", "docs/contracts/authorization.fga", "packages/design-tokens/tokens"],
};
