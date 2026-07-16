import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "api", stageId: "03-api", stageName: "API 契约",
  template: "api.prompt.md",
  roles: [
    "API 架构师：定义稳定、一致且可演进的接口与事件契约。",
    "后端专家：检查业务能力、事务边界、错误处理和实现可行性。",
    "前端专家：检查调用方式、交互所需数据和客户端错误处理。",
    "安全专家：检查身份、授权、输入边界和敏感数据暴露。",
  ],
  globalPatch: "03-api.git.patch",
  globals: ["docs/architecture/product.md", "docs/architecture/c4.puml", "docs/contracts/openapi.json", "docs/contracts/asyncapi.json"],
  maxRequirementPrefix: 3,
});
