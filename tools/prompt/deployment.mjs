export default {
  command: "deployment", stageName: "部署",
  template: "deployment.prompt.md",
  globals: ["docs/architecture/product.md", "docs/architecture/c4.puml", "docs/architecture/deployment.md", "package.json", "pnpm-workspace.yaml", "turbo.json"],
};
