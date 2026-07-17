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
  module: "patch",
  directory: "patch",
  template: "patch.prompt.md",
  artifacts: [],
  globals: GLOBAL_PATHS,
};
