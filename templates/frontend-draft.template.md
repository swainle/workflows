# Frontend Draft 提示词模板

用于 `<doc 组件> tmp frontend` 的 Draft 编码阶段。未指定 `draft` 时，按 `ux.md` 完整生成当前组件的草稿网页；
指定 `draft M-001:P-001` 时，只生成或更新该页面及其必要依赖。

本模板只定义 Draft 代码规范，不承担 UX、Design Token、状态、映射、配置或测试文档设计；完整 Frontend 任务中的这些产物
仍由 `templates/frontend-design.template.md` 维护。

## `draft` 页面范围

以下限制只适用于 `<doc 组件> tmp frontend draft M-001:P-001`：

- 页面标识必须严格符合 `M-<三位编号>:P-<三位编号>`，并已存在于 `ux.md` 页面索引和对应页面章节；不存在时停止。
- 只读取 README、`ux.md`、`design.tokens.json` 和现有 Draft 依赖；显式给出 `req` 时，可再读取该页面引用的 Require 文件。
- 只创建或修改该页面的 `draft/src/modules/M-001/P-001/**` 及其引用的 `draft/src/modules/M-001/LAYOUT-*/**`，以及让该页面可预览所必需的
  `draft/package.json`、`draft/component.schema.json`、`draft/index.html`、`draft/scripts/**`、`draft/src/index.js`、`draft/src/api.js`、`draft/src/data/**`、`draft/src/app/**`、
  `draft/src/shared/components/**`、`draft/src/styles/**` 和 `draft/src/utils/load-text.js`。
- 共享 Draft 文件只做注册、导航和渲染当前页所需的最小修改，保留其他页面及用户修改。
- 不修改 README、`ux.md` 或 `design.tokens.json`，不创建或修改 `state.md`、`mapping.md`、`configuration.md` 或 `testing.md`；
  复杂状态只在 Draft 内实现可演示的临时行为，不补写生产状态文档或生产逻辑。
- `draft` 与 `opt` 互斥；两者同时出现时停止。

## 编码目标

使用正式 Web Components 项目结构和 ES Modules 组织可运行原型。未指定 `draft` 时完整渲染 `ux.md` 中当前组件的所有页面；
指定 `draft` 时只渲染目标页面及必要依赖：

