import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { currentRequirement, normalizeShortName, readGithubIssue, selectRequirement } from "./tools/core/current-requirement.mjs";
import { assertAllowedPatchPaths, parseWorkArguments, unappliedPatches } from "./tools/work.mjs";
import { STAGES } from "./tools/core/stages.mjs";
import { PROJECT_ROOT } from "./tools/core/paths.mjs";
import { sourceBaseline } from "./tools/core/prompt-stage.mjs";
import { assertStageReady, clearMissingActiveStage, completeActiveStage, dependencyStages, findActiveResult, readWorkflowPlan, readWorkState, recordAppliedPatch, stageStatuses, startStage, validateWorkflowPlan } from "./tools/core/workflow.mjs";

test("parses the simplified commands", () => {
  assert.deepEqual(parseWorkArguments(["req", "--issue", "4"]), { command: "req", issue: "4" });
  assert.deepEqual(parseWorkArguments(["status"]), { command: "status" });
  assert.deepEqual(parseWorkArguments(["next", "dev"]), { command: "next", nextStage: "dev", requirement: "" });
  assert.deepEqual(parseWorkArguments(["design", "--require", "web only"]), { command: "design", requirement: "web only", list: false });
  assert.deepEqual(parseWorkArguments(["dev", "--list"]), { command: "dev", requirement: "", list: true });
  assert.deepEqual(parseWorkArguments(["design", "--merge"]), { command: "design", requirement: "", list: false, merge: true });
  assert.deepEqual(parseWorkArguments(["patch"]), { command: "patch", requirement: "", list: false });
  for (const retired of ["issue", "process", "api", "backend", "frontend:web"] ) {
    assert.throws(() => parseWorkArguments([retired]));
  }
  assert.throws(() => parseWorkArguments(["dev", "--merge", "--require", "again"]));
  assert.throws(() => parseWorkArguments(["patch", "--merge"]));
});

test("registers the fixed workflow", () => {
  assert.deepEqual(STAGES.map(({ name }) => name), ["design", "dev", "test", "deployment"]);
  const plan = readWorkflowPlan();
  assert.deepEqual(plan.stages.map(({ name, dependsOn }) => ({ name, dependsOn })), [
    { name: "design", dependsOn: [] },
    { name: "dev", dependsOn: ["design"] },
    { name: "test", dependsOn: ["dev"] },
    { name: "deployment", dependsOn: ["test"] },
  ]);
  assert.deepEqual(dependencyStages(plan, "deployment"), ["test", "dev", "design"]);
  assert.throws(() => validateWorkflowPlan({ version: 1, stages: [
    { name: "design", dependsOn: ["dev"], reason: "cycle" },
    { name: "dev", dependsOn: ["design"], reason: "cycle" },
  ] }), /design stage cannot have dependencies|dependency cycle/);
});

test("captures the source baseline for direct development", () => {
  assert.equal(sourceBaseline({ directSourceChanges: false }), "不适用。");
  const runner = (_command, args) => args[0] === "rev-parse" ? "abc123\n" : " M apps/web/page.tsx\n";
  const baseline = sourceBaseline({ directSourceChanges: true }, { projectRoot: "C:/project", runner });
  assert.match(baseline, /开始 Commit：`abc123`/);
  assert.match(baseline, /M apps\/web\/page\.tsx/);

  const unbornRunner = (_command, args) => {
    if (args[0] !== "rev-parse") return "?? package.json\n";
    const error = new Error("no HEAD");
    error.status = 1;
    throw error;
  };
  const unborn = sourceBaseline({ directSourceChanges: true }, { projectRoot: "C:/project", runner: unbornRunner });
  assert.match(unborn, /开始 Commit：`无（仓库尚无提交）`/);
  assert.match(unborn, /\?\? package\.json/);
});

