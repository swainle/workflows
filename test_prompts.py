import unittest
from pathlib import Path


ROOT = Path(__file__).parent


class PromptTest(unittest.TestCase):
    def test_optional_requirement_and_independent_stage_configs(self):
        base = (ROOT / "templates/base.prompt.md").read_text(encoding="utf-8")
        engine = (ROOT / "tools/core/prompt-stage.mjs").read_text(encoding="utf-8")
        cli = (ROOT / "tools/work.mjs").read_text(encoding="utf-8")

        self.assertIn("{{DEFAULT_REQUIREMENTS}}", base)
        self.assertIn("{{USER_REQUIREMENT}}", base)
        self.assertIn("# 专家协作", base)
        self.assertIn("支持子代理", base)
        self.assertIn("{{ROLES}}", base)
        self.assertIn("{{REFERENCE_FILES}}", base)
        self.assertIn('git apply --check "{{PATCH_FILE}}"', base)
        self.assertIn('require: { type: "string" }', cli)
        self.assertIn('list: { type: "boolean" }', cli)
        self.assertIn("formatStageConfig", cli)
        self.assertIn("# 阶段产物", engine)
        self.assertIn('"config", "stages"', engine)
        for name in (
            "issues", "process", "permission", "design", "c4", "api",
            "database", "backend", "frontend", "test", "deployment", "patch",
        ):
            self.assertTrue((ROOT / f"config/stages/{name}.md").is_file(), name)

        issues = (ROOT / "tools/prompt/issues.mjs").read_text(encoding="utf-8")
        for path in ("product.md", "openapi.json", "asyncapi.json", "schema.dbml", "authorization.fga"):
            self.assertIn(path, issues)

    def test_regular_stages_collect_global_and_requirement_artifacts(self):
        engine = (ROOT / "tools/core/prompt-stage.mjs").read_text(encoding="utf-8")
        self.assertNotIn("referencedFiles", engine)
        self.assertNotIn("includes =", engine)
        for config in (ROOT / "tools/prompt").glob("*.mjs"):
            text = config.read_text(encoding="utf-8")
            self.assertIn("artifacts:", text, config.name)
            self.assertIn("roles:", text, config.name)
            if config.name == "patch.mjs":
                continue
            self.assertIn("globals:", text, config.name)
            self.assertNotIn("globalPatch:", text, config.name)

    def test_code_stages_create_execution_prompts(self):
        expected = {
            "backend.prompt.md": "backend/backend.prompt.md",
            "frontend.prompt.md": "frontend/{{PLATFORM}}/frontend.prompt.md",
            "deployment.prompt.md": "deployment/deployment.prompt.md",
        }
        for template, output in expected.items():
            text = (ROOT / "templates" / template).read_text(encoding="utf-8")
            self.assertIn(output, text)
            self.assertIn("{{RUN_DIR}}", text)
            self.assertIn("prompt.NN.git.patch", text)
            self.assertIn("外层 Git Patch 只能修改", text)

        permission = (ROOT / "templates/permission.prompt.md").read_text(encoding="utf-8")
        self.assertNotIn("permission/permission.prompt.md", permission)
        self.assertIn("backend、frontend", permission)

    def test_all_stage_patch_analyses_are_minimal(self):
        prompt = (ROOT / "templates/base.prompt.md").read_text(encoding="utf-8")
        for heading in ("# 引用文件", "# 引用 Issue", "# 影响文件", "# 角色", "# 时间"):
            self.assertIn(heading, prompt)
        self.assertLess(prompt.index("# 引用 Issue"), prompt.index("# 引用文件"))
        self.assertIn("{{ROLES}}", prompt)
        self.assertIn("{{REFERENCE_FILES}}", prompt)

        issue_prompt = (ROOT / "templates/issues.prompt.md").read_text(encoding="utf-8")
        self.assertNotIn("# 阶段补丁分析", issue_prompt)

        issue_config = (ROOT / "tools/prompt/issues.mjs").read_text(encoding="utf-8")
        backend_config = (ROOT / "tools/prompt/backend.mjs").read_text(encoding="utf-8")
        test_config = (ROOT / "tools/prompt/test.mjs").read_text(encoding="utf-8")
        self.assertIn('roles: ["互联网产品经理", "业务分析师", "测试工程师"]', issue_config)
        self.assertIn('roles: ["后端架构师", "权限与安全架构师", "测试工程师"]', backend_config)
        self.assertIn('roles: ["测试工程师", "互联网产品经理", "业务分析师"]', test_config)

    def test_final_patch_creates_completion_and_updates_global_files(self):
        installer = (ROOT / "install.mjs").read_text(encoding="utf-8")
        prompt = (ROOT / "templates/patch.prompt.md").read_text(encoding="utf-8")
        cli = (ROOT / "tools/work.mjs").read_text(encoding="utf-8")
        self.assertIn('"work:patch"', installer)
        self.assertIn("需求的选定阶段已经全部完成", prompt)
        self.assertIn("{{REQUIREMENT_DIR}}/completion.md", prompt)
        self.assertIn("status: completed", prompt)
        for heading in ("# 完成", "# 修改", "# 迁移", "# 测试", "# 关联记录"):
            self.assertIn(heading, prompt)
        self.assertNotIn("# 关键", prompt)
        self.assertIn("Pull Request 描述", prompt)
        self.assertIn("Closes #{{ISSUE_NUMBER}}", prompt)
        self.assertIn("不得输出 `no-changes`", prompt)
        self.assertIn("Final Patch must modify", cli)
        self.assertIn("assertAllowedPatchPaths", cli)
        self.assertIn("assertAllowedCodePatchPaths", cli)
        self.assertIn('["apply", "--check", patchFile]', cli)

    def test_references_are_short_operational_guides(self):
        for file in (ROOT / "reference").glob("*.md"):
            text = file.read_text(encoding="utf-8")
            for heading in ("## 快速开始", "## 命令", "## 作用"):
                self.assertIn(heading, text, file.name)
            self.assertNotIn("## 例子", text, file.name)
            self.assertNotIn("## 最佳实践", text, file.name)

    def test_diagrams_use_mermaid_markdown(self):
        base = (ROOT / "templates/base.prompt.md").read_text(encoding="utf-8")
        for diagram in (
            "architecture-beta", "flowchart", "sequenceDiagram", "stateDiagram-v2",
            "classDiagram", "erDiagram", "gitGraph", "journey", "C4Context",
        ):
            self.assertIn(diagram, base)

        tracked_text = [
            *ROOT.glob("templates/*.md"),
            *ROOT.glob("config/stages/*.md"),
            *ROOT.glob("tools/**/*.mjs"),
            *ROOT.glob("defaults/**/*"),
            *ROOT.glob("examples/**/*"),
        ]
        for file in tracked_text:
            if not file.is_file() or file == ROOT / "templates/base.prompt.md":
                continue
            text = file.read_text(encoding="utf-8")
            self.assertNotIn(".puml", text, file)
            self.assertNotIn("PlantUML", text, file)

        self.assertFalse(any(ROOT.glob("defaults/**/*.puml")))
        self.assertFalse(any(ROOT.glob("examples/**/*.puml")))

    def test_readme_defines_artifact_categories(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        for category in ("阶段产物", "阶段提示词", "阶段补丁", "阶段补丁分析", "全局产物"):
            self.assertIn(f"| {category} |", readme)
        self.assertIn("`completion.md` 归类为 `patch` 阶段产物", readme)


if __name__ == "__main__":
    unittest.main()
