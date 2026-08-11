# Frontend Design System 模板

仅用于 `<doc 组件> tmp frontend req <需求组件> design`。未指定 `design` 时不得加载或执行本模板。

用户在任务正文中给出视觉方向，例如：

```text
<doc browser> tmp frontend req require design
- 外贸商城风格
```

视觉方向是设计目标，不得覆盖已确认的产品行为、权限、状态、终端或品牌事实。

## 交付契约

- 只创建或修改当前组件根目录的 `DESIGN.md`；不修改 README、Require、页面、资产、Draft、Configuration、Testing 或生产代码。
- `DESIGN.md` 是唯一设计系统事实源，使用 Google Labs DESIGN.md alpha 格式：YAML frontmatter 保存规范 Token，Markdown 正文保存设计理由、规则、页面特例和 Do/Don't。
- Require 是产品事实源；HTML、CSS、JavaScript、截图和现有界面是视觉参考。设计不得新增或改写产品能力。

## 输入与事实所有权

执行前读取当前组件已有 `DESIGN.md`、全部可用页面和资产，并递归读取显式 `req` 组件：

| 输入 | 使用方式 |
|---|---|
| `README.md` | 页面、角色、入口、直接导航和页面 ↔ FR |
| `context.md` | 用户、使用环境、终端、输入方式、语言和内容环境 |
| `FR-*.md` | 页面业务输入、成功结果和失败结果 |
| `BR-*.md` | 操作限制、状态条件和反馈结果 |
| `FLOW-*.md` | 跨页面操作顺序、分支和业务状态变化 |
| `AC-*.feature` | 必须设计的成功、失败及其他可观察状态 |
| `NFR-*.md` | 视口、响应式、可访问性、性能和兼容性约束 |
| `PERM-*.md`、`security.md` | 数据可见范围、允许操作、敏感信息和隐私基线 |
| `draft/src/M-*/P-*/index.html` | 已确认的视觉层级、布局、computed style、响应式和演示交互 |
| 截图与 `draft/src/assets/` | 品牌、图片、图标和字体依据 |

只分析 `active` 页面及其真实关联文件。发现断链、编号错误或事实冲突时不修改 Require；若会影响设计结果，通过对话一次询问一个关键问题并给出证据和推荐项。

## 事实优先级

1. Require 中已确认的业务行为、权限、状态和可测约束。
2. 已确认的品牌规范和品牌资产。
3. 可运行页面的实际视觉与交互结果。
4. 已有 `DESIGN.md` 中仍有效的设计决定。
5. 截图和任务正文中的风格方向。

HTML、截图或风格描述不得覆盖 Require。仅影响局部且可安全决定的视觉问题由 Agent 作出一致决定并记录，不逐项询问。

## 执行

1. 从 README 建立“角色 → 模块 → 页面 → FR → 直接导航”视图，覆盖全部 active 页面，不只分析单页。
2. 从 FR、BR 和 FLOW 提取页面内容、操作限制、反馈结果、顺序和分支。
3. 从 AC 提取真实存在且用户需要观察或处理的状态；不得机械补齐不存在的状态，例如 loading、empty、error、disabled、success 或 unauthorized。
4. 从 context、NFR、PERM 和 security 提取终端、语言、内容规模、响应式、可访问性、数据可见性和隐私约束。
5. 支持浏览器时运行页面并检查 computed style、目标视口和交互；支持图片时再做视觉比较。不支持时读取源文件并明确验证能力限制。
6. 提取跨页面 Token、Layout 规则、组件规则和交互状态；页面差异只有反复适用时才提升为全局规则，否则登记为页面特例。
7. 已有 `DESIGN.md` 时保留仍有效的决定，不无理由整体覆盖。

## DESIGN.md 内容

按项目实际需要覆盖品牌原则、语义颜色、字体、间距、尺寸、栅格、断点、圆角、边框、阴影、层级、动效、公共页面骨架、实际组件、交互状态、业务状态、可访问性、角色可见性、响应式行为和页面特例。

- Frontmatter Token 使用稳定语义名称和可解析引用，不把每页零散 CSS 机械转换成 Token。
- Markdown 说明设计意图和使用方式，不重复或覆盖 Token 值。
- 受关键需求约束的规则可引用 `M-001:P-001`、`M-001/FR-001`、`M-001/AC-001` 等稳定标识，但不复制需求正文。
- 不写 API、数据库、框架、DOM、QML 组件结构或平台实现。
- 不在 `DESIGN.md` 外创建第二份 Token 或设计事实。

## 完成检查

- 全部 active 页面均已分析，关键设计决定有 Require、品牌、现有页面或明确设计判断作为依据。
- Require 的角色、导航、结果、状态、终端和权限没有被改写；业务状态与 AC 一致。
- Token 引用没有循环或缺失，命名、类型和单位一致；Markdown 与 YAML 不冲突。
- 页面特例有适用范围，未污染全局 Token；敏感数据和操作可见性符合 PERM 与 security。
- 使用项目已有 `@google/design.md` 时运行 `npx @google/design.md lint DESIGN.md`。
- 只修改了 `DESIGN.md`；未执行的浏览器、图片、视觉或 lint 验证不得声明为通过。

最终回复只列出分析范围、主要设计决定、页面特例、Require 断链或冲突、未确认问题和实际验证结果。
