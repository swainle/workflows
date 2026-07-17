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

    def test_backend_only_prepares_the_source_execution_prompt(self):
        root = Path(__file__).parent
        template = (root / "templates" / "backend.prompt.md").read_text(
            encoding="utf-8"
        )
        config = (root / "tools" / "prompt" / "backend.mjs").read_text(
            encoding="utf-8"
        )

        for required in (
            "后端编码提示词",
            "本阶段只整理提示词，不执行其中的编码任务",
            "当前任务与后续编码任务是两个严格分离的阶段",
            "只能作为外层 `*_prompt.NN.git.patch` 新增或修改 `06-backend.prompt.md` 的内容",
            "06-backend.prompt.md",
            "识别实际框架",
            "严格的 DDD 分层和面向对象实现",
            "modules/<bounded-context>/{domain,application,infrastructure,interfaces}",
            "聚合根、实体和值对象",
            "贫血模型",
            "用例或应用服务 class",
            "Repository Port",
            "禁止万能 Generic Repository",
            "Interfaces → Application → Domain",
            "禁止导入 Next.js、React、Prisma Client",
            "不得使用全局数据库单例绕过依赖注入",
            "不连接数据库的 Domain 单元测试",
            "可执行的依赖边界检查",
            "视为未完成 DDD",
            "Monorepo 的 workspace 与依赖边界",
            "Swagger UI/API 文档页面",
            "docs/contracts/openapi.json` 为唯一契约来源",
            "文档页面路径、OpenAPI JSON 路径",
            "匿名访问或鉴权策略",
            "确需新增 Swagger/OpenAPI 依赖时",
            "页面可访问、OpenAPI JSON 可加载",
            "直接修改完成需求所需的后端源码",
            "不生成 Git Patch",
            "只能创建或更新上述文件",
            "生成外层 Git Patch 和分析文件后立即停止",
            "不得绕过外层 Git Patch 直接新增或修改 `06-backend.prompt.md`",
        ):
            self.assertIn(required, f"{config}\n{template}")
        self.assertNotIn("完成需求必须修改的后端源码、迁移和后端单元测试", template)

    def test_database_enforces_table_and_timestamp_conventions(self):
        template = (
            Path(__file__).parent / "templates" / "database.prompt.md"
        ).read_text(encoding="utf-8")

        for required in (
            "数据库产品及主版本",
            "ORM 框架及主版本",
            "不使用 ORM",
            "每次只确认一个选型",
            "两项都得到明确确认后才能生成文件",
            "不得仅根据默认文件自行决定",
            "适配所选数据库",
            "适配所选 ORM",
            "表名必须以 `t_` 开头",
            "`create_at` 和 `update_at`",
            "数据库在插入时自动写入当前时间",
            "在每次更新时自动刷新",
            "应用代码不得赋值",
        ):
            self.assertIn(required, template)

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

    def test_flow_command_orchestrates_existing_stages(self):
        root = Path(__file__).parent
        installer = (root / "install.mjs").read_text(encoding="utf-8")
        template = (root / "templates" / "flow.prompt.md").read_text(
            encoding="utf-8"
        )

        self.assertIn('"prompt:flow"', installer)
        for required in (
            "不得预先生成后续阶段 Prompt",
            "每次只询问使用者一个最关键的问题",
            "理解达到至少 95%",
            "等待明确批准",
            "06-backend.prompt.md",
            "不替使用者批准 Patch",
        ):
            self.assertIn(required, template)

    def test_prompt_commands_use_the_selected_requirement(self):
        root = Path(__file__).parent
        engine = (root / "tools" / "core" / "prompt-stage.mjs").read_text(
            encoding="utf-8"
        )
        cli = (root / "tools" / "prompt.mjs").read_text(encoding="utf-8")

        self.assertIn('path.join(requirementDir, "01-prd.md")', engine)
        self.assertIn("currentRequirement()", cli)
        self.assertIn("parseArgs", cli)
        self.assertIn('issue: "issues"', cli)
        self.assertNotIn("targetKind", engine)
        for config in (root / "tools" / "prompt").glob("*.mjs"):
            self.assertNotIn("targetKind", config.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
