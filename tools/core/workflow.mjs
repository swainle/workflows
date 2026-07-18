import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gitMetadataFile } from "./current-requirement.mjs";
import { PROJECT_ROOT, projectRelative } from "./paths.mjs";
import { STAGE_BY_NAME, STAGE_NAMES } from "./stages.mjs";

export const DEFAULT_WORKFLOW_PLAN = {
  version: 1,
  stages: [
    { name: "design", dependsOn: [], reason: "形成完整且一致的需求设计" },
    { name: "dev", dependsOn: ["design"], reason: "按确认的平台直接实现源码" },
    { name: "test", dependsOn: ["dev"], reason: "验证需求、实现和回归风险" },
    { name: "deployment", dependsOn: ["test"], reason: "确认发布、迁移、监控和回滚" },
  ],
};

export function workflowFile(requirementDir) {
  return path.join(requirementDir, "design", "requirement.md");
}

export function readWorkflowPlan() {
  return validateWorkflowPlan(structuredClone(DEFAULT_WORKFLOW_PLAN));
}

export function validateWorkflowPlan(plan) {
  if (plan?.version !== 1 || !Array.isArray(plan.stages) || !plan.stages.length) {
    throw new Error("Workflow must contain version 1 and a non-empty stages array.");
  }
  const names = new Set();
  for (const stage of plan.stages) {
    if (!stage || !STAGE_BY_NAME[stage.name] || !Array.isArray(stage.dependsOn) || !stage.reason?.trim() || names.has(stage.name)) {
      throw new Error(`Invalid or duplicate workflow stage: ${stage?.name ?? "unknown"}.`);
    }
    names.add(stage.name);
  }
  if (!names.has("design")) throw new Error("Workflow must include the design stage.");
  if (plan.stages.find((stage) => stage.name === "design").dependsOn.length) {
    throw new Error("The design stage cannot have dependencies.");
  }
  for (const stage of plan.stages) {
    for (const dependency of stage.dependsOn) {
      if (!names.has(dependency) || dependency === stage.name) {
        throw new Error(`Invalid dependency for ${stage.name}: ${dependency}.`);
      }
    }
  }
  const visiting = new Set();
  const visited = new Set();
  const visit = (name) => {
    if (visiting.has(name)) throw new Error(`Workflow contains a dependency cycle at ${name}.`);
    if (visited.has(name)) return;
    visiting.add(name);
    for (const dependency of plan.stages.find((stage) => stage.name === name).dependsOn) visit(dependency);
    visiting.delete(name);
    visited.add(name);
  };
  for (const name of names) visit(name);
  return plan;
}

function stateFile(requirement, runner = execFileSync, projectRoot = PROJECT_ROOT) {
  return gitMetadataFile(`workflows/state/${requirement}.json`, runner, projectRoot);
}

