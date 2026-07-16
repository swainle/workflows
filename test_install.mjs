import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { installBranch, parseBranch, PROJECT_ROOT, WORKFLOW_ROOT } from "./install.mjs";

test("installs with selected branch", () => {
  const calls = [];
  const runner = (command, args, options) => {
    calls.push({ command, args, options });
    return { status: args[0] === "show-ref" ? 1 : 0 };
  };

  assert.equal(installBranch("develop", runner), 0);
  assert.deepEqual(calls.map(({ command, args, options }) => ({ command, args, cwd: options.cwd })), [
    { command: "git", args: ["check-ref-format", "--branch", "develop"], cwd: WORKFLOW_ROOT },
    { command: "git", args: ["fetch", "origin", "refs/heads/develop:refs/remotes/origin/develop"], cwd: WORKFLOW_ROOT },
    { command: "git", args: ["show-ref", "--verify", "--quiet", "refs/heads/develop"], cwd: WORKFLOW_ROOT },
    { command: "git", args: ["switch", "-c", "develop", "origin/develop"], cwd: WORKFLOW_ROOT },
    { command: "git", args: ["merge", "--ff-only", "origin/develop"], cwd: WORKFLOW_ROOT },
    { command: "git", args: ["submodule", "set-branch", "--branch", "develop", "docs/workflows"], cwd: PROJECT_ROOT },
    { command: process.execPath, args: [path.join(WORKFLOW_ROOT, "install.mjs"), "--workflows-updated", "--branch", "develop"], cwd: PROJECT_ROOT },
  ]);
});

test("parses selected branch", () => {
  assert.equal(parseBranch(["--branch", "main"]), "main");
});

test("defaults to main branch", () => {
  assert.equal(parseBranch([]), "main");
});
