# Frontend Draft 提示词模板

用于 `<doc 组件> tmp frontend` 的 Draft 编码阶段。未指定 `draft` 时，按 `ux.md` 完整生成当前组件的草稿网页；
指定 `draft M-001:P-001` 时，只生成或更新该页面及其必要依赖。

本模板只定义 Draft 代码规范；UX、Design Token、状态、映射、配置和测试文档仍由
`templates/frontend-design.template.md` 维护。

## `draft` 页面范围

以下限制只适用于 `<doc 组件> tmp frontend draft M-001:P-001`：

- 页面标识必须严格符合 `M-<三位编号>:P-<三位编号>`，并已存在于 `ux.md` 页面索引和对应页面章节；不存在时停止。
- 只读取 README、`ux.md`、`design.tokens.json` 和现有 Draft 依赖；显式给出 `req` 时，可再读取该页面引用的 Require 文件。
- 只创建或修改该页面的 `draft/src/M-001/P-001/**`、其引用的 `draft/src/M-001/LAYOUT-*/**`，以及预览必需的
  `draft/index.html`、`draft/src/index.js`、`draft/src/components/**` 和 `draft/src/styles/**`。
- 共享 Draft 文件只做注册、导航和渲染当前页所需的最小修改，保留其他页面及用户修改。
- 不修改 README、`ux.md` 或 `design.tokens.json`，不创建或修改 `state.md`、`mapping.md`、`configuration.md` 或 `testing.md`；
  复杂状态只实现可观察的演示行为，不补写生产逻辑。
- `draft` 与 `opt` 互斥；两者同时出现时停止。

## 固定文件结构

Draft 使用原生 Web Components 和 ES6 Modules。未指定 `draft` 时完整渲染 `ux.md` 中当前组件的所有页面；
指定 `draft` 时只渲染目标页面及必要依赖：

> Custom Element 语法参考：[Web Components 入门实例教程](https://www.ruanyifeng.com/blog/2019/08/web_components.html)

```text
draft/
├─ index.html
└─ src/
   ├─ index.js
   ├─ components/
   │  ├─ app-shell/
   │  │  └─ index.js
   │  ├─ draft-dialog/
   │  │  └─ index.js
   │  └─ draft-state/
   │     └─ index.js
   ├─ M-001/
   │  ├─ LAYOUT-001/
   │  │  └─ index.js
   │  └─ P-001/
   │     ├─ index.js
   │     └─ COMP-001/
   │        └─ index.js
   └─ styles/
      ├─ global.css
      └─ tokens.css
```

- 模块、Layout、Page 和页面级 Component 分别使用 `M-001/`、`M-001/LAYOUT-001/`、`M-001/P-001/` 和
  `M-001/P-001/COMP-001/`；目录名只保留 UX 稳定编号，不附加名称。
- 每个 Layout、Page 和 Component 使用独立目录且只包含 `index.js`；类、HTML 模板、私有样式、事件和标签注册都写在该文件。
- 只有跨模块复用或 Draft 基础组件放在 `src/components/`；一次性小元素留在所属组件，不创建新目录。
- `index.html` 只加载全局样式和 `src/index.js`；`src/index.js` 导入组件、初始化演示状态、处理最小导航并挂载应用，
  不再拆分 App、Registry、Router、Store 或 API 层。
- 不创建 `component.json`、`component.schema.json`、组件级 `style.css`、`template.html`、`load-text.js` 或 Draft 专用构建脚本。
- 不调用真实 API、不复制到应用源码，也不被生产应用导入；临时数据只放在实际使用它的 Page 或 Component 中。
- 使用语义化 HTML，并在组件声明的唯一目标设备上覆盖键盘、焦点、对比度和动效降级；不额外要求跨设备自适应。

## ES6 Component 格式

`index.html` 只加载全局样式和统一入口：

```html
<link rel="stylesheet" href="./src/styles/tokens.css">
<link rel="stylesheet" href="./src/styles/global.css">
<script type="module" src="./src/index.js"></script>
```

组件的 `index.js` 使用 ES6 语法，并把模板和私有样式保留在同一文件：

```js
const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host { display: block; }
  </style>
  <section>
    <h2>预约列表</h2>
  </section>
`;

class AppointmentList extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    shadow.appendChild(template.content.cloneNode(true));
    shadow.addEventListener("click", (event) => {
      // 只处理该组件内的 Draft 交互。
    });
  }
}

