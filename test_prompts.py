import unittest
from pathlib import Path


ROOT = Path(__file__).parent


class PromptTest(unittest.TestCase):
    def test_base_enforces_incremental_patch_delivery(self):
        base = (ROOT / "templates/base.prompt.md").read_text(encoding="utf-8")
        engine = (ROOT / "tools/core/prompt-stage.mjs").read_text(encoding="utf-8")
        for text in (
            "# 信息优先级", "# 对话确认", "每次只问一个", "# 专家协作",
            "# 执行顺序", "{{WORKTREE_RULES}}", "{{READ_RULES}}", "{{IMPACT_RULES}}",
            'git apply --check "{{PATCH_FILE}}"', "结束前必须确认",
        ):
            self.assertIn(text, base)
        self.assertIn("config.directSourceChanges", engine)
        self.assertIn("relatedStageFiles", engine)
        self.assertIn("不得再读取其他需求目录或历史时间戳目录", engine)

    def test_design_is_complete_and_conversational(self):
        prompt = (ROOT / "templates/design.prompt.md").read_text(encoding="utf-8")
        config = (ROOT / "tools/prompt/design.mjs").read_text(encoding="utf-8")
        defaults = (ROOT / "config/stages/design.md").read_text(encoding="utf-8")
        for text in (
            "对话式需求发现", "需求可设计门禁", "需求确认摘要", "多专家 Agent 协作",
            "requirement.md", "process.md", "architecture.md", "authorization.fga",
            "openapi.json", "asyncapi.json", "schema.dbml", "verification.md",
            "design.token.json", "web.design.token.json", "mini-program.design.token.json",
            "desktop.design.token.json", "mobile.design.token.json", "web.ui.yaml",
            "development.compose.yml", "development.env", "test.compose.yml", "test.env",
            "production.compose.yml", "production.env", "docker/",
        ):
            self.assertIn(text, prompt)
        for text in ("development.compose.yml", "test.compose.yml", "production.compose.yml"):
            self.assertIn(text, config)
        self.assertIn("githubIssues: true", config)
        self.assertIn('relatedStages: ["design"]', config)
        self.assertIn("关联需求 Design 根层稳定产物", defaults)

    def test_dev_directly_modifies_source_and_records_decisions(self):
        prompt = (ROOT / "templates/dev.prompt.md").read_text(encoding="utf-8")
        config = (ROOT / "tools/prompt/dev.mjs").read_text(encoding="utf-8")
        defaults = (ROOT / "config/stages/dev.md").read_text(encoding="utf-8")
        for text in (
            "Backend", "Web", "Mini Program", "Desktop", "Mobile",
            "直接修改", "dev/development.md", "dev/questions.md", "DEV-Q-xxx",
            "不得把源码修改包装进阶段 Patch", "实际运行的验证命令", "{{SOURCE_BASELINE}}",
        ):
            self.assertIn(text, prompt)
        self.assertIn("directSourceChanges: true", config)
        self.assertIn('relatedStages: ["design", "dev"]', config)
        self.assertIn("不生成源码 Patch", defaults)
        self.assertIn("development.compose.yml", prompt)

    def test_only_new_stages_are_registered(self):
        stages = (ROOT / "tools/core/stages.mjs").read_text(encoding="utf-8")
        for name in ("design", "dev", "test", "deployment"):
            self.assertIn(f'name: "{name}"', stages)
            self.assertTrue((ROOT / f"config/stages/{name}.md").is_file())
        for name in ("issue", "process", "permission", "c4", "api", "database", "backend", "frontend"):
            self.assertFalse((ROOT / f"tools/prompt/{name}.mjs").exists(), name)

    def test_patch_owns_global_token_and_docker_sync(self):
        prompt = (ROOT / "templates/patch.prompt.md").read_text(encoding="utf-8")
        defaults = (ROOT / "config/stages/patch.md").read_text(encoding="utf-8")
        config = (ROOT / "tools/prompt/patch.mjs").read_text(encoding="utf-8")
        for text in ("design/design.token.json", "token.json", "<platform>.token.json"):
            self.assertIn(text, prompt)
            self.assertIn(text, defaults)
        self.assertIn('"packages/design-tokens/tokens"', config)
        for text in ("development.compose.yml", "test.compose.yml", "production.compose.yml", "docker/"):
            self.assertIn(text, prompt)
        self.assertIn('"docker"', config)
        self.assertIn('".env"', (ROOT / "tools/core/files.mjs").read_text(encoding="utf-8"))
        for name in ("token.json", "web.token.json", "mini-program.token.json", "desktop.token.json", "mobile.token.json"):
            self.assertTrue((ROOT / f"defaults/design-tokens/{name}").is_file(), name)

    def test_diagrams_and_references_use_current_commands(self):
        base = (ROOT / "templates/base.prompt.md").read_text(encoding="utf-8")
        for diagram in (
            "architecture-beta", "flowchart", "sequenceDiagram", "stateDiagram-v2",
            "classDiagram", "erDiagram", "gitGraph", "journey", "C4Context",
        ):
            self.assertIn(diagram, base)
        for file in (ROOT / "reference").glob("*.md"):
            text = file.read_text(encoding="utf-8")
            for heading in ("## 快速开始", "## 命令", "## 作用"):
                self.assertIn(heading, text, file.name)
            self.assertNotIn("work:frontend:", text, file.name)

    def test_readme_defines_new_flow_and_artifacts(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        for command in ("work:req", "work:design", "work:dev", "work:test", "work:deployment", "work:patch"):
            self.assertIn(command, readme)
        for category in ("全局产物", "阶段产物", "阶段提示词", "阶段补丁", "阶段补丁分析"):
            self.assertIn(f"| {category} |", readme)
        self.assertIn("Dev 是唯一可以直接修改业务源码的阶段", readme)


if __name__ == "__main__":
    unittest.main()
