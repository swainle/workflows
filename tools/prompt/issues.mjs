export default {
  command: "issues", stageName: "GitHub Issues 整理",
  roles: ["互联网产品经理", "业务分析师", "测试工程师"],
  template: "issues.prompt.md",
  artifacts: ["issue/issue.md", "issue/*.md"],
  globals: [
    "docs/architecture/product.md", "docs/architecture/technology.md", "docs/architecture/c4.md", "docs/architecture/process", "docs/architecture/deployment.md",
    "docs/development/git-workflow.md",
    "docs/contracts/openapi.json", "docs/contracts/asyncapi.json", "docs/contracts/schema.dbml", "docs/contracts/authorization.fga",
    "packages/design-tokens/tokens",
  ],
  githubIssues: true,
};
