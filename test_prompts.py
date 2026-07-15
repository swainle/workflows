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
        ):
            self.assertIn(required, template)


if __name__ == "__main__":
    unittest.main()
