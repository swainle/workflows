# AI Project Workflows v0.1.0

把需求、架构、接口、数据库、权限、测试和部署交给 AI 分阶段分析，同时保留人工检查和 Git 历史。

## 安装

```bash
git submodule add -b main https://github.com/swainle/workflows.git docs/workflows
node docs/workflows/install.mjs
```

安装器会：

- 自动切换并快进更新指定分支，默认使用 `main`；
- 下载 PlantUML 到不纳入 Git 管理的 `packages/`；
- 把 `docs:workflows:*` 命令写入宿主项目 `package.json`；
- 创建缺失的全局示例文件；
- 不覆盖已有项目文档。

详细说明：

- [通用安装](install.md)
- [Web](web.md)
- [移动端](mobile.md)
- [小程序](mini-program.md)
- [桌面端](desktop.md)
- [Turborepo](turborepo.md)

## 开始一个需求

```bash
pnpm docs:workflows:req REQ-0036-booking-fixture
pnpm docs:workflows:prompt:issues docs/requirements/REQ-0036-booking-fixture
```

Prompt 文件名为 `{时间戳}_prompt.md`。同一个 Prompt 的 AI 结果依次保存为 `{时间戳}_prompt.01.git.patch`、`{时间戳}_prompt.01.git.patch.md`，再次尝试时序号递增且不得覆盖已有结果。人工检查并应用 Git Patch 后，再进入下一阶段。后续阶段按需求影响执行，`test` 建议保留，不涉及的阶段直接跳过。

所有 `docs:workflows:prompt:*` 命令只接收需求目录。脚本会自动定位 `01-prd.md`，并收集当前阶段需要的全局文档和已有需求产物。

```bash
pnpm docs:workflows:prompt:process docs/requirements/REQ-0036-booking-fixture
pnpm docs:workflows:prompt:frontend docs/requirements/REQ-0036-booking-fixture
pnpm docs:workflows:prompt:api docs/requirements/REQ-0036-booking-fixture
pnpm docs:workflows:prompt:database docs/requirements/REQ-0036-booking-fixture
pnpm docs:workflows:prompt:backend docs/requirements/REQ-0036-booking-fixture
pnpm docs:workflows:prompt:permission docs/requirements/REQ-0036-booking-fixture
pnpm docs:workflows:prompt:test docs/requirements/REQ-0036-booking-fixture
pnpm docs:workflows:prompt:deployment docs/requirements/REQ-0036-booking-fixture
```

已有当前阶段产物会再次完整交给 AI。例如人工修改过 `04-openapi.json` 后，再运行 API Prompt，AI 会基于它继续优化。

## 应用全局文件 Patch

AI 外层提案不仅可以修改需求产物和业务源码，还会按需创建阶段级全局 Patch，例如 `02-process.git.patch`。阶段级 Patch 只修改全局架构、契约或配置文件，人工单独检查并应用：

```bash
git apply --check docs/requirements/REQ-0036-booking-fixture/02-process.git.patch
git apply docs/requirements/REQ-0036-booking-fixture/02-process.git.patch
```

只有需求改变长期有效的产品目标、用户角色、产品范围或全局业务规则时，才会生成 `01-product.git.patch`。完整 PRD 不会合并到全局 `product.md`。没有全局变化的阶段不创建空 Patch。

全局流程按业务模块存放在 `docs/architecture/process/`。需求级流程文件使用 `02-process.puml` 或 `02-process-<topic>.puml`，对应的 `02-process.git.patch` 负责修改全局流程模块。

## 规则

- 全局文件表示项目当前事实。
- 需求目录名使用四位编号，例如 `REQ-0010-booking`。
- `NN-*` 需求文件表示一个阶段分析或实现了什么。
- `NN-*.git.patch` 表示一个阶段需要如何更新全局项目事实。
- `change/` 保存 Prompt 和 AI 工作记录。
- 待确认的 Issue 本次不动，留到下次需求流程。
- 不记录 `base_commit`，不提供 `save` 和 `review` 命令。
