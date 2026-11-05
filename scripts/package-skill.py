"""Create the standalone ZIP accepted by skill upload interfaces."""

import argparse
import json
import io
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile


def without_embedded_fonts(template):
    """Keep all slide/media bytes; omit embedded font binaries and their references."""
    result = io.BytesIO()
    with zipfile.ZipFile(template) as source, zipfile.ZipFile(
        result, "w", zipfile.ZIP_DEFLATED
    ) as target:
        for entry in source.infolist():
            if entry.filename.startswith("ppt/fonts/"):
                continue
            data = source.read(entry)
            if entry.filename == "ppt/presentation.xml":
                data = re.sub(
                    rb"<(?:\w+:)?embeddedFontLst\b[^>]*>.*?</(?:\w+:)?embeddedFontLst>",
                    b"",
                    data,
                    flags=re.DOTALL,
                )
            elif entry.filename == "ppt/_rels/presentation.xml.rels":
                root = ET.fromstring(data)
                for element in list(root):
                    if element.get("Type", "").endswith("/font"):
                        root.remove(element)
                data = ET.tostring(root, encoding="utf-8", xml_declaration=True)
            elif entry.filename == "[Content_Types].xml":
                root = ET.fromstring(data)
                for element in list(root):
                    if element.get("Extension") == "fntdata" or element.get(
                        "PartName", ""
                    ).startswith("/ppt/fonts/"):
                        root.remove(element)
                data = ET.tostring(root, encoding="utf-8", xml_declaration=True)
            target.writestr(entry.filename, data)
    return result.getvalue()


def package(destination):
    repo = Path(__file__).resolve().parents[1]
    source = repo / "skills/community-course-ppt"
    destination.parent.mkdir(parents=True, exist_ok=True)
    catalog = json.loads((repo / "templates/catalog.json").read_text("utf-8"))
    # Keep one usable native template within WorkBuddy's 5 MiB upload limit.
    # The full local installation still carries the complete template library.
    catalog["templates"] = [t for t in catalog["templates"] if t["id"] == "wps-16"]
    template_files = {"catalog.json", "provenance.json"}
    for template in catalog["templates"]:
        template_files.update([template["file"], template.get("preview")])
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
        for root, prefix in [
            (source, "community-course-ppt"),
            (repo / "templates", "community-course-ppt/assets/templates"),
        ]:
            for item in sorted(root.rglob("*")):
                if not item.is_file() or any(
                    p in {"node_modules", "__pycache__", "tests"}
                    for p in item.relative_to(root).parts
                ):
                    continue
                if item.suffix in {".pyc", ".pyo"}:
                    continue
                if root != source and item.name not in template_files:
                    continue
                name = f"{prefix}/{item.relative_to(root).as_posix()}"
                if root != source and item.name == "catalog.json":
                    archive.writestr(
                        name, json.dumps(catalog, ensure_ascii=False, indent=2)
                    )
                elif root != source and item.suffix == ".pptx":
                    archive.writestr(name, without_embedded_fonts(item))
                elif item == source / "SKILL.md":
                    content = item.read_text("utf-8")
                    content = content.replace(
                        "\n---\n",
                        "\ndisplay_name: 社区课程 PPT\ndisplay_name_en: Community Course PPT\ndescription_zh: 根据材料讨论选题并制作科学与AI课程课件\ndescription_en: Plan and build editable science and AI course slides from materials\nversion: 1.0.0\nauthor: community-course-ppt contributors\n---\n",
                        1,
                    )
                    archive.writestr(name, content)
                else:
                    archive.write(item, name)
    if destination.stat().st_size >= 5_242_880:
        raise ValueError("Upload package exceeds the 5 MiB (5,242,880 bytes) limit")
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
