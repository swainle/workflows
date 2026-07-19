#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import {
  currentRequirement,
  formatRequirement,
  normalizeShortName,
  readGithubIssue,
  requirementsForIssue,
  selectRequirement,
} from "./core/current-requirement.mjs";
import { PROJECT_ROOT, projectRelative } from "./core/paths.mjs";
import { formatStageConfig, runPromptStage } from "./core/prompt-stage.mjs";
import { STAGE_BY_NAME } from "./core/stages.mjs";
import PATCH_CONFIG, { GLOBAL_PATHS } from "./prompt/patch.mjs";
import {
  assertStageReady,
  clearMissingActiveStage,
  completeActiveStage,
  dependencyStages,
  findActiveResult,
  recordAppliedPatch,
  readWorkflowPlan,
  readWorkState,
  stageStatuses,
  startStage,
} from "./core/workflow.mjs";

const usage = `Usage:
  pnpm -s work:req [--issue <number>]
  pnpm -s work:status
  pnpm -s work:next [stage] [--require <text>]
  pnpm -s work:patch [--require <text>] [--list]
  pnpm -s work:<stage> [--require <text>] [--list] [--merge]`;

export function parseWorkArguments(args = process.argv.slice(2)) {
  args = [...args];
  const command = args.shift();
  if (command === "req") {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: { issue: { type: "string" } },
    });
    if (positionals.length) throw new Error(usage);
    return { command, issue: values.issue };
  }
  if (command === "status") {
    if (args.length) throw new Error(usage);
    return { command };
  }
  if (command === "next") {
    const { values, positionals } = parseArgs({
      args, allowPositionals: true, strict: true,
      options: { require: { type: "string" } },
    });
    if (positionals.length > 1 || (positionals[0] && !STAGE_BY_NAME[positionals[0]])) throw new Error(usage);
    return { command, nextStage: positionals[0], requirement: values.require ?? "" };
  }
  if (command === "patch" || STAGE_BY_NAME[command]) {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: { require: { type: "string" }, list: { type: "boolean" }, merge: { type: "boolean" } },
    });
    if (positionals.length || (values.list && values.require) || (values.merge && (command === "patch" || values.list || values.require))) throw new Error(usage);
    return { command, requirement: values.require ?? "", list: values.list ?? false, ...(values.merge ? { merge: true } : {}) };
  }
  throw new Error(usage);
}

async function ask(question) {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await readline.question(question);
  } finally {
    readline.close();
  }
}

async function selectIssueRequirement(issueNumber) {
  const issue = readGithubIssue(issueNumber);
  const existing = requirementsForIssue(issue.number);
  if (existing.length > 1) {
    throw new Error(`Multiple requirements found for Issue #${issue.number}:\n${existing.join("\n")}`);
  }
  let shortName = existing[0]?.replace(/^.*REQ-\d{4}-/, "");
  if (!shortName) {
    console.log(`Issue #${issue.number}: ${issue.title}\n${issue.url}`);
    shortName = normalizeShortName(await ask("Requirement short name (English): "));
  }
  const selected = selectRequirement(issue, shortName);
  console.log(`${selected.existed ? "Selected" : "Created"} requirement:\n${formatRequirement(selected)}`);
  console.log("Next: pnpm -s work:design");
}

function printStatus(current) {
  console.log(formatRequirement(current));
  const state = readWorkState(current);
  const plan = readWorkflowPlan(current.requirementDir);
  const statuses = stageStatuses(plan, state);
  console.log("\nStages:");
  for (const stage of statuses) {
    const detail = stage.missing.length ? ` (waiting for ${stage.missing.join(", ")})` : "";
    console.log(`- ${stage.name}: ${stage.status}${detail}`);
  }
  const ready = statuses.filter(({ status }) => status === "ready");
  const executable = state.active ? [] : ready;
  const patchReady = !state.active && !state.completed.includes("patch") && statuses.every(({ status }) => status === "completed");
  console.log(`\nExecutable:${executable.length
    ? executable.map(({ name }) => `\n- pnpm -s work:${name}`).join("")
    : patchReady ? "\n- pnpm -s work:patch" : " none"}`);
  if (state.active) console.log(`\nActive Prompt: ${state.active.promptFile}\nContinue: pnpm -s work:next [stage]`);
}

