import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { mergeAsyncApi, mergeOpenApi, mergeTokenTree } from "./merge-json.mjs";
import { PROJECT_ROOT, fromProject, projectRelative, requireFile } from "./paths.mjs";

function printDiff(target) {
  try {
    execFileSync("git", ["diff", "--", projectRelative(target)], { cwd: PROJECT_ROOT, stdio: "inherit" });
  } catch {
    console.log(`Updated: ${projectRelative(target)}`);
  }
}

function requirementName(source) {
  const parts = projectRelative(source).split("/");
  const name = parts.find((part) => part.startsWith("REQ-"));
  if (!/^REQ-\d{4}-[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name ?? "")) {
    throw new Error("Patch file must be inside docs/requirements/REQ-0010-feature/.");
  }
  return name;
}

function textMarkers(extension, id) {
  if (extension === ".md") return [`<!-- handover:start ${id} -->`, `<!-- handover:end ${id} -->`];
  if (extension === ".puml") return [`' handover:start ${id}`, `' handover:end ${id}`];
  if (extension === ".dbml") return [`// handover:start ${id}`, `// handover:end ${id}`];
  return [`# handover:start ${id}`, `# handover:end ${id}`];
}

function mergeText(targetContent, patchContent, extension, id) {
  const [start, end] = textMarkers(extension, id);
  let fragment = patchContent.trim();
  if (extension === ".puml") fragment = fragment.replace(/^@startuml[^\n]*\n?/, "").replace(/\n?@enduml\s*$/, "").trim();
  if (extension === ".fga") fragment = fragment.replace(/^model\s+schema\s+[\d.]+\s*/m, "").trim();
  const block = `${start}\n${fragment}\n${end}`;
  const existing = targetContent.indexOf(start);
  if (existing >= 0) {
    const finish = targetContent.indexOf(end, existing);
    if (finish < 0) throw new Error(`Missing block end marker in target: ${end}`);
    return `${targetContent.slice(0, existing)}${block}${targetContent.slice(finish + end.length)}`;
  }
  if (extension === ".puml" && targetContent.includes("@enduml")) {
    return targetContent.replace(/\s*@enduml\s*$/, `\n${block}\n@enduml\n`);
  }
  return `${targetContent.trimEnd()}\n\n${block}\n`;
}

export function runJsonPatch({ targets, kind }) {
  const input = process.argv[2];
  if (!input) throw new Error("Missing requirement patch file.");
  const source = requireFile(input, "Requirement patch");
  const targetRelative = targets[path.basename(source)];
  if (!targetRelative) throw new Error(`Unsupported ${kind} patch filename: ${path.basename(source)}`);
  requirementName(source);
  const target = requireFile(targetRelative, "Global target");
  const current = JSON.parse(readFileSync(target, "utf8"));
  const patch = JSON.parse(readFileSync(source, "utf8"));
  const merged = kind === "openapi" ? mergeOpenApi(current, patch)
    : kind === "asyncapi" ? mergeAsyncApi(current, patch)
      : mergeTokenTree(current, patch);
  writeFileSync(target, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  printDiff(target);
}

export function runTextPatch({ expectedName, expectedPattern, target: targetRelative }) {
  const input = process.argv[2];
  if (!input) throw new Error("Missing requirement patch file.");
  const source = requireFile(input, "Requirement patch");
  const filename = path.basename(source);
  if (expectedPattern ? !expectedPattern.test(filename) : filename !== expectedName) {
    throw new Error(`Expected ${expectedName}.`);
  }
  const requirement = requirementName(source);
  const target = requireFile(targetRelative, "Global target");
  const merged = mergeText(
    readFileSync(target, "utf8"), readFileSync(source, "utf8"),
    path.extname(target), `${requirement}:${path.basename(source)}`,
  );
  writeFileSync(target, merged, "utf8");
  printDiff(target);
}