export function readWorkState(current, { runner = execFileSync, projectRoot = PROJECT_ROOT } = {}) {
  const file = stateFile(current.requirement, runner, projectRoot);
  if (!existsSync(file)) {
    return {
      active: null,
      completed: [],
      appliedPatches: [],
    };
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeWorkState(current, state, runner = execFileSync, projectRoot = PROJECT_ROOT) {
  const file = stateFile(current.requirement, runner, projectRoot);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return state;
}

export function clearMissingActiveStage(current, { runner = execFileSync, projectRoot = PROJECT_ROOT } = {}) {
  const state = readWorkState(current, { runner, projectRoot });
  if (!state.active) return { state, cleared: null };
  const promptFile = path.resolve(projectRoot, state.active.promptFile);
  if (promptFile !== projectRoot && !promptFile.startsWith(`${projectRoot}${path.sep}`)) {
    throw new Error(`Active Prompt is outside project root: ${state.active.promptFile}.`);
  }
  if (existsSync(promptFile)) return { state, cleared: null };
  const cleared = state.active;
  state.active = null;
  writeWorkState(current, state, runner, projectRoot);
  return { state, cleared };
}

export function startStage(current, stage, promptFile, { runner = execFileSync, projectRoot = PROJECT_ROOT, plan = null, rewind = false } = {}) {
  if (!STAGE_BY_NAME[stage] && stage !== "patch") throw new Error(`Unknown stage: ${stage}.`);
  const state = readWorkState(current, { runner, projectRoot });
  if (state.active && state.active.stage !== stage && !rewind) throw new Error(`Stage ${state.active.stage} still has an unapplied result.`);
  if (stage === "patch") state.completed = state.completed.filter((name) => name !== stage);
  else if (plan && state.completed.includes(stage)) {
    const index = plan.stages.findIndex(({ name }) => name === stage);
    const stale = new Set(plan.stages.slice(index).map(({ name }) => name));
    state.completed = state.completed.filter((name) => !stale.has(name));
  }
  state.active = { stage, promptFile };
  return writeWorkState(current, state, runner, projectRoot);
}

export function completeActiveStage(current, result, { runner = execFileSync, projectRoot = PROJECT_ROOT } = {}) {
  const state = readWorkState(current, { runner, projectRoot });
  if (!state.active) throw new Error("No active stage result to apply.");
  if (!state.completed.includes(state.active.stage)) state.completed.push(state.active.stage);
  state.appliedPatches ??= [];
  for (const file of [result.patchFile, ...(result.globalPatchFiles ?? [])].filter(Boolean)) {
    if (!state.appliedPatches.includes(file)) state.appliedPatches.push(file);
  }
  state.active = null;
  return writeWorkState(current, state, runner, projectRoot);
}

export function recordAppliedPatch(current, patchFile, { runner = execFileSync, projectRoot = PROJECT_ROOT } = {}) {
  const state = readWorkState(current, { runner, projectRoot });
  state.appliedPatches ??= [];
  if (!state.appliedPatches.includes(patchFile)) state.appliedPatches.push(patchFile);
  return writeWorkState(current, state, runner, projectRoot);
}

export function stageStatuses(plan, state, completed = state.completed) {
  const done = new Set(completed);
  return plan.stages.map((stage) => {
    const missing = stage.dependsOn.filter((dependency) => !done.has(dependency));
    const status = done.has(stage.name)
      ? "completed"
      : state.active?.stage === stage.name
        ? "active"
        : missing.length
          ? "blocked"
          : "ready";
    return { ...stage, status, missing };
  });
}

export function assertStageReady(plan, state, stage, completed = state.completed, allowCompleted = false, allowActive = false) {
  const selected = stageStatuses(plan, state, completed).find((item) => item.name === stage);
  if (!selected) throw new Error(`Stage ${stage} is not part of the workflow.`);
  const reusable = !selected.missing.length && (
    (allowCompleted && selected.status === "completed") ||
    (allowActive && selected.status === "active")
  );
  if (selected.status !== "ready" && !reusable) {
    throw new Error(`Stage ${stage} is ${selected.status}${selected.missing.length ? `; waiting for ${selected.missing.join(", ")}` : ""}.`);
  }
}

export function dependencyStages(plan, stage) {
  const selected = plan.stages.find((item) => item.name === stage);
  if (!selected) throw new Error(`Stage ${stage} is not part of the workflow.`);
  const dependencies = new Set();
  const collect = (name) => {
    for (const dependency of plan.stages.find((item) => item.name === name).dependsOn) {
      if (!dependencies.has(dependency)) {
        dependencies.add(dependency);
        collect(dependency);
      }
    }
  };
  collect(stage);
  return [...dependencies];
}

export function findActiveResult(current, state, { projectRoot = PROJECT_ROOT } = {}) {
  if (!state.active) throw new Error("No active stage. Run work:status to see executable stages.");
  const promptFile = path.resolve(projectRoot, state.active.promptFile);
  if (promptFile !== projectRoot && !promptFile.startsWith(`${projectRoot}${path.sep}`)) {
    throw new Error(`Active Prompt is outside project root: ${state.active.promptFile}.`);
  }
  const relative = (file) => path.relative(projectRoot, file).split(path.sep).join("/");
  const directory = path.dirname(promptFile);
  const base = path.basename(promptFile, ".md");
  const patchPattern = new RegExp(`^${base}\\.(\\d{2})\\.git\\.patch$`);
  const analysisPattern = new RegExp(`^${base}\\.(\\d{2})\\.git\\.patch\\.md$`);
  const globalPattern = new RegExp(`^${base}\\.(\\d{2})\\.[a-z0-9-]+\\.git\\.patch$`);
  const names = readdirSync(directory);
  const attempts = names.flatMap((name) => {
    const match = name.match(patchPattern) ?? name.match(analysisPattern) ?? name.match(globalPattern);
    return match ? [match[1]] : [];
  }).sort();
  const attempt = attempts.at(-1);
  if (!attempt) throw new Error(`No AI result found for ${state.active.promptFile}.`);
  const patch = `${base}.${attempt}.git.patch`;
  const analysis = `${patch}.md`;
  const globalPatchFiles = names
    .filter((name) => name.match(globalPattern)?.[1] === attempt)
    .map((name) => relative(path.join(directory, name)));
  if (globalPatchFiles.length > 1) throw new Error(`Multiple global Patches found for attempt ${attempt}.`);
  if (!names.includes(analysis)) throw new Error(`Analysis file not found for ${relative(path.join(directory, patch))}.`);
  const analysisFile = relative(path.join(directory, analysis));
  const analysisContent = readFileSync(path.join(directory, analysis), "utf8");
  if (names.includes(patch)) {
    return {
      stage: state.active.stage,
      patchFile: relative(path.join(directory, patch)),
      analysisFile,
      globalPatchFiles,
      noChanges: false,
    };
  }
  if (globalPatchFiles.length) {
    return { stage: state.active.stage, patchFile: null, analysisFile, globalPatchFiles, noChanges: false };
  }
  if (names.includes(analysis)) {
    if (/result:\s*no-changes\b/.test(analysisContent) && /patch_file:\s*null\b/.test(analysisContent)) {
      return { stage: state.active.stage, patchFile: null, analysisFile, globalPatchFiles: [], noChanges: true };
    }
  }
  throw new Error(`No AI result found for ${state.active.promptFile}.`);
}

export { STAGE_NAMES };
