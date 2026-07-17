export default {
  command: "issues", stageId: "00-issues", stageName: "GitHub Issues 整理",
  template: "issues.prompt.md",
  roles: [
    "专业产品经理：确认用户目标、业务价值、范围和优先级。",
    "业务分析师：梳理规则、场景、异常、约束和 Issue 关系。",
    "用户体验研究员：检查目标用户、使用情境和真实痛点。",
    "测试专家：检查验收标准是否明确、完整且可验证。",
  ],
  globalPatch: "01-product.git.patch",
  globals: ["docs/architecture/product.md"], maxRequirementPrefix: 1, githubIssues: true,
};
