#!/usr/bin/env node
/** Install AI project workflow commands and default documents into a host repo. */

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const WORKFLOW_ROOT = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(WORKFLOW_ROOT, "../..");
const PACKAGE_FILE = path.join(PROJECT_ROOT, "package.json");

const SCRIPTS = {
  "docs:workflows:check": "node docs/workflows/tools/check.mjs",
  "docs:workflows:req": "node docs/workflows/tools/requirement.mjs",
  "docs:workflows:prompt:issues": "node docs/workflows/tools/prompt/issues.mjs",
  "docs:workflows:prompt:prd": "node docs/workflows/tools/prompt/prd.mjs",
  "docs:workflows:prompt:process": "node docs/workflows/tools/prompt/process.mjs",
  "docs:workflows:prompt:frontend": "node docs/workflows/tools/prompt/frontend.mjs",
  "docs:workflows:prompt:api": "node docs/workflows/tools/prompt/api.mjs",
  "docs:workflows:prompt:database": "node docs/workflows/tools/prompt/database.mjs",
  "docs:workflows:prompt:backend": "node docs/workflows/tools/prompt/backend.mjs",
  "docs:workflows:prompt:permission": "node docs/workflows/tools/prompt/permission.mjs",
  "docs:workflows:prompt:test": "node docs/workflows/tools/prompt/test.mjs",
  "docs:workflows:prompt:deployment": "node docs/workflows/tools/prompt/deployment.mjs",
  "docs:workflows:patch:process": "node docs/workflows/tools/patch/process.mjs",
  "docs:workflows:patch:frontend": "node docs/workflows/tools/patch/frontend.mjs",
  "docs:workflows:patch:api": "node docs/workflows/tools/patch/api.mjs",
  "docs:workflows:patch:database": "node docs/workflows/tools/patch/database.mjs",
  "docs:workflows:patch:backend": "node docs/workflows/tools/patch/backend.mjs",
  "docs:workflows:patch:permission": "node docs/workflows/tools/patch/permission.mjs",
  "docs:workflows:patch:deployment": "node docs/workflows/tools/patch/deployment.mjs",
};

const DEFAULT_TARGETS = {
  architecture: path.join(PROJECT_ROOT, "docs/architecture"),
  contracts: path.join(PROJECT_ROOT, "docs/contracts"),
  operations: path.join(PROJECT_ROOT, "docs/operations"),
  "design-tokens": path.join(PROJECT_ROOT, "packages/design-tokens/tokens"),
};
const UPDATED_FLAG = "--workflows-updated";
const DEFAULT_BRANCH = "main";

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
  if (args.length === 2 && args[0] === "--branch" && !args[1].startsWith("-")) return args[1];
  throw new Error("Usage: install.mjs [--branch <branch>]");
}

export function installBranch(branch, runner = spawnSync) {
  runChecked("git", ["check-ref-format", "--branch", branch], { cwd: WORKFLOW_ROOT, stdio: ["inherit", "ignore", "inherit"] }, runner);
  runChecked("git", ["fetch", "origin", `refs/heads/${branch}:refs/remotes/origin/${branch}`], { cwd: WORKFLOW_ROOT }, runner);
  const local = run("git", ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], { cwd: WORKFLOW_ROOT }, runner);
  if (local.error) throw local.error;
  const switchArgs = local.status === 0
    ? ["switch", branch]
    : ["switch", "-c", branch, `origin/${branch}`];
  runChecked("git", switchArgs, { cwd: WORKFLOW_ROOT }, runner);
  runChecked("git", ["merge", "--ff-only", `origin/${branch}`], { cwd: WORKFLOW_ROOT }, runner);
  runChecked("git", ["submodule", "set-branch", "--branch", branch, "docs/workflows"], { cwd: PROJECT_ROOT }, runner);
  const result = run(process.execPath, [path.join(WORKFLOW_ROOT, "install.mjs"), UPDATED_FLAG, "--branch", branch], { cwd: PROJECT_ROOT }, runner);
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function updatePackageJson() {
  if (!existsSync(PACKAGE_FILE)) throw new Error(`host package.json not found: ${PACKAGE_FILE}`);
  const data = JSON.parse(readFileSync(PACKAGE_FILE, "utf8"));
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`host package.json must contain an object: ${PACKAGE_FILE}`);
  }
  data.scripts ??= {};
  if (!data.scripts || typeof data.scripts !== "object" || Array.isArray(data.scripts)) {
    throw new Error(`host package.json scripts must be an object: ${PACKAGE_FILE}`);
  }
  for (const name of Object.keys(data.scripts)) {
    if (name.startsWith("docs:workflows:")) delete data.scripts[name];
  }
  Object.assign(data.scripts, SCRIPTS);
  const temporary = `${PACKAGE_FILE}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  renameSync(temporary, PACKAGE_FILE);
}

function filesUnder(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const item = path.join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(item) : entry.isFile() ? [item] : [];
    });
}

function copyDefaults() {
  const created = [];
  const defaults = path.join(WORKFLOW_ROOT, "defaults");
  for (const [sourceName, targetDir] of Object.entries(DEFAULT_TARGETS)) {
    const sourceDir = path.join(defaults, sourceName);
    mkdirSync(targetDir, { recursive: true });
    for (const source of filesUnder(sourceDir)) {
      const target = path.join(targetDir, path.relative(sourceDir, source));
      mkdirSync(path.dirname(target), { recursive: true });
      if (existsSync(target)) continue;
      copyFileSync(source, target);
      const info = statSync(source);
      chmodSync(target, info.mode);
      utimesSync(target, info.atime, info.mtime);
      created.push(target);
    }
  }
  mkdirSync(path.join(PROJECT_ROOT, "docs/requirements"), { recursive: true });
  return created;
}

export function main() {
  try {
    const branch = parseBranch();
    requireMountLocation();
    if (!process.argv.includes(UPDATED_FLAG)) return installBranch(branch);
    updatePackageJson();
    const created = copyDefaults();
    console.log(`Installed ${Object.keys(SCRIPTS).length} pnpm commands.`);
    console.log(`Created ${created.length} missing default files.`);
    console.log("Existing project documents were not overwritten.");
    return 0;
  } catch (error) {
    console.error(`Installation failed: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = main();
}
