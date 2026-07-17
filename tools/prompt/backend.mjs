export default {
  command: "backend", stageName: "后端编码提示词",
  template: "backend.prompt.md",
  roles: [
    "系统架构师：确认服务边界、依赖方向、可靠性和全局架构影响。",
    "后端专家：完成最小实现并检查校验、事务、并发和错误处理。",
    "数据库专家：检查查询、迁移、数据一致性和性能风险。",
    "测试与运维专家：检查可测试性、日志、指标、故障恢复和运行风险。",
  ],
  globals: ["docs/architecture/product.md", "docs/architecture/c4.puml", "docs/architecture/process", "docs/contracts/openapi.json", "docs/contracts/asyncapi.json", "docs/contracts/schema.dbml"],
};
