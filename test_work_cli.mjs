import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { currentRequirement, normalizeShortName, readGithubIssue, selectRequirement } from "./tools/core/current-requirement.mjs";
import { assertAllowedPatchPaths, parseWorkArguments, unappliedPatches } from "./tools/work.mjs";
import { STAGES } from "./tools/core/stages.mjs";
import { PROJECT_ROOT, WORKFLOW_ROOT, projectRelative } from "./tools/core/paths.mjs";
import { runPromptStage } from "./tools/core/prompt-stage.mjs";
import DESIGN_CONFIG from "./tools/prompt/design.mjs";
import { walkTextFiles } from "./tools/core/files.mjs";
import { assertStageReady, assertTrackingStageComplete, clearMissingActiveStage, completeActiveStage, dependencyStages, findActiveResult, readWorkflowPlan, readWorkState, recordAppliedPatch, stageStatuses, startStage, validateWorkflowPlan } from "./tools/core/workflow.mjs";

test("parses the simplified commands", () => {
  assert.deepEqual(parseWorkArguments(["req", "--issue", "4"]), { command: "req", issue: "4" });
  assert.deepEqual(parseWorkArguments(["status"]), { command: "status" });
  assert.deepEqual(parseWorkArguments(["design", "--require", "web only"]), { command: "design", requirement: "web only", list: false });
  assert.deepEqual(parseWorkArguments(["dev", "--list"]), { command: "dev", requirement: "", list: true });
  assert.deepEqual(parseWorkArguments(["design", "--merge"]), { command: "design", requirement: "", list: false, merge: true });
  assert.deepEqual(parseWorkArguments(["patch"]), { command: "patch", requirement: "", list: false });
  assert.deepEqual(parseWorkArguments(["patch", "--merge"]), { command: "patch", requirement: "", list: false, merge: true });
  for (const retired of ["next", "deployment", "issue", "process", "api", "backend", "frontend:web"] ) {
    assert.throws(() => parseWorkArguments([retired]));
  }
  assert.throws(() => parseWorkArguments(["dev", "--merge", "--require", "again"]));
});

test("registers the fixed workflow", () => {
  assert.deepEqual(STAGES.map(({ name }) => name), ["design", "dev", "test"]);
  const plan = readWorkflowPlan();
  assert.deepEqual(plan.stages.map(({ name, dependsOn }) => ({ name, dependsOn })), [
    { name: "design", dependsOn: [] },
    { name: "dev", dependsOn: ["design"] },
    { name: "test", dependsOn: ["dev"] },
  ]);
  assert.deepEqual(dependencyStages(plan, "test"), ["dev", "design"]);
  assert.throws(() => validateWorkflowPlan({ version: 1, stages: [
    { name: "design", dependsOn: ["dev"], reason: "cycle" },
    { name: "dev", dependsOn: ["design"], reason: "cycle" },
  ] }), /design stage cannot have dependencies|dependency cycle/);
});

