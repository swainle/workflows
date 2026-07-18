export default {
  command: "deployment", stageName: "部署",
  roles: ["DevOps 工程师", "SRE 工程师", "权限与安全架构师"],
  template: "deployment.prompt.md",
  artifacts: ["deployment/deployment.md", "deployment/*.md"],
  globals: ["docs/architecture/product.md", "docs/architecture/technology.md", "docs/architecture/c4.md", "docs/architecture/deployment.md", "docs/development/git-workflow.md", "package.json", "pnpm-workspace.yaml", "turbo.json"],
};
