import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PROJECT_ROOT, projectRelative } from "./paths.mjs";

const REQUIREMENT_PATTERN = /^REQ-\d{4}-[A-Za-z0-9][A-Za-z0-9_-]*$/;

function requirementDirectory(input, projectRoot = PROJECT_ROOT) {
  const resolved = input.includes("/") || input.includes("\\")
    ? path.resolve(projectRoot, input)
    : path.join(projectRoot, "docs", "requirements", input);
  if (resolved !== projectRoot && !resolved.startsWith(`${projectRoot}${path.sep}`)) {
    throw new Error(`Path is outside project root: ${input}`);
  }
  if (!REQUIREMENT_PATTERN.test(path.basename(resolved))) {
    throw new Error("Requirement name must look like REQ-0010-booking.");
  }
  return resolved;
}

function stateFile(projectRoot = PROJECT_ROOT, runner = execFileSync) {
  let gitPath;
  try {
    gitPath = runner("git", ["rev-parse", "--git-path", "workflows/current-requirement"], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    throw new Error(`Unable to locate Git metadata from project root: ${projectRoot}`);
  }
  return path.resolve(projectRoot, gitPath);
}

export function selectRequirement(input, { projectRoot = PROJECT_ROOT, runner = execFileSync } = {}) {
  if (!input) throw new Error("Usage: pnpm prompt:req <REQ-0010-feature|requirement-directory>");
  const requirementDir = requirementDirectory(input, projectRoot);
  const existed = existsSync(requirementDir);
  mkdirSync(path.join(requirementDir, "change", "assets"), { recursive: true });
  const currentFile = stateFile(projectRoot, runner);
  mkdirSync(path.dirname(currentFile), { recursive: true });
  writeFileSync(currentFile, `${path.relative(projectRoot, requirementDir).split(path.sep).join("/")}\n`, "utf8");
  return { requirementDir, existed };
}

export function currentRequirement({ projectRoot = PROJECT_ROOT, runner = execFileSync } = {}) {
  const currentFile = stateFile(projectRoot, runner);
  if (!existsSync(currentFile)) throw new Error("No current requirement. Run: pnpm prompt:req REQ-0010-feature");
  const input = readFileSync(currentFile, "utf8").trim();
  const requirementDir = requirementDirectory(input, projectRoot);
  if (!existsSync(requirementDir) || !statSync(requirementDir).isDirectory()) {
    throw new Error(`Current requirement directory not found: ${input}\nRun pnpm prompt:req again.`);
  }
  return requirementDir;
}

export function describeRequirement(requirementDir, existed) {
  return `${existed ? "Requirement already exists" : "Created requirement"}: ${projectRelative(requirementDir)}`;
}
