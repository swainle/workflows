import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const TEXT_EXTENSIONS = new Set([
  ".css", ".dbml", ".feature", ".fga", ".html", ".js", ".json", ".jsx",
  ".md", ".mjs", ".patch", ".scss", ".svg", ".ts", ".tsx", ".yaml", ".yml", ".env",
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
