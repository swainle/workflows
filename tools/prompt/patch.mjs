export const GLOBAL_PATHS = [
  "docs/architecture",
  "docs/contracts",
  "packages/design-tokens/tokens",
  "package.json",
  "pnpm-workspace.yaml",
  "turbo.json",
];

export default {
  command: "patch",
  stageName: "全局数据同步",
  roles: ["技术负责人", "软件架构师", "发布工程师"],
  module: "patch",
  directory: "patch",
  template: "patch.prompt.md",
  artifacts: ["completion.md"],
  globals: GLOBAL_PATHS,
};
