import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  WORKFLOW_ROOT,
  installAgents,
  installBranch,
  mergeAgents,
  parseBranch,
  readWorkflowRevision,
  updateCurrentBranch,
  validateStageReferences,
} from "./install.mjs";
export const PROMPT_FILES = new Map([
  ["templates/AGENTS.template.md", "AI"],
  ["stages/requirement.md", "AI-REQUIREMENT"],
  ["stages/system.md", "AI-SYSTEM"],
  ["stages/component.md", "AI-COMPONENT"],
  ["stages/component-dev.md", "AI-DEV"],
  ["stages/component-test.md", "AI-TEST"],
  ["stages/test.md", "AI-ACCEPTANCE"],
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

function normalizeDesignSegment(value) {
  return value.replace(/#/g, "").replace(/\s/g, "");
}

function markdownTableCells(line) {
  if (!/^\s*\|/.test(line)) return undefined;
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function designPointNumber(value) {
  return value
    ?.replace(/^\*\*(\d{3})\*\*$/, "$1")
    .replace(/^`(\d{3})`$/, "$1")
    .match(/^\d{3}$/)?.[0];
}

export function parseDesignIds(content, file) {
  const fileKey = normalizeDesignSegment(path.basename(file).replace(/\.[^.]+$/, ""));
  const ids = [];
  const errors = [];
  const seen = new Set();
  let level2;
  let level3;
  let fence;
  let numberColumn;

  const add = (segments, line) => {
    const invalid = segments.find((segment) => !segment || segment.includes(":"));
    if (invalid !== undefined) {
      errors.push(`${file}:${line} 设计标识片段不能为空或包含冒号：${invalid}`);
      return;
    }
    const id = segments.join(":");
    if (seen.has(id)) errors.push(`${file}:${line} 设计标识重复：${id}`);
    else {
      seen.add(id);
      ids.push(id);
    }
  };

  for (const [offset, line] of content.split(/\r?\n/).entries()) {
    const lineNumber = offset + 1;
    const marker = line.match(/^(`{3,}|~{3,})/);
    if (marker) {
      const current = { char: marker[1][0], length: marker[1].length };
      if (!fence) fence = current;
      else if (current.char === fence.char && current.length >= fence.length) fence = undefined;
      continue;
    }
    if (fence) continue;

    const heading = line.match(/^(#{2,4})\s+(.+?)\s*$/);
    if (heading) {
      numberColumn = undefined;
      if (heading[1].length === 2) {
        level2 = normalizeDesignSegment(heading[2]);
        level3 = undefined;
        add([fileKey, level2], lineNumber);
      } else if (heading[1].length === 3) {
        if (!level2) errors.push(`${file}:${lineNumber} 三级标题缺少所属二级标题`);
        else {
          level3 = normalizeDesignSegment(heading[2]);
          add([fileKey, level2, level3], lineNumber);
        }
      }
      continue;
    }

    const cells = markdownTableCells(line);
    if (cells) {
      if (numberColumn === undefined) {
        const index = cells.indexOf("编号");
        if (index >= 0) numberColumn = index;
      } else if (!cells.every((cell) => /^:?-{3,}:?$/.test(cell))) {
        const number = designPointNumber(cells[numberColumn]);
        if (number) {
          if (!level2) errors.push(`${file}:${lineNumber} 编号 ${number} 缺少所属二级标题`);
          else add([fileKey, level2, level3, number].filter(Boolean), lineNumber);
        } else if (cells[numberColumn]) {
          errors.push(`${file}:${lineNumber} “编号”列必须使用三位数字：${cells[numberColumn]}`);
        }
      }
      continue;
    }
    numberColumn = undefined;

    const listNumber = line.match(/^- \*\*(\d{3})\*\*[：:]/)?.[1];
    if (listNumber) {
      if (!level2) errors.push(`${file}:${lineNumber} 编号 ${listNumber} 缺少所属二级标题`);
      else add([fileKey, level2, level3, listNumber].filter(Boolean), lineNumber);
    }
  }

  return { ids, errors };
}

function markdownFiles(root) {
  const result = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.isFile() && entry.name.endsWith(".md")) result.push(target);
    }
  };
  visit(path.resolve(root));
  return result.sort();
}

export function validateDesignReferences(designDir, appDir) {
  const errors = [];
  const valid = new Set();
  const definitions = new Map();
  const documents = markdownFiles(designDir).map((file) => ({
    file,
    content: readFileSync(file, "utf8"),
  }));
  for (const { file, content } of documents) {
    const parsed = parseDesignIds(content, file);
    errors.push(...parsed.errors);
    for (const id of parsed.ids) {
      if (definitions.has(id)) errors.push(`设计标识在多个文件中重复：${id}（${definitions.get(id)}、${file}）`);
      else {
        definitions.set(id, file);
        valid.add(id);
      }
    }
  }
  for (const { file, content } of documents) {
    for (const [offset, line] of content.split(/\r?\n/).entries()) {
      const value = line.match(/^> Design：(.+)$/)?.[1];
      if (!value) continue;
      const references = value.replace(/`/g, "").split("、").map((item) => item.trim()).filter(Boolean);
      if (!references.length) errors.push(`${file}:${offset + 1} Design 缺少设计标识`);
      for (const id of references) {
        if (!valid.has(id)) errors.push(`${file}:${offset + 1} Design 引用了不存在的设计标识：${id}`);
      }
    }
  }

  const primary = new Map();
  for (const relative of projectFiles(appDir)) {
    const file = path.join(appDir, relative);
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const isTest = /(^|\/)(?:test|tests|__tests__)(\/|$)|\.(?:test|spec)\.[^/]+$/.test(relative);
    const annotations = content.matchAll(/@(design-ref|design|verifies)\s+([^\s*]+)/g);
    for (const match of annotations) {
      const [, tag, id] = match;
      if (!valid.has(id)) {
        errors.push(`${relative} 引用了不存在的设计标识：${id}`);
        continue;
      }
      if (tag === "verifies" && !isTest) errors.push(`${relative} 生产代码不得使用 @verifies：${id}`);
      if ((tag === "design" || tag === "design-ref") && isTest) {
        errors.push(`${relative} 测试代码应使用 @verifies：${id}`);
      }
      if (tag === "design") {
        if (primary.has(id)) errors.push(`设计标识存在多个 @design 主实现：${id}（${primary.get(id)}、${relative}）`);
        else primary.set(id, relative);
      }
    }
  }
  return errors;
}

function option(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`${name} 缺少参数`);
  return args[index + 1];
}

export function runValidation(args, root = WORKFLOW_ROOT) {
  const errors = [];
  for (const [relative, prefix] of PROMPT_FILES) {
    errors.push(...validatePromptFile(path.join(root, relative), prefix));
  }

  const componentDoc = option(args, "--component-doc");
  const designDir = option(args, "--design-dir");
  const appDir = option(args, "--app-dir");
  if ((componentDoc || designDir) && !appDir) {
    throw new Error("--component-doc 或 --design-dir 必须与 --app-dir 同时提供");
  }
  if (appDir && !componentDoc && !designDir) {
    throw new Error("--app-dir 必须与 --component-doc 或 --design-dir 同时提供");
  }
  if (componentDoc) {
    errors.push(...validateComponentTree(componentDoc, appDir, { strict: args.includes("--strict") }));
  }
  if (designDir) errors.push(...validateDesignReferences(designDir, appDir));
  return errors;
}


test("describes prompt capabilities with numbered five-point definitions", () => {
  const expected = new Map([
    ["templates/AGENTS.template.md", { prefix: "AI", count: 15 }],
    ["stages/requirement.md", { prefix: "AI-REQUIREMENT", count: 9 }],
    ["stages/system.md", { prefix: "AI-SYSTEM", count: 14 }],
    ["stages/component.md", { prefix: "AI-COMPONENT", count: 14 }],
    ["stages/component-dev.md", { prefix: "AI-DEV", count: 9 }],
    ["stages/component-test.md", { prefix: "AI-TEST", count: 8 }],
    ["stages/test.md", { prefix: "AI-ACCEPTANCE", count: 9 }],
    ["stages/deploy.md", { prefix: "AI-DEPLOY", count: 10 }],
    ["templates/backend-design.template.md", { prefix: "AI-BACKEND", count: 12 }],
  ]);

  for (const [file, { prefix, count }] of expected) {
    const content = readFileSync(path.join(WORKFLOW_ROOT, file), "utf8");
    const lines = content.split(/\r?\n/);
    let fence = null;
    const capabilities = [];
    for (let index = 0; index < lines.length; index += 1) {
      const marker = lines[index].match(/^(`{3,}|~{3,})/);
      if (marker) {
        const char = marker[1][0];
        const length = marker[1].length;
        if (!fence) fence = { char, length };
        else if (char === fence.char && length >= fence.length) fence = null;
      } else if (!fence && lines[index].startsWith("## ")) {
        capabilities.push(lines.slice(index, index + 8).join("\n"));
      }
    }
    assert.equal(capabilities.length, count, `${file} capability count`);
    assert.doesNotMatch(content, /^`````md$/m, `${file} must use ordinary Markdown for rules`);
    for (const [index, capability] of capabilities.entries()) {
      const id = `${prefix}-${String(index + 1).padStart(3, "0")}`;
      assert.match(capability, new RegExp(`^## ${id}\\n`));
      for (const label of ["Who", "When", "Where", "What", "Why"]) {
        assert.equal(
          capability.split(`- **${label}**：`).length - 1,
          1,
          `${file} ${id} must define ${label} once`,
        );
      }
      assert.equal((capability.match(/^- \*\*(Who|When|Where|What|Why)\*\*：/gm) ?? []).length, 5);
    }
  }
});

test("uses concrete 5W metadata for file-oriented prompt capabilities", () => {
  const backend = readFileSync(path.join(WORKFLOW_ROOT, "templates/backend-design.template.md"), "utf8");
  const system = readFileSync(path.join(WORKFLOW_ROOT, "stages/system.md"), "utf8");
  const systemFiles = system.slice(system.indexOf("## AI-SYSTEM-006"), system.indexOf("## AI-SYSTEM-013"));

  for (const location of [
    "`<组件设计目录>/component.md`。",
    "`<组件设计目录>/domain.md`。",
    "`<组件设计目录>/interface.md`。",
    "`<组件设计目录>/security.md`。",
    "`<组件设计目录>/data.md`。",
    "`<组件设计目录>/engineering.md`。",
    "`<组件设计目录>/jobs.md`。",
    "`<组件设计目录>/operations.md`。",
  ]) assert.match(backend, new RegExp(location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  for (const location of [
    "`docs/system/context.md` 与 `docs/system/system.md`。",
    "`docs/system/process.md`。",
    "`docs/system/gitflow.md`。",
    "`docs/system/technology.md`。",
    "`docs/system/security.md`。",
    "`docs/system/observability.md`。",
  ]) assert.match(systemFiles, new RegExp(location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.doesNotMatch(backend, /^- \*\*What\*\*：提供/m);
  assert.doesNotMatch(systemFiles, /`docs\/system\/\*\*` 与允许读取的需求事实/);
  assert.doesNotMatch(systemFiles, /确保跨组件规范统一、自洽并可供下游组件设计使用/);
});

test("automatically validates prompt structure and complete component trees", () => {
  assert.deepEqual(
    validatePromptFile(path.join(WORKFLOW_ROOT, "stages/component-test.md"), "AI-TEST"),
    [],
  );
  assert.deepEqual(parseComponentTree([
    "## 目录结构",
    "",
    "```text",
    "apps/api/",
    "├─ src/",
    "│  └─ index.ts  入口",
    "└─ package.json  包配置",
    "```",
  ].join("\n")), ["src/index.ts", "package.json"]);

  const root = mkdtempSync(path.join(tmpdir(), "workflows-tree-"));
  try {
    const appDir = path.join(root, "app");
    mkdirSync(path.join(appDir, "src"), { recursive: true });
    writeFileSync(path.join(appDir, "src", "index.ts"), "export {};\n", "utf8");
    writeFileSync(path.join(appDir, "package.json"), "{}\n", "utf8");
    const componentDoc = path.join(root, "component.md");
    writeFileSync(componentDoc, [
      "# api",
      "",
      "## 目录结构",
      "",
      "```text",
      "apps/api/",
      "├─ src/",
      "│  └─ index.ts  入口",
      "└─ package.json  包配置",
      "```",
    ].join("\n"), "utf8");
    execFileSync("git", ["init", "-q", appDir]);
    execFileSync("git", ["-C", appDir, "add", "src/index.ts", "package.json"]);
    assert.deepEqual(validateComponentTree(componentDoc, appDir), []);
    assert.deepEqual(validateComponentTree(componentDoc, appDir, { strict: true }), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("parses hierarchical design identifiers and validates code references", () => {
  assert.deepEqual(parseDesignIds([
    "# 测试策略",
    "",
    "## 单元 测试",
  ].join("\n"), "testing.md"), {
    ids: ["testing:单元测试"],
    errors: [],
  });

  const parsed = parseDesignIds([
    "# DDD",
    "",
    "## Auth",
    "",
    "### 应用 用例",
    "",
    "| 编号 | 用例 |",
    "|---|---|",
    "| 001 | 登录 |",
    "| **002** | 登出 |",
    "",
    "#### 失败场景",
    "",
    "- **003**：锁定账号。",
    "",
    "## 会话",
    "",
    "- **001**：撤销会话。",
  ].join("\n"), "ddd.md");
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.ids, [
    "ddd:Auth",
    "ddd:Auth:应用用例",
    "ddd:Auth:应用用例:001",
    "ddd:Auth:应用用例:002",
    "ddd:Auth:应用用例:003",
    "ddd:会话",
    "ddd:会话:001",
  ]);

  const duplicate = parseDesignIds([
    "## Auth",
    "",
    "### 应用用例",
    "",
    "- **001**：登录。",
    "- **001**：重复。",
  ].join("\n"), "ddd.md");
  assert.match(duplicate.errors.join("\n"), /设计标识重复：ddd:Auth:应用用例:001/);
  const invalidNumber = parseDesignIds([
    "## Auth",
    "",
    "| 编号 | 规则 |",
    "|---|---|",
    "| 1 | 无效编号 |",
  ].join("\n"), "ddd.md");
  assert.match(invalidNumber.errors.join("\n"), /“编号”列必须使用三位数字：1/);

  const root = mkdtempSync(path.join(tmpdir(), "workflows-design-"));
  try {
    const designDir = path.join(root, "design");
    const appDir = path.join(root, "app");
    mkdirSync(designDir, { recursive: true });
    mkdirSync(path.join(appDir, "src"), { recursive: true });
    mkdirSync(path.join(appDir, "test"), { recursive: true });
    writeFileSync(path.join(designDir, "ddd.md"), [
      "# DDD",
      "",
      "## Auth",
      "",
      "### 应用用例",
      "",
      "- **001**：登录。",
    ].join("\n"), "utf8");
    writeFileSync(path.join(designDir, "testing.md"), [
      "# 测试策略",
      "",
      "## 单元测试",
      "",
      "### AUTH-APP-LOGIN-001",
      "",
      "> Design：`ddd:Auth:应用用例:001`",
    ].join("\n"), "utf8");
    writeFileSync(path.join(appDir, "src", "login.ts"), [
      "/**",
      " * @design ddd:Auth:应用用例:001",
      " */",
      "export class LoginHandler {}",
    ].join("\n"), "utf8");
    writeFileSync(path.join(appDir, "test", "login.test.ts"), [
      "/**",
      " * @verifies ddd:Auth:应用用例:001",
      " */",
      "export {};",
    ].join("\n"), "utf8");
    execFileSync("git", ["init", "-q", appDir]);
    execFileSync("git", ["-C", appDir, "add", "src/login.ts", "test/login.test.ts"]);
    assert.deepEqual(validateDesignReferences(designDir, appDir), []);
    writeFileSync(path.join(appDir, "test", "login.test.ts"), [
      "/**",
      " * @verifies ddd:Auth:应用用例:999",
      " */",
      "export {};",
    ].join("\n"), "utf8");
    assert.match(validateDesignReferences(designDir, appDir).join("\n"), /不存在的设计标识/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("requires local adaptation declarations for backend mode examples", () => {
  const backend = readFileSync(path.join(WORKFLOW_ROOT, "templates/backend-design.template.md"), "utf8");
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  assert.match(backend, /每个具体范例都必须就近包含单行提示 `> - 范例适配声明：<具体调整范围>`/);
  assert.ok((backend.match(/^> - 范例适配声明：/gm) ?? []).length >= 9);
  assert.doesNotMatch(backend, /^> - 根据实际情况修改\r?\n> 范例适配声明：/m);
  assert.match(component, /Backend 模板中的每个具体范例必须就近包含单行提示 `> - 范例适配声明：<具体调整范围>`/);
});

test("marks every reusable stage template for actual-situation adaptation", () => {
  const files = [
    "stages/requirement.md",
    "stages/system.md",
    "stages/component.md",
    "stages/deploy.md",
    "templates/AGENTS.template.md",
  ];
  for (const file of files) {
    const lines = readFileSync(path.join(WORKFLOW_ROOT, file), "utf8").split(/\r?\n/);
    let fence = null;
    for (let index = 0; index < lines.length; index += 1) {
      const marker = lines[index].match(/^(`{3,}|~{3,})(.*)$/);
      if (!marker) continue;
      if (!fence) {
        fence = { char: marker[1][0], length: marker[1].length };
        if (file === "templates/AGENTS.template.md" && marker[2].trim() === "bash") continue;
        let previous = index - 1;
        while (previous >= 0 && lines[previous] === "") previous -= 1;
        assert.equal(lines[previous], "> - 根据实际情况修改", `${file}:${index + 1}`);
      } else if (marker[1][0] === fence.char && marker[1].length >= fence.length) {
        fence = null;
      }
    }
  }
});

test("lists matched rule identifiers before executing managed instructions", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");
  assert.match(agents, /## AI-011/);
  assert.match(agents, /\*\*What\*\*：提供“命中规则回显”功能/);
  assert.match(agents, /任何实质操作开始前/);
  assert.match(agents, /提示词版本：<完整 SHA>（一致）/);
  assert.match(agents, /命中规则：AI-001、AI-004、AI-005、AI-006、AI-007、AI-011、AI-TEST-001、AI-TEST-002/);
  assert.match(agents, /提示词版本：<新完整 SHA>（已从 <旧完整 SHA> 刷新）/);
  assert.match(agents, /版本门禁未通过、版本行没有输出或 SHA 与门禁结果不一致时停止/);
  assert.match(agents, /只把 `When` 在当前时点为真的规则视为命中/);
  assert.match(agents, /根提示词、阶段提示词、模式提示词的顺序排列/);
  assert.match(agents, /未命中本工作流的普通自然语言任务不强制回显/);
  assert.match(readme, /只有三个完整 SHA 一致时才执行指令/);
});

test("lists changed prompt capabilities in the final response", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");
  assert.match(agents, /## AI-013/);
  assert.match(agents, /\*\*What\*\*：提供“功能点变更回显”功能/);
  assert.match(agents, /新增、删除或修改了一个或多个 `## AI-\*` 功能块/);
  assert.match(agents, /- \*\*AI-BACKEND-001\*\*: 修改 Backend 设计模式选择规则/);
  assert.match(agents, /删除功能点时仍使用被删除的原编号/);
  assert.match(agents, /没有功能点变更时不输出/);
  assert.match(readme, /## 功能点变更回显/);
});

test("reuses existing prompt capabilities before changing them", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");
  assert.match(agents, /## AI-014/);
  assert.match(agents, /\*\*What\*\*：提供“功能复用审查”功能/);
  assert.match(agents, /搜索全部 `## AI-\*` 功能块，不只搜索预计修改的文件/);
  assert.match(agents, /优先在职责最接近的功能上扩展或收敛，并保留原编号/);
  assert.match(agents, /删除功能前确认其仍需保留的规则和引用已经迁移/);
  assert.match(agents, /才新增下一个连续编号/);
  assert.match(readme, /## 功能复用审查/);
});

test("parses the optional selected branch", () => {
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");
  assert.match(readme, /git submodule add -b develop <repository-url> docs\/workflows/);
  assert.equal(parseBranch([]), undefined);
  assert.equal(parseBranch(["--branch", "develop"]), "develop");
  assert.equal(parseBranch(["--workflows-updated", "--branch", "develop"]), "develop");
  assert.throws(() => parseBranch(["--branch"]));
});

test("refreshes cached prompts when the local workflows revision changes", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates", "AGENTS.template.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");
  assert.match(agents, /git -C docs\/workflows rev-parse HEAD/);
  assert.match(agents, /<!-- workflows-revision: <完整 SHA> -->/);
  assert.match(agents, /当前任务最近采用的托管提示词 SHA、磁盘中宿主根 `AGENTS\.md`[\s\S]*本地工作流 HEAD/);
  assert.match(agents, /门禁完成前只允许读取宿主根 `AGENTS\.md`、读取工作流 Git 元数据[\s\S]*禁止其他项目文件操作、项目命令、外部系统访问或澄清问题/);
  assert.match(agents, /node docs\/workflows\/install\.mjs --workflows-updated/);
  assert.match(agents, /完整重读宿主根 `AGENTS\.md`[\s\S]*重新解析当前指令/);
  assert.match(agents, /同一条指令最多刷新一次/);
  assert.match(agents, /没有版本回显的指令不得执行/);
  assert.match(readme, /每个尖括号指令路由前比较本地 HEAD/);
});

test("updates the workflows branch and reruns installation", () => {
  const calls = [];
  const runner = (command, args, options) => {
    calls.push({ command, args, cwd: options.cwd });
    return { status: args[0] === "show-ref" ? 1 : 0 };
  };
  assert.equal(installBranch("develop", runner), 0);
  assert.deepEqual(calls.map(({ command, args }) => [command, ...args]), [
    ["git", "check-ref-format", "--branch", "develop"],
    ["git", "fetch", "origin", "refs/heads/develop:refs/remotes/origin/develop"],
    ["git", "show-ref", "--verify", "--quiet", "refs/heads/develop"],
    ["git", "switch", "-c", "develop", "origin/develop"],
    ["git", "merge", "--ff-only", "origin/develop"],
    ["git", "submodule", "set-branch", "--branch", "develop", "docs/workflows"],
    [process.execPath, path.join(WORKFLOW_ROOT, "install.mjs"), "--workflows-updated", "--branch", "develop"],
  ]);
});

test("updates the current workflows branch when branch is omitted", () => {
  const calls = [];
  const runner = (command, args, options) => {
    calls.push({ command, args, cwd: options.cwd });
    return { status: 0 };
  };
  assert.equal(updateCurrentBranch(runner), 0);
  assert.deepEqual(calls.map(({ command, args }) => [command, ...args]), [
    ["git", "pull", "--ff-only"],
    [process.execPath, path.join(WORKFLOW_ROOT, "install.mjs"), "--workflows-updated"],
  ]);
});

test("creates, appends, updates, and preserves a managed block", () => {
  const revision = "a".repeat(40);
  const created = mergeAgents("", "# Workflow\n", revision);
  assert.match(created, /^<!-- workflows:begin -->/);
  assert.match(created, new RegExp(`<!-- workflows-revision: ${revision} -->`));
  assert.match(created, /# Workflow/);

  const appended = mergeAgents("# Host rules\n", "# Workflow\n", revision);
  assert.match(appended, /^# Host rules[\s\S]*<!-- workflows:begin -->/);

  const updated = mergeAgents(appended, "# Workflow v2\n", "b".repeat(40));
  assert.match(updated, /^# Host rules/);
  assert.match(updated, /<!-- workflows-revision: b{40} -->/);
  assert.match(updated, /# Workflow v2/);
  assert.doesNotMatch(updated, /# Workflow\n/);
  assert.equal(mergeAgents(updated, "# Workflow v2\n", "b".repeat(40)), updated);
  assert.throws(() => mergeAgents("", "# Workflow\n", "abc"), /Invalid workflows revision/);
});

test("reads and validates the full workflows revision", () => {
  const revision = "c".repeat(40);
  assert.equal(readWorkflowRevision("C:/workflow", () => ({ status: 0, stdout: `${revision}\n` })), revision);
  assert.throws(
    () => readWorkflowRevision("C:/workflow", () => ({ status: 0, stdout: "short\n" })),
    /Invalid workflows revision/,
  );
});

test("ignores marker examples inside managed content", () => {
  const template = [
    "# Workflow",
    "",
    "The installer uses `<!-- workflows:begin -->` and `<!-- workflows:end -->` markers.",
    "",
  ].join("\n");
  const revision = "a".repeat(40);
  const installed = mergeAgents("", template, revision);
  assert.equal(mergeAgents(installed, template, revision), installed);
  assert.match(mergeAgents(installed, `${template}Updated.\n`, revision), /Updated\./);
});

test("rejects damaged or duplicated managed markers", () => {
  const revision = "a".repeat(40);
  assert.throws(() => mergeAgents("<!-- workflows:begin -->\n", "# Workflow\n", revision), /invalid workflows markers/);
  assert.throws(() => mergeAgents("<!-- workflows:end -->\n", "# Workflow\n", revision), /invalid workflows markers/);
  assert.throws(() => mergeAgents(
    "<!-- workflows:begin -->\n<!-- workflows:end -->\n<!-- workflows:begin -->\n<!-- workflows:end -->\n",
    "# Workflow\n",
    revision,
  ), /invalid workflows markers/);
  assert.throws(() => mergeAgents("<!-- workflows:end -->\n<!-- workflows:begin -->\n", "# Workflow\n", revision), /marker order/);
});

test("validates routed stage files", () => {
  const root = mkdtempSync(path.join(tmpdir(), "workflows-stages-"));
  try {
    const template = "Read `docs/workflows/stages/requirement.md`.\n";
    assert.throws(() => validateStageReferences(template, root), /Missing stage file/);

    mkdirSync(path.join(root, "stages"), { recursive: true });
    writeFileSync(path.join(root, "stages", "requirement.md"), "# Requirement\n", "utf8");
    assert.equal(validateStageReferences(template, root), 1);
    assert.throws(
      () => validateStageReferences("Read `docs/workflows/stages/../outside.md`.\n", root),
      /Invalid stage reference/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("repository AGENTS template routes every stage file", () => {
  const template = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  assert.equal(validateStageReferences(template), 7);
  assert.match(template, /\| `<组件 dev>` \| `docs\/workflows\/stages\/component-dev\.md` \|/);
  assert.match(template, /\| `<组件 test>` \| `docs\/workflows\/stages\/component-test\.md` \|/);
  assert.match(template, /\| `<test>` \| `docs\/workflows\/stages\/test\.md` \|/);
});

test("defines bilingual message ending controls", () => {
  const template = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  assert.match(template, /最后一个字符/);
  assert.match(template, /\| `\?` 或 `？` \|[^|]+不修改文件 \|/);
  assert.match(template, /\| `!` 或 `！` \|[^|]+提交并推送[^|]+ \|/);
  assert.match(template, /\| `,` 或 `，` \|[^|]+直至完全理解需求 \|/);
  assert.match(template, /\| `\.` 或 `。` \|[^|]+不自动提交或推送 \|/);
});

test("defines literal angle-bracket command headers", () => {
  const template = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  assert.match(template, /以一对实际的尖括号字符开头/);
  assert.match(template, /读取至第一个 `>` 作为唯一指令头/);
  assert.match(template, /保留指令优先于组件名/);
  for (const command of ["<12>", "<system>", "<test>", "<deploy>", "<deploy update>", "<组件名 dev>", "<组件名 test>"]) {
    assert.ok(template.includes(command), `missing command header example: ${command}`);
  }
});

test("uses Chinese documentation and tests without translating code identifiers", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const development = readFileSync(path.join(WORKFLOW_ROOT, "stages/component-dev.md"), "utf8");
  const testing = readFileSync(path.join(WORKFLOW_ROOT, "stages/component-test.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");

  assert.match(agents, /\*\*What\*\*：提供“语言规则”功能/);
  assert.match(agents, /对话回复、正式文档、测试用例描述和必要的代码注释默认使用中文/);
  assert.match(agents, /类名、函数名、变量名、文件名、包名、环境变量、HTTP 字段、数据库字段和协议名称/);
  assert.match(agents, /中文注释说明设计原因、业务约束和风险，不逐行翻译代码/);

  assert.match(development, /\*\*What\*\*：提供“代码与注释规则”功能/);
  assert.match(development, /领域不变量、事务边界、锁、并发、幂等、安全边界/);
  assert.match(development, /注释说明“为什么这样设计”和“不能违反什么”/);
  assert.match(development, /`@design <完整设计标识>`/);
  assert.match(development, /协作代码使用 `@design-ref <完整设计标识>`/);
  assert.match(development, /简单赋值、参数传递、标准 CRUD 和显而易见的控制流不添加注释/);
  assert.match(development, /没有重复代码含义、已经失效或纯装饰性的注释/);

  assert.match(testing, /\*\*What\*\*：提供“测试代码规则”功能/);
  assert.match(testing, /测试必须导入真实生产模块，或通过真实的 HTTP、UI、消息、数据库等公开入口执行生产代码/);
  assert.match(testing, /不得在测试文件中重新实现、复制或简化待验证的业务规则/);
  assert.match(testing, /测试辅助代码只能构造数据、创建 fixture、替换外部依赖和收集结果/);
  assert.match(testing, /`describe`、`it`、场景名称和必要注释使用中文/);
  assert.match(testing, /时间、随机数、ID 和外部响应等不稳定依赖必须固定、注入或使用测试框架替换/);
  assert.match(testing, /每个测试执行真实生产代码入口/);
  assert.match(readme, /默认使用中文回复、编写文档和测试描述/);
});

test("requires design-driven development with zero unresolved decisions", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const development = readFileSync(path.join(WORKFLOW_ROOT, "stages/component-dev.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");

  assert.match(development, /\*\*What\*\*：提供“开发前确认”功能/);
  assert.match(development, /Backend 先读取 `component\.md` 的文件关系、架构图、代码结构和完整文件结构/);
  assert.match(development, /其他模式先读取 `component\.md` 的文件关系、概述和完整文件结构/);
  assert.match(development, /“任务行为 → 需求或设计依据 → 目标代码文件 → 验证方式”的实现映射/);
  assert.match(development, /没有写明不等于允许自行决定/);
  assert.match(development, /确认一个问题后继续检查，直到未确认项为零/);
  assert.match(development, /用户回答不能替代正式设计/);
  assert.match(development, /不通过降级行为、隐藏错误、临时分支、TODO、占位值或未声明默认值绕过/);
  assert.match(development, /只有实现映射完整、未确认项为零、设计没有冲突且技术可行性已有证据时，才开始修改代码/);
  assert.match(agents, /未确认项清零后才能修改代码/);
  assert.match(readme, /详细规则以模板和对应阶段提示词为准/);
});

test("defines one CRUD permission matrix per stage", () => {
  const stageRoot = path.join(WORKFLOW_ROOT, "stages");
  const files = readdirSync(stageRoot).filter((file) => file.endsWith(".md"));
  assert.equal(files.length, 7);
  for (const file of files) {
    const content = readFileSync(path.join(stageRoot, file), "utf8");
    assert.equal(content.match(/^- \*\*What\*\*：提供“操作权限”功能/gm)?.length, 1, file);
    assert.equal(content.match(/^\| 路径模式 \| 创建 \| 读取 \| 修改 \| 删除 \|$/gm)?.length, 1, file);
    assert.match(
      content,
      /^\| 路径模式 \| 创建 \| 读取 \| 修改 \| 删除 \|\r?\n\|---\|---\|---\|---\|---\|\r?\n\| `\*\*` \| 禁止 \| 禁止 \| 禁止 \| 禁止 \|$/m,
      file,
    );
    assert.doesNotMatch(content, /^### (允许读取|允许修改|禁止修改)$/m, file);
  }
});

test("enforces serial stage read and write boundaries", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  assert.match(agents, /目录权限由后代路径继承/);
  assert.match(agents, /多条规则匹配时，路径越具体越优先，并按操作类型覆盖父级权限/);
  assert.match(agents, /路径具体程度相同时，“禁止”优先/);
  assert.match(agents, /每张表的第一条规则必须是 `\| \*\* \| 禁止 \| 禁止 \| 禁止 \| 禁止 \|`/);
  assert.match(agents, /需求 → system → 组件设计 → dev → 组件 test → 全局 test → deploy/);
  assert.match(agents, /前置阶段目录只允许读取/);
  assert.match(agents, /后置阶段和无关目录由 `\*\*` 默认规则禁止所有操作/);

  const requirement = readFileSync(path.join(WORKFLOW_ROOT, "stages/requirement.md"), "utf8");
  assert.match(requirement, /\| `docs\/requirements\/\*\*` \| 禁止 \| 允许 \| 禁止 \| 禁止 \|/);
  assert.match(requirement, /\| `docs\/requirements\/REQ-<至少三位Issue编号>-\*\/\*\*` \| 允许 \| 允许 \| 允许 \| 允许 \|/);
  assert.match(requirement, /达到或超过三位时保留完整编号，不截断、不取模/);
  assert.doesNotMatch(requirement, /`(?:docs\/system|docs\/component|apps)\/\*\*`/);

  const system = readFileSync(path.join(WORKFLOW_ROOT, "stages/system.md"), "utf8");
  assert.match(system, /\| `docs\/requirements\/\*\*` \| 禁止 \| 允许 \| 禁止 \| 禁止 \|/);
  assert.match(system, /\| `docs\/system\/\*\*` \| 允许 \| 允许 \| 允许 \| 允许 \|/);
  assert.doesNotMatch(system, /`(?:docs\/component|apps)\/\*\*`/);

  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  assert.match(component, /\| `docs\/requirements\/\*\*` \| 禁止 \| 允许 \| 禁止 \| 禁止 \|/);
  assert.match(component, /\| `docs\/system\/\*\*` \| 禁止 \| 允许 \| 禁止 \| 禁止 \|/);
  assert.match(component, /\| `<组件设计目录>\/\*\*` \| 允许 \| 允许 \| 允许 \| 允许 \|/);
  assert.doesNotMatch(component, /`apps\/\*\*`|`<组件应用目录>\/\*\*`/);

  const development = readFileSync(path.join(WORKFLOW_ROOT, "stages/component-dev.md"), "utf8");
  for (const pattern of ["docs/requirements/\\*\\*", "docs/system/\\*\\*", "<组件设计目录>/\\*\\*"]) {
    assert.match(development, new RegExp(`\\| \`${pattern}\` \\| 禁止 \\| 允许 \\| 禁止 \\| 禁止 \\|`));
  }
  assert.match(development, /\| `<组件应用目录>\/\*\*` \| 允许 \| 允许 \| 允许 \| 允许 \|/);
  for (const pattern of ["test/\\*\\*", "Dockerfile", "deploy/\\*\\*"]) {
    assert.match(development, new RegExp(`\\| \`<组件应用目录>/${pattern}\` \\| 禁止 \\| 禁止 \\| 禁止 \\| 禁止 \\|`));
  }

  const testing = readFileSync(path.join(WORKFLOW_ROOT, "stages/component-test.md"), "utf8");
  for (const pattern of ["docs/requirements/\\*\\*", "docs/system/\\*\\*", "<组件设计目录>/\\*\\*", "<组件应用目录>/\\*\\*"]) {
    assert.match(testing, new RegExp(`\\| \`${pattern}\` \\| 禁止 \\| 允许 \\| 禁止 \\| 禁止 \\|`));
  }
  assert.match(testing, /\| `<组件应用目录>\/test\/\*\*` \| 允许 \| 允许 \| 允许 \| 允许 \|/);
  assert.match(testing, /\| `<组件应用目录>\/deploy\/\*\*` \| 禁止 \| 禁止 \| 禁止 \| 禁止 \|/);

  const acceptance = readFileSync(path.join(WORKFLOW_ROOT, "stages/test.md"), "utf8");
  for (const pattern of ["docs/requirements/\\*\\*", "docs/system/\\*\\*", "docs/component/\\*\\*", "apps/\\*\\*"]) {
    assert.match(acceptance, new RegExp(`\\| \`${pattern}\` \\| 禁止 \\| 允许 \\| 禁止 \\| 禁止 \\|`));
  }
  assert.match(acceptance, /\| `test\/acceptance\/\*\*` \| 允许 \| 允许 \| 允许 \| 允许 \|/);

  const deploy = readFileSync(path.join(WORKFLOW_ROOT, "stages/deploy.md"), "utf8");
  for (const pattern of ["docs/requirements/\\*\\*", "docs/system/\\*\\*", "<组件设计目录>/\\*\\*", "apps/\\*\\*"]) {
    assert.match(deploy, new RegExp(`\\| \`${pattern}\` \\| 禁止 \\| 允许 \\| 禁止 \\| 禁止 \\|`));
  }
  assert.match(deploy, /\| `apps\/\*\*` \| 禁止 \| 允许 \| 禁止 \| 禁止 \|/);
  assert.match(deploy, /\| `<组件应用目录>\/Dockerfile` \| 允许 \| 允许 \| 允许 \| 允许 \|/);
  assert.match(deploy, /\| `<组件应用目录>\/deploy\/\*\*` \| 允许 \| 允许 \| 允许 \| 允许 \|/);
  assert.match(deploy, /\| `deploy\/\*\*` \| 允许 \| 允许 \| 允许 \| 允许 \|/);
  assert.match(deploy, /\| `deploy\/update\/\*\.md` \| 允许 \| 允许 \| 允许 \| 禁止 \|/);
});

test("optimizes one component design file using only template prerequisites", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");

  assert.match(agents, /<组件> opt <目标文件> <意见>/);
  assert.match(agents, /<组件> frontend opt <目标文件> <意见>/);
  assert.match(agents, /<组件> backend opt <目标文件> <意见>/);
  assert.match(agents, /`opt` 可直接跟在指令头后/);
  assert.match(component, /\*\*What\*\*：提供“模板单文件优化”功能/);
  assert.match(component, /目标文件本身（存在时）/);
  assert.match(component, /位于目标之前、且当前实际存在的设计文件/);
  assert.match(component, /同级文件不互为前置依赖/);
  assert.match(component, /不得读取目标之后的设计文件/);
  assert.match(component, /不得读取组件源码、测试、验收或部署文件/);
  assert.match(component, /\| `<目标之前的设计依赖文件>` \| 禁止 \| 允许 \| 禁止 \| 禁止 \|/);
  assert.match(component, /\| `<目标文件>` \| 允许 \| 允许 \| 允许 \| 禁止 \|/);
  assert.match(component, /除目标文件外，不创建、删除、移动、重命名或顺手修改模板、前置文件及关联文件/);
  assert.match(readme, /\| `<任意指令> opt <文件> <意见>` \|/);
});

test("supports single-file opt for every managed command", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");
  assert.match(agents, /## AI-015/);
  assert.match(agents, /\*\*What\*\*：提供“通用单文件优化”功能/);
  for (const syntax of [
    "<编号> opt <目标文件> <可选意见>",
    "<system> opt <目标文件> <可选意见>",
    "<组件> opt <目标文件> <可选意见>",
    "<组件> frontend opt <目标文件> <可选意见>",
    "<组件> backend opt <目标文件> <可选意见>",
    "<组件 dev> opt <目标文件> <可选意见>",
    "<组件 test> opt <目标文件> <可选意见>",
    "<test> opt <目标文件> <可选意见>",
    "<deploy> opt <目标文件> <可选意见>",
    "<组件 deploy> opt <目标文件> <可选意见>",
    "<deploy update> opt <目标文件> <可选意见>",
  ]) assert.match(agents, new RegExp(syntax.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(agents, /文件已存在时原阶段操作权限表必须允许修改，文件不存在时必须允许创建/);
  assert.match(agents, /写入权限收窄为只允许创建或修改目标文件/);
  assert.match(agents, /目标存在时更新，不存在时创建/);
  assert.match(agents, /组件设计使用 AI-COMPONENT-014/);
  assert.match(component, /`<组件 dev>`、`<组件 test>` 和 `<组件 deploy>` 的 `opt` 使用根提示词 AI-015/);
  assert.match(readme, /所有指令都支持 `opt`/);
});

test("separates stable runbook guidance from generated update plans", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const deploy = readFileSync(path.join(WORKFLOW_ROOT, "stages/deploy.md"), "utf8");
  assert.doesNotMatch(deploy, /deploy\/deployment\.md|`deployment\.md`/);
  assert.match(deploy, /`runbook\.md`/);
  assert.match(agents, /<deploy update> <升级内容>/);
  assert.match(deploy, /\| `deploy\/update\/\*\.md` \| 允许 \| 允许 \| 允许 \| 禁止 \|/);
  assert.match(deploy, /<YYYYMMDDHHmmss>_<升级主题>\.md/);
  assert.match(deploy, /一次系统升级只生成一份文件/);
  assert.match(deploy, /普通 `<deploy>` 指令不得创建 `update\/\*\.md`/);
  for (const heading of ["部署检查", "顺序"]) {
    assert.match(deploy, new RegExp(`## ${heading}`));
  }
  assert.match(deploy, /## 开发配置/);
  assert.match(deploy, /cd deploy/);
  assert.match(deploy, /cp dev\.env <组件应用目录相对deploy的路径>\/\.env/);
  assert.match(deploy, /cp dev\.env \.env/);
  assert.match(deploy, /docker compose up -d <依赖服务名>/);
  assert.match(deploy, /docker compose up -d <初始化服务名>/);
  assert.match(deploy, /pnpm --dir <组件应用目录相对deploy的路径> dev/);
  assert.match(deploy, /\| 环境 \| 编排文件 \| 环境变量模板 \| 其他依赖文件 \|/);
  assert.match(deploy, /v<主版本>\.<次版本>\.<修订版本>/);
  assert.match(deploy, /v1\.2\.3-alpha\.1/);
  assert.match(deploy, /v1\.2\.3-rc\.1/);
  assert.match(deploy, /备份、迁移、部署、回滚和恢复是同级操作/);
});

test("configures component development infrastructure with deploy targets", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const deploy = readFileSync(path.join(WORKFLOW_ROOT, "stages/deploy.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");

  assert.match(agents, /<组件 deploy>\s+当前组件的开发基础设施、初始化和启动说明/);
  assert.match(agents, /组件名必须精确匹配 `docs\/system\/system\.md` 组件清单/);
  assert.match(deploy, /\| `deploy\/init\/\*\.\{sh,mjs,sql\}` \| 开发基础设施初始化 \|/);
  assert.match(deploy, /\| `deploy\/config\/\*` \| 基础设施配置 \|/);
  assert.match(deploy, /`postgre\.sh`、`postgre\.mjs`、`postgre\.sql`/);
  assert.match(deploy, /`grafana\.config\.yml`、`prometheus\.config\.yml`/);
  assert.match(deploy, /不创建基础设施子目录/);
  assert.match(deploy, /初始化脚本和运行配置不得混放/);
  assert.match(deploy, /`<组件 deploy>` 只新增或更新该组件的 `### <组件>`/);
  assert.match(deploy, /Compose 使用默认的\s+`\.env` 和 `compose\.yml`/);
  assert.match(deploy, /JavaScript 和 TypeScript 组件默认使用 `pnpm`/);
  assert.match(deploy, /名称优先为 `<基础设施>-init`/);
  assert.match(deploy, /使用 `restart: "no"`/);
  assert.match(deploy, /不执行其中的启动或初始化命令/);
  assert.match(readme, /`<api deploy> <任务>` \| 维护目标组件的开发基础设施配置/);
});

test("resolves nested deploy paths from the system.md component registry", () => {
  const deploy = readFileSync(path.join(WORKFLOW_ROOT, "stages/deploy.md"), "utf8");
  assert.match(deploy, /`<组件应用目录>\/Dockerfile`/);
  assert.match(deploy, /`<组件应用目录>\/deploy\/\*\*`/);
  assert.match(deploy, /必须从 `docs\/system\/system\.md` 的目标组件记录解析并规范化/);
  assert.doesNotMatch(deploy, /`apps\/\*\/Dockerfile`/);
  assert.doesNotMatch(deploy, /`apps\/\*\/deploy\/\*\*`/);
});

test("groups requirement test scenarios by acceptance criterion", () => {
  const requirement = readFileSync(path.join(WORKFLOW_ROOT, "stages/requirement.md"), "utf8");
  assert.doesNotMatch(requirement, /`(business|acceptance|permission|migration)\.md`/);
  for (const type of ["BR", "FLOW", "AC", "PERM", "MIG"]) {
    assert.match(requirement, new RegExp(`items/REQ-001-${type}-001\\.md`));
  }
  assert.match(requirement, /features\/REQ-001-AC-001\.feature/);
  assert.match(requirement, /一个 `\.feature` 文件对应一个 AC/);
  assert.match(requirement, /一个 TC 对应一个 `Scenario` 或 `Scenario Outline`/);
  assert.match(requirement, /每个 TC 只归属一个 AC/);
  assert.match(requirement, /成功、失败、权限或具有独立业务意义的边界情况使用不同 TC/);
  assert.match(requirement, /Examples 行只是该 TC 的数据变体，不创建新的 TC 编号/);
  assert.doesNotMatch(requirement, /每个 TC 写入 `items\/` 中的同编号 `\.feature` 文件/);
});

test("supports frontend and backend component design modes", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const backend = readFileSync(path.join(WORKFLOW_ROOT, "templates/backend-design.template.md"), "utf8");
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  const development = readFileSync(path.join(WORKFLOW_ROOT, "stages/component-dev.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");

  assert.match(agents, /<组件> frontend <前端设计任务>/);
  assert.match(agents, /<组件> backend <后端设计任务>/);
  assert.match(agents, /`frontend` 和 `backend` 只能作为 `<组件>` 指令头后的第一个任务词/);
  assert.match(agents, /不得写入指令头，也不适用于 `dev`、`test` 或 `deploy` 任务/);
  assert.doesNotMatch(agents, /<组件> ddd <DDD设计任务>/);
  assert.match(component, /\*\*What\*\*：提供“完整组件设计模式”功能/);
  assert.match(component, /### Frontend 模式/);
  for (const file of ["experience.md", "state.md", "ui/*.ui.yml", "<组件>.design-token.json", "configuration.md", "testing.md"]) {
    assert.ok(component.includes(`\`${file}\``), `missing Frontend design file: ${file}`);
  }
  assert.match(component, /`docs\/system\/openapi\.json`；每个请求引用其中稳定的 `operationId`/);
  assert.match(component, /临时 Mock 必须标记 `pending`/);
  assert.match(component, /### Backend 模式/);
  assert.match(component, /按可验证复杂度条件选择轻量 Backend 或完整 DDD/);
  assert.match(component, /完整读取\s+`docs\/workflows\/templates\/backend-design\.template\.md`/);
  assert.match(component, /领域 → 接口 → 模型 → 工程 → 运行 → 汇总/);
  assert.match(component, /按需完成 `jobs\.md`、`operations\.md`/);
  assert.doesNotMatch(component, /\| `process\.md` \| 后端业务流程 \|/);
  assert.match(component, /组件设计目录不创建 `process\.md`/);
  assert.match(component, /每个适用文件使用模板规定的标题名称和顺序/);
  assert.match(component, /模板中的图、表、目录、上下文、技术、运行单元和依赖仅用于说明格式，不是默认设计/);
  assert.match(component, /不得照抄示例名称/);
  assert.match(component, /Backend 专用 Markdown、机器可读模型及其固定结构统一由/);
  assert.match(component, /Frontend 和 Backend 模式逐项检查各自列出的全部设计关注点/);
  assert.match(backend, /# Backend 组件设计流程与文档模板/);
  assert.match(backend, /全部是格式与表达示例，\s*不是待复制的默认设计/);
  assert.match(backend, /必须根据已确认的实际需求逐项替换、增删和重组/);
  assert.match(backend, /禁止因示例中出现\s*认证、资源、预约、Outbox、Redis、Prisma 或 BullMQ/);
  assert.match(backend, /尖括号占位符和具体示例名称不得原样进入最终文档/);
  assert.match(backend, /文件名 → 二级标题 → 三级标题 → 可选编号/);
  assert.match(backend, /Backend Markdown 最多使用三级标题，不得出现四级及更深标题/);
  assert.match(backend, /标题后、正文前使用独立引用行 `> Ref: <文件名>:<二级标题>:<三级标题或编号>`/);
  assert.match(backend, /例如 `> Ref: process:xx:xx`/);
  assert.match(backend, /只有 `interface\.md`“操作定义”和 `security\.md`“权限控制”的“关联需求”列可以列当前条目直接实现的需求编号；除此之外不创建引用列、引用表或递归展开上游引用/);
  assert.match(component, /只有 `interface\.md`“操作定义”和 `security\.md`“权限控制”的“关联需求”列可以直接列出当前条目实现的需求编号/);
  assert.match(backend, /表格“编号”列或 `- \*\*001\*\*：` 编号项追加三位编号/);
  assert.match(backend, /找不到三级标题或编号时停在已经识别到的二级或三级标题/);
  assert.doesNotMatch(backend, /^#### /m);
  assert.match(backend, /`@design <设计标识>` 标记唯一主实现/);
  assert.match(backend, /每个 Markdown 文件都在一级标题下用一句简短正文说明该文件的职责/);
  assert.match(backend, /\*\*What\*\*：定义 Backend 设计文件的事实所有权、单向依赖和生成顺序/);
  assert.match(backend, /domain --> interface/);
  assert.match(backend, /domain --> data/);
  assert.match(backend, /interface --> engineering/);
  assert.match(backend, /engineering --> jobs/);
  assert.match(backend, /engineering --> operations/);
  assert.match(backend, /operations --> component/);
  assert.doesNotMatch(backend, /component --> engineering/);
  assert.match(backend, /最后更新 `component\.md` 开头的文件关系/);
  assert.match(backend, /\*\*What\*\*：定义文件关系、架构图、按上下文组织的代码结构和完整文件树[\s\S]*## 架构图\r?\n\r?\n```mermaid\r?\nC4Component/);
  assert.match(backend, /title <组件名称> 组件图/);
  assert.match(backend, /Container_Boundary\(context_layout, "上下文"\)/);
  assert.match(backend, /无关系连线的 `C4Component`/);
  assert.doesNotMatch(backend, /\b(?:BiRel|Rel(?:_[DULR])?)\(/);
  assert.match(backend, /flowchart LR/);
  assert.match(backend, /\*\*What\*\*：定义 Backend 设计文件的事实所有权、单向依赖和生成顺序/);
  assert.match(backend, /领域层不得依赖框架、ORM、HTTP、JWT、授权引擎或消息队列/);
  assert.match(backend, /\*\*What\*\*：定义限界上下文内的领域模型、统一语言、业务规则、事件、状态和业务一致性[\s\S]*# 领域设计[\s\S]*## <限界上下文>/);
  assert.match(backend, /### 领域模型[\s\S]*\| 类型 \| 名称 \| 所属聚合 \| 职责 \| 领域命令 \|[\s\S]*### 统一语言/);
  assert.doesNotMatch(backend, /### 领域命令/);
  assert.match(backend, /“类型”只使用中文：`聚合根`、`实体`、`值对象`、`领域服务` 或 `领域策略`/);
  assert.doesNotMatch(backend, /聚合根（Aggregate Root）|实体（Entity）|值对象（Value Object）|领域服务（Domain Service）|领域策略（Domain Policy）/);
  assert.match(backend, /聚合根填写自身名称；实体只能填写一个聚合根[\s\S]*通用值对象填写 `上下文共享`[\s\S]*领域服务和领域策略填写 `上下文级`/);
  assert.match(backend, /跨聚合关系只持有对方聚合根的稳定 ID，不直接持有其内部实体/);
  assert.match(backend, /“领域命令”表示该模型直接承担的业务意图，不是调用方、方法清单或 Application Handler/);
  assert.match(backend, /领域模型表不增加不变量列；不变量和其他业务规则只在“业务规则”表维护/);
  assert.match(backend, /\| 对象 \| 术语 \| 定义 \|[\s\S]*### 业务规则[\s\S]*\| 编号 \| 类型 \| 对象或范围 \| 规则 \| 违反结果 \|/);
  assert.match(backend, /`不变量`[\s\S]*`前置条件`[\s\S]*`资格规则`[\s\S]*`计算规则`[\s\S]*`业务策略`[\s\S]*`跨聚合规则`/);
  assert.match(backend, /### 领域事件[\s\S]*\| 事件 \| 触发条件 \| 字段 \|/);
  assert.match(backend, /### 状态图[\s\S]*```mermaid\r?\nstateDiagram-v2/);
  assert.match(backend, /### 业务一致性[\s\S]*\| 编号 \| 必须同时成立的业务事实 \|[\s\S]*\| 001 \|/);
  assert.match(backend, /### 时序图\r?\n\r?\n- \*\*<流程>\*\*\r?\n\r?\n> Ref: process:<角色>:BP-001\r?\n\r?\n```mermaid\r?\nsequenceDiagram/);
  assert.match(backend, /每个时序图先使用 `- \*\*<流程>\*\*` 简短说明引用对象，再使用 `> Ref: process:<角色>:<BP 编号>`/);
  assert.match(component, /`domain\.md` 的每个时序图依次使用 `- \*\*<流程>\*\*` 说明引用对象、`> Ref: process:<角色>:<BP 编号>`/);
  assert.doesNotMatch(backend, /### 领域结构/);
  assert.match(component, /一个组件默认对应一个限界上下文/);
  assert.match(component, /完整 DDD 模式的每个限界上下文必须包含领域模型、统一语言、业务规则和业务一致性/);
  assert.match(component, /领域模型表使用“类型、名称、所属聚合、职责、领域命令”五列/);
  assert.match(component, /通用值对象填写“上下文共享”，领域服务和领域策略填写“上下文级”/);
  assert.match(backend, /仅当以下条件全部成立时使用轻量 Backend/);
  assert.match(backend, /上述任一复杂度信号存在时使用完整 DDD/);
  assert.match(backend, /`domain\.md` 仅在完整 DDD 模式创建/);
  assert.match(component, /不创建独立的 `state\.md` 或\s+`sequence\.md`/);
  assert.doesNotMatch(backend, /## `process\.md`/);
  assert.match(backend, /source\["需求与系统规范"\]/);
  assert.match(backend, /source --> domain/);
  assert.doesNotMatch(backend, /## `state\.md`/);
  assert.doesNotMatch(backend, /## `sequence\.md`/);
  assert.match(backend, /`docs\/system\/openapi\.json` 是跨组件同步 HTTP 契约唯一源/);
  assert.match(backend, /`openapi\.json`[\s\S]*由需求与系统边界驱动并由 `<system>` 维护/);
  assert.match(backend, /`authorization\.fga`[\s\S]*由 `security\.md` 驱动/);
  assert.match(backend, /`schema\.dbml`[\s\S]*由 `data\.md` 驱动/);
  for (const file of [
    "component.md",
    "domain.md",
    "interface.md",
    "security.md",
    "data.md",
    "engineering.md",
    "jobs.md",
    "operations.md",
  ]) {
    assert.ok(backend.includes(`**Where**：\`<组件设计目录>/${file}\``), `missing Backend template for ${file}`);
  }
  for (const responsibility of [
    "定义当前 Backend 的领域语言、业务规则、状态变化和一致性边界。",
    "定义当前 Backend 的操作边界、输入处理、错误语义、幂等、兼容和契约索引。",
    "定义当前 Backend 的身份认证、权限控制和安全失败处理。",
    "定义当前 Backend 的数据访问、持久化边界和一致性策略。",
    "定义当前 Backend 的实现映射、执行管线、工程约束和测试规划。",
    "定义当前 Backend 的后台任务与独立 Worker 异步任务。",
    "定义当前 Backend 的配置、密钥、运行信号、运行单元和交付快照。",
    "汇总当前 Backend 的文件关系、架构、代码结构和完整文件结构。",
  ]) {
    assert.match(backend, new RegExp(`^# .+\\r?\\n\\r?\\n${responsibility}$`, "m"));
  }
  assert.match(backend, /始终创建 `component\.md`、`interface\.md` 和 `engineering\.md`/);
  assert.match(backend, /## 入口清单[\s\S]*\| 入口 \| 协议 \| 调用方 \| 契约 \|[\s\S]*## 操作定义/);
  assert.match(backend, /### <业务能力>[\s\S]*\| 编号 \| HTTP \| 路径 \| operationId \| 权限 \| 关联需求 \|[\s\S]*\| 001 \| POST \|[\s\S]*\| 002 \| GET \|/);
  assert.match(backend, /每个实际 HTTP 操作占一行，同一分组允许多行/);
  assert.match(backend, /操作编号在“操作定义”的全部业务能力分组内使用唯一且稳定的三位编号并从 `001` 开始/);
  assert.match(backend, /`operationId` 与 OpenAPI 完全一致并在组件内唯一/);
  assert.match(backend, /“关联需求”只列当前操作直接实现的 FR、AC、BR 或 PERM 完整编号[\s\S]*不递归展开需求关系/);
  assert.match(backend, /## 输入处理[\s\S]*### `<operationId>`[\s\S]*\| 编号 \| 字段 \| 正则 \| 错误码 \| 说明 \|[\s\S]*\| 001 \| `<field>` \| `<regex>` \|/);
  assert.doesNotMatch(backend, /### 标准化|### 格式校验|### 领域校验/);
  assert.match(backend, /编号在每个 `operationId` 分组内唯一、稳定并从 `001` 开始/);
  assert.match(backend, /“字段”只填写机器契约中的字段名，不增加来源、jq、JSONPath 或其他路径语法/);
  assert.match(backend, /“正则”使用不带语言分隔符的表达式并与 OpenAPI `pattern` 一致/);
  assert.match(backend, /“输入处理”只维护格式校验[\s\S]*业务前置条件和不变量由 `domain\.md` 维护/);
  assert.match(backend, /## JSON 响应[\s\S]*```json[\s\S]*"code": "SUCCESS"[\s\S]*"message": "操作成功"[\s\S]*"data": \{\}[\s\S]*```/);
  assert.match(backend, /外层固定为 `code`、`message`、`data`[\s\S]*没有数据或失败时为 `null`/);
  assert.match(backend, /HTTP 状态码由“错误码”表的 `Code` 决定，具体 `data` Schema 由 OpenAPI 维护/);
  assert.match(backend, /Markdown 不复制 Schema 字段，只维护输入正则、固定响应外层、稳定语义和引用/);
  assert.match(backend, /## 错误处理[\s\S]*### 错误分类[\s\S]*### 错误码[\s\S]*\| 编号 \| 错误码 \| Code \| 含义 \| 产生位置 \| 是否可重试 \|/);
  assert.doesNotMatch(backend, /### 稳定错误码|### 协议映射|\| 错误码 \| 协议 \| Code \| 对外含义 \|/);
  assert.match(backend, /错误编号在“错误码”表内使用唯一且稳定的三位编号并从 `001` 开始/);
  assert.match(backend, /错误码使用稳定的大写蛇形命名/);
  assert.match(backend, /`Code` 直接填写当前协议的对外 Code，例如 HTTP `401`、gRPC `UNAUTHENTICATED`/);
  assert.match(backend, /不再创建独立“协议映射”章节/);
  assert.match(backend, /“产生位置”填写稳定的业务上下文或输入、领域、授权、数据、外部依赖等边界/);
  assert.match(backend, /# 安全设计[\s\S]*## 身份认证[\s\S]*\| 对象 \| 规则 \|[\s\S]*\| 密码 \|[\s\S]*\| Access Token \|[\s\S]*\| Refresh Token \|[\s\S]*\| Session \|/);
  assert.match(backend, /## 权限控制[\s\S]*\| 编号 \| 角色 \| 资源 \| 范围 \| 条件 \| 执行点 \| 关联需求 \|[\s\S]*\| 001 \|/);
  assert.match(backend, /## 失败处理[\s\S]*\| 场景 \| 处理 \| 审计 \|/);
  assert.doesNotMatch(backend, /## 系统基线引用|## 授权模型引用|### 身份来源与信任边界|### 凭据与会话|### Token 生命周期|### 轮换、撤销与防重放|### 权限矩阵|### 权限执行点|### 数据范围/);
  assert.match(backend, /身份认证和权限控制分别在章节开头用 `> Ref` 引用系统安全基线/);
  assert.match(backend, /只有当前组件实际接收、签发、保存或撤销对应凭据时才保留密码、Access Token、Refresh Token 或 Session 行/);
  assert.match(backend, /密码只保存不可逆的自适应哈希[\s\S]*使用 bcrypt 时记录实际 cost 和输入长度限制/);
  assert.match(backend, /Token 状态使用 `active → used`[\s\S]*Session 状态只使用 `active → revoked` 或 `active → expired`，不使用 `used`/);
  assert.match(backend, /权限控制编号在本表内唯一、稳定并从 `001` 开始/);
  assert.match(backend, /“关联需求”只列当前权限直接实现的 PERM、FR、AC 或 BR 完整编号[\s\S]*不递归展开需求关系/);
  assert.match(backend, /“角色”使用需求和系统安全基线中的实际业务角色[\s\S]*“范围”描述该角色可访问的资源集合或数据边界/);
  assert.match(backend, /“权限控制”不重复 `interface\.md` 中操作到权限的映射[\s\S]*只定义角色、资源、范围、条件和执行点/);
  assert.match(backend, /稳定错误码及协议 Code 只由 `interface\.md` 维护，不在本文件重复/);
  assert.match(backend, /密钥变量、注入和运行时轮换由 `operations\.md` 维护/);
  assert.match(component, /\| `interface\.md` \| 接口、输入与错误设计 \| 始终 \|/);
  assert.match(backend, /engineering --> jobs/);
  assert.match(backend, /engineering --> operations/);
  assert.match(backend, /engineering --> component/);
  assert.match(backend, /operations --> component/);
  assert.match(backend, /# 工程设计\s+[\s\S]*定义当前 Backend 的实现映射、执行管线、工程约束和测试规划。\s+```mermaid[\s\S]*flowchart LR[\s\S]*接口层[\s\S]*应用层[\s\S]*领域层[\s\S]*端口[\s\S]*适配器/);
  assert.match(backend, /@design <设计标识>[\s\S]*@design-ref <设计标识>/);
  assert.match(backend, /## 实现映射[\s\S]*\| 编号 \| 类型 \| 设计对象 \| 实现对象 \| 技术 \|[\s\S]*\| 001 \| 数据访问 \| `UserRepository` \| `PrismaUserRepository` \| Prisma \|/);
  assert.match(backend, /## 执行管线[\s\S]*\| 编号 \| 入口 \| 执行顺序 \| 事务边界 \| 说明 \|/);
  assert.match(backend, /## 工程约束[\s\S]*### 目录约定[\s\S]*### 文件命名[\s\S]*### 编码规范/);
  assert.doesNotMatch(backend, /## 架构映射|## 应用执行管线|### 事务与消息代码|## 依赖方向|## 测试策略|## 测试配置|## 测试命令|## 例外/);
  assert.match(backend, /Command Bus 只在多个用例需要统一分派或共享 Middleware 时采用/);
  assert.match(backend, /\| Command \| `<action>\.command\.ts` \|/);
  assert.match(backend, /\| Handler \| `<action>\.handler\.ts` \|/);
  assert.match(backend, /\| Query \| `<action>\.query\.ts` \|/);
  assert.match(backend, /\| Aggregate \| `<subject>\.aggregate\.ts` \|/);
  assert.match(backend, /\| Entity \| `entity\.ts` 或 `<subject>\.entity\.ts` \|/);
  assert.match(backend, /\| Value Object \| `value-object\.ts` 或 `<subject>\.value-object\.ts` \|/);
  assert.match(backend, /同一聚合或能力内只有字段、类型和简单校验的 Entity、Value Object 可以合并/);
  assert.match(backend, /\| Domain Event \| `<event>\.event\.ts` \|/);
  assert.match(backend, /\| Repository Adapter \| `<subject>\.<technology>\.repository\.ts` \|/);
  assert.match(backend, /Fixture 与测试支持保留独立二级标题/);
  assert.match(backend, /## Fixture 与测试支持[\s\S]*## 单元测试[\s\S]*### AUTH-DOM-USER-001[\s\S]*> Design：`domain:Auth认证:业务规则:001`[\s\S]*> Src：`test\/unit\/domain\/user\.test\.ts`[\s\S]*Desc：校验手机号唯一规则\r?\nGiven：已存在同一手机号的用户。\r?\nWhen：创建新用户。\r?\nThen：返回手机号已注册的稳定错误。/);
  assert.match(backend, /测试命令不在 `engineering\.md` 维护/);
  assert.match(backend, /精确生产与测试文件树只由 `component\.md` 维护/);
  assert.match(backend, /## 数据访问[\s\S]*\| 编号 \| 类型 \| 对象 \| 操作 \| 说明 \|[\s\S]*\| 001 \| 仓储 \| `UserRepository` \| `findByPhone`、`save` \|/);
  assert.match(backend, /“数据访问”的类型只使用：[\s\S]*`仓储`[\s\S]*`查询模型`[\s\S]*`缓存`[\s\S]*`对象存储`[\s\S]*`搜索索引`[\s\S]*`事件存储`/);
  assert.match(backend, /“对象”填写稳定的数据访问接口或对象名称[\s\S]*“操作”只列关键稳定方法名[\s\S]*DAO、Mapper、ORM、Prisma、Redis 等实现名称由 `engineering\.md` 维护/);
  assert.match(backend, /\| 编号 \| 入口 \| 原子写入 \| 失败结果 \|/);
  assert.match(backend, /同一一致性事项在 `domain\.md` 的“业务一致性”和 `data\.md` 的 Unit of Work 中使用相同三位编号并从 `001` 开始，不增加跨文件引用列/);
  assert.match(backend, /### Outbox[\s\S]*\| 编号 \| Unit of Work \| 集成事件 \| 投递语义 \|/);
  assert.match(backend, /### Inbox[\s\S]*\| 编号 \| 消费入口 \| 幂等键 \| 原子写入 \| 重复消息结果 \| 保留策略 \|/);
  assert.match(backend, /## 并发控制[\s\S]*\| 编号 \| 竞争场景 \| 控制策略 \| 冲突结果 \|/);
  assert.match(backend, /## 数据演进[\s\S]*\| 编号 \| 变更场景 \| 兼容策略 \| 回填与回滚 \|/);
  assert.match(backend, /## 数据保留[\s\S]*\| 编号 \| 数据 \| 保留要求 \| 清理或归档 \|/);
  assert.doesNotMatch(backend, /## 数据所有权|## Repository|## 查询模型|## 索引策略|## 迁移策略|## Schema 引用/);
  assert.match(backend, /业务写入与 Outbox 记录必须由同一 Unit of Work 原子提交/);
  assert.match(backend, /# 运行与交付[\s\S]*\| 编号 \| 配置项 \| 用途 \| 必需 \| 默认值 \| 启动校验 \|/);
  assert.match(backend, /## 密钥[\s\S]*\| 编号 \| 密钥 \| 用途 \| 必需 \| 轮换与失效要求 \|/);
  assert.match(backend, /## 运行信号[\s\S]*### 日志与审计[\s\S]*### 指标与追踪[\s\S]*### 健康检查/);
  assert.doesNotMatch(backend, /### 告警与脱敏|### 配置清单|### 来源与覆盖优先级|### 启动校验|### 密钥清单|### 注入与轮换|### 泄漏处理|## 可观测性|## 运行要求|## 部署交付/);
  assert.match(backend, /## 运行单元[\s\S]*\| 编号 \| 运行单元 \| 入口 \| 依赖 \| 健康检查 \| 资源要求 \| 关闭与恢复 \|/);
  assert.match(backend, /## 交付要求[\s\S]*### 20260804045512[\s\S]*```bash[\s\S]*# 构建交付物。[\s\S]*# 执行初始化或迁移[\s\S]*# 按确认的顺序发布。[\s\S]*# 发布失败时执行/);
  assert.match(backend, /14 位本地时间 `YYYYMMDDHHmmss`[\s\S]*最新快照表示当前有效交付要求，已有快照不得修改/);
  assert.match(backend, /每个交付快照只使用一个与实际 Shell 匹配的代码块[\s\S]*使用 Shell 注释就近说明条件/);
  assert.match(backend, /最后更新 `component\.md` 开头的文件关系、架构图、按上下文组织的代码结构和完整文件树/);
  assert.match(backend, /## 文件关系[\s\S]*jobs --> component[\s\S]*## 架构图[\s\S]*## 代码结构[\s\S]*### <上下文>[\s\S]*> Mode: <轻量 Backend 或完整 DDD>[\s\S]*flowchart LR/);
  assert.match(backend, /每个上下文只使用一个 `flowchart LR` 展示内部对象、必要的关键公开方法及对象之间的调用或实现关系/);
  assert.match(backend, /`component\.md` 不保留“概述”或“设计索引”章节/);
  assert.match(backend, /`目录结构` 递归列出全部应受版本控制的生产、测试和配置文件/);
  assert.match(component, /\| `engineering\.md` \| 编码与测试 \| 始终 \|/);
  assert.match(component, /Command Bus、Handler\/Middleware 和测试规划放入 `engineering\.md`/);
  assert.match(component, /Backend 的 `component\.md` 完整文件树覆盖 `engineering\.md`/);
  assert.match(development, /Backend[\s\S]*并必须读取 `engineering\.md`/);
  for (const file of ["openapi.json", "asyncapi.json", "authorization.fga", "schema.dbml"]) {
    assert.ok(backend.includes(`### \`${file}\``), `missing Backend model template for ${file}`);
  }
  assert.match(readme, /`<web> frontend <任务>`/);
  assert.match(readme, /`<api> backend <任务>`/);
  assert.match(readme, /`templates\/backend-design\.template\.md`/);
});

test("designs background and worker tasks in the backend engineering phase", () => {
  const backend = readFileSync(path.join(WORKFLOW_ROOT, "templates/backend-design.template.md"), "utf8");
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");

  assert.match(backend, /engineering --> jobs/);
  assert.match(backend, /jobs --> operations/);
  assert.match(backend, /\*\*What\*\*：定义后台任务与异步 Worker 的入口、功能点、运行时序、投递和幂等要求[\s\S]*# 任务设计/);
  assert.match(backend, /## 后台任务[\s\S]*## 异步任务/);
  assert.match(backend, /> Src：`<精确生产文件路径>`[\s\S]*> Host：`<现有 API 或 Worker 进程>`[\s\S]*> 触发方式：/);
  assert.match(backend, /> Runtime：`<Worker 运行单元>`[\s\S]*> AsyncAPI：`asyncapi\.json#\/channels\/<channel>`[\s\S]*> Topic：`<topic>`/);
  assert.match(backend, /- \*\*001\*\*：<动词 \+ 业务对象>[\s\S]*运行方式：[\s\S]*```mermaid\r?\nsequenceDiagram/);
  assert.match(backend, /后台任务随宿主进程启动和停止，不拥有独立启动命令、健康检查、部署或扩缩容单元/);
  assert.match(backend, /`jobs\.md` 只维护任务功能、消费约束和运行时序/);
  assert.match(component, /\| `jobs\.md` \| 后台与异步任务 \| 存在后台任务或独立 Worker \|/);
  assert.match(readme, /领域 → 接口 → 模型 → 工程 → 运行 → 汇总/);
});

test("defines bounded-context backend runtimes and conditional TypeScript conventions", () => {
  const backend = readFileSync(path.join(WORKFLOW_ROOT, "templates/backend-design.template.md"), "utf8");
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");

  assert.match(component, /一个逻辑 Backend 组件可以按实际需要提供 HTTP\/API 和消息 Worker 等独立运行入口；Outbox Relay 托管在\s*现有 API 或 Worker 进程内/);
  assert.match(component, /进程不是工作流组件的划分单位/);
  assert.match(component, /跨上下文通过稳定的应用接口或 Port 协作，不导入对方的领域对象/);
  assert.match(component, /Backend 不创建独立 `architecture\.md` 或 `structure\.md`/);
  assert.match(component, /代码规则与测试规划放入 `engineering\.md`/);

  assert.match(backend, /\*\*What\*\*：定义领域边界、分层依赖、代码角色、运行单元和条件性 TypeScript 约定/);
  assert.match(backend, /Container_Boundary\(caller_layout, "<调用方>"\)[\s\S]*Container_Boundary\(context_layout, "上下文"\)[\s\S]*Container_Boundary\(infra_layout, "基础设施"\)/);
  assert.match(backend, /UpdateLayoutConfig\(\$c4ShapeInRow="5", \$c4BoundaryInRow="1"\)/);
  assert.match(backend, /一个 Backend 可以包含 API、内嵌后台任务和独立 Worker 入口/);
  assert.match(backend, /可靠消息发布使用同一 Unit of Work 原子写入业务数据和 Outbox/);
  assert.match(backend, /Relay 不是独立进程/);
  assert.match(backend, /技术约定只在实际技术栈采用对应工具时启用/);
  assert.match(backend, /<subject>\.<technology>\.<role>\.ts/);
  assert.match(backend, /<event>\.event\.ts/);
  assert.match(backend, /prisma\/migrations\/<timestamp_name>\/migration\.sql/);
  assert.match(readme, /图、表、目录、技术、依赖和业务名称均为示例，必须根据当前组件的实际情况调整/);
});

test("separates system, component, and deploy security and observability ownership", () => {
  const system = readFileSync(path.join(WORKFLOW_ROOT, "stages/system.md"), "utf8");
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  const deploy = readFileSync(path.join(WORKFLOW_ROOT, "stages/deploy.md"), "utf8");

  assert.match(system, /只维护所有组件共同遵守的长期安全原则、信任边界、控制基线和开发凭证/);
  assert.match(system, /不写具体组件的\s*Token 或 Session 流程、权限关系、执行点、审计事件名或实现配置/);
  assert.match(system, /`security\.md` 使用“安全目标”“信任边界”“全局控制基线”“凭证”和“风险与例外”五个二级章节/);
  assert.match(system, /## 安全目标[\s\S]*\| 目标 \| 适用范围 \| 验证方式 \|/);
  assert.match(system, /## 信任边界[\s\S]*flowchart LR[\s\S]*subgraph external\["外部与不可信区域"\]/);
  assert.match(system, /## 全局控制基线[\s\S]*\| 领域 \| 全局规则 \| 适用范围 \| 验证方式 \|/);
  assert.match(system, /## 凭证[\s\S]*\| 变量 \| 值 \| 说明 \|/);
  assert.match(system, /`system\.md` 组件清单只引用变量名[\s\S]*不得猜测值，不登记测试、生产凭证/);
  assert.match(system, /## 风险与例外[\s\S]*\| 风险 \| 适用范围 \| 控制措施 \| 验证方式 \|/);
  assert.match(system, /没有实际安全例外时删除“例外”三级章节和表格/);
  assert.doesNotMatch(system, /## 身份与凭据基线/);
  assert.match(system, /只维护跨组件遥测约定、共用平台、关联传播、保留脱敏和系统级运行目标/);
  assert.match(system, /`observability\.md` 只使用“全局信号基线”“遥测链路”“系统运行目标”和“数据治理”/);
  assert.match(system, /## 全局信号基线[\s\S]*\| 信号 \| 全局要求 \| 必要标识 \| 组件负责 \|/);
  assert.match(system, /日志必须统一结构、级别语义及\s+Trace ID、Span ID、Request ID 或 Correlation ID/);
  assert.match(system, /## 遥测链路[\s\S]*flowchart LR[\s\S]*subgraph producers\["信号生产方"\]/);
  assert.match(system, /## 系统运行目标[\s\S]*### SLI 与 SLO[\s\S]*### 告警分级与路由/);
  assert.match(system, /## 数据治理[\s\S]*\| 信号 \| 保留要求 \| 采样要求 \| 敏感信息与脱敏 \| 访问控制 \|/);
  assert.doesNotMatch(system, /## 日志关联/);
  assert.doesNotMatch(system, /## Trace 传播/);
  assert.match(component, /### 跨阶段权威边界/);
  assert.match(component, /组件文件只维护当前组件如何落实全局基线、实际产生的信号、需要的密钥以及明确例外/);
  assert.match(component, /`operations\.md` 不重新定义全局可观测字段、命名、保留策略、告警级别或系统级 SLO/);
  assert.match(deploy, /\*\*What\*\*：提供“安全与可观测性边界”功能/);
  assert.match(deploy, /部署阶段维护密钥注入、证书挂载、环境值、安全中间件配置、Collector、Exporter/);
  assert.match(deploy, /不得在部署文件中补写设计规则/);
});

test("plans the component test structure before implementing tests", () => {
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  const testing = readFileSync(path.join(WORKFLOW_ROOT, "stages/component-test.md"), "utf8");
  const backend = readFileSync(path.join(WORKFLOW_ROOT, "templates/backend-design.template.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");

  assert.match(component, /### 测试目录设计规则/);
  assert.match(component, /完整文件树必须包含当前组件计划维护的全部测试目录、测试文件/);
  assert.match(component, /`fixtures\/`、`support\/`、`unit\/`、`integration\/`、`contract\/`、\s*`concurrency\/` 和 `e2e\/`/);
  assert.match(component, /单元测试按业务模块组织/);
  assert.match(component, /集成测试包含“接口测试”，路径为 `test\/integration\/api\/`/);
  assert.match(component, /通过真实 HTTP、异步消息\s*或 RPC 入口/);
  assert.match(component, /不创建语言映射表或测试用例总表/);
  assert.match(component, /以“单元测试、集成测试、契约测试、并发测试、端到端测试”作为二级标题/);
  assert.match(component, /每个测试用例直接使用只含用例编号的三级标题/);
  assert.match(component, /不再按测试层级、测试文件或测试对象增加标题/);
  assert.match(component, /<限界上下文>-<测试层级>-<对象或能力>-<三位序号>/);
  assert.match(component, /\| Domain 单元测试 \| `DOM` \| 聚合、实体、值对象或领域规则 \|/);
  assert.match(component, /\| Application 单元测试 \| `APP` \| Command、Query 或应用用例 \|/);
  assert.match(component, /\| Infrastructure 纯逻辑测试 \| `INF` \| 纯逻辑技术能力 \|/);
  assert.match(component, /\| 接口集成测试 \| `API` \| 接口操作或公开能力 \|/);
  assert.match(component, /\| 其他集成测试 \| `INT` \| Repository、Adapter 或协作边界 \|/);
  assert.match(component, /\| 契约测试 \| `CON` \| 契约对象 \|/);
  assert.match(component, /\| 并发测试 \| `CONC` \| 并发行为或竞争资源 \|/);
  assert.match(component, /\| 端到端测试 \| `E2E` \| 组件内完整业务链路 \|/);
  assert.match(component, /大写英文 `KEBAB-CASE`/);
  assert.match(component, /相同[\s\S]*前缀内从 `001` 递增/);
  assert.match(component, /`BOOKING-APP-CANCEL-001`[\s\S]*不使用 `BOOKING-APP-BOOKING-SERVICE-001`/);
  assert.match(component, /Markdown 引用行中写必需的 `Design` 和 `Src`，再按需写可选的 `BP`、`BR`、`FR`、`AC`/);
  assert.match(component, /组件测试不引用 TC/);
  assert.match(component, /`Desc`、`Given`、`When`、`Then`/);
  assert.match(component, /四个字段连续书写且\s*彼此之间不留空行/);
  assert.match(component, /一个用例只描述一个主要行为/);
  assert.match(component, /消息发布行为由集成测试验证，Schema 兼容性由契约测试/);
  assert.match(component, /只有两个以上测试文件复用时才提取为共享文件/);
  assert.match(component, /`Src` 是组件应用目录下测试文件的精确相对路径/);
  assert.match(component, /完整文件树必须逐个包含所有 `Src`/);
  assert.match(component, /没有现有约定时使用小写英文\s*`kebab-case` 主题名和该工具链的原生测试后缀/);
  assert.match(component, /`appointment\.test\.ts`、`cancel-booking\.test\.ts`/);
  assert.match(component, /不使用\s*`booking-service\.test\.ts` 或 `BOOKING-APP-CANCEL-001\.test\.ts`/);
  assert.match(component, /公开入口、fixture 生命周期或外部依赖不同\s*时拆分文件/);
  assert.match(component, /同步更新完整文件树和引用该文件的全部 `Src`/);
  assert.match(component, /测试运行器配置、初始化文件和实际测试命令入口必须出现在完整文件树中/);
  assert.match(component, /`testing\.md` 必须包含“测试命令”章节/);
  assert.match(component, /没有既有测试工具链时默认\s*使用 `pnpm` 和 Vitest/);
  assert.match(component, /`testing\.md` 只索引项目真实存在的命令/);
  assert.match(component, /测试报告和覆盖率报告按需由用户手动导出/);
  assert.match(component, /Design 章节、Src 测试路径和 Token 均存在/);
  assert.match(component, /不在 `component\.md` 中复制测试步骤、断言、测试数据或执行结果/);
  assert.match(testing, /从 `component\.md` 的完整文件树读取计划的测试目录、测试文件、fixture、支持代码和配置/);
  assert.match(testing, /任务需要的测试层级或稳定测试文件未在组件设计中规划/);
  assert.match(testing, /语言与工具链说明以及“测试命令”和“局部执行”章节/);
  assert.match(testing, /默认采用 `pnpm` 和 Vitest/);
  assert.match(testing, /执行本次受影响测试/);
  assert.match(testing, /执行当前组件全部测试/);
  assert.match(testing, /不得把只运行局部测试写成全部测试通过/);
  assert.match(testing, /每个三级标题定义的稳定测试用例作为测试代码规划依据/);
  assert.match(testing, /用例描述必须由三级标题的用例编号和该用例的 `Desc` 组成/);
  assert.match(testing, /测试层级缩写必须与二级标题匹配/);
  assert.match(testing, /用例编号必须符合 `component\.md` 的对象或能力命名规则/);
  assert.match(testing, /不在测试实现阶段擅自改号/);
  assert.match(testing, /验证必填的 `Design`、`Src` 以及可选的 `BP`、`BR`、`FR`、`AC` 实际存在且类型正确/);
  assert.match(testing, /测试代码对用例中的每个 `Design` 使用 `@verifies <完整设计标识>`/);
  assert.match(testing, /`Src` 必须与 `component\.md` 完整文件树中的精确测试文件路径一致/);
  assert.match(testing, /不得自行选择替代路径、移动或重命名 `Src`/);
  assert.match(testing, /不同公开操作、成功与失败分支或独立边界场景合并/);
  assert.match(testing, /接口测试代码放入 `test\/integration\/api\/`/);
  assert.match(testing, /测试报告和覆盖率报告只按用户需要手动导出/);
  assert.match(testing, /分别报告通过、失败、跳过和未执行的测试范围/);
  assert.match(testing, /新增测试、fixture、支持代码和配置位于 `component\.md` 规划的测试目录中/);
  assert.match(testing, /每个已实现用例位于其 `Src` 指定的测试文件中/);
  assert.match(backend, /本组件使用 <语言和版本>，沿用 <构建或包管理工具>、<测试框架>/);
  assert.match(backend, /不创建语言映射表或\s*测试用例总表/);
  assert.match(backend, /## Fixture 与测试支持[\s\S]*## 单元测试[\s\S]*## 集成测试[\s\S]*## 契约测试[\s\S]*## 并发测试[\s\S]*## 端到端测试/);
  assert.match(backend, /## 单元测试[\s\S]*### AUTH-DOM-USER-001/);
  assert.match(backend, /> Design：`domain:Auth认证:业务规则:001`\r?\n> Src：`test\/unit\/domain\/user\.test\.ts`/);
  assert.doesNotMatch(backend, /> Req：/);
  assert.match(backend, /Desc：校验手机号唯一规则\r?\nGiven：已存在同一手机号的用户。\r?\nWhen：创建新用户。\r?\nThen：返回手机号已注册的稳定错误。/);
  assert.match(backend, /例如 `### AUTH-DOM-USER-001`/);
  assert.match(backend, /`Design` 必须是可解析设计标识/);
  assert.match(backend, /测试实现对每个标识使用 `@verifies`/);
  assert.match(backend, /消息行为由集成测试验证，Schema 兼容性由契约测试验证/);
  assert.match(backend, /组件测试不引用 Requirement TC，不声称验证跨组件 BP/);
  assert.match(backend, /`Src` 必须是精确测试文件路径并由 `component\.md` 文件树收录/);
  assert.match(backend, /测试命令不在 `engineering\.md` 维护/);
  assert.match(backend, /测试报告和覆盖率报告按需由用户手动导出/);
  assert.match(readme, /`<web test> <任务>` \| 编写并执行目标组件测试/);
  assert.match(readme, /详细规则以模板和对应阶段提示词为准/);
  assert.match(readme, /--design-dir <组件设计目录> --app-dir <组件应用目录>/);
});

test("separates global acceptance from component tests", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const acceptance = readFileSync(path.join(WORKFLOW_ROOT, "stages/test.md"), "utf8");
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  const testing = readFileSync(path.join(WORKFLOW_ROOT, "stages/component-test.md"), "utf8");
  const backend = readFileSync(path.join(WORKFLOW_ROOT, "templates/backend-design.template.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");

  assert.match(agents, /<test> <验收任务>/);
  assert.match(agents, /`<test>` 根据需求 TC、AC 和系统 BP 维护并执行 `test\/acceptance\/\*\*`/);
  assert.match(agents, /精确的 `<test>` 是保留的全局指令[\s\S]*不得把 `test` 当作组件名/);
  assert.match(agents, /test\/acceptance\/\*\*\s+跨组件验收测试实现/);
  assert.match(acceptance, /^# `<test>` 全局验收测试/m);
  assert.match(acceptance, /Requirement TC 是验收测试的稳定用例 ID/);
  assert.match(acceptance, /不创建第二套验收编号/);
  assert.match(acceptance, /验证其唯一归属的 AC/);
  assert.match(acceptance, /Scenario Outline 的 Examples 行是同一 TC 的数据变体/);
  assert.match(acceptance, /TC → AC → BP → 入口 → 可观察结果/);
  assert.match(acceptance, /从真实 HTTP、UI、异步消息或 RPC 入口执行/);
  assert.match(acceptance, /全局阶段必须执行本次任务相关的验收测试命令/);
  assert.match(acceptance, /Production 或操作可能修改真实业务数据时停止/);
  assert.match(acceptance, /测试报告和覆盖率报告只按用户需要手动导出/);
  assert.match(component, /需要启动或断言多个组件[\s\S]*归全局 `<test>`/);
  assert.match(testing, /任务要求实现 Requirement TC[\s\S]*应切换全局 `<test>`/);
  assert.match(backend, /Requirement TC 或验收跨组件 BP 的场景归全局 `<test>`/);
  assert.match(readme, /`<test> <任务>` \| 实现并执行跨组件验收测试/);
});

test("separates runtime components and component documentation", () => {
  const system = readFileSync(path.join(WORKFLOW_ROOT, "stages/system.md"), "utf8");
  assert.match(system, /### 运行组件/);
  assert.match(system, /\| 组件名称 \| 容器镜像 Tag \| 说明 \|/);
  assert.match(system, /### 组件文档/);
  assert.match(system, /#### 开发技术文档/);
  assert.match(system, /\| 技术名称 \| 文档 \| 说明 \|/);
  assert.match(system, /#### 组件技术文档/);
  assert.match(system, /\| 组件名称 \| 文档 \| 说明 \|/);
  assert.match(system, /运行组件只使用“组件名称”“容器镜像 Tag”“说明”三列/);
  assert.match(system, /开发技术文档只使用“技术名称”“文档”“说明”三列/);
  assert.match(system, /组件技术文档只使用“组件名称”“文档”“说明”三列/);
  assert.match(system, /组件名称必须存在于“运行组件”表/);
  assert.match(system, /技术名称同时写明具体版本或 `<主版本>\.x`/);
  assert.match(system, /<repo>:<组件>-v<version>/);
  assert.match(system, /测试、生产及其他环境的运行组件必须全部容器化/);
  assert.match(system, /优先选择带管理界面的方案/);
  assert.match(system, /对应版本的官方文档/);
  assert.match(system, /不使用博客、搜索结果或非官方教程/);
});

test("separates context.md and system.md architecture", () => {
  const files = [
    "templates/AGENTS.template.md",
    "stages/component.md",
    "stages/component-dev.md",
    "stages/system.md",
    "stages/component-test.md",
  ];
  const content = files.map((file) => readFileSync(path.join(WORKFLOW_ROOT, file), "utf8")).join("\n");
  assert.doesNotMatch(content, /docs\/system\/(?:architecture|structure)\.md/);
  assert.match(content, /docs\/system\/context\.md/);
  assert.match(content, /docs\/system\/system\.md/);
  assert.match(content, /C4Context/);
  assert.doesNotMatch(content, /C4Container/);
  assert.match(content, /`system\.md` 容器图 \| `flowchart LR`；组件类型从左到右、类型内部从上到下/);
});

test("lays out context.md peers horizontally and levels vertically", () => {
  const system = readFileSync(path.join(WORKFLOW_ROOT, "stages/system.md"), "utf8");
  assert.match(system, /Rel_D\(customer, system,/);
  assert.match(system, /Rel_D\(operator, system,/);
  assert.match(system, /UpdateLayoutConfig\(\$c4ShapeInRow="2", \$c4BoundaryInRow="1"\)/);
  assert.match(system, /同一层级元素连续声明并水平排列/);
  assert.match(system, /自上而下排列/);
  assert.match(system, /不使用 Mermaid C4 尚未支持的 `Lay_D`、`Lay_R`/);
});

test("lists system.md components by type with development endpoints", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const system = readFileSync(path.join(WORKFLOW_ROOT, "stages/system.md"), "utf8");
  assert.doesNotMatch(system, /^## (?:概述|组件边界|依赖方向)$/m);
  assert.ok(system.lastIndexOf("## 容器图") < system.lastIndexOf("## 组件清单"));
  assert.match(system, /### 前端组件/);
  assert.match(system, /### 后端组件/);
  assert.ok((system.match(/^\| 组件名称 \| 暴露端口 \| 访问路径 \| 协议 \| 说明 \|$/gm) ?? []).length >= 3);
  assert.match(system, /\| `web` \| `3000` \| `\/` \| HTTP \| 职责：Web 前端；应用：`apps\/web\/`；设计：`docs\/component\/web\/` \|/);
  assert.match(system, /每个“暴露端口 \+ 访问路径 \+ 协议”组合单独占一行/);
  assert.match(system, /即使端口相同但访问路径不同也必须拆行/);
  assert.match(system, /每行重复组件名称和完整说明，不留空、不合并单元格，五列表格内不使用 `<br>`/);
  assert.match(system, /\| `openapi\.json` \| 跨组件同步 HTTP 契约 \| 存在同步 HTTP 调用 \|/);
  assert.match(system, /`docs\/system\/openapi\.json` 是版本库中跨组件同步 HTTP 契约唯一源文件/);
  assert.match(system, /`x-provider: <组件名称>` 指定一个已登记的提供方/);
  assert.match(system, /\| `api` \| `3001` \| `\/api\/v1` \| HTTPS\/JSON \|/);
  assert.match(system, /\| `api` \| `3001` \| `\/api\/v1\/doc` \| HTTPS \|/);
  assert.match(system, /\| `api` \| `3001` \| `\/api\/v1\/openapi\.json` \| HTTPS \|/);
  assert.match(system, /\| `worker` \| `不暴露` \| `不暴露` \| `不暴露` \| 职责：处理异步任务；应用：`apps\/worker\/`；设计：`docs\/component\/worker\/` \|/);
  assert.match(system, /## 容器图\r?\n\r?\n```mermaid\r?\nflowchart LR/);
  assert.match(system, /subgraph system\["系统"\]\r?\n\s+direction LR/);
  assert.match(system, /subgraph frontend_layer\["前端组件"\]\r?\n\s+direction TB/);
  assert.match(system, /subgraph backend_layer\["后端组件"\]\r?\n\s+direction TB/);
  assert.match(system, /subgraph infrastructure_layer\["基础设施组件"\]\r?\n\s+direction TB/);
  assert.match(system, /worker\["worker<br\/>Worker/);
  assert.ok(system.indexOf('web["web<br/>') < system.indexOf('api["api<br/>'));
  assert.ok(system.indexOf('api["api<br/>') < system.indexOf('redis[("redis<br/>'));
  assert.match(system, /api -->\|"提交任务<br\/>消息协议"\| worker/);
  assert.match(system, /frontend_layer -->\|"web → api<br\/>调用 · HTTPS\/JSON"\| backend_layer/);
  assert.match(system, /backend_layer -->\|"api → redis<br\/>读写 · Redis"\| infrastructure_layer/);
  assert.match(system, /backend_layer -->\|"api → openfga<br\/>鉴权 · HTTP\/gRPC"\| infrastructure_layer/);
  assert.match(system, /从左到右分层；不存在的层级直接省略/);
  assert.match(system, /每个组件类型内部使用 `direction TB`，使同类组件从上到下排列/);
  assert.match(system, /跨层关系连接层级 `subgraph`/);
  assert.match(system, /标签中明确写出“源组件 → 目标组件”、用途和协议/);
  assert.match(system, /### 基础设施组件/);
  assert.match(system, /\| `<基础设施名称>` \| `<项目确认的暴露端口>` \| `<官方文档确认的访问路径>` \| `<官方文档确认的协议>` \|/);
  assert.match(system, /用途：<实际用途>；账密：`<用户名变量>` `<密码变量>`/);
  assert.match(system, /`system\.md` 组件清单和除 `security\.md`“凭证”表之外的版本控制文件不得记录凭证值/);
  assert.match(system, /任何文件都不得记录测试、生产凭证、\s*官方默认凭据、令牌、证书或私钥/);
  assert.match(system, /所有组件分类统一使用规定的五列表格/);
  assert.match(system, /不使用记忆、镜像默认值、博客、搜索摘要或非官方教程作结论/);
  assert.match(system, /官方文档无法确认时停止并向用户说明缺少依据/);
  assert.match(system, /官方文档声明的默认或监听端口不等于项目实际暴露端口/);
  assert.match(system, /状态未知时先询问，不填猜测值/);
  assert.match(system, /对应版本官方文档/);
  assert.match(system, /`system\.md` 组件清单的“账密”只引用\s+`security\.md`“凭证”表中已登记的变量名/);
  assert.match(system, /测试和生产凭据必须由 `<deploy>` 通过独立环境配置或密钥系统注入/);
  assert.match(system, /`system\.md` 组件清单只记录开发环境端口、路径和协议/);
  assert.match(system, /测试、生产及其他环境由 `<deploy>` 维护/);
  assert.match(agents, /从该组件表格行“说明”列的固定字段“应用：`<路径>`；设计：`<路径>`”解析/);
});

test("defines single-purpose component documents and horizontal-first code diagrams", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  assert.match(component, /\| `component\.md` \| 组件入口文档 \| 始终 \| 非 Backend 维护文件关系、概述和文件树；Backend 维护文件关系、架构图、代码结构和文件树 \|/);
  assert.match(component, /\| `architecture\.md` \|[^|\r\n]+ \| 非 Frontend、非 Backend 模式 \|/);
  assert.match(component, /\| `structure\.md` \|[^|\r\n]+ \| 非 Frontend、非 Backend 且存在长期维护的代码结构 \|/);
  assert.match(component, /\| `domain\.md` \| 领域设计 \| 完整 DDD 模式 \|/);
  assert.match(component, /# <组件>\r?\n\r?\n## 文件关系[\s\S]*flowchart LR[\s\S]*## 概述[\s\S]*## 目录结构/);
  assert.match(component, /“文件关系”图只展示当前实际存在的文件和依赖方向/);
  assert.match(component, /`component\.md` 除文件关系、概述和完整应用文件结构外，不保存其他设计内容/);
  assert.match(component, /目录结构递归列出组件目录内所有应受版本控制的目录和文件/);
  assert.match(component, /不列出依赖目录、构建产物、缓存、日志、临时文件、密钥或其他运行时生成内容/);
  assert.match(component, /一个事实只由一个文件维护/);
  assert.match(component, /`architecture\.md` 使用 `C4Component`/);
  assert.match(component, /# 组件架构\r?\n\r?\n```mermaid\r?\nC4Component/);
  assert.match(component, /不绘制关系连线/);
  assert.doesNotMatch(component, /\b(?:BiRel|Rel(?:_[DULR])?)\(/);
  assert.match(component, /`architecture\.md` 只包含一级标题、标题下的一句文件职责说明和一个 `C4Component` Mermaid 代码块/);
  assert.match(component, /Container_Boundary\(caller_layout, "<展示或调用方>"\)/);
  assert.match(component, /Container_Boundary\(context_layout, "上下文"\)/);
  assert.match(component, /Container_Boundary\(infra_layout, "基础设施"\)/);
  assert.match(component, /UpdateLayoutConfig\(\$c4ShapeInRow="5", \$c4BoundaryInRow="1"\)/);
  assert.match(component, /组件信息、对象名称、技术版本、架构、框架和职责全部根据当前项目事实填写/);
  assert.match(component, /`structure\.md` 使用一个代码总览和按业务能力划分的详细章节/);
  assert.match(component, /所有图统一使用 `flowchart LR`/);
  assert.match(component, /# 代码结构\r?\n\r?\n## 总览\r?\n\r?\n```mermaid\r?\nflowchart LR/);
  assert.match(component, /## <业务能力>\r?\n\r?\n```mermaid\r?\nflowchart LR/);
  assert.match(component, /总览使用一个 `flowchart LR`，只展示模块、业务能力及主要依赖，不展示字段或函数/);
  assert.match(component, /每个详细章节只描述一个业务能力并使用一个 `flowchart LR`/);
  assert.match(component, /详细章节只展示理解设计所需的关键公开函数、参数和返回类型/);
  assert.match(component, /HTTP 请求、响应、错误和 Schema 由 `docs\/system\/openapi\.json` 维护/);
  assert.match(component, /subgraph interface_layer\["接口层"\]\r?\n\s+direction TB/);
  assert.match(component, /subgraph application_layer\["应用层"\]\r?\n\s+direction TB/);
  assert.match(component, /subgraph core_layer\["核心模型层"\]\r?\n\s+direction TB/);
  assert.match(component, /subgraph port_layer\["端口层"\]\r?\n\s+direction TB/);
  assert.match(component, /subgraph adapter_layer\["适配器层"\]\r?\n\s+direction TB/);
  assert.match(component, /前端可以使用页面、功能、状态和适配器/);
  assert.match(component, /任务处理器可以使用消费者、任务、规则和外部适配器/);
  assert.match(component, /`structure\.md` 和 Backend `component\.md` 中的节点按实际情况标注 `ApplicationService`、`AggregateRoot`/);
  assert.doesNotMatch(component, /```mermaid\r?\nclassDiagram/);
  assert.match(component, /完整 DDD 模式的 `domain\.md` 按限界上下文分章/);
  assert.match(component, /轻量 Backend 不创建 `domain\.md`/);
  assert.match(component, /Backend 不创建独立 `architecture\.md` 或 `structure\.md`/);
  assert.match(component, /`architecture\.md` 的异步部分只列出生产者、内嵌 Outbox Relay、消息基础设施和 Worker\/下游消费者，不绘制关系连线/);
  assert.match(agents, /\| `architecture\.md` 组件内部结构 \| `C4Component`；展示内部模块、职责和必要外部对象，不绘制关系连线 \|/);
  assert.match(agents, /\| `structure\.md` 或 Backend `component\.md` 代码结构 \| `flowchart`；先总览后按业务能力分章，主分层从左到右、分层内部从上到下 \|/);
});

test("groups business processes by role and delegates deployment flows", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const system = readFileSync(path.join(WORKFLOW_ROOT, "stages/system.md"), "utf8");
  assert.doesNotMatch(agents, /\| 构建流程 \| `flowchart` \|/);
  assert.match(agents, /\| 组件内部调用时序 \| `sequenceDiagram` \|/);
  assert.match(system, /# 跨组件流程\r?\n\r?\n## <角色>\r?\n\r?\n### BP-001/);
  assert.match(system, /### BP-001\r?\n\r?\n> Desc: <流程简述>\r?\n> Ref: REQ-001-FR-003、<其他需求编号>\r?\n\r?\n```mermaid\r?\nsequenceDiagram/);
  assert.doesNotMatch(system, /#### BP-/);
  assert.match(system, /每个流程正文只保留 `Desc`、`Ref` 和时序图/);
  assert.match(system, /多个编号使用顿号分隔/);
  assert.match(system, /默认只画主成功路径/);
  assert.match(system, /同一组件内部的连续步骤合并，不展示方法、类、内部模块、协议细节或普通技术异常/);
  assert.match(system, /只有失败会改变跨组件协作、触发补偿或产生独立业务结果时才使用 `alt`/);
  assert.match(system, /BP 编号在整个 `process\.md`[\s\S]*中唯一且保持稳定/);
  assert.match(system, /阈值、计算、领域不变量和判断条件\s+仍以需求项为准/);
  assert.doesNotMatch(system, /## 构建流程/);
  assert.match(system, /构建、CI\/CD、发布、部署和回滚流程不写入 `process\.md`，统一由 `<deploy>` 阶段设计和维护/);
});

test("installs AGENTS.md idempotently without changing host rules", () => {
  const root = mkdtempSync(path.join(tmpdir(), "workflows-install-"));
  const workflowRoot = path.join(root, "docs", "workflows");
  try {
    mkdirSync(path.join(workflowRoot, "templates"), { recursive: true });
    writeFileSync(path.join(workflowRoot, "templates", "AGENTS.template.md"), "# Workflow\n", "utf8");
    writeFileSync(path.join(root, "AGENTS.md"), "# Host rules\n", "utf8");

    const revision = "d".repeat(40);
    assert.equal(installAgents({ projectRoot: root, workflowRoot, revision }), "updated");
    const installed = readFileSync(path.join(root, "AGENTS.md"), "utf8");
    assert.match(installed, /^# Host rules/);
    assert.match(installed, new RegExp(`<!-- workflows-revision: ${revision} -->`));
    assert.match(installed, /# Workflow/);
    assert.equal(installAgents({ projectRoot: root, workflowRoot, revision }), "unchanged");
    assert.equal(readFileSync(path.join(root, "AGENTS.md"), "utf8"), installed);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(WORKFLOW_ROOT, "validate.mjs")) {
  try {
    const errors = runValidation(process.argv.slice(2));
    if (errors.length) {
      process.stderr.write(`${errors.join("\n")}\n`);
      process.exitCode = 1;
    } else {
      process.stdout.write("工作流规则与自动化测试开始验证。\n");
    }
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
