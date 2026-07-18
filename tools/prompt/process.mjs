export default {
  command: "process", stageName: "业务流程",
  roles: ["业务分析师", "领域专家", "软件架构师"],
  template: "process.prompt.md",
  artifacts: ["process/process.md", "process/<topic>.md"],
  globals: ["docs/architecture/product.md", "docs/architecture/technology.md", "docs/architecture/process", "docs/architecture/c4.md"],
};
