export default {
  command: "issues", stageName: "GitHub Issues 整理",
  template: "issues.prompt.md",
  globals: ["docs/architecture/product.md"],
  githubIssues: true,
};
