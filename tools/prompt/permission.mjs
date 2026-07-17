export default {
  command: "permission", stageName: "权限设计与实现",
  template: "permission.prompt.md",
  artifacts: ["permission/authorization.fga", "permission/permission.prompt.md", "permission/*.md"],
  globals: ["docs/architecture/product.md", "docs/contracts/authorization.fga", "docs/contracts/openapi.json", "docs/architecture/process"],
};
