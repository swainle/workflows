export default {
  command: "backend", stageName: "后端编码提示词",
  roles: ["后端架构师", "权限与安全架构师", "测试工程师"],
  template: "backend.prompt.md",
  artifacts: ["backend/backend.prompt.md", "backend/*.md"],
  globals: ["docs/architecture/product.md", "docs/architecture/c4.md", "docs/architecture/process", "docs/contracts/openapi.json", "docs/contracts/asyncapi.json", "docs/contracts/schema.dbml"],
};
