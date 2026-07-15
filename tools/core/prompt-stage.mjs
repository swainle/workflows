import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { referencedFiles, walkTextFiles } from "./files.mjs";
import { PROJECT_ROOT, WORKFLOW_ROOT, fromProject, projectRelative } from "./paths.mjs";

const MAX_CONTEXT_BYTES = 1_500_000;

function parseArguments(stage, targetKind) {
  const args = process.argv.slice(2);
  const target = args.shift();
  const includes = [];
  while (args.length) {
    const flag = args.shift();
    if (flag !== "--include" || !args.length) {
      throw new Error(`Usage: pnpm docs:workflows:prompt:${stage} <target> [--include <path>]`);
    }
    includes.push(args.shift());
  }
  if (!target) {
    const expected = targetKind === "requirement-directory" ? "requirement directory" : "01-prd.md";
    throw new Error(`Missing ${expected}.`);
  }
  return { target, includes };
}

function timestamp() {
  const now = new Date();
  const part = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(), part(now.getMonth() + 1), part(now.getDate()),
    part(now.getHours()), part(now.getMinutes()), part(now.getSeconds()),
  ].join("");
}

function issueNumberFromRequirement(requirementDir) {
  const match = path.basename(requirementDir).match(/^REQ-(\d+)-/);
  return match ? Number(match[1]) : null;
}

function githubIssues() {
  let output;
  try {
    output = execFileSync("gh", [
      "issue", "list", "--state", "all", "--limit", "10000",
      "--json", "number,title,body,state,labels,milestone,url,createdAt,updatedAt",
    ], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      maxBuffer: 50_000_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const detail = error?.stderr?.toString().trim();
    throw new Error([
      "Unable to read GitHub Issues.",
      "Install GitHub CLI and run: gh auth login",
      detail,
    ].filter(Boolean).join("\n"));
  }
  return JSON.parse(output)
    .sort((a, b) => a.number - b.number)
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      labels: (issue.labels ?? []).map((label) => label.name),
      milestone: issue.milestone?.title ?? null,
      url: issue.url,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    }));
}

function language(file) {
  const extension = path.extname(file).slice(1).toLowerCase();
  return extension === "puml" ? "plantuml" : extension;
}

function requirementStageFiles(requirementDir, maxPrefix) {
  return readdirSync(requirementDir)
    .filter((name) => {
      const match = name.match(/^(\d{2})-/);
      return match && Number(match[1]) <= maxPrefix;
    })
    .flatMap((name) => walkTextFiles(path.join(requirementDir, name)));
}

function collectContext(config, requirementDir, prdFile, includes) {
  const selected = new Set();
  for (const relative of config.globals) {
    for (const file of walkTextFiles(fromProject(relative))) selected.add(file);
  }
  if (existsSync(prdFile)) selected.add(prdFile);
  for (const file of requirementStageFiles(requirementDir, config.maxRequirementPrefix)) selected.add(file);

  const initialText = [...selected].map((file) => readFileSync(file, "utf8")).join("\n");
  for (const file of referencedFiles(initialText)) selected.add(file);
  for (const include of includes) {
    for (const file of walkTextFiles(fromProject(include))) selected.add(file);
  }

  const blocks = [];
  let bytes = 0;
  for (const file of [...selected].sort()) {
    const content = readFileSync(file, "utf8");
    bytes += Buffer.byteLength(content);
    if (bytes > MAX_CONTEXT_BYTES) {
      blocks.push("## 上下文限制\n\n其余文件未加入。请缩小 `--include` 范围后重试。");
      break;
    }
    blocks.push(`## 文件：${projectRelative(file)}\n\n\`\`\`${language(file)}\n${content.trimEnd()}\n\`\`\``);
  }

  const assetsDir = path.join(requirementDir, "change", "assets");
  if (existsSync(assetsDir)) {
    const assets = readdirSync(assetsDir).sort();
    if (assets.length) blocks.push(`## 资源\n\n${assets.map((name) => `- ${projectRelative(path.join(assetsDir, name))}`).join("\n")}`);
  }

  if (config.githubIssues) {
    const issues = githubIssues();
    const mainNumber = issueNumberFromRequirement(requirementDir);
    const mainIssue = issues.find((issue) => issue.number === mainNumber);
    blocks.unshift([
      "## GitHub Issues",
      "",
      `- 主 Issue：${mainNumber ? `#${mainNumber}` : "无法从需求目录判断"}`,
      `- 主 Issue 标题：${mainIssue?.title ?? "未找到"}`,
      `- Issues 数量：${issues.length}`,
      `- 已有 PRD 数量：${existsSync(prdFile) ? 1 : 0}`,
      "",
      "```json",
      JSON.stringify(issues, null, 2),
      "```",
    ].join("\n"));
  }
  return blocks.join("\n\n");
}

