import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { currentRequirement, normalizeShortName, readGithubIssue, selectRequirement } from "./tools/core/current-requirement.mjs";
import { assertAllowedCodePatchPaths, assertAllowedPatchPaths, latestUnappliedPatch, parseWorkArguments, unappliedPatches } from "./tools/work.mjs";
import { STAGES } from "./tools/core/stages.mjs";
import { PROJECT_ROOT } from "./tools/core/paths.mjs";
import { assertStageReady, completeActiveStage, dependencyStages, findActiveResult, readWorkflowPlan, readWorkState, stageStatuses, startStage, validateWorkflowPlan } from "./tools/core/workflow.mjs";

test("parses requirement, status, next, and stage commands", () => {
  assert.deepEqual(parseWorkArguments(["req", "--issue", "4"]), {
    command: "req",
    issue: "4",
  });
  assert.deepEqual(parseWorkArguments(["req"]), { command: "req", issue: undefined });
  assert.deepEqual(parseWorkArguments(["status"]), { command: "status" });
  assert.deepEqual(parseWorkArguments(["next", "api"]), { command: "next", nextStage: "api", requirement: "" });
  assert.deepEqual(parseWorkArguments(["next", "frontend:mobile", "--require", "reuse UI"]), {
    command: "next", nextStage: "frontend:mobile", requirement: "reuse UI",
  });
  assert.deepEqual(parseWorkArguments(["frontend:web"]), { command: "frontend:web", requirement: "", list: false });
  assert.deepEqual(parseWorkArguments(["api", "--require", "use v2"]), {
    command: "api",
    requirement: "use v2",
    list: false,
  });
  assert.deepEqual(parseWorkArguments(["backend", "--list"]), { command: "backend", requirement: "", list: true });
  assert.deepEqual(parseWorkArguments(["backend", "--merge"]), {
    command: "backend", requirement: "", list: false, merge: true,
  });
  assert.deepEqual(parseWorkArguments(["patch"]), { command: "patch", requirement: "", list: false });
  assert.throws(() => parseWorkArguments(["patch", "--merge"]));
  assert.throws(() => parseWorkArguments(["backend", "--patch"]));
  assert.throws(() => parseWorkArguments(["api", "--include", "packages/api"]));
});

test("limits stage and final patches to their path scopes", () => {
  const current = { requirementDir: path.join(PROJECT_ROOT, "docs/requirements/REQ-0004-build") };
  assert.doesNotThrow(() => assertAllowedPatchPaths(current, "backend", [
    "docs/requirements/REQ-0004-build/backend/backend.prompt.md",
  ]));
  assert.throws(() => assertAllowedPatchPaths(current, "backend", [
    "docs/requirements/REQ-0004-build/api/openapi.json",
  ]), /cannot modify/);
  assert.throws(() => assertAllowedPatchPaths(current, "backend", ["apps/api/src/index.ts"]), /cannot modify/);
  assert.doesNotThrow(() => assertAllowedPatchPaths(current, "patch", [
    "docs/architecture/product.md", "package.json",
  ]));
  assert.throws(() => assertAllowedPatchPaths(current, "patch", ["apps/api/src/index.ts"]), /cannot modify/);
  assert.doesNotThrow(() => assertAllowedCodePatchPaths(["apps/api/src/index.ts", "package.json"]));
  assert.throws(() => assertAllowedCodePatchPaths([".git/config"]), /cannot modify/);
  assert.throws(() => assertAllowedCodePatchPaths(["docs/contracts/openapi.json"]), /cannot modify/);
  assert.throws(() => assertAllowedCodePatchPaths(["docs/requirements/REQ-0004-build/issue/issue.md"]), /cannot modify/);
  assert.equal(latestUnappliedPatch([
    "run/prompt.01.git.patch",
    "run/prompt.02.git.patch",
    "run/prompt.03.git.patch",
    "run/prompt.02.git.patch.md",
  ], ["run/prompt.02.git.patch"]), "run/prompt.03.git.patch");
  assert.equal(latestUnappliedPatch(["run/prompt.01.git.patch"], ["run/prompt.01.git.patch"]), null);
  assert.equal(latestUnappliedPatch([
    "run/prompt.01.git.patch", "run/prompt.02.git.patch",
  ], ["run/prompt.02.git.patch"]), null);
  assert.deepEqual(unappliedPatches(["a.patch", "b.patch"], ["a.patch"]), ["b.patch"]);
});

test("normalizes an English requirement short name", () => {
  assert.equal(normalizeShortName("Booking Fixture"), "Booking-Fixture");
  assert.throws(() => normalizeShortName("预订功能"), /English letters/);
});

test("keeps platform frontend artifacts isolated", () => {
  const platforms = STAGES.filter(({ name }) => name.startsWith("frontend:"));
  assert.deepEqual(platforms.map(({ name }) => name), [
    "frontend:web",
    "frontend:mobile",
    "frontend:mini-program",
    "frontend:desktop",
  ]);
  assert.equal(new Set(platforms.map(({ directory }) => directory)).size, platforms.length);
  assert.equal(platforms.every(({ directory }) => directory.startsWith("frontend/")), true);
});

