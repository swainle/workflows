import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fromProject } from "./paths.mjs";

const TEXT_EXTENSIONS = new Set([
  ".css", ".dbml", ".feature", ".fga", ".html", ".js", ".json", ".jsx",
  ".md", ".mjs", ".patch", ".puml", ".scss", ".svg", ".ts", ".tsx", ".yaml", ".yml",
]);
const EXCLUDED = new Set([".git", ".next", "build", "coverage", "dist", "node_modules"]);
const MAX_FILE_BYTES = 150_000;

export function walkTextFiles(input, output = []) {
  if (!existsSync(input)) return output;
  const info = statSync(input);
  if (info.isFile()) {
    if (TEXT_EXTENSIONS.has(path.extname(input).toLowerCase()) && info.size <= MAX_FILE_BYTES) {
      output.push(input);
    }
    return output;
  }
  for (const name of readdirSync(input).sort()) {
    if (EXCLUDED.has(name) || name.startsWith(".env") || /\.(key|pem)$/i.test(name)) continue;
    walkTextFiles(path.join(input, name), output);
  }
  return output;
}

export function referencedFiles(text) {
  const files = [];
  for (const match of text.matchAll(/`([^`\n]+)`/g)) {
    const value = match[1].trim();
    if (!value || value.includes(" ") || value.startsWith("pnpm ")) continue;
    try {
      const candidate = fromProject(value);
      for (const file of walkTextFiles(candidate)) files.push(file);
    } catch {
      // Ignore invalid references; explicit includes remain available.
    }
  }
  return files;
}

export function readUtf8(file) {
  return readFileSync(file, "utf8");
}
