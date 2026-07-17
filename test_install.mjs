import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import test from "node:test";
import { tmpdir } from "node:os";
import path from "node:path";
import { installBranch, installPlantUml, migrateDeploymentDocument, migrateProcessDocument, parseBranch, PROJECT_ROOT, WORKFLOW_ROOT } from "./install.mjs";

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

test("ships an OpenFGA playground compose file", () => {
  const compose = readFileSync(path.join(WORKFLOW_ROOT, "defaults/openfga/compose.yml"), "utf8");
  assert.match(compose, /openfga\/openfga:v1\.16\.0/);
  assert.match(compose, /OPENFGA_PLAYGROUND_ENABLED/);
  assert.match(compose, /"3000:3000"/);
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

test("moves the existing deployment document into architecture", () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "workflows-install-"));
  const source = path.join(projectRoot, "docs/operations/deployment.md");
  const target = path.join(projectRoot, "docs/architecture/deployment.md");
  mkdirSync(path.dirname(source), { recursive: true });
  writeFileSync(source, "deployment\n");

  try {
    assert.equal(migrateDeploymentDocument(projectRoot), true);
    assert.equal(existsSync(source), false);
    assert.equal(readFileSync(target, "utf8"), "deployment\n");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("moves the existing process document into the process directory", () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "workflows-install-"));
  const source = path.join(projectRoot, "docs/architecture/process.puml");
  const target = path.join(projectRoot, "docs/architecture/process/overview.puml");
  mkdirSync(path.dirname(source), { recursive: true });
  writeFileSync(source, "@startuml\n@enduml\n");

  try {
    assert.equal(migrateProcessDocument(projectRoot), true);
    assert.equal(existsSync(source), false);
    assert.equal(readFileSync(target, "utf8"), "@startuml\n@enduml\n");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});
