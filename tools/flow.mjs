#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { projectRelative, requireDirectory, WORKFLOW_ROOT } from "./core/paths.mjs";

export const STAGES = [
  "issue", "process", "c4", "api", "database",
  "backend", "permission", "frontend", "test", "deployment",
];

const usage = "Usage: pnpm prompt:flow --from <stage> --to <stage> --request <text>";

export function parseFlowArguments(args = process.argv.slice(2)) {
  const options = {};
  while (args.length) {
    const flag = args.shift();
    if (!["--from", "--to", "--request"].includes(flag) || !args.length || options[flag]) {
      throw new Error(usage);
    }
    options[flag] = args.shift();
  }
  if (!options["--from"] || !options["--to"] || !options["--request"]?.trim()) {
    throw new Error(usage);
  }
  const from = STAGES.indexOf(options["--from"]);
  const to = STAGES.indexOf(options["--to"]);
  if (from < 0 || to < from) throw new Error(`Stages must follow this order: ${STAGES.join(", ")}`);
  return { from: STAGES[from], to: STAGES[to], request: options["--request"].trim(), stages: STAGES.slice(from, to + 1) };
}

function timestamp(now = new Date()) {
  const part = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(), part(now.getMonth() + 1), part(now.getDate()),
    part(now.getHours()), part(now.getMinutes()), part(now.getSeconds()),
  ].join("");
}

export function createFlowPrompt({ target, from, to, request, stages }) {
  const requirementDir = requireDirectory(target, "Requirement directory");
  if (!/^REQ-\d{4}-[A-Za-z0-9][A-Za-z0-9_-]*$/.test(path.basename(requirementDir))) {
    throw new Error("Requirement directory must look like REQ-0010-feature.");
  }
  const prdFile = path.join(requirementDir, "01-prd.md");
  if (from !== "issue" && !existsSync(prdFile)) {
    throw new Error(`01-prd.md not found in requirement directory: ${target}`);
  }

  const createdAt = timestamp();
  const outputDir = path.join(requirementDir, "change", "flow");
  const outputFile = path.join(outputDir, `${createdAt}_prompt.md`);
  if (existsSync(outputFile)) throw new Error(`Prompt already exists: ${projectRelative(outputFile)}`);

  const template = readFileSync(path.join(WORKFLOW_ROOT, "templates", "flow.prompt.md"), "utf8");
  const values = {
    "{{REQUIREMENT}}": path.basename(requirementDir),
    "{{REQUIREMENT_DIR}}": projectRelative(requirementDir),
    "{{FROM_STAGE}}": from,
    "{{TO_STAGE}}": to,
    "{{CREATED_AT}}": createdAt,
    "{{STAGE_COMMANDS}}": stages.map((stage, index) => `${index + 1}. \`pnpm prompt:${stage}\``).join("\n"),
    "{{REQUEST}}": request,
  };
  let prompt = template;
  for (const [key, value] of Object.entries(values)) prompt = prompt.replaceAll(key, value);
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputFile, `${prompt.trimEnd()}\n`, "utf8");
  return projectRelative(outputFile);
}
