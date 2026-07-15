import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "./core/paths.mjs";

const required = [
  "docs/architecture/product.md", "docs/architecture/process.puml", "docs/architecture/c4.puml",
  "docs/contracts/openapi.json", "docs/contracts/asyncapi.json", "docs/contracts/schema.dbml",
  "docs/contracts/authorization.fga", "docs/operations/deployment.md",
  "packages/design-tokens/tokens/index.tokens.json",
];
const failures = [];
if (Number(process.versions.node.split(".")[0]) < 20) failures.push(`Node.js 20+ required; current ${process.versions.node}`);
for (const command of ["git", "gh"]) {
  try { execFileSync(command, ["--version"], { stdio: "ignore" }); }
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
