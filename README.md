# AI 项目工作流

通过 `AGENTS.md` 将 AI 开发任务拆分为需求、系统、组件、开发、测试、验收和部署阶段，并为每个阶段设置独立的文件权限与完成检查。

## 核心能力

- 尖括号指令负责阶段路由，避免不同阶段混合修改。
- 权限表先以 `**` 默认拒绝，再对当前阶段开放明确的 CRUD 范围。
- 阶段按“需求 → system → 组件设计 → dev → 组件 test → 全局 test → deploy”串行协作。
- 提示词规则使用稳定编号，例如 `AI-001`、`AI-SYSTEM-001` 和 `AI-TEST-001`。
- 执行受管理指令前，Agent 会先列出本次实际命中的规则编号。
- 默认使用中文回复、编写文档和测试描述；代码标识符沿用项目约定。
- 安装时保留宿主项目 `AGENTS.md` 托管区块之外的既有规则。

## 安装

将仓库作为子模块挂载到宿主项目：

```bash
git submodule add -b develop <repository-url> docs/workflows
node docs/workflows/install.mjs
```

固定版本时可以使用 Tag；切换并更新指定分支时使用：

```bash
node docs/workflows/install.mjs --branch develop
```

安装器会更新工作流子模块，并将 `templates/AGENTS.template.md` 同步到宿主项目根 `AGENTS.md` 的托管区块。
子模块处于 detached HEAD 时，必须通过 `--branch` 指定分支。

## 指令

| 指令 | 用途 |
|---|---|
| `<12> <任务>` | 根据 GitHub Issue `#12` 整理需求 |
| `<system> <任务>` | 维护跨组件系统规范 |
| `<web> <任务>` | 维护已登记组件的设计规范 |
| `<web> frontend <任务>` | 启用 Frontend 完整设计模式 |
| `<api> backend <任务>` | 按复杂度启用轻量 Backend 或完整 DDD 设计 |
| `<api> opt component.md <意见>` | 按通用组件设计顺序优化一个现有设计文件 |
| `<web dev> <任务>` | 开发目标组件 |
| `<web test> <任务>` | 编写并执行目标组件测试 |
| `<test> <任务>` | 实现并执行跨组件验收测试 |
| `<deploy> <任务>` | 维护构建、编排、CI/CD 和部署 |
| `<api deploy> <任务>` | 维护目标组件的开发基础设施配置 |
| `<deploy update> <任务>` | 生成正式系统升级方案 |
| `<web> frontend opt <文件> <意见>` | 按 Frontend 模板前置依赖优化一个现有设计文件 |
| `<api> backend opt <文件> <意见>` | 按 Backend 模板前置依赖优化一个现有设计文件 |

组件名必须已登记在宿主项目的 `docs/system/c2.md`。Frontend 与 Backend 模式只增强组件设计阶段，不是独立阶段。

Backend 模式完整读取 `templates/backend-design.template.md`。其中固定标题和顺序必须保留；图、表、目录、技术、依赖和业务名称均为示例，必须根据当前组件的实际情况调整。
Backend 设计按“分析 → 结构 → 专项 → 模型 → 工程 → 交付”六个阶段执行；后台任务与异步任务分别由工程阶段的 `background.md` 和 `worker.md` 按需维护。

## 执行回显

Agent 完成指令解析并加载必读提示词后，会在执行实质操作前输出：

```text
命中规则：AI-001、AI-005、AI-006、AI-011、AI-TEST-001
```

只列出当前指令实际匹配的根提示词、阶段提示词和模式提示词规则；普通自然语言任务不强制回显。

## 结尾控制

以下控制只对本工作流已识别的尖括号指令生效：

| 结尾 | 行为 |
|---|---|
| `?` 或 `？` | 只回答，不修改文件 |
| `!` 或 `！` | 修改并验证，提交并推送 |
| `,` 或 `，` | 暂不修改，每次澄清一个关键问题 |
| `.` 或 `。` | 修改并验证，不自动提交或推送 |

没有以上结尾时，按宿主项目和当前任务规则处理。Production 部署、迁移、删除、回滚和恢复仍需单独确认。

## 目录

| 路径 | 作用 |
|---|---|
| `templates/AGENTS.template.md` | 全局入口、指令解析和阶段路由 |
| `templates/backend-design.template.md` | Backend 模式设计规则与文档结构 |
| `stages/*.md` | 各阶段职责、权限、格式和完成检查 |
| `install.mjs` | 更新并安装工作流规则 |
| `validate.mjs` | 校验提示词编号、5W 结构和组件完整文件树，并执行安装器与提示词结构测试 |

详细规则以模板和对应阶段提示词为准，README 不重复维护阶段实现细节。

## 验证

需要 Git 和支持内置测试运行器的 Node.js：

```bash
node validate.mjs
```

校验宿主项目某个组件的文件树是否遗漏实际受版本控制文件：

```bash
node docs/workflows/validate.mjs --component-doc <组件设计目录>/component.md --app-dir <组件应用目录>
```

需要设计树与当前文件完全一致时增加 `--strict`；设计阶段允许树中包含尚未实现的规划文件，因此默认只检查遗漏和重复。

## 许可证

[MIT](LICENSE)
