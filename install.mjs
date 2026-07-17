#!/usr/bin/env node
/** Install AI project workflow commands and default documents into a host repo. */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { STAGE_NAMES } from "./tools/core/stages.mjs";

export const WORKFLOW_ROOT = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(WORKFLOW_ROOT, "../..");
const PACKAGE_FILE = path.join(PROJECT_ROOT, "package.json");

const SCRIPTS = Object.fromEntries([
  ["work:check", "node docs/workflows/tools/check.mjs"],
  ["work:req", "node docs/workflows/tools/work.mjs req"],
  ["work:status", "node docs/workflows/tools/work.mjs status"],
  ["work:next", "node docs/workflows/tools/work.mjs next"],
  ...STAGE_NAMES.map((stage) => [`work:${stage}`, `node docs/workflows/tools/work.mjs ${stage}`]),
]);
const LEGACY_SCRIPTS = new Set([
  "prompt:check", "prompt:req", "prompt:flow", "prompt:issue", "prompt:process", "prompt:c4",
  "prompt:api", "prompt:database", "prompt:backend", "prompt:permission", "prompt:frontend",
  "prompt:test", "prompt:deployment",
  "work:frontend",
]);

const DEFAULT_TARGETS = {
  architecture: path.join(PROJECT_ROOT, "docs/architecture"),
  contracts: path.join(PROJECT_ROOT, "docs/contracts"),
  "design-tokens": path.join(PROJECT_ROOT, "packages/design-tokens/tokens"),
};
const UPDATED_FLAG = "--workflows-updated";
const DEFAULT_BRANCH = "main";
const PLANTUML_VERSION = "1.2026.6";
const PLANTUML_URL = `https://github.com/plantuml/plantuml/releases/download/v${PLANTUML_VERSION}/plantuml-${PLANTUML_VERSION}.jar`;
const PLANTUML_SHA256 = "89948f14c93756c7a3fb7b69078ff37e8489fd79dd430c582b931e2f65358690";
const PLANTUML_FILE = path.join(WORKFLOW_ROOT, "packages/plantuml.jar");

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

export async function installPlantUml({
  target = PLANTUML_FILE,
  url = PLANTUML_URL,
  expectedSha256 = PLANTUML_SHA256,
  fetcher = fetch,
} = {}) {
  const sha256 = (data) => createHash("sha256").update(data).digest("hex");
  if (existsSync(target) && sha256(readFileSync(target)) === expectedSha256) return false;

  const response = await fetcher(url);
  if (!response.ok) throw new Error(`Unable to download PlantUML: HTTP ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  const actualSha256 = sha256(data);
  if (actualSha256 !== expectedSha256) {
    throw new Error(`PlantUML checksum mismatch: expected ${expectedSha256}, received ${actualSha256}`);
  }

  mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp`;
  writeFileSync(temporary, data);
  rmSync(target, { force: true });
  renameSync(temporary, target);
  return true;
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
    if (name.startsWith("docs:workflows:") || LEGACY_SCRIPTS.has(name)) delete data.scripts[name];
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

function migrateFile(projectRoot, sourceRelative, targetRelative) {
  const source = path.join(projectRoot, sourceRelative);
  const target = path.join(projectRoot, targetRelative);
  if (!existsSync(source) || existsSync(target)) return false;
  mkdirSync(path.dirname(target), { recursive: true });
  renameSync(source, target);
  return true;
}

export function migrateDeploymentDocument(projectRoot = PROJECT_ROOT) {
  return migrateFile(projectRoot, "docs/operations/deployment.md", "docs/architecture/deployment.md");
}

export function migrateProcessDocument(projectRoot = PROJECT_ROOT) {
  return migrateFile(projectRoot, "docs/architecture/process.puml", "docs/architecture/process/overview.puml");
}

export async function main() {
  try {
    const branch = parseBranch();
    requireMountLocation();
    if (!process.argv.includes(UPDATED_FLAG)) return installBranch(branch);
    const downloadedPlantUml = await installPlantUml();
    updatePackageJson();
    const migratedDeployment = migrateDeploymentDocument();
    const migratedProcess = migrateProcessDocument();
    const created = copyDefaults();
    console.log(`Installed ${Object.keys(SCRIPTS).length} pnpm commands.`);
    console.log(downloadedPlantUml ? `Downloaded PlantUML ${PLANTUML_VERSION}.` : "PlantUML is ready.");
    if (migratedDeployment) console.log("Moved docs/operations/deployment.md to docs/architecture/deployment.md.");
    if (migratedProcess) console.log("Moved docs/architecture/process.puml to docs/architecture/process/overview.puml.");
    console.log(`Created ${created.length} missing default files.`);
    console.log("Existing project documents were not overwritten.");
    return 0;
  } catch (error) {
    console.error(`Installation failed: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await main();
}
