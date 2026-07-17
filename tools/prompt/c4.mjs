export default {
  command: "c4", stageName: "C4 架构",
  template: "c4.prompt.md",
  roles: [
    "系统架构师：确认系统边界、容器职责、依赖方向和外部系统关系。",
    "产品与领域专家：确认业务能力、领域责任和跨模块协作边界。",
    "后端专家：检查服务拆分、通信方式、数据所有权和实现可行性。",
    "SRE 与安全专家：检查部署边界、可靠性、信任边界和外部依赖风险。",
  ],
  globalPatch: "c4",
  globals: ["docs/architecture/product.md", "docs/architecture/process", "docs/architecture/c4.puml"],
};
