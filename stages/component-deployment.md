# `[<组件> deploy]` 组件部署

## 职责

准备和验证当前组件的构建、部署配置及相关部署文档。

不负责业务逻辑、需求、组件规范或全局 CI/CD。

## 操作边界

### 允许读取

- `docs/**`
- `apps/<组件>/**`
- 当前部署环境信息、构建和 CI 输出

### 允许修改

```text
apps/<组件>/Dockerfile
apps/<组件>/deploy/**
docs/deployment/**
```

`docs/deployment/**` 只修改当前组件实际使用的部分。

### 禁止修改

```text
docs/requirements/**
docs/architecture/**
docs/development/**
docs/design-tokens/**
docs/component/**
docs/contracts/**
apps/<组件>/Dockerfile 和 apps/<组件>/deploy/** 之外的 apps/**
.github/workflows/**
```

### 越界处理

需要全局编排或 CI/CD 时切换 `[system deploy]`；需要业务代码时切换 `[<组件> dev]`。

## 文件作用

| 文件或路径 | 作用 | 可修改内容 |
|---|---|---|
| `apps/<组件>/Dockerfile` | 当前组件镜像构建 | 构建阶段、运行时和健康检查 |
| `apps/<组件>/deploy/**` | 当前组件部署资源 | 当前组件清单、脚本和配置模板 |
| `docs/deployment/deployment.md` | 部署方式 | 当前组件相关章节 |
| `docs/deployment/runbook.md` | 运维与恢复 | 当前组件相关章节 |

不得提交密钥、令牌、证书或真实凭据。

## 专家

按实际需要选择 DevOps、SRE 和安全专家，不生成独立专家报告。

## 执行步骤

1. 读取组件、部署规范、实际配置和目标环境信息。
2. 检查构建、环境变量、迁移、健康检查、备份、恢复和回滚中的适用项。
3. 默认只准备并验证部署。
4. 真实外部部署必须由用户明确指定环境并要求立即执行。
5. Production 部署、迁移、资源删除和回滚必须在执行前再次确认。

## 完成检查

- 实际修改只位于允许范围，部署文档变化只涉及当前组件。
- 没有修改业务逻辑、全局 CI/CD 或其他组件。
- 配置中没有真实凭据。
- 验证结果和是否实际部署已如实说明。
