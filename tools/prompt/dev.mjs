export default {
  command: "dev",
  stageName: "多端开发",
  roles: [
    "软件架构师",
    "后端与数据工程师",
    "目标平台开发专家",
    "安全与测试工程师",
  ],
  template: "dev.prompt.md",
  artifacts: ["dev/development.md", "dev/questions.md", "status.json"],
  globals: [
    "docs/architecture", "docs/contracts", "docs/development",
    "packages/design-tokens/tokens", "package.json", "pnpm-workspace.yaml", "turbo.json",
  ],
  relatedStages: ["design", "dev"],
  directSourceChanges: true,
};
