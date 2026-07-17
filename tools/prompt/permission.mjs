export default {
  command: "permission", stageName: "权限设计",
  template: "permission.prompt.md",
  artifacts: ["permission/authorization.fga", "permission/*.md"],
  globals: ["docs/architecture/product.md", "docs/contracts/authorization.fga", "docs/contracts/openapi.json", "docs/architecture/process"],
};