test("limits stage and final patches to their path scopes", () => {
  const current = { requirementDir: path.join(PROJECT_ROOT, "docs/requirements/REQ-0004-build") };
  assert.doesNotThrow(() => assertAllowedPatchPaths(current, "design", [
    "docs/requirements/REQ-0004-build/design/requirement.md",
    "docs/requirements/REQ-0004-build/design/web.ui.yaml",
  ]));
  assert.doesNotThrow(() => assertAllowedPatchPaths(current, "dev", [
    "docs/requirements/REQ-0004-build/dev/development.md",
    "docs/requirements/REQ-0004-build/dev/questions.md",
  ]));
  assert.throws(() => assertAllowedPatchPaths(current, "dev", ["apps/api/src/index.ts"]), /cannot modify/);
  assert.throws(() => assertAllowedPatchPaths(current, "design", [
    "docs/requirements/REQ-0004-build/design/20260717010101/prompt.md",
  ]), /execution history/);
  assert.doesNotThrow(() => assertAllowedPatchPaths(current, "patch", [
    "docs/architecture/product.md", "packages/design-tokens/tokens/token.json",
    "docs/requirements/REQ-0004-build/completion.md",
  ]));
  assert.throws(() => assertAllowedPatchPaths(current, "patch", ["apps/api/src/index.ts"]), /cannot modify/);
  assert.deepEqual(unappliedPatches(["a.patch", "b.patch"], ["a.patch"]), ["b.patch"]);
});

test("normalizes an English requirement short name", () => {
  assert.equal(normalizeShortName("Booking Fixture"), "Booking-Fixture");
  assert.throws(() => normalizeShortName("预订功能"), /English letters/);
});

test("stores full GitHub Issue context in Git metadata", () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "workflows-prompt-"));
  const runner = () => ".git/workflows/current-requirement\n";
  try {
    const issue = { number: 4, title: "Build booking", url: "https://github.com/example/repo/issues/4", body: "Depends on #2", comments: [{ body: "Web" }] };
    const selected = selectRequirement(issue, "build", { projectRoot, runner });
    assert.equal(existsSync(path.join(selected.requirementDir, "assets")), true);
    const current = currentRequirement({ projectRoot, runner });
    assert.deepEqual(current.issue, issue);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("reads Issue body and comments", () => {
  const issue = { number: 36, title: "Booking fixture", url: "https://github.com/example/repo/issues/36", body: "Idea", comments: [] };
  const runner = (command, args) => {
    assert.equal(command, "gh");
    assert.deepEqual(args, ["issue", "view", "36", "--json", "number,title,url,body,comments"]);
    return JSON.stringify(issue);
  };
  assert.deepEqual(readGithubIssue("36", { projectRoot: process.cwd(), runner }), issue);
});

test("tracks active results without rewriting history", () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "workflows-active-"));
  const runner = (command, args) => `.git/${args[2]}\n`;
  try {
    const current = selectRequirement({ number: 4, title: "Build", url: "https://example/4" }, "build", { projectRoot, runner });
    const promptFile = "docs/requirements/REQ-0004-build/design/20260717010101/prompt.md";
    const runDir = path.join(projectRoot, path.dirname(promptFile));
    mkdirSync(runDir, { recursive: true });
    writeFileSync(path.join(projectRoot, promptFile), "prompt\n");
    startStage(current, "design", promptFile, { projectRoot, runner, plan: readWorkflowPlan() });
    assert.equal(readWorkState(current, { projectRoot, runner }).active.stage, "design");
    writeFileSync(path.join(runDir, "prompt.01.git.patch"), "diff --git a/a b/a\n");
    writeFileSync(path.join(runDir, "prompt.01.git.patch.md"), "result: proposed\n");
    const result = findActiveResult(current, readWorkState(current, { projectRoot, runner }), { projectRoot });
    assert.equal(result.patchFile, "docs/requirements/REQ-0004-build/design/20260717010101/prompt.01.git.patch");
    recordAppliedPatch(current, result.patchFile, { projectRoot, runner });
    const merged = readWorkState(current, { projectRoot, runner });
    assert.equal(merged.active.stage, "design");
    assert.deepEqual(merged.completed, []);
    assert.deepEqual(merged.appliedPatches, [result.patchFile]);
    completeActiveStage(current, result, { projectRoot, runner });
    const completed = readWorkState(current, { projectRoot, runner });
    assert.deepEqual(completed.completed, ["design"]);
    assert.deepEqual(stageStatuses(readWorkflowPlan(), completed).map(({ name, status }) => ({ name, status })), [
      { name: "design", status: "completed" },
      { name: "dev", status: "ready" },
      { name: "test", status: "blocked" },
      { name: "deployment", status: "blocked" },
    ]);
    assert.doesNotThrow(() => assertStageReady(readWorkflowPlan(), completed, "dev"));
    rmSync(path.join(projectRoot, promptFile));
    assert.equal(clearMissingActiveStage(current, { projectRoot, runner }).cleared, null);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});
