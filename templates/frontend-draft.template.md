# Frontend QML Draft 提示词模板

仅用于 `<doc 组件> tmp frontend draft M-001:P-001`。只生成或更新目标页面及其必要依赖；
未指定 `draft` 时不得加载或执行本模板。

本模板只定义页面 HTML 到 QML 的 Draft 转换；README、DESIGN.md、转换配置和转换测试由
`templates/frontend-design.template.md` 维护。

## 交付契约

- `draft` 的交付单位是“可启动到目标页的完整应用”，不是单个 `View.qml`、代码片段或目录示意。
- 首次创建 Draft 时，必须在同一次任务中创建可用的 `CMakeLists.txt`、`main.cpp`、`src/App.qml`、`src/Theme.qml`、目标页和其必要数据/组件；缺少其中任何一项都不算完成。
- 更新已有 Draft 时，必须读取现有启动链和构建清单，增量接入目标页并保持其他已登记页面可加载；不得用重写骨架的方式删除已有页面或用户修改。
- 所有创建的 QML、JavaScript 模块和资产必须登记到 CMake 的 QML/资源清单；所有 import、资源路径、页面输入和信号连接必须指向实际存在且大小写一致的目标。
- `main.cpp` 必须加载 CMake 声明的 QML 模块与 `App.qml`；`App.qml` 必须实例化目标页面、提供全部 `required property`，并让目标页成为启动后可观察的首屏或可达页面。
- 禁止交付 TODO、伪代码、空处理器、未接线控件、占位启动页或“后续再补”的构建文件。工具链缺失只降低验证级别，不得把完整源码降级成示例。

## 执行闭环

1. 先确认 Require 页面及映射 FR、Frontend README 中的精确 Qt 版本、可解析的 `DESIGN.md`、目标页 `index.html` 和现有 Draft 文件；缺少需求或设计输入时停止，不猜测。
2. 发现本机 Qt、CMake、Ninja、Emscripten 及已有项目命令；优先使用 README 声明版本对应的 `qt-cmake` 和 Qt WebAssembly 工具链，不把本机偶然安装路径写入项目。
3. 若精确版本、Kit、工具链或本机路径经读取和发现后仍无法唯一确定，或多个可用选择会改变构建结果，暂停该不确定项并通过对话一次询问一个关键问题；同时给出已发现证据和推荐项。用户确认前不得猜测、写入或宣称该项已验证。
4. 首次页面创建完整启动链；已有页面只补齐本次目标和维持启动所需的文件，并同步 CMake QML/资源清单。
5. 生成主题、格式化、lint、配置、构建并启动检查；遇到源码、资源、CMake 或运行错误时修复后重跑，不能把失败的构建当成完成。
6. 最终按实际能力和证据报告“视觉已验证”“仅结构与交互已验证”或“仅构建已验证”，并给出实际执行命令、未验证项和首个失败原因。

## `draft` 页面范围

- 页面标识必须严格符合 `M-<三位编号>:P-<三位编号>`。
- 已存在的页面可从 `draft/src/M-001/P-001/` 确认；创建新页面必须显式给出 `req <需求组件>`，并能在 Require 中找到该页面及功能依据，否则停止。
- 只读取 README、`DESIGN.md`、目标页 `index.html`、现有 Draft 依赖和显式 `req`；不读取或依赖 `ux.md`、`state.md`、`mapping.md`。
- 不读取、复制或转换 `design-preview/**`；静态风格预览不是页面设计输入或 Draft 事实。
- `index.html` 是用户提供的只读页面设计输入，可以在一个文件内包含 HTML、CSS 和 JavaScript；Draft Agent 不修改它，也不要求独立 `style.css` 或 `index.js`。
- 只创建或修改目标页面的 `View.qml`、`mock.mjs`、`COMP-*/**`、其引用的 `draft/src/M-001/LAYOUT-*/**`，以及预览目标页必需的
  `draft/src/App.qml`、`draft/src/MockStore.qml`、`draft/src/Theme.qml`、`draft/src/shared/**` 和构建入口。
- 共享文件只做注册、导航、主题和渲染当前页所需的最小修改，保留其他页面及用户修改。
- 不修改 README、`DESIGN.md`、目标页 `index.html`、`configuration.md` 或 `testing.md`；`draft` 与 `opt` 互斥。

## 固定文件结构

Draft 是完整 Qt Quick/QML 项目，使用临时数据，可构建并直接启动 WebAssembly 浏览器预览：

