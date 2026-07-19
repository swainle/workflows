import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { walkTextFiles } from "./files.mjs";
import { WORKFLOW_ROOT, fromProject, projectRelative } from "./paths.mjs";
import { STAGE_BY_NAME } from "./stages.mjs";
import { REQUIREMENT_SPEC_ARTIFACTS } from "./specs.mjs";
import { requirementsForIssue } from "./current-requirement.mjs";

const MAX_CONTEXT_BYTES = 1_500_000;
const REQUIREMENTS_HEADER = "# 阶段附加要求";

function timestamp(now = new Date()) {
  const part = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(), part(now.getMonth() + 1), part(now.getDate()),
    part(now.getHours()), part(now.getMinutes()), part(now.getSeconds()),
  ].join("");
}

function language(file) {
  return path.extname(file).slice(1).toLowerCase();
}

function requirementStageFiles(requirementDir, config, dependencies) {
  const directories = new Set([
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

function requirementSpecFiles(requirementDir) {
  return REQUIREMENT_SPEC_ARTIFACTS.flatMap((relative) => walkTextFiles(path.join(requirementDir, relative)));
}

function referencedIssueNumbers(issue) {
  if (!issue) return [];
  const text = [issue.body ?? "", ...(issue.comments ?? []).map((comment) => comment?.body ?? "")].join("\n");
  const numbers = [...text.matchAll(/(?:#|\/issues\/)(\d{1,4})\b/g)].map((match) => Number(match[1]));
  return [...new Set(numbers)].filter((number) => number !== issue.number);
}

function relatedStageFiles(config, issue) {
  if (!config.relatedStages?.length) return [];
  return referencedIssueNumbers(issue).flatMap((number) => {
    const requirements = requirementsForIssue(number);
    if (requirements.length > 1) {
      throw new Error(`Multiple requirements found for related Issue #${number}:\n${requirements.join("\n")}`);
    }
    if (!requirements.length) return [];
    return config.relatedStages.flatMap((stage) => {
      if (stage === "design") return requirementSpecFiles(requirements[0]);
      const directory = path.join(requirements[0], STAGE_BY_NAME[stage]?.directory ?? stage);
      if (!existsSync(directory)) return [];
      return readdirSync(directory, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .flatMap((entry) => walkTextFiles(path.join(directory, entry.name)));
    });
  });
}

function collectContext(config, requirementDir, requirementFile, issue, dependencies) {
  const selected = new Set();
  for (const relative of config.globals ?? []) {
    for (const file of walkTextFiles(fromProject(relative))) selected.add(file);
  }
  for (const file of requirementSpecFiles(requirementDir)) selected.add(file);
  for (const relative of config.artifacts ?? []) {
    if (!relative.includes("/") && !relative.includes("*")) {
      for (const file of walkTextFiles(path.join(requirementDir, relative))) selected.add(file);
    }
  }
  const questionsFile = path.join(requirementDir, "questions.md");
  if (existsSync(questionsFile)) selected.add(questionsFile);
  const stageRequirementsFile = path.join(requirementDir, config.directory, "requirements.md");
  if (existsSync(stageRequirementsFile)) selected.add(stageRequirementsFile);
  for (const file of requirementStageFiles(requirementDir, config, dependencies)) selected.add(file);
  for (const file of relatedStageFiles(config, issue)) selected.add(file);

  const blocks = [];
  const included = [];
  let bytes = 0;
  for (const file of [...selected].sort()) {
    const content = readFileSync(file, "utf8");
    bytes += Buffer.byteLength(content);
    if (bytes > MAX_CONTEXT_BYTES) {
      blocks.push("## 上下文限制\n\n其余文件未加入。请精简当前需求产物后重试。");
      break;
    }
    included.push(projectRelative(file));
    blocks.push(`## 文件：${projectRelative(file)}\n\n\`\`\`${language(file)}\n${content.trimEnd()}\n\`\`\``);
  }

  const assetsDir = path.join(requirementDir, "assets");
  if (existsSync(assetsDir)) {
    const assets = readdirSync(assetsDir).sort();
    if (assets.length) {
      const resources = assets.map((name) => projectRelative(path.join(assetsDir, name)));
      included.push(...resources);
      blocks.push(`## 资源\n\n${resources.map((file) => `- ${file}`).join("\n")}`);
    }
  }

  if (config.githubIssues) {
    if (!issue) throw new Error("Current requirement has no Issue information. Run pnpm -s work:req --issue <number> again.");
    const comments = (issue.comments ?? []).map((comment, index) => `### 评论 ${index + 1}\n\n${comment.body ?? ""}`).join("\n\n");
    blocks.unshift([
      "## GitHub Issue",
      "",
      `- 主 Issue：#${issue.number}`,
      `- 标题：${issue.title}`,
      `- URL：${issue.url}`,
      "",
      "### 正文",
      "",
      issue.body?.trim() || "无。",
      comments ? `\n\n${comments}` : "",
      "",
      "只把当前 Issue 明确引用的关联 Issue 对应稳定阶段产物作为参考，不得读取其时间戳执行记录。",
    ].join("\n"));
  }
  return { text: blocks.join("\n\n"), files: included };
}

export function stageConfigFile(name) {
  return path.join(WORKFLOW_ROOT, "config", "stages", `${name}.md`);
}

export function readStageConfig(name) {
  const file = stageConfigFile(name);
  if (!existsSync(file)) throw new Error(`Stage config not found: ${file}`);
  return readFileSync(file, "utf8").trim();
}

export function formatStageConfig(config) {
  const list = (items) => items.map((file) => `- ${file.replaceAll("{{PLATFORM}}", config.platform || "<platform>")}`).join("\n") || "- 无";
  const artifacts = [...new Set([...(config.artifacts ?? []), "questions.md", `${config.directory}/requirements.md`])];
  return [
    readStageConfig(config.module),
    "# 执行角色",
    list(config.roles ?? []),
    "# 默认读取的全局产物",
    list(config.globals ?? []),
    "# 阶段产物",
    list(artifacts),
  ].join("\n\n");
}

export function writeStageRequirement(file, createdAt, text) {
  const header = `## ${createdAt}`;
  const sectionLines = ["", header, "", `- ${text}`, ""];
  let lines;
  if (existsSync(file)) {
    lines = readFileSync(file, "utf8").split(/\r?\n/);
  } else {
    lines = [REQUIREMENTS_HEADER, ""];
  }
  const headerIndex = lines.findIndex((line) => line === header);
  if (headerIndex >= 0) {
    let nextIndex = lines.length;
    for (let i = headerIndex + 1; i < lines.length; i++) {
      if (/^## /.test(lines[i])) {
        nextIndex = i;
        break;
      }
    }
    lines.splice(headerIndex, nextIndex - headerIndex, ...sectionLines);
  } else {
    if (lines.length && lines[lines.length - 1] !== "") lines.push("");
    lines.push(...sectionLines);
  }
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${lines.join("\n").trimEnd()}\n`, "utf8");
}

export async function runPromptStage(config, { target, requirement = "", issue = null, dependencies = [] }) {
  const requirementDir = fromProject(target);
  if (!existsSync(requirementDir) || !statSync(requirementDir).isDirectory()) {
    throw new Error(`Requirement directory not found: ${target}`);
  }
  const requirementFile = path.join(requirementDir, "requirement.md");
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

  if (requirement.trim()) {
    writeStageRequirement(
      path.join(requirementDir, config.directory, "requirements.md"),
      createdAt,
      requirement.trim(),
    );
  }

  const base = readFileSync(path.join(WORKFLOW_ROOT, "templates", "base.prompt.md"), "utf8");
  const stage = readFileSync(path.join(WORKFLOW_ROOT, "templates", config.template), "utf8");
  const context = collectContext(config, requirementDir, requirementFile, issue, dependencies);
  const replacements = {
    "{{STAGE}}": config.command,
    "{{STAGE_NAME}}": config.stageName,
    "{{ROLES}}": (config.roles ?? []).map((role) => `- ${role}`).join("\n"),
    "{{REFERENCE_FILES}}": context.files.length
      ? context.files.map((file) => `- \`${file}\``).join("\n")
      : "- 无。",
    "{{REQUIREMENT}}": path.basename(requirementDir),
    "{{REQUIREMENT_DIR}}": projectRelative(requirementDir),
    "{{REQUIREMENT_PATH}}": projectRelative(requirementFile),
    "{{PROMPT_FILE}}": projectRelative(promptFile),
    "{{RUN_DIR}}": projectRelative(outputDir),
    "{{PATCH_NAME}}": patchName,
    "{{PATCH_FILE}}": projectRelative(path.join(outputDir, patchName)),
    "{{ANALYSIS_FILE}}": projectRelative(path.join(outputDir, analysisName)),
    "{{QUESTIONS_FILE}}": projectRelative(path.join(requirementDir, "questions.md")),
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
    "{{WORKTREE_RULES}}": config.directSourceChanges
      ? `允许直接创建、修改或删除完成本次开发所需的业务源码、迁移、自动化测试和非敏感应用内配置。不得直接修改需求层规范、阶段产物、全局产物、根项目配置、其他需求目录或 \`${projectRelative(outputDir)}\` 中的 \`prompt.md\`；阶段产物和 Status 只能通过本次 Git Patch 提出。保留当前已有内容，不得重置、覆盖或清理无关工作树。`
      : `严禁直接创建、修改或删除任何阶段产物、源码或全局产物；只能在 \`${projectRelative(outputDir)}\` 创建本次 Git Patch 和分析文件。检查 Patch 时也不得通过临时修改目标文件来生成或修复 Patch。`,
    "{{READ_RULES}}": config.directSourceChanges
      ? "- 输入上下文已经包含需求、依赖阶段产物、关联需求参考和全局产物，不得再读取其他需求目录或历史时间戳目录。\n- 可以读取当前项目源码、配置和脚本以识别实际实现与验证命令；不得读取密钥、令牌或与本次开发无关的外部文件。"
      : "- 只能参考输入上下文中的全局产物、当前阶段产物、依赖阶段产物和已注入的关联需求参考，不得读取其他需求目录或未提供的项目文件。\n- 输入上下文已经包含本阶段所需的文件内容，不得再按引用路径打开这些文件或读取其他外部文件。",
    "{{IMPACT_RULES}}": config.directSourceChanges
      ? "“影响文件”列出本次直接修改的源码、迁移、测试和配置，以及阶段 Patch 修改的稳定产物，并在影响说明中标注修改方式。"
      : "“影响文件”只列阶段 Patch 实际修改的路径。",
    "{{STAGE_INSTRUCTIONS}}": stage.trim(),
    "{{CONTEXT}}": context.text,
  };
  let prompt = base;
  for (const [key, value] of Object.entries(replacements)) prompt = prompt.replaceAll(key, value);
  for (const [key, value] of Object.entries(replacements)) prompt = prompt.replaceAll(key, value);
  writeFileSync(promptFile, `${prompt.trimEnd()}\n`, "utf8");
  const output = projectRelative(promptFile);
  console.log(output);
  return output;
}
