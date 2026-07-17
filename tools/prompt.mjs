#!/usr/bin/env node

import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { currentRequirement, describeRequirement, selectRequirement } from "./core/current-requirement.mjs";
import { projectRelative } from "./core/paths.mjs";
import { runPromptStage } from "./core/prompt-stage.mjs";
import { createFlowPrompt, parseFlowArguments } from "./flow.mjs";

const STAGE_MODULES = {
  issue: "issues",
  process: "process",
  c4: "c4",
  api: "api",
  database: "database",
  backend: "backend",
  permission: "permission",
  frontend: "frontend",
  test: "test",
  deployment: "deployment",
};

const usage = `Usage:
  pnpm prompt:req <REQ-0010-feature|requirement-directory>
  pnpm prompt:<stage> [--include <path>]
  pnpm prompt:flow --from <stage> --to <stage> --request <text>`;

export function parsePromptArguments(args = process.argv.slice(2)) {
  args = [...args];
  const command = args.shift();
  if (command === "req") {
    const { positionals } = parseArgs({ args, allowPositionals: true, strict: true });
    if (positionals.length !== 1) throw new Error(usage);
    return { command, requirement: positionals[0] };
  }
  if (command === "flow") return { command, ...parseFlowArguments(args) };
  if (STAGE_MODULES[command]) {
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

export async function main(args = process.argv.slice(2)) {
  const parsed = parsePromptArguments(args);
  if (parsed.command === "req") {
    const selected = selectRequirement(parsed.requirement);
    console.log(describeRequirement(selected.requirementDir, selected.existed));
    console.log("Next: pnpm prompt:issue");
    return;
  }

  const requirementDir = currentRequirement();
  if (parsed.command === "flow") {
    console.log(createFlowPrompt({ ...parsed, target: projectRelative(requirementDir) }));
    return;
  }

  const config = (await import(`./prompt/${STAGE_MODULES[parsed.command]}.mjs`)).default;
  await runPromptStage(config, { target: projectRelative(requirementDir), includes: parsed.includes });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
