export default {
  roles: ["前端架构师", "产品设计师", "测试工程师"],
  template: "frontend.prompt.md",
  artifacts: ["frontend/{{PLATFORM}}/frontend.prompt.md", "frontend/{{PLATFORM}}/design-tokens.json", "frontend/{{PLATFORM}}/*.md"],
  globals: ["docs/architecture/product.md", "docs/architecture/technology.md", "docs/architecture/process", "docs/architecture/c4.md", "docs/contracts/openapi.json", "docs/contracts/asyncapi.json", "docs/contracts/authorization.fga", "packages/design-tokens/tokens", "docs/development/git-workflow.md"],
};
