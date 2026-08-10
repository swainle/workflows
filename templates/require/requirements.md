# Require 需求规则

仅由 `templates/require.template.md` 加载。Issue 是可选需求输入；其编号只标识来源，不进入目录名或文档编号。

## 需求评审重点

- 产品与领域专家：确认目标、范围、角色、模块、页面、FR 和业务语言。
- 权限与风险专家：确认 PERM、NFR、安全、隐私、边界和例外。
- 验收专家：确认 FLOW、AC、TC、Mermaid 追溯图和可执行场景。

## 分析流程

1. 读取当前组件 `README.md`；指定 `issue <编号>` 时再读取该 Issue，否则以用户任务为需求输入。
2. 读取索引中 `active / replaced / removed` 的全部 `M-*/FR-*.md`，并校验索引与文件一一对应；不得用候选筛选代替全量读取。
3. 从 README 建立“模块 → 页面 ↔ FR”关系视图，再按“模块 × 角色 × 业务对象 × 动作”建立全量 CRUD 视图，识别孤立页面、无效引用、重复、冲突、被替代能力和可能缺口。缺少某个 CRUD 动作不自动构成需求，由专家根据业务必要性判定。
4. 再读取受当前需求输入影响 FR 的 Mermaid 直接关联 BR、FLOW、NFR、PERM、AC 和 TC；不无差别加载全部关联文件。
5. 专家团分别对比当前需求输入、全量 CRUD 视图与已有事实；主 Agent 合并结论、去重并解决专家间的分歧。
6. 每项能力在写入前必须得到唯一分类：
   - `REUSE`：已有 FR 完整覆盖，直接复用。
   - `EXTEND`：FR 行为不变，只新增或调整页面映射、BR、FLOW、NFR、PERM、AC 或 TC。
   - `UPDATE`：只澄清文字，不改变 FR 的可观察含义，原地修改。
   - `REPLACE`：五个 FR 业务字段的可观察含义改变，新建 FR 并将旧项标记为 `replaced`。
   - `ADD`：已有需求没有对应能力，新建 FR。
   - `REMOVE`：明确移除能力，将已有 FR 标记为 `removed`。
   - `CONFLICT`：当前需求输入与已有事实冲突且无法从现有信息决定。
7. `CONFLICT` 或专家分歧会改变行为、契约、安全、数据或兼容性时，在写入前询问用户；其他情况由主 Agent 选择最小一致方案。
8. 按分类增量更新事实源，最后同步 `README.md` 索引和 FR Mermaid 投影。

## 目录

```text
docs/<组件>/
├─ README.md
├─ M-001/
│  ├─ FR-001.md
│  ├─ BR-001.md
│  ├─ FLOW-001.md
│  ├─ NFR-001.md
│  ├─ PERM-001.md
│  └─ AC-001.feature
└─ M-002/
   └─ FR-001.md
```

- `README.md`：组件入口，保存组件职责、角色以及按模块组织的页面和全部 FR 索引。
- `M-<三位编号>/`：模块目录；该模块的 FR、BR、FLOW、NFR、PERM 和 AC 全部直接放在目录内，不再按类型建立子目录。
- 每个 FR 一个 Markdown，完整行为只在该文件定义；AC 的唯一事实源是同目录的 `.feature`，一个 AC 对应一个 `.feature`，包含一个或多个 TC。
- 只创建实际需要的文件和目录，不创建空模板。

模块在当前组件内使用连续且唯一的 `M-001`、`M-002`。每个模块内的页面使用 `P-001`、`P-002`，FR、BR、FLOW、NFR、PERM 和 AC 分别从 `001` 独立递增分配，
新增项使用同类历史最大编号加一；例如 `M-001/FR-001` 与 `M-002/FR-001` 可以同时存在。同模块内可以使用 `FR-001` 等短标识；
跨模块 FR 引用必须使用 `M-001/FR-001`，跨模块页面引用必须使用 `M-001:P-001`。已有编号不因 Issue 或条目的增删而重排或复用，删除后允许保留编号空缺。

