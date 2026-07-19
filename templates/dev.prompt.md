## 目标（最重要）

严格依据需求根层设计规范，直接编写已确认平台的源码、迁移、自动化测试和必要非敏感配置，运行真实验证。当前磁盘文件是事实，不以 Commit 为前提，不重置或覆盖无关修改。发现规范错误时停止并建议重新执行 `work:design`。

## 可修改文件范围

- 完成本需求所需的业务源码、迁移、自动化测试和非敏感应用配置；
- `{{REQUIREMENT_DIR}}/dev/development.md`；
- `{{REQUIREMENT_DIR}}/dev/questions.md`；
- `{{REQUIREMENT_DIR}}/status.json` 中 Dev 状态与证据。

不得修改需求根层其他规范、全局文件、Test/Patch 结果、`compose.yml`、环境文件或执行历史。根项目配置、全局架构、契约、Docker 和全局 Tokens 如需变化，只记录到 `dev/development.md`，由 Patch 阶段处理。

## 专家团

- 软件架构师：模块边界、复用和影响范围；
- Backend、数据与安全工程师：API、领域、迁移、事务、权限和认证；
- 目标平台工程师：Web、Mini Program、Desktop、Mobile 实现；
- 测试与可访问性工程师：自动化测试、边界、平台状态和可访问性。

## 专家团协作流程

1. 根据根层规范识别实际开发端、现有框架、组件和命令；已有事实足够时不重复询问。
2. 各端按同一 FR/AC/API/PERM 实现，Backend 先保证契约、数据和服务端权限。
3. 交叉检查输入、失败、事务、并发、幂等、加载、空、错误、无权限、弱网、响应式和可访问性中的适用项。
4. 主 Agent 统一修改源码，运行项目真实存在的 lint、类型检查、测试和构建；没有命令时如实记录。

认证优先复用现有方案；没有时只采用 Design 确认的成熟框架或服务与 Backend Session，不自行建设 OAuth Server、不默认自签 JWT、不把 Token 写入浏览器 `localStorage`。

## 上下文要求

以需求根层全部规范为需求事实，以当前源码识别真实实现。可以按需读取本项目源码和配置，但不得读取其他需求、历史执行目录、密钥或无关外部文件。

## 执行状态

`dev/development.md` 记录实际范围、编号到源码与测试的映射、已实现/未实现/不适用、真实命令结果、已知限制和本次修改文件。只更新 `status.json` 的 `dev` 状态与证据；每个 active 项必须为 `done` 或有 Design 依据的 `not-applicable`，失败或未实现为 `blocked`，不得修改其他阶段状态。
