"""Build browsable previews from actual exported page images, never authoring mockups."""

import argparse, html, json, re, os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def natural(p):
    return int(re.search(r"(\d+)(?=\.PNG$)", p.name, re.I).group(1))


def font(size):
    candidates = [
        os.environ.get("COURSE_PPT_FONT", ""),
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/NotoSansSC-VF.ttf",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/System/Library/Fonts/PingFang.ttc",
    ]
    for p in candidates:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default(size=size)


def sheet(files, target, cols=4, width=480, label=""):
    h = int(width * 9 / 16)
    gap = 18
    caption = 32
    rows = (len(files) + cols - 1) // cols
    canvas = Image.new(
        "RGB",
        (cols * (width + gap) + gap, rows * (h + caption + gap) + gap + 44),
        "#e8e8e8",
    )
    d = ImageDraw.Draw(canvas)
    d.text((gap, 8), label, font=font(23), fill="#252525")
    for i, p in enumerate(files):
        im = Image.open(p).convert("RGB")
        im.thumbnail((width, h))
        x = gap + (i % cols) * (width + gap)
        y = 52 + (i // cols) * (h + caption + gap)
        canvas.paste(im, (x, y))
        d.text((x, y + h + 4), f"{natural(p):02d}", font=font(18), fill="#333333")
    canvas.save(target)


def main():
    a = argparse.ArgumentParser()
    a.add_argument("directory")
    args = a.parse_args()
    root = Path(args.directory).resolve()
    exports = json.loads((root / "powerpoint-export.json").read_text("utf-8-sig"))
    exports = exports if isinstance(exports, list) else [exports]
    cards = []
    for r in exports:
        pages = Path(r["pages"])
        files = sorted(
            (p for p in pages.glob("*.PNG") if not p.name.startswith("inspect-")),
            key=natural,
        )
        if len(files) != r["slideCount"]:
            raise ValueError("Missing preview pages " + str(pages))
        preview = pages.parent / (Path(r["pptx"]).stem + "-预览.png")
        sheet(files, preview, label=Path(r["pptx"]).stem)
        if len(files) > 8:
            for start in range(0, len(files), 4):
                sheet(
                    files[start : start + 4],
                    pages / f"inspect-{start+1:02d}.png",
                    cols=2,
                    width=720,
                    label=Path(r["pptx"]).stem,
                )
        rel = lambda p: Path(p).relative_to(root).as_posix()
        note = Path(r["pptx"]).with_name(Path(r["pptx"]).stem + "-逐页讲稿.md")
        note_link = (
            f' · <a href="{html.escape(rel(note))}">逐页讲稿与时间分配</a>'
            if note.exists()
            else ""
        )
        cards.append(
            f'<article><h2>{html.escape(Path(r["pptx"]).stem)}</h2><a href="{html.escape(rel(preview))}"><img loading="lazy" src="{html.escape(rel(preview))}"></a><p><a href="{html.escape(rel(r["pptx"]))}">可编辑 PPTX</a> · <a href="{html.escape(rel(r["pdf"]))}">PDF</a>{note_link} · {r["slideCount"]} 页</p></article>'
        )
    content = (
        '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>课程与模板预览</title><style>body{font:18px system-ui;background:#f4f3ef;color:#233;margin:40px}main{max-width:1500px;margin:auto}article{background:white;padding:24px;margin:24px 0}img{width:100%;height:auto}a{color:#176d68}h1{font-size:36px}h2{font-size:25px}</style><main><h1>课程与模板预览</h1><p>以下均由最终 PowerPoint 文件实际渲染。点击图片看大图，PPTX 中的正文、表格和流程图可编辑。</p>'
        + "".join(cards)
        + "</main></html>"
    )
    (root / "预览目录.html").write_text(content, "utf-8")
    print(f"Created {len(cards)} real preview entries")


if __name__ == "__main__":
    main()
