import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import test from "node:test";
import { tmpdir } from "node:os";
import path from "node:path";
import { installBranch, migrateArchitectureDocuments, migrateDeploymentDocument, parseBranch, PROJECT_ROOT, WORKFLOW_ROOT } from "./install.mjs";

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
  const architecture = readFileSync(path.join(WORKFLOW_ROOT, "defaults/architecture/architecture.md"), "utf8");
  const backendDdd = readFileSync(path.join(WORKFLOW_ROOT, "defaults/architecture/backend.ddd.md"), "utf8");
  const backendProcess = readFileSync(path.join(WORKFLOW_ROOT, "defaults/architecture/process/backend.process.md"), "utf8");
  const requirement = readFileSync(path.join(WORKFLOW_ROOT, "defaults/architecture/requirement.md"), "utf8");
  const process = readFileSync(path.join(WORKFLOW_ROOT, "defaults/architecture/process/overview.md"), "utf8");
  assert.match(architecture, /```mermaid\s+C4Container/);
  assert.match(backendDdd, /# 后端领域设计/);
  assert.match(backendProcess, /```mermaid\s+sequenceDiagram/);
  assert.match(requirement, /# 全局需求/);
  assert.match(process, /```mermaid\s+flowchart/);
  assert.equal(existsSync(path.join(WORKFLOW_ROOT, "defaults/architecture/c4.md")), false);
  assert.equal(existsSync(path.join(WORKFLOW_ROOT, "defaults/architecture/product.md")), false);
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

test("ships common and platform token defaults", () => {
  const directory = path.join(WORKFLOW_ROOT, "defaults/design-tokens");
  for (const name of ["token.json", "web.token.json", "mini-program.token.json", "desktop.token.json", "mobile.token.json"]) {
    assert.equal(existsSync(path.join(directory, name)), true, name);
    assert.doesNotThrow(() => JSON.parse(readFileSync(path.join(directory, name), "utf8")), name);
  }
  assert.equal(existsSync(path.join(directory, "index.tokens.json")), false);
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

test("renames legacy global architecture documents", () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "workflows-architecture-"));
  const architecture = path.join(projectRoot, "docs/architecture");
  mkdirSync(architecture, { recursive: true });
  writeFileSync(path.join(architecture, "product.md"), "requirement\n");
  writeFileSync(path.join(architecture, "c4.md"), "architecture\n");

  try {
    assert.deepEqual(migrateArchitectureDocuments(projectRoot), [
      ["docs/architecture/product.md", "docs/architecture/requirement.md"],
      ["docs/architecture/c4.md", "docs/architecture/architecture.md"],
    ]);
    assert.equal(readFileSync(path.join(architecture, "requirement.md"), "utf8"), "requirement\n");
    assert.equal(readFileSync(path.join(architecture, "architecture.md"), "utf8"), "architecture\n");
    assert.equal(existsSync(path.join(architecture, "product.md")), false);
    assert.equal(existsSync(path.join(architecture, "c4.md")), false);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});
