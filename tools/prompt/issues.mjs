export default {
  command: "issues", stageName: "GitHub Issues 整理",
  template: "issues.prompt.md",
  artifacts: ["issue/issue.md", "issue/*.md"],
  globals: [
    "docs/architecture/product.md", "docs/architecture/c4.md", "docs/architecture/process", "docs/architecture/deployment.md",
    "docs/contracts/openapi.json", "docs/contracts/asyncapi.json", "docs/contracts/schema.dbml", "docs/contracts/authorization.fga",
    "packages/design-tokens/tokens",
  ],
  githubIssues: true,
};
