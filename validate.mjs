import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const PROMPT_FILES = new Map([
  ["templates/AGENTS.template.md", "AI"],
  ["stages/requirement.md", "AI-REQUIREMENT"],
  ["stages/system.md", "AI-SYSTEM"],
  ["stages/component.md", "AI-COMPONENT"],
  ["stages/development.md", "AI-DEV"],
  ["stages/testing.md", "AI-TEST"],
  ["stages/acceptance.md", "AI-ACCEPTANCE"],
  ["stages/deploy.md", "AI-DEPLOY"],
  ["templates/backend-design.template.md", "AI-BACKEND"],
]);

function headingsOutsideFences(content) {
  const headings = [];
  let fence = null;
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    const marker = line.match(/^(`{3,}|~{3,})/);
    if (marker) {
      const current = { char: marker[1][0], length: marker[1].length };
      if (!fence) fence = current;
      else if (current.char === fence.char && current.length >= fence.length) fence = null;
    } else if (!fence && line.startsWith("## ")) {
      headings.push({ index, line });
    }
  }
  return headings;
}

export function validatePromptFile(file, prefix) {
  const content = readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  const headings = headingsOutsideFences(content);
  const errors = [];
  headings.forEach(({ index, line }, offset) => {
    const expected = `## ${prefix}-${String(offset + 1).padStart(3, "0")}`;
    if (line !== expected) errors.push(`${file}:${index + 1} 应为 ${expected}，实际为 ${line}`);
    const section = lines.slice(index + 1, headings[offset + 1]?.index ?? lines.length);
    for (const label of ["Who", "When", "Where", "What", "Why"]) {
      const count = section.filter((value) => value.startsWith(`- **${label}**：`)).length;
      if (count !== 1) errors.push(`${file}:${index + 1} ${expected} 必须且只能包含一个 ${label}`);
    }
  });
  if (headings.length === 0) errors.push(`${file} 未找到提示词功能编号`);
  return errors;
}

export function parseComponentTree(content) {
  const heading = content.search(/^## 目录结构\s*$/m);
  const section = heading < 0 ? undefined : content.slice(heading + content.slice(heading).indexOf("\n") + 1);
  const block = section?.match(/```text\s*\r?\n([\s\S]*?)\r?\n```/)?.[1];
  if (!block) throw new Error("component.md 缺少“目录结构”下的 text 代码块");

  const paths = [];
  const parents = [];
  for (const line of block.split(/\r?\n/)) {
    if (/\.\.\.|…|\*/.test(line)) throw new Error(`目录结构不得包含省略号或通配符：${line.trim()}`);
    const branch = line.match(/^((?:│  |   )*)[├└]─\s*(.+)$/);
    if (!branch) continue;
    const depth = branch[1].length / 3;
    const entry = branch[2].split(/\s{2,}/, 1)[0].trim();
    const directory = entry.endsWith("/");
    const name = directory ? entry.slice(0, -1) : entry;
    if (!name || name === ".") continue;
    parents.length = depth;
    const relative = [...parents, name].join("/");
    if (directory) parents[depth] = name;
    else paths.push(relative);
  }
  return paths;
}

function projectFiles(appDir) {
  const root = path.resolve(appDir);
  const result = spawnSync(
    "git",
    ["-C", root, "ls-files", "--cached", "--others", "--exclude-standard"],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr.trim() || `无法读取 ${root} 的项目文件`);
  return result.stdout.split(/\r?\n/).filter(Boolean).sort();
}

export function validateComponentTree(componentDoc, appDir, { strict = false } = {}) {
  const planned = parseComponentTree(readFileSync(componentDoc, "utf8"));
  const duplicates = planned.filter((value, index) => planned.indexOf(value) !== index);
  const actual = projectFiles(appDir);
  const errors = [];
  for (const value of new Set(duplicates)) errors.push(`目录结构重复：${value}`);
  for (const value of actual) if (!planned.includes(value)) errors.push(`目录结构遗漏实际文件：${value}`);
  if (strict) {
    for (const value of planned) if (!actual.includes(value)) errors.push(`目录结构包含尚不存在的文件：${value}`);
  }
  return errors;
}

function option(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`${name} 缺少参数`);
  return args[index + 1];
}

export function runValidation(args, root = path.dirname(fileURLToPath(import.meta.url))) {
  const errors = [];
  for (const [relative, prefix] of PROMPT_FILES) {
    errors.push(...validatePromptFile(path.join(root, relative), prefix));
  }

  const componentDoc = option(args, "--component-doc");
  const appDir = option(args, "--app-dir");
  if (Boolean(componentDoc) !== Boolean(appDir)) {
    throw new Error("--component-doc 与 --app-dir 必须同时提供");
  }
  if (componentDoc) {
    errors.push(...validateComponentTree(componentDoc, appDir, { strict: args.includes("--strict") }));
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const errors = runValidation(process.argv.slice(2));
    if (errors.length) {
      process.stderr.write(`${errors.join("\n")}\n`);
      process.exitCode = 1;
    } else {
      process.stdout.write("工作流提示词与组件文件树校验通过。\n");
    }
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
