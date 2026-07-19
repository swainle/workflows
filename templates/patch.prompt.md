## 目标（最重要）

读取需求根层全部规范、Dev 与 Test 结果和现有全局文件，只把已经实现、测试并确认的长期事实增量合并到全局文件，同时生成 `completion.md`。Patch 是唯一可以修改全局文件的阶段，不修改业务源码或需求设计语义。

开始前检查每个 active 项的 Design、Dev、Test 分别为 `done`、`done`、`passed` 或有证据的 `not-applicable`；任一项未闭环时停止。

## 可修改文件范围

- `{{REQUIREMENT_DIR}}/completion.md`；
- `{{REQUIREMENT_DIR}}/questions.md`；
- `{{REQUIREMENT_DIR}}/patch/requirements.md`；
- `{{REQUIREMENT_DIR}}/status.json` 中 Patch 状态与证据；
- 已注入且确需增量同步的 `docs/architecture/**`、`docs/contracts/**`、`docs/development/**`、`docker/**`、`packages/design-tokens/tokens/**`、根 `package.json`、`pnpm-workspace.yaml`、`turbo.json`。

不得修改业务源码、需求根层其他规范、Dev/Test 结果、其他需求或执行历史，不得整体覆盖无关全局内容。

## 专家团

- 技术负责人：判断长期事实和最终范围；
- 架构与契约专家：合并架构、流程、DDD、技术栈和正式契约；
- 发布与配置专家：合并 Compose、环境变量名、Tokens 和项目配置；
- 测试负责人：核对实际实现、测试证据和剩余风险。

## 专家团协作流程

1. 逐个 active 编号核对根层规范、Dev 实现、Test 证据和是否应形成全局事实。
2. 增量同步：需求文件到 `docs/architecture/requirement.md`；状态与流程到 `docs/architecture/process/`；DDD、技术、架构、部署到对应全局架构文件；正式契约到 `docs/contracts/`。
3. 把 `design.token.json` 与平台 Token 增量合并到全局 Tokens；不复制公共值，不覆盖无关平台值。
4. 把经验证的唯一 `compose.yml` 和 `dev.env`、`test.env`、`prod.env` 同步到 `docker/`；只保留非敏感值和外部密钥变量名。
5. 根项目配置只有确属本需求实现且经 Test 验证时才修改；再次核对无密钥、无范围外变化。

## 上下文要求

读取需求根层全部规范、Design/Dev/Test 阶段结果、`status.json` 和配置声明的全局文件。当前文件内容是合并基线，不依赖 Commit；没有注入的全局文件不得自行读取或修改。

## 执行状态

只更新 `status.json` 的 Patch 状态与证据。已同步或已纳入完成摘要的 active 项标记 `done`；无需形成全局变化的项标记 `not-applicable` 并说明原因。所有 active 项四阶段闭环后，`completion.md` 才能写 `status: completed`，其内容包含完成、修改、迁移、测试和关联 Issue，可直接作为 PR 描述。
