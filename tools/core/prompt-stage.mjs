import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { referencedFiles, walkTextFiles } from "./files.mjs";
import { WORKFLOW_ROOT, fromProject, projectRelative } from "./paths.mjs";
import { STAGE_BY_NAME } from "./stages.mjs";

const MAX_CONTEXT_BYTES = 1_500_000;

function timestamp() {
  const now = new Date();
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

function collectContext(config, requirementDir, requirementFile, includes, issue, dependencies) {
  const selected = new Set();
  for (const relative of config.globals) {
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
      `通过以上 URL 或 \`gh issue view ${issue.number}\` 阅读完整内容。需要判断关联 Issue 时，使用 GitHub 页面或 \`gh issue list\`、\`gh issue view\` 主动查看，不要仅根据标题推断。`,
    ].join("\n"));
  }
  return blocks.join("\n\n");
}

export async function runPromptStage(config, { target, includes = [], issue = null, dependencies = [] }) {
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

  const createdAt = timestamp();
  const outputDir = path.join(requirementDir, config.directory, createdAt);
  mkdirSync(outputDir, { recursive: true });
  const promptName = "prompt.md";
  const patchName = "prompt.01.git.patch";
  const analysisName = `${patchName}.md`;
  const globalPatchName = config.globalPatch ? `prompt.01.${config.globalPatch}.git.patch` : "";
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
    "{{GLOBAL_PATCH_FILE}}": globalPatchName ? projectRelative(path.join(outputDir, globalPatchName)) : "",
    "{{PLATFORM_REFERENCES}}": (config.references ?? []).map((relative) => {
      const file = path.join(WORKFLOW_ROOT, relative);
      return `## ${relative}\n\n${readFileSync(file, "utf8").trim()}`;
    }).join("\n\n"),
    "{{PROFESSIONAL_DISCUSSION}}": [
      "# 多专业共同讨论",
      "",
      "由以下专业人员从各自角度共同分析，但最终必须形成一个一致结论，不要分别输出互相重复或冲突的方案：",
      "",
      ...config.roles.map((role) => `- ${role}`),
      "",
      "各角色必须互相检查假设、边界和遗漏，并先向使用者简洁整理当前理解。",
      "存在任何不清楚的需求时，每次只询问一个最关键的问题，等待使用者回答后更新理解和信心，再询问下一个问题；不得一次提出多个问题，也不得重复询问已经明确的内容。",
      "只有对使用者真实需求的理解达到至少 95% 并形成一致结论后，才能生成 Git Patch 和分析文件；未达到时必须继续逐条确认，不得自行假设。",
    ].join("\n"),
    "{{STAGE_INSTRUCTIONS}}": stage.trim(),
    "{{GLOBAL_PATCH_INSTRUCTIONS}}": config.globalPatch ? [
      "# 全局文件 Patch",
      "",
      `本阶段需要改变全局项目事实时，不要写入外层 Git Patch。直接生成 \`${projectRelative(path.join(outputDir, globalPatchName))}\`，其内容必须是从 \`diff --git\` 开始、使用项目相对路径的完整 Git Patch。`,
      "",
      "全局 Patch 只修改全局架构、契约或配置文档，不包含业务源码和需求目录文件。没有全局变化时不要创建空 Patch。它与外层 Patch 分别检查和应用。",
    ].join("\n") : "",
    "{{CONTEXT}}": collectContext(config, requirementDir, requirementFile, includes, issue, dependencies),
  };
  let prompt = base;
  for (const [key, value] of Object.entries(replacements)) prompt = prompt.replaceAll(key, value);
  for (const [key, value] of Object.entries(replacements)) prompt = prompt.replaceAll(key, value);
  writeFileSync(promptFile, `${prompt.trimEnd()}\n`, "utf8");
  const output = projectRelative(promptFile);
  console.log(output);
  return output;
}
