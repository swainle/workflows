# `[<组件>]` 组件规范

## 职责

通过对话确认当前组件的长期行为、流程、状态、时序、界面和平台约束。

不负责需求分析、全局技术选型、API 全局契约、源码实现、测试实现或部署。

## 操作边界

### 允许读取

- `docs/**`
- `apps/<组件>/**`
- 当前组件测试和 CI 输出

### 允许修改

```text
docs/component/<组件>/**
```

`[api]` 不使用本文件，必须读取 `docs/workflows/stages/api.md`。

### 禁止修改

```text
docs/requirements/**
docs/architecture/**
docs/development/**
docs/design-tokens/**
docs/contracts/**
docs/deployment/**
apps/**
.github/workflows/**
docs/component/<其他组件>/**
```

### 越界处理

需要全局规范时切换 `[system]`；需要 API 契约时切换 `[api]`；需要源码时切换 `[<组件> dev]`。

## 专家

按实际需要选择平台 UX、平台工程、可访问性和测试专家，不生成独立专家报告。

## 文件作用

```text
docs/component/<组件>/
├─ component.md
├─ process.md
├─ state.md
├─ sequence.md
├─ <组件>.design-token.json
└─ *.ui.yml
```

| 文件 | 作用 | 创建条件 | 可修改内容 |
|---|---|---|---|
| `component.md` | 组件职责、边界和公共行为 | 始终 | 当前组件长期规范 |
| `process.md` | 组件内部业务流程 | 存在稳定流程 | 当前组件流程 |
| `state.md` | 页面或组件状态转换 | 存在稳定状态模型 | 当前组件状态 |
| `sequence.md` | 多方交互时序 | 存在多方调用 | 当前组件时序 |
| `<组件>.design-token.json` | 平台差异和全局 Token 覆盖 | 存在平台差异 | 当前组件差异，不复制全局值 |
| `*.ui.yml` | 稳定页面或视图的交互契约 | 存在页面规范 | 当前组件页面结构、动作和状态 |

只创建项目实际需要的文件。

## UI YAML 格式

```yaml
id: booking-create
title: 创建预约
platform: web
route: /bookings/new

requirements:
  - REQ-001-FR-001
  - REQ-001-AC-001

permissions:
  - REQ-001-PERM-001

layout:
  type: page
  regions:
    - id: booking-form
      component: Form

actions:
  submit:
    trigger: booking-form.submit
    operationId: createBooking
    permission: REQ-001-PERM-001
    success: booking-detail
    failure: show-submit-error

states:
  loading:
    description: 正在加载
  empty:
    description: 没有数据
  error:
    description: 请求失败
  forbidden:
    description: 没有权限

accessibility:
  keyboard: true
  screenReader: true
```

- 页面至少关联一个 FR 和 AC。
- 非公开操作关联 PERM。
- 每个 action 关联 API `operationId`、本地行为或外部跳转。
- 检查 loading、empty、error、forbidden、offline、submitting 和 success 中的适用状态。
- `.ui.yml` 是交互契约，不复制特定框架源码。
- `.ui.yml` 引用 Token，不保存可复用的颜色、间距、字体和圆角常量。

## 执行步骤

1. 读取相关需求、当前组件规范、契约、源码和测试。
2. 自动识别需要确认的组件行为和平台限制。
3. 按根 `AGENTS.md` 的对话确认规则完成确认。
4. 只增量更新当前组件的长期规范。

## 完成检查

- 实际修改全部位于 `docs/component/<组件>/**`。
- 没有修改源码、其他组件、需求、全局契约或部署文件。
- 引用的需求编号、权限编号、`operationId` 和 Token 均存在。
- JSON、YAML 和 Mermaid 使用项目已有工具或标准解析器验证。
