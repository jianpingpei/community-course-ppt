"""Package the self-contained skill instructions and tools, never course assets."""

import argparse
from pathlib import Path
import zipfile

LIMIT = 5_242_880


def package(destination):
    source = Path(__file__).resolve().parents[1] / "skills/community-course-ppt"
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
        for item in sorted(source.rglob("*")):
            relative = item.relative_to(source)
            if not item.is_file() or any(
                p in {"node_modules", "__pycache__", "tests", "assets"}
                for p in relative.parts
            ):
                continue
            if item.suffix not in {
                ".md",
                ".py",
                ".mjs",
                ".json",
                ".yaml",
                ".ps1",
                ".txt",
            }:
                continue
            name = "community-course-ppt/" + relative.as_posix()
            if relative.as_posix() == "SKILL.md":
                content = item.read_text("utf-8").replace(
                    "\n---\n",
                    "\ndisplay_name: 社区课程 PPT\ndisplay_name_en: Community Course PPT\ndescription_zh: 从材料讨论课程、自主设计并逐页制作科学课件\ndescription_en: Plan, design and build science and AI course slides\nversion: 2.0.0\nauthor: community-course-ppt contributors\n---\n",
                    1,
                )
                archive.writestr(name, content)
            else:
                archive.write(item, name)
    if destination.stat().st_size >= LIMIT:
        raise ValueError("ZIP exceeds 5,242,880 bytes")
    print(f"{destination.resolve()} ({destination.stat().st_size:,} bytes)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parents[1]
        / "release/community-course-ppt.zip",
    )
    package(parser.parse_args().out)