```text
draft/
├─ CMakeLists.txt
├─ main.cpp
├─ src/
│  ├─ App.qml
│  ├─ MockStore.qml
│  ├─ Theme.qml
│  ├─ shared/
│  │  └─ COMP-001/
│  │     └─ View.qml
│  ├─ assets/
│  │  ├─ images/
│  │  ├─ icons/
│  │  └─ fonts/
│  └─ M-001/
│     ├─ LAYOUT-001/
│     │  └─ View.qml
│     ├─ P-001/
│     │  ├─ index.html
│     │  ├─ View.qml
│     │  ├─ mock.mjs
│     │  └─ COMP-001/
│     │     └─ View.qml
│     └─ P-002/
│        └─ View.qml
└─ build/
   ├─ wasm/
   └─ reports/
```

- `build/` 是本地生成物，必须被忽略且不得提交；目录不存在时不为展示结构而创建。
- `App.qml` 是唯一应用入口，负责窗口、最小导航和页面挂载；不拆分 Router、Registry 或 App Shell。
- `MockStore.qml` 只保存两个以上页面共享的临时数据和内存状态；页面独占数据放在该页 `mock.mjs`，没有数据时不创建。
- 模块、Layout、Page 和页面组件目录只使用稳定编号：`M-001/`、`LAYOUT-001/`、`P-001/`、`COMP-001/`，不附加名称。
- Layout、Page、Component 的入口统一为 `View.qml`。一次性小元素直接留在所属 `View.qml`，不分配组件目录。
- 只有跨模块或跨页面复用的组件放在 `src/shared/COMP-001/`；页面私有组件放在 `P-001/COMP-001/`。
- 图片、图标、字体和其他页面资产全部放在唯一的 `src/assets/`；页面目录不创建第二个 `assets/`。
- `M-001` 等带连字符目录不得作为 QML Module URI；使用相对目录导入并指定别名。

## HTML/CSS/JavaScript 到 QML

- `M-001/P-001/index.html` 是该页面的视觉、布局、响应式状态和演示交互事实源；它可以内嵌 CSS 与 JavaScript，并只引用 `src/assets/` 中的本地资产。
- 转换前先在浏览器运行 `index.html`，检查目标视口、DOM 语义、computed style、交互状态和资产；QML 复现可观察结果，不复制 DOM 层级或 JavaScript 实现。
- 一比一指相同视口下的视觉层级、位置、尺寸、颜色、字体、间距、圆角、边框、状态和交互结果一致，不要求每个 HTML 元素对应一个 QML 对象。
- 多页面复用的导航栏、标题栏、头部、页脚和页面骨架放入 `M-001/LAYOUT-*/`；页面私有业务区域放入 `P-001/COMP-*/`；跨模块复用才放入 `src/shared/COMP-*/`。
- `P-001/View.qml` 只组装 Layout 与页面组件、提供页面输入并协调信号；一次性小元素保留在最近的 `View.qml`，不为每个 `div` 创建组件。
- QML 不加载 HTML、DOM 或页面 JavaScript；`index.html` 不登记为 WASM 运行资源。HTML 与 DESIGN.md 冲突时停止并通过对话确认，不自行选择。

## QML 表达范围

Draft 必须完整表达并可操作演示：

- 组件树：QML 对象嵌套。
- 属性：`property`、`required property`、`readonly property` 和 `alias`。
- 布局：anchors、`RowLayout`、`ColumnLayout`、`GridLayout` 等 Qt Quick Layouts。
- 数据绑定：声明式属性绑定；禁止用命令式赋值模拟绑定。
- 状态：`state`、`states`、`State` 和 `PropertyChanges`。
- 事件：语义化 `signal` 和最小 `onXxx` 处理器。
- 动画：`Behavior`、`Transition` 及具体 Animation；支持 reduced motion 降级。
- 组件复用：相对目录导入、`Component` 或内联组件，优先复用现有 `View.qml`。
- 响应式变化：按宽高断点绑定布局属性或切换视觉 State；不为未要求的设备增加设计分支。
- 主题：只引用生成的 `Theme.qml`，不硬编码已有 Token 值。

## 布局完整性

- 放入 `RowLayout`、`ColumnLayout` 或 `GridLayout` 的非叶子容器，必须通过 `implicitWidth / implicitHeight`、`Layout.preferredWidth / Layout.preferredHeight` 或 `Layout.fillWidth / Layout.fillHeight` 获得可计算尺寸。
- `anchors.fill` 的子项不会向父项贡献隐式尺寸；禁止依赖被锚定子项反推父容器大小。内容容器优先使用 `implicitHeight: contentLayout.implicitHeight + topPadding + bottomPadding`。
- 为目标页的关键内容容器、输入和操作控件设置稳定 `objectName`，并在布局稳定后的 `Qt.callLater` 中检查它们可见且 `width > 0`、`height > 0`；失败时输出 `LAYOUT_AUDIT_FAILED` 和对象尺寸。
- 浏览器验收不得存在关键控件零尺寸、重叠、裁切、溢出、离屏或不可点击；布局审计失败时必须修复并重构建。

