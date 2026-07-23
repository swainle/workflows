import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { WORKFLOW_ROOT, installAgents, installBranch, mergeAgents, parseBranch } from "./install.mjs";

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

test("rejects damaged or duplicated managed markers", () => {
  assert.throws(() => mergeAgents("<!-- workflows:begin -->\n", "# Workflow\n"), /invalid workflows markers/);
  assert.throws(() => mergeAgents("<!-- workflows:end -->\n", "# Workflow\n"), /invalid workflows markers/);
  assert.throws(() => mergeAgents(
    "<!-- workflows:begin --><!-- workflows:end --><!-- workflows:begin --><!-- workflows:end -->",
    "# Workflow\n",
  ), /invalid workflows markers/);
  assert.throws(() => mergeAgents("<!-- workflows:end --><!-- workflows:begin -->", "# Workflow\n"), /marker order/);
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
