# Frontend QML Draft 提示词模板

仅用于 `<doc 组件> tmp frontend draft M-001:P-001`。只生成或更新目标页面及其必要依赖；
未指定 `draft` 时不得加载或执行本模板。

本模板只定义 QML Draft；README、Design Token、转换配置和转换测试由
`templates/frontend-design.template.md` 维护。

## 交付契约

- `draft` 的交付单位是“可启动到目标页的完整应用”，不是单个 `View.qml`、代码片段或目录示意。
- 首次创建 Draft 时，必须在同一次任务中创建可用的 `CMakeLists.txt`、`main.cpp`、`src/App.qml`、`src/Theme.qml`、目标页和其必要数据/组件；缺少其中任何一项都不算完成。
- 更新已有 Draft 时，必须读取现有启动链和构建清单，增量接入目标页并保持其他已登记页面可加载；不得用重写骨架的方式删除已有页面或用户修改。
- 所有创建的 QML、JavaScript 模块和资产必须登记到 CMake 的 QML/资源清单；所有 import、资源路径、页面输入和信号连接必须指向实际存在且大小写一致的目标。
- `main.cpp` 必须加载 CMake 声明的 QML 模块与 `App.qml`；`App.qml` 必须实例化目标页面、提供全部 `required property`，并让目标页成为启动后可观察的首屏或可达页面。
- 禁止交付 TODO、伪代码、空处理器、未接线控件、占位启动页或“后续再补”的构建文件。工具链缺失只降低验证级别，不得把完整源码降级成示例。

## 执行闭环

1. 先确认 Require 页面及映射 FR、Frontend README 中的精确 Qt 版本、可解析的 `design.tokens.json` 和现有 Draft 文件；缺少需求或文档输入时停止，不猜测。
2. 发现本机 Qt、CMake、Ninja、Emscripten 及已有项目命令；优先使用 README 声明版本对应的 `qt-cmake` 和 Qt WebAssembly 工具链，不把本机偶然安装路径写入项目。
3. 若精确版本、Kit、工具链或本机路径经读取和发现后仍无法唯一确定，或多个可用选择会改变构建结果，暂停该不确定项并通过对话一次询问一个关键问题；同时给出已发现证据和推荐项。用户确认前不得猜测、写入或宣称该项已验证。
4. 首次页面创建完整启动链；已有页面只补齐本次目标和维持启动所需的文件，并同步 CMake QML/资源清单。
5. 生成主题、格式化、lint、配置、构建并启动检查；遇到源码、资源、CMake 或运行错误时修复后重跑，不能把失败的构建当成完成。
6. 最终区分“WebAssembly 已在浏览器运行”与“源码完整但因缺少具体工具链未验证”，并给出实际执行命令和首个失败原因。

## `draft` 页面范围

- 页面标识必须严格符合 `M-<三位编号>:P-<三位编号>`。
- 已存在的页面可从 `draft/src/M-001/P-001/` 确认；创建新页面必须显式给出 `req <需求组件>`，并能在 Require 中找到该页面及功能依据，否则停止。
- 只读取 README、`design.tokens.json`、现有 Draft 依赖和显式 `req`；不读取或依赖 `ux.md`、`state.md`、`mapping.md`。
- 只创建或修改目标页面 `draft/src/M-001/P-001/**`、其引用的 `draft/src/M-001/LAYOUT-*/**`，以及预览目标页必需的
  `draft/src/App.qml`、`draft/src/MockStore.qml`、`draft/src/Theme.qml`、`draft/src/shared/**` 和构建入口。
- 共享文件只做注册、导航、主题和渲染当前页所需的最小修改，保留其他页面及用户修改。
- 不修改 README、`design.tokens.json`、`configuration.md` 或 `testing.md`；`draft` 与 `opt` 互斥。

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
- 资产优先放 `src/assets/`；只被单页使用且与页面一起删除的资产可放页面的 `assets/`。
- `M-001` 等带连字符目录不得作为 QML Module URI；使用相对目录导入并指定别名。

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

## Design Token 与主题

- `design.tokens.json` 是颜色、字体、间距、尺寸、圆角、阴影和动效的唯一事实源。
- Draft Agent 每次执行时直接从 Token 确定性生成 `src/Theme.qml`；“禁止手工编辑”指不得绕过 Token 猜值或在生成结果中维护第二份主题，不要求另建生成器程序。
- QML 只使用 `Theme.colorPrimary`、`Theme.spaceSmall` 等稳定属性；生成器负责 DTCG 类型到 QML 类型和单位的确定性转换。
- 目标平台由 `<dev 组件>` 从原始 JSON 生成主题，不解析 QML 生成物。

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
- WebAssembly 构建生成 HTML、JavaScript loader 和 `.wasm` 静态文件，通过本地 HTTP 服务器预览；不另写 HTML/CSS 版 Draft。
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

## 完成检查

- 目标页面来自显式 Require 页面索引或既有 Draft；目录与稳定 Module、Layout、Page、Component 标识一致，页面行为只覆盖其映射 FR。
- 页面通过 QML 完整表达组件树、属性、布局、绑定、状态、事件、动画、复用、响应式和主题。
- QML 通过 Qt for WebAssembly 生成网页应用，没有桌面构建要求，也没有并行 HTML/Web Components 实现。
- CMake 清单覆盖所有实际 QML、JavaScript 模块和资产，`main.cpp → App.qml → 目标页面` 启动链完整，目标页全部 required 输入和可见控件已接线。
- `View.qml`、共享组件和 `.mjs` 符合语法规范；没有 `.ui.qml`、`index.js`、TypeScript、JSX 或平台插件。
- 临时数据、账户和写操作只存在 Draft 内存，所有可见控件和声明状态都有可观察结果。
- `Theme.qml` 与 `design.tokens.json` 同步；没有重复硬编码已有 Token。
- 已运行可用的格式、lint、WASM 构建和浏览器检查；已安装工具不存在失败项，未执行项有明确缺失工具与原因。
- `draft M-001:P-001` 只修改目标页面和必要依赖，没有触碰其他文档或生产应用源码。
