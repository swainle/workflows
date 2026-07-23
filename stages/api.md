# `[api]` API 规范

## 职责

确认 API 组件边界、领域模型、同步接口、异步事件、数据结构和授权关系。

不负责需求分析、全局技术选型、源码实现、测试实现或部署。

## 操作边界

### 允许读取

- `docs/**`
- `apps/api/**`
- API 测试和 CI 输出

### 允许修改

```text
docs/component/api/**
docs/contracts/**
```

### 禁止修改

```text
docs/requirements/**
docs/architecture/**
docs/development/**
docs/design-tokens/**
docs/deployment/**
docs/component/<非api组件>/**
apps/**
.github/workflows/**
```

### 越界处理

需要技术选型时切换 `[system]`；需要实现时切换 `[api dev]`；需要测试实现时切换 `[api test]`。

## 专家

按实际需要选择领域、API、数据、安全和测试专家，不生成独立专家报告。

## 文件作用

| 文件 | 作用 | 创建条件 | 可修改内容 |
|---|---|---|---|
| `docs/component/api/component.md` | API 职责和边界 | 始终 | API 长期公共行为 |
| `docs/component/api/ddd.md` | 领域、聚合、实体和值对象 | 存在领域模型 | API 领域设计 |
| `docs/component/api/process.md` | 服务端业务流程 | 存在稳定流程 | API 处理流程 |
| `docs/component/api/state.md` | 领域状态及转换 | 存在稳定状态机 | API 状态规则 |
| `docs/component/api/sequence.md` | 服务及外部系统调用时序 | 存在多方调用 | API 调用时序 |
| `docs/contracts/openapi.json` | 同步 HTTP API 契约 | 存在同步接口 | 路径、操作、Schema、错误和示例 |
| `docs/contracts/asyncapi.json` | 异步事件契约 | 存在事件 | Channel、Message、生产者和消费者 |
| `docs/contracts/schema.dbml` | 数据结构和关系 | 数据模型变化 | 表、字段、索引和关系 |
| `docs/contracts/authorization.fga` | 授权关系模型 | 存在非公开操作 | 类型、关系和权限 |

只创建项目实际需要的文件，不创建空契约。

## 契约规则

- OpenAPI 使用稳定 `operationId`，Schema、示例和实际接口保持一致。
- 没有异步事件不创建 AsyncAPI。
- 没有非公开操作不创建 OpenFGA。
- 没有数据模型变化不创建 DBML。
- API 规范说明适用的错误、权限、事务、并发、幂等、兼容和迁移。
- JSON 使用标准解析器验证；其他契约使用项目已有工具验证。

## 执行步骤

1. 读取相关需求、架构、技术栈、现有 API 规范、契约、源码和测试。
2. 自动识别领域边界、接口行为、数据、权限和兼容性中的不确定项。
3. 按根 `AGENTS.md` 的对话确认规则完成确认。
4. 只增量更新 API 规范和真实需要的契约。

## 完成检查

- 实际修改只位于 `docs/component/api/**` 和 `docs/contracts/**`。
- 没有修改源码、需求、其他组件或部署文件。
- 契约之间的命名、类型、权限和数据关系一致。
- 所有 JSON、DBML、FGA 和 Mermaid 已验证。