使用普通 `.qml`，不使用 `.ui.qml`，因为 Draft 需要完整事件和动画。QML 只使用可转换、可在 Qt for WebAssembly
运行的声明式子集：`QtQuick`、`QtQuick.Controls`、`QtQuick.Layouts`、`QtQml`、本地 QML 类型和标准 ECMAScript 模块。

禁止自定义 C++ 业务类型、平台插件、直接文件系统访问、Qt 特有复杂模型、DOM、`window`、Node.js API、动态执行代码和目标平台私有能力。

## QML 与 ES6 规范

页面引用组件时使用目录别名，避免相同的 `View` 类型冲突：

```qml
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "./COMP-001" as Comp001
import "../../shared/COMP-002" as SharedComp002

Page {
    id: root

    required property var pageData
    signal openDetail(string id)

    ColumnLayout {
        anchors.fill: parent

        Comp001.View {
            model: root.pageData.items
            onActivated: (id) => root.openDetail(id)
        }
    }
}
```

- QML 使用四空格缩进；属性、信号、对象和处理器按现有 formatter 规则排列，不保留空处理器、未使用属性或无效 import。
- 可复用类型文件名使用 PascalCase；固定入口是 `View.qml`，全局单例是 `MockStore.qml`、生成主题是 `Theme.qml`。
- 输入使用 `required property`，只读派生值使用 `readonly property`，向父级通知使用语义明确的 `signal`。
- 组件不直接改变父级、兄弟或全局对象的私有状态；由 signal 上报意图，在页面或 `App.qml` 协调。
- JavaScript 只使用 QML Runtime 支持的标准 ECMAScript 语法；模块文件使用 `.mjs` 和标准 `import`/`export`。
- 禁止 CommonJS、TypeScript、JSX、浏览器 DOM API、`Qt.include()`、隐式全局变量和无必要命令式脚本。
- `.mjs` 使用两个空格缩进、双引号、分号、`const` 优先；需要重新赋值时才使用 `let`，禁止 `var`。

## DESIGN.md 与主题

- `DESIGN.md` YAML frontmatter 中的颜色、字体、间距、圆角和组件 Token 是规范值，Markdown 正文提供应用理由和约束。
- Draft Agent 每次执行时直接从 DESIGN.md 确定性生成 `src/Theme.qml`；“禁止手工编辑”指不得绕过 DESIGN.md 猜值或在生成结果中维护第二份主题，不要求另建生成器程序。
- QML 只使用 `Theme.colorPrimary`、`Theme.spaceSmall` 等稳定属性；生成过程负责 DESIGN.md Token 引用、CSS 单位和 QML 类型的确定性转换。
- 目标平台由 `<dev 组件>` 从 DESIGN.md 生成主题，不解析 QML 生成物。
- 不得假设浏览器或操作系统字体可被 Qt WebAssembly 使用，也不得写入未经验证的本机字体名称。页面包含中文等非 ASCII 字符时，必须使用覆盖目标字符集且授权明确的字体资产。
- 字体文件登记到 CMake 资源清单，通过 `FontLoader` 加载并使用其实际 `name`；浏览器启动时检查 `FontLoader.Ready`，失败时输出 `FONT_LOAD_FAILED`。
- 字体文件、授权或目标字符集不确定时通过对话确认，不猜测替代字体；验收不得出现方框字、缺字、错误回退或不可读文本。

## 导航、数据与状态

- `App.qml` 根据 Require 页面索引中的“入口”和“目标页面”维护最小导航，并只实现该页映射 FR 的可观察行为；未生成页面以主题化对话框明确提示，不创建空页面。
- 临时数据必须标记为合成数据，只保存在唯一使用它的 `mock.mjs` 或共享 `MockStore.qml` 中。
- Mock 字段来自 Require 契约、OpenAPI Schema 或已确认页面视图，不猜测生产数据库结构。
- 页面必须演示 Require 适用的 loading、empty、success、error、unauthorized 等可观察状态，以及重试、取消、提交和导航结果。
- 临时账户和写操作只存在内存中，刷新后恢复；不使用 Cookie、`localStorage`、真实 API、真实个人信息、生产凭据或密钥。
- 所有可见控件必须产生可观察结果；表单校验、错误说明、键盘导航、焦点顺序和无障碍语义必须有效。
- Draft 可以完整实现演示交互，但不得实现生产缓存、并发控制、持久化、鉴权基础设施或未在 Require 定义的业务规则。

