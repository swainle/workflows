#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import {
  WORKFLOW_ROOT,
  installAgents,
  mergeAgents,
  parseBranch,
  validateStageReferences,
} from "./install.mjs";

export const PROMPT_FILES = [
  "templates/AGENTS.template.md",
  "templates/require.template.md",
  "templates/require/requirements.md",
  "templates/require/architecture.md",
  "templates/frontend-design.template.md",
  "templates/frontend-draft.template.md",
  "templates/backend-design.template.md",
  "templates/docker-design.template.md",
  "stages/doc.md",
  "stages/dev.md",
  "stages/component-test.md",
  "stages/test.md",
  "stages/docker.md",
];

const APP_MAPPING = /^应用目录：`([^`]+\/)`\s*$/gm;
const DEVELOPMENT_TEMPLATE = /^开发模板：`([^`]+)`\s*$/gm;
const COMPONENT_NAME = /^[A-Za-z0-9._-]+$/;

export function parseAppDirectory(readme) {
  const matches = [...readme.matchAll(APP_MAPPING)].map((match) => match[1]);
  if (matches.length > 1) throw new Error("README 只能声明一个应用目录");
  if (!matches.length) return undefined;

  const value = matches[0];
  if (path.isAbsolute(value) || value.includes("\\") || value.split("/").includes("..")) {
    throw new Error(`应用目录必须是安全的仓库相对路径：${value}`);
  }
  return value;
}

export function parseDevelopmentTemplate(readme) {
  const matches = [...readme.matchAll(DEVELOPMENT_TEMPLATE)].map((match) => match[1]);
  if (matches.length > 1) throw new Error("README 只能声明一个开发模板");
  if (!matches.length) return undefined;
  if (!new Set(["frontend", "backend"]).has(matches[0])) throw new Error(`未知开发模板：${matches[0]}`);
  return matches[0];
}

export function validateProject(projectRoot) {
  const root = path.resolve(projectRoot);
  const docs = path.join(root, "docs");
  if (!existsSync(docs)) return ["缺少 docs/ 目录"];

  const errors = [];
  for (const entry of readdirSync(docs, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "workflows") continue;
    if (!COMPONENT_NAME.test(entry.name)) {
      errors.push(`无效组件目录名：docs/${entry.name}/`);
      continue;
    }

    const readmeFile = path.join(docs, entry.name, "README.md");
    if (!existsSync(readmeFile)) {
      errors.push(`组件缺少 README：docs/${entry.name}/README.md`);
      continue;
    }

    try {
      const readme = readFileSync(readmeFile, "utf8");
      const app = parseAppDirectory(readme);
      const template = parseDevelopmentTemplate(readme);
      if (app && !template) errors.push(`组件 ${entry.name} 声明了应用目录但缺少开发模板`);
      if (!app && template) errors.push(`组件 ${entry.name} 声明了开发模板但缺少应用目录`);
      if (app) {
        const target = path.resolve(root, ...app.split("/").filter(Boolean));
        if (!existsSync(target) || !statSync(target).isDirectory()) {
          errors.push(`组件 ${entry.name} 的应用目录不存在或不是目录：${app}`);
        }
      }
    } catch (error) {
      errors.push(`组件 ${entry.name}：${error.message}`);
    }
  }
  return errors;
}

function prompt(name) {
  return readFileSync(path.join(WORKFLOW_ROOT, name), "utf8");
}

function allPrompts() {
  return PROMPT_FILES.map((name) => [name, prompt(name)]);
}

function temporaryDirectory() {
  return mkdtempSync(path.join(tmpdir(), "workflows-"));
}

function runSelfTests() {
  test("all prompt files exist and no longer use numbered 5W blocks", () => {
    for (const [name, content] of allPrompts()) {
      assert.ok(content.trim(), `${name} is empty`);
      assert.doesNotMatch(content, /^## AI-/m, `${name} still has AI blocks`);
      for (const label of ["Who", "When", "Where", "What", "Why"]) {
        assert.doesNotMatch(content, new RegExp(`^- \\*\\*${label}\\*\\*：`, "m"), `${name} still has ${label}`);
      }
    }
  });

  test("managed stage references exist", () => {
    const agents = prompt("templates/AGENTS.template.md");
    assert.equal(validateStageReferences(agents), 5);
  });

  test("documents the complete command surface", () => {
    const agents = prompt("templates/AGENTS.template.md");
    for (const command of [
      "<doc 组件>",
      "<dev 组件>",
      "<test 组件>",
      "<docker 组件>",
      "<test>",
      "<docker>",
      "<docker update>",
    ]) assert.ok(agents.includes(command), `missing ${command}`);

    assert.match(agents, /tmp require\|frontend\|backend\|docker/);
    assert.doesNotMatch(agents, /<deploy(?: |>)|stages\/deploy\.md/);
    assert.match(agents, /req 需求组件 \[issue 编号\]/);
    assert.match(agents, /\[draft M-001:P-001\|opt 文件\]/);
    assert.match(agents, /\[opt 文件\]/);
    assert.match(agents, /docs\/<组件>\/README\.md/);
    assert.match(agents, /docs\/workflows\/.*除外/);
    assert.match(agents, /最多并行启动三个模板专家/);
    assert.match(agents, /专家只读取当前阶段允许的必要事实，不修改文件/);
    assert.match(agents, /开发模板只能是 `frontend` 或 `backend`/);
  });

  test("removes old command routing and component directory model", () => {
    for (const name of ["templates/AGENTS.template.md", ...PROMPT_FILES.filter((file) => file.startsWith("stages/"))]) {
      const content = prompt(name);
      assert.doesNotMatch(content, /<system>/, name);
      assert.doesNotMatch(content, /<组件 (?:dev|test|deploy)>/, name);
      assert.doesNotMatch(content, /docs\/(?:requirements|component)\//, name);
      assert.doesNotMatch(content, /tmp arch/, name);
    }
    for (const removed of [
      "stages/system.md",
      "stages/requirement.md",
      "stages/component.md",
      "stages/component-dev.md",
      "stages/deploy.md",
      "templates/issue.template.md",
      "templates/arch-design.template.md",
    ]) {
      assert.equal(existsSync(path.join(WORKFLOW_ROOT, removed)), false, `${removed} still exists`);
    }
  });

  test("issue template keeps FR trace graphs and uses Feature as AC source", () => {
    const issue = prompt("templates/require/requirements.md");
    assert.match(issue, /docs\/<组件>\/[\s\S]*├─ README\.md[\s\S]*├─ M-001\/[\s\S]*FR-001\.md[\s\S]*BR-001\.md/);
    assert.doesNotMatch(issue, /requirement\.md/);
    assert.match(issue, /`README\.md`：组件入口，保存组件职责、角色以及按模块组织的页面和全部 FR 索引/);
    assert.match(issue, /# <组件名称>[\s\S]*## 角色索引[\s\S]*## 模块、页面与功能索引/);
    assert.match(issue, /M-002\/[\s\S]*FR-001\.md/);
    assert.doesNotMatch(issue, /items\//);
    assert.match(issue, /### M-001 账户与认证[\s\S]*#### 页面索引[\s\S]*\| 页面 \| 名称 \| 角色 \| 入口 \| 功能 \| 目标页面 \| 状态 \| 来源 \|[\s\S]*#### 功能需求索引[\s\S]*\| FR \| 功能标识 \| 主体 \| 名称 \| 动作 \| 状态 \| 来源 \|/);
    assert.match(issue, /\| `P-001` \| 登录页 \| 用户 \|[\s\S]*\[FR-002\]\(M-001\/FR-002\.md\)/);
    assert.doesNotMatch(issue, /\| FR \| 功能标识 \| 主体 \| 名称 \| 业务对象 \|/);
    assert.match(issue, /\| `FR-001` \| \*\*user-register\*\* \| 用户 \| 用户注册 \|/);
    assert.match(issue, /\| `FR-002` \| \*\*user-login\*\* \| 用户 \| 用户登录 \|/);
    assert.match(issue, /\| `FR-003` \| \*\*user-logout\*\* \| 用户 \| 用户登出 \|/);
    assert.match(issue, /模块编号使用 `M-<三位编号>`/);
    assert.match(issue, /存在页面时先放一张页面表，再放一张独立 FR 表/);
    assert.match(issue, /首个页面和 FR 分别使用 `P-001`、`FR-001`/);
    assert.match(issue, /`M-001\/FR-001` 与 `M-002\/FR-001` 可以同时存在/);
    assert.match(issue, /跨模块 FR 引用必须使用 `M-001\/FR-001`，跨模块页面引用必须使用 `M-001:P-001`/);
    assert.match(issue, /已有编号不因 Issue 或条目的增删而重排或复用，删除后允许保留编号空缺/);
    assert.match(issue, /功能标识使用组件内唯一的粗体 `\*\*kebab-case\*\*`/);
    assert.match(issue, /每个 FR 只属于一个主模块/);
    assert.match(issue, /跨模块协作由 FLOW 表达/);
    assert.match(issue, /页面可以映射多个 FR，同一 FR 也可以被多个页面使用/);
    assert.match(issue, /唯一关系事实是页面索引的“功能”列/);
    assert.match(issue, /对面向界面的需求建立设计输入视图/);
    assert.match(issue, /不得机械补齐不存在的状态或猜测阈值/);
    assert.match(issue, /页面控件、视觉值、Layout 和 Component 不属于需求索引/);
    assert.match(issue, /每个 `active` 页面至少映射一个 `active` FR；无界面的 FR 可以不映射页面/);
    assert.match(issue, /跨模块写 `M-001:P-001`/);
    assert.match(issue, /\[#1\]\(https:\/\/github\.com\/swainle\/d5\/issues\/1\)/);
    assert.match(issue, /`\[#1\]\(<URL-1>\)<br>\[#7\]\(<URL-7>\)`/);
    assert.match(issue, /已读取 Issue 的真实编号和 URL/);
    assert.match(issue, /不得猜测 URL 或输出 `\[\?\]\(\?\)`/);
    assert.match(issue, /按 Issue 编号升序去重/);
    assert.match(issue, /同一单元格中用 `<br>` 分隔/);
    assert.match(issue, /`CONFLICT` 未解决时不写入/);
    assert.match(issue, /# FR-001 <名称>/);
    assert.match(issue, /- 成功结果：<可观察的成功结果>/);
    assert.match(issue, /模块目录的 `AC-001\.feature`/);
    assert.doesNotMatch(issue, /REQ-\d/);
    assert.match(issue, /每个 FR 保留 Mermaid 追溯图/);
    assert.match(issue, /classDef focus fill:#2563eb,color:#fff,stroke:#1d4ed8,stroke-width:2px/);
    assert.match(issue, /click AC001 "AC-001\.feature"/);
    assert.match(issue, /click PERM001 "PERM-001\.md"/);
    assert.match(issue, /click NFR001 "NFR-001\.md"/);
    assert.match(issue, /click FLOW001 "FLOW-001\.md"/);
    assert.match(issue, /M-001\/FLOW-001\.md[\s\S]*sequenceDiagram[\s\S]*stateDiagram-v2[\s\S]*M-001\/NFR-001\.md/);
    assert.match(issue, /多角色交互、顺序、分支或回路使用 `sequenceDiagram`/);
    assert.match(issue, /多个状态和受限转换时追加 `stateDiagram-v2`/);
    assert.match(issue, /AC-001-TC-001/);
    assert.match(issue, /click TC001 "AC-001\.feature"/);
    assert.doesNotMatch(issue, /AC-001\.md/);
    assert.match(issue, /一个 AC 对应一个 `\.feature`，包含一个或多个 TC/);
    assert.match(issue, /Scenario: <成功场景>[\s\S]*Scenario: <失败或边界场景>/);
    assert.match(issue, /不得为凑齐状态而创建虚假 TC/);
    assert.match(issue, /@M-001-AC-001-TC-001/);
    assert.match(issue, /在每个 AC 内从 `001` 独立递增分配/);
    assert.match(issue, /已有 TC 不重排、不复用，删除后允许空缺/);
    assert.match(issue, /Issue 是可选需求输入/);
    assert.match(issue, /## 分析流程/);
    assert.match(issue, /读取索引中 `active \/ replaced \/ removed` 的全部 `M-\*\/FR-\*\.md`/);
    assert.match(issue, /不得用候选筛选代替全量读取/);
    assert.match(issue, /“模块 → 页面 ↔ FR”关系视图/);
    assert.match(issue, /按“模块 × 角色 × 业务对象 × 动作”建立全量 CRUD 视图/);
    assert.match(issue, /缺少某个 CRUD 动作不自动构成需求/);
    assert.match(issue, /受当前需求输入影响 FR 的 Mermaid 直接关联 BR、FLOW、NFR、PERM、AC 和 TC/);
    for (const classification of ["REUSE", "EXTEND", "UPDATE", "REPLACE", "ADD", "REMOVE", "CONFLICT"]) {
      assert.ok(issue.includes(`- \`${classification}\`：`), `missing Issue classification: ${classification}`);
    }
    assert.match(issue, /`CONFLICT` 或专家分歧会改变行为、契约、安全、数据、终端范围、语言、可访问性或兼容性时，在写入前一次询问一个关键问题/);
    assert.match(issue, /最后同步 `README\.md` 索引和 FR Mermaid 投影/);
    assert.match(issue, /没有时写“无”/);
    assert.match(issue, /BR 只保留一级标题和一个伪代码规则块/);
    for (const syntax of [
      "PRIORITY 100",
      "REQUIRES ALL PERMISSIONS",
      "REQUIRES ANY PERMISSION",
      "REQUIRES PERMISSION <权限>",
      "INPUT",
      "ELSE IF",
      "AND / OR / NOT",
      "ALLOW",
      "REJECT",
      "SET",
      "RETURN",
    ]) assert.ok(issue.includes(syntax), `missing BR syntax: ${syntax}`);
    assert.match(issue, /条件按优先级从高到低排列/);
    assert.match(issue, /内容缩进两个空格/);
    assert.match(issue, /注释使用 `# `/);
    assert.match(issue, /禁止编程语言语法/);
    assert.match(issue, /\| 权限标识 \| 角色 \| 资源 \| 动作 \| 范围 \| 允许条件 \| 审计 \|/);
    assert.match(issue, /PERM 表是权限标识的唯一登记处/);
    assert.match(prompt("stages/dev.md"), /实现 BR 的 `REQUIRES PERMISSION` 前，确认权限已在 PERM 表登记/);
    assert.match(issue, /## 需求评审重点/);
    assert.match(issue, /README、FR、FLOW、AC、NFR、PERM 和 `context\.md`/);
  });

  test("require, frontend design, frontend draft, backend and docker are optional doc templates", () => {
    const agents = prompt("templates/AGENTS.template.md");
    assert.match(agents, /<doc 组件> tmp require \[issue 编号\]/);
    assert.match(agents, /<doc 组件> tmp frontend/);
    assert.match(agents, /draft M-<三位编号>:P-<三位编号>/);
    assert.match(agents, /首次页面必须自举完整可运行应用，后续页面必须保持 WebAssembly 网页构建与浏览器验证闭环/);
    assert.match(agents, /`draft` 值或未列出的 `tmp` 值都是未知语法/);
    assert.match(agents, /templates\/frontend-draft\.template\.md/);
    assert.match(agents, /<doc 组件> tmp backend/);
    assert.match(agents, /<doc 组件> tmp docker/);
    const requireTemplate = prompt("templates/require.template.md");
    assert.match(requireTemplate, /<doc 组件> tmp require \[issue <编号>\]/);
    assert.match(requireTemplate, /templates\/require\/requirements\.md/);
    assert.match(requireTemplate, /templates\/require\/architecture\.md/);
    assert.match(requireTemplate, /产品与领域专家/);
    assert.match(requireTemplate, /架构与安全专家/);
    assert.match(requireTemplate, /验收与质量专家/);
    assert.match(requireTemplate, /总是运行专家团/);
    const arch = prompt("templates/require/architecture.md");
    for (const file of ["context.md", "system.md", "security.md", "observability.md", "gitflow.md", "openapi.json"]) {
      assert.ok(arch.includes(`\`${file}\``), `missing Arch file: ${file}`);
    }
    assert.doesNotMatch(arch, /process\.md|\bBP-?\b|跨组件流程/);
    assert.match(arch, /不创建独立 system 阶段/);
    assert.match(arch, /C4Context/);
    assert.match(arch, /C4Container/);
    assert.match(arch, /Token 刷新、会话吊销和认证握手属于 `security\.md`/);
    assert.match(arch, /不在本文件维护组件清单、应用路径、设计路径、凭据值/);
    assert.match(arch, /不指定 npm 包、SDK 初始化、Dashboard 配置或 Collector/);
    assert.match(arch, /## 架构评审重点/);
    const frontendDesign = prompt("templates/frontend-design.template.md");
    const frontendDraft = prompt("templates/frontend-draft.template.md");
    const frontend = `${frontendDesign}\n${frontendDraft}`;
    assert.match(frontendDesign, /本模板定义 Frontend 各文件的作用、结构、用法和关系/);
    assert.match(frontendDesign, /Draft 功能只由[\s\S]*tmp frontend draft M-001:P-001/);
    assert.match(frontendDesign, /`tmp frontend` 只说明并索引该目录，不创建或修改 Draft 代码/);
    assert.match(frontendDesign, /`tmp frontend` 没有创建或修改 `draft\/\*\*`/);
    assert.equal([...frontendDesign.matchAll(/^### 作用$/gm)].length, 5);
    assert.equal([...frontendDesign.matchAll(/^### 结构$/gm)].length, 5);
    assert.equal([...frontendDesign.matchAll(/^### 用法$/gm)].length, 5);
    assert.equal([...frontendDesign.matchAll(/^### 关系$/gm)].length, 5);
    assert.match(agents, /\| `<doc 组件> tmp frontend` \| `stages\/doc\.md`、`templates\/frontend-design\.template\.md` \|/);
    assert.match(agents, /\| `<doc 组件> tmp frontend draft M-001:P-001` \| `stages\/doc\.md`、`templates\/frontend-draft\.template\.md` \|/);
    assert.match(frontendDraft, /tmp frontend draft M-001:P-001/);
    assert.match(frontendDraft, /未指定 `draft` 时不得加载或执行本模板/);
    assert.match(frontendDraft, /`draft` 与 `opt` 互斥/);
    assert.match(frontendDraft, /不修改 README、`DESIGN\.md`、目标页 `index\.html`、`configuration\.md` 或 `testing\.md`/);
    assert.match(frontendDraft, /只创建或修改目标页面的 `View\.qml`、`mock\.mjs`、`COMP-\*\/\*\*`/);
    assert.match(frontendDraft, /创建新页面必须显式给出 `req <需求组件>`/);
    assert.match(frontendDraft, /交付单位是“可启动到目标页的完整应用”/);
    assert.match(frontendDraft, /缺少其中任何一项都不算完成/);
    assert.match(frontendDraft, /所有创建的 QML、JavaScript 模块和资产必须登记到 CMake/);
    assert.match(frontendDraft, /`main\.cpp` 必须加载 CMake 声明的 QML 模块与 `App\.qml`/);
    assert.match(frontendDraft, /工具链缺失只降低验证级别，不得把完整源码降级成示例/);
    assert.match(frontendDraft, /经读取和发现后仍无法唯一确定/);
    assert.match(frontendDraft, /通过对话一次询问一个关键问题/);
    assert.match(frontendDraft, /同时给出已发现证据和推荐项/);
    assert.match(frontendDraft, /用户确认前不得猜测、写入或宣称该项已验证/);
    assert.match(frontendDraft, /`anchors\.fill` 的子项不会向父项贡献隐式尺寸/);
    assert.match(frontendDraft, /LAYOUT_AUDIT_FAILED/);
    assert.match(frontend, /第一个创建或确认/);
    assert.match(frontend, /> Ref: `docs\/<req组件>\/README\.md`/);
    assert.match(frontend, /开发模板：`frontend`/);
    assert.match(frontend, /## 概述[\s\S]*## 技术基线[\s\S]*## 文档索引[\s\S]*## 文件关系[\s\S]*## 技术实现/);
    assert.match(frontend, /\| 类别 \| 选择 \| 版本 \| 官方文档 \|/);
    assert.doesNotMatch(frontend, /\| 类别 \| 选择 \| 版本 \| 官方文档 \| 范例代码 \|/);
    assert.match(frontend, /DESIGN\["DESIGN\.md"\] --> DRAFT/);
    assert.match(frontend, /DRAFT --> DEV\["<dev 组件>"\]/);
    assert.match(frontend, /CONFIG\["configuration\.md"\] --> DEV/);
    assert.match(frontend, /DEV --> TESTING/);
    assert.match(frontend, /## 技术实现\s+### <关键技术>/);
    assert.match(frontend, /`DESIGN\.md` 是设计系统唯一事实源/);
    assert.match(frontendDesign, /Google Labs DESIGN\.md alpha 格式/);
    assert.match(frontendDesign, /YAML frontmatter 保存规范 Token/);
    assert.match(frontendDesign, /npx @google\/design\.md lint DESIGN\.md/);
    assert.match(frontend, /draft\/src\/Theme\.qml/);
    assert.match(frontendDraft, /禁止手工编辑/);
    assert.match(frontendDraft, /不要求另建生成器程序/);
    assert.match(frontendDraft, /不得假设浏览器或操作系统字体可被 Qt WebAssembly 使用/);
    assert.match(frontendDraft, /`FontLoader` 加载并使用其实际 `name`/);
    assert.match(frontendDraft, /FONT_LOAD_FAILED/);
    assert.match(frontendDraft, /目标平台由 `<dev 组件>` 从 DESIGN\.md 生成主题/);
    assert.match(frontendDesign, /不创建 `ux\.md`、`state\.md` 或 `mapping\.md`/);
    assert.doesNotMatch(frontendDesign, /^## `?(?:ux|state|mapping)\.md`?$/m);
    assert.doesNotMatch(frontend, /原生 Web Components|Shadow DOM|Custom Element|tokens\.css|src\/index\.js/);
    assert.match(frontendDraft, /完整 Qt Quick\/QML 项目/);
    assert.match(frontendDraft, /Qt for WebAssembly/);
    assert.match(frontendDraft, /可构建并直接启动 WebAssembly 浏览器预览/);
    assert.match(frontendDraft, /`index\.html` 是用户提供的只读页面设计输入/);
    assert.match(frontendDraft, /不要求独立 `style\.css` 或 `index\.js`/);
    assert.match(frontendDraft, /一比一指相同视口下的视觉层级/);
    assert.match(frontendDraft, /不为每个 `div` 创建组件/);
    assert.match(frontendDraft, /页面目录不创建第二个 `assets\/`/);
    assert.match(frontendDraft, /├─ CMakeLists\.txt/);
    assert.match(frontendDraft, /├─ main\.cpp/);
    assert.match(frontendDraft, /│  ├─ App\.qml/);
    assert.match(frontendDraft, /│  ├─ MockStore\.qml/);
    assert.match(frontendDraft, /│  ├─ Theme\.qml/);
    assert.match(frontendDraft, /M-001\/[\s\S]*LAYOUT-001\/[\s\S]*View\.qml[\s\S]*P-001\/[\s\S]*COMP-001\/[\s\S]*View\.qml/);
    assert.match(frontendDraft, /P-001\/[\s\S]*index\.html[\s\S]*View\.qml/);
    assert.match(frontendDraft, /`build\/` 是本地生成物，必须被忽略且不得提交/);
    assert.match(frontendDraft, /入口统一为 `View\.qml`/);
    assert.match(frontendDraft, /`M-001` 等带连字符目录不得作为 QML Module URI/);
    for (const capability of ["组件树", "属性", "布局", "数据绑定", "状态", "事件", "动画", "组件复用", "响应式变化", "主题"]) {
      assert.match(frontendDraft, new RegExp(`- ${capability}：`), `missing QML capability: ${capability}`);
    }
    assert.match(frontendDraft, /使用普通 `\.qml`，不使用 `\.ui\.qml`/);
    assert.match(frontendDraft, /QtQuick`、`QtQuick\.Controls`、`QtQuick\.Layouts`、`QtQml`/);
    assert.match(frontendDraft, /禁止自定义 C\+\+ 业务类型、平台插件/);
    assert.match(frontendDraft, /required property var pageData/);
    assert.match(frontendDraft, /signal openDetail\(string id\)/);
    assert.match(frontendDraft, /import "\.\/COMP-001" as Comp001/);
    assert.match(frontendDraft, /模块文件使用 `\.mjs` 和标准 `import`\/`export`/);
    assert.match(frontendDraft, /禁止 CommonJS、TypeScript、JSX、浏览器 DOM API/);
    assert.match(frontend, /不使用 Cookie、`localStorage`/);
    assert.match(frontendDraft, /临时数据必须标记为合成数据/);
    assert.match(frontendDraft, /loading、empty、success、error、unauthorized/);
    assert.match(frontendDraft, /不得实现生产缓存、并发控制、持久化、鉴权基础设施/);
    assert.match(frontendDraft, /`qmlformat`/);
    assert.match(frontendDraft, /`qmllint`/);
    assert.doesNotMatch(frontendDraft, /build\/desktop|使用桌面|启动桌面|桌面与 WebAssembly/);
    assert.match(frontendDraft, /`build\/wasm\/` 配置并构建应用目标/);
    assert.match(frontendDraft, /从真实 WASM 输出目录启动本地 HTTP 服务器/);
    assert.match(frontendDraft, /不得声称“可运行 WASM 已完成”/);
    for (const level of ["视觉已验证", "仅结构与交互已验证", "仅构建已验证"]) {
      assert.match(frontendDraft, new RegExp(level), `missing Draft validation level: ${level}`);
    }
    assert.match(frontendDraft, /不支持图片但支持浏览器/);
    assert.match(frontendDraft, /仅有“编译成功”或“控制台无普通异常”不能证明页面样式完成/);
    assert.match(prompt("stages/doc.md"), /`tmp frontend draft` 是唯一例外/);
    assert.match(frontendDraft, /没有 `\.ui\.qml`、`index\.js`、TypeScript、JSX 或平台插件/);
    assert.match(frontendDesign, /## `configuration\.md`/);
    assert.match(frontendDesign, /## `testing\.md`/);
    assert.match(prompt("stages/dev.md"), /不要求独立 `mapping\.md`/);
    assert.match(frontend, /## 专家团/);
    const backend = prompt("templates/backend-design.template.md");
    assert.match(backend, /轻量模式/);
    assert.match(backend, /README 第一个创建或确认/);
    assert.match(backend, /开发模板：`backend`/);
    assert.match(backend, /\| 类别 \| 选择 \| 版本 \| 官方文档 \| 范例代码 \|/);
    assert.match(backend, /技术选择的唯一事实源是 README/);
    assert.match(backend, /领域模型不得因为 README 中的框架、ORM 或消息技术而改变业务边界/);
    assert.match(backend, /## 专家团/);
    const docker = prompt("templates/docker-design.template.md");
    assert.match(docker, /用于 `<doc 组件> tmp docker`/);
    assert.match(docker, /Docker 目录：`docker\/<组件>\/`/);
    assert.match(docker, /只维护 `docs\/<组件>\/README\.md`/);
    assert.match(docker, /README 是该组件容器编排文档的唯一文件/);
    assert.doesNotMatch(docker, /orchestration\.md/);
    assert.match(docker, /## 服务与依赖[\s\S]*## 端口与网络[\s\S]*## 卷与数据[\s\S]*## 配置与密钥/);
    assert.match(docker, /不使用 `latest`/);
    const dockerStage = prompt("stages/docker.md");
    assert.match(dockerStage, /`<docker 组件>`：维护仓库根目录 `docker\/<组件>\/\*\*`/);
    assert.match(dockerStage, /`<docker 组件>` 只能写 `docker\/<组件>\/\*\*`/);
    assert.match(dockerStage, /`<docker update>` 在 `docker\/update\/`/);
    assert.match(dockerStage, /`docs\/<组件>\/README\.md` 中已确认的服务/);
    assert.doesNotMatch(dockerStage, /映射应用目录|deploy\//);
  });

  test("parses pure-document and mapped component READMEs", () => {
    assert.equal(parseAppDirectory("# Require\n"), undefined);
    assert.equal(parseAppDirectory("# API\n\n应用目录：`apps/api/`\n"), "apps/api/");
    assert.equal(parseDevelopmentTemplate("# Require\n"), undefined);
    assert.equal(parseDevelopmentTemplate("开发模板：`backend`\n"), "backend");
    assert.throws(() => parseAppDirectory("应用目录：`../api/`\n"), /安全/);
    assert.throws(
      () => parseAppDirectory("应用目录：`apps/a/`\n应用目录：`apps/b/`\n"),
      /只能声明一个/,
    );
    assert.throws(() => parseDevelopmentTemplate("开发模板：`fullstack`\n"), /未知开发模板/);
    assert.throws(
      () => parseDevelopmentTemplate("开发模板：`frontend`\n开发模板：`backend`\n"),
      /只能声明一个/,
    );
  });

  test("validates component discovery and application mappings", () => {
    const root = temporaryDirectory();
    try {
      mkdirSync(path.join(root, "docs", "workflows"), { recursive: true });
      mkdirSync(path.join(root, "docs", "require"), { recursive: true });
      mkdirSync(path.join(root, "docs", "api"), { recursive: true });
      mkdirSync(path.join(root, "apps", "api"), { recursive: true });
      writeFileSync(path.join(root, "docs", "require", "README.md"), "# Require\n", "utf8");
      writeFileSync(
        path.join(root, "docs", "api", "README.md"),
        "# API\n\n应用目录：`apps/api/`\n开发模板：`backend`\n",
        "utf8",
      );
      assert.deepEqual(validateProject(root), []);

      writeFileSync(path.join(root, "docs", "api", "README.md"), "# API\n\n应用目录：`apps/api/`\n", "utf8");
      assert.deepEqual(validateProject(root), ["组件 api 声明了应用目录但缺少开发模板"]);
      writeFileSync(
        path.join(root, "docs", "api", "README.md"),
        "# API\n\n应用目录：`apps/api/`\n开发模板：`backend`\n",
        "utf8",
      );

      mkdirSync(path.join(root, "docs", "web"));
      assert.deepEqual(validateProject(root), ["组件缺少 README：docs/web/README.md"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("parses install branch arguments", () => {
    assert.equal(parseBranch([]), undefined);
    assert.equal(parseBranch(["--workflows-updated"]), undefined);
    assert.equal(parseBranch(["--branch", "develop"]), "develop");
    assert.throws(() => parseBranch(["--branch"]), /Usage/);
    assert.throws(() => parseBranch(["--unknown"]), /Usage/);
  });

  test("merges the managed AGENTS block without changing host rules", () => {
    const revision = "a".repeat(40);
    const first = mergeAgents("# Host\n\nKeep this.\n", "# Workflow\n", revision);
    assert.match(first, /# Host[\s\S]*Keep this\.[\s\S]*workflows:begin/);
    assert.match(first, new RegExp(`workflows-revision: ${revision}`));

    const second = mergeAgents(first, "# Updated workflow\n", "b".repeat(40));
    assert.match(second, /# Host[\s\S]*Keep this\./);
    assert.doesNotMatch(second, /# Workflow\n/);
    assert.match(second, /# Updated workflow/);
  });

  test("installs the managed block into a host project", () => {
    const root = temporaryDirectory();
    try {
      writeFileSync(path.join(root, "AGENTS.md"), "# Host\n", "utf8");
      const result = installAgents({ projectRoot: root, workflowRoot: WORKFLOW_ROOT, revision: "c".repeat(40) });
      assert.equal(result, "updated");
      const installed = readFileSync(path.join(root, "AGENTS.md"), "utf8");
      assert.match(installed, /<doc 组件>/);
      assert.match(installed, /workflows-revision: c{40}/);
      assert.equal(installAgents({ projectRoot: root, workflowRoot: WORKFLOW_ROOT, revision: "c".repeat(40) }), "unchanged");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

function parseCli(args) {
  if (args.length === 2 && args[0] === "--project-root") return path.resolve(args[1]);
  throw new Error("Usage: validate.mjs [--project-root <path>]");
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const args = process.argv.slice(2);
  if (args.length) {
    try {
      const errors = validateProject(parseCli(args));
      if (errors.length) {
        for (const error of errors) console.error(error);
        process.exitCode = 1;
      } else {
        console.log("文档组件校验通过。");
      }
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  } else {
    runSelfTests();
  }
}