## 引用方向

```text
FR → BR / PERM / NFR
FLOW → FR
AC Feature → FR
TC Scenario → AC Feature
```

每个 FR 保留 Mermaid 追溯图。图只是已有关系的投影，不定义新关系；节点必须链接到真实文件。

## `README.md`

```md
# <组件名称>

<组件职责>

## 角色索引

| 角色 | 职责 |
|---|---|
| 患者 | 创建和管理自己的预约 |

## 模块、页面与功能索引

### M-001 账户与认证

#### 页面索引

| 页面 | 名称 | 角色 | 入口 | 功能 | 目标页面 | 状态 | 来源 |
|---|---|---|---|---|---|---|---|
| `P-001` | 登录页 | 用户 | 访问受保护能力或选择登录 | [FR-002](M-001/FR-002.md) | 无 | active | [#1](https://github.com/swainle/d5/issues/1) |

#### 功能需求索引

| FR | 功能标识 | 主体 | 名称 | 动作 | 状态 | 来源 |
|---|---|---|---|---|---|---|
| `FR-001` | **user-register** | 用户 | 用户注册 | create | active | [#1](https://github.com/swainle/d5/issues/1) |
| `FR-002` | **user-login** | 用户 | 用户登录 | create | active | [#1](https://github.com/swainle/d5/issues/1) |
| `FR-003` | **user-logout** | 用户 | 用户登出 | delete | active | [#1](https://github.com/swainle/d5/issues/1) |
```

- 模块是稳定的业务能力分组，不是页面、代码目录、Frontend、Backend、API 或数据库。模块编号使用 `M-<三位编号>`，名称使用稳定业务名词。
- 每个模块使用 `### M-<三位编号> <模块名称>` 三级标题；存在页面时先放一张页面表，再放一张独立 FR 表。模块、页面和 FR 按编号升序，首个页面和 FR 分别使用 `P-001`、`FR-001`，新增编号使用同类历史最大编号加一，不填补空缺。
- 每个 FR 只属于一个主模块；跨模块协作由 FLOW 表达。只有业务目标、规则或生命周期明确独立时才新建模块。
- 页面是角色可观察和操作的界面，不是业务流程步骤、Layout、代码路由或组件。每个页面只属于一个主模块；页面可以映射多个 FR，同一 FR 也可以被多个页面使用，唯一关系事实是页面索引的“功能”列。
- 页面表中的 FR 使用相对链接；同模块写 `FR-001`，跨模块写 `M-001/FR-001`。每个 `active` 页面至少映射一个 `active` FR；无界面的 FR 可以不映射页面。页面不得复制或改变 FR 的业务行为。
- “入口”使用业务语言说明角色如何到达页面；“目标页面”只登记直接导航目标，同模块写 `P-001`，跨模块写 `M-001:P-001`，多个值用 `<br>` 分隔，没有时写“无”。
- 功能标识使用组件内唯一的粗体 `**kebab-case**`，表达稳定业务能力；FR 编号一一对应当前模块的 `M-<三位编号>/FR-<三位编号>.md`。
- 动作优先使用 `create / read / update / delete`，非 CRUD 能力使用明确业务动词。
- 页面和 FR 状态只使用 `active / replaced / removed`。索引不复制页面实现、FR 正文、追溯关系或验收内容。
- 指定 Issue 时，来源必须使用已读取 Issue 的真实编号和 URL，写为 `[#<编号>](<Issue URL>)`，不得猜测 URL 或输出 `[?](?)`。
- 同一 FR 有多个相关 Issue 时保留已有链接、按 Issue 编号升序去重，并在同一单元格中用 `<br>` 分隔，例如 `[#1](<URL-1>)<br>[#7](<URL-7>)`。
- 指定 Issue 且对 FR 得出 `REUSE / EXTEND / UPDATE / REPLACE / ADD / REMOVE` 结论后，将该 Issue 加入受影响页面和 FR 的来源；`CONFLICT` 未解决时不写入。
- 新 Issue 仅增加 FLOW、AC、BR、NFR 或 PERM 时复用旧 FR；只有五个 FR 业务字段的可观察含义改变时才新建 FR 并替代旧项。

