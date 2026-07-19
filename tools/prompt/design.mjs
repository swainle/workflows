export default {
  command: "design",
  stageName: "完整项目设计",
  roles: [
    "产品经理与业务分析师",
    "各目标平台 UX 与前端架构师",
    "解决方案、权限与安全架构师",
    "API、数据与测试架构师",
  ],
  template: "design.prompt.md",
  artifacts: [
    "design/requirement.md", "design/process.md", "design/architecture.md",
    "design/authorization.fga", "design/openapi.json", "design/asyncapi.json",
    "design/schema.dbml", "design/design.token.json", "design/<platform>.design.token.json",
    "design/<platform>.md", "design/<platform>.ui.yaml", "design/verification.md",
    "design/development.compose.yml", "design/development.env",
    "design/test.compose.yml", "design/test.env",
    "design/production.compose.yml", "design/production.env",
  ],
  globals: [
    "docs/architecture", "docs/contracts", "docs/development",
    "packages/design-tokens/tokens", "docker", "package.json", "pnpm-workspace.yaml", "turbo.json",
  ],
  githubIssues: true,
  relatedStages: ["design"],
};
