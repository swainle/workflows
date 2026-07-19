import unittest
from pathlib import Path


ROOT = Path(__file__).parent


class PromptTest(unittest.TestCase):
    def test_common_prompt_has_requested_structure(self):
        base = (ROOT / "templates/base.prompt.md").read_text(encoding="utf-8")
        for text in (
            "# 通用规范", "## Mermaid 图表", "## 对话确认信息", "## 专家协作规范",
            "## Status 规范", "## Patch 规范", "# 设计文件规范", "# 阶段目标",
            "# 执行顺序", "# 执行结果", "# 执行上下文", "{{STAGE_INSTRUCTIONS}}",
            'git apply --check "{{PATCH_FILE}}"', "work:{{STAGE}} --merge",
        ):
            self.assertIn(text, base)
        for file in (
            "requirement.md", "requirement.functional.md", "requirement.business.md",
            "requirement.permission.md", "requirement.acceptance.md", "requirement.non-functional.md",
            "all.state.md", "all.process.md", "backend.process.md", "ddd.md", "technology.md",
            "architecture.md", "contracts.md", "openapi.json", "asyncapi.json", "authorization.fga",
            "schema.dbml", "design.token.json", "<platform>.design.token.json", "<platform>.ui.yaml",
            "deployment.md", "compose.yml", "dev.env", "test.env", "prod.env", "status.json",
        ):
            self.assertIn(f"`{file}`", base)
        self.assertIn("不要求反向重复引用", base)

    def test_stage_prompts_have_fixed_sections(self):
        for stage in ("design", "dev", "test", "patch"):
            prompt = (ROOT / f"templates/{stage}.prompt.md").read_text(encoding="utf-8")
            for heading in ("## 目标（最重要）", "## 可修改文件范围", "## 专家团", "## 专家团协作流程", "## 上下文要求", "## 执行状态"):
                self.assertIn(heading, prompt, stage)

    def test_design_owns_root_specs_and_status(self):
        prompt = (ROOT / "templates/design.prompt.md").read_text(encoding="utf-8")
        config = (ROOT / "tools/prompt/design.mjs").read_text(encoding="utf-8")
        defaults = (ROOT / "config/stages/design.md").read_text(encoding="utf-8")
        for text in ("需求根层", "需求确认摘要", "FR", "FLOW", "AC", "TC", "status.json"):
            self.assertIn(text, prompt)
        self.assertIn("REQUIREMENT_SPEC_ARTIFACTS", config)
        self.assertIn("不要求双向重复", defaults)

    def test_dev_and_test_only_change_their_requirement_status(self):
        dev = (ROOT / "templates/dev.prompt.md").read_text(encoding="utf-8")
        test = (ROOT / "templates/test.prompt.md").read_text(encoding="utf-8")
        self.assertIn("不以 Commit 为前提", dev)
        self.assertIn("不得修改需求根层其他规范", dev)
        self.assertIn("只更新 `status.json` 的 `dev`", dev)
        self.assertIn("使用者人工审核", test)
        self.assertIn("不得修改源码、需求根层其他规范、全局文件", test)
        self.assertIn("只更新 Test 状态", test)

    def test_patch_is_the_only_global_writer(self):
        prompt = (ROOT / "templates/patch.prompt.md").read_text(encoding="utf-8")
        defaults = (ROOT / "config/stages/patch.md").read_text(encoding="utf-8")
        for text in ("唯一可以修改全局文件", "completion.md", "compose.yml", "dev.env", "test.env", "prod.env", "status.json"):
            self.assertIn(text, prompt)
        self.assertIn("唯一可以修改全局文件", defaults)

    def test_only_design_dev_test_are_registered(self):
        stages = (ROOT / "tools/core/stages.mjs").read_text(encoding="utf-8")
        for name in ("design", "dev", "test"):
            self.assertIn(f'name: "{name}"', stages)
            self.assertTrue((ROOT / f"config/stages/{name}.md").is_file())
        self.assertNotIn('name: "deployment"', stages)
        self.assertFalse((ROOT / "tools/prompt/deployment.mjs").exists())
        self.assertFalse((ROOT / "templates/deployment.prompt.md").exists())

    def test_readme_uses_merge_without_next(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        for command in ("work:req", "work:design", "work:dev", "work:test", "work:patch", "--merge"):
            self.assertIn(command, readme)
        self.assertNotIn("work:next", readme)
        self.assertNotIn("work:deployment", readme)


if __name__ == "__main__":
    unittest.main()
