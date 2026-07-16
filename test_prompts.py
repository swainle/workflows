import re
import unittest
from pathlib import Path


class IssuesPromptTest(unittest.TestCase):
    def test_requires_product_analysis_report(self):
        root = Path(__file__).parent
        template = (root / "templates" / "issues.prompt.md").read_text(encoding="utf-8")
        config = (root / "tools" / "prompt" / "issues.mjs").read_text(encoding="utf-8")
        prompt = f"{config}\n{template}"

        for required in (
            "专业产品经理",
            "stage: issues",
            "patch_file: {{PATCH_NAME}}",
            "# 相关 Issues",
            "# 需补充到文档",
            "# 人工检查",
            "禁止编造业务规则",
            "根据本次产品分析结果组织",
            "根据本次 Git Patch 的实际文件和内容生成检查步骤",
            "表格只列与主 Issue",
            "每次只问一个最关键的问题",
            "至少有 95% 的把握",
            "01-product.git.patch",
            "产品目标、用户角色、产品范围或全局业务规则",
            "没有全局产品变化时不得创建",
        ):
            self.assertIn(required, prompt)

    def test_process_uses_joint_analysis_and_one_question_at_a_time(self):
        root = Path(__file__).parent
        template = (root / "templates" / "process.prompt.md").read_text(encoding="utf-8")
        config = (root / "tools" / "prompt" / "process.mjs").read_text(encoding="utf-8")
        prompt = f"{config}\n{template}"

        for required in (
            "产品经理",
            "前端专家",
            "架构师",
            "后端专家",
            "共同分析框架",
            "每次只问一个",
            "至少有 95% 的把握",
            "02-process-<topic>.puml",
            "02-process.git.patch",
            "通常控制在 2～5 个文件",
            "不得按产品、前端、架构、后端角色机械拆分",
        ):
            self.assertIn(required, prompt)

    def test_every_stage_uses_multiple_professional_roles(self):
        root = Path(__file__).parent
        base = (root / "templates" / "base.prompt.md").read_text(encoding="utf-8")
        engine = (root / "tools" / "core" / "prompt-stage.mjs").read_text(
            encoding="utf-8"
        )

        self.assertIn("{{PROFESSIONAL_DISCUSSION}}", base)
        self.assertIn("多专业共同讨论", engine)
        self.assertIn("先向使用者简洁整理当前理解", engine)
        self.assertIn("每次只询问一个最关键的问题", engine)
        self.assertIn("等待使用者回答后更新理解和信心", engine)
        self.assertIn("达到至少 95%", engine)
        self.assertIn("未达到时必须继续逐条确认", engine)
        for config in (root / "tools" / "prompt").glob("*.mjs"):
            roles = re.search(r"roles:\s*\[(.*?)\]", config.read_text(encoding="utf-8"), re.S)
            self.assertIsNotNone(roles, config.name)
            self.assertGreaterEqual(len(re.findall(r'^\s*"', roles.group(1), re.M)), 3, config.name)

    def test_stages_follow_contract_first_order(self):
        root = Path(__file__).parent / "tools" / "prompt"
        expected = {
            "process.mjs": "02-process",
            "c4.mjs": "03-c4",
            "api.mjs": "04-api",
            "database.mjs": "05-database",
            "backend.mjs": "06-backend",
            "permission.mjs": "07-permission",
            "frontend.mjs": "08-frontend",
            "test.mjs": "09-test",
            "deployment.mjs": "10-deployment",
        }
        for filename, stage_id in expected.items():
            config = (root / filename).read_text(encoding="utf-8")
            self.assertIn(f'stageId: "{stage_id}"', config)

        frontend = (root / "frontend.mjs").read_text(encoding="utf-8")
        self.assertIn("docs/contracts/openapi.json", frontend)
        self.assertIn("docs/contracts/authorization.fga", frontend)

        c4 = (root / "c4.mjs").read_text(encoding="utf-8")
        self.assertIn('globalPatch: "03-c4.git.patch"', c4)
        self.assertIn("docs/architecture/c4.puml", c4)

        backend = (root / "backend.mjs").read_text(encoding="utf-8")
        backend_template = (
            root.parent.parent / "templates" / "backend.prompt.md"
        ).read_text(encoding="utf-8")
        self.assertNotIn("globalPatch:", backend)
        self.assertNotIn("05-c4.puml", backend_template)

    def test_ai_results_follow_prompt_attempt_names(self):
        root = Path(__file__).parent
        base = (root / "templates" / "base.prompt.md").read_text(encoding="utf-8")
        engine = (root / "tools" / "core" / "prompt-stage.mjs").read_text(
            encoding="utf-8"
        )

        self.assertIn("`${createdAt}_prompt.md`", engine)
        self.assertIn("_prompt.01.git.patch", engine)
        self.assertIn("不得覆盖", base)
        self.assertIn("下一个两位序号", base)

    def test_special_patch_commands_are_removed(self):
        root = Path(__file__).parent
        installer = (root / "install.mjs").read_text(encoding="utf-8")

        self.assertNotIn("docs:workflows:patch:", installer)
        self.assertFalse((root / "tools" / "core" / "patch-stage.mjs").exists())
        self.assertFalse((root / "tools" / "core" / "merge-json.mjs").exists())

    def test_prompt_commands_accept_requirement_directories(self):
        root = Path(__file__).parent
        engine = (root / "tools" / "core" / "prompt-stage.mjs").read_text(
            encoding="utf-8"
        )

        self.assertIn("<requirement-directory>", engine)
        self.assertIn('path.join(requirementDir, "01-prd.md")', engine)
        self.assertNotIn("targetKind", engine)
        for config in (root / "tools" / "prompt").glob("*.mjs"):
            self.assertNotIn("targetKind", config.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
