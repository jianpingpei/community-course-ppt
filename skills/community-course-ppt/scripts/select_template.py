"""Recommend a course template by existing assignments; keep one template per course."""

import argparse
from collections import Counter
import json
import os
from pathlib import Path


def recommendations(catalog, courses, current_id):
    usage = Counter(
        c.get("templateId") for c in courses if c.get("courseId") != current_id
    )
    ready = [t for t in catalog["templates"] if t.get("status") == "ready"]
    return sorted(ready, key=lambda t: (usage[t["id"]], t["id"]))


def default_catalog():
    skill = Path(__file__).resolve().parents[1]
    for candidate in [
        skill / "assets/templates/catalog.json",
        skill.parent.parent / "templates/catalog.json",
    ]:
        if candidate.is_file():
            return candidate
    raise FileNotFoundError("No bundled template catalog; provide --catalog")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--course", required=True)
    parser.add_argument("--catalog")
    parser.add_argument(
        "--usage-file",
        type=Path,
        default=Path.home() / ".cache/community-course-ppt/template-usage.json",
    )
    parser.add_argument(
        "--set", dest="selected", help="Assign an inspected template ID"
    )
    args = parser.parse_args()
    course_path = Path(args.course).resolve()
    catalog_path = Path(args.catalog).resolve() if args.catalog else default_catalog()
    course = json.loads(course_path.read_text("utf-8"))
    catalog = json.loads(catalog_path.read_text("utf-8"))
    usage = (
        json.loads(args.usage_file.read_text("utf-8"))
        if args.usage_file.is_file()
        else {}
    )
    known = dict(usage)
    for p in course_path.parent.parent.glob("*/course.json"):
        known[str(p.resolve())] = json.loads(p.read_text("utf-8"))
    courses = list(known.values())
    choices = recommendations(catalog, courses, course["courseId"])
    if args.selected:
        selected = next((t for t in choices if t["id"] == args.selected), None)
        if not selected:
            raise ValueError("Template must exist and have a reviewed layout profile")
        template = catalog_path.parent / selected["file"]
        if not template.is_file():
            raise FileNotFoundError(template)
        course.update(templateId=selected["id"], templateProfile=selected["profile"])
        try:
            bundled = default_catalog().resolve()
        except FileNotFoundError:
            bundled = None
        if catalog_path.resolve() == bundled:
            course.pop("sourceTemplate", None)
        else:
            try:
                course["sourceTemplate"] = Path(
                    os.path.relpath(template, course_path.parent)
                ).as_posix()
            except ValueError:
                course["sourceTemplate"] = str(template)
        course_path.write_text(
            json.dumps(course, ensure_ascii=False, indent=2) + "\n", "utf-8"
        )
        usage[str(course_path)] = {
            "courseId": course["courseId"],
            "templateId": selected["id"],
        }
        args.usage_file.parent.mkdir(parents=True, exist_ok=True)
        args.usage_file.write_text(
            json.dumps(usage, ensure_ascii=False, indent=2) + "\n", "utf-8"
        )
    print(
        json.dumps(
            {"locked": course.get("templateId"), "recommended": choices},
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
