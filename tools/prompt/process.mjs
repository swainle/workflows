import { runPromptStage } from "../core/prompt-stage.mjs";
await runPromptStage({
  command: "process", stageId: "02-process", stageName: "业务流程",
  template: "process.prompt.md",
  roles: [
    "产品经理：确认用户目标、业务范围、规则、优先级和验收标准。",
    "前端专家：确认用户操作、页面状态、反馈、异常提示和可恢复路径。",
    "架构师：确认系统边界、参与者、上下游协作、关键约束和全局流程影响。",
    "后端专家：确认状态变化、校验、幂等、并发、失败处理和数据一致性。",
  ],
  globalPatch: "02-process.git.patch",
  globals: ["docs/architecture/product.md", "docs/architecture/process", "docs/architecture/c4.puml"],
  maxRequirementPrefix: 2,
});
