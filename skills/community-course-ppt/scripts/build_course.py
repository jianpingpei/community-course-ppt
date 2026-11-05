"""Build a course with the available host engine, then validate actual files."""

import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

SCRIPTS = Path(__file__).resolve().parent


def run(command, **kwargs):
    env = dict(os.environ, COURSE_PPT_PYTHON=sys.executable, PYTHONUTF8="1")
    return subprocess.run([str(v) for v in command], check=True, env=env, **kwargs)


def slidep_json(command, allow_diagnostics=False):
    result = subprocess.run(
        [str(v) for v in command],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=180,
    )
    try:
        payload = json.loads(result.stdout)
    except ValueError as error:
        raise RuntimeError(
            f"SlideP returned no valid JSON: {result.stderr[-1500:]}"
        ) from error
    if payload.get("failures") or (
        (result.returncode or payload.get("ok") is not True) and not allow_diagnostics
    ):
        raise RuntimeError(
            f"SlideP operation incomplete: {json.dumps(payload, ensure_ascii=False)}"
        )
    return payload


def slidep_ready(cli):
    if not cli:
        return False, "slidep command not found"
    try:
        for flag in ["--version", "--help"]:
            run([cli, flag], capture_output=True, timeout=20)
        for command in ["create", "upsert-dsl", "lint"]:
            run([cli, command, "--help"], capture_output=True, timeout=20)
        # Exercise the documented create API; no invented health endpoint.
        with tempfile.TemporaryDirectory(prefix="slidep-probe-") as directory:
            slidep_json([cli, "create", Path(directory) / "probe.pptx"])
        return True, "SlideP CLI and editor_sdk create request succeeded"
    except (OSError, RuntimeError, subprocess.SubprocessError) as error:
        return False, str(error)


def choose_engine(requested, cli):
    if requested == "pptxgenjs":
        return requested
    ready, detail = slidep_ready(cli)
    if ready:
        print(detail)
        return "slidep"
    if requested == "slidep":
        raise RuntimeError("SlideP unavailable: " + detail)
    print("SlideP unavailable; selecting public PptxGenJS route: " + detail)
    return "pptxgenjs"


def lesson_name(lesson):
    invalid = '\\/:*?"<>|'
    return lesson["id"] + "-" + "".join(c for c in lesson["title"] if c not in invalid)


def write_page(cli, pptx, dsl, project, index, append=True):
    command = [
        cli,
        "upsert-dsl",
        pptx,
        "--dsl-file",
        dsl,
        "--project-dir",
        project,
        "--strict-resources",
    ]
    if not append:
        command += ["--page-index", str(index)]
    payload = slidep_json(command)
    if append and payload.get("slide_count") != index + 1:
        raise RuntimeError(f"Unexpected written page count at page {index}: {payload}")
    # Full diagnostics remain in the temporary build area for the build lifetime.
    full = pptx.parent / f"{pptx.stem}-diagnostics-{index}.json"
    result = slidep_json(
        [
            cli,
            "lint",
            pptx,
            "--dsl-file",
            dsl,
            "--page-index",
            str(index),
            "--project-dir",
            project,
            "--full-output",
            full,
        ],
        allow_diagnostics=True,
    )
    if result.get("output_summary"):
        if not full.is_file():
            raise RuntimeError(
                "SlideP truncated diagnostics without the requested full output"
            )
        result = json.loads(full.read_text("utf-8"))
    if not isinstance(result.get("diagnostics"), list):
        raise RuntimeError(
            "No complete SlideP layout diagnostics: "
            + json.dumps(result, ensure_ascii=False)
        )
    diagnostics = result.get("diagnostics", [])
    if result.get("ok") is False or any(
        d.get("severity") == "error" for d in diagnostics
    ):
        raise RuntimeError(json.dumps(diagnostics, ensure_ascii=False))
    return diagnostics


def build_slidep(cli, course, root, stage):
    diagnostics = []
    for lesson in course["lessons"]:
        pptx = stage / (lesson_name(lesson) + ".pptx")
        slidep_json([cli, "create", pptx])
        for i, slide in enumerate(lesson["slides"]):
            source = (
                root
                / lesson.get("dslDir", "slides/" + lesson["id"])
                / f"{i+1:02d}.slide"
            )
            if not source.is_file():
                raise FileNotFoundError(f"Prepare authored SlideDSL first: {source}")
            found = write_page(cli, pptx, source, root, i)
            diagnostics.extend(
                {"lesson": lesson["id"], "page": i + 1, **d} for d in found
            )
    return diagnostics


def deliverables(course, stage, engine):
    lessons = []
    for lesson in course["lessons"]:
        seconds = 0
        fmt = lambda n: f"{n//60}:{n%60:02d}"
        notes = [
            f"# {lesson['title']}\n\n{course['title']}\n\n预计时长：{sum(s['seconds'] for s in lesson['slides'])/60:.1f} 分钟。实际试讲时长：未记录。\n"
        ]
        for i, slide in enumerate(lesson["slides"]):
            refs = [
                next(r for r in course["sources"] if r["id"] == source)
                for source in slide.get("sourceIds", [])
            ]
            notes.append(
                f"## {i+1:02d} {slide['title']}\n\n时间：{fmt(seconds)}–{fmt(seconds+slide['seconds'])}（{slide['seconds']}秒）\n\n{slide['notes']}\n\n"
                + "\n".join(f"- [{r['title']}]({r['url']})" for r in refs)
                + "\n"
            )
            seconds += slide["seconds"]
        name = lesson_name(lesson)
        (stage / (name + "-逐页讲稿.md")).write_text("\n".join(notes), "utf-8")
        lessons.append(
            dict(
                id=lesson["id"],
                title=lesson["title"],
                pptx=name + ".pptx",
                slides=len(lesson["slides"]),
                seconds=seconds,
            )
        )
    (stage / "manifest.json").write_text(
        json.dumps(
            dict(title=course["title"], engine=engine, lessons=lessons),
            ensure_ascii=False,
            indent=2,
        ),
        "utf-8",
    )


