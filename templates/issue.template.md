# Issue 需求模板

用于 `<doc 组件> issue <编号>`。Issue 编号只标识需求来源，不进入目录名或文档编号。

## 专家团

- 产品与领域专家：确认目标、范围、角色、FR、BR 和业务语言。
- 权限与风险专家：确认 PERM、NFR、安全、隐私、边界和例外。
- 验收专家：确认 FLOW、AC、TC、Mermaid 追溯图和可执行场景。

专家只读分析并返回决策、风险、建议和阻塞；主 Agent 统一修改与验证。

## 目录

```text
docs/<组件>/
├─ README.md
├─ requirement.md
├─ fr/
│  └─ FR-001.md
├─ br/
│  └─ BR-001.md
├─ flow/
│  └─ FLOW-001.md
├─ nfr/
│  └─ NFR-001.md
├─ perm/
│  └─ PERM-001.md
└─ features/
   └─ AC-001.feature
```

- `requirement.md`：只保存角色索引和全部 FR 的索引。
- `fr/`：每个 FR 一个 Markdown，完整行为只在该文件定义。
- `br/`、`flow/`、`nfr/`、`perm/`：分别保存需要独立引用的 BR、FLOW、NFR 和 PERM。
- `features/`：AC 的唯一事实源；一个 AC 对应一个 `.feature`，包含一个或多个 TC。
- 只创建实际需要的文件和目录，不创建空模板。

编号为 `FR-001`、`BR-001`、`FLOW-001`、`NFR-001`、`PERM-001` 和 `AC-001`，均在当前组件内同类连续且唯一。
TC 使用 `AC-001-TC-001`，在所属 AC 内从 `001` 独立编号。已有编号不因 Issue 或其他条目的增删而重排。

## 引用方向

```text
FR → BR / PERM / NFR
FLOW → FR
AC Feature → FR
TC Scenario → AC Feature
```

每个 FR 保留 Mermaid 追溯图。图只是已有关系的投影，不定义新关系；节点必须链接到真实文件。

## `requirement.md`

```md
# 需求索引

## 角色索引

| 角色 | 职责 |
|---|---|
| 患者 | 创建和管理自己的预约 |

## 功能需求索引

| FR | 功能标识 | 名称 | 主体 | 业务对象 | 动作 | 状态 | 来源 |
|---|---|---|---|---|---|---|---|
| `FR-001` | [patient-create-appointment](./fr/FR-001.md) | 创建预约 | 患者 | 预约 | create | active | <Issue URL> |
```

- 功能标识使用唯一的 `kebab-case`，表达稳定业务能力；文件路径使用 `fr/FR-<三位编号>.md`。
- 动作优先使用 `create / read / update / delete`，非 CRUD 能力使用明确业务动词。
- 状态只使用 `active / replaced / removed`。索引不复制 FR 正文、追溯关系或验收内容。
- 新 Issue 仅增加 FLOW、AC、BR、NFR 或 PERM 时复用旧 FR；只有五个 FR 业务字段的可观察含义改变时才新建 FR 并替代旧项。

## `fr/FR-001.md`

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

    click PERM001 "../perm/PERM-001.md" "查看 PERM-001"
    click NFR001 "../nfr/NFR-001.md" "查看 NFR-001"
    click FLOW001 "../flow/FLOW-001.md" "查看 FLOW-001"
    click AC001 "../features/AC-001.feature" "查看 AC-001"
    click TC001 "../features/AC-001.feature" "查看 AC-001-TC-001"
    click TC002 "../features/AC-001.feature" "查看 AC-001-TC-002"
```
````

每个 FR 固定保留主体、前置条件、输入、成功结果和失败结果五个字段。追溯图只放实际相关节点。

## `BR` 业务规则

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

## `FLOW` 业务流程

````md
# FLOW-001 <流程名称>

- 参与者：<角色>
- 开始条件：<触发条件>
- 成功结束：<成功状态>
- 失败结束：<失败状态>
- 需求：
  - [FR-001](../fr/FR-001.md)

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

## `NFR` 非功能需求

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

## `PERM` 权限规则

```md
# PERM-001 <权限名称>

| 权限标识 | 角色 | 资源 | 动作 | 范围 | 允许条件 | 审计 |
|---|---|---|---|---|---|---|
| `patient:appointment:create` | 患者 | 预约 | 创建 | 本人 | 患者已登录 | 记录患者、排班和时间 |
```

PERM 表是权限标识的唯一登记处。标识使用小写 `<role>:<resource>:<action>`，不指定 JWT、中间件、API 路由或授权引擎。

## `AC` 与 `TC`

AC 直接写入 `features/AC-001.feature`，不创建 AC Markdown：

```gherkin
@AC-001
@FR-001
Feature: <验收目标>

  @AC-001-TC-001
  Scenario: <成功场景>
    Given <初始业务状态>
    When <用户操作>
    Then <一个主要可观察结果>
    And <其他可观察结果>

  @AC-001-TC-002
  Scenario: <失败或边界场景>
    Given <初始业务状态>
    When <用户操作>
    Then <失败结果>
    And <不应发生的结果>
```

- 一个 `.feature` 只定义一个 AC，可以包含多个 `Scenario` 或 `Scenario Outline`。
- TC 按 `AC-<AC>-TC-<TC>` 编号，在每个 AC 内从 `001` 独立连续；已有 TC 不重排。
- `Examples` 行只是同一 TC 的数据变体，不创建新 TC 编号。
- Given/When/Then 使用业务语言，不写数据库、框架或内部实现断言。

## 完成检查

- `requirement.md` 只有角色索引和 FR 索引，每个 FR 链接都指向唯一 `fr/FR-*.md`。
- FR 可验证，NFR 可度量；BR、FLOW、NFR 和 PERM 只在需要时创建。
- 每个 FR 的 Mermaid 节点均存在且链接正确。
- BR 只有一级标题和伪代码规则；必要权限均已在 PERM 表登记。
- AC 只存在于同编号 Feature，TC 在所属 AC 内唯一，没有 AC Markdown。
- Issue 编号只出现在来源中，不出现在目录、FR 或其他文档编号中。
- 没有把设计、接口、数据库或实现选择写成需求事实。
