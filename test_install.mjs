import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  WORKFLOW_ROOT,
  installAgents,
  installBranch,
  mergeAgents,
  parseBranch,
  updateCurrentBranch,
  validateStageReferences,
} from "./install.mjs";

test("parses the optional selected branch", () => {
  assert.equal(parseBranch([]), undefined);
  assert.equal(parseBranch(["--branch", "develop"]), "develop");
  assert.equal(parseBranch(["--workflows-updated", "--branch", "develop"]), "develop");
  assert.throws(() => parseBranch(["--branch"]));
});

test("updates the workflows branch and reruns installation", () => {
  const calls = [];
  const runner = (command, args, options) => {
    calls.push({ command, args, cwd: options.cwd });
    return { status: args[0] === "show-ref" ? 1 : 0 };
  };
  assert.equal(installBranch("develop", runner), 0);
  assert.deepEqual(calls.map(({ command, args }) => [command, ...args]), [
    ["git", "check-ref-format", "--branch", "develop"],
    ["git", "fetch", "origin", "refs/heads/develop:refs/remotes/origin/develop"],
    ["git", "show-ref", "--verify", "--quiet", "refs/heads/develop"],
    ["git", "switch", "-c", "develop", "origin/develop"],
    ["git", "merge", "--ff-only", "origin/develop"],
    ["git", "submodule", "set-branch", "--branch", "develop", "docs/workflows"],
    [process.execPath, path.join(WORKFLOW_ROOT, "install.mjs"), "--workflows-updated", "--branch", "develop"],
  ]);
});

test("updates the current workflows branch when branch is omitted", () => {
  const calls = [];
  const runner = (command, args, options) => {
    calls.push({ command, args, cwd: options.cwd });
    return { status: 0 };
  };
  assert.equal(updateCurrentBranch(runner), 0);
  assert.deepEqual(calls.map(({ command, args }) => [command, ...args]), [
    ["git", "pull", "--ff-only"],
    [process.execPath, path.join(WORKFLOW_ROOT, "install.mjs"), "--workflows-updated"],
  ]);
});