> 文件封装与 Custom Element 语法参考：[Web Components 入门实例教程](https://www.ruanyifeng.com/blog/2019/08/web_components.html)

```text
draft/
├─ package.json
├─ component.schema.json
├─ index.html
├─ scripts/
│  ├─ build-tokens.mjs
│  └─ validate-styles.mjs
└─ src/
   ├─ index.js
   ├─ api.js
   ├─ app/
   │  ├─ app.js
   │  ├─ router.js
   │  ├─ store.js
   │  ├─ registry.js
   │  └─ components/
   │     ├─ app-shell/
   │     ├─ draft-dialog/
   │     └─ draft-state/
   ├─ data/                       # 按需；只能由 api.js 导入
   ├─ modules/
   │  └─ M-001/
   │     ├─ LAYOUT-001/
   │     │  ├─ component.json
   │     │  ├─ index.js
   │     │  ├─ style.css
   │     │  └─ template.html      # 按需
   │     └─ P-001/
   │        ├─ component.json
   │        ├─ index.js
   │        ├─ style.css
   │        ├─ template.html      # 按需
   │        └─ COMP-001-<component>/
   │           ├─ component.json
   │           ├─ index.js
   │           ├─ style.css
   │           └─ template.html   # 按需
   ├─ shared/
   │  └─ components/              # 仅放跨模块、具有稳定 UX 引用的组件
   ├─ styles/
   │  ├─ reset.css
   │  ├─ global.css
   │  ├─ utilities.css
   │  └─ tokens.css
   └─ utils/
      └─ load-text.js
```

- Draft 是可独立安装、启动、构建和预览的完整前端项目。`package.json` 至少提供 `tokens`、`validate:styles`、`dev`、`build` 和 `preview` 脚本；
  依赖、版本和构建工具必须沿用 README 技术基线及宿主锁文件，不另选技术栈。开发服务器必须支持 SPA History fallback。
- `index.html` 只提供视口、全局样式和统一模块入口；`src/index.js` 只启动 `src/app/app.js`。
- `src/app/app.js` 是 Composition Root，只负责创建 API、Store 和 Router、装配 `app-shell`、执行启动加载与集中错误处理；
  不在其中硬编码页面内容、路由分支或临时业务数据。
- 页面、布局、可复用区域及独立状态边界使用原生 Custom Elements；名称必须包含连字符。App Shell、Layout 和 Page 默认使用 Light DOM，
  页面级 `COMP-*`、跨模块共享组件和 Draft 基础组件默认使用开放 Shadow DOM。模块目录使用 `M-001/`，页面目录使用
  `modules/M-001/P-001/`，页面专属组件使用 `modules/M-001/P-001/COMP-001-<component>/`，布局使用
  `modules/M-001/LAYOUT-001/`；目录名保留稳定编号，只有跨模块共享且具有稳定 UX 引用的组件放在 `src/shared/components/`。
- `src/app/**`、`src/api.js`、`src/data/**`、`src/styles/**` 和 `src/utils/**` 是 Draft 基础设施，不进入业务组件映射；
  `src/modules/**` 和具有稳定 UX 引用的 `src/shared/components/**` 才是后续平台代码生成候选。
- 只有 Manifest 声明 `encapsulation: "shadow"` 的组件使用 `attachShadow({ mode: "open" })`；Light DOM 组件不得创建 Shadow Root。
- 只拆分页面、布局、复用区域和独立状态边界，不把一次性小元素组件化。
- 每个 layout、page 和 component 使用独立目录；`component.json` 维护平台无关契约，`index.js` 维护类、事件和标签注册，
  `style.css` 维护该单元样式；Light DOM 样式以 Custom Element 标签选择器限定作用域，Shadow DOM 样式注入组件模板；
  HTML 较多时才创建 `template.html`，简短模板直接写在 `index.js` 内。不创建空 `template.html` 或空 `utils/` 文件。
- `index.html` 使用 `<script type="module" src="./src/index.js"></script>`；ES Modules 和 CSS/HTML 资源通过本地 HTTP 服务器预览，
  不再支持 `file://` 直接打开。开发服务器和构建方式使用 README 已确认的技术基线，不在 Draft 另选工具。
- `src/app/router.js`、`src/app/store.js` 和 `src/api.js` 分别是路由、共享状态和数据访问的唯一入口；页面不得绕过这些入口复制同类机制。
- 不调用真实 API、不复制到应用源码，也不被生产应用导入；但必须完整模拟 UX 定义的路由、数据加载、提交和可观察状态转换。
- 使用语义化 HTML，在组件声明的唯一目标设备上覆盖键盘、焦点、对比度和动效降级；不额外要求跨设备自适应。

## 渲染与样式封装

`index.html` 只加载全局样式和统一入口：

```html
<link rel="stylesheet" href="./src/styles/tokens.css">
<link rel="stylesheet" href="./src/styles/reset.css">
<link rel="stylesheet" href="./src/styles/global.css">
<link rel="stylesheet" href="./src/styles/utilities.css">
<script type="module" src="./src/index.js"></script>
```

`src/utils/load-text.js` 对非成功响应抛错，并返回文本内容：

```js
export async function loadText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load ${url}: ${response.status}`);
  return response.text();
}
```

组件的 `index.js` 按下列格式加载同目录资源：

```js
import { loadText } from "../../../../utils/load-text.js";

const [style, markup] = await Promise.all([
  loadText(new URL("./style.css", import.meta.url)),
  loadText(new URL("./template.html", import.meta.url)),
]);

const template = document.createElement("template");
template.innerHTML = `<style>${style}</style>${markup}`;

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

