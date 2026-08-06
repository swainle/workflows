# Frontend 文档模板

用于 `<doc 组件> tmp frontend`。先创建或读取 README 技术入口，再按以下顺序维护：

```text
README.md 技术入口 + 显式 req
  → ux.md
  → <组件>.design-token.css
  → draft 初稿
  → state.md（存在复杂状态时）
  → draft 状态回填
  → configuration.md
  → testing.md
  → README.md 索引与文件树校对
```

## 专家团

- UX 与无障碍专家：负责用户、页面、导航、交互语义、响应式和可访问性边界。
- UI 与 Web Components 专家：负责 Design Token、组件边界、Shadow DOM 和完整 Draft 渲染。
- Frontend 架构与测试专家：负责复杂状态、配置、性能和测试策略。

专家只读分析并返回决策、风险、建议和阻塞；主 Agent 统一修改与验证。

## README 技术入口

README 第一个创建或确认，为后续设计提供唯一技术基线：

````md
# <组件名称>

应用目录：`apps/<实际路径>/`
开发模板：`frontend`

## 职责

<组件负责和不负责的内容>

## 技术基线

| 类别 | 选择 | 版本 | 官方文档 | 范例代码 |
|---|---|---|---|---|
| 语言 | `<语言>` | `<精确版本>` | `<官方文档 URL>` | `<官方示例 URL 或仓库路径>` |
| 框架 | `<框架>` | `<精确版本>` | `<官方文档 URL>` | `<官方示例 URL 或仓库路径>` |
| 样式 | `<方案>` | `<精确版本>` | `<官方文档 URL>` | `<官方示例 URL 或仓库路径>` |
| 测试 | `<工具>` | `<精确版本>` | `<官方文档 URL>` | `<官方示例 URL 或仓库路径>` |

## 文档索引

| 文件 | 职责 |
|---|---|

## 文件关系

<必要时使用 Mermaid flowchart>

## 应用文件树

```text
<完整实际文件树>
```
````

- 只列当前组件实际采用的技术；版本来自项目清单、锁文件或已确认决策，不猜测或使用版本范围。
- 官方文档直接链接所用版本页面；范例优先使用官方同版本示例，其次使用仓库内已验证示例。
- README 不复制教程或大段范例代码；技术选择只在 README 维护，其他文件引用并说明如何落实。

## 文件职责

| 文件 | 唯一维护内容 |
|---|---|
| `README.md` | 职责、应用目录、开发模板、技术基线、文档索引、文件关系和应用文件树 |
| `ux.md` | 用户、模块、页面、入口、导航、布局、表单、交互和可访问性规则 |
| `<组件>.design-token.css` | 颜色、字体、间距、尺寸、圆角、阴影和动效 CSS Custom Properties |
| `draft/**` | 使用原生 Web Components 完整渲染当前组件的所有系统页面与设计状态 |
| `state.md` | 复杂数据请求、共享状态、缓存、转换、并发和错误恢复 |
| `configuration.md` | 配置项、环境差异和启动校验 |
| `testing.md` | 页面、状态、响应式、可访问性、视觉、性能和契约验证要求 |

没有复杂状态时不创建 `state.md`。README、UX、Token、Draft、配置和测试仍按实际需要维护，
不再生成旧式 UI YAML 或手工维护第二份 Token 格式。

## `ux.md`

- 模块使用 `M-001`，模块内页面使用 `P-001`；跨文件页面引用为 `ux:模块:M-001:P-001`。
- 布局和表单使用 `LAYOUT-001`、`FORM-001`。页面表是名称、入口、前置页面、登录要求、权限表现和无权处理的唯一事实源。
- 定义用户可观察的页面、导航和交互，不指定框架组件、请求缓存或生产源码结构。
- 引用使用独立行 `> Ref: <稳定标识>`，不复制需求或契约内容。

## Design Token

`<组件>.design-token.css` 是风格规范唯一事实源，直接供 Draft 使用：

```css
:root {
  --color-primary: #2563eb;
  --font-body: system-ui, sans-serif;
  --space-2: 0.5rem;
  --radius-md: 0.5rem;
  --duration-fast: 120ms;
}
```