export async function runPromptStage(config) {
  const { target, includes } = parseArguments(config.command, config.targetKind);
  const targetPath = fromProject(target);
  let requirementDir;
  let prdFile;
  if (config.targetKind === "requirement-directory") {
    if (!existsSync(targetPath) || !statSync(targetPath).isDirectory()) throw new Error(`Requirement directory not found: ${target}`);
    requirementDir = targetPath;
    prdFile = path.join(requirementDir, "01-prd.md");
  } else {
    if (!existsSync(targetPath) || !statSync(targetPath).isFile() || path.basename(targetPath) !== "01-prd.md") {
      throw new Error(`01-prd.md not found: ${target}`);
    }
    prdFile = targetPath;
    requirementDir = path.dirname(prdFile);
  }
  if (!/^REQ-\d{4}-[A-Za-z0-9][A-Za-z0-9_-]*$/.test(path.basename(requirementDir))) {
    throw new Error("Requirement directory must look like REQ-0010-feature.");
  }

  const createdAt = timestamp();
  const outputDir = path.join(requirementDir, "change", config.stageId);
  mkdirSync(outputDir, { recursive: true });
  const promptName = `${createdAt}_prompt.md`;
  const patchName = `${createdAt}_attempt-01.git.patch`;
  const analysisName = `${patchName}.md`;
  const promptFile = path.join(outputDir, promptName);
  if (existsSync(promptFile)) throw new Error(`Prompt already exists: ${projectRelative(promptFile)}`);

  const base = readFileSync(path.join(WORKFLOW_ROOT, "templates", "base.prompt.md"), "utf8");
  const stage = readFileSync(path.join(WORKFLOW_ROOT, "templates", config.template), "utf8");
  const replacements = {
    "{{STAGE}}": config.command,
    "{{STAGE_ID}}": config.stageId,
    "{{STAGE_NAME}}": config.stageName,
    "{{REQUIREMENT}}": path.basename(requirementDir),
    "{{REQUIREMENT_DIR}}": projectRelative(requirementDir),
    "{{PRD_PATH}}": projectRelative(prdFile),
    "{{PROMPT_FILE}}": projectRelative(promptFile),
    "{{PATCH_NAME}}": patchName,
    "{{PATCH_FILE}}": projectRelative(path.join(outputDir, patchName)),
    "{{ANALYSIS_FILE}}": projectRelative(path.join(outputDir, analysisName)),
    "{{CREATED_AT}}": createdAt,
    "{{STAGE_INSTRUCTIONS}}": stage.trim(),
    "{{CONTEXT}}": collectContext(config, requirementDir, prdFile, includes),
  };
  let prompt = base;
  for (const [key, value] of Object.entries(replacements)) prompt = prompt.replaceAll(key, value);
  for (const [key, value] of Object.entries(replacements)) prompt = prompt.replaceAll(key, value);
  writeFileSync(promptFile, `${prompt.trimEnd()}\n`, "utf8");
  console.log(projectRelative(promptFile));
}
