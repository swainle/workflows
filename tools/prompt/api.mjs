export default {
  command: "api", stageName: "API 契约",
  roles: ["API 架构师", "后端架构师", "权限与安全架构师"],
  template: "api.prompt.md",
  artifacts: ["api/openapi.json", "api/asyncapi.json", "api/*.md"],
  globals: ["docs/architecture/product.md", "docs/architecture/technology.md", "docs/architecture/c4.md", "docs/contracts/openapi.json", "docs/contracts/asyncapi.json"],
};
