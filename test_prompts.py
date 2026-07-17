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
        self.assertIn('require: { type: "string" }', cli)
        self.assertIn('list: { type: "boolean" }', cli)
        self.assertIn('"config", "stages"', engine)
        for name in (
            "issues", "process", "permission", "design", "c4", "api",
            "database", "backend", "frontend", "test", "deployment", "patch",
        ):
            self.assertTrue((ROOT / f"config/stages/{name}.md").is_file(), name)

    def test_regular_stages_only_collect_requirement_artifacts(self):
        engine = (ROOT / "tools/core/prompt-stage.mjs").read_text(encoding="utf-8")
        self.assertNotIn("referencedFiles", engine)
        self.assertNotIn("includes =", engine)
        for config in (ROOT / "tools/prompt").glob("*.mjs"):
            if config.name == "patch.mjs":
                continue
            text = config.read_text(encoding="utf-8")
            self.assertNotIn("globals:", text, config.name)
            self.assertNotIn("globalPatch:", text, config.name)
            self.assertNotIn("roles:", text, config.name)

    def test_code_stages_create_execution_prompts(self):
        expected = {
            "backend.prompt.md": "backend/backend.prompt.md",
            "frontend.prompt.md": "frontend/{{PLATFORM}}/frontend.prompt.md",
            "permission.prompt.md": "permission/permission.prompt.md",
            "deployment.prompt.md": "deployment/deployment.prompt.md",
        }
        for template, output in expected.items():
            text = (ROOT / "templates" / template).read_text(encoding="utf-8")
            self.assertIn(output, text)
            self.assertIn("当前阶段不得直接修改", text)

    def test_final_patch_is_installed_and_global_only(self):
        installer = (ROOT / "install.mjs").read_text(encoding="utf-8")
        prompt = (ROOT / "templates/patch.prompt.md").read_text(encoding="utf-8")
        cli = (ROOT / "tools/work.mjs").read_text(encoding="utf-8")
        self.assertIn('"work:patch"', installer)
        self.assertIn("需求的选定阶段已经全部完成", prompt)
        self.assertIn("assertAllowedPatchPaths", cli)
        self.assertIn('["apply", "--check", patchFile]', cli)

    def test_references_are_short_operational_guides(self):
        for file in (ROOT / "reference").glob("*.md"):
            text = file.read_text(encoding="utf-8")
            for heading in ("## 快速开发", "## 命令", "## 作用", "## 例子"):
                self.assertIn(heading, text, file.name)
            self.assertNotIn("## 最佳实践", text, file.name)


if __name__ == "__main__":
    unittest.main()
