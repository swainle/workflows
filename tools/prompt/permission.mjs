export default {
  command: "permission", stageName: "权限设计",
  roles: ["权限与安全架构师", "后端架构师", "测试工程师"],
  template: "permission.prompt.md",
  artifacts: ["permission/authorization.fga", "permission/*.md"],
  globals: ["docs/architecture/product.md", "docs/architecture/technology.md", "docs/contracts/authorization.fga", "docs/contracts/openapi.json", "docs/architecture/process"],
};
