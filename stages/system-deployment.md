# `[system deploy]` 全局部署

## 职责

维护全局环境、编排、CI/CD、发布、运维和回滚规范。

不负责业务需求、架构技术选型、组件规范、契约或业务源码。

## 操作边界

### 允许读取

- `docs/**`
- `apps/**`
- `.github/workflows/**`
- 目标环境信息、构建和 CI 输出

### 允许修改

```text
docs/deployment/deployment.md
docs/deployment/runbook.md
docs/deployment/compose.yml
docs/deployment/dev.env
docs/deployment/test.env
docs/deployment/prod.env
.github/workflows/**
```

### 禁止修改

```text
docs/requirements/**
docs/architecture/**
docs/development/**
docs/design-tokens/**
docs/component/**
docs/contracts/**
apps/**
```

### 越界处理

组件专用部署切换 `[<组件> deploy]`；源码缺陷切换 `[<组件> dev]`；架构或技术栈变化切换 `[system]`。

## 文件作用

| 文件 | 作用 | 创建条件 | 可修改内容 |
|---|---|---|---|
| `deployment.md` | 开发、测试和生产环境部署方式 | 始终 | 环境、发布和部署流程 |
| `runbook.md` | 运维、故障处理、恢复和回滚 | 存在运行环境 | 可执行运维步骤 |
| `compose.yml` | 服务编排 | 使用 Compose | 服务、网络、卷和健康检查 |
| `dev.env` | 开发环境变量模板 | 存在开发环境变量 | 变量名和安全占位符 |
| `test.env` | 测试环境变量模板 | 存在测试环境变量 | 变量名和安全占位符 |
| `prod.env` | 生产环境变量模板 | 存在生产环境变量 | 变量名和安全占位符 |
| `.github/workflows/*` | CI/CD 自动化 | 使用 GitHub Actions | 构建、测试、发布和部署工作流 |

环境文件不得包含真实密钥、令牌、证书、密码或生产凭据。

## 专家

按实际需要选择 DevOps、SRE 和安全专家，不生成独立专家报告。

## 执行步骤

1. 读取全局部署规范、组件部署方式、实际配置和目标环境信息。
2. 检查构建、测试、制品、变量、迁移、健康检查、备份、恢复和回滚。
3. 默认只准备并验证部署。
4. 真实外部部署必须由用户明确指定环境并要求立即执行。
5. Production 部署、迁移、资源删除和回滚必须在执行前再次确认。

## 完成检查

- 实际修改只位于明确列出的部署文件。
- 没有修改业务源码、需求、组件规范或契约。
- 环境文件没有真实凭据。
- YAML、Compose 和工作流语法已验证。
- 是否实际执行外部部署已如实说明。