- 标签名全小写且至少包含一个连字符；文件名保留 UX 稳定标识，类名使用 PascalCase。
- Light DOM 用于 App Shell、Layout 和 Page，使 Reset、全局排版、工具类和页面布局可以直接生效；其 `style.css` 中所有选择器必须以自身标签开头，避免污染其他页面。
- Shadow DOM 只用于需要独立复用或强样式隔离的 `COMP-*`、共享组件和 Draft 基础组件；私有样式从同目录 `style.css` 注入模板并使用 `:host` 定义宿主样式。
- Shadow 组件通过 CSS Custom Properties 接收主题；确需外部局部定制时显式暴露 `part`，不使用 `:host-context()` 穿透主题边界。
- Slot 内容仍属于 Light DOM；组件只使用有限的 `::slotted()` 设置插槽默认表现，不依赖插槽内部结构。
- 每次创建组件实例都使用 `template.content.cloneNode(true)`，不在多个实例间移动或共享可变 DOM 节点。
- 事件直接绑定到 Shadow DOM 内的目标元素或根节点；需要通知外部时派发语义明确的 `CustomEvent`。

## Design Token 与全局样式

- `design.tokens.json` 是全部颜色、字体、间距、尺寸、圆角、阴影和动效的唯一事实源；页面设计不得以现有 Draft CSS 反向覆盖 Token。
- `scripts/build-tokens.mjs` 读取 `../design.tokens.json`，机械生成带有“禁止手工修改”文件头的 `src/styles/tokens.css`；生成文件不得手工维护。
- `tokens.css` 只定义 CSS Custom Properties；`reset.css` 只重置 Light DOM 浏览器默认值，`global.css` 只维护字体、页面背景和基础排版，
  `utilities.css` 只供 App Shell、Layout 和 Page 使用，不在 Shadow 组件内复制工具类。
- Light 与 Shadow DOM 样式都通过 `var(--token-name)` 使用 Token。CSS 不得硬编码 Token 已拥有的颜色、字体、间距、尺寸、圆角、阴影或动效值。
- `scripts/validate-styles.mjs` 检查未定义 Token、禁止的原始颜色值、重复 Token、手工修改的 `tokens.css`，以及违反 Light DOM 作用域规则的选择器。
- `dev` 和 `build` 在启动前依次执行 `tokens`、Manifest 校验和 `validate:styles`；任一校验失败时停止，不以警告继续。

## 平台无关组件契约

每个可映射的 Layout、Page 和 Component 都必须在同目录提供 `component.json`，作为 Draft 到真实平台组件的机器可读中间表示：

```json
{
  "schemaVersion": 1,
  "ref": "ux:M-002:P-001:COMP-001",
  "kind": "component",
  "name": "appointment-list",
  "tagName": "m002-p001-appointment-list",
  "entry": "./index.js",
  "style": "./style.css",
  "template": "./template.html",
  "encapsulation": "shadow",
  "targetDevice": "desktop",
  "inputs": [
    { "name": "items", "type": "array", "required": true }
  ],
  "outputs": [
    { "event": "appointment-opened", "detail": { "appointmentId": "string" } }
  ],
  "slots": [],
  "stateRefs": ["state:M-002:P-001:S-001"],
  "dependencies": []
}
```

- `ref` 是唯一主键，必须与 `ux.md` 稳定引用一致；`kind` 只能是 `layout`、`page` 或 `component`。
- `component.schema.json` 使用 JSON Schema 2020-12，并以 `$schema` 和 `$id` 声明方言及 Schema 身份；
  它定义全部字段、条件必填项、稳定引用格式和 `additionalProperties` 策略。每个 Manifest 登记 `schemaVersion`，启动和构建前必须全量验证。
- `tagName`、`entry`、`style`、可选 `template`、`encapsulation`、`targetDevice`、输入、输出、Slot、状态引用和依赖只在
  `component.json` 登记；代码和 `mapping.md` 不维护第二份契约。
