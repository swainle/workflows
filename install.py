#!/usr/bin/env python3
"""Install AI project workflow commands and default documents into a host repo."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path


WORKFLOW_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = WORKFLOW_ROOT.parents[1]
PACKAGE_FILE = PROJECT_ROOT / "package.json"

SCRIPTS = {
    "docs:workflows:check": "node docs/workflows/tools/check.mjs",
    "docs:workflows:req": "node docs/workflows/tools/requirement.mjs",
    "docs:workflows:prompt:issues": "node docs/workflows/tools/prompt/issues.mjs",
    "docs:workflows:prompt:prd": "node docs/workflows/tools/prompt/prd.mjs",
    "docs:workflows:prompt:process": "node docs/workflows/tools/prompt/process.mjs",
    "docs:workflows:prompt:frontend": "node docs/workflows/tools/prompt/frontend.mjs",
    "docs:workflows:prompt:api": "node docs/workflows/tools/prompt/api.mjs",
    "docs:workflows:prompt:database": "node docs/workflows/tools/prompt/database.mjs",
    "docs:workflows:prompt:backend": "node docs/workflows/tools/prompt/backend.mjs",
    "docs:workflows:prompt:permission": "node docs/workflows/tools/prompt/permission.mjs",
    "docs:workflows:prompt:test": "node docs/workflows/tools/prompt/test.mjs",
    "docs:workflows:prompt:deployment": "node docs/workflows/tools/prompt/deployment.mjs",
    "docs:workflows:patch:process": "node docs/workflows/tools/patch/process.mjs",
    "docs:workflows:patch:frontend": "node docs/workflows/tools/patch/frontend.mjs",
    "docs:workflows:patch:api": "node docs/workflows/tools/patch/api.mjs",
    "docs:workflows:patch:database": "node docs/workflows/tools/patch/database.mjs",
    "docs:workflows:patch:backend": "node docs/workflows/tools/patch/backend.mjs",
    "docs:workflows:patch:permission": "node docs/workflows/tools/patch/permission.mjs",
    "docs:workflows:patch:deployment": "node docs/workflows/tools/patch/deployment.mjs",
}

DEFAULT_TARGETS = {
    "architecture": PROJECT_ROOT / "docs" / "architecture",
    "contracts": PROJECT_ROOT / "docs" / "contracts",
    "operations": PROJECT_ROOT / "docs" / "operations",
    "design-tokens": PROJECT_ROOT / "packages" / "design-tokens" / "tokens",
}
UPDATED_FLAG = "--workflows-updated"
DEFAULT_BRANCH = "latest"


def require_mount_location() -> None:
    expected = PROJECT_ROOT / "docs" / "workflows"
    if WORKFLOW_ROOT != expected:
        raise RuntimeError(
            f"workflows must be mounted at {expected}; current location: {WORKFLOW_ROOT}"
        )


def parse_branch() -> str:
    args = [arg for arg in sys.argv[1:] if arg != UPDATED_FLAG]
    if not args:
        return DEFAULT_BRANCH
    if len(args) == 2 and args[0] == "--branch" and not args[1].startswith("-"):
        return args[1]
    raise ValueError("Usage: install.py [--branch <branch>]")


def install_branch(branch: str) -> int:
    subprocess.run(["git", "switch", branch], cwd=WORKFLOW_ROOT, check=True)
    subprocess.run(
        ["git", "pull", "--ff-only", "origin", branch],
        cwd=WORKFLOW_ROOT,
        check=True,
    )
    subprocess.run(
        ["git", "submodule", "set-branch", "--branch", branch, "docs/workflows"],
        cwd=PROJECT_ROOT,
        check=True,
    )
    return subprocess.run(
        [
            sys.executable,
            str(WORKFLOW_ROOT / "install.py"),
            UPDATED_FLAG,
            "--branch",
            branch,
        ],
        cwd=PROJECT_ROOT,
    ).returncode


def update_package_json() -> None:
    if not PACKAGE_FILE.exists():
        raise RuntimeError(f"host package.json not found: {PACKAGE_FILE}")
    data = json.loads(PACKAGE_FILE.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"host package.json must contain an object: {PACKAGE_FILE}")
    scripts = data.setdefault("scripts", {})
    if not isinstance(scripts, dict):
        raise ValueError(f"host package.json scripts must be an object: {PACKAGE_FILE}")
    for name in list(scripts):
        if name.startswith("docs:workflows:"):
            del scripts[name]
    scripts.update(SCRIPTS)
    temporary = PACKAGE_FILE.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    temporary.replace(PACKAGE_FILE)


def copy_defaults() -> list[Path]:
    created: list[Path] = []
    defaults = WORKFLOW_ROOT / "defaults"
    for source_name, target_dir in DEFAULT_TARGETS.items():
        source_dir = defaults / source_name
        target_dir.mkdir(parents=True, exist_ok=True)
        for source in sorted(source_dir.rglob("*")):
            if not source.is_file():
                continue
            target = target_dir / source.relative_to(source_dir)
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists():
                continue
            shutil.copy2(source, target)
            created.append(target)
    (PROJECT_ROOT / "docs" / "requirements").mkdir(parents=True, exist_ok=True)
    return created


def main() -> int:
    try:
        branch = parse_branch()
        require_mount_location()
        if UPDATED_FLAG not in sys.argv:
            return install_branch(branch)
        update_package_json()
        created = copy_defaults()
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"Installation failed: {error}", file=sys.stderr)
        return 1

    print(f"Installed {len(SCRIPTS)} pnpm commands.")
    print(f"Created {len(created)} missing default files.")
    print("Existing project documents were not overwritten.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
