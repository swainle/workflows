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
  assert.match(deploy, /<组件自身开发命令>/);
  assert.match(deploy, /\| 环境 \| 编排文件 \| 环境变量模板 \| 其他依赖文件 \|/);
  assert.match(deploy, /v<主版本>\.<次版本>\.<修订版本>/);
  assert.match(deploy, /v1\.2\.3-alpha\.1/);
  assert.match(deploy, /v1\.2\.3-rc\.1/);
  assert.match(deploy, /备份、迁移、部署、回滚和恢复是同级操作/);
});

test("stores numbered requirement items in separate files", () => {
  const requirement = readFileSync(path.join(WORKFLOW_ROOT, "stages/requirement.md"), "utf8");
  assert.doesNotMatch(requirement, /`(business|acceptance|permission|migration)\.md`/);
  for (const type of ["BR", "FLOW", "AC", "PERM", "MIG"]) {
    assert.match(requirement, new RegExp(`items/REQ-001-${type}-001\\.md`));
  }
  assert.match(requirement, /items\/REQ-001-TC-001\.feature/);
});

test("supports the DDD component design modifier", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");

  assert.match(agents, /\[<组件>\] ddd <DDD设计任务>/);
  assert.match(agents, /`ddd` 只能作为 `\[<组件>\]` 后的第一个任务词/);
  assert.match(agents, /不得写成 `\[<组件> ddd\]`/);
  assert.match(component, /## DDD 组件设计模式/);
  assert.match(component, /当组件任务使用 `\[<组件>\] ddd <任务>` 时启用本模式/);
  assert.match(component, /先识别业务不变量、状态生命周期和事务边界，再确定聚合根、实体和值对象/);
  assert.match(component, /业务模块按内聚的业务能力或限界上下文划分，不按 URL、数据库表或技术类型划分/);
  assert.match(component, /领域层不得依赖框架、ORM、HTTP、UI、Schema 校验、身份令牌、授权引擎、消息队列或其他基础设施/);
  assert.match(component, /简单 CRUD、纯查询和数据转换不强制创建聚合/);
  assert.match(component, /`modules\/<业务能力>\/`/);
  assert.match(component, /### DDD 模式完成检查/);
  assert.match(component, /启用时先执行“DDD 组件设计模式”的建模顺序和规则/);
  assert.match(readme, /\[api\] ddd 设计组件/);
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
  assert.match(component, /\| `component\.md` \| 组件概述和完整文件结构 \| 始终 \|/);
  assert.match(component, /\| `c3\.md` \|[^|\r\n]+ \| 始终 \|/);
  assert.match(component, /\| `c4\.md` \|[^|\r\n]+ \| 存在需要长期维护的代码结构 \|/);
  assert.match(component, /\| `ddd\.md` \| 领域语义、聚合规则和建模决策 \| 存在领域模型 \|/);
  assert.match(component, /`component\.md` 不保存领域模型、流程、状态、时序或契约内容/);
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
  assert.match(component, /没有领域模型的展示页面、薄网关、简单任务或 CRUD 组件不创建 `ddd\.md`/);
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