test("creates, appends, updates, and preserves a managed block", () => {
  const created = mergeAgents("", "# Workflow\n");
  assert.match(created, /^<!-- workflows:begin -->/);
  assert.match(created, /# Workflow/);

  const appended = mergeAgents("# Host rules\n", "# Workflow\n");
  assert.match(appended, /^# Host rules[\s\S]*<!-- workflows:begin -->/);

  const updated = mergeAgents(appended, "# Workflow v2\n");
  assert.match(updated, /^# Host rules/);
  assert.match(updated, /# Workflow v2/);
  assert.doesNotMatch(updated, /# Workflow\n/);
  assert.equal(mergeAgents(updated, "# Workflow v2\n"), updated);
});

test("ignores marker examples inside managed content", () => {
  const template = [
    "# Workflow",
    "",
    "The installer uses `<!-- workflows:begin -->` and `<!-- workflows:end -->` markers.",
    "",
  ].join("\n");
  const installed = mergeAgents("", template);
  assert.equal(mergeAgents(installed, template), installed);
  assert.match(mergeAgents(installed, `${template}Updated.\n`), /Updated\./);
});

test("rejects damaged or duplicated managed markers", () => {
  assert.throws(() => mergeAgents("<!-- workflows:begin -->\n", "# Workflow\n"), /invalid workflows markers/);
  assert.throws(() => mergeAgents("<!-- workflows:end -->\n", "# Workflow\n"), /invalid workflows markers/);
  assert.throws(() => mergeAgents(
    "<!-- workflows:begin -->\n<!-- workflows:end -->\n<!-- workflows:begin -->\n<!-- workflows:end -->\n",
    "# Workflow\n",
  ), /invalid workflows markers/);
  assert.throws(() => mergeAgents("<!-- workflows:end -->\n<!-- workflows:begin -->\n", "# Workflow\n"), /marker order/);
});

test("validates routed stage files", () => {
  const root = mkdtempSync(path.join(tmpdir(), "workflows-stages-"));
  try {
    const template = "Read `docs/workflows/stages/requirement.md`.\n";
    assert.throws(() => validateStageReferences(template, root), /Missing stage file/);

    mkdirSync(path.join(root, "stages"), { recursive: true });
    writeFileSync(path.join(root, "stages", "requirement.md"), "# Requirement\n", "utf8");
    assert.equal(validateStageReferences(template, root), 1);
    assert.throws(
      () => validateStageReferences("Read `docs/workflows/stages/../outside.md`.\n", root),
      /Invalid stage reference/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("repository AGENTS template routes every stage file", () => {
  const template = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  assert.equal(validateStageReferences(template), 6);
});

test("defines bilingual message ending controls", () => {
  const template = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  assert.match(template, /最后一个字符/);
  assert.match(template, /\| `\?` 或 `？` \|[^|]+不修改文件 \|/);
  assert.match(template, /\| `!` 或 `！` \|[^|]+提交并推送[^|]+ \|/);
  assert.match(template, /\| `,` 或 `，` \|[^|]+直至完全理解需求 \|/);
  assert.match(template, /\| `\.` 或 `。` \|[^|]+不自动提交或推送 \|/);
});

test("uses Chinese documentation and tests without translating code identifiers", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const development = readFileSync(path.join(WORKFLOW_ROOT, "stages/development.md"), "utf8");
  const testing = readFileSync(path.join(WORKFLOW_ROOT, "stages/testing.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");

  assert.match(agents, /## 语言规则/);
  assert.match(agents, /对话回复、正式文档、测试用例描述和必要的代码注释默认使用中文/);
  assert.match(agents, /类名、函数名、变量名、文件名、包名、环境变量、HTTP 字段、数据库字段和协议名称/);
  assert.match(agents, /中文注释说明设计原因、业务约束和风险，不逐行翻译代码/);

  assert.match(development, /## 代码与注释规则/);
  assert.match(development, /领域不变量、事务边界、锁、并发、幂等、安全边界/);
  assert.match(development, /注释说明“为什么这样设计”和“不能违反什么”/);
  assert.match(development, /简单赋值、参数传递、标准 CRUD 和显而易见的控制流不添加注释/);
  assert.match(development, /没有重复代码含义、已经失效或纯装饰性的注释/);

  assert.match(testing, /## 测试代码规则/);
  assert.match(testing, /测试必须导入真实生产模块，或通过真实的 HTTP、UI、消息、数据库等公开入口执行生产代码/);
  assert.match(testing, /不得在测试文件中重新实现、复制或简化待验证的业务规则/);
  assert.match(testing, /测试辅助代码只能构造数据、创建 fixture、替换外部依赖和收集结果/);
  assert.match(testing, /`describe`、`it`、场景名称和必要注释使用中文/);
  assert.match(testing, /时间、随机数、ID 和外部响应等不稳定依赖必须固定、注入或使用测试框架替换/);
  assert.match(testing, /每个测试执行真实生产代码入口/);
  assert.match(readme, /默认使用中文回复、编写文档和测试描述/);
});

test("requires design-driven development with zero unresolved decisions", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const development = readFileSync(path.join(WORKFLOW_ROOT, "stages/development.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");

  assert.match(development, /## 开发前确认/);
  assert.match(development, /先读取 `component\.md` 的概述、设计架构索引和完整文件结构/);
  assert.match(development, /“任务行为 → 需求或设计依据 → 目标代码文件 → 验证方式”的实现映射/);
  assert.match(development, /没有写明不等于允许自行决定/);
  assert.match(development, /确认一个问题后继续检查，直到未确认项为零/);
  assert.match(development, /用户回答不能替代正式设计/);
  assert.match(development, /不通过降级行为、隐藏错误、临时分支、TODO、占位值或未声明默认值绕过/);
  assert.match(development, /只有实现映射完整、未确认项为零、设计没有冲突且技术可行性已有证据时，才开始修改代码/);
  assert.match(agents, /未确认项清零后才能修改代码/);
  assert.match(readme, /信息缺失、\s*设计冲突或可行性无法证明时先提问或退回相应设计阶段，不猜测实现/);
});

test("defines one CRUD permission matrix per stage", () => {
  const stageRoot = path.join(WORKFLOW_ROOT, "stages");
  const files = readdirSync(stageRoot).filter((file) => file.endsWith(".md"));
  assert.equal(files.length, 6);
  for (const file of files) {
    const content = readFileSync(path.join(stageRoot, file), "utf8");
    assert.equal(content.match(/^## 操作权限$/gm)?.length, 1, file);
    assert.equal(content.match(/^\| 路径模式 \| 创建 \| 读取 \| 修改 \| 删除 \|$/gm)?.length, 1, file);
    assert.match(
      content,
      /^\| 路径模式 \| 创建 \| 读取 \| 修改 \| 删除 \|\r?\n\|---\|---\|---\|---\|---\|\r?\n\| `\*\*` \| 禁止 \| 禁止 \| 禁止 \| 禁止 \|$/m,
      file,
    );
    assert.doesNotMatch(content, /^### (允许读取|允许修改|禁止修改)$/m, file);
  }
});

test("enforces serial stage read and write boundaries", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  assert.match(agents, /目录权限由后代路径继承/);
  assert.match(agents, /多条规则匹配时，路径越具体越优先，并按操作类型覆盖父级权限/);
  assert.match(agents, /路径具体程度相同时，“禁止”优先/);
  assert.match(agents, /每张表的第一条规则必须是 `\| \*\* \| 禁止 \| 禁止 \| 禁止 \| 禁止 \|`/);
  assert.match(agents, /需求 → system → 组件设计 → dev → test → deploy/);
  assert.match(agents, /前置阶段目录只允许读取/);
  assert.match(agents, /后置阶段和无关目录由 `\*\*` 默认规则禁止所有操作/);

  const requirement = readFileSync(path.join(WORKFLOW_ROOT, "stages/requirement.md"), "utf8");
  assert.match(requirement, /\| `docs\/requirements\/\*\*` \| 禁止 \| 允许 \| 禁止 \| 禁止 \|/);
  assert.match(requirement, /\| `docs\/requirements\/REQ-<三位Issue编号>-\*\/\*\*` \| 允许 \| 允许 \| 允许 \| 允许 \|/);
  assert.doesNotMatch(requirement, /`(?:docs\/system|docs\/component|apps)\/\*\*`/);

  const system = readFileSync(path.join(WORKFLOW_ROOT, "stages/system.md"), "utf8");
  assert.match(system, /\| `docs\/requirements\/\*\*` \| 禁止 \| 允许 \| 禁止 \| 禁止 \|/);
  assert.match(system, /\| `docs\/system\/\*\*` \| 允许 \| 允许 \| 允许 \| 允许 \|/);
  assert.doesNotMatch(system, /`(?:docs\/component|apps)\/\*\*`/);

  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  assert.match(component, /\| `docs\/requirements\/\*\*` \| 禁止 \| 允许 \| 禁止 \| 禁止 \|/);
  assert.match(component, /\| `docs\/system\/\*\*` \| 禁止 \| 允许 \| 禁止 \| 禁止 \|/);
  assert.match(component, /\| `<组件设计目录>\/\*\*` \| 允许 \| 允许 \| 允许 \| 允许 \|/);
  assert.doesNotMatch(component, /`apps\/\*\*`|`<组件应用目录>\/\*\*`/);

  const development = readFileSync(path.join(WORKFLOW_ROOT, "stages/development.md"), "utf8");
  for (const pattern of ["docs/requirements/\\*\\*", "docs/system/\\*\\*", "<组件设计目录>/\\*\\*"]) {
    assert.match(development, new RegExp(`\\| \`${pattern}\` \\| 禁止 \\| 允许 \\| 禁止 \\| 禁止 \\|`));
  }
  assert.match(development, /\| `<组件应用目录>\/\*\*` \| 允许 \| 允许 \| 允许 \| 允许 \|/);
  for (const pattern of ["test/\\*\\*", "Dockerfile", "deploy/\\*\\*"]) {
    assert.match(development, new RegExp(`\\| \`<组件应用目录>/${pattern}\` \\| 禁止 \\| 禁止 \\| 禁止 \\| 禁止 \\|`));
  }

  const testing = readFileSync(path.join(WORKFLOW_ROOT, "stages/testing.md"), "utf8");
  for (const pattern of ["docs/requirements/\\*\\*", "docs/system/\\*\\*", "<组件设计目录>/\\*\\*", "<组件应用目录>/\\*\\*"]) {
    assert.match(testing, new RegExp(`\\| \`${pattern}\` \\| 禁止 \\| 允许 \\| 禁止 \\| 禁止 \\|`));
  }
  assert.match(testing, /\| `<组件应用目录>\/test\/\*\*` \| 允许 \| 允许 \| 允许 \| 允许 \|/);
  assert.match(testing, /\| `<组件应用目录>\/deploy\/\*\*` \| 禁止 \| 禁止 \| 禁止 \| 禁止 \|/);

  const deploy = readFileSync(path.join(WORKFLOW_ROOT, "stages/deploy.md"), "utf8");
  for (const pattern of ["docs/requirements/\\*\\*", "docs/system/\\*\\*", "docs/component/\\*\\*", "apps/\\*\\*"]) {
    assert.match(deploy, new RegExp(`\\| \`${pattern}\` \\| 禁止 \\| 允许 \\| 禁止 \\| 禁止 \\|`));
  }
  assert.match(deploy, /\| `apps\/\*\*` \| 禁止 \| 允许 \| 禁止 \| 禁止 \|/);
  assert.match(deploy, /\| `apps\/\*\/deploy\/\*\*` \| 允许 \| 允许 \| 允许 \| 允许 \|/);
  assert.match(deploy, /\| `docs\/deploy\/\*\*` \| 允许 \| 允许 \| 允许 \| 允许 \|/);
  assert.match(deploy, /\| `docs\/deploy\/update\/\*\.md` \| 允许 \| 允许 \| 允许 \| 禁止 \|/);
});

test("separates stable runbook guidance from generated update plans", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const deploy = readFileSync(path.join(WORKFLOW_ROOT, "stages/deploy.md"), "utf8");
  assert.doesNotMatch(deploy, /docs\/deploy\/deployment\.md|`deployment\.md`/);
  assert.match(deploy, /`runbook\.md`/);
  assert.match(agents, /\[deploy\] update <升级内容>/);
  assert.match(deploy, /\| `docs\/deploy\/update\/\*\.md` \| 允许 \| 允许 \| 允许 \| 禁止 \|/);
  assert.match(deploy, /<YYYYMMDDHHmmss>_<升级主题>\.md/);
  assert.match(deploy, /一次系统升级只生成一份文件/);
  assert.match(deploy, /普通 `\[deploy\]` 指令不得创建 `update\/\*\.md`/);
  for (const heading of ["部署检查", "顺序"]) {
    assert.match(deploy, new RegExp(`## ${heading}`));
  }
  assert.match(deploy, /## 开发配置/);
  assert.match(deploy, /cd docs\/deploy/);
  assert.match(deploy, /cp dev\.env <组件应用目录相对docs\/deploy的路径>\/\.env/);
  assert.match(deploy, /cp dev\.env \.env/);
  assert.match(deploy, /docker compose up -d <依赖服务名>/);
  assert.match(deploy, /docker compose up -d <初始化服务名>/);
  assert.match(deploy, /pnpm --dir <组件应用目录相对docs\/deploy的路径> dev/);
  assert.match(deploy, /\| 环境 \| 编排文件 \| 环境变量模板 \| 其他依赖文件 \|/);
  assert.match(deploy, /v<主版本>\.<次版本>\.<修订版本>/);
  assert.match(deploy, /v1\.2\.3-alpha\.1/);
  assert.match(deploy, /v1\.2\.3-rc\.1/);
  assert.match(deploy, /备份、迁移、部署、回滚和恢复是同级操作/);
});

test("configures component development infrastructure with deploy targets", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const deploy = readFileSync(path.join(WORKFLOW_ROOT, "stages/deploy.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");

  assert.match(agents, /\[deploy\] <组件>  当前组件的开发基础设施、初始化和启动说明/);
  assert.match(agents, /组件名必须精确匹配 `docs\/system\/c2\.md` 组件清单/);
  assert.match(deploy, /\| `init\/\*\*` \| 开发基础设施初始化 \|/);
  assert.match(deploy, /`\[deploy\] <组件>` 只新增或更新该组件的 `### <组件>`/);
  assert.match(deploy, /Compose 使用默认的\s+`\.env` 和 `compose\.yml`/);
  assert.match(deploy, /JavaScript 和 TypeScript 组件默认使用 `pnpm`/);
  assert.match(deploy, /名称优先为 `<基础设施>-init`/);
  assert.match(deploy, /使用 `restart: "no"`/);
  assert.match(deploy, /不执行其中的启动或初始化命令/);
  assert.match(readme, /`\[deploy\] <组件>` 维护该组件的开发基础设施配置/);
  assert.match(readme, /JavaScript 和 TypeScript 组件默认使用 `pnpm`/);
});

test("stores numbered requirement items in separate files", () => {
  const requirement = readFileSync(path.join(WORKFLOW_ROOT, "stages/requirement.md"), "utf8");
  assert.doesNotMatch(requirement, /`(business|acceptance|permission|migration)\.md`/);
  for (const type of ["BR", "FLOW", "AC", "PERM", "MIG"]) {
    assert.match(requirement, new RegExp(`items/REQ-001-${type}-001\\.md`));
  }
  assert.match(requirement, /items\/REQ-001-TC-001\.feature/);
});

test("supports frontend and backend component design modes", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const backend = readFileSync(path.join(WORKFLOW_ROOT, "templates/backend-design.template.md"), "utf8");
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");

  assert.match(agents, /\[<组件>\] frontend <前端设计任务>/);
  assert.match(agents, /\[<组件>\] backend <后端设计任务>/);
  assert.match(agents, /`frontend` 和 `backend` 只能作为 `\[<组件>\]` 后的第一个任务词/);
  assert.match(agents, /不得写入方括号，也不适用于 `dev` 或 `test` 任务/);
  assert.doesNotMatch(agents, /\[<组件>\] ddd <DDD设计任务>/);
  assert.match(component, /## 完整组件设计模式/);
  assert.match(component, /### Frontend 模式/);
  assert.match(component, /### Backend 模式/);
  assert.match(component, /当任务使用 `\[<组件>\] backend <任务>` 时默认采用 DDD/);
  assert.match(component, /完整读取\s+`docs\/workflows\/templates\/backend-design\.template\.md`/);
  assert.match(component, /C3 → DDD → 业务流程、状态与时序 → 接口和边界 → 机器可读模型 → C4/);
  assert.match(component, /每个适用文件使用模板规定的标题名称和顺序/);
  assert.match(component, /Backend 专用 Markdown、机器可读模型及其固定结构统一由/);
  assert.match(component, /Frontend 和 Backend 模式逐项检查各自列出的全部设计关注点/);
  assert.match(backend, /# Backend 组件设计流程与文档模板/);
  assert.match(backend, /## 文件关系与设计顺序/);
  assert.match(backend, /flowchart LR/);
  assert.match(backend, /## 执行流程/);
  assert.match(backend, /不得从框架、数据库表或现有源码反推业务模型/);
  assert.match(backend, /`interface\.md` 对应 `openapi\.json` 或 `asyncapi\.json`/);
  assert.match(backend, /`authorization\.md` 对应 `authorization\.fga`/);
  assert.match(backend, /`data-access\.md` 对应 `schema\.dbml`/);
  for (const file of [
    "c3.md",
    "ddd.md",
    "process.md",
    "state.md",
    "sequence.md",
    "interface.md",
    "authentication.md",
    "authorization.md",
    "validation.md",
    "errors.md",
    "data-access.md",
    "c4.md",
    "configuration.md",
    "secrets.md",
    "observability.md",
    "testing.md",
    "runtime.md",
    "deployment.md",
    "component.md",
  ]) {
    assert.ok(backend.includes(`## \`${file}\``), `missing Backend template for ${file}`);
  }
  for (const file of ["openapi.json", "asyncapi.json", "authorization.fga", "schema.dbml"]) {
    assert.ok(backend.includes(`### \`${file}\``), `missing Backend model template for ${file}`);
  }
  assert.match(readme, /\[web\] frontend 设计组件/);
  assert.match(readme, /\[api\] backend 设计组件/);
  assert.match(readme, /`templates\/backend-design\.template\.md`/);
});

test("separates system, component, and deploy security and observability ownership", () => {
  const system = readFileSync(path.join(WORKFLOW_ROOT, "stages/system.md"), "utf8");
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  const deploy = readFileSync(path.join(WORKFLOW_ROOT, "stages/deploy.md"), "utf8");

  assert.match(system, /只维护所有组件共同遵守的长期安全原则、信任边界和控制基线/);
  assert.match(system, /不写具体组件的\s*Token 或 Session 流程、权限关系、执行点、密钥清单、审计事件名或实现配置/);
  assert.match(system, /`security\.md` 只使用“安全目标”“信任边界”“全局控制基线”和“风险与例外”四个二级章节/);
  assert.match(system, /## 安全目标[\s\S]*\| 目标 \| 适用范围 \| 验证方式 \|/);
  assert.match(system, /## 信任边界[\s\S]*flowchart LR[\s\S]*subgraph external\["外部与不可信区域"\]/);
  assert.match(system, /## 全局控制基线[\s\S]*\| 领域 \| 全局规则 \| 适用范围 \| 验证方式 \|/);
  assert.match(system, /## 风险与例外[\s\S]*\| 风险 \| 适用范围 \| 控制措施 \| 验证方式 \|/);
  assert.match(system, /没有实际安全例外时删除“例外”三级章节和表格/);
  assert.doesNotMatch(system, /## 身份与凭据基线/);
  assert.match(system, /只维护跨组件遥测约定、共用平台、关联传播、保留脱敏和系统级运行目标/);
  assert.match(component, /### 跨阶段权威边界/);
  assert.match(component, /组件文件只维护当前组件如何落实全局基线、实际产生的信号、需要的密钥以及明确例外/);
  assert.match(component, /组件 `observability\.md` 不重新定义全局字段、命名、保留策略、告警级别或系统级 SLO/);
  assert.match(deploy, /## 安全与可观测性边界/);
  assert.match(deploy, /部署阶段维护密钥注入、证书挂载、环境值、安全中间件配置、Collector、Exporter/);
  assert.match(deploy, /不得在部署文件中补写设计规则/);
});

test("plans the component test structure before implementing tests", () => {
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  const testing = readFileSync(path.join(WORKFLOW_ROOT, "stages/testing.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");

  assert.match(component, /### 测试目录设计规则/);
  assert.match(component, /完整文件树必须包含当前组件计划维护的全部测试目录、测试文件/);
  assert.match(component, /`unit\/`、`integration\/`、`contract\/` 和 `e2e\/`/);
  assert.match(component, /单元测试按业务模块组织/);
  assert.match(component, /集成测试按 HTTP、UI、数据库、消息、授权或其他真实边界组织/);
  assert.match(component, /只有两个以上测试文件复用时才提取为共享文件/);
  assert.match(component, /测试运行器配置、初始化文件和 package script 必须出现在完整文件树中/);
  assert.match(component, /不在 `component\.md` 中复制测试步骤、断言、测试数据或执行结果/);
  assert.match(testing, /从 `component\.md` 的完整文件树读取计划的测试目录、测试文件、fixture、支持代码和配置/);
  assert.match(testing, /任务需要的测试层级或稳定测试文件未在组件设计中规划/);
  assert.match(testing, /新增测试、fixture、支持代码和配置位于 `component\.md` 规划的测试目录中/);
  assert.match(readme, /`component\.md` 的完整文件树同时规划单元、集成、契约和端到端测试/);
});

test("separates runtime and development technology selections", () => {
  const system = readFileSync(path.join(WORKFLOW_ROOT, "stages/system.md"), "utf8");
  assert.match(system, /### 运行组件/);
  assert.match(system, /\| 组件 \| 来源 \| 技术或框架 \| 版本 \| 容器镜像 Tag \| 文档链接 \| 说明 \|/);
  assert.match(system, /### 开发组件/);
  assert.match(system, /\| 组件 \| 范围 \| 技术 \| 版本策略 \| 文档链接 \| 用途 \| 约束 \|/);
  assert.match(system, /<repo>:<组件>-v<version>/);
  assert.match(system, /测试、生产及其他环境的运行组件必须全部容器化/);
  assert.match(system, /优先选择带管理界面的方案/);
  assert.match(system, /允许 `<主版本>\.x`/);
  assert.match(system, /对应版本的官方文档/);
  assert.match(system, /不使用博客、搜索结果或非官方教程/);
});

test("separates C1 context and C2 container architecture", () => {
  const files = [
    "templates/AGENTS.template.md",
    "stages/component.md",
    "stages/development.md",
    "stages/system.md",
    "stages/testing.md",
  ];
  const content = files.map((file) => readFileSync(path.join(WORKFLOW_ROOT, file), "utf8")).join("\n");
  assert.doesNotMatch(content, /docs\/system\/(?:architecture|c4)\.md|`architecture\.md`/);
  assert.match(content, /docs\/system\/c1\.md/);
  assert.match(content, /docs\/system\/c2\.md/);
  assert.match(content, /C4Context/);
  assert.match(content, /C4Container/);
});

test("lays out C1 peers horizontally and levels vertically", () => {
  const system = readFileSync(path.join(WORKFLOW_ROOT, "stages/system.md"), "utf8");
  assert.match(system, /Rel_D\(customer, system,/);
  assert.match(system, /Rel_D\(operator, system,/);
  assert.match(system, /UpdateLayoutConfig\(\$c4ShapeInRow="2", \$c4BoundaryInRow="1"\)/);
  assert.match(system, /同一层级元素连续声明并水平排列/);
  assert.match(system, /自上而下排列/);
  assert.match(system, /不使用 Mermaid C4 尚未支持的 `Lay_D`、`Lay_R`/);
});

test("lists C2 components by type with development endpoints", () => {
  const system = readFileSync(path.join(WORKFLOW_ROOT, "stages/system.md"), "utf8");
  assert.doesNotMatch(system, /^## (?:概述|组件边界|依赖方向)$/m);
  assert.ok(system.lastIndexOf("## 容器图") < system.lastIndexOf("## 组件清单"));
  assert.match(system, /### 前端组件/);
  assert.match(system, /### 后端组件/);
  assert.match(system, /\| 组件 \| 应用 \| 设计 \|/);
  assert.match(system, /\| `web` \| `apps\/web\/` \| `docs\/component\/web\/` \|/);
  assert.match(system, /\| `api` \| `apps\/api\/` \| `docs\/component\/api\/` \|/);
  assert.match(system, /\| `worker` \| `apps\/worker\/` \| `docs\/component\/worker\/` \|/);
  assert.match(system, /Container\(worker, "Worker"/);
  assert.ok(system.indexOf("Container(web,") < system.indexOf("Container(api,"));
  assert.ok(system.indexOf("Container(api,") < system.indexOf("ContainerDb(redis,"));
  assert.match(system, /Rel_D\(web, api,/);
  assert.match(system, /Rel_R\(api, worker,/);
  assert.match(system, /Rel_D\(api, redis,/);
  assert.match(system, /Rel_D\(api, openfga,/);
  assert.match(system, /C2 容器按“前端组件 → 后端组件 → 基础设施组件”自上而下分层声明和排列/);
  assert.match(system, /同一层级组件连续声明并水平排列/);
  assert.match(system, /- `web`\r?\n  - 暴露端口：`3000`\r?\n  - 访问地址：`http:\/\/localhost:3000\/`/);
  assert.match(system, /- `api`\r?\n  - 暴露端口：`3001`\r?\n  - 访问地址：`http:\/\/localhost:3001\/`/);
  assert.match(system, /  - OpenAPI 契约：`http:\/\/localhost:3001\/api\/v1\/openapi\.json`/);
  assert.match(system, /  - AsyncAPI 契约：`http:\/\/localhost:3001\/api\/v1\/asyncapi\.json`/);
  assert.match(system, /### 基础设施组件/);
  assert.doesNotMatch(system, /\| `(?:redis|openfga)` \|/);
  assert.match(system, /- `redis`\r?\n  - 暴露端口：`6379`\r?\n  - 访问地址：`redis:\/\/localhost:6379`/);
  assert.match(system, /- `openfga`\r?\n  - 暴露端口：`8080`、`8081`、`3000`/);
  assert.match(system, /  - HTTP API 地址：`http:\/\/localhost:8080`/);
  assert.match(system, /  - gRPC 地址：`localhost:8081`/);
  assert.match(system, /  - Playground：`http:\/\/localhost:3000`/);
  assert.match(system, /  - Playground 认证：开发环境无认证/);
  assert.match(system, /  - 凭据来源：项目开发默认值（仅开发环境）/);
  assert.match(system, /  - 官方文档：\[Docker Setup Guide\]\(https:\/\/openfga\.dev\/docs\/getting-started\/setup-openfga\/docker\)/);
  assert.match(system, /基础设施组件不使用表格/);
  assert.match(system, /管理界面未启用认证时明确写“开发环境无认证”/);
  assert.match(system, /没有暴露时直接省略，不写“无”/);
  assert.match(system, /对应版本官方文档/);
  assert.match(system, /禁止使用环境变量、占位符、`待定` 或 `TODO`/);
  assert.match(system, /后续部署配置必须使用相同值/);
  assert.match(system, /不得用于测试、生产或其他环境/);
  assert.match(system, /C2 只记录开发环境端口和地址/);
  assert.match(system, /测试、生产及其他环境由 `\[deploy\]` 维护/);
});

test("defines single-purpose component documents and horizontal-first code diagrams", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  assert.match(component, /\| `component\.md` \| 组件入口文档 \| 始终 \| 概述、设计架构文件索引和完整受版本控制文件结构 \|/);
  assert.match(component, /\| `c3\.md` \|[^|\r\n]+ \| 始终 \|/);
  assert.match(component, /\| `c4\.md` \|[^|\r\n]+ \| 存在需要长期维护的代码结构 \|/);
  assert.match(component, /\| `ddd\.md` \| 领域设计 \| Backend 模式 \|/);
  assert.match(component, /# <组件>\r?\n\r?\n## 概述[\s\S]*## 设计架构[\s\S]*\| 文件 \| 作用 \|[\s\S]*## 目录结构/);
  assert.match(component, /“设计架构”表格逐个列出当前组件设计目录内实际存在的全部文件及其唯一作用/);
  assert.match(component, /`component\.md` 除概述、设计架构索引和完整应用文件结构外，不保存其他设计内容/);
  assert.match(component, /目录结构递归列出组件目录内所有应受版本控制的目录和文件/);
  assert.match(component, /不列出依赖目录、构建产物、缓存、日志、临时文件、密钥或其他运行时生成内容/);
  assert.match(component, /一个事实只由一个文件维护/);
  assert.match(component, /`c3\.md` 使用 `C4Component`/);
  assert.match(component, /# C3 组件图\r?\n\r?\n```mermaid\r?\nC4Component/);
  assert.match(component, /`c3\.md` 只包含一级标题和一个 `C4Component` Mermaid 代码块/);
  assert.match(component, /`c4\.md` 使用一个代码总览和按业务能力划分的详细章节/);
  assert.match(component, /所有图统一使用 `flowchart LR`/);
  assert.match(component, /# C4 代码图\r?\n\r?\n## 总览\r?\n\r?\n```mermaid\r?\nflowchart LR/);
  assert.match(component, /## <业务能力>\r?\n\r?\n```mermaid\r?\nflowchart LR/);
  assert.match(component, /总览使用一个 `flowchart LR`，只展示模块、业务能力及主要依赖，不展示字段或函数/);
  assert.match(component, /每个详细章节只描述一个业务能力并使用一个 `flowchart LR`/);
  assert.match(component, /详细章节只展示理解设计所需的关键公开函数、参数和返回类型/);
  assert.match(component, /HTTP 请求、响应、错误和 Schema 由 `openapi\.json` 维护/);
  assert.match(component, /subgraph interface_layer\["接口层"\]\r?\n\s+direction TB/);
  assert.match(component, /subgraph application_layer\["应用层"\]\r?\n\s+direction TB/);
  assert.match(component, /subgraph core_layer\["核心模型层"\]\r?\n\s+direction TB/);
  assert.match(component, /subgraph port_layer\["端口层"\]\r?\n\s+direction TB/);
  assert.match(component, /subgraph adapter_layer\["适配器层"\]\r?\n\s+direction TB/);
  assert.match(component, /前端可以使用页面、功能、状态和适配器/);
  assert.match(component, /任务处理器可以使用消费者、任务、规则和外部适配器/);
  assert.match(component, /C4 节点按实际情况标注 `ApplicationService`、`AggregateRoot`/);
  assert.doesNotMatch(component, /classDiagram/);
  assert.match(component, /`ddd\.md` 只保存图无法完整表达的领域语义和决策/);
  assert.match(component, /Backend 中简单 CRUD 或纯查询仍在 `ddd\.md` 说明统一语言/);
  assert.match(component, /Boundary\(entry_layer, "接入层"\)/);
  assert.match(component, /Boundary\(capability_layer, "核心能力层"\)/);
  assert.match(component, /Boundary\(adapter_layer, "适配层"\)/);
  assert.match(component, /Boundary\(infrastructure, "基础设施"\)/);
  assert.match(component, /基础设施使用独立的兄弟 `Boundary`/);
  assert.match(component, /`c4BoundaryInRow` 固定使用 `1`/);
  assert.match(component, /异步链路按“生产者 → 队列或消息代理 → 消费者”排列/);
  assert.match(component, /Rel_D\(caller, entry,/);
  assert.match(component, /Rel_D\(queue, consumer,/);
  assert.match(component, /UpdateLayoutConfig\(\$c4ShapeInRow="5", \$c4BoundaryInRow="1"\)/);
  assert.match(component, /不使用 Mermaid C4 尚未支持的 `Lay_D`、`Lay_R`/);
  assert.match(agents, /\| 组件内部结构 \| `C4Component` \|/);
  assert.match(agents, /\| 组件代码结构 \| `flowchart`；先总览后按业务能力分章，主分层从左到右、分层内部从上到下 \|/);
});

test("groups business processes by role and uses flowcharts for builds", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const system = readFileSync(path.join(WORKFLOW_ROOT, "stages/system.md"), "utf8");
  assert.match(agents, /\| 构建流程 \| `flowchart` \|/);
  assert.match(system, /### <用户角色>/);
  assert.match(system, /### 通用/);
  assert.match(system, /### 系统/);
  assert.match(system, /构建流程使用 `flowchart`/);
});

test("installs AGENTS.md idempotently without changing host rules", () => {
  const root = mkdtempSync(path.join(tmpdir(), "workflows-install-"));
  const workflowRoot = path.join(root, "docs", "workflows");
  try {
    mkdirSync(path.join(workflowRoot, "templates"), { recursive: true });
    writeFileSync(path.join(workflowRoot, "templates", "AGENTS.template.md"), "# Workflow\n", "utf8");
    writeFileSync(path.join(root, "AGENTS.md"), "# Host rules\n", "utf8");

    assert.equal(installAgents({ projectRoot: root, workflowRoot }), "updated");
    const installed = readFileSync(path.join(root, "AGENTS.md"), "utf8");
    assert.match(installed, /^# Host rules/);
    assert.match(installed, /# Workflow/);
    assert.equal(installAgents({ projectRoot: root, workflowRoot }), "unchanged");
    assert.equal(readFileSync(path.join(root, "AGENTS.md"), "utf8"), installed);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
