# AI 工作流

通过安装到宿主项目根目录的 `AGENTS.md`，将文档、开发、测试和 Docker 任务路由到独立阶段，并限制每个阶段的文件权限。

## 文件架构

```text
workflows/
├─ templates/
│  ├─ AGENTS.template.md
│  ├─ require.template.md
│  ├─ require/
│  ├─ frontend-design.template.md
│  ├─ frontend-design-system.template.md
│  ├─ frontend-design-preview.template.md
│  ├─ frontend-draft.template.md
│  ├─ backend-design.template.md
│  └─ docker-design.template.md
├─ stages/
│  ├─ doc.md
│  ├─ dev.md
│  ├─ component-test.md
│  ├─ test.md
│  └─ docker.md
├─ install.mjs
├─ validate.mjs
└─ README.md
```

| 路径 | 作用 |
|---|---|
| `templates/AGENTS.template.md` | 解析指令、发现组件并路由阶段 |
| `templates/require.template.md`、`templates/require/` | 生成需求、架构和验收文档 |
| `templates/frontend-*.template.md` | 定义 Frontend 文档和 QML/WASM Draft |
| `templates/backend-design.template.md` | 定义 Backend 文档 |
| `templates/docker-design.template.md` | 定义 Docker 文档 |
| `stages/` | 定义各执行阶段的输入、流程和文件权限 |
| `install.mjs` | 安装或更新宿主项目的 `AGENTS.md` 托管区块 |
| `validate.mjs` | 校验工作流和宿主组件映射 |

宿主项目中，`docs/` 下除 `docs/workflows/` 外的每个一级目录都是一个组件，入口为 `docs/<组件>/README.md`。需要开发或组件测试时，在组件 README 中声明：

```md
应用目录：`apps/api/`
开发模板：`backend`
```

## 指令

指令格式：

```text
<doc 组件> [tmp require|frontend|backend|docker] [req 需求组件 [issue 编号]] [issue 编号] [design|preview|draft M-001:P-001|opt 文件]
- 任务

<dev 组件> [opt 文件]
- 任务

<test 组件> [opt 文件]
- 任务

<docker 组件> [opt 文件]
- 任务

<test|docker|docker update> [opt 文件]
- 全局任务
```

### 范例：创建需求

```text
<doc require> tmp require issue 1
- 初始化系统需求、架构和验收标准
```

### 范例：设计 Backend

```text
<doc api> tmp backend req require issue 1
- 设计初始化接口
```

### 范例：Frontend Design System

```text
<doc browser> tmp frontend req require design
- 外贸商城风格
```

该指令读取 Require、现有页面和品牌资产，只创建或更新组件根目录的 `DESIGN.md`。

### 范例：Frontend Design Preview

```text
<doc browser> tmp frontend req require preview
- 基于 DESIGN.md 生成首页、商品列表、商品详情和结算表单四个静态页面，只用于确认整体风格；CSS、JavaScript 和 SVG 内嵌 HTML，字体与图片放入 design-preview/assets/
```

预览产物位于 `design-preview/**`：每页为内嵌 CSS、JavaScript 和 SVG 的 HTML，预览专用字体与图片位于 `design-preview/assets/`，整个目录可通过 `file://` 独立查看。它可以重新生成或删除；Draft、dev 和 test 不读取它，唯一设计事实仍是 `DESIGN.md`。

### 范例：Frontend Draft 设计 QML

```text
<doc browser> tmp frontend req require draft M-001:P-001
- 按 index.html 一比一转换为 QML，提取 Layout 与 Component，构建 WASM 并验证
```

页面 `draft/src/M-001/P-001/index.html` 是可内嵌 HTML、CSS 和 JavaScript 的只读设计输入，公共资产放在 `draft/src/assets/`。信息不确定时 Agent 通过对话确认。

### 范例：开发与测试

```text
<dev api>
- 实现手机号接口

<test api>
- 验证手机号接口
```

### 范例：升级 Docker 镜像

```text
<docker update>
- 升级遥测镜像
```

`tmp` 选择模板，`req` 加载需求组件，`issue` 限定任务范围，`opt` 只操作一个文件。指令结尾可使用 `?` 只回答、`,` 逐项澄清、`.` 修改并验证、`!` 修改、验证、提交并推送；中英文符号等价。

## 安装

工作流应作为子模块挂载到宿主项目的 `docs/workflows`：

```bash
git submodule add -b develop <repository-url> docs/workflows
node docs/workflows/install.mjs
```

切换并更新分支：

```bash
node docs/workflows/install.mjs --branch develop
```

安装器保留宿主 `AGENTS.md` 托管区块外的内容，并记录当前工作流 Git SHA。

## 验证

```bash
node validate.mjs
```

验证宿主项目所有文档组件及应用目录映射：

```bash
node docs/workflows/validate.mjs --project-root .
```
