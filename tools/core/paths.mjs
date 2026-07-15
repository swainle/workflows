import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const WORKFLOW_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const PROJECT_ROOT = path.resolve(WORKFLOW_ROOT, "../..");

export function fromProject(input) {
  const resolved = path.resolve(PROJECT_ROOT, input);
  if (resolved !== PROJECT_ROOT && !resolved.startsWith(`${PROJECT_ROOT}${path.sep}`)) {
    throw new Error(`Path is outside project root: ${input}`);
  }
  return resolved;
}

export function projectRelative(input) {
  return path.relative(PROJECT_ROOT, input).split(path.sep).join("/");
}

export function requireFile(input, label = "File") {
  const resolved = fromProject(input);
  if (!existsSync(resolved) || !statSync(resolved).isFile()) {
    throw new Error(`${label} not found: ${input}`);
  }
  return resolved;
}

export function requireDirectory(input, label = "Directory") {
  const resolved = fromProject(input);
  if (!existsSync(resolved) || !statSync(resolved).isDirectory()) {
    throw new Error(`${label} not found: ${input}`);
  }
  return resolved;
}