## `M-001/FR-001.md`

````md
# FR-001 <名称>

- 主体：<主要角色>
- 前置条件：<业务条件>
- 输入：<业务输入，没有时写“无”>
- 成功结果：<可观察的成功结果>
- 失败结果：<失败行为>

```mermaid
flowchart LR
    PERM001["PERM-001<br/>权限规则"]
    NFR001["NFR-001<br/>质量要求"]
    FR001["FR-001<br/>功能需求"]
    FLOW001["FLOW-001<br/>业务流程"]
    AC001["AC-001<br/>验收标准"]
    TC001["AC-001-TC-001<br/>成功场景"]
    TC002["AC-001-TC-002<br/>失败或边界场景"]

    PERM001 -->|"访问控制"| FR001
    NFR001 -->|"质量要求"| FR001
    FR001 -->|"展开"| FLOW001
    FR001 -->|"验收"| AC001
    AC001 -->|"验证"| TC001
    AC001 -->|"验证"| TC002

    classDef focus fill:#2563eb,color:#fff,stroke:#1d4ed8,stroke-width:2px
    class FR001 focus

    click PERM001 "PERM-001.md" "查看 PERM-001"
    click NFR001 "NFR-001.md" "查看 NFR-001"
    click FLOW001 "FLOW-001.md" "查看 FLOW-001"
    click AC001 "AC-001.feature" "查看 AC-001"
    click TC001 "AC-001.feature" "查看 AC-001-TC-001"
    click TC002 "AC-001.feature" "查看 AC-001-TC-002"
```
````

每个 FR 固定保留主体、前置条件、输入、成功结果和失败结果五个字段。追溯图只放实际相关节点。

## `M-001/BR-001.md` 业务规则

````md
# BR-001 <规则名称>

```text
PRIORITY 100

REQUIRES ALL PERMISSIONS
  patient:appointment:create
  patient:schedule:read

INPUT
  当前时间
  预约时间
  排班状态

IF 排班状态 != 可用 OR 预约时间 <= 当前时间 THEN
  REJECT "排班或预约时间不可用"
ELSE IF 排班状态 = 可用 AND NOT 预约时间 <= 当前时间 THEN
  SET 预约状态 = 待确认
  ALLOW
  RETURN 预约状态
ELSE
  REJECT "无法创建预约"
END
```
````

BR 只保留一级标题和一个伪代码规则块。伪代码语法：

- `PRIORITY <整数>` 只在规则可能冲突时使用，数值越大越先判定。
- 单权限写 `REQUIRES PERMISSION <权限>`；多权限全部必需写 `REQUIRES ALL PERMISSIONS`，任一满足写 `REQUIRES ANY PERMISSION`。
- `INPUT` 后每行缩进两个空格声明一个必要业务事实。
- 分支只使用 `IF / ELSE IF / ELSE / END`，条件按优先级从高到低排列，组合只使用 `AND / OR / NOT`。
- 结果只使用 `ALLOW`、`REJECT "<原因>"`、`SET <业务事实> = <值>` 和 `RETURN <结果>`。
- 内容缩进两个空格，文本值使用双引号，注释使用 `# ` 且不得代替规则。
- 权限必须已在 PERM 表登记。只使用业务名词，禁止编程语言语法、函数、类、数据库字段、API、JWT 或框架详情。

## `M-001/FLOW-001.md` 业务流程

````md
# FLOW-001 <流程名称>

- 参与者：<角色>
- 开始条件：<触发条件>
- 成功结束：<成功状态>
- 失败结束：<失败状态>
- 需求：
  - [FR-001](FR-001.md)

