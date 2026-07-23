#!/usr/bin/env node
/** Update the workflows submodule and install its AGENTS.md into the host root. */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const WORKFLOW_ROOT = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(WORKFLOW_ROOT, "../..");
const UPDATED_FLAG = "--workflows-updated";
const DEFAULT_BRANCH = "main";
const START = "<!-- workflows:begin -->";
const END = "<!-- workflows:end -->";
const STAGE_REFERENCE = /`(docs\/workflows\/stages\/[^`\r\n]+\.md)`/g;

function run(command, args, options = {}, runner = spawnSync) {
  return runner(command, args, { stdio: "inherit", ...options });
}

function runChecked(command, args, options = {}, runner = spawnSync) {
  const result = run(command, args, options, runner);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} exited with status ${result.status}`);
  return result;
}

function requireMountLocation() {
  const expected = path.join(PROJECT_ROOT, "docs/workflows");
  if (path.resolve(WORKFLOW_ROOT) !== path.resolve(expected)) {
    throw new Error(`workflows must be mounted at ${expected}; current location: ${WORKFLOW_ROOT}`);
  }
}

export function parseBranch(args = process.argv.slice(2)) {
  args = args.filter((arg) => arg !== UPDATED_FLAG);
  if (!args.length) return DEFAULT_BRANCH;
  if (args.length === 2 && args[0] === "--branch" && args[1] && !args[1].startsWith("-")) return args[1];
  throw new Error("Usage: install.mjs [--branch <branch>]");
}

export function installBranch(branch, runner = spawnSync) {
  runChecked("git", ["check-ref-format", "--branch", branch], { cwd: WORKFLOW_ROOT, stdio: ["inherit", "ignore", "inherit"] }, runner);
  runChecked("git", ["fetch", "origin", `refs/heads/${branch}:refs/remotes/origin/${branch}`], { cwd: WORKFLOW_ROOT }, runner);
  const local = run("git", ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], { cwd: WORKFLOW_ROOT }, runner);
  if (local.error) throw local.error;
  const switchArgs = local.status === 0 ? ["switch", branch] : ["switch", "-c", branch, `origin/${branch}`];
  runChecked("git", switchArgs, { cwd: WORKFLOW_ROOT }, runner);
  runChecked("git", ["merge", "--ff-only", `origin/${branch}`], { cwd: WORKFLOW_ROOT }, runner);
  runChecked("git", ["submodule", "set-branch", "--branch", branch, "docs/workflows"], { cwd: PROJECT_ROOT }, runner);
  const result = run(process.execPath, [path.join(WORKFLOW_ROOT, "install.mjs"), UPDATED_FLAG, "--branch", branch], { cwd: PROJECT_ROOT }, runner);
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function markerMatches(text, marker) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...text.matchAll(new RegExp(`^${escaped}\\r?$`, "gm"))];
}

export function mergeAgents(existing, template) {
  const starts = markerMatches(existing, START);
  const ends = markerMatches(existing, END);
  if (starts.length !== ends.length || starts.length > 1) throw new Error("Root AGENTS.md has invalid workflows markers.");

  const newline = existing.includes("\r\n") ? "\r\n" : "\n";
  const body = template.replace(/\r?\n/g, newline).trim();
  const block = [
    START,
    "<!-- Managed by docs/workflows/install.mjs; edit docs/workflows/AGENTS.md instead. -->",
    body,
    END,
  ].join(newline);

  if (!starts.length) return `${existing.trimEnd()}${existing.trim() ? newline.repeat(2) : ""}${block}${newline}`;

  const start = starts[0].index;
  const end = ends[0].index;
  if (end < start) throw new Error("Root AGENTS.md has invalid workflows marker order.");
  return `${existing.slice(0, start)}${block}${existing.slice(end + ends[0][0].length)}`;
}

export function validateStageReferences(template, workflowRoot = WORKFLOW_ROOT) {
  const stageRoot = path.resolve(workflowRoot, "stages");
  const references = new Set([...template.matchAll(STAGE_REFERENCE)].map((match) => match[1]));

  for (const reference of references) {
    const relative = reference.slice("docs/workflows/".length);
    const target = path.resolve(workflowRoot, ...relative.split("/"));
    const outside = path.relative(stageRoot, target);
    if (outside === ".." || outside.startsWith(`..${path.sep}`) || path.isAbsolute(outside)) {
      throw new Error(`Invalid stage reference: ${reference}`);
    }
    if (!existsSync(target)) throw new Error(`Missing stage file: ${reference}`);
  }

  return references.size;
}

export function installAgents({
  projectRoot = PROJECT_ROOT,
  workflowRoot = WORKFLOW_ROOT,
} = {}) {
  const source = path.join(workflowRoot, "AGENTS.md");
  const target = path.join(projectRoot, "AGENTS.md");
  const template = readFileSync(source, "utf8");
  validateStageReferences(template, workflowRoot);
  const existing = existsSync(target) ? readFileSync(target, "utf8") : "";
  const content = mergeAgents(existing, template);
  if (content === existing) return "unchanged";

  const temporary = `${target}.${process.pid}.tmp`;
  try {
    writeFileSync(temporary, content, "utf8");
    renameSync(temporary, target);
  } finally {
    rmSync(temporary, { force: true });
  }
  return existing ? "updated" : "created";
}

export async function main() {
  try {
    const branch = parseBranch();
    requireMountLocation();
    if (!process.argv.includes(UPDATED_FLAG)) return installBranch(branch);
    const result = installAgents();
    console.log(`${result === "unchanged" ? "Root AGENTS.md is already up to date" : `${result === "created" ? "Created" : "Updated"} root AGENTS.md`}.`);
    console.log(`Workflows branch: ${branch}`);
    return 0;
  } catch (error) {
    console.error(`Installation failed: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await main();
}
