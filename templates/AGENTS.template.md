# AI 项目工作流

本区块由 `docs/workflows/install.mjs` 管理。宿主 `AGENTS.md` 的其他规则优先。

## 基本规则

- 当前磁盘内容是事实；保留用户修改，不改无关文件，不写过程报告。
- 默认使用中文；代码标识、协议字段和命令沿用项目约定。
- 阶段只能写自己的产物，只读完成任务所需的前置产物。
- 路径必须位于授权目录，不得包含 `..` 或经符号链接越界。
- 删除、生产变更、迁移、回滚和外部部署仍需明确确认。

## 审慎推理

- 回答或执行前，先检查问题是否包含错误前提、逻辑跳跃或影响结论的信息缺失。
- 独立推断，不以迎合用户或附和其预设结论为目标。
- 明确区分已核实事实、尚未核实的推测和主观观点，不把后两者表述成事实。
- 涉及数字、人物或关键结论时，在任务范围和工具允许内优先核实可靠来源；无法核实时明确说明。
- 不同意用户判断时直接指出，并给出依据、风险和合理的替代解释。
- 主动提醒用户可能忽略的重要变量、成本、约束和认知偏差。

## 版本门禁

处理下述尖括号指令前，比较：当前任务采用的 SHA、宿主托管区块的
`workflows-revision`、`git -C docs/workflows rev-parse HEAD`。三者不一致时最多执行一次：

```bash
node docs/workflows/install.mjs --workflows-updated
```

然后重读本文件并重新解析指令；仍不一致则停止。加载对应阶段和模板后、执行任务前输出：

```text
提示词版本：<完整 SHA>（一致）
已加载：<阶段文件和模板文件>
```

普通自然语言任务不执行此门禁。

## 组件

- `docs/` 下每个一级目录都是文档组件，`docs/workflows/` 除外。
- 组件入口固定为 `docs/<组件>/README.md`，不接受其他入口文件名。
- `<doc 组件>` 可以创建组件；其他组件指令要求目录和 README 已存在。
- 没有应用目录的组件不支持 `<dev 组件>` 和 `<test 组件>`，但仍可使用文档和 Docker 指令。
- 非纯文档组件必须在 README 中包含唯一应用目录和开发模板，格式如下：

  ```md
  应用目录：`apps/api/`
  开发模板：`backend`
  ```
- 开发模板只能是 `frontend` 或 `backend`。
- 应用目录从 README 解析，不按组件名猜测，也不再依赖中央组件清单。

## 指令语法

只解析消息开头第一对真实尖括号。指令头如下：

```text
<doc 组件> [tmp require|frontend|backend|docker] [req 需求组件 [issue 编号]] [issue 编号] [ux M-001:P-001|opt 文件] 任务
<dev 组件> [opt 文件] 任务
<test 组件> [opt 文件] 任务
<docker 组件> [opt 文件] 任务
<test> [opt 文件] 全局验收任务
<docker> [opt 文件] 全局容器编排任务
<docker update> [opt 文件] 升级方案任务
```

参数按上面的顺序出现，每种最多一次：

- `tmp require|frontend|backend|docker`：加载相应模板；`require` 统一维护需求、追溯和全局设计，
  `docker` 维护组件容器编排文档。
- `req <需求组件>`：递归读取该组件的全部文件。
- `req <需求组件> issue <编号>`：在上述文件之外读取对应 Issue，用于限定当前任务；Issue 编号不对应文档目录。
- `<doc 组件> tmp require [issue <编号>]`：总是加载 Require 专家团、需求分析和架构规则；
  `issue` 可选，用于读取并限定特定需求。组件名没有保留值，`require` 只是普通名称。
- `ux M-<三位编号>:P-<三位编号>`：只能与 `tmp frontend` 同时使用，将写入范围收窄为
  `ux.md` 中该页面可预览所需的 Draft 文件；与 `opt` 互斥。页面标识不存在时停止，不猜测页面。