def export_pdf(stage, renderer, soffice):
    if renderer == "powerpoint":
        run(
            [
                shutil.which("pwsh") or "powershell",
                "-NoProfile",
                "-File",
                SCRIPTS / "export-powerpoint.ps1",
                "-InputDirectory",
                stage,
                "-OutputDirectory",
                stage,
            ]
        )
        return "Microsoft PowerPoint"
    import pymupdf

    records = []
    with tempfile.TemporaryDirectory(prefix="course-lo-") as temporary:
        for deck in sorted(stage.glob("*.pptx")):
            run(
                [
                    soffice,
                    "-env:UserInstallation=" + Path(temporary).as_uri(),
                    "--headless",
                    "--convert-to",
                    "pdf:impress_pdf_Export",
                    "--outdir",
                    stage,
                    deck,
                ],
                timeout=180,
            )
            pdf = deck.with_suffix(".pdf")
            if not pdf.is_file():
                raise RuntimeError("PDF export did not produce " + pdf.name)
            pages = stage / (deck.stem + "-pages")
            pages.mkdir()
            with pymupdf.open(pdf) as document:
                for i, page in enumerate(document):
                    page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5)).save(
                        pages / f"Slide{i+1}.PNG"
                    )
                records.append(
                    dict(
                        pptx=str(deck),
                        pdf=str(pdf),
                        pages=str(pages),
                        slideCount=len(document),
                    )
                )
    (stage / "powerpoint-export.json").write_text(json.dumps(records), "utf-8")
    return "LibreOffice"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--course", type=Path, required=True)
    parser.add_argument(
        "--engine", choices=["auto", "slidep", "pptxgenjs"], default="auto"
    )
    parser.add_argument(
        "--renderer", choices=["auto", "powerpoint", "libreoffice"], default="auto"
    )
    parser.add_argument("--pptx-only", action="store_true")
    parser.add_argument(
        "--preview",
        action="store_true",
        help="Explicit short preview, not a full lesson",
    )
    parser.add_argument("--soffice")
    args = parser.parse_args()
    source = args.course.resolve(strict=True)
    root = source.parent
    course = json.loads(source.read_text("utf-8"))
    for key in ["templateId", "templateProfile", "themeId", "sourceTemplate"]:
        if course.get(key):
            parser.error(
                f"请迁移旧配置字段 {key}，见 references/input-format.md；内置模板已移除"
            )
    if not (root / "DESIGN.md").is_file():
        parser.error("Prepare the course DESIGN.md before building")
    engine = choose_engine(args.engine, shutil.which("slidep"))
    if engine == "pptxgenjs" and not course.get("authoring"):
        parser.error("PptxGenJS route requires course.authoring (.mjs)")
    renderer = args.renderer
    if renderer == "auto":
        renderer = "powerpoint" if sys.platform == "win32" else "libreoffice"
    soffice = args.soffice or shutil.which("soffice") or shutil.which("libreoffice")
    if not args.pptx_only and renderer == "libreoffice" and not soffice:
        parser.error(
            "LibreOffice required for PDF export; specify --soffice or explicitly accept --pptx-only"
        )
    with tempfile.TemporaryDirectory(prefix="community-course-") as temporary:
        stage = Path(temporary) / "output"
        stage.mkdir()
        diagnostics = []
        if engine == "slidep":
            diagnostics = build_slidep(shutil.which("slidep"), course, root, stage)
        else:
            run(
                [
                    shutil.which("node") or "node",
                    SCRIPTS / "build.mjs",
                    "--course",
                    source,
                    "--out",
                    stage,
                ]
            )
        deliverables(course, stage, engine)
        exported = "none" if args.pptx_only else export_pdf(stage, renderer, soffice)
        check = [sys.executable, SCRIPTS / "check_pptx.py", stage, "--course", source]
        if args.preview:
            check.append("--preview")
        run(check)
        if not args.pptx_only:
            run([sys.executable, SCRIPTS / "make-previews.py", stage])
        report = json.loads((stage / "package-check.json").read_text("utf-8-sig"))
        for result in report["results"]:
            result["file"] = Path(result["file"]).name
        report.update(
            engine=engine,
            renderer=exported,
            pdfExported=not args.pptx_only,
            visualReview="pending",
            slidepDiagnostics=diagnostics,
        )
        (stage / "validation.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2), "utf-8"
        )
        destination = root / "output"
        # output is the reserved generated directory; user source stays outside it.
        if destination.is_symlink():
            raise RuntimeError("output must not be a symbolic link")
        if destination.exists():
            shutil.rmtree(destination)
        destination.mkdir()
        for item in stage.iterdir():
            if (
                item.is_file()
                and item.suffix in {".pptx", ".pdf", ".md", ".html", ".png", ".json"}
                and (
                    item.suffix != ".json"
                    or item.name in {"manifest.json", "validation.json"}
                )
            ):
                shutil.copy2(item, destination / item.name)
        print(
            f"Course output: {destination}; engine={engine}, renderer={exported}, visual review pending"
        )


if __name__ == "__main__":
    main()
