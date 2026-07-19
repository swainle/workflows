import { REQUIREMENT_SPEC_ARTIFACTS } from "../core/specs.mjs";

export default {
  command: "design",
  stageName: "需求与系统设计",
  roles: [
    "产品经理与业务分析师：确认目标、范围、规则、流程和验收",
    "平台 UX 与前端架构师：设计目标平台页面、状态和交互",
    "解决方案、权限与安全架构师：设计架构、认证、授权和部署",
    "API、领域、数据与测试架构师：设计契约、DDD、数据和测试用例",
  ],
  template: "design.prompt.md",
  artifacts: REQUIREMENT_SPEC_ARTIFACTS,
  globals: [
    "docs/architecture", "docs/contracts", "docs/development",
    "packages/design-tokens/tokens", "docker", "package.json", "pnpm-workspace.yaml", "turbo.json",
  ],
  githubIssues: true,
  relatedStages: ["design"],
};