- `opt <文件>`：将写入范围收窄为一个阶段内相对路径；禁止删除、移动和顺手修改关联文件。
- 对尚不存在的组件使用 `opt` 时，目标只能是 `README.md`；其他目标需要先建立组件入口。
- `issue` 紧跟 `req <组件>` 时限定被引用组件；没有 `req` 时只能与 `tmp require` 同时使用。
  其他位置的 `issue`、不符合 `M-001:P-001` 格式的 `ux` 值或未列出的 `tmp` 值都是未知语法。
  一条指令只允许出现一个 `issue`。

组件名只能包含字母、数字、点、下划线和连字符。保留全局指令优先于组件名；格式错误、
未知参数、引用组件不存在、Issue 无法读取或开发、组件测试所需的应用目录缺失时停止并说明原因。

## 阶段路由

识别后完整读取对应文件；`tmp` 和 `issue` 再加载所列模板：

| 指令 | 必读文件 |
|---|---|
| `<doc 组件>` | `docs/workflows/stages/doc.md` |
| `<doc 组件> tmp require [issue 编号]` | `stages/doc.md`、`templates/require.template.md`、`templates/require/requirements.md`、`templates/require/architecture.md` |
| `<doc 组件> tmp frontend` | `stages/doc.md`、`templates/frontend-design.template.md` |
| `<doc 组件> tmp backend` | `stages/doc.md`、`templates/backend-design.template.md` |
| `<doc 组件> tmp docker` | `stages/doc.md`、`templates/docker-design.template.md` |
| `<dev 组件>` | `docs/workflows/stages/dev.md` |
| `<test 组件>` | `docs/workflows/stages/component-test.md` |
| `<test>` | `docs/workflows/stages/test.md` |
| `<docker 组件>`、`<docker>`、`<docker update>` | `docs/workflows/stages/docker.md` |

用户明确给出多个阶段时，按 doc → dev → test → docker 顺序分别执行，不合并权限。

## 专家团协作

Require、Frontend、Backend 和 Docker 模板各自定义专家团。加载模板后：

1. 主 Agent 负责范围、权限、最终决策、文件修改和验证。
2. 环境支持子 Agent 时，最多并行启动三个模板专家；专家只读取当前阶段允许的必要事实，不修改文件。
3. 每个专家只返回“决策、风险、建议、阻塞”。主 Agent 去重、检查依据并解决冲突。
4. 会改变需求、行为、契约、安全、数据或兼容性的冲突交给用户确认；其他冲突由主 Agent 选择最小可行方案。
5. 环境不支持子 Agent 时，主 Agent 按相同专家视角依次评审并说明降级，不跳过适用视角。
6. `opt` 仍只允许主 Agent 修改唯一目标文件；专家团不扩大读取、写入或阶段范围。

`<dev 组件>` 和 `<test 组件>` 从 README 唯一的 Frontend 或 Backend 开发模板声明选择对应专家团；
缺失、重复或值未知时停止。Require 和 Docker 是文档模板，不用于开发或组件测试。

## 权限与确认

阶段文件的权限表以 `**` 全禁为默认；更具体的规则仅覆盖对应操作。创建、读取、修改、删除
互不隐含，移动同时要求源删除和目标创建权限。

需求、文档设计或开发任务若存在会改变行为、契约、安全、数据、兼容性或目录映射的歧义，
一次询问一个最关键问题；确认后再写入。测试和 Docker 阶段只在预期不唯一、扩大范围或产生外部副作用时确认。

## 消息结尾

以下控制仅作用于本工作流指令：

| 结尾 | 行为 |
|---|---|
| `?`、`？` | 只回答，不修改 |
| `,`、`，` | 不修改，一次澄清一个问题 |
| `.`、`。` | 修改并验证，不提交 |
| `!`、`！` | 修改并验证，提交并推送 |

没有控制符时遵循当前任务要求。高风险操作不因结尾符跳过确认。

## 完成标准

- 检查所有文件操作符合阶段权限，没有覆盖无关修改或写入凭据。
- 执行阶段完成检查和与风险相称的现有验证，如实报告通过、失败与未执行。
- 最终回复只说明完成内容、修改文件、验证结果和剩余风险。
