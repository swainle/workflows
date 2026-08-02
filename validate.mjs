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
  updateCurrentBranch,
  validateStageReferences,
} from "./install.mjs";
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

export function runValidation(args, root = WORKFLOW_ROOT) {
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


test("describes prompt capabilities with numbered five-point definitions", () => {
  const expected = new Map([
    ["templates/AGENTS.template.md", { prefix: "AI", count: 12 }],
    ["stages/requirement.md", { prefix: "AI-REQUIREMENT", count: 9 }],
    ["stages/system.md", { prefix: "AI-SYSTEM", count: 14 }],
    ["stages/component.md", { prefix: "AI-COMPONENT", count: 14 }],
    ["stages/development.md", { prefix: "AI-DEV", count: 9 }],
    ["stages/testing.md", { prefix: "AI-TEST", count: 8 }],
    ["stages/acceptance.md", { prefix: "AI-ACCEPTANCE", count: 9 }],
    ["stages/deploy.md", { prefix: "AI-DEPLOY", count: 10 }],
    ["templates/backend-design.template.md", { prefix: "AI-BACKEND", count: 22 }],
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

test("automatically validates prompt structure and complete component trees", () => {
  assert.deepEqual(
    validatePromptFile(path.join(WORKFLOW_ROOT, "stages/testing.md"), "AI-TEST"),
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

test("requires local adaptation declarations for backend mode examples", () => {
  const backend = readFileSync(path.join(WORKFLOW_ROOT, "templates/backend-design.template.md"), "utf8");
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  assert.match(backend, /每个具体范例都必须就近包含单行提示 `> - 范例适配声明：<具体调整范围>`/);
  assert.ok((backend.match(/^> - 范例适配声明：/gm) ?? []).length >= 17);
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
  assert.match(agents, /## AI-011/);
  assert.match(agents, /\*\*What\*\*：提供“命中规则回显”功能/);
  assert.match(agents, /任何实质操作开始前/);
  assert.match(agents, /命中规则：AI-001、AI-005、AI-006、AI-007、AI-011、AI-TEST-001、AI-TEST-002/);
  assert.match(agents, /只把 `When` 在当前时点为真的规则视为命中/);
  assert.match(agents, /根提示词、阶段提示词、模式提示词的顺序排列/);
  assert.match(agents, /未命中本工作流的普通自然语言任务不强制回显/);
});

test("parses the optional selected branch", () => {
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");
  assert.match(readme, /git submodule add -b develop <repository-url> docs\/workflows/);
  assert.equal(parseBranch([]), undefined);
  assert.equal(parseBranch(["--branch", "develop"]), "develop");
  assert.equal(parseBranch(["--workflows-updated", "--branch", "develop"]), "develop");
  assert.throws(() => parseBranch(["--branch"]));
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
  const created = mergeAgents("", "# Workflow\n");
  assert.match(created, /^<!-- workflows:begin -->/);
  assert.match(created, /# Workflow/);

  const appended = mergeAgents("# Host rules\n", "# Workflow\n");
  assert.match(appended, /^# Host rules[\s\S]*<!-- workflows:begin -->/);

  const updated = mergeAgents(appended, "# Workflow v2\n");
  assert.match(updated, /^# Host rules/);
  assert.match(updated, /# Workflow v2/);
  assert.doesNotMatch(updated, /# Workflow\n/);
  assert.equal(mergeAgents(updated, "# Workflow v2\n"), updated);
});

test("ignores marker examples inside managed content", () => {
  const template = [
    "# Workflow",
    "",
    "The installer uses `<!-- workflows:begin -->` and `<!-- workflows:end -->` markers.",
    "",
  ].join("\n");
  const installed = mergeAgents("", template);
  assert.equal(mergeAgents(installed, template), installed);
  assert.match(mergeAgents(installed, `${template}Updated.\n`), /Updated\./);
});

test("rejects damaged or duplicated managed markers", () => {
  assert.throws(() => mergeAgents("<!-- workflows:begin -->\n", "# Workflow\n"), /invalid workflows markers/);
  assert.throws(() => mergeAgents("<!-- workflows:end -->\n", "# Workflow\n"), /invalid workflows markers/);
  assert.throws(() => mergeAgents(
    "<!-- workflows:begin -->\n<!-- workflows:end -->\n<!-- workflows:begin -->\n<!-- workflows:end -->\n",
    "# Workflow\n",
  ), /invalid workflows markers/);
  assert.throws(() => mergeAgents("<!-- workflows:end -->\n<!-- workflows:begin -->\n", "# Workflow\n"), /marker order/);
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
  assert.match(template, /\| `<test>` \| `docs\/workflows\/stages\/acceptance\.md` \|/);
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
  const development = readFileSync(path.join(WORKFLOW_ROOT, "stages/development.md"), "utf8");
  const testing = readFileSync(path.join(WORKFLOW_ROOT, "stages/testing.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");

  assert.match(agents, /\*\*What\*\*：提供“语言规则”功能/);
  assert.match(agents, /对话回复、正式文档、测试用例描述和必要的代码注释默认使用中文/);
  assert.match(agents, /类名、函数名、变量名、文件名、包名、环境变量、HTTP 字段、数据库字段和协议名称/);
  assert.match(agents, /中文注释说明设计原因、业务约束和风险，不逐行翻译代码/);

  assert.match(development, /\*\*What\*\*：提供“代码与注释规则”功能/);
  assert.match(development, /领域不变量、事务边界、锁、并发、幂等、安全边界/);
  assert.match(development, /注释说明“为什么这样设计”和“不能违反什么”/);
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
  const development = readFileSync(path.join(WORKFLOW_ROOT, "stages/development.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");

  assert.match(development, /\*\*What\*\*：提供“开发前确认”功能/);
  assert.match(development, /先读取 `component\.md` 的概述、设计架构索引和完整文件结构/);
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

  const development = readFileSync(path.join(WORKFLOW_ROOT, "stages/development.md"), "utf8");
  for (const pattern of ["docs/requirements/\\*\\*", "docs/system/\\*\\*", "<组件设计目录>/\\*\\*"]) {
    assert.match(development, new RegExp(`\\| \`${pattern}\` \\| 禁止 \\| 允许 \\| 禁止 \\| 禁止 \\|`));
  }
  assert.match(development, /\| `<组件应用目录>\/\*\*` \| 允许 \| 允许 \| 允许 \| 允许 \|/);
  for (const pattern of ["test/\\*\\*", "Dockerfile", "deploy/\\*\\*"]) {
    assert.match(development, new RegExp(`\\| \`<组件应用目录>/${pattern}\` \\| 禁止 \\| 禁止 \\| 禁止 \\| 禁止 \\|`));
  }

  const testing = readFileSync(path.join(WORKFLOW_ROOT, "stages/testing.md"), "utf8");
  for (const pattern of ["docs/requirements/\\*\\*", "docs/system/\\*\\*", "<组件设计目录>/\\*\\*", "<组件应用目录>/\\*\\*"]) {
    assert.match(testing, new RegExp(`\\| \`${pattern}\` \\| 禁止 \\| 允许 \\| 禁止 \\| 禁止 \\|`));
  }
  assert.match(testing, /\| `<组件应用目录>\/test\/\*\*` \| 允许 \| 允许 \| 允许 \| 允许 \|/);
  assert.match(testing, /\| `<组件应用目录>\/deploy\/\*\*` \| 禁止 \| 禁止 \| 禁止 \| 禁止 \|/);

  const acceptance = readFileSync(path.join(WORKFLOW_ROOT, "stages/acceptance.md"), "utf8");
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
  assert.match(component, /目标文件本身/);
  assert.match(component, /位于目标之前、且当前实际存在的设计文件/);
  assert.match(component, /同级文件不互为前置依赖/);
  assert.match(component, /不得读取目标之后的设计文件/);
  assert.match(component, /不得读取组件源码、测试、验收或部署文件/);
  assert.match(component, /\| `<目标之前的设计依赖文件>` \| 禁止 \| 允许 \| 禁止 \| 禁止 \|/);
  assert.match(component, /\| `<目标文件>` \| 禁止 \| 允许 \| 允许 \| 禁止 \|/);
  assert.match(component, /不创建、删除、移动、重命名或顺手修改模板、前置文件及关联文件/);
  assert.match(readme, /\| `<api> opt component\.md <意见>` \|/);
  assert.match(readme, /\| `<api> backend opt <文件> <意见>` \|/);
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
  assert.match(agents, /组件名必须精确匹配 `docs\/system\/c2\.md` 组件清单/);
  assert.match(deploy, /\| `deploy\/init\/\*\*` \| 开发基础设施初始化 \|/);
  assert.match(deploy, /`<组件 deploy>` 只新增或更新该组件的 `### <组件>`/);
  assert.match(deploy, /Compose 使用默认的\s+`\.env` 和 `compose\.yml`/);
  assert.match(deploy, /JavaScript 和 TypeScript 组件默认使用 `pnpm`/);
  assert.match(deploy, /名称优先为 `<基础设施>-init`/);
  assert.match(deploy, /使用 `restart: "no"`/);
  assert.match(deploy, /不执行其中的启动或初始化命令/);
  assert.match(readme, /`<api deploy> <任务>` \| 维护目标组件的开发基础设施配置/);
});

test("resolves nested deploy paths from the C2 component registry", () => {
  const deploy = readFileSync(path.join(WORKFLOW_ROOT, "stages/deploy.md"), "utf8");
  assert.match(deploy, /`<组件应用目录>\/Dockerfile`/);
  assert.match(deploy, /`<组件应用目录>\/deploy\/\*\*`/);
  assert.match(deploy, /必须从 `docs\/system\/c2\.md` 的目标组件记录解析并规范化/);
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
  const development = readFileSync(path.join(WORKFLOW_ROOT, "stages/development.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");

  assert.match(agents, /<组件> frontend <前端设计任务>/);
  assert.match(agents, /<组件> backend <后端设计任务>/);
  assert.match(agents, /`frontend` 和 `backend` 只能作为 `<组件>` 指令头后的第一个任务词/);
  assert.match(agents, /不得写入指令头，也不适用于 `dev`、`test` 或 `deploy` 任务/);
  assert.doesNotMatch(agents, /<组件> ddd <DDD设计任务>/);
  assert.match(component, /\*\*What\*\*：提供“完整组件设计模式”功能/);
  assert.match(component, /### Frontend 模式/);
  assert.match(component, /### Backend 模式/);
  assert.match(component, /按可验证复杂度条件选择轻量 Backend 或完整 DDD/);
  assert.match(component, /完整读取\s+`docs\/workflows\/templates\/backend-design\.template\.md`/);
  assert.match(component, /复杂度判断 → 完整 DDD 时先完成 DDD（每个限界上下文包含状态图与关键时序图）→ 同级产出 C3 与接口 → 边界 → 机器可读模型 → C4/);
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
  assert.match(backend, /\*\*What\*\*：提供“文件关系与设计顺序”功能/);
  assert.match(backend, /ddd --> c3/);
  assert.match(backend, /ddd --> interface/);
  assert.doesNotMatch(backend, /c3 --> ddd/);
  assert.match(backend, /同级创建或更新 `c3\.md` 和 `interface\.md`/);
  assert.match(backend, /不互相作为设计前置/);
  assert.match(backend, /\*\*What\*\*：提供“`c3\.md`”功能[\s\S]*```mermaid\r?\nC4Component/);
  assert.match(backend, /flowchart LR/);
  assert.match(backend, /\*\*What\*\*：提供“执行流程”功能/);
  assert.match(backend, /不得从框架、数据库表或现有源码反推业务模型/);
  assert.match(backend, /\*\*What\*\*：提供“`ddd\.md`”功能[\s\S]*## <限界上下文名称>[\s\S]*### 边界[\s\S]*### 统一语言/);
  assert.match(backend, /### 领域结构[\s\S]*```mermaid\r?\nflowchart LR[\s\S]*subgraph application\["应用层"\][\s\S]*direction TB/);
  assert.match(backend, /«Application Service»/);
  assert.match(backend, /subgraph domain\["领域层"\][\s\S]*«Aggregate Root»[\s\S]*«Entity»[\s\S]*«Value Object»[\s\S]*«Domain Service»/);
  assert.match(backend, /subgraph boundary\["领域端口与事件"\][\s\S]*«Repository»[\s\S]*«Domain Event»/);
  assert.match(backend, /领域结构图使用 `flowchart LR` 模拟类图，不使用 `classDiagram`/);
  assert.match(backend, /### 状态图[\s\S]*```mermaid\r?\nstateDiagram-v2/);
  assert.match(backend, /### 关键时序[\s\S]*```mermaid\r?\nsequenceDiagram/);
  assert.match(backend, /\| 领域事件 \| 产生聚合 \| 触发条件 \| 消费方 \| 业务含义 \|/);
  assert.doesNotMatch(backend, /## 一致性与补偿/);
  assert.doesNotMatch(backend, /## 聚合规则/);
  assert.match(component, /一个组件默认对应一个限界上下文/);
  assert.match(component, /完整 DDD 模式的每个限界上下文必须完整包含边界、统一语言、领域结构图、状态图、关键时序图和领域事件列表/);
  assert.match(backend, /仅当以下条件全部成立时使用轻量 Backend/);
  assert.match(backend, /上述任一复杂度信号存在时使用完整 DDD/);
  assert.match(backend, /`ddd\.md` 仅在完整 DDD 模式创建/);
  assert.match(component, /不创建独立的 `state\.md` 或\s+`sequence\.md`/);
  assert.doesNotMatch(backend, /## `process\.md`/);
  assert.match(backend, /system_process\["docs\/system\/process\.md<br\/>跨组件业务流程"\]/);
  assert.match(backend, /system_process -\.->\|"引用，不复制"\| ddd/);
  assert.doesNotMatch(backend, /## `state\.md`/);
  assert.doesNotMatch(backend, /## `sequence\.md`/);
  assert.match(backend, /`interface\.md` 对应 `openapi\.json` 或 `asyncapi\.json`/);
  assert.match(backend, /`authorization\.md` 对应 `authorization\.fga`/);
  assert.match(backend, /`data-access\.md` 对应 `schema\.dbml`/);
  for (const file of [
    "c3.md",
    "ddd.md",
    "interface.md",
    "authentication.md",
    "authorization.md",
    "validation.md",
    "errors.md",
    "data-access.md",
    "c4.md",
    "coding.md",
    "configuration.md",
    "secrets.md",
    "observability.md",
    "testing.md",
    "runtime.md",
    "deployment.md",
    "component.md",
  ]) {
    assert.ok(backend.includes(`**What**：提供“\`${file}\`”功能`), `missing Backend template for ${file}`);
  }
  assert.match(backend, /`component\.md`、`c3\.md`、`coding\.md` 和 `testing\.md` 始终创建/);
  assert.match(backend, /c4 --> coding/);
  assert.match(backend, /coding --> testing/);
  assert.match(backend, /# 编码规范[\s\S]*## 架构映射[\s\S]*## 目录约定[\s\S]*## 文件命名[\s\S]*## 编码规范[\s\S]*## 依赖方向[\s\S]*## 例外/);
  assert.match(backend, /精确且完整的文件树仍只由 `component\.md` 维护/);
  assert.match(component, /\| `coding\.md` \| 后端编码规范 \| 始终 \|/);
  assert.match(development, /任何生产代码任务都必须读取索引中的 `coding\.md`/);
  for (const file of ["openapi.json", "asyncapi.json", "authorization.fga", "schema.dbml"]) {
    assert.ok(backend.includes(`### \`${file}\``), `missing Backend model template for ${file}`);
  }
  assert.match(readme, /`<web> frontend <任务>`/);
  assert.match(readme, /`<api> backend <任务>`/);
  assert.match(readme, /`templates\/backend-design\.template\.md`/);
});

test("defines bounded-context backend runtimes and conditional TypeScript conventions", () => {
  const backend = readFileSync(path.join(WORKFLOW_ROOT, "templates/backend-design.template.md"), "utf8");
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  const readme = readFileSync(path.join(WORKFLOW_ROOT, "README.md"), "utf8");

  assert.match(component, /一个逻辑 Backend 组件可以按实际需要提供 HTTP\/API、Outbox Relay 和消息 Worker 等多个独立运行入口/);
  assert.match(component, /进程不是工作流组件的划分单位/);
  assert.match(component, /跨上下文通过稳定的应用接口或 Port 协作，不导入对方的领域对象/);
  assert.match(component, /Backend C3 按限界上下文、入口、独立运行单元和实际公共技术能力展示稳定模块/);
  assert.match(component, /上下文内部的分层及应用服务与领域模型的对应关系放入 `ddd\.md` 和 `c4\.md`/);

  assert.match(backend, /\*\*What\*\*：提供“架构、代码与运行约定”功能/);
  assert.match(backend, /Container_Boundary\(web_layout, "前端展示"\)[\s\S]*Container_Boundary\(context_layout, "上下文"\)[\s\S]*Container_Boundary\(infra_layout, "基础设施"\)/);
  assert.match(backend, /UpdateLayoutConfig\(\$c4ShapeInRow="5", \$c4BoundaryInRow="1"\)/);
  assert.match(backend, /组件信息、对象、技术版本、架构、框架和职责必须根据实际情况调整/);
  assert.match(backend, /C3 不展开应用层、领域层、Port 或 Adapter/);
  assert.match(backend, /下图仅演示 `C4Component` 的写法和抽象层级/);
  assert.match(backend, /都必须按当前组件的真实上下文、运行单元和依赖替换或删除/);
  assert.match(backend, /Writer 是生产者事务内的代码，不是独立进程/);
  assert.match(backend, /Relay 只读取已提交记录、投递并更新投递状态，不虚构领域层或 Command Bus/);
  assert.match(backend, /原子领取或租约、至少一次投递、退避重试、终止失败/);
  assert.match(backend, /在同一事务持久化业务数据与 Outbox、提交事务、Relay 投递、Worker 幂等消费/);
  assert.match(backend, /Redis 是基础设施中间件，BullMQ 是运行在 Redis 之上的消息任务库/);
  assert.match(backend, /以下约定只在实际技术栈包含对应工具时启用/);
  assert.match(backend, /<subject>\.<technology>\.<role>\.ts/);
  assert.match(backend, /<event>\.event\.ts/);
  assert.match(backend, /prisma\/migrations\/<timestamp_name>\/migration\.sql/);
  assert.match(backend, /node dist\/processes\/outbox\.js/);
  assert.match(backend, /\.processor\.ts` 是消息入口 Adapter/);
  assert.match(backend, /\.result\.ts` 只表示需要稳定复用的应用用例输出/);
  assert.match(backend, /\.port\.ts` 只表示应用层拥有的外部或跨上下文依赖抽象/);
  assert.match(backend, /对象主键默认使用原生 UUIDv4/);
  assert.match(backend, /UUIDv7 仍是 UUID，不作为短展示码/);
  assert.match(backend, /APT-7K3M9Q2D/);
  assert.match(backend, /唯一约束、碰撞重试/);
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
  assert.match(system, /C2 只引用变量名[\s\S]*不得猜测值，不登记测试、生产凭证/);
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
  assert.match(component, /组件 `observability\.md` 不重新定义全局字段、命名、保留策略、告警级别或系统级 SLO/);
  assert.match(deploy, /\*\*What\*\*：提供“安全与可观测性边界”功能/);
  assert.match(deploy, /部署阶段维护密钥注入、证书挂载、环境值、安全中间件配置、Collector、Exporter/);
  assert.match(deploy, /不得在部署文件中补写设计规则/);
});

test("plans the component test structure before implementing tests", () => {
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  const testing = readFileSync(path.join(WORKFLOW_ROOT, "stages/testing.md"), "utf8");
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
  assert.match(backend, /## Fixture 与测试支持[\s\S]*## 单元测试[\s\S]*## 集成测试[\s\S]*## 契约测试[\s\S]*## 并发测试[\s\S]*## 端到端测试[\s\S]*## 测试配置[\s\S]*## 测试命令/);
  assert.match(backend, /## 单元测试[\s\S]*### BOOKING-DOM-APPOINTMENT-001[\s\S]*### AUTH-APP-LOGIN-001[\s\S]*### SHARED-INF-CONFIGURATION-001/);
  assert.match(backend, /> Design：`ddd\.md#预约#状态图#Appointment`\r?\n> Src：`test\/unit\/domain\/appointment\.test\.ts`\r?\n> BR：`REQ-001-BR-002`\r?\n> AC：`REQ-001-AC-008`/);
  assert.doesNotMatch(backend, /> Req：/);
  assert.match(backend, /Desc：取消待就诊预约\r?\nGiven：预约处于 `pending`。\r?\nWhen：调用 `cancel\(\)`。\r?\nThen：预约状态变为 `cancelled`/);
  assert.match(backend, /四个字段连续书写，彼此之间不留空行/);
  assert.match(backend, /### AUTH-APP-LOGIN-001[\s\S]*### SHARED-INF-CONFIGURATION-001/);
  assert.match(backend, /### AUTH-INT-SESSION-001[\s\S]*### AUTH-INT-ADAPTER-001[\s\S]*### AUTH-API-LOGIN-001/);
  assert.match(backend, /### AUTH-CON-EVENT-001[\s\S]*### AUTH-CONC-TOKEN-001[\s\S]*### AUTH-E2E-LOGIN-001/);
  assert.match(backend, /\| Infrastructure 纯逻辑测试 \| `INF` \| 纯逻辑技术能力 \|/);
  assert.match(backend, /消息发布或消费行为由集成测试验证/);
  assert.match(backend, /组件 E2E 不得声称验证\s*整个跨组件 BP/);
  assert.doesNotMatch(backend, /跨组件可观察的最终结果|核心跨组件业务链路/);
  assert.match(backend, /> Src：`test\/integration\/api\/http\/login\.test\.ts`/);
  assert.match(backend, /`component\.md` 的完整文件树必须逐个包含所有\s*`Src`/);
  assert.match(backend, /`testing\.md` 只索引项目真实存在的命令/);
  assert.match(backend, /测试报告和覆盖率报告按需由用户手动导出/);
  assert.match(readme, /`<web test> <任务>` \| 编写并执行目标组件测试/);
  assert.match(readme, /详细规则以模板和对应阶段提示词为准/);
});

test("separates global acceptance from component tests", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const acceptance = readFileSync(path.join(WORKFLOW_ROOT, "stages/acceptance.md"), "utf8");
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  const testing = readFileSync(path.join(WORKFLOW_ROOT, "stages/testing.md"), "utf8");
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

test("separates runtime and development technology selections", () => {
  const system = readFileSync(path.join(WORKFLOW_ROOT, "stages/system.md"), "utf8");
  assert.match(system, /### 运行组件/);
  assert.match(system, /\| 组件名称 \| 容器镜像 Tag \| 说明 \|/);
  assert.match(system, /### 开发组件/);
  assert.match(system, /\| 技术名称 \| 文档 \| 说明 \|/);
  assert.match(system, /运行组件只使用“组件名称”“容器镜像 Tag”“说明”三列/);
  assert.match(system, /开发组件只使用“技术名称”“文档”“说明”三列/);
  assert.match(system, /技术名称同时写明具体版本或 `<主版本>\.x`/);
  assert.match(system, /<repo>:<组件>-v<version>/);
  assert.match(system, /测试、生产及其他环境的运行组件必须全部容器化/);
  assert.match(system, /优先选择带管理界面的方案/);
  assert.match(system, /对应版本的官方文档/);
  assert.match(system, /不使用博客、搜索结果或非官方教程/);
});

test("separates C1 context and C2 container architecture", () => {
  const files = [
    "templates/AGENTS.template.md",
    "stages/component.md",
    "stages/development.md",
    "stages/system.md",
    "stages/testing.md",
  ];
  const content = files.map((file) => readFileSync(path.join(WORKFLOW_ROOT, file), "utf8")).join("\n");
  assert.doesNotMatch(content, /docs\/system\/(?:architecture|c4)\.md|`architecture\.md`/);
  assert.match(content, /docs\/system\/c1\.md/);
  assert.match(content, /docs\/system\/c2\.md/);
  assert.match(content, /C4Context/);
  assert.doesNotMatch(content, /C4Container/);
  assert.match(content, /系统容器 \| `flowchart LR`；组件类型从左到右、类型内部从上到下/);
});

test("lays out C1 peers horizontally and levels vertically", () => {
  const system = readFileSync(path.join(WORKFLOW_ROOT, "stages/system.md"), "utf8");
  assert.match(system, /Rel_D\(customer, system,/);
  assert.match(system, /Rel_D\(operator, system,/);
  assert.match(system, /UpdateLayoutConfig\(\$c4ShapeInRow="2", \$c4BoundaryInRow="1"\)/);
  assert.match(system, /同一层级元素连续声明并水平排列/);
  assert.match(system, /自上而下排列/);
  assert.match(system, /不使用 Mermaid C4 尚未支持的 `Lay_D`、`Lay_R`/);
});

test("lists C2 components by type with development endpoints", () => {
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
  assert.match(system, /C2 和除 `security\.md`“凭证”表之外的版本控制文件不得记录凭证值/);
  assert.match(system, /任何文件都不得记录测试、生产凭证、\s*官方默认凭据、令牌、证书或私钥/);
  assert.match(system, /所有组件分类统一使用规定的五列表格/);
  assert.match(system, /不使用记忆、镜像默认值、博客、搜索摘要或非官方教程作结论/);
  assert.match(system, /官方文档无法确认时停止并向用户说明缺少依据/);
  assert.match(system, /官方文档声明的默认或监听端口不等于项目实际暴露端口/);
  assert.match(system, /状态未知时先询问，不填猜测值/);
  assert.match(system, /对应版本官方文档/);
  assert.match(system, /C2 的“账密”只引用\s+`security\.md`“凭证”表中已登记的变量名/);
  assert.match(system, /测试和生产凭据必须由 `<deploy>` 通过独立环境配置或密钥系统注入/);
  assert.match(system, /C2 只记录开发环境端口、路径和协议/);
  assert.match(system, /测试、生产及其他环境由 `<deploy>` 维护/);
  assert.match(agents, /从该组件表格行“说明”列的固定字段“应用：`<路径>`；设计：`<路径>`”解析/);
});

test("defines single-purpose component documents and horizontal-first code diagrams", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const component = readFileSync(path.join(WORKFLOW_ROOT, "stages/component.md"), "utf8");
  assert.match(component, /\| `component\.md` \| 组件入口文档 \| 始终 \| 概述、设计架构文件索引和完整受版本控制文件结构 \|/);
  assert.match(component, /\| `c3\.md` \|[^|\r\n]+ \| 始终 \|/);
  assert.match(component, /\| `c4\.md` \|[^|\r\n]+ \| 存在需要长期维护的代码结构 \|/);
  assert.match(component, /\| `ddd\.md` \| 领域设计 \| 完整 DDD 模式 \|/);
  assert.match(component, /# <组件>\r?\n\r?\n## 概述[\s\S]*## 设计架构[\s\S]*\| 文件 \| 作用 \|[\s\S]*## 目录结构/);
  assert.match(component, /“设计架构”表格逐个列出当前组件设计目录内实际存在的全部文件及其唯一作用/);
  assert.match(component, /`component\.md` 除概述、设计架构索引和完整应用文件结构外，不保存其他设计内容/);
  assert.match(component, /目录结构递归列出组件目录内所有应受版本控制的目录和文件/);
  assert.match(component, /不列出依赖目录、构建产物、缓存、日志、临时文件、密钥或其他运行时生成内容/);
  assert.match(component, /一个事实只由一个文件维护/);
  assert.match(component, /`c3\.md` 使用 `C4Component`/);
  assert.match(component, /# C3 组件图\r?\n\r?\n```mermaid\r?\nC4Component/);
  assert.match(component, /`c3\.md` 只包含一级标题和一个 `C4Component` Mermaid 代码块/);
  assert.match(component, /Container_Boundary\(caller_layout, "<展示或调用方>"\)/);
  assert.match(component, /Container_Boundary\(context_layout, "上下文"\)/);
  assert.match(component, /Container_Boundary\(infra_layout, "基础设施"\)/);
  assert.match(component, /UpdateLayoutConfig\(\$c4ShapeInRow="5", \$c4BoundaryInRow="1"\)/);
  assert.match(component, /组件信息、对象名称、技术版本、架构、框架和职责全部根据当前项目事实填写/);
  assert.match(component, /`c4\.md` 使用一个代码总览和按业务能力划分的详细章节/);
  assert.match(component, /所有图统一使用 `flowchart LR`/);
  assert.match(component, /# C4 代码图\r?\n\r?\n## 总览\r?\n\r?\n```mermaid\r?\nflowchart LR/);
  assert.match(component, /## <业务能力>\r?\n\r?\n```mermaid\r?\nflowchart LR/);
  assert.match(component, /总览使用一个 `flowchart LR`，只展示模块、业务能力及主要依赖，不展示字段或函数/);
  assert.match(component, /每个详细章节只描述一个业务能力并使用一个 `flowchart LR`/);
  assert.match(component, /详细章节只展示理解设计所需的关键公开函数、参数和返回类型/);
  assert.match(component, /HTTP 请求、响应、错误和 Schema 由 `openapi\.json` 维护/);
  assert.match(component, /subgraph interface_layer\["接口层"\]\r?\n\s+direction TB/);
  assert.match(component, /subgraph application_layer\["应用层"\]\r?\n\s+direction TB/);
  assert.match(component, /subgraph core_layer\["核心模型层"\]\r?\n\s+direction TB/);
  assert.match(component, /subgraph port_layer\["端口层"\]\r?\n\s+direction TB/);
  assert.match(component, /subgraph adapter_layer\["适配器层"\]\r?\n\s+direction TB/);
  assert.match(component, /前端可以使用页面、功能、状态和适配器/);
  assert.match(component, /任务处理器可以使用消费者、任务、规则和外部适配器/);
  assert.match(component, /C4 节点按实际情况标注 `ApplicationService`、`AggregateRoot`/);
  assert.doesNotMatch(component, /```mermaid\r?\nclassDiagram/);
  assert.match(component, /完整 DDD 模式的 `ddd\.md` 按限界上下文分章/);
  assert.match(component, /轻量 Backend 不创建 `ddd\.md`/);
  assert.match(component, /Backend C3 按限界上下文、入口、独立运行单元和实际公共技术能力展示稳定模块/);
  assert.match(component, /异步链路明确展示生产者、Outbox Relay、消息基础设施和 Worker\/下游消费者之间的关系/);
  assert.match(agents, /\| 组件内部结构 \| `C4Component`；展示内部模块、职责、依赖和必要外部关系 \|/);
  assert.match(agents, /\| 组件代码结构 \| `flowchart`；先总览后按业务能力分章，主分层从左到右、分层内部从上到下 \|/);
});

test("groups business processes by role and uses flowcharts for builds", () => {
  const agents = readFileSync(path.join(WORKFLOW_ROOT, "templates/AGENTS.template.md"), "utf8");
  const system = readFileSync(path.join(WORKFLOW_ROOT, "stages/system.md"), "utf8");
  assert.match(agents, /\| 构建流程 \| `flowchart` \|/);
  assert.match(agents, /\| 组件内部调用时序 \| `sequenceDiagram` \|/);
  assert.match(system, /### <用户角色>/);
  assert.match(system, /### 通用/);
  assert.match(system, /### 系统/);
  assert.match(system, /#### BP-001 <跨组件业务流程>/);
  assert.match(system, /#### BP-001 <跨组件业务流程>\r?\n\r?\n- 关联需求：<FR、BR、AC 或 PERM 编号>\r?\n\r?\n```mermaid\r?\nsequenceDiagram/);
  assert.match(system, /关联需求：<FR、BR、AC 或 PERM 编号>/);
  assert.match(system, /正文只保留“关联需求”和时序图/);
  assert.match(system, /默认只画主成功路径/);
  assert.match(system, /同一组件内部的连续步骤合并，不展示方法、类、内部模块、协议细节或普通技术异常/);
  assert.match(system, /只有失败会改变跨组件协作、触发补偿或产生独立业务结果时才使用 `alt`/);
  assert.match(system, /BP 编号在整个 `process\.md`[\s\S]*中唯一且保持稳定/);
  assert.match(system, /阈值、计算、领域不变量和判断条件\s+仍以需求项为准/);
  assert.match(system, /构建流程使用 `flowchart`/);
});

test("installs AGENTS.md idempotently without changing host rules", () => {
  const root = mkdtempSync(path.join(tmpdir(), "workflows-install-"));
  const workflowRoot = path.join(root, "docs", "workflows");
  try {
    mkdirSync(path.join(workflowRoot, "templates"), { recursive: true });
    writeFileSync(path.join(workflowRoot, "templates", "AGENTS.template.md"), "# Workflow\n", "utf8");
    writeFileSync(path.join(root, "AGENTS.md"), "# Host rules\n", "utf8");

    assert.equal(installAgents({ projectRoot: root, workflowRoot }), "updated");
    const installed = readFileSync(path.join(root, "AGENTS.md"), "utf8");
    assert.match(installed, /^# Host rules/);
    assert.match(installed, /# Workflow/);
    assert.equal(installAgents({ projectRoot: root, workflowRoot }), "unchanged");
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
