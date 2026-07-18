import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import test from "node:test";
import { tmpdir } from "node:os";
import path from "node:path";
import { installBranch, migrateDeploymentDocument, parseBranch, PROJECT_ROOT, WORKFLOW_ROOT } from "./install.mjs";

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
  const compose = readFileSync(path.join(WORKFLOW_ROOT, "packages/openfga/compose.yml"), "utf8");
  assert.match(compose, /openfga\/openfga:latest/);
  assert.match(compose, /OPENFGA_PLAYGROUND_ENABLED/);
  assert.match(compose, /OPENFGA_PLAYGROUND_ADDR=0\.0\.0\.0:3000/);
  assert.match(compose, /"3000:3000"/);
});

test("ships Mermaid Markdown architecture defaults", () => {
  const c4 = readFileSync(path.join(WORKFLOW_ROOT, "defaults/architecture/c4.md"), "utf8");
  const process = readFileSync(path.join(WORKFLOW_ROOT, "defaults/architecture/process/overview.md"), "utf8");
  assert.match(c4, /```mermaid\s+C4Container/);
  assert.match(process, /```mermaid\s+flowchart/);
  assert.equal(existsSync(path.join(WORKFLOW_ROOT, "defaults/architecture/c4.puml")), false);
  assert.equal(existsSync(path.join(WORKFLOW_ROOT, "defaults/architecture/process/overview.puml")), false);
});

test("ships technology and Git workflow defaults", () => {
  const technology = readFileSync(path.join(WORKFLOW_ROOT, "defaults/architecture/technology.md"), "utf8");
  const gitWorkflow = readFileSync(path.join(WORKFLOW_ROOT, "defaults/development/git-workflow.md"), "utf8");
  for (const name of ["Next.js", "Prisma", "PostgreSQL", "Redis", "BullMQ", "RabbitMQ", "OpenFGA", "Docker Compose"]) {
    assert.match(technology, new RegExp(name.replace(".", "\\.")));
  }
  assert.match(gitWorkflow, /```mermaid\s+gitGraph/);
  assert.match(gitWorkflow, /completion\.md/);
  assert.match(gitWorkflow, /Closes #36/);
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
