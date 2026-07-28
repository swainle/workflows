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
    assert.doesNotMatch(content, /^### (允许读取|允许修改|禁止修改)$/m, file);
  }
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

test("lists C2 components as sections with external documentation", () => {
  const system = readFileSync(path.join(WORKFLOW_ROOT, "stages/system.md"), "utf8");
  assert.doesNotMatch(system, /\| 组件 \| 组件应用目录 \| 组件设计目录 \|/);
  assert.doesNotMatch(system, /^## (?:概述|组件边界|依赖方向)$/m);
  assert.match(system, /### `<组件>`/);
  assert.match(system, /组件应用目录：/);
  assert.match(system, /组件设计目录：/);
  assert.match(system, /对外文档：/);
  for (const type of ["Swagger UI", "OpenAPI", "AsyncAPI"]) {
    assert.match(system, new RegExp(`\`${type}\`：`));
  }
  assert.match(system, /`OpenAPI`：`http:\/\/localhost:3000\/api\/v1\/openapi\.json`/);
  assert.match(system, /`AsyncAPI`：`http:\/\/localhost:3000\/api\/v1\/asyncapi\.json`/);
  assert.match(system, /完整 HTTP\(S\) URL/);
  assert.doesNotMatch(system, /`(?:OpenAPI|AsyncAPI)`：`docs\/component\//);
  assert.match(system, /没有时写“无”/);
});

test("defines C3 component and C4 code diagrams", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  assert.match(component, /\| `c3\.md` \|[^|\r\n]+ \| 始终 \|/);
  assert.match(component, /\| `c4\.md` \|[^|\r\n]+ \| 始终 \|/);
  assert.match(component, /`c3\.md` 使用 `C4Component`/);
  assert.match(component, /`c4\.md` 使用 `classDiagram`/);
  assert.match(agents, /\| 组件内部结构 \| `C4Component` \|/);
  assert.match(agents, /\| 组件代码结构 \| `classDiagram` \|/);
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