test("stores the current requirement in Git metadata", () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "workflows-prompt-"));
  const runner = () => ".git/workflows/current-requirement\n";
  try {
    const issue = { number: 4, title: "Build booking", url: "https://github.com/example/repo/issues/4" };
    const selected = selectRequirement(issue, "build", { projectRoot, runner });
    assert.equal(selected.existed, false);
    assert.equal(existsSync(path.join(selected.requirementDir, "assets")), true);
    assert.equal(
      readFileSync(path.join(projectRoot, ".git/workflows/current-requirement"), "utf8"),
      `${JSON.stringify({
        requirement: "REQ-0004-build",
        requirementDir: "docs/requirements/REQ-0004-build",
        issue,
      }, null, 2)}\n`,
    );
    const current = currentRequirement({ projectRoot, runner });
    assert.equal(current.requirementDir, selected.requirementDir);
    assert.deepEqual(current.issue, issue);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("reads the selected GitHub Issue", () => {
  const issue = { number: 36, title: "Booking fixture", url: "https://github.com/example/repo/issues/36" };
  const runner = (command, args) => {
    assert.equal(command, "gh");
    assert.deepEqual(args, ["issue", "view", "36", "--json", "number,title,url"]);
    return JSON.stringify(issue);
  };
  assert.deepEqual(readGithubIssue("36", { projectRoot: process.cwd(), runner }), issue);
});

test("reads a selected workflow and calculates executable stages", () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "workflows-plan-"));
  const runner = (command, args) => `.git/${args[2]}\n`;
  try {
    const issue = { number: 4, title: "Build booking", url: "https://github.com/example/repo/issues/4" };
    const current = selectRequirement(issue, "build", { projectRoot, runner });
    mkdirSync(path.join(current.requirementDir, "issue"), { recursive: true });
    writeFileSync(path.join(current.requirementDir, "issue/issue.md"), `# Requirement\n\n<!-- WORKFLOW:START -->\n\`\`\`json\n${JSON.stringify({
      version: 1,
      stages: [
        { name: "issue", dependsOn: [], reason: "required" },
        { name: "process", dependsOn: ["issue"], reason: "workflow changed" },
        { name: "api", dependsOn: ["process"], reason: "contract changed" },
      ],
    }, null, 2)}\n\`\`\`\n<!-- WORKFLOW:END -->\n`);

    const plan = readWorkflowPlan(current.requirementDir);
    const state = readWorkState(current, { projectRoot, runner });
    assert.deepEqual(state.completed, ["issue"]);
    assert.deepEqual(stageStatuses(plan, state).map(({ name, status }) => ({ name, status })), [
      { name: "issue", status: "completed" },
      { name: "process", status: "ready" },
      { name: "api", status: "blocked" },
    ]);
    assert.deepEqual(dependencyStages(plan, "api"), ["process", "issue"]);
    const promptFile = "docs/requirements/REQ-0004-build/process/20260717010101/prompt.md";
    const outputDir = path.join(projectRoot, path.dirname(promptFile));
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(path.join(projectRoot, promptFile), "prompt\n");
    writeFileSync(path.join(outputDir, "prompt.01.git.patch"), "diff --git a/a b/a\n");
    writeFileSync(path.join(outputDir, "prompt.01.process.git.patch"), "diff --git a/b b/b\n");
    writeFileSync(path.join(outputDir, "prompt.01.git.patch.md"), "result: proposed\n");
    startStage(current, "process", promptFile, { projectRoot, runner });
    const active = readWorkState(current, { projectRoot, runner });
    assert.equal(active.active.stage, "process");
    const result = findActiveResult(current, active, { projectRoot });
    assert.equal(result.patchFile, "docs/requirements/REQ-0004-build/process/20260717010101/prompt.01.git.patch");
    assert.deepEqual(result.globalPatchFiles, ["docs/requirements/REQ-0004-build/process/20260717010101/prompt.01.process.git.patch"]);
    writeFileSync(path.join(outputDir, "prompt.02.git.patch.md"), "patch_file: null\nresult: no-changes\n");
    const latest = findActiveResult(current, active, { projectRoot });
    assert.equal(latest.noChanges, true);
    assert.equal(latest.patchFile, null);
    completeActiveStage(current, latest, { projectRoot, runner });
    assert.deepEqual(readWorkState(current, { projectRoot, runner }).completed, ["issue", "process"]);
    writeFileSync(path.join(projectRoot, ".git/workflows/state/REQ-0004-build.json"), `${JSON.stringify({
      active: null,
      completed: ["issue", "process", "api"],
      appliedPatches: [],
    })}\n`);
    startStage(current, "process", promptFile, { projectRoot, runner, plan });
    const rerun = readWorkState(current, { projectRoot, runner });
    assert.deepEqual(rerun.completed, ["issue"]);
    assert.deepEqual(stageStatuses(plan, rerun).map(({ name, status }) => ({ name, status })), [
      { name: "issue", status: "completed" },
      { name: "process", status: "active" },
      { name: "api", status: "blocked" },
    ]);
    assert.doesNotThrow(() => assertStageReady(plan, rerun, "process", rerun.completed, true, true));
    const replacementPrompt = "docs/requirements/REQ-0004-build/process/20260717020202/prompt.md";
    startStage(current, "process", replacementPrompt, { projectRoot, runner, plan });
    assert.equal(readWorkState(current, { projectRoot, runner }).active.promptFile, replacementPrompt);
    assert.throws(() => startStage(current, "api", replacementPrompt, { projectRoot, runner, plan }), /process still has/);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("rejects cyclic workflows", () => {
  assert.throws(() => validateWorkflowPlan({
    version: 1,
    stages: [
      { name: "issue", dependsOn: [], reason: "required" },
      { name: "process", dependsOn: ["api"], reason: "process" },
      { name: "api", dependsOn: ["process"], reason: "api" },
    ],
  }), /dependency cycle/);
});