- Token 使用稳定、语义化 CSS Custom Properties，不在页面或 Shadow DOM 内重复硬编码同一风格事实。
- CSS Custom Properties 通过继承进入 Shadow DOM；组件内部只组合 Token。
- 只有需要与非 Web 平台或设计工具交换时，才增加由 CSS 派生的机器格式，不建立第二份手工事实源。

## Draft

Draft 是零框架、无构建步骤的可运行原型，完整渲染 `ux.md` 中当前组件的所有页面：

```text
draft/
├─ index.html
├─ app.js
├─ components/
│  ├─ app-shell.js
│  └─ draft-state.js
├─ pages/
│  └─ M-001-P-001-<page>.js
└─ assets/
   └─ draft.css
```

- `index.html` 提供完整应用外壳、页面导航、视口和状态切换入口。
- 页面、布局、可复用区域及独立状态边界使用原生 Custom Elements；名称必须包含连字符。
- Custom Element 使用 `attachShadow({ mode: "open" })`，便于评审、自动化检查和调试。
- 只拆分页面、布局、复用区域和独立状态边界，不把一次性小元素组件化。
- 可以使用多个普通 `defer` 脚本，确保直接打开即可预览；不引入框架、包、构建工具或生产依赖。
- 不调用真实 API、不写生产业务逻辑、不复制到应用源码，也不被生产应用导入。
- 使用语义化 HTML，覆盖桌面与移动视口、键盘、焦点、对比度和动效降级。

Hover、focus、active、disabled、展开、选择和简单表单校验直接在 Draft 实现。API loading、empty、error、
unauthorized、缓存、过期、乐观更新、并发请求及跨页面共享状态先使用标签：

```html
<draft-state
  ref="pending:state:预约列表"
  states="loading empty success error unauthorized">
  <p>复杂状态留待 state.md 定义</p>
</draft-state>
```

## `state.md` 与回填

存在 `pending:state:*` 时必须创建 `state.md`，分配稳定 `DATA-001` 并定义：

```md
### DATA-001 <状态名称>

- 来源：<OpenAPI operationId 或本地状态来源>
- 初始状态：<状态>
- 状态：<状态列表>
- 转换：<事件 → 状态>
- 缓存：<存在时填写>
- 并发：<存在时填写>
- 恢复：<重试、回滚或回退>
- Draft：`draft-state[ref="state:DATA-001"]`
```

状态完成后必须把 Draft 标签更新为稳定引用并实现状态切换：

```html
<draft-state ref="state:DATA-001" states="loading empty success error unauthorized"></draft-state>
```

`pending:state:*` 不得进入完成产物。Draft 展示状态，`state.md` 唯一定义状态含义和转换。

## 契约、配置与测试

- HTTP 请求引用显式需求组件中 OpenAPI 的稳定 `operationId`；契约缺失时停止，不在 Frontend 文档补造。
- 临时 Mock 必须标记 `pending`，由 OpenAPI Schema 或示例生成，并说明移除条件。
- `configuration.md` 只维护配置项、环境差异和启动校验，不重复 README 技术选择。
- `testing.md` 使用 Given/When/Then 描述页面和状态结果，并覆盖 Draft 页面、响应式、键盘、焦点、
  语义、对比度、视觉差异、性能预算和契约映射中实际适用的部分。

## 完成检查

- README 在其他设计前建立，应用目录、`frontend` 模板、实际版本、官方文档和范例代码完整可用。
- UX、Token、Draft、State、配置和测试引用方向一致，没有 `*.ui.yml`、重复事实或孤立文件。
- Draft 使用 Web Components 和开放 Shadow DOM，能完整导航并渲染所有已定义页面和状态。
- 没有 `pending:state:*`；复杂状态均在 `state.md` 定义并回填稳定引用。
- Draft 无框架、无构建依赖、无真实 API 和生产业务逻辑；无障碍与响应式检查已完成。
- README 最终索引和完整应用文件树已校对。
