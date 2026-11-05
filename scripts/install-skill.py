"""Install a self-contained user skill, including its native template assets."""

import argparse
from pathlib import Path
import shutil
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dest", type=Path, default=Path.home() / ".agents/skills/community-course-ppt"
    )
    parser.add_argument(
        "--update",
        action="store_true",
        help="Update this skill in an existing installation",
    )
    parser.add_argument("--skip-dependencies", action="store_true")
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[1]
    source = repo / "skills/community-course-ppt"
    target = args.dest.expanduser().resolve()
    if (
        target == source.resolve()
        or target in source.resolve().parents
        or source.resolve() in target.parents
    ):
        raise ValueError("Destination must be separate from the skill source")
    if target.exists():
        entry = target / "SKILL.md"
        if not args.update:
            raise FileExistsError(
                "Skill already exists; review it and use --update to replace matching files"
            )
        if not entry.is_file() or "name: community-course-ppt" not in entry.read_text(
            "utf-8"
        ):
            raise ValueError(
                "Update destination is not a community-course-ppt installation"
            )
    shutil.copytree(
        source,
        target,
        dirs_exist_ok=args.update,
        ignore=shutil.ignore_patterns("node_modules", "__pycache__", "*.pyc"),
    )
    shutil.copytree(
        repo / "templates", target / "assets/templates", dirs_exist_ok=args.update
    )
    if not args.skip_dependencies:
        npm = shutil.which("npm.cmd") or shutil.which("npm")
        if not npm:
            raise RuntimeError(
                "Node.js/npm required; skill files copied, dependencies not installed"
            )
        subprocess.run(
            [npm, "ci", "--ignore-scripts", "--prefix", str(target)], check=True
        )
        subprocess.run(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "-r",
                str(target / "requirements.txt"),
            ],
            check=True,
        )
    print(f"Installed skill: {target}")
    print(
        "Open the materials repository in your agent; use the skill on the next turn."
    )


if __name__ == "__main__":
    main()
