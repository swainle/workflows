import unittest
from pathlib import Path


class IssuesPromptTest(unittest.TestCase):
    def test_requires_product_analysis_report(self):
        template = (Path(__file__).parent / "templates" / "issues.prompt.md").read_text(
            encoding="utf-8"
        )

        for required in (
            "你是一名专业产品经理",
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
            "01-product.patch.md",
            "产品目标、用户角色、产品范围或全局业务规则",
            "没有全局产品变化时不得创建",
        ):
            self.assertIn(required, template)

    def test_process_uses_joint_analysis_and_one_question_at_a_time(self):
        template = (Path(__file__).parent / "templates" / "process.prompt.md").read_text(
            encoding="utf-8"
        )

        for required in (
            "产品经理",
            "前端专家",
            "架构师",
            "后端专家",
            "共同分析框架",
            "每次只问一个",
            "至少有 95% 的把握",
            "02-process-<topic>.patch.puml",
            "通常控制在 2～5 个文件",
            "不得按产品、前端、架构、后端角色机械拆分",
        ):
            self.assertIn(required, template)


if __name__ == "__main__":
    unittest.main()