```mermaid
sequenceDiagram
    autonumber
    actor User as <用户>
    participant System as <系统>

    User->>System: <发起业务操作>
    alt 成功条件
        System-->>User: <成功结果>
    else 失败条件
        System-->>User: <失败结果>
    end
```

```mermaid
stateDiagram-v2
    [*] --> <初始状态>
    <初始状态> --> <成功状态>: <成功事件>
    <初始状态> --> <失败状态>: <失败事件>
    <成功状态> --> [*]
    <失败状态> --> [*]
```
````

文字足以说明时省略图。多角色交互、顺序、分支或回路使用 `sequenceDiagram`；
业务对象存在多个状态和受限转换时追加 `stateDiagram-v2`。两种图都只表达业务事实，不写 API、数据库或组件内部调用。

## `M-001/NFR-001.md` 非功能需求

```md
# NFR-001 <名称>

- 类别：<性能|安全|可用性|兼容性等>
- 适用范围：<范围>
- 指标：<可测量指标>
- 阈值：<明确阈值>
- 测试条件：<环境和数据条件>
- 测量方法：<方法>
- 失败标准：<失败判定>
```

## `M-001/PERM-001.md` 权限规则

```md
# PERM-001 <权限名称>

| 权限标识 | 角色 | 资源 | 动作 | 范围 | 允许条件 | 审计 |
|---|---|---|---|---|---|---|
| `patient:appointment:create` | 患者 | 预约 | 创建 | 本人 | 患者已登录 | 记录患者、排班和时间 |
```

PERM 表是权限标识的唯一登记处。标识使用小写 `<role>:<resource>:<action>`，不指定 JWT、中间件、API 路由或授权引擎。

## `M-001/AC-001.feature` 与 TC

AC 直接写入模块目录的 `AC-001.feature`，不创建 AC Markdown。为避免不同模块的同号标签冲突，Gherkin 标签带模块编号：

```gherkin
@M-001-AC-001
@M-001-FR-001
Feature: <验收目标>

  @M-001-AC-001-TC-001
  Scenario: <成功场景>
    Given <初始业务状态>
    When <用户操作>
    Then <一个主要可观察结果>
    And <其他可观察结果>

  @M-001-AC-001-TC-002
  Scenario: <失败或边界场景>
    Given <初始业务状态>
    When <用户操作>
    Then <失败结果>
    And <不应发生的结果>
```

- 一个 `.feature` 只定义一个 AC，可以包含多个 `Scenario` 或 `Scenario Outline`。
- TC 按 `AC-<AC>-TC-<TC>` 编号，在每个 AC 内从 `001` 独立递增分配；新增 TC 使用历史最大编号加一，已有 TC 不重排、不复用，删除后允许空缺。
  跨模块使用带 `M-<模块>` 前缀的 Gherkin 标签。
- `Examples` 行只是同一 TC 的数据变体，不创建新 TC 编号。
- Given/When/Then 使用业务语言，不写数据库、框架或内部实现断言。

## 完成检查

- `README.md` 包含组件职责、角色以及按模块分组的页面和 FR 索引；每个 active 页面至少映射一个 active FR，每个 FR 编号都对应所属模块内唯一的 `M-*/FR-*.md`，所有 Issue 来源链接真实、去重且完整。
- FR 可验证，NFR 可度量；BR、FLOW、NFR 和 PERM 只在需要时创建。
- 每个 FR 的 Mermaid 节点均存在且链接正确。
- BR 只有一级标题和伪代码规则；必要权限均已在 PERM 表登记。
- AC 只存在于同编号 Feature，TC 在所属 AC 内唯一，没有 AC Markdown。
- Issue 编号只出现在来源中，不出现在目录、FR 或其他文档编号中。
- 每项输入能力已在读取相关需求并经专家团评审后归入唯一变更分类。
- 没有把设计、接口、数据库或实现选择写成需求事实。