async function generateStage(current, stage, requirement = "") {
  const reconciled = clearMissingActiveStage(current);
  const state = reconciled.state;
  if (reconciled.cleared) {
    console.log(`Cleared missing active Prompt: ${reconciled.cleared.stage} (${reconciled.cleared.promptFile})`);
  }
  let dependencies = [];
  const plan = readWorkflowPlan(current.requirementDir);
  const rewind = Boolean(state.active && state.active.stage !== stage && plan && (
    state.active.stage === "patch"
      ? plan.stages.some(({ name }) => name === stage)
      : dependencyStages(plan, state.active.stage).includes(stage)
  ));
  if (state.active && state.active.stage !== stage && !rewind) throw new Error(`Stage ${state.active.stage} still has an unapplied result.`);
  assertStageReady(plan, state, stage, state.completed, true, true);
  dependencies = dependencyStages(plan, stage);
  const registered = STAGE_BY_NAME[stage];
  const baseConfig = (await import(`./prompt/${registered.module}.mjs`)).default;
  const references = registered.reference
    ? [registered.reference]
    : stage === "design"
      ? plan.stages.map(({ name }) => STAGE_BY_NAME[name]?.reference).filter(Boolean)
      : [];
  const config = {
    ...baseConfig,
    module: registered.module,
    command: registered.command ?? baseConfig.command ?? registered.name,
    stageName: registered.stageName ?? baseConfig.stageName,
    directory: registered.directory,
    platform: registered.platform ?? "",
    platformName: registered.platformName ?? "",
    references: [...new Set(references)],
  };
  const issue = (config.githubIssues || config.relatedStages?.length) && current.issue?.number
    ? readGithubIssue(current.issue.number)
    : current.issue;
  const promptFile = await runPromptStage(config, {
    target: projectRelative(current.requirementDir),
    requirement,
    issue,
    dependencies,
  });
  startStage(current, stage, promptFile, { plan, rewind });
  if (rewind) console.log(`Rewound: ${state.active.stage} -> ${stage}`);
}

function within(file, target) {
  return file === target || file.startsWith(`${target}/`);
}

