import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import test from "node:test";
import { tmpdir } from "node:os";
import path from "node:path";
import { installBranch, installPlantUml, parseBranch, PROJECT_ROOT, WORKFLOW_ROOT } from "./install.mjs";

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

test("downloads PlantUML once and reuses the verified file", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "workflows-install-"));
  const target = path.join(directory, "packages/plantuml.jar");
  const data = Buffer.from("plantuml test jar");
  const expectedSha256 = createHash("sha256").update(data).digest("hex");
  let downloads = 0;
  const fetcher = async () => {
    downloads += 1;
    return { ok: true, arrayBuffer: async () => Uint8Array.from(data).buffer };
  };

  try {
    assert.equal(await installPlantUml({ target, expectedSha256, fetcher }), true);
    assert.equal(await installPlantUml({ target, expectedSha256, fetcher }), false);
    assert.deepEqual(readFileSync(target), data);
    assert.equal(downloads, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
