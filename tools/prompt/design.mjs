export default {
  command: "design", stageName: "产品与跨平台体验设计",
  template: "design.prompt.md",
  roles: [
    "产品设计师：把业务目标转换为用户任务、信息结构和完整交互路径。",
    "平台体验专家：检查不同平台的导航、系统能力、交互习惯和限制。",
    "无障碍与内容设计专家：检查文案、反馈、可访问性和国际化边界。",
    "前后端专家：检查设计是否能被现有契约、权限和技术边界可靠实现。",
  ],
  globals: ["docs/architecture/product.md", "docs/architecture/process", "docs/contracts/openapi.json", "docs/contracts/authorization.fga", "packages/design-tokens/tokens"],
};