- `encapsulation` 只能是 `light` 或 `shadow`；App Shell、Layout、Page 默认 `light`，可复用 Component 默认 `shadow`，偏离默认值时必须说明具体隔离原因。
- Page 额外登记 `route`、`layoutRef` 和 `permissionRefs`；Layout 额外登记具名 `regions`；Component 只登记自身公开契约。
- `inputs` 使用平台无关的 JSON 数据类型和必要约束，不出现 React Props、Vue Emits、Angular Input 或目标平台类型名称。
- `outputs` 只登记语义化 `CustomEvent` 及其 `detail` 结构；禁止通过父组件查询 Shadow DOM、读取子组件私有字段或依赖标签内部结构。
- `dependencies` 只能引用其他 `component.json` 的稳定 `ref`；跨组件通信使用输入、输出或 Slot，不直接导入另一个组件的类实例。
- CSS 类名、内部 DOM、临时数据、Router、Store 和 API 实现不属于平台契约，不写入 `component.json`。
- 需要数据的 Page 在 Manifest 中登记 `dataSources`，每项包含 `method`、适用的 `stateRef`，以及契约存在时的稳定 `operationId`；
  临时数据内容和 API 实现仍不进入 Manifest。
- `src/app/registry.js` 只登记各 `component.json` 的路径并据此加载入口、构建 Route Table；不得复制 Manifest 字段。
- `draft M-001:P-001` 增量更新目标 Page、其 Layout、页面组件的 Manifest 和 Registry 条目，保留其他稳定引用与登记顺序。

## 依赖方向

- `src/index.js → src/app/app.js → Registry / Router / Store / API` 是唯一启动链；基础设施负责装配业务组件，业务组件不反向导入 `src/app/**`。
- Page 可以调用 `api.js`，并组合本页 `COMP-*` 与共享组件；跨页共享状态由 App 按 Manifest inputs 注入，Page 通过 outputs 请求导航或状态变更，
  不直接导入 Router 或 Store。Layout 只负责具名区域和共享外壳，不读取页面数据。
- 页面级 `COMP-*` 和 `shared/components/**` 只通过 Manifest 声明的 inputs、outputs 与 slots 工作，不直接调用 Router、Store 或 API。
- 模块之间不得直接导入 Page 或 Layout；跨页导航派发语义事件，由 Page 或 App 转交 Router。
- `api.js` 可以导入 `data/**`；`data/**` 不得导入 UI、Store 或 Router。`styles/**` 和 `utils/**` 不得依赖业务模块。
- 禁止循环依赖。生成真实平台代码时只遍历 Manifest 依赖图，忽略 Draft 基础设施目录。

## 路由

- `src/app/router.js` 从 Registry 中 `kind: "page"` 的 Manifest 建立唯一 Route Table，不手写第二份路由清单。
- 优先使用 HTML Navigation API；Router 监听 `navigation` 的 `navigate` 事件，只拦截 `canIntercept` 为真且同源、命中 Route Table 的导航，
  在 `event.intercept({ handler })` 中执行权限检查和渲染。
- 应用内导航统一调用 `navigation.navigate(path)`；链接使用真实 `href`，浏览器原生处理历史条目、后退、前进和程序化导航。
- 只有 README 目标浏览器包含不支持 Navigation API 的版本时，才在同一 Router 边界内提供 History API fallback；不得同时运行两套路由监听器。
- 直接刷新任一已登记路由时，开发服务器通过 SPA fallback 返回 `index.html`；Navigation API 不替代服务器 fallback。
- Router 负责路径标准化、精确匹配、当前 Route 写入 Store、Layout 与 Page 装配以及权限守卫，不负责读取页面数据。
- 修饰键、新窗口、下载、跨源链接和不可拦截导航保留浏览器默认行为。
- 未登记路径渲染可访问的 Not Found 页面；UX 已登记但当前 Draft 尚未生成的页面使用共享 `draft-dialog` 提示“页面尚未生成”，并保留返回操作。
- `draft M-001:P-001` 只在 Route Table 中增量注册或更新目标页面及其 Layout，保留其他已登记路由和用户修改。

## 状态

