import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { walkTextFiles } from "./files.mjs";
import { WORKFLOW_ROOT, fromProject, projectRelative } from "./paths.mjs";
import { STAGE_BY_NAME } from "./stages.mjs";

const MAX_CONTEXT_BYTES = 1_500_000;

function timestamp(now = new Date()) {
  const part = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(), part(now.getMonth() + 1), part(now.getDate()),
    part(now.getHours()), part(now.getMinutes()), part(now.getSeconds()),
  ].join("");
}

function language(file) {
  const extension = path.extname(file).slice(1).toLowerCase();
  return extension === "puml" ? "plantuml" : extension;
}

function requirementStageFiles(requirementDir, config, dependencies) {
  const directories = new Set([
    STAGE_BY_NAME.issue.directory,
    config.directory,
    ...dependencies.map((name) => STAGE_BY_NAME[name].directory),
  ]);
  return [...directories].flatMap((relative) => {
    const directory = path.join(requirementDir, relative);
    if (!existsSync(directory)) return [];
    return readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .flatMap((entry) => walkTextFiles(path.join(directory, entry.name)));
  });
}

function collectContext(config, requirementDir, requirementFile, issue, dependencies) {
  const selected = new Set();
  for (const relative of config.globals ?? []) {
    for (const file of walkTextFiles(fromProject(relative))) selected.add(file);
  }
  if (existsSync(requirementFile)) selected.add(requirementFile);
  if (config.command === "issues") {
    for (const name of ["00-issue.md", "01-prd.md"]) {
      const legacy = path.join(requirementDir, name);
      if (existsSync(legacy)) selected.add(legacy);
    }
  }
  for (const file of requirementStageFiles(requirementDir, config, dependencies)) selected.add(file);

  const blocks = [];
  let bytes = 0;
  for (const file of [...selected].sort()) {
    const content = readFileSync(file, "utf8");
    bytes += Buffer.byteLength(content);
    if (bytes > MAX_CONTEXT_BYTES) {
      blocks.push("## 上下文限制\n\n其余文件未加入。请精简当前需求产物后重试。");
      break;
    }
    blocks.push(`## 文件：${projectRelative(file)}\n\n\`\`\`${language(file)}\n${content.trimEnd()}\n\`\`\``);
  }

  const assetsDir = path.join(requirementDir, "assets");
  if (existsSync(assetsDir)) {
    const assets = readdirSync(assetsDir).sort();
    if (assets.length) blocks.push(`## 资源\n\n${assets.map((name) => `- ${projectRelative(path.join(assetsDir, name))}`).join("\n")}`);
  }

  if (config.githubIssues) {
    if (!issue) throw new Error("Current requirement has no Issue information. Run pnpm -s work:req --issue <number> again.");
    blocks.unshift([
      "## GitHub Issue",
      "",
      `- 主 Issue：#${issue.number}`,
      `- 标题：${issue.title}`,
      `- URL：${issue.url}`,
      "",
      `通过以上 URL 或 \`gh issue view ${issue.number}\` 阅读主 Issue 完整内容。不要读取无关 Issue。`,
    ].join("\n"));
  }
  return blocks.join("\n\n");
}

export function stageConfigFile(name) {
  return path.join(WORKFLOW_ROOT, "config", "stages", `${name}.md`);
}

export function readStageConfig(name) {
  const file = stageConfigFile(name);
  if (!existsSync(file)) throw new Error(`Stage config not found: ${file}`);
  return readFileSync(file, "utf8").trim();
}

export async function runPromptStage(config, { target, requirement = "", issue = null, dependencies = [] }) {
  const requirementDir = fromProject(target);
  if (!existsSync(requirementDir) || !statSync(requirementDir).isDirectory()) {
    throw new Error(`Requirement directory not found: ${target}`);
  }
  const requirementFile = path.join(requirementDir, "issue", "issue.md");
  if (config.command !== "issues" && (!existsSync(requirementFile) || !statSync(requirementFile).isFile())) {
    throw new Error(`issue/issue.md not found in requirement directory: ${target}`);
  }
  if (!/^REQ-\d{4}-[A-Za-z0-9][A-Za-z0-9_-]*$/.test(path.basename(requirementDir))) {
    throw new Error("Requirement directory must look like REQ-0010-feature.");
  }

  const now = Date.now();
  let createdAt;
  let outputDir;
  let seconds = 0;
  do {
    createdAt = timestamp(new Date(now + seconds++ * 1000));
    outputDir = path.join(requirementDir, config.directory, createdAt);
  } while (existsSync(outputDir));
  mkdirSync(outputDir, { recursive: true });
  const promptName = "prompt.md";
  const patchName = "prompt.01.git.patch";
  const analysisName = `${patchName}.md`;
  const promptFile = path.join(outputDir, promptName);
  if (existsSync(promptFile)) throw new Error(`Prompt already exists: ${projectRelative(promptFile)}`);

  const base = readFileSync(path.join(WORKFLOW_ROOT, "templates", "base.prompt.md"), "utf8");
  const stage = readFileSync(path.join(WORKFLOW_ROOT, "templates", config.template), "utf8");
  const replacements = {
    "{{STAGE}}": config.command,
    "{{STAGE_NAME}}": config.stageName,
    "{{REQUIREMENT}}": path.basename(requirementDir),
    "{{REQUIREMENT_DIR}}": projectRelative(requirementDir),
    "{{REQUIREMENT_PATH}}": projectRelative(requirementFile),
    "{{PROMPT_FILE}}": projectRelative(promptFile),
    "{{RUN_DIR}}": projectRelative(outputDir),
    "{{PATCH_NAME}}": patchName,
    "{{PATCH_FILE}}": projectRelative(path.join(outputDir, patchName)),
    "{{ANALYSIS_FILE}}": projectRelative(path.join(outputDir, analysisName)),
    "{{CREATED_AT}}": createdAt,
    "{{ISSUE_NUMBER}}": issue?.number ?? "",
    "{{ISSUE_URL}}": issue?.url ?? "",
    "{{PLATFORM}}": config.platform ?? "",
    "{{PLATFORM_NAME}}": config.platformName ?? "",
    "{{DEFAULT_REQUIREMENTS}}": readStageConfig(config.module),
    "{{USER_REQUIREMENT}}": requirement.trim() || "无。",
    "{{PLATFORM_REFERENCES}}": (config.references ?? []).map((relative) => {
      const file = path.join(WORKFLOW_ROOT, relative);
      return `## ${relative}\n\n${readFileSync(file, "utf8").trim()}`;
    }).join("\n\n"),
    "{{STAGE_INSTRUCTIONS}}": stage.trim(),
    "{{CONTEXT}}": collectContext(config, requirementDir, requirementFile, issue, dependencies),
  };
  let prompt = base;
  for (const [key, value] of Object.entries(replacements)) prompt = prompt.replaceAll(key, value);
  for (const [key, value] of Object.entries(replacements)) prompt = prompt.replaceAll(key, value);
  writeFileSync(promptFile, `${prompt.trimEnd()}\n`, "utf8");
  const output = projectRelative(promptFile);
  console.log(output);
  return output;
}
