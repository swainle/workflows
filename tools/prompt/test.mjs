export default {
  command: "test", stageName: "测试",
  roles: ["测试架构师", "业务验收专家", "API、权限与数据测试专家", "目标平台与性能测试专家"],
  template: "test.prompt.md",
  artifacts: ["test/report.md", "test/*.feature", "status.json"],
  globals: ["docs/architecture/requirement.md", "docs/architecture/technology.md", "docs/architecture/process", "docs/architecture/architecture.md", "docs/architecture/backend.ddd.md", "docs/contracts/openapi.json", "docs/contracts/asyncapi.json", "docs/contracts/schema.dbml", "docs/contracts/authorization.fga", "docs/development/git-workflow.md"],
};