- `src/app/store.js` 只使用浏览器原生 `EventTarget`、`CustomEvent` 和 `AbortSignal` 实现单一共享 Store，不引入第三方状态库或早期 Signals 提案。
- Store 至少包含 `getState()`、`setState(updater)` 和 `subscribe(listener, { signal })`；每次更新产生冻结的新快照，禁止组件直接修改内部对象。
- Store 只保存跨页面共享状态：当前 Route、演示账户、认证状态、权限和全局提示。表单输入、展开项等页面局部状态保留在对应 Custom Element 内。
- 页面异步数据统一使用 `idle | loading | success | empty | error` 状态；有权限要求时再加入 `unauthorized`。只实现 UX/State 实际声明的状态。
- `draft-state` 是可运行状态边界，根据稳定 `state:M-001:P-001:S-001` 引用渲染当前状态；不得只显示静态占位文本。
- 页面加载时先进入 `loading`，再根据 `api.js` 结果进入 `success`、`empty` 或 `error`；重试操作必须重新调用同一 API 方法。
- 复杂生产缓存、并发控制和恢复算法仍由 `state.md` 定义；Draft 只实现能够完整演示的临时运行时行为，不伪装为生产实现。

```js
export class Store extends EventTarget {
  #state;

  constructor(initialState) {
    super();
    this.#state = Object.freeze({ ...initialState });
  }

  getState() {
    return this.#state;
  }

  setState(updater) {
    const nextState = updater(this.#state);
    if (Object.is(nextState, this.#state)) return;
    this.#state = Object.freeze({ ...nextState });
    this.dispatchEvent(new CustomEvent("change", { detail: this.#state }));
  }

  subscribe(listener, { signal } = {}) {
    const handleChange = (event) => listener(event.detail);
    this.addEventListener("change", handleChange, { signal });
    listener(this.#state);
    return () => this.removeEventListener("change", handleChange);
  }
}
```

- Custom Element 在 `connectedCallback()` 中使用自己的 `AbortController` 订阅，在 `disconnectedCallback()` 中调用 `abort()`；不得遗留订阅。
- `Proxy`、DOM 节点和可变对象不作为响应式 Store；需要计算值时使用纯 selector，由订阅者根据新快照计算。
- `BroadcastChannel` 只在 UX 明确要求同源多标签页同步时作为 Store 外部同步通道，不替代 Store。

## 临时数据 API

- `src/api.js` 是 Draft 数据的唯一入口。页面、Layout、Component、Router、Store 和 `app.js` 均不得直接声明业务数据数组或对象。
- 所有临时数据保存在 `api.js` 的私有常量中，或由 `api.js` 私有导入的 `src/data/**` 模块提供；其他模块只能调用导出的 API 方法。
- 每个 UX 数据操作使用语义明确的异步方法，例如 `listAppointments()`、`getAppointment(id)`、`login(credentials)`；
  不让页面使用通用字符串键直接读取临时数据。
- API 方法返回数据副本，禁止调用方修改临时数据源；优先使用 `structuredClone()`，目标环境不支持时使用等价的安全复制。
- 查询、筛选、排序、分页、创建、修改和删除必须在 `api.js` 内模拟；写操作更新内存数据，并返回与读取方法一致的数据结构。
- API 方法接受可选 `AbortSignal`，模拟最小延迟，并可按显式演示场景产生 empty、error 或 unauthorized；组件断开连接或发起新请求时取消旧请求。
- 临时数据必须与 UX、Require 契约和 OpenAPI Schema 一致，并明确为合成数据；不得包含真实个人信息、生产凭据或密钥。
- 不调用真实 HTTP 服务。未来接入后端时，只替换 `api.js` 内部实现，不改变页面、Store 或 Router 的调用方式。

```js
const temporaryAppointments = [
  { id: "draft-appointment-001", departmentName: "示例科室", status: "pending" },
];

async function delay(milliseconds, signal) {
  if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");

  await new Promise((resolve, reject) => {
    const finish = () => {
      signal?.removeEventListener("abort", abort);
      resolve();
    };
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(finish, milliseconds);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export async function listAppointments({ signal } = {}) {
  await delay(200, signal);
  return structuredClone(temporaryAppointments);
}
```

## 默认演示账户

- `src/api.js` 提供读取或登录默认演示账户的方法；`src/app/app.js` 在启动时通过该方法取得账户并写入 Store。
- 演示账户至少包含稳定的 `id`、显示名称，以及 UX 已引用的适用角色或权限；不猜测或扩大生产权限。
- 账户标识、姓名和凭据必须是明确标注的合成 Draft 数据，不使用真实个人信息、生产凭据或密钥。
- 存在登录页时，在页面上显示并可预填能通过 UX 校验的演示凭据，提交后只在本地切换为已登录账户。
- `app-shell` 提供已登录、退出和匿名状态的可见切换入口，使需要身份的页面默认可交互，同时可验证无权限表现。
- 账户和会话只存在内存中，刷新后恢复默认状态；不使用 Cookie、`localStorage` 或真实认证请求。

