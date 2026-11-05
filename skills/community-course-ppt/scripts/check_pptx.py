"""Check exported native PowerPoint packages; this is not a visual review."""

import argparse, json, re, sys, zipfile, posixpath
from pathlib import Path
import xml.etree.ElementTree as ET

NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def inspect(file, expected=None, preview=False, course=None):
    errors = []
    warnings = []
    with zipfile.ZipFile(file) as z:
        bad = z.testzip()
        if bad:
            errors.append("corrupt ZIP member " + bad)
        presentation = ET.fromstring(z.read("ppt/presentation.xml"))
        ids = presentation.findall("p:sldIdLst/p:sldId", NS)
        rels = {
            x.get("Id"): x.get("Target")
            for x in ET.fromstring(z.read("ppt/_rels/presentation.xml.rels"))
        }
        count = len(ids)
        if expected and count != len(expected["slides"]):
            errors.append("slide count mismatch")
        minimum = (course or {}).get("minimumSlidesPerLesson", 21)
        if not preview and minimum and count < minimum:
            errors.append(f"{count} slides below required {minimum}")
        size = presentation.find("p:sldSz", NS)
        if abs(int(size.get("cx")) / int(size.get("cy")) - 16 / 9) > 0.001:
            errors.append("not 16:9")
        minsize = 100
        notes_count = 0
        native_count = 0
        native_tables = 0
        paper_figures = 0
        for i, el in enumerate(ids, 1):
            target = rels[el.get("{" + NS["r"] + "}id")].lstrip("/")
            part = target if target.startswith("ppt/") else "ppt/" + target
            root = ET.fromstring(z.read(part))
            txt = "".join(t.text or "" for t in root.findall(".//a:t", NS))
            if not txt.strip():
                errors.append(f"page {i}: no native text")
            if re.search(r"Lorem ipsum|TODO|待填写|xxx|占位符", txt, re.I):
                errors.append(f"page {i}: unfinished placeholder")
            if re.search(r"教学示意|人为构造|人造数据|非真实|不对应真实", txt):
                errors.append(f"page {i}: production disclaimer in audience copy")
            if (
                course
                and course.get("materialType") != "own-research"
                and re.search(r"课程编制单位|编制单位|课题号", txt)
            ):
                errors.append(
                    f"page {i}: institutional branding on external-material course"
                )
            slide = (
                expected["slides"][i - 1]
                if expected and i <= len(expected["slides"])
                else None
            )
            normalize = lambda value: re.sub(r"\s+", "", value)
            if slide and normalize(slide["title"]) not in normalize(txt):
                errors.append(f"page {i}: lesson title missing or wrong order")
            if (
                slide
                and slide.get("type") == "cover"
                and normalize(course["title"]) not in normalize(txt)
            ):
                errors.append(f"page {i}: cover missing shared course name")
            if (
                slide
                and course.get("includeExercises") is not True
                and (slide.get("type") == "exercise" or re.search("练习|判断题", txt))
            ):
                errors.append(f"page {i}: exercise in lecture-only course")
            if slide and slide.get("figure"):
                pictures = root.findall(".//p:pic/p:nvPicPr/p:cNvPr", NS)
                if not any(p.get("descr") == slide["figure"]["alt"] for p in pictures):
                    errors.append(f"page {i}: missing sourced figure")
                else:
                    paper_figures += 1
            native_count += len(root.findall(".//p:sp", NS))
            native_tables += len(root.findall(".//a:tbl", NS))
            for r in root.findall(".//a:rPr", NS):
                if r.get("sz"):
                    minsize = min(minsize, int(r.get("sz")) / 100)
            for shape in root.findall(".//p:sp", NS):
                content = "".join(t.text or "" for t in shape.findall(".//a:t", NS))
                sizes = [
                    int(r.get("sz")) / 100
                    for r in shape.findall(".//a:rPr", NS)
                    if r.get("sz")
                ]
                xf = shape.find("p:spPr/a:xfrm", NS)
                if xf is not None:
                    off = xf.find("a:off", NS)
                    ext = xf.find("a:ext", NS)
                    if off is not None and ext is not None:
                        x, y = int(off.get("x")), int(off.get("y"))
                        w, h = int(ext.get("cx")), int(ext.get("cy"))
                        floor = (
                            14
                            if y >= int(size.get("cy")) * 0.88
                            or (slide and slide.get("type") in {"cover", "references"})
                            else 20
                        )
                        if sizes and min(sizes) < floor:
                            errors.append(
                                f"page {i}: text below {floor}pt outside source/footer area"
                            )
                        if (
                            sizes
                            and slide
                            and normalize(content) == normalize(slide["title"])
                            and min(sizes) < 32
                        ):
                            errors.append(f"page {i}: title below 32pt")
                        if (
                            sizes
                            and slide
                            and normalize(content)
                            in [normalize(v) for v in slide.get("body", []) if v]
                        ):
                            if min(sizes) < 24:
                                errors.append(f"page {i}: body text below 24pt")
                        if (
                            min(x, y) < -100
                            or x + w > int(size.get("cx")) + 100
                            or y + h > int(size.get("cy")) + 100
                        ):
                            errors.append(f"page {i}: shape outside canvas")
            note_rel = (
                Path(part).parent.as_posix() + "/_rels/" + Path(part).name + ".rels"
            )
            if note_rel in z.namelist():
                for relation in ET.fromstring(z.read(note_rel)):
                    if not relation.get("Type", "").endswith("/notesSlide"):
                        continue
                    notes_count += 1
                    target = relation.get("Target")
                    note_part = (
                        target.lstrip("/")
                        if target.startswith("/")
                        else posixpath.normpath(
                            posixpath.join(posixpath.dirname(part), target)
                        )
                    )
                    notes = "".join(
                        v.text or ""
                        for v in ET.fromstring(z.read(note_part)).findall(".//a:t", NS)
                    )
                    if slide and normalize(slide.get("notes", "")) not in normalize(
                        notes
                    ):
                        errors.append(
                            f"page {i}: speaker notes differ from course script"
                        )
        if notes_count != count:
            errors.append(f"{notes_count}/{count} pages have notes")
        if expected:
            required_tables = sum(
                1
                for s in expected["slides"]
                if s.get("table") or s.get("diagram", {}).get("kind") == "matrix"
            )
            if native_tables < required_tables:
                errors.append(
                    f"{native_tables}/{required_tables} required editable tables present"
                )
            seconds = sum(s.get("seconds", 0) for s in expected["slides"])
            if not preview and not 900 <= seconds <= 1200:
                errors.append(
                    f"timing {seconds}s outside 15–20min; use --preview only for explicitly requested previews"
                )
            chars = sum(
                len(re.findall(r"[\u4e00-\u9fff]", s.get("notes", "")))
                for s in expected["slides"]
            )
            if chars < 2000 and not preview:
                warnings.append(
                    f"only {chars} Chinese script characters: verify lecture depth"
                )
        else:
            seconds = None
            chars = None
    pdf_pages = None
    pdf = file.with_suffix(".pdf")
    if pdf.exists():
        import pymupdf

        with pymupdf.open(pdf) as document:
            pdf_pages = len(document)
        if pdf_pages != count:
            errors.append("PDF/PPTX page count mismatch")
    return {
        "file": str(file),
        "slides": count,
        "pdfPages": pdf_pages,
        "notesPages": notes_count,
        "nativeShapes": native_count,
        "nativeTables": native_tables,
        "paperFigures": paper_figures,
        "smallestFontPt": minsize,
        "seconds": seconds,
        "scriptChineseCharacters": chars,
        "errors": errors,
        "warnings": warnings,
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("directory")
    p.add_argument("--course")
    p.add_argument(
        "--preview",
        action="store_true",
        help="Explicit short preview; do not enforce full lesson timing",
    )
    a = p.parse_args()
    course = json.loads(Path(a.course).read_text("utf-8")) if a.course else None
    root = Path(a.directory)
    results = []
    files = sorted(root.rglob("*.pptx"))
    if not files:
        raise SystemExit("No PPTX files")
    for file in files:
        expected = (
            next(
                (l for l in course["lessons"] if file.name.startswith(l["id"] + "-")),
                None,
            )
            if course
            else None
        )
        results.append(inspect(file, expected, a.preview, course))
    if course and len(files) != len(course["lessons"]):
        raise SystemExit("Expected lesson deck count mismatch")
    report = {
        "results": results,
        "errors": sum(len(r["errors"]) for r in results),
        "warnings": sum(len(r["warnings"]) for r in results),
    }
    (root / "package-check.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), "utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    raise SystemExit(1 if report["errors"] else 0)


if __name__ == "__main__":
    main()