window.customElements.define("m002-p001-appointment-list", AppointmentList);
```

- Custom Element 标签名全小写且包含连字符，类名使用 PascalCase。
- Layout、Page、Component 和共享组件都使用开放 Shadow DOM；私有样式写在 `index.js` 的模板 `<style>` 中，
  使用 `:host` 定义宿主样式，通过 CSS Custom Properties 接收主题。
- 每次创建实例都使用 `template.content.cloneNode(true)`；需要通知外部时派发语义明确的 `CustomEvent`。

## 代码与语法规范

- Draft 遵循 README 技术基线及项目已有的 formatter、linter 和类型检查配置；存在对应命令时必须运行并通过，
  不为 Draft 单独引入依赖。
- JavaScript 只使用浏览器原生 ES6 语法和 ES6 Modules，包括 `import`、`export`、`class`、`const`、`let`、箭头函数、
  解构和模板字符串；禁止 CommonJS、TypeScript、JSX 及依赖转译器的非标准语法。
- JavaScript 缩进两个空格，使用双引号和分号；默认使用 `const`，需要重新赋值时才使用 `let`，禁止 `var`，
  不保留未使用的导入、变量或空事件处理器。
- HTML 使用小写标签和属性、双引号属性值及合法嵌套，`id` 在所属 Shadow Root 内唯一；禁止内联事件处理器和内联样式。
- CSS 使用浏览器支持的标准语法，类名和 CSS Custom Properties 使用 kebab-case；禁止预处理器语法和无效声明。
- 预览时 HTML、CSS 和 JavaScript 必须成功解析和加载；控制台不得出现语法错误、未处理异常、Promise rejection 或资源 404。

## Design Token 与全局样式

- `design.tokens.json` 是颜色、字体、间距、尺寸、圆角、阴影和动效的唯一事实源；`src/styles/tokens.css` 只做机械转换，
  不手工维护第二份 Token。
- `global.css` 只维护页面背景、基础排版和应用外壳；组件私有样式不得移入全局文件。
- 所有颜色和已有 Token 值都通过 `var(--token-name)` 使用，不在组件模板中重复硬编码。

## 导航、数据与状态

- `src/index.js` 根据 `ux.md` 路由使用一个普通对象或 `Map` 选择页面；链接保留真实 `href`，只在需要 SPA 预览时使用 History API。
- 未生成页面使用共享 `<draft-dialog>` 提示“页面尚未生成”；弹窗直接使用原生 `<dialog>`、`showModal()` 和 `close()`。
- 临时数据是明确标注的合成数据，直接保留在唯一使用它的 Page 或 Component；只有两个以上组件共享同一数据操作时才抽取共享模块。
- 页面局部状态留在所属组件。复杂状态使用稳定 `state:M-001:P-001:S-001` 标签，并只实现 UX 实际声明的
  loading、empty、success、error 或 unauthorized 状态，不把所有状态堆叠在页面内。
- `src/index.js` 可在内存中初始化默认演示账户；存在登录页时提供合成凭据，并可切换已登录、退出和匿名状态。
- 账户和临时写操作只存在内存中，刷新后恢复；不使用 Cookie、`localStorage`、真实个人信息、生产凭据或密钥。
- 所有可见控件必须产生可观察结果；禁止 `href="#"`、空事件处理器和无反馈提交。
- 表单使用原生约束；错误反馈通过 `aria-invalid` 和 `aria-describedby` 关联。

复杂状态示例：

```html
<draft-state ref="state:M-001:P-001:S-001" states="loading error success">
  <p data-state="loading">正在加载</p>
  <p data-state="error">加载失败，请重试</p>
  <div data-state="success"><!-- 合成数据渲染区域 --></div>
</draft-state>
```

## 完成检查

- 目标页面可通过 README 已确认的本地 HTTP 服务器预览，默认演示账户可完成主要交互。
- 文件路径与 `ux.md` 的 Module、Layout、Page、Component 和 State 稳定引用一致，每个组件目录只包含 `index.js`。
- 页面导航、适用状态、弹窗、表单约束、键盘和焦点行为可观察且有效。
- 所有颜色和已有样式值来自 Token；控制台没有未处理 error、Promise rejection 或资源 404。
- 没有真实 API、生产逻辑、真实个人信息、生产凭据、密钥或未要求的基础设施。
- `draft M-001:P-001` 只修改目标页面及必要共享文件，不修改页面范围外的设计文档。
