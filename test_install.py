import unittest
from unittest.mock import call, patch

import install


class InstallTest(unittest.TestCase):
    @patch("install.subprocess.run")
    def test_installs_with_updated_latest_script(self, run):
        run.return_value.returncode = 0

        self.assertEqual(install.install_latest(), 0)

        self.assertEqual(
            run.call_args_list,
            [
                call(["git", "switch", "latest"], cwd=install.WORKFLOW_ROOT, check=True),
                call(
                    ["git", "pull", "--ff-only", "origin", "latest"],
                    cwd=install.WORKFLOW_ROOT,
                    check=True,
                ),
                call(
                    [
                        install.sys.executable,
                        str(install.WORKFLOW_ROOT / "install.py"),
                        install.UPDATED_FLAG,
                    ],
                    cwd=install.PROJECT_ROOT,
                ),
            ],
        )


if __name__ == "__main__":
    unittest.main()
