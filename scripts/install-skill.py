"""Install a self-contained user skill, without fixed templates."""

import argparse
import json
from pathlib import Path
import shutil
import subprocess
import sys


def remove_old_managed_files(target):
    target = target.resolve()
    for relative in [
        "scripts/select_template.py",
        "scripts/apply_template.py",
        "scripts/teaching-diagrams.mjs",
        "assets/template-profiles.json",
        "assets/themes.json",
        "tests/test_template_selection.py",
        "tests/test_portable_templates.py",
        "tests/test_diagram_layout.py",
    ]:
        item = (target / relative).resolve()
        if not item.is_relative_to(target):
            raise ValueError("Managed cleanup path escapes skill")
        if item.is_file():
            item.unlink()
    folder = target / "assets/templates"
    catalog = folder / "catalog.json"
    if catalog.is_file():
        data = json.loads(catalog.read_text("utf-8"))
        entries = data.get("templates", [])
        if entries and all(str(t.get("id", "")).startswith("wps-") for t in entries):
            names = ["catalog.json", "provenance.json", "模板目录.html"]
            names += [t[k] for t in entries for k in ["file", "preview"] if t.get(k)]
            for name in names:
                if Path(name).name != name:
                    raise ValueError("Unexpected legacy template path")
                item = (folder / name).resolve()
                if not item.is_relative_to(target):
                    raise ValueError("Template cleanup escapes skill")
                if item.is_file():
                    item.unlink()
            if not any(folder.iterdir()):
                folder.rmdir()
    assets = target / "assets"
    if assets.is_dir() and not any(assets.iterdir()):
        assets.rmdir()


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
    parser.add_argument(
        "--skip-dependencies", action="store_true", help="Copy files only (the default)"
    )
    parser.add_argument(
        "--with-dependencies",
        action="store_true",
        help="Install public PptxGenJS/Python dependencies",
    )
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
    if args.update:
        remove_old_managed_files(target)
    if args.with_dependencies and not args.skip_dependencies:
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
        "Open your materials workspace. SlideP uses the host environment; use --with-dependencies for the public route."
    )


if __name__ == "__main__":
    main()
