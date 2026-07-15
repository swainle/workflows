# AI Project Workflows v0.1.0

把需求、架构、接口、数据库、权限、测试和部署交给 AI 分阶段分析，同时保留人工检查和 Git 历史。

## 安装

```bash
git submodule add -b latest <仓库地址> docs/workflows
python docs/workflows/install.py
```

安装器会：

- 自动切换并快进更新 workflows 的 `latest` 分支；
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
pnpm docs:workflows:req REQ-036-booking-fixture
pnpm docs:workflows:prompt:issues docs/requirements/REQ-036-booking-fixture
```

Prompt 会要求 AI直接生成 `.git.patch` 和简单的 `.git.patch.md`。人工检查并应用 Git Patch 后，再进入下一阶段。

```bash
pnpm docs:workflows:prompt:prd docs/requirements/REQ-036-booking-fixture/01-prd.md
pnpm docs:workflows:prompt:process docs/requirements/REQ-036-booking-fixture/01-prd.md
pnpm docs:workflows:prompt:frontend docs/requirements/REQ-036-booking-fixture/01-prd.md
pnpm docs:workflows:prompt:api docs/requirements/REQ-036-booking-fixture/01-prd.md
pnpm docs:workflows:prompt:database docs/requirements/REQ-036-booking-fixture/01-prd.md
pnpm docs:workflows:prompt:backend docs/requirements/REQ-036-booking-fixture/01-prd.md
pnpm docs:workflows:prompt:permission docs/requirements/REQ-036-booking-fixture/01-prd.md
pnpm docs:workflows:prompt:test docs/requirements/REQ-036-booking-fixture/01-prd.md
pnpm docs:workflows:prompt:deployment docs/requirements/REQ-036-booking-fixture/01-prd.md
```

已有当前阶段产物会再次完整交给 AI。例如人工修改过 `04-openapi.patch.json` 后，再运行 API Prompt，AI 会基于它继续优化。

## 合并到全局文件

```bash
pnpm docs:workflows:patch:process docs/requirements/REQ-036-booking-fixture/02-process.patch.puml
pnpm docs:workflows:patch:frontend docs/requirements/REQ-036-booking-fixture/03-design-tokens.patch.json
pnpm docs:workflows:patch:api docs/requirements/REQ-036-booking-fixture/04-openapi.patch.json
pnpm docs:workflows:patch:api docs/requirements/REQ-036-booking-fixture/04-asyncapi.patch.json
pnpm docs:workflows:patch:database docs/requirements/REQ-036-booking-fixture/05-schema.patch.dbml
pnpm docs:workflows:patch:backend docs/requirements/REQ-036-booking-fixture/06-c4.patch.puml
pnpm docs:workflows:patch:permission docs/requirements/REQ-036-booking-fixture/07-authorization.patch.fga
pnpm docs:workflows:patch:deployment docs/requirements/REQ-036-booking-fixture/09-deployment.patch.md
```

人工执行合并命令就代表接受。脚本完成后会显示 Git diff。

## 规则

- 全局文件表示项目当前事实。
- 需求差异文件表示一个需求改变了什么。
- `change/` 保存 Prompt 和 AI 工作记录。
- 待确认的 Issue 本次不动，留到下次需求流程。
- 不记录 `base_commit`，不提供 `save` 和 `review` 命令。
