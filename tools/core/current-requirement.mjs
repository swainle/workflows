import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PROJECT_ROOT, projectRelative } from "./paths.mjs";

const REQUIREMENT_PATTERN = /^REQ-\d{4}-[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/;

function parseIssueNumber(input) {
  const number = Number(input);
  if (!Number.isInteger(number) || number < 1 || number > 9999) {
    throw new Error("Issue number must be an integer from 1 to 9999.");
  }
  return number;
}

function requirementDirectory(input, projectRoot = PROJECT_ROOT) {
  const resolved = path.resolve(projectRoot, input);
  if (resolved !== projectRoot && !resolved.startsWith(`${projectRoot}${path.sep}`)) {
    throw new Error(`Path is outside project root: ${input}`);
  }
  if (!REQUIREMENT_PATTERN.test(path.basename(resolved))) {
    throw new Error("Requirement name must look like REQ-0010-booking.");
  }
  return resolved;
}

export function gitMetadataFile(name, runner = execFileSync, projectRoot = PROJECT_ROOT) {
  let gitPath;
  try {
    gitPath = runner("git", ["rev-parse", "--git-path", name], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    throw new Error(`Unable to locate Git metadata from project root: ${projectRoot}`);
  }
  return path.resolve(projectRoot, gitPath);
}

function stateFile(projectRoot = PROJECT_ROOT, runner = execFileSync) {
  return gitMetadataFile("workflows/current-requirement", runner, projectRoot);
}

export function normalizeShortName(input) {
  const value = input.trim().replace(/\s+/g, "-");
  if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(value)) {
    throw new Error("Requirement short name must use English letters, numbers, spaces, or hyphens.");
  }
  return value;
}

export function requirementsForIssue(input, { projectRoot = PROJECT_ROOT } = {}) {
  const number = parseIssueNumber(input);
  const root = path.join(projectRoot, "docs", "requirements");
  if (!existsSync(root)) return [];
  const prefix = `REQ-${String(number).padStart(4, "0")}-`;
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix) && REQUIREMENT_PATTERN.test(entry.name))
    .map((entry) => path.join(root, entry.name))
    .sort();
}

export function readGithubIssue(input, { projectRoot = PROJECT_ROOT, runner = execFileSync } = {}) {
  const number = parseIssueNumber(input);
  let output;
  try {
    output = runner("gh", ["issue", "view", String(number), "--json", "number,title,url,body,comments"], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const detail = error?.stderr?.toString().trim();
    throw new Error([`Unable to read GitHub Issue #${number}.`, "Install GitHub CLI and run: gh auth login", detail].filter(Boolean).join("\n"));
  }
  return JSON.parse(output);
}

export function selectRequirement(issue, shortName, { projectRoot = PROJECT_ROOT, runner = execFileSync } = {}) {
  const number = parseIssueNumber(issue.number);
  const requirement = `REQ-${String(number).padStart(4, "0")}-${normalizeShortName(shortName)}`;
  const requirementDir = requirementDirectory(path.join("docs", "requirements", requirement), projectRoot);
  const existed = existsSync(requirementDir);
  mkdirSync(path.join(requirementDir, "assets"), { recursive: true });

  const state = {
    requirement,
    requirementDir: path.relative(projectRoot, requirementDir).split(path.sep).join("/"),
    issue: { ...issue, number, title: issue.title, url: issue.url },
  };
  const currentFile = stateFile(projectRoot, runner);
  mkdirSync(path.dirname(currentFile), { recursive: true });
  writeFileSync(currentFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return { ...state, requirementDir, existed };
}

export function currentRequirement({ projectRoot = PROJECT_ROOT, runner = execFileSync } = {}) {
  const currentFile = stateFile(projectRoot, runner);
  if (!existsSync(currentFile)) throw new Error("No current requirement. Run: pnpm -s work:req --issue 36");
  const raw = readFileSync(currentFile, "utf8").trim();
  let saved;
  try {
    saved = JSON.parse(raw);
  } catch {
    saved = { requirementDir: raw, requirement: path.basename(raw), issue: null };
  }
  const requirementDir = requirementDirectory(saved.requirementDir, projectRoot);
  if (!existsSync(requirementDir) || !statSync(requirementDir).isDirectory()) {
    throw new Error(`Current requirement directory not found: ${saved.requirementDir}\nRun pnpm -s work:req --issue <number> again.`);
  }
  return { ...saved, requirement: path.basename(requirementDir), requirementDir };
}

export function formatRequirement(state) {
  return [
    `REQ: ${state.requirement}`,
    `Directory: ${projectRelative(state.requirementDir)}`,
    state.issue ? `Issue: #${state.issue.number} ${state.issue.title}` : "Issue: not recorded; run work:req --issue <number> again",
    state.issue?.url ? `URL: ${state.issue.url}` : null,
  ].filter(Boolean).join("\n");
}
