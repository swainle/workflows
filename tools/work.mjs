#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
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
import { runPromptStage } from "./core/prompt-stage.mjs";
import { STAGE_BY_NAME } from "./core/stages.mjs";
import {
  assertStageReady,
  completeActiveStage,
  dependencyStages,
  findActiveResult,
  readWorkflowPlan,
  readWorkState,
  stageStatuses,
  startStage,
  workflowFile,
} from "./core/workflow.mjs";

const usage = `Usage:
  pnpm -s work:req [--issue <number>]
  pnpm -s work:status
  pnpm -s work:next [stage]
  pnpm -s work:<stage> [--include <path>]`;

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
    const { positionals } = parseArgs({ args, allowPositionals: true, strict: true });
    if (positionals.length > 1 || (positionals[0] && !STAGE_BY_NAME[positionals[0]])) throw new Error(usage);
    return { command, nextStage: positionals[0] };
  }
  if (STAGE_BY_NAME[command]) {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: { include: { type: "string", multiple: true } },
    });
    if (positionals.length) throw new Error(usage);
    return { command, includes: values.include ?? [] };
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
  console.log("Next: pnpm -s work:issue");
}

function printStatus(current) {
  console.log(formatRequirement(current));
  const state = readWorkState(current);
  if (!existsSync(workflowFile(current.requirementDir))) {
    console.log("\nWorkflow: waiting for work:issue Patch");
    if (state.active) console.log(`Active: ${state.active.stage}\nPrompt: ${state.active.promptFile}\nContinue: pnpm -s work:next [stage]`);
    else console.log("Executable:\n- pnpm -s work:issue");
    return;
  }
  const plan = readWorkflowPlan(current.requirementDir);
  const statuses = stageStatuses(plan, state);
  console.log("\nStages:");
  for (const stage of statuses) {
    const detail = stage.missing.length ? ` (waiting for ${stage.missing.join(", ")})` : "";
    console.log(`- ${stage.name}: ${stage.status}${detail}`);
  }
  const ready = statuses.filter(({ status }) => status === "ready");
  const executable = state.active ? [] : ready;
  console.log(`\nExecutable:${executable.length ? executable.map(({ name }) => `\n- pnpm -s work:${name}`).join("") : " none"}`);
  if (state.active) console.log(`\nActive Prompt: ${state.active.promptFile}\nContinue: pnpm -s work:next [stage]`);
}

async function generateStage(current, stage, includes = []) {
  const state = readWorkState(current);
  if (state.active) throw new Error(`Stage ${state.active.stage} still has an unapplied result.`);
  let dependencies = [];
  let plan = null;
  if (stage !== "issue") {
    plan = readWorkflowPlan(current.requirementDir);
    assertStageReady(plan, state, stage);
    dependencies = dependencyStages(plan, stage);
  }
  const registered = STAGE_BY_NAME[stage];
  const baseConfig = (await import(`./prompt/${registered.module}.mjs`)).default;
  const references = registered.reference
    ? [registered.reference]
    : stage === "design"
      ? plan.stages.map(({ name }) => STAGE_BY_NAME[name]?.reference).filter(Boolean)
      : [];
  const config = {
    ...baseConfig,
    command: registered.command ?? baseConfig.command ?? registered.name,
    stageName: registered.stageName ?? baseConfig.stageName,
    directory: registered.directory,
    platform: registered.platform ?? "",
    platformName: registered.platformName ?? "",
    references: [...new Set(references)],
  };
  if (registered.globalPatch) config.globalPatch = registered.globalPatch;
  const promptFile = await runPromptStage(config, {
    target: projectRelative(current.requirementDir),
    includes,
    issue: current.issue,
    dependencies,
  });
  startStage(current, stage, promptFile);
}

async function applyAndContinue(current, nextStage) {
  const state = readWorkState(current);
  const result = findActiveResult(current, state);
  const patches = [result.patchFile, ...result.globalPatchFiles].filter(Boolean);
  for (const patchFile of patches) {
    execFileSync("git", ["apply", "--check", patchFile], { cwd: PROJECT_ROOT, stdio: "inherit" });
    execFileSync("git", ["apply", "--stat", patchFile], { cwd: PROJECT_ROOT, stdio: "inherit" });
  }
  if (nextStage && state.active.stage !== "issue") {
    const plan = readWorkflowPlan(current.requirementDir);
    assertStageReady(plan, state, nextStage, [...state.completed, state.active.stage]);
  }
  console.log(`Current stage: ${state.active.stage}`);
  console.log(result.noChanges ? `Result: no changes (${result.analysisFile})` : `Patches: ${patches.join(", ")}\nAnalysis: ${result.analysisFile}`);
  console.log(`Next: ${nextStage ?? "finish"}`);
  const answer = (await ask("Apply this result and continue? [y/N] ")).trim().toLowerCase();
  if (!['y', 'yes'].includes(answer)) throw new Error("Cancelled.");
  for (const patchFile of patches) execFileSync("git", ["apply", patchFile], { cwd: PROJECT_ROOT, stdio: "inherit" });
  completeActiveStage(current, result);
  console.log(`Completed: ${result.stage}`);
  if (!nextStage) return;
  const plan = readWorkflowPlan(current.requirementDir);
  const nextState = readWorkState(current);
  assertStageReady(plan, nextState, nextStage);
  await generateStage(current, nextStage);
}

export async function main(args = process.argv.slice(2)) {
  const parsed = parseWorkArguments(args);
  if (parsed.command === "req") {
    if (parsed.issue) await selectIssueRequirement(parsed.issue);
    else console.log(formatRequirement(currentRequirement()));
    return;
  }

  const current = currentRequirement();
  if (!current.issue) throw new Error("Current requirement has no Issue information. Run pnpm -s work:req --issue <number> again.");
  if (parsed.command === "status") return printStatus(current);
  if (parsed.command === "next") return applyAndContinue(current, parsed.nextStage);
  await generateStage(current, parsed.command, parsed.includes);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