## 弹窗、交互与运行状态

- `app-shell` 只挂载一个共享 `<draft-dialog>`，内部使用原生 `<dialog>`、`showModal()` 和 `close()`；同一时刻只显示一条提示。
- 用户跳转到 `ux.md` 已定义但 Draft 尚未生成的页面时，弹窗显示“页面尚未生成”、目标 UX 标识和返回操作；
  保留当前可用页，该预期分支不记录为控制台 error。
- 当前页面实际适用的 loading、empty、success、error 或 unauthorized 等运行状态可由 `draft-state` 派发事件，
  统一交给 `draft-dialog` 显示；状态列表必须来自当前 UX/State，不机械生成不适用状态，不把所有状态堆叠在页面内。
- 弹窗必须有标题、可访问名称、明确关闭操作和焦点管理；打开后焦点进入弹窗，关闭后返回触发元素。
- 弹窗的背景、文字、边框、阴影、遮罩和各状态颜色只使用 Token CSS Variables。
- Hover、focus、active、disabled、展开、选择和简单表单校验直接在 Draft 实现。
- 所有可见控件必须产生可观察结果；禁止 `href="#"`、空事件处理器和无反馈的表单提交。
- UX 中的必填、类型和规则必须落到表单约束；错误反馈使用 `aria-invalid` 和 `aria-describedby` 关联。

复杂状态使用稳定标签，并由页面通过 API 结果驱动其运行时状态：

```html
<draft-state
  ref="state:M-001:P-001:S-001"
  states="loading error success">
  <p data-state="loading">正在加载</p>
  <p data-state="error">加载失败，请重试</p>
  <div data-state="success"><!-- API 数据渲染区域 --></div>
</draft-state>
```

## 完成检查

- 目标页面可通过本地 HTTP 服务器直接预览，默认演示账户可完成该页主要交互。
- Draft 可以独立执行安装、启动、构建和预览；任一登记路由可直接打开、刷新，并支持浏览器后退和前进。
- Router 使用 Navigation API 完成同源导航拦截，目标浏览器确有需要时才启用互斥的 History API fallback。
- 页面、Layout、Component 和 State 引用与 `ux.md` 一致，复杂状态使用稳定 `state:M-001:P-001:S-001` 标签。
- 每个映射候选都有唯一 `component.json`，Registry、Router 和组件代码没有复制 Manifest 契约；Manifest 不包含目标框架概念。
- 全部 Manifest 通过 `component.schema.json` 校验，稳定引用唯一，依赖引用存在且依赖图无环。
- 所有页面数据均通过 `src/api.js` 的语义化异步方法取得，没有组件内硬编码业务数据；加载、空、成功、失败和重试路径按实际适用范围验证。
- Store 基于 `EventTarget`、`CustomEvent` 和 `AbortSignal`，更新不可变且订阅可释放；组件断开或请求被替换时取消订阅和未完成请求，不产生过期渲染。
- 未生成页面和适用运行状态能通过弹窗显示；共享文件未破坏已有页面。
- App Shell、Layout、Page 使用作用域明确的 Light DOM 样式，可复用组件按 Manifest 使用开放 Shadow DOM；封装方式与公开契约一致。
- `tokens.css` 可从 `design.tokens.json` 重现且未手改；颜色、字体、间距、尺寸、圆角、阴影和动效均通过已定义 Token 使用，样式校验通过。
- 控制台没有未处理 error、Promise rejection 或资源 404；预期的未生成页面分支不记为错误。
- 没有真实 API、生产业务逻辑、真实个人信息、生产凭据或密钥；临时写操作刷新后恢复初始合成数据。
- 只修改页面范围内的 Draft 文件，没有修改 README、UX、Token、State、Mapping、Configuration 或 Testing 文档。
