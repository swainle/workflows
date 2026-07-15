import unittest
from unittest.mock import call, patch

import install


class InstallTest(unittest.TestCase):
    @patch("install.subprocess.run")
    def test_installs_with_selected_branch_script(self, run):
        run.side_effect = lambda args, **kwargs: install.subprocess.CompletedProcess(
            args,
            1 if args[1:4] == ["show-ref", "--verify", "--quiet"] else 0,
        )

        self.assertEqual(install.install_branch("develop"), 0)

        self.assertEqual(
            run.call_args_list,
            [
                call(
                    ["git", "check-ref-format", "--branch", "develop"],
                    cwd=install.WORKFLOW_ROOT,
                    stdout=install.subprocess.DEVNULL,
                    check=True,
                ),
                call(
                    [
                        "git",
                        "fetch",
                        "origin",
                        "refs/heads/develop:refs/remotes/origin/develop",
                    ],
                    cwd=install.WORKFLOW_ROOT,
                    check=True,
                ),
                call(
                    [
                        "git",
                        "show-ref",
                        "--verify",
                        "--quiet",
                        "refs/heads/develop",
                    ],
                    cwd=install.WORKFLOW_ROOT,
                ),
                call(
                    [
                        "git",
                        "switch",
                        "-c",
                        "develop",
                        "origin/develop",
                    ],
                    cwd=install.WORKFLOW_ROOT,
                    check=True,
                ),
                call(
                    ["git", "merge", "--ff-only", "origin/develop"],
                    cwd=install.WORKFLOW_ROOT,
                    check=True,
                ),
                call(
                    [
                        "git",
                        "submodule",
                        "set-branch",
                        "--branch",
                        "develop",
                        "docs/workflows",
                    ],
                    cwd=install.PROJECT_ROOT,
                    check=True,
                ),
                call(
                    [
                        install.sys.executable,
                        str(install.WORKFLOW_ROOT / "install.py"),
                        install.UPDATED_FLAG,
                        "--branch",
                        "develop",
                    ],
                    cwd=install.PROJECT_ROOT,
                ),
            ],
        )

    @patch.object(install.sys, "argv", ["install.py", "--branch", "main"])
    def test_parses_selected_branch(self):
        self.assertEqual(install.parse_branch(), "main")

    @patch.object(install.sys, "argv", ["install.py"])
    def test_defaults_to_latest_branch(self):
        self.assertEqual(install.parse_branch(), "latest")


if __name__ == "__main__":
    unittest.main()
