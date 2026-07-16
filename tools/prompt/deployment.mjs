import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "deployment", stageId: "10-deployment", stageName: "部署",
  template: "deployment.prompt.md",
  roles: [
    "SRE 与 DevOps 专家：检查构建、发布、监控、容量和回滚。",
    "后端专家：检查服务配置、依赖、迁移顺序和健康检查。",
    "数据库专家：检查数据迁移、备份、恢复和兼容窗口。",
    "安全与测试专家：检查密钥边界、供应链风险和发布验证。",
  ],
  globalPatch: "10-deployment.git.patch",
  globals: ["docs/architecture/product.md", "docs/architecture/c4.puml", "docs/architecture/deployment.md", "package.json", "pnpm-workspace.yaml", "turbo.json"],
  maxRequirementPrefix: 10,
});