## 构建与浏览器预览

- `main.cpp` 只创建应用和加载 `App.qml`；不写业务逻辑。
- `CMakeLists.txt` 使用 Qt 官方 CMake API 声明可执行目标、QML 模块、每个实际 QML/JavaScript 文件与资产，并链接实际使用的 Qt 模块；应用目标由 Qt WebAssembly 工具链构建。
- WebAssembly 固定使用 `build/wasm/`；配置完成后必须构建应用目标，不得只以 CMake configure 成功代替编译成功。
- WebAssembly 构建生成运行用 HTML、JavaScript loader 和 `.wasm` 静态文件，通过本地 HTTP 服务器预览；页面 `index.html` 只是设计输入，不进入运行产物。
- 只使用目标 Qt WebAssembly 版本支持的 Qt 模块；网络、线程或浏览器沙箱限制必须在采用前验证。
- 优先复用项目已有 Qt、CMake、Emscripten、formatter 和 lint 配置，不为 Draft 引入 UI 框架、QML 解析器或第二预览实现。

## 验证

依次运行；对应工具不存在时记录精确缺项并继续所有不依赖该工具的检查：

1. `qmlformat` 检查或格式化本次修改的 QML。
2. `qmllint` 检查 QML 类型、属性、绑定、信号和 import。
3. 使用匹配版本的 Qt WebAssembly 工具链在 `build/wasm/` 配置并构建应用目标。
4. 从真实 WASM 输出目录启动本地 HTTP 服务器，在浏览器打开生成的 HTML，检查目标页、关键交互、网络请求和控制台。

浏览器控制台不得出现未处理异常、Promise rejection、资源 404 或 QML 加载错误。任一已安装工具执行失败时必须修复并重跑；
若本机缺少 Qt WebAssembly 或 Emscripten，仍完成源码、资源清单、格式和 lint，并明确标记“WASM 未验证”，不得声称“可运行 WASM 已完成”。

### 验收能力分级

使用当前 Agent 可达到的最高级别，不因能力不足跳过可执行检查：

- 支持图片理解：在相同视口分别检查设计 `index.html` 与 QML WASM 截图，确认背景、颜色、字体、圆角、边框、间距和关键控件一比一，且没有异常空白、重叠、裁切、溢出或缺字；执行一次主要交互后复查可观察结果，报告“视觉已验证”。
- 不支持图片但支持浏览器：检查可访问树、关键控件存在性和交互结果，并确认控制台没有 `LAYOUT_AUDIT_FAILED` 或 `FONT_LOAD_FAILED`；只能报告“仅结构与交互已验证”，不得报告视觉正确或美观。
- 不支持浏览器：只执行格式、lint 和 WASM 构建，报告“仅构建已验证”，不得声称页面已运行、样式正确或视觉已验证。

仅有“编译成功”或“控制台无普通异常”不能证明页面样式完成；发现适用级别内的问题后必须修复、重构建并重新验证。

## 完成检查

- 目标页面来自显式 Require 页面索引或既有 Draft；目录与稳定 Module、Layout、Page、Component 标识一致，页面行为只覆盖其映射 FR。
- 页面通过 QML 完整表达组件树、属性、布局、绑定、状态、事件、动画、复用、响应式和主题。
- QML 通过 Qt for WebAssembly 生成网页应用，没有桌面构建要求，也没有并行 HTML/Web Components 实现。
- CMake 清单覆盖所有实际 QML、JavaScript 模块和资产，`main.cpp → App.qml → 目标页面` 启动链完整，目标页全部 required 输入和可见控件已接线。
- `View.qml`、共享组件和 `.mjs` 符合语法规范；没有 `.ui.qml`、`index.js`、TypeScript、JSX 或平台插件。
- 临时数据、账户和写操作只存在 Draft 内存，所有可见控件和声明状态都有可观察结果。
- `Theme.qml` 与 `DESIGN.md` 同步；没有重复硬编码已有 Token。
- 已运行可用的格式、lint、WASM 构建和浏览器检查；已安装工具不存在失败项，未执行项有明确缺失工具与原因。
- 关键控件布局审计通过，字体资源加载成功；最终结论严格使用“视觉已验证”“仅结构与交互已验证”或“仅构建已验证”，没有越级声明。
- `draft M-001:P-001` 只修改目标页面和必要依赖，没有触碰其他文档或生产应用源码。
