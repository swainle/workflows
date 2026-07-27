import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

test("parses the selected branch", () => {
  assert.equal(parseBranch([]), "main");
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

test("repository AGENTS routes every stage file", () => {
  const template = readFileSync(path.join(WORKFLOW_ROOT, "AGENTS.md"), "utf8");
  assert.equal(validateStageReferences(template), 8);
});

test("uses c4.md for system architecture", () => {
  const files = [
    "AGENTS.md",
    "stages/component-deployment.md",
    "stages/component.md",
    "stages/development.md",
    "stages/system.md",
    "stages/testing.md",
  ];
  const content = files.map((file) => readFileSync(path.join(WORKFLOW_ROOT, file), "utf8")).join("\n");
  assert.doesNotMatch(content, /docs\/system\/architecture\.md|`architecture\.md`/);
  assert.match(content, /docs\/system\/c4\.md/);
  assert.match(content, /C4Context/);
  assert.match(content, /C4Container/);
});

test("groups business processes by role and uses flowcharts for builds", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "AGENTS.md"), "utf8");
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
    mkdirSync(workflowRoot, { recursive: true });
    writeFileSync(path.join(workflowRoot, "AGENTS.md"), "# Workflow\n", "utf8");
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