test("reads named environment artifacts but skips local dotenv files", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "workflows-env-"));
  try {
    writeFileSync(path.join(directory, "production.env"), "NODE_ENV=production\n");
    writeFileSync(path.join(directory, ".env"), "SECRET=hidden\n");
    assert.deepEqual(walkTextFiles(directory).map((file) => path.basename(file)), ["production.env"]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("embeds root requirement specs in the generated prompt", async () => {
  const root = mkdtempSync(path.join(WORKFLOW_ROOT, ".prompt-test-"));
  const requirementDir = path.join(root, "REQ-9999-prompt-test");
  const target = projectRelative(requirementDir);
  try {
    mkdirSync(requirementDir, { recursive: true });
    writeFileSync(path.join(requirementDir, "requirement.md"), "# Requirement root fact\n");
    const output = await runPromptStage({ ...DESIGN_CONFIG, module: "design", directory: "design", references: [] }, {
      target,
      issue: { number: 9999, title: "Prompt test", url: "https://example/9999", body: "Root context", comments: [] },
      dependencies: [],
    });
    const prompt = readFileSync(path.join(PROJECT_ROOT, output), "utf8");
    assert.match(prompt, /# 通用规范/);
    assert.ok(prompt.includes(`文件：${target}/requirement.md`));
    assert.match(prompt, /Requirement root fact/);
    assert.doesNotMatch(prompt, /\{\{[A-Z_]+\}\}/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("limits stage and final patches to their path scopes", () => {
  const current = { requirementDir: path.join(PROJECT_ROOT, "docs/requirements/REQ-0004-build") };
  assert.doesNotThrow(() => assertAllowedPatchPaths(current, "design", [
    "docs/requirements/REQ-0004-build/requirement.md",
    "docs/requirements/REQ-0004-build/requirement.functional.md",
    "docs/requirements/REQ-0004-build/web.ui.yaml",
    "docs/requirements/REQ-0004-build/compose.yml",
    "docs/requirements/REQ-0004-build/dev.env",
  ]));
  assert.doesNotThrow(() => assertAllowedPatchPaths(current, "dev", [
    "docs/requirements/REQ-0004-build/dev/development.md",
    "docs/requirements/REQ-0004-build/dev/questions.md",
    "docs/requirements/REQ-0004-build/status.json",
  ]));
  assert.throws(() => assertAllowedPatchPaths(current, "dev", ["apps/api/src/index.ts"]), /cannot modify/);
  assert.throws(() => assertAllowedPatchPaths(current, "design", [
    "docs/requirements/REQ-0004-build/design/20260717010101/prompt.md",
  ]), /cannot modify|execution history/);
  assert.doesNotThrow(() => assertAllowedPatchPaths(current, "design", [
    "docs/requirements/REQ-0004-build/design/requirement.md",
  ]));
  assert.doesNotThrow(() => assertAllowedPatchPaths(current, "patch", [
    "docs/architecture/requirement.md", "docs/architecture/architecture.md",
    "packages/design-tokens/tokens/token.json",
    "docker/compose.yml", "docker/prod.env",
    "docs/requirements/REQ-0004-build/completion.md",
    "docs/requirements/REQ-0004-build/status.json",
  ]));
  assert.throws(() => assertAllowedPatchPaths(current, "dev", ["docs/requirements/REQ-0004-build/requirement.md"]), /cannot modify/);
  assert.throws(() => assertAllowedPatchPaths(current, "dev", ["docker/compose.yml"]), /cannot modify/);
  assert.throws(() => assertAllowedPatchPaths(current, "patch", ["apps/api/src/index.ts"]), /cannot modify/);
  assert.deepEqual(unappliedPatches(["a.patch", "b.patch"], ["a.patch"]), ["b.patch"]);
});

test("validates the shared requirement tracking file", () => {
  const root = mkdtempSync(path.join(tmpdir(), "workflows-tracking-"));
  const requirementDir = path.join(root, "REQ-0004-build");
  mkdirSync(requirementDir, { recursive: true });
  const item = (id, type, links) => ({
    id, type, title: id, source: `requirement.functional.md#${id}`, links, lifecycle: "active",
    stages: { design: "done", dev: "done", test: "passed", patch: "pending" },
    evidence: { design: ["design"], dev: ["source"], test: ["test/report.md"], patch: [] },
  });
  const tracking = {
    version: 1, requirement: "REQ-0004", items: [
      item("REQ-0004-FR-001", "functional-requirement", ["REQ-0004-FLOW-001", "REQ-0004-AC-001", "REQ-0004-TC-001"]),
      item("REQ-0004-FLOW-001", "flow", []),
      item("REQ-0004-AC-001", "acceptance-criterion", []),
      item("REQ-0004-TC-001", "test-case", []),
    ],
  };
  try {
    writeFileSync(path.join(requirementDir, "status.json"), `${JSON.stringify(tracking)}\n`);
    const current = { requirementDir };
    assert.doesNotThrow(() => assertTrackingStageComplete(current, "test"));
    assert.throws(() => assertTrackingStageComplete(current, "patch"), /not complete for patch/);
    tracking.items[0].links = ["REQ-0004-TC-999"];
    writeFileSync(path.join(requirementDir, "status.json"), `${JSON.stringify(tracking)}\n`);
    assert.throws(() => assertTrackingStageComplete(current, "test"), /Unknown tracking link/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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
    ]);
    assert.doesNotThrow(() => assertStageReady(readWorkflowPlan(), completed, "dev"));
    rmSync(path.join(projectRoot, promptFile));
    assert.equal(clearMissingActiveStage(current, { projectRoot, runner }).cleared, null);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});