export function assertAllowedPatchPaths(current, stage, files) {
  const registered = STAGE_BY_NAME[stage];
  const stageRoot = registered ? projectRelative(path.join(current.requirementDir, registered.directory)) : null;
  const allowed = stage === "patch"
    ? [...GLOBAL_PATHS, projectRelative(path.join(current.requirementDir, "completion.md")), projectRelative(path.join(current.requirementDir, "patch", "questions.md"))]
    : stage === "global"
      ? GLOBAL_PATHS
      : [projectRelative(path.join(current.requirementDir, registered.directory))];
  for (const input of files) {
    const file = input.replaceAll("\\", "/");
    if (!file || path.isAbsolute(file) || file.split("/").includes("..") || !allowed.some((target) => within(file, target))) {
      throw new Error(`Patch for ${stage} cannot modify: ${input}`);
    }
    if (stageRoot && within(file, stageRoot)) {
      const relative = file.slice(stageRoot.length).replace(/^\//, "");
      if (/^\d{14}(?:\/|$)/.test(relative)) throw new Error(`Patch for ${stage} cannot modify execution history: ${input}`);
    }
  }
}

function patchPaths(patchFile) {
  const output = execFileSync("git", ["apply", "--numstat", patchFile], { cwd: PROJECT_ROOT, encoding: "utf8" });
  return output.trim().split(/\r?\n/).filter(Boolean).map((line) => {
    const file = line.split("\t").slice(2).join("\t");
    if (!file || file.startsWith('"') || file.includes(" => ") || file.includes("{") || file.includes("}")) {
      throw new Error(`Patch rename or quoted path is not supported: ${file || line}`);
    }
    return file;
  });
}

function checkPatch(current, stage, patchFile, { requireCompletion = false } = {}) {
  const files = patchPaths(patchFile);
  assertAllowedPatchPaths(current, stage, files);
  if (requireCompletion) {
    const completion = projectRelative(path.join(current.requirementDir, "completion.md"));
    if (!files.includes(completion)) throw new Error(`Final Patch must modify: ${completion}`);
  }
  execFileSync("git", ["apply", "--check", patchFile], { cwd: PROJECT_ROOT, stdio: "inherit" });
  execFileSync("git", ["apply", "--stat", patchFile], { cwd: PROJECT_ROOT, stdio: "inherit" });
}

export function unappliedPatches(patches, applied = []) {
  return patches.filter((patchFile) => !applied.includes(patchFile));
}

async function mergeActiveStage(current, stage) {
  const state = readWorkState(current);
  if (state.active?.stage !== stage) throw new Error(`Stage ${stage} is not active.`);
  const result = findActiveResult(current, state);
  const patches = [result.patchFile, ...result.globalPatchFiles].filter(Boolean);
  const pendingPatches = unappliedPatches(patches, state.appliedPatches);
  if (!pendingPatches.length) throw new Error(result.noChanges ? `Stage ${stage} has no Patch to merge.` : `Stage ${stage} Patch is already merged.`);
  for (const patchFile of pendingPatches) {
    checkPatch(current, patchFile === result.patchFile ? stage : "global", patchFile);
  }
  console.log(`Stage: ${stage}\nPatches: ${pendingPatches.join(", ")}\nAnalysis: ${result.analysisFile}`);
  const answer = (await ask("Apply these Patches and keep the stage active? [y/N] ")).trim().toLowerCase();
  if (!["y", "yes"].includes(answer)) throw new Error("Cancelled.");
  for (const patchFile of pendingPatches) {
    execFileSync("git", ["apply", patchFile], { cwd: PROJECT_ROOT, stdio: "inherit" });
    recordAppliedPatch(current, patchFile);
  }
  console.log(`Merged: ${stage}\nStage remains active. Re-run work:${stage} or finish with work:next.`);
}

async function generatePatch(current, requirement = "") {
  const state = readWorkState(current);
  if (state.active) throw new Error(`Stage ${state.active.stage} still has an unapplied result.`);
  const plan = readWorkflowPlan(current.requirementDir);
  const pending = stageStatuses(plan, state).filter(({ status }) => status !== "completed");
  if (pending.length) throw new Error(`Requirement is not complete: ${pending.map(({ name }) => name).join(", ")}.`);
  const promptFile = await runPromptStage(PATCH_CONFIG, {
    target: projectRelative(current.requirementDir),
    requirement,
    issue: current.issue,
    dependencies: plan.stages.map(({ name }) => name),
  });
  startStage(current, "patch", promptFile);
}

async function applyAndContinue(current, nextStage, requirement = "") {
  const state = readWorkState(current);
  const result = findActiveResult(current, state);
  if (state.active.stage === "patch" && !result.patchFile) {
    throw new Error(`Final Patch must create or update ${projectRelative(path.join(current.requirementDir, "completion.md"))}.`);
  }
  const patches = [result.patchFile, ...result.globalPatchFiles].filter(Boolean);
  const pendingPatches = unappliedPatches(patches, state.appliedPatches);
  for (const patchFile of pendingPatches) {
    checkPatch(current, patchFile === result.patchFile ? state.active.stage : "global", patchFile, {
      requireCompletion: state.active.stage === "patch" && patchFile === result.patchFile,
    });
  }
  if (state.active.stage === "patch" && nextStage) throw new Error("work:patch is final; run work:next without a stage.");
  if (nextStage && state.active.stage !== "issue") {
    const plan = readWorkflowPlan(current.requirementDir);
    assertStageReady(plan, state, nextStage, [...state.completed, state.active.stage], true);
  }
  console.log(`Current stage: ${state.active.stage}`);
  console.log(result.noChanges ? `Result: no changes (${result.analysisFile})` : `Patches: ${patches.join(", ")}\nAnalysis: ${result.analysisFile}`);
  console.log(`Next: ${nextStage ?? "finish"}`);
  const answer = (await ask(`${pendingPatches.length ? "Apply" : "Complete"} this result and continue? [y/N] `)).trim().toLowerCase();
  if (!['y', 'yes'].includes(answer)) throw new Error("Cancelled.");
  for (const patchFile of pendingPatches) execFileSync("git", ["apply", patchFile], { cwd: PROJECT_ROOT, stdio: "inherit" });
  completeActiveStage(current, result);
  console.log(`Completed: ${result.stage}`);
  if (!nextStage) return;
  const plan = readWorkflowPlan(current.requirementDir);
  const nextState = readWorkState(current);
  assertStageReady(plan, nextState, nextStage, nextState.completed, true);
  await generateStage(current, nextStage, requirement);
}

export async function main(args = process.argv.slice(2)) {
  const parsed = parseWorkArguments(args);
  if (parsed.list) {
    const registered = parsed.command === "patch" ? PATCH_CONFIG : STAGE_BY_NAME[parsed.command];
    const config = parsed.command === "patch"
      ? PATCH_CONFIG
      : { ...(await import(`./prompt/${registered.module}.mjs`)).default, module: registered.module, directory: registered.directory, platform: registered.platform };
    console.log(formatStageConfig(config));
    return;
  }
  if (parsed.command === "req") {
    if (parsed.issue) await selectIssueRequirement(parsed.issue);
    else console.log(formatRequirement(currentRequirement()));
    return;
  }

  const current = currentRequirement();
  if (!current.issue) throw new Error("Current requirement has no Issue information. Run pnpm -s work:req --issue <number> again.");
  if (parsed.command === "status") return printStatus(current);
  if (parsed.command === "next") return applyAndContinue(current, parsed.nextStage, parsed.requirement);
  if (parsed.command === "patch") return generatePatch(current, parsed.requirement);
  if (parsed.merge) return mergeActiveStage(current, parsed.command);
  await generateStage(current, parsed.command, parsed.requirement);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
