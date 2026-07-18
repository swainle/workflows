import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "./core/paths.mjs";

const required = [
  "docs/architecture/product.md", "docs/architecture/technology.md", "docs/architecture/process", "docs/architecture/c4.md",
  "docs/development/git-workflow.md",
  "docs/contracts/openapi.json", "docs/contracts/asyncapi.json", "docs/contracts/schema.dbml",
  "docs/contracts/authorization.fga", "docs/architecture/deployment.md",
  "packages/design-tokens/tokens/token.json", "packages/design-tokens/tokens/web.token.json",
  "packages/design-tokens/tokens/mini-program.token.json", "packages/design-tokens/tokens/desktop.token.json",
  "packages/design-tokens/tokens/mobile.token.json",
];
const failures = [];
if (Number(process.versions.node.split(".")[0]) < 20) failures.push(`Node.js 20+ required; current ${process.versions.node}`);
for (const [command, args] of [["git", ["--version"]], ["gh", ["--version"]]]) {
  try { execFileSync(command, args, { stdio: "ignore" }); }
  catch { failures.push(`Command not found: ${command}`); }
}
for (const relative of required) {
  if (!existsSync(path.join(PROJECT_ROOT, relative))) failures.push(`Missing: ${relative}`);
}
if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log("AI project workflows are ready.");
