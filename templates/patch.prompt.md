# 阶段目标

需求的选定阶段已经全部完成。对照全部需求产物和下面提供的当前全局文件，只同步长期有效且已经确认的项目事实。

输出一个中间 Git Patch。不得修改业务源码、需求目录、其他需求、工作流工具或未在输入上下文中出现的全局文件。没有需要同步的全局变化时按通用规则输出 `no-changes`。

# 允许修改

- `docs/architecture/**`
- `docs/contracts/**`
- `packages/design-tokens/tokens/**`
- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
