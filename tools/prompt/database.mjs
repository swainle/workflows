export default {
  command: "database", stageName: "数据库设计",
  template: "database.prompt.md",
  roles: [
    "数据架构师：定义实体、关系、约束和数据生命周期。",
    "数据库专家：检查索引、性能、并发、迁移和回滚。",
    "后端专家：检查数据模型与业务状态、接口和事务的一致性。",
    "安全专家：检查敏感数据、最小存储、审计和访问边界。",
  ],
  globalPatch: "database",
  globals: ["docs/architecture/product.md", "docs/architecture/c4.puml", "docs/contracts/openapi.json", "docs/contracts/schema.dbml"],
};
