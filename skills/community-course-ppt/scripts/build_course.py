"""Portable PPTX build; LibreOffice PDF export does not require PowerPoint."""

import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--course", type=Path, required=True)
    parser.add_argument(
        "--pptx-only",
        action="store_true",
        help="Explicitly omit PDF and visual previews",
    )
    parser.add_argument("--soffice", help="Path to LibreOffice executable")
    args = parser.parse_args()
    course = args.course.resolve(strict=True)
    scripts = Path(__file__).resolve().parent
    node = shutil.which("node")
    if not node:
        parser.error("Node.js 20+ is required")
    soffice = args.soffice or shutil.which("soffice") or shutil.which("libreoffice")
    if not args.pptx_only and not soffice:
        parser.error(
            "LibreOffice is required for PDF export. Install it, use --soffice, or explicitly request --pptx-only. On Windows you can also use build-course.ps1 with PowerPoint."
        )
    env = dict(os.environ, COURSE_PPT_PYTHON=sys.executable, PYTHONUTF8="1")

    def run(*command):
        subprocess.run([str(c) for c in command], check=True, env=env)

    with tempfile.TemporaryDirectory(prefix="community-course-") as temporary:
        stage = Path(temporary) / "output"
        run(node, scripts / "build.mjs", "--course", course, "--out", stage)
        run(sys.executable, scripts / "check_pptx.py", stage, "--course", course)
        exports = []
        if not args.pptx_only:
            import fitz

            profile = (Path(temporary) / "lo-profile").as_uri()
            for deck in sorted(stage.glob("*.pptx")):
                run(
                    soffice,
                    f"-env:UserInstallation={profile}",
                    "--headless",
                    "--convert-to",
                    "pdf:impress_pdf_Export",
                    "--outdir",
                    stage,
                    deck,
                )
                pdf = deck.with_suffix(".pdf")
                if not pdf.is_file():
                    raise RuntimeError(f"LibreOffice did not produce {pdf.name}")
                pages = stage / (deck.stem + "-pages")
                pages.mkdir()
                with fitz.open(pdf) as document:
                    from zipfile import ZipFile

                    with ZipFile(deck) as archive:
                        expected = sum(
                            1
                            for n in archive.namelist()
                            if n.startswith("ppt/slides/slide") and n.endswith(".xml")
                        )
                    if len(document) != expected:
                        raise RuntimeError(f"PDF page count mismatch: {deck.name}")
                    for i, page in enumerate(document):
                        page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(
                            pages / f"Slide{i+1}.PNG"
                        )
                    exports.append(
                        dict(
                            pptx=str(deck),
                            pdf=str(pdf),
                            pages=str(pages),
                            slideCount=len(document),
                        )
                    )
            (stage / "powerpoint-export.json").write_text(json.dumps(exports), "utf-8")
            run(sys.executable, scripts / "make-previews.py", stage)
        report = json.loads((stage / "package-check.json").read_text("utf-8-sig"))
        for result in report["results"]:
            result["file"] = Path(result["file"]).name
        report.update(
            renderer="none" if args.pptx_only else "LibreOffice",
            visualReview="pending",
            pdfExported=not args.pptx_only,
        )
        (stage / "validation.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2), "utf-8"
        )
        # Replace only known build products; preserve unrelated user files.
        destination = course.parent / "output"
        destination.mkdir(exist_ok=True)
        for item in stage.iterdir():
            if item.is_file() and item.name not in {
                "package-check.json",
                "powerpoint-export.json",
            }:
                shutil.copy2(item, destination / item.name)
        if args.pptx_only:
            print("PPTX and script only; PDF and visual review are not completed.")
        print(f"Course output: {destination}")


if __name__ == "__main__":
    main()
