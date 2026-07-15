import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PROJECT_ROOT, fromProject, projectRelative } from "./core/paths.mjs";

const input = process.argv[2];
if (!input) throw new Error("Usage: pnpm docs:workflows:req <REQ-nnn-name|requirement-directory>");

const requirementDir = input.includes("/") || input.includes("\\")
  ? fromProject(input)
  : path.join(PROJECT_ROOT, "docs", "requirements", input);

if (!/^REQ-\d{3,}-[A-Za-z0-9_-]+$/.test(path.basename(requirementDir))) {
  throw new Error("Requirement name must look like REQ-036-booking-fixture.");
}

const existed = existsSync(requirementDir);
mkdirSync(path.join(requirementDir, "change", "assets"), { recursive: true });
console.log(`${existed ? "Requirement already exists" : "Created requirement"}: ${projectRelative(requirementDir)}`);
console.log(`Next: pnpm docs:workflows:prompt:issues ${projectRelative(requirementDir)}`);
